"""Rerun the complete supplied-source pipeline from explicit local paths."""
import argparse
import json
from pathlib import Path
from .core import connect, import_catalog, now, snapshot
from .tabular import import_questions
from .pdf_adapters import bnb_pdf, pathoma_pdf, firstaid_pdf
from .mappings import generate
from .reporting import private_export, report, seed_categories, write_json


def run(db_path, config_path, export_dir):
    config=json.loads(Path(config_path).read_text())
    required={'questions','bnb','pathoma','firstaid','guidebook'}
    if not required <= config.keys():
        raise ValueError('Config requires local paths: '+', '.join(sorted(required)))
    for key in required:
        if not Path(config[key]).is_file():
            raise ValueError(f'Missing local input: {key}')
    db=connect(db_path)
    log=Path(db_path).with_suffix('.imports.jsonl')
    def execute(name, fn):
        try:
            result=fn()
            receipt={'timestamp':now(),'adapter':name,'status':'success','snapshot_id':result.get('snapshot_id')}
        except Exception as exc:
            with log.open('a') as f:f.write(json.dumps({'timestamp':now(),'adapter':name,'status':'failed','error_type':type(exc).__name__})+'\n')
            raise
        with log.open('a') as f:f.write(json.dumps(receipt)+'\n')
        return result
    try:
        seed_categories(db)
        execute('questions',lambda:import_questions(db,config['questions']))
        for resource,adapter in [('bnb',bnb_pdf),('pathoma',pathoma_pdf),('firstaid',firstaid_pdf)]:
            def do_import():
                rows,validation=adapter(config[resource])
                return import_catalog(db,config[resource],resource,rows,validation)
            execute(resource,do_import)
        with db:
            snapshot(db,config['guidebook'],'guidebook',0,{'status':'reference_only','notes':'Institutional guide, not a current official exam specification or a resource mapping catalog.'})
        generate(db)
        from .firstaid_outline import build
        execute('firstaid-outline',lambda:build(db,config['firstaid']))
        from .study_units import build as build_units
        execute('study-units',lambda:build_units(db))
        private_export(db,export_dir)
        final=report(db)
        write_json(Path(export_dir)/'coverage.json',final)
        return final
    finally:
        db.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db',required=True);p.add_argument('--config',required=True);p.add_argument('--export-dir',required=True)
    a=p.parse_args()
    r=run(a.db,a.config,a.export_dir)
    print(json.dumps({k:r[k] for k in ['question_records','source_label_topics','resources','exact_title_candidates','fuzzy_title_candidates','candidate_question_coverage_percent','integrity_check']},indent=2))
