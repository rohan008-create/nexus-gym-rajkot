"""Install a pinned official portable Blender without sudo or changing PATH.
Optional --archive reuses a previously downloaded official archive.
"""
import argparse
import hashlib
import shutil
import tarfile
import tempfile
import urllib.request
from pathlib import Path

VERSION = '4.5.9'
NAME = f'blender-{VERSION}-linux-x64'
SHA256 = 'dcdc3eca6c9825bb35a8033b689c053f3cb5a9b0cd2a61b2eac2a49436b4ad3d'
URL = f'https://download.blender.org/release/Blender4.5/{NAME}.tar.xz'
parser = argparse.ArgumentParser()
parser.add_argument('--archive', type=Path)
parser.add_argument('--install-dir', type=Path, default=Path.home() / '.cache/nexus-gym/tooling')
args = parser.parse_args()
args.install_dir.mkdir(parents=True, exist_ok=True)
target = args.install_dir / NAME
if target.exists():
    raise SystemExit(f'Refusing to overwrite an existing installation: {target}')
with tempfile.TemporaryDirectory(prefix='nexus-blender-') as scratch:
    archive = args.archive
    if archive is None:
        archive = Path(scratch) / f'{NAME}.tar.xz'
        urllib.request.urlretrieve(URL, archive)
    with archive.open('rb') as stream:
        actual = hashlib.file_digest(stream, 'sha256').hexdigest()
    if actual != SHA256:
        raise SystemExit(f'SHA256 mismatch: {actual}')
    with tarfile.open(archive) as bundle:
        bundle.extractall(scratch, filter='data')
    shutil.move(str(Path(scratch) / NAME), target)
print(target / 'blender')
