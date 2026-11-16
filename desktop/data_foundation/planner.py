"""Local JSON planning interface. Optional First Aid database is read-only."""
import argparse
import json
import sqlite3
from pathlib import Path
from .feasibility import firstaid_tasks
from .scheduler import propose


def run(request,*,firstaid_db=None):
    if request.get('schema_version')!='study-atlas-planning-request/v1':raise ValueError('Unsupported planning request')
    if ('tasks' in request)==('firstaid_selection' in request):raise ValueError('Supply tasks OR firstaid_selection')
    if 'firstaid_selection' in request:
        if firstaid_db is None:raise ValueError('First Aid database path required')
        db=sqlite3.connect(Path(firstaid_db).resolve().as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
        try:
            selection=request['firstaid_selection']
            tasks=firstaid_tasks(db,selection['topic_ids'],deadline=selection['deadline'],
                progress=selection.get('progress'),pace_multiplier=selection.get('pace_multiplier',1))
        finally:db.close()
    else:tasks=request['tasks']
    return propose(tasks,request['windows'],locks=request.get('locks'),previous=request.get('previous_plan'))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('request');parser.add_argument('--firstaid-db');parser.add_argument('--out',required=True)
    args=parser.parse_args()
    source=Path(args.request)
    if source.stat().st_size>20*1024*1024:raise ValueError('Planning request exceeds 20 MiB')
    plan=run(json.loads(source.read_text(encoding='utf-8')),firstaid_db=args.firstaid_db)
    target=Path(args.out);target.parent.mkdir(parents=True,exist_ok=True)
    # Avoid silently replacing an accepted plan or a previous version.
    with target.open('x',encoding='utf-8') as f:f.write(json.dumps(plan,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'status':plan['status'],'plan_id':plan['plan_id'],'assigned_segments':len(plan['assignments']),
                      'unscheduled_minutes':plan['unscheduled_minutes'],'out':str(target.resolve())}))


if __name__=='__main__':main()
