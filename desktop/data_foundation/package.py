"""Build a shareable allowlisted package. Restricted rows never enter this ZIP."""
import argparse
import csv
import hashlib
import io
import json
import tempfile
import zipfile
from pathlib import Path
from .core import checksum, connect
from .reporting import seed_categories, write_json


def verify(path):
    with zipfile.ZipFile(path) as z:
        if z.testzip() is not None:
            raise ValueError('ZIP CRC failed')
        manifest=json.loads(z.read('PACKAGE_MANIFEST.json'))
        names=z.namelist()
        if len(names)!=len(set(names)):
            raise ValueError('Duplicate ZIP members')
        if set(names) != set(manifest['files']) | {'PACKAGE_MANIFEST.json'}:
            raise ValueError('Manifest member mismatch')
        for name,expected in manifest['files'].items():
            if name.startswith('/') or '..' in Path(name).parts or 'private-data' in Path(name).parts:
                raise ValueError('Unsafe ZIP path')
            content=z.read(name)
            if hashlib.sha256(content).hexdigest()!=expected['sha256'] or len(content)!=expected['bytes']:
                raise ValueError('Member checksum mismatch: '+name)
    return {'path':Path(path).name,'bytes':Path(path).stat().st_size,'sha256':checksum(path),
            'members':len(names),'crc':'passed','member_sha256':'passed','manifest_members':'passed'}


def build(root, output):
    root,output=Path(root).resolve(),Path(output).resolve()
    files={}
    for name in ('CONTINUE.md','PLAN.md'):
        if (root/name).is_file():files[name]=(root/name).read_bytes()
    source=root/'desktop/data_foundation'
    for path in sorted(source.rglob('*')):
        if path.is_file() and path.suffix in ('.py','.sql','.json','.txt') and '__pycache__' not in path.parts:
            files[path.relative_to(root).as_posix()]=path.read_bytes()
    for path in sorted((root/'docs/data').glob('*')):
        if path.is_file() and path.suffix in ('.md','.json','.csv'):
            files[path.relative_to(root).as_posix()]=path.read_bytes()
    with tempfile.TemporaryDirectory() as temp:
        dbpath=Path(temp)/'categories.sqlite'
        db=connect(dbpath);seed_categories(db)
        rows=[dict(r) for r in db.execute("SELECT * FROM topics WHERE origin='official_category' ORDER BY id")]
        tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        dictionary={name:[dict(r) for r in db.execute('PRAGMA table_info('+name+')')] for name in tables}
        assert len(rows)==22 and db.execute('SELECT count(*) FROM question_references').fetchone()[0]==0
        db.close()
        files['data/official_categories.sqlite']=dbpath.read_bytes()
        files['data/official_categories.json']=(json.dumps(rows,indent=2)+'\n').encode()
        stream=io.StringIO(newline='');writer=csv.DictWriter(stream,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
        files['data/official_categories.csv']=stream.getvalue().encode()
        files['data/DATA_DICTIONARY.json']=(json.dumps(dictionary,indent=2)+'\n').encode()
    files['README.md']=b'''# Study Atlas Checkpoint 1 package

Start with docs/data/CHECKPOINT1.md and docs/data/README.md.
This shareable package contains reusable import code, SQL schema, verification
reports, source/rights manifests and 22 referenced official category records.
It does NOT contain the private question/video/index catalogs, mapping candidates,
question bodies, Anki content, student records or the owner's prototype snapshot.
The real normalized database and CSV/JSON exports were built separately in the
private local workspace. See the aggregate report for actual counts and gaps.
Test fixtures inside test source are synthetic tests, never research datasets.
No installer, complete planner UI, or clinical validation is claimed.

From desktop/: python -m unittest discover -s data_foundation/tests -v
Verify ZIP: python -m data_foundation.package --verify /path/to/package.zip
'''
    manifest={'package_version':'1','classification':'shareable_code_reference_facts_and_aggregate_reports',
              'private_catalogs_included':False,'files':{name:{'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()} for name,data in files.items()}}
    files['PACKAGE_MANIFEST.json']=(json.dumps(manifest,indent=2)+'\n').encode()
    output.parent.mkdir(parents=True,exist_ok=True)
    temp_output=output.with_suffix('.zip.tmp')
    with zipfile.ZipFile(temp_output,'w',zipfile.ZIP_DEFLATED) as z:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,10,18,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,data)
    verify(temp_output)
    temp_output.replace(output)
    result=verify(output)
    write_json(output.with_suffix('.verification.json'),result)
    output.with_suffix('.sha256').write_text(result['sha256']+'  '+output.name+'\n')
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',default='..');p.add_argument('--output');p.add_argument('--verify')
    a=p.parse_args()
    if not a.verify and not a.output:p.error('--output or --verify required')
    print(json.dumps(verify(a.verify) if a.verify else build(a.root,a.output),indent=2))
