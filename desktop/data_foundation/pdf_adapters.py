"""Adapters for the supplied PDF layouts. No question content extraction."""
import re
import subprocess
import tempfile
from collections import Counter
from pathlib import Path
from .core import norm, stable


def bnb_pdf(path):
    from pypdf import PdfReader
    out, warnings, declared, counts, totals = [], [], {}, Counter(), Counter()
    module = section = None
    for p, page in enumerate(PdfReader(path).pages, 1):
        for line_no, raw in enumerate(page.extract_text().splitlines(), 1):
            line = ' '.join(raw.replace('□', '').split())
            m = re.match(r'^(.+?)\s*\((\d+) videos?;\s*(.+)\)$', line)
            if m:
                module = m[1].strip()
                declared[module] = {'count': int(m[2]), 'duration_label': m[3]}
                section = None
                continue
            m = re.match(r'^[IVX]+\.\s*(.+?)\s*\([^)]+\)$', line)
            if m:
                section = m[1].strip()
                continue
            m = re.match(r'^(.+?)\s*\(\s*(\d+) minutes?\)$', line)
            if m:
                if not module or not section:
                    raise ValueError(f'BnB lesson without hierarchy on page {p}')
                title, seconds = m[1].strip(), int(m[2]) * 60
                counts[module] += 1
                totals[module] += seconds
                out.append({'source_key': norm(module) + '/' + norm(section) + '/' + norm(title),
                            'title': title, 'module': module, 'section': section,
                            'duration_seconds': seconds, 'locator': f'pdf-page:{p}:line:{line_no}', 'status': 'source_extracted'})
            elif line and 'Copyright' not in line and 'Checklist' not in line:
                warnings.append({'page': p, 'unparsed_line': line})
    if not declared:
        raise ValueError('No BnB module headers recognized')
    for module, expected in declared.items():
        if counts[module] != expected['count']:
            warnings.append({'module': module, 'declared_count': expected['count'], 'parsed_count': counts[module]})
        hours = re.search(r'(\d+) hours?', expected['duration_label'])
        minutes = re.search(r'(\d+) minutes?', expected['duration_label'])
        declared_seconds = (int(hours[1]) * 3600 if hours else 0) + (int(minutes[1]) * 60 if minutes else 0)
        if totals[module] != declared_seconds:
            warnings.append({'module': module, 'declared_seconds': declared_seconds, 'sum_lesson_seconds': totals[module],
                             'reason': 'Printed rounded runtime totals differ; individual listed durations retained.'})
    return out, {'pdf_pages': p, 'modules': len(counts), 'parsed_rows': len(out),
                 'declared_videos': sum(x['count'] for x in declared.values()),
                 'duration_seconds': sum(totals.values()), 'missing_durations': 0,
                 'module_counts': dict(counts), 'warnings': warnings,
                 'identity_policy': 'Checklist lacks official video IDs. Title/module keys are provisional; use explicit stable IDs for later CSV updates.'}


def pathoma_pdf(path):
    import pdfplumber
    from pypdf import PdfReader
    native_pages = PdfReader(path).pages
    # This checklist's broken character map still provides an independent numeric
    # channel. Mapping was checked against the rendered first-page durations.
    digit_map = str.maketrans({'0':'1','?':'2','I':'3','B':'4','H':'5','O':'6','Q':'7','@':'8','M':'9','J':'0','A':':'})
    verified_duration_rows = 0
    out, warnings, raw_lines = [], [], []
    with pdfplumber.open(path) as pdf, tempfile.TemporaryDirectory() as temp:
        for p, page in enumerate(pdf.pages, 1):
            page_start = len(out)
            # Crop the title and duration columns. Dark threshold removes the gray table grid.
            crop = page.crop((page.width * .295, 0, page.width * .837, page.height * .98))
            im = crop.to_image(resolution=300).original.convert('L').point(lambda x: 0 if x < 100 else 255)
            image = Path(temp) / f'page-{p}.png'
            im.save(image)
            proc = subprocess.run(['tesseract', str(image), 'stdout', '--psm', '6'],
                                  capture_output=True, text=True, timeout=120, check=True)
            page_rows = 0
            for line_no, raw in enumerate(proc.stdout.splitlines(), 1):
                raw = raw.strip()
                if not raw:
                    continue
                raw_lines.append({'page': p, 'line': line_no, 'text': raw})
                m = re.match(r'^(\d{1,2}\.\d+(?:\.\d+)?)\s+(.+?)\s+(\d{1,3}):([0-5]\d)\s*$', raw)
                if not m:
                    if re.match(r'^\d', raw):
                        warnings.append({'page': p, 'line': line_no, 'unparsed_row': raw})
                    continue
                page_rows += 1
                # Retain row groups; a single duration cannot be allocated to constituent lessons.
                title = m[2].strip()
                grouped = bool(re.search(r'\b\d{1,2}\.\d+', title) or '...' in title or len(m[1].split('.')) > 3)
                out.append({'source_key': f'checklist/{m[1]}/{norm(title)}', 'title': title,
                            'module': m[1].split('.')[0], 'section': m[1],
                            'duration_seconds': int(m[3]) * 60 + int(m[4]),
                            'locator': f'pdf-page:{p}:ocr-line:{line_no}',
                            'status': 'review_ocr_combined_row' if grouped else 'review_ocr'})
            if not page_rows:
                raise ValueError(f'Pathoma OCR produced no rows on page {p}')
            native_tokens = re.findall(r'[0?IBHOQ@MJ]{1,3}A[0?IBHOQ@MJ]{2}', native_pages[p-1].extract_text())
            if native_tokens:
                expected = []
                for token in native_tokens:
                    minutes, seconds = map(int, token.translate(digit_map).split(':'))
                    expected.append(minutes*60+seconds)
                actual = [r['duration_seconds'] for r in out[page_start:]]
                if expected != actual:
                    raise ValueError(f'Pathoma OCR row count or durations disagree with independent glyph channel on page {p}; review required')
                verified_duration_rows += len(actual)
            else:
                warnings.append({'page':p,'reason':'No independent numeric glyph channel; durations require visual review'})
    return out, {'pdf_pages': p, 'parsed_rows': len(out), 'duration_seconds': sum(r['duration_seconds'] for r in out),
                 'combined_rows': sum(r['status'] == 'review_ocr_combined_row' for r in out),
                 'missing_durations': 0, 'warnings': warnings,
                 'independently_checked_duration_rows': verified_duration_rows,
                 'ocr_review_required': True, 'raw_ocr_lines': raw_lines,
                 'notes': 'Counts are printed duration rows, not individual lessons; OCR needs human review. No claimed edition or provider IDs.'}


def firstaid_pdf(path):
    import pdfplumber
    rows, warnings, printed_pages, raw_count, reference_count = [], [], [], 0, 0
    parent, pending = '', ''
    # Only numeric page references are imported; See/See also remain in a review manifest.
    suffix = re.compile(r'^(.*?),?\s+((?:\d{1,3}(?:[–-]\d{1,3})?)(?:\s*,\s*\d{1,3}(?:[–-]\d{1,3})?)*)$')
    with pdfplumber.open(path) as pdf:
        for p, page in enumerate(pdf.pages, 1):
            top = page.crop((0, 0, page.width, 70)).extract_text() or ''
            page_number = re.search(r'\b(7[7-9]\d|8[0-4]\d)\b', top)
            # First index page starts lower and is not numbered in the header.
            if p == 4:
                start_y, base = 220, 87
                printed_pages.append(773)
            elif page_number and 'INDEX' in top:
                start_y = 65
                printed_pages.append(int(page_number[1]))
                # Recto/verso margins are not reliably inferred from PDF page parity.
                chars = [c for c in page.chars if c['top'] > 65 and c['top'] < 780 and c['text'].strip()]
                min_x = min(c['x0'] for c in chars)
                base = 69 if min_x < 80 else 87
            else:
                continue
            for col in range(4):
                left = base + col * 132.75 - .5
                right = min(left + 132.5, page.width)
                text = page.crop((left, start_y, right, 785)).extract_text(x_tolerance=1.5, y_tolerance=3) or ''
                for n, raw in enumerate(text.splitlines(), 1):
                    raw = ' '.join(raw.split())
                    if not raw or len(raw) == 1:
                        continue
                    raw_count += 1
                    line = (pending + ' ' + raw).strip() if pending else raw
                    m = suffix.match(line)
                    if m:
                        label = m[1].rstrip(',').strip()
                        refs = []
                        for segment in m[2].split(','):
                            endpoints = re.split('[–-]', segment.strip())
                            lo, hi = int(endpoints[0]), int(endpoints[-1])
                            if lo < 1 or hi < lo or hi > 843 or hi - lo > 100:
                                warnings.append({'page': p, 'entry': line, 'reason': 'Invalid reference range'})
                                refs = []
                                break
                            refs.extend(range(lo, hi + 1))
                        if label and refs:
                            rows.append({'source_key': stable('fa-entry', p, col, n, label),
                                         'title': label, 'module': 'Index', 'section': parent or None,
                                         'page_refs': sorted(set(refs)), 'duration_seconds': None,
                                         'locator': f'pdf-page:{p}:column:{col+1}:line:{n}',
                                         'status': 'review_index_context'})
                            reference_count += len(set(refs))
                        else:
                            warnings.append({'page': p, 'entry': line, 'reason': 'Missing label or usable pages'})
                        pending = ''
                    elif 'See ' in line or 'See also' in line:
                        warnings.append({'page': p, 'entry': line, 'reason': 'Text cross-reference retained for review'})
                        pending = ''
                    elif raw.endswith((',', ' and', ' of', ' with', ' in', '-', 'for')) or pending:
                        pending = line
                        if len(pending) > 350:
                            warnings.append({'page': p, 'entry': pending, 'reason': 'Unresolved wrapping'})
                            pending = ''
                    else:
                        parent = raw
    if pending:
        warnings.append({'entry': pending, 'reason': 'Unresolved final entry'})
    if not rows:
        raise ValueError('First Aid index layout not recognized')
    missing = sorted(set(range(min(printed_pages), max(printed_pages)+1)) - set(printed_pages))
    return rows, {'pdf_pages': p, 'parsed_index_entries': len(rows), 'page_reference_count': reference_count,
                  'index_pages_seen': printed_pages, 'missing_index_pages_within_range': missing,
                  'raw_index_lines': raw_count, 'warnings': warnings,
                  'notes': 'Partial numeric index extraction; context/wrapping requires review. No reading-time estimates. Index entries are not canonical topics.'}
