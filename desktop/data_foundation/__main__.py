import argparse
import json
import sys
from pathlib import Path
from .core import activate, connect, import_catalog, snapshot
from .tabular import import_questions, read_video_table
from .reporting import private_export, report, seed_categories, write_json


def main(argv=None):
    parser = argparse.ArgumentParser(description='Study Atlas local data foundation')
    parser.add_argument('--db', required=True, help='Private local SQLite path')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('init')
    q = sub.add_parser('questions')
    q.add_argument('path'); q.add_argument('--provider', default='uworld'); q.add_argument('--product', default='step1')
    q.add_argument('--columns'); q.add_argument('--allow-smaller', action='store_true')
    v = sub.add_parser('videos')
    v.add_argument('path'); v.add_argument('--resource', required=True, choices=['bnb','pathoma','sketchy'])
    v.add_argument('--columns'); v.add_argument('--allow-smaller', action='store_true')
    p = sub.add_parser('pdf')
    p.add_argument('path'); p.add_argument('--resource', required=True, choices=['bnb','pathoma','firstaid'])
    p.add_argument('--allow-smaller', action='store_true')
    s = sub.add_parser('register')
    s.add_argument('path'); s.add_argument('--source-key', required=True)
    sub.add_parser('map')
    o = sub.add_parser('firstaid-outline'); o.add_argument('path')
    o = sub.add_parser('outline-export'); o.add_argument('out')
    o = sub.add_parser('outline-browse'); o.add_argument('--chapter'); o.add_argument('--query',default=''); o.add_argument('--limit',type=int,default=100)
    o = sub.add_parser('outline-select'); o.add_argument('node_ids',nargs='+'); o.add_argument('--out',required=True)
    o = sub.add_parser('study-units'); o.add_argument('--out',required=True)
    o = sub.add_parser('study-units-select'); o.add_argument('unit_ids',nargs='+'); o.add_argument('--out',required=True)
    a = sub.add_parser('anki')
    a.add_argument('path'); a.add_argument('--collection', required=True); a.add_argument('--confirmed-backup', action='store_true')
    r = sub.add_parser('report'); r.add_argument('--out')
    e = sub.add_parser('export-private'); e.add_argument('directory')
    a = sub.add_parser('activate'); a.add_argument('catalog_id')
    args = parser.parse_args(argv)
    db = connect(args.db)
    try:
        seed_categories(db)
        columns = json.loads(Path(args.columns).read_text()) if getattr(args,'columns',None) else None
        if args.command == 'questions':
            result = import_questions(db, args.path, provider=args.provider, product=args.product, explicit=columns, allow_smaller=args.allow_smaller)
        elif args.command in ('videos','pdf'):
            if args.command == 'videos':
                rows, validation = read_video_table(args.path, columns)
            else:
                from .pdf_adapters import bnb_pdf, pathoma_pdf, firstaid_pdf
                rows, validation = {'bnb':bnb_pdf,'pathoma':pathoma_pdf,'firstaid':firstaid_pdf}[args.resource](args.path)
            result = import_catalog(db, args.path, args.resource, rows, validation, allow_smaller=args.allow_smaller, config=columns)
        elif args.command == 'register':
            with db:
                sid = snapshot(db, args.path, args.source_key, 0, {'status':'reference_only_not_a_catalog'})
            result = {'snapshot_id':sid,'status':'reference_only'}
        elif args.command == 'map':
            from .mappings import generate
            result = generate(db)
        elif args.command == 'firstaid-outline':
            from .firstaid_outline import build
            result = build(db,args.path)
        elif args.command == 'outline-export':
            from .firstaid_outline import outline
            data=outline(db);write_json(args.out,data)
            result={'out':args.out,'topic_groups':len(data['topics'])}
        elif args.command == 'outline-browse':
            from .firstaid_outline import browse
            result=browse(db,chapter_name=args.chapter,query=args.query,limit=args.limit)
        elif args.command == 'outline-select':
            from .firstaid_outline import linked_resources
            data=linked_resources(db,args.node_ids);write_json(args.out,data)
            result={'out':args.out,'referenced_pages':data['selection']['distinct_referenced_pages'],'requires_review':True}
        elif args.command in ('study-units','study-units-select'):
            from .study_units import build, select
            data=build(db) if args.command=='study-units' else select(db,args.unit_ids)
            write_json(args.out,data)
            result={'out':args.out, **data.get('report',{'requires_review':True})}
        elif args.command == 'anki':
            from .anki import import_anki
            result = import_anki(db, args.path, collection=args.collection, confirmed_backup=args.confirmed_backup)
        elif args.command == 'activate':
            activate(db,args.catalog_id); result = {'activated':args.catalog_id}
        elif args.command == 'export-private':
            private_export(db,args.directory); result = {'private_export':str(Path(args.directory).resolve())}
        else:
            result = report(db)
            if getattr(args,'out',None):
                write_json(args.out,result)
        # Full parser details remain local in the snapshot report.
        summary = {k:v for k,v in result.items() if k not in ('raw_ocr_lines','warnings')}
        if 'warnings' in result:
            summary['warning_count'] = len(result['warnings'])
        print(json.dumps(summary, indent=2, ensure_ascii=False))
    finally:
        db.close()


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as exc:
        print(f'Import rejected: {exc}', file=sys.stderr)
        raise SystemExit(2)
