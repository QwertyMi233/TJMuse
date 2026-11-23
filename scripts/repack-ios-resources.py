"""Repack an unsigned device IPA only when native inputs and assets match exactly.

This replaces an embedded Release Hermes bundle, not the native executable. It is
not a substitute for Xcode when dependencies, plugins or native config change.
Generate the bundle with Expo export:embed --platform ios --dev false --bytecode.
"""
import argparse
import copy
import hashlib
import json
import plistlib
import struct
import re
import zipfile
from pathlib import Path

from importlib.util import module_from_spec, spec_from_file_location


def sha(data):
    return hashlib.sha256(data).hexdigest()


def next_patch_version(old, new):
    if not all(re.fullmatch(r'\d+\.\d+\.\d+', value) for value in (old, new)):
        return False
    before, after = [int(v) for v in old.split('.')], [int(v) for v in new.split('.')]
    return before[:2] == after[:2] and after[2] == before[2] + 1


def native_config(raw, version_bump=False):
    config = json.loads(raw)
    config['expo']['ios'].pop('buildNumber', None)
    config['expo']['android'].pop('versionCode', None)
    if version_bump:
        config['expo'].pop('version', None)
    return config


def repack(base, source, embedded, output, expected_sha, allow_patch_version_bump=False):
    project = Path(__file__).resolve().parent.parent
    if output.resolve() == base.resolve():
        raise ValueError('The base IPA must be preserved separately.')
    if sha(base.read_bytes()) != expected_sha:
        raise ValueError('Base IPA checksum does not match its verification record.')
    spec = spec_from_file_location('verify_ipa', project / 'scripts/verify-ipa.py')
    verifier = module_from_spec(spec)
    spec.loader.exec_module(verifier)
    config = json.loads((project / 'app.json').read_text(encoding='utf-8'))['expo']
    native_files = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'app.json']
    # Translation TSV is an editable source catalog compiled into the JS bundle,
    # never a native resource. All embedded asset bytes are still compared below.
    js_catalogs = {'assets/translations-ui.tsv'}
    for directory in ['plugins', 'assets', '.eas', 'modules']:
        native_files.extend(p.relative_to(project).as_posix() for p in (project / directory).rglob('*') if p.is_file())
    native_files = [n for n in native_files if n not in js_catalogs and not any(part in {'node_modules', 'build', '.expo', '.cxx'} for part in Path(n).parts)]
    with zipfile.ZipFile(source) as previous:
        if previous.testzip():
            raise ValueError('Base source ZIP is corrupt.')
        previous_version = json.loads(previous.read('TJMuse/app.json'))['expo']['version']
        version_bump = previous_version != config['version']
        if version_bump and not (allow_patch_version_bump and next_patch_version(previous_version, config['version'])):
            raise ValueError('Version changed; an explicit next-patch metadata update is required.')
        previous_names = {n.removeprefix('TJMuse/') for n in previous.namelist()}
        prefixes = ('plugins/', 'assets/', '.eas/', 'modules/')
        previous_native = {n for n in previous_names if n.startswith(prefixes) and not n.endswith('/') and n not in js_catalogs}
        current_native = {n for n in native_files if n.startswith(prefixes)}
        if previous_native != current_native:
            raise ValueError('Native input file set changed; use a fresh native build.')
        for name in native_files:
            old, new = previous.read('TJMuse/' + name), (project / name).read_bytes()
            equal = native_config(old, version_bump) == native_config(new, version_bump) if name == 'app.json' else old == new
            if name == 'package.json' and version_bump:
                old_package, new_package = json.loads(old), json.loads(new)
                if old_package.pop('version') != previous_version or new_package.pop('version') != config['version']:
                    raise ValueError('Package version does not match app metadata.')
                equal = old_package == new_package
            if not equal:
                raise ValueError(f'Native input changed: {name}; use a fresh native build.')
    new_bundle = (embedded / 'main.jsbundle').read_bytes()
    magic = bytes.fromhex('c61fbc03c103191f')
    if new_bundle[:8] != magic or len(new_bundle) < 1_000_000:
        raise ValueError('Expected an exported Release Hermes bytecode bundle.')
    with zipfile.ZipFile(base) as archive:
        if archive.testzip():
            raise ValueError('Base IPA ZIP is corrupt.')
        roots = [n[:-len('Info.plist')] for n in archive.namelist() if n.startswith('Payload/') and n.endswith('.app/Info.plist') and n.count('/') == 2]
        if len(roots) != 1:
            raise ValueError('Expected one main app.')
        root = roots[0]
        if any('/_CodeSignature/' in n or n.endswith('/embedded.mobileprovision') for n in archive.namelist()):
            raise ValueError('Use the verified unsigned base IPA.')
        info_raw = archive.read(root + 'Info.plist')
        info = plistlib.loads(info_raw)
        if info['CFBundleIdentifier'] != config['ios']['bundleIdentifier'] or info['CFBundleShortVersionString'] != previous_version:
            raise ValueError('Base application identity or version differs.')
        native = archive.read(root + info['CFBundleExecutable'])
        if verifier.macho_details(native)['hasCodeSignatureLoadCommand']:
            raise ValueError('Base executable must be unsigned.')
        old_bundle = archive.read(root + 'main.jsbundle')
        if old_bundle[:12] != new_bundle[:12]:
            raise ValueError('Hermes bytecode versions differ.')
        resource_dir = embedded / 'resources'
        resources = {p.relative_to(resource_dir).as_posix(): p.read_bytes() for p in resource_dir.rglob('*') if p.is_file()}
        base_resources = {n.removeprefix(root): archive.read(n) for n in archive.namelist() if n.startswith(root + 'assets/') and not n.endswith('/')}
        if resources != base_resources:
            raise ValueError('Embedded assets changed; this conservative repacker requires a fresh native build.')
        constants_raw = archive.read(root + 'EXConstants.bundle/app.config')
        constants = json.loads(constants_raw)
        if constants['version'] != previous_version or constants['ios']['bundleIdentifier'] != config['ios']['bundleIdentifier']:
            raise ValueError('Embedded Expo identity differs.')
        previous_build = info['CFBundleVersion']
        info['CFBundleShortVersionString'] = config['version']
        constants['version'] = config['version']
        info['CFBundleVersion'] = config['ios']['buildNumber']
        constants['ios']['buildNumber'] = config['ios']['buildNumber']
        constants['android']['versionCode'] = config['android']['versionCode']
        replacements = {
            root + 'main.jsbundle': new_bundle,
            root + 'Info.plist': plistlib.dumps(info, fmt=plistlib.FMT_BINARY if info_raw.startswith(b'bplist') else plistlib.FMT_XML, sort_keys=False),
            root + 'EXConstants.bundle/app.config': json.dumps(constants, ensure_ascii=False, separators=(',', ':')).encode(),
        }
        # Embedded extensions must share the containing app's build number.
        # Only version metadata changes; extension executables remain byte-identical.
        for name in archive.namelist():
            if name.startswith(root + 'PlugIns/') and name.endswith('.appex/Info.plist'):
                raw = archive.read(name)
                extension = plistlib.loads(raw)
                if extension.get('CFBundleShortVersionString') != previous_version:
                    raise ValueError('Extension version differs from the app.')
                extension['CFBundleShortVersionString'] = config['version']
                extension['CFBundleVersion'] = config['ios']['buildNumber']
                replacements[name] = plistlib.dumps(extension, fmt=plistlib.FMT_BINARY if raw.startswith(b'bplist') else plistlib.FMT_XML, sort_keys=False)
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
            for entry in archive.infolist():
                target.writestr(copy.copy(entry), replacements.get(entry.filename, archive.read(entry.filename)))
        with zipfile.ZipFile(output) as target:
            if target.testzip() or target.namelist() != archive.namelist():
                raise ValueError('Repacked ZIP integrity or entry set differs.')
            for name in archive.namelist():
                if target.read(name) != replacements.get(name, archive.read(name)):
                    raise ValueError(f'Repacked content mismatch: {name}')
        report = {
            'packagingMode': 'local-release-resource-repack', 'freshXcodeBuild': False,
            'baseNativeBuildNumber': previous_build, 'buildNumber': config['ios']['buildNumber'],
            'baseVersion': previous_version, 'version': config['version'], 'patchVersionMetadataUpdated': version_bump,
            'baseIpaSha256': expected_sha, 'nativeExecutableSha256': sha(native),
            'nativeInputFilesMatched': len(native_files), 'unchangedEmbeddedAssets': len(resources),
            'sourceComparisonExcludesJsCatalogs': sorted(js_catalogs),
            'allNativeFilesByteIdentical': True, 'onlyChangedEntries': list(replacements),
            'hermesBytecodeVersion': struct.unpack_from('<I', new_bundle, 8)[0],
            'releaseBundleSha256': sha(new_bundle), 'sizeBytes': output.stat().st_size,
            'sha256': sha(output.read_bytes()), 'deviceLaunchVerified': False,
        }
    Path(str(output) + '.resources.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True, help='Matching archived base source ZIP')
    parser.add_argument('--embedded', type=Path, required=True, help='Directory with main.jsbundle and resources/')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--base-sha256', required=True)
    parser.add_argument('--allow-patch-version-bump', action='store_true', help='Permit only the next patch version metadata; all other native inputs must match.')
    args = parser.parse_args()
    print(json.dumps(repack(args.base, args.source, args.embedded, args.output, args.base_sha256, args.allow_patch_version_bump), indent=2))
