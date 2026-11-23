"""Package reproducible project sources, excluding local tools and credentials."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
output = root / 'releases' / f'TJMuse-{version}-source.zip'
root_names = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'app.json',
              'eas.json', 'tsconfig.json', 'expo-env.d.ts', '.npmrc', '.gitignore', '.easignore']
files = [root / name for name in root_names] + list(root.glob('*.md'))
excluded = {'node_modules', '.git', '.expo', '.build-tools', '.pnpm-store', '.cxx',
            'dist', 'releases', 'artifacts', 'playwright-report', '__pycache__', 'build'}
private_suffixes = {'.jks', '.keystore', '.p8', '.p12', '.pem', '.key', '.mobileprovision', '.log', '.pyc'}
for name in ['app', 'src', 'assets', 'plugins', 'scripts', 'tests', 'modules', '.eas', '.github']:
    for file in (root / name).rglob('*'):
        if any(part in excluded for part in file.relative_to(root).parts):
            continue
        if file.is_symlink():
            raise ValueError(f'Inspect symlink before packaging: {file}')
        if file.is_file() and (not file.name.startswith('.env') or file.name == '.env.example') and file.suffix.lower() not in private_suffixes and file.name.lower() not in {'credentials.json', 'id_rsa', 'id_ed25519'}:
            files.append(file)
files = sorted(set(files))
for file in files:
    if not file.is_file() or not file.resolve().is_relative_to(root):
        raise ValueError(f'Unexpected source path: {file}')
if any(marker in (root / '.npmrc').read_text(encoding='utf-8').lower() for marker in ['_authtoken', '_auth=', '_password', 'password=']):
    raise ValueError('Remove private npm credentials before packaging.')
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in files:
        archive.write(file, 'TJMuse/' + file.relative_to(root).as_posix())
with zipfile.ZipFile(output) as archive:
    if archive.testzip():
        raise ValueError('ZIP integrity check failed')
    for file in files:
        if archive.read('TJMuse/' + file.relative_to(root).as_posix()) != file.read_bytes():
            raise ValueError(f'Archive content mismatch: {file}')
with output.open('rb') as stream:
    sha256 = hashlib.file_digest(stream, 'sha256').hexdigest()
output.with_suffix('.zip.sha256').write_text(f'{sha256}  {output.name}\n', encoding='utf-8')
print(json.dumps({'file': str(output), 'sourceFiles': len(files), 'sizeBytes': output.stat().st_size,
                  'sha256': sha256, 'integrityVerified': True}, ensure_ascii=False))
