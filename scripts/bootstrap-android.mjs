import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const root = path.resolve('.build-tools');
fs.mkdirSync(root, { recursive: true });
const downloads = path.join(root, 'downloads');
fs.mkdirSync(downloads, { recursive: true });
async function json(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
async function download(url, target, checksum, algorithm = 'sha256') {
  if (fs.existsSync(target)) {
    const hash = crypto.createHash(algorithm).update(fs.readFileSync(target)).digest('hex');
    if (!checksum || checksum.toLowerCase() === hash) { console.log(`Cached: ${path.basename(target)}`); return; }
  }
  console.log(`Downloading ${path.basename(target)}`);
  const head = await fetch(url, { method: 'HEAD', headers: { 'Accept-Encoding': 'identity' } });
  const size = Number(head.headers.get('x-identity-content-length') || head.headers.get('content-length'));
  if (head.ok && head.headers.get('accept-ranges') === 'bytes' && size > 16 * 1048576) {
    const segmentSize = 8 * 1048576;
    const segments = Math.ceil(size / segmentSize);
    const partRoot = `${target}.${checksum?.slice(0, 12) || size}.parts`;
    fs.mkdirSync(partRoot, { recursive: true });
    let next = 0, completed = 0;
    async function worker() {
      while (next < segments) {
        const index = next++, start = index * segmentSize, end = Math.min(size - 1, start + segmentSize - 1), part = path.join(partRoot, String(index));
        if (!fs.existsSync(part) || fs.statSync(part).size !== end - start + 1) {
          let done = false;
          for (let attempt = 0; attempt < 4 && !done; attempt++) {
            try {
              const r = await fetch(head.url, { headers: { Range: `bytes=${start}-${end}`, 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(180000) });
              if (r.status !== 206) { await r.body?.cancel(); throw new Error(`Range request returned ${r.status}`); }
              if (r.headers.get('content-range') !== `bytes ${start}-${end}/${size}`) { await r.body?.cancel(); throw new Error('Unexpected download segment range'); }
              await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(part));
              if (fs.statSync(part).size !== end - start + 1) throw new Error('Incomplete segment');
              done = true;
            } catch (e) { if (attempt === 3) throw e; }
          }
        }
        completed++; console.log(`${path.basename(target)}: ${completed}/${segments} segments`);
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    const hash = crypto.createHash(algorithm), output = fs.createWriteStream(target + '.partial');
    for (let i = 0; i < segments; i++) for await (const chunk of fs.createReadStream(path.join(partRoot, String(i)))) { hash.update(chunk); if (!output.write(chunk)) await new Promise(resolve => output.once('drain', resolve)); }
    await new Promise((resolve, reject) => { output.on('error', reject); output.end(resolve); });
    if (checksum && hash.digest('hex').toLowerCase() !== checksum.toLowerCase()) throw new Error(`Checksum mismatch: ${path.basename(target)}`);
    fs.renameSync(target + '.partial', target); console.log(`Verified ${path.basename(target)} (${Math.round(size / 1048576)} MB)`); return;
  }
  const response = await fetch(url, { headers: { 'Accept-Encoding': 'identity' } });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const hash = crypto.createHash(algorithm); let count = 0, last = 0;
  const progress = new Transform({ transform(chunk, _, cb) { count += chunk.length; hash.update(chunk); if (Date.now() - last > 10000) { console.log(`${path.basename(target)}: ${Math.round(count / 1048576)} MB`); last = Date.now(); } cb(null, chunk); } });
  await pipeline(Readable.fromWeb(response.body), progress, fs.createWriteStream(target + '.partial'));
  const digest = hash.digest('hex');
  if (checksum && digest.toLowerCase() !== checksum.toLowerCase()) throw new Error(`Checksum mismatch: ${path.basename(target)}`);
  fs.renameSync(target + '.partial', target);
  console.log(`Verified ${path.basename(target)} (${Math.round(count / 1048576)} MB)`);
}
function unpack(archive, target) {
  const absolute = path.resolve(target);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Extraction target outside project tools directory');
  fs.mkdirSync(absolute, { recursive: true });
  const r = spawnSync('tar', ['-xf', archive, '-C', absolute], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`Unable to extract ${archive}`);
}
if (process.argv[2] === '--download') {
  const [, , , url, target, checksum] = process.argv;
  const absolute = path.resolve(target);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Download target outside project tools');
  await download(url, absolute, checksum);
  process.exit(0);
}
const java = { link: 'https://corretto.aws/downloads/latest/amazon-corretto-17-x64-windows-jdk.zip', checksum: (await fetch('https://corretto.aws/downloads/latest_sha256/amazon-corretto-17-x64-windows-jdk.zip').then(r => r.text())).trim() };
const repository = await fetch('https://dl.google.com/android/repository/repository2-3.xml').then(r => { if (!r.ok) throw new Error(`SDK repository: ${r.status}`); return r.text(); });
fs.writeFileSync(path.join(root, 'android-repository.xml'), repository);
const packages = {};
for (const id of ['platforms;android-37.0', 'build-tools;37.0.0', 'build-tools;36.0.0', 'platform-tools', 'cmdline-tools;latest', 'ndk;27.1.12297006', 'cmake;3.22.1']) {
  const element = repository.split('<remotePackage ').find(s => s.startsWith(`path="${id}"`));
  if (!element) throw new Error(`SDK package unavailable: ${id}`);
  const archives = element.split('</remotePackage>')[0].split('<archive>').slice(1).map(s => s.split('</archive>')[0]);
  const archive = archives.find(s => s.includes('<host-os>windows</host-os>')) || archives.find(s => !s.includes('<host-os>'));
  if (!archive) throw new Error(`No Windows download: ${id}`);
  const url = archive.match(/<url>(.*?)<\/url>/)?.[1];
  const checksum = archive.match(/<checksum[^>]*>(.*?)<\/checksum>/)?.[1];
  packages[id] = { url: `https://dl.google.com/android/repository/${url}`, checksum, algorithm: 'sha1' };
  console.log(`SDK ${id}: ${url}`);
}
fs.writeFileSync(path.join(root, 'package-sources.json'), JSON.stringify({ java, packages }, null, 2));
const javaZip = path.join(downloads, 'jdk17.zip'), cliZip = path.join(downloads, 'commandline-tools.zip');
await download(java.link, javaZip, java.checksum);
await download(packages['cmdline-tools;latest'].url, cliZip, packages['cmdline-tools;latest'].checksum, 'sha1');
const javaRoot = path.join(root, 'jdk');
if (!fs.existsSync(javaRoot)) unpack(javaZip, javaRoot);
const sdkRoot = path.join(root, 'android-sdk');
const cliRoot = path.join(sdkRoot, 'cmdline-tools', 'latest');
if (!fs.existsSync(cliRoot)) {
  const stage = path.join(root, 'commandline-unpack'); unpack(cliZip, stage);
  const source = path.resolve(stage, 'cmdline-tools'), destination = path.resolve(cliRoot);
  if (!source.startsWith(root + path.sep) || !destination.startsWith(root + path.sep)) throw new Error('Tool paths outside project');
  fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.renameSync(source, destination);
}
const javaHome = fs.readdirSync(javaRoot).map(n => path.join(javaRoot, n)).find(p => fs.existsSync(path.join(p, 'bin', 'java.exe')));
if (!javaHome) throw new Error('JDK layout not recognized');
fs.writeFileSync(path.join(root, 'toolchain.json'), JSON.stringify({ javaHome, sdkRoot, cliRoot }, null, 2));
console.log(`Android toolchain ready: ${path.join(root, 'toolchain.json')}`);
if (process.argv.includes('--sdk')) {
  for (const [id, relative] of [
    ['platforms;android-37.0', 'platforms/android-37.0'],
    ['build-tools;37.0.0', 'build-tools/37.0.0'],
    ['build-tools;36.0.0', 'build-tools/36.0.0'],
    ['platform-tools', 'platform-tools'],
    ['ndk;27.1.12297006', 'ndk/27.1.12297006'],
    ['cmake;3.22.1', 'cmake/3.22.1'],
  ]) {
    const destination = path.resolve(sdkRoot, relative);
    if (fs.existsSync(path.join(destination, 'source.properties'))) { console.log(`Installed: ${id}`); continue; }
    const pkg = packages[id], archive = path.join(downloads, `${id.replaceAll(';', '-')}.zip`);
    await download(pkg.url, archive, pkg.checksum, pkg.algorithm);
    const stage = path.join(root, `unpack-${id.replaceAll(';', '-')}`); unpack(archive, stage);
    const entries = fs.readdirSync(stage);
    const source = entries.length === 1 && fs.statSync(path.join(stage, entries[0])).isDirectory() ? path.join(stage, entries[0]) : stage;
    if (!path.resolve(source).startsWith(root + path.sep) || !destination.startsWith(root + path.sep)) throw new Error('SDK installation target outside project tools');
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.renameSync(source, destination);
    console.log(`Installed: ${id}`);
  }
  // Register the manually downloaded, checksum-verified SDK packages in the
  // same local repository format used by the Android Gradle plugin.
  const namespaces = repository.match(/<sdk:sdk-repository\s+([^>]+)>/)[1];
  const licenses = [...repository.matchAll(/<license\b[^>]*>[\s\S]*?<\/license>/g)].map(m => m[0]);
  const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  const licenseDir = path.join(sdkRoot, 'licenses'); fs.mkdirSync(licenseDir, { recursive: true });
  for (const license of licenses) {
    const id = license.match(/id="([^"]+)"/)[1], text = decode(license.replace(/^<license[^>]*>/, '').replace(/<\/license>$/, '')).trim();
    fs.writeFileSync(path.join(licenseDir, `${id}.txt`), text);
    const file = path.join(licenseDir, id), old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split(/\s+/) : [];
    fs.writeFileSync(file, [...new Set([...old, crypto.createHash('sha1').update(text).digest('hex')])].join('\n') + '\n');
  }
  for (const [id, relative] of [ ['platforms;android-37.0', 'platforms/android-37.0'], ['build-tools;37.0.0', 'build-tools/37.0.0'], ['build-tools;36.0.0', 'build-tools/36.0.0'], ['platform-tools', 'platform-tools'], ['cmdline-tools;latest', 'cmdline-tools/latest'], ['ndk;27.1.12297006', 'ndk/27.1.12297006'], ['cmake;3.22.1', 'cmake/3.22.1'] ]) {
    const remote = repository.split('<remotePackage ').find(s => s.startsWith(`path="${id}"`)).split('</remotePackage>')[0];
    const local = (`<localPackage ${remote}</localPackage>`).replace(/<archives>[\s\S]*?<\/archives>/g, '').replace(/<channelRef[^>]*\/>/g, '');
    fs.writeFileSync(path.join(sdkRoot, relative, 'package.xml'), `<?xml version="1.0" encoding="UTF-8"?><common:repository ${namespaces}>${licenses.join('')}${local}</common:repository>`);
  }
  console.log('Registered SDK package receipts and local licenses.');
}
