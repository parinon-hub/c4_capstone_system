"""Convert SASO's 'List of Student Activities' workbooks into data/activity-archive.js.

Usage: python3 -I convert.py <xlsx-2023> <xlsx-2024> <out.js>
"""
import sys, re, json, datetime
import openpyxl

F2023, F2024, OUT = sys.argv[1:4]

MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
          'september', 'october', 'november', 'december']

DEMO = {'JPCSCSPC': 'org-1', 'CCSSC': 'org-2', 'CHSSC': 'org-3', 'CSPCSSC': 'org-4', 'CASCSC': 'org-5',
        'JPCS': 'org-1', 'SSC': 'org-4'}

CATEGORY_SHEETS = {
    'Student Publication Activities': 'Student Publication',
    'Leadership Activities': 'Leadership',
    'Volunteer Activities (On)': 'Volunteer',
    'Volunteer Activities (Off)': 'Volunteer',
    'Environment Activities': 'Environmental',
    'Multi-Faith Activities': 'Multi-Faith',
}

RULES = [
    ('Multi-Faith', r'\b(mass|fellowship|worship|bible|prayer|recollection|retreat|faith|jesus|christ|praise|ministry|devotion|church|catholic|alpha)\b'),
    ('Student Publication', r'\b(publication|journalism|journalist|press|folio|newsletter|editorial|campus paper|spark)\b'),
    ('Environmental', r'\b(tree planting|tree-planting|environment\w*|clean[- ]?up|coastal|mangrove|eco\w*|waste|recycl\w*|earth)\b'),
    ('Sports', r'\b(sport\w*|intramural\w*|basketball|volleyball|chess|e-?sports?|fun run|tournament|athletic\w*|palaro|futsal|badminton|varsity|marathon|zumba|dance ?sport)\b'),
    ('IGP', r'\b(booth|selling|sale|merch\w*|shirt|uniform|lanyard|igp|income|token|souvenir|t-shirt|jacket|pins?|photo booth)\b'),
    ('Volunteer', r'\b(outreach|feeding|donation|blood\w*|relief|volunteer\w*|tutorial|community|extension|mission|immersion|gift giving|bloodletting|first aid|red cross|rcy)\b'),
    ('Leadership', r'\b(election\w*|elect\w*|oath|turn-?over|leadership|leaders?|team ?building|teambuilding|assembly|plebiscite|congress|summit|officers?|bidding|committee|interview|re-?organization|planning|cbl|constitution)\b'),
    ('Socio-Civic', r'\b(orientation|orsem|acquaintance|freshie\w*|welcome|fair|party|night|celebration|week|festival|pageant|concert|contest|competition|ball|christmas|halloween|valentine|anniversary|day|parade|cultural|search for|mr\.|ms\.|audition)\b'),
]

KEEP_UPPER = {'CSPC', 'SSC', 'DOST', 'NSTP', 'ROTC', 'CWTS', 'LTS', 'TESDA', 'IECEP', 'IIEE', 'PSME', 'PICE', 'JPCS',
              'PNSA', 'CRCA', 'CRCYC', 'HEMS', 'ASEAN', 'BSBA', 'BSOA', 'BCAED', 'BSNED', 'CAS', 'CCS', 'CHS', 'CEA',
              'CTDE', 'CTHBM', 'CSC', 'SC', 'SU', 'IT', 'ICT', 'II', 'III', 'IV', 'FM', 'HR', 'MAN', 'DRRM', 'PASOA',
              'ULPAS', 'LEMEN', 'EMSS', 'AMPS', 'SEA', 'LSS', 'CRC', 'ABBS', 'BS', 'BSN', 'BSM', 'BSIT', 'BSCS',
              'BSIS', 'BLIS', 'BSCE', 'BSME', 'BSECE', 'BSEE', 'BSCPE', 'BSHM', 'BSTM', 'TGP/S', 'IVCF', 'CAMS',
              'APEXES', 'SSM', 'ATS', 'RCY', 'PHDBM', 'MCEC', 'BPED', 'BTVTED', 'YFC', 'Y4J', 'ACES', 'ICPEP',
              'CPE', 'PSITE', 'PATTS', 'UAP', 'UAPSA', 'JMA', 'JFINEX', 'JPIA', 'PSYCHSOC', 'LGBTQIA+', 'NSTP-ROTC'}
SMALL = {'of', 'and', 'in', 'the', 'for', 'on', 'a', 'an', 'to', 'at', 'by'}


def title_case(s, extra_upper=()):
    upper = KEEP_UPPER | set(extra_upper)
    def word(w, first):
        core = re.sub(r'[^A-Za-z0-9+/]', '', w).upper()
        if not core:
            return w
        if core in upper:
            return w.upper()
        if re.fullmatch(r'\d+(ST|ND|RD|TH)', core):
            return w.lower()
        if w.lower() in SMALL and not first:
            return w.lower()
        return re.sub(r"[A-Za-z][A-Za-z']*", lambda m: m.group(0)[0].upper() + m.group(0)[1:].lower(), w)
    out = []
    for i, tok in enumerate(t for t in s.split(' ') if t):
        parts = tok.split('-')
        out.append('-'.join(word(p, i == 0 and j == 0) for j, p in enumerate(parts)))
    return ' '.join(out)


ALIASES = {'TGPS': 'TGP', 'DOSTSG': 'DOSTSCHOLARSGUILD', 'ASSOCIATIONOFTOURISMSTUDENTS': 'ATS',
           'THEAPEXESAMEDICALANDALLIEDHEALTHSCIENCESHONORSOCIETY': 'APEXES', 'THEAPEXES': 'APEXES',
           'THEAPEXESACADEMICSOCIETY': 'APEXES', 'YOUTHEMPOWEREDCHAPTER': 'YE', 'YES': 'YE',
           'PASOANABUA': 'PASOA', 'SINAGTALAPRODUCTIONS': 'SINAGTALA', 'THESINAGTALAPRODUCTIONS': 'SINAGTALA',
           'TAUGAMMAPHISIGMACHAPTER': 'TGP'}


def norm_acr(a):
    k = re.sub(r'[^A-Z0-9]', '', a.upper())
    if k.startswith('THE') and len(k) > 8:
        k2 = k
    else:
        k2 = k
    k2 = k2.replace('CSPC', '').replace('NABUA', '') or k
    return ALIASES.get(k2, ALIASES.get(k, k2))


def split_org(raw):
    """First organization of a cell, as (name, acronym). Co-sponsors are kept in the raw text."""
    raw = re.sub(r'\s+', ' ', str(raw)).strip()
    m = re.match(r'^(.*?)\s*\(([^()]+)\)', raw)
    if m:
        return m.group(1).strip(' ,&-'), m.group(2).strip()
    name = re.split(r'\s+&\s+|,\s+', raw)[0].strip()
    return name, ''


def entity_of(name):
    n = name.upper()
    if re.match(r'^(BACHELOR|MASTER|DOCTOR)', n) or re.search(r'\b(BS\w*|AB)\s*-?\s*\d[A-Z]?\b', n):
        return 'CLASS_SECTION'
    if re.search(r'\b(OFFICE|NSTP|TESDA|NATIONAL SERVICE|SERVICES|CENTER|UNIT|LIBRARY|GUIDANCE|DEPARTMENT|CAMPUS)\b', n) \
            and not re.search(r'COUNCIL|SOCIETY|ASSOCIATION|CLUB|GUILD|LEAGUE|ORGANIZATION|CHAPTER', n):
        return 'OFFICE'
    return 'STUDENT_ORG'


def college_of(name, acr):
    n = (name + ' ' + acr).upper()
    pairs = [('COMPUTER STUDIES', 'College of Computer Studies'), ('CCS', 'College of Computer Studies'),
             ('ENGINEERING AND ARCHITECTURE', 'College of Engineering and Architecture'), ('CEA', 'College of Engineering and Architecture'),
             ('HEALTH SCIENCES', 'College of Health Sciences'), ('CHS', 'College of Health Sciences'),
             ('ARTS AND SCIENCES', 'College of Arts and Sciences'), ('CAS-', 'College of Arts and Sciences'),
             ('CTHBM', 'College of Tourism, Hospitality and Business Management'),
             ('TOURISM', 'College of Tourism, Hospitality and Business Management'),
             ('CTDE', 'College of Technological and Developmental Education'),
             ('SUPREME STUDENT COUNCIL', 'Institution-wide')]
    for key, col in pairs:
        if key in n:
            return col
    return ''


def parse_date(text, fallback_year):
    """Return (start, end) ISO dates from SASO's free-text 'Date conducted'."""
    if isinstance(text, (datetime.datetime, datetime.date)):
        d = text.date() if isinstance(text, datetime.datetime) else text
        return d.isoformat(), d.isoformat()
    s = str(text or '')
    years = [int(y) for y in re.findall(r'\b(20\d\d)\b', s)]
    tokens = re.findall(r'[A-Za-z]+|\d+', s)
    pairs, month = [], None
    for t in tokens:
        tl = t.lower()
        mi = next((i for i, m in enumerate(MONTHS) if tl == m or tl == m[:3] or (len(tl) >= 4 and m.startswith(tl))), None)
        if mi is not None and t.isalpha():
            month = mi
            pairs.append([month, None])
            continue
        if t.isdigit() and len(t) <= 2 and month is not None:
            n = int(t)
            if 1 <= n <= 31:
                if pairs and pairs[-1][1] is None and pairs[-1][0] == month:
                    pairs[-1][1] = n
                else:
                    pairs.append([month, n])
    if not pairs:
        y = years[0] if years else fallback_year
        return '%d-07-01' % y, '%d-07-01' % y
    y0 = years[0] if years else fallback_year
    y1 = years[-1] if years else y0
    first, last = pairs[0], pairs[-1]
    sy, ey = y0, y1
    if last[0] < first[0] and y1 == y0:
        # "November 25 - April 19, 2024": a single year belongs to the end date.
        sy = y0 - 1
    start = datetime.date(sy, first[0] + 1, first[1] or 1)
    try:
        end = datetime.date(ey, last[0] + 1, last[1] or (first[1] or 1))
    except ValueError:
        end = start
    if end < start:
        end = start
    return start.isoformat(), end.isoformat()


def venue_type(v):
    v = str(v or '').lower()
    if 'off' in v:
        return 'OFF_CAMPUS'
    if 'online' in v or 'virtual' in v:
        return 'ONLINE'
    return 'ON_CAMPUS'


def report_cell(v):
    """'/' or a date: submitted and accepted. 'N/A': not required. Otherwise not submitted."""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return 'APPROVED', (v.date() if isinstance(v, datetime.datetime) else v).isoformat()
    s = str(v or '').strip()
    if s == '/' or s.lower() in ('ok', 'submitted', 'yes', '✓'):
        return 'APPROVED', None
    if s.upper().startswith('N/A') or s.upper() == 'NA':
        return 'NA', None
    return 'NOT_SUBMITTED', None


def money(s):
    return s.strip(' :') if s else ''


def budget_cell(v):
    s = re.sub(r'\s+', ' ', str(v or '')).strip()
    if not s or s.upper() in ('N/A', 'NA', 'NONE'):
        return None, None
    m = re.match(r'^(.*?):\s*([\d,]+(?:\.\d+)?)\s*$', s)
    if m:
        return money(m.group(2)), m.group(1).strip()
    m = re.search(r'([\d,]+\.\d\d)\s*$', s)
    if m:
        return m.group(1), s[:m.start()].strip(' :') or None
    return None, s


def extra_cell(v):
    if v is None or str(v).strip() == '':
        return None
    if isinstance(v, (int, float)):
        return 'Liquidated: {:,.2f}'.format(v)
    s = re.sub(r'\s+', ' ', str(v)).strip()
    return s


def time_cell(v):
    if isinstance(v, datetime.time):
        return v.strftime('%H:%M')
    if isinstance(v, datetime.datetime):
        return v.strftime('%H:%M')
    s = str(v or '').strip().lower()
    m = re.match(r'(\d{1,2})(?::(\d\d))?\s*(am|pm|a\.m\.|p\.m\.)?', s)
    if not m:
        return None
    h, mi, ap = int(m.group(1)), int(m.group(2) or 0), (m.group(3) or '').replace('.', '')
    if ap == 'pm' and h < 12:
        h += 12
    if ap == 'am' and h == 12:
        h = 0
    if h > 23:
        return None
    return '%02d:%02d' % (h, mi)


def categorize(title, override):
    if override:
        return override, 'SASO category list'
    t = title.lower()
    for cat, rx in RULES:
        if re.search(rx, t):
            return cat, 'inferred'
    return 'Life Skills', 'inferred'


orgs, acts = {}, []


def org_id_for(raw):
    name, acr = split_org(raw)
    key = norm_acr(acr) if acr else norm_acr(name)
    if key in DEMO:
        return DEMO[key]
    if key not in orgs:
        acr_disp = acr if acr else ''
        nice = title_case(name, re.findall(r'[A-Za-z0-9]+', acr.upper()) if acr else [])
        if entity_of(name) == 'CLASS_SECTION' and acr and not re.search(r'[A-Za-z]{2,}', acr.split(' ')[0]):
            initials = ''.join(w[0] for w in nice.split(' ') if w and w.lower() not in SMALL and w[0].isalpha()).upper()
            acr_disp = initials + ' ' + acr
        orgs[key] = {'id': 'org-a%02d' % (len(orgs) + 1), 'name': nice,
                     'acronym': acr_disp or nice, 'entityType': entity_of(name),
                     'college': college_of(name, acr)}
    return orgs[key]['id']


def load(path, sheet, year, source, overrides):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet]
    header = None
    rows = list(ws.iter_rows(values_only=True))
    for r in rows:
        if r and isinstance(r[0], str) and r[0].strip().startswith('No'):
            header = [str(c or '').strip().lower() for c in r]
            break
    def col(name):
        for i, h in enumerate(header):
            if h.startswith(name):
                return i
        return None
    ix = {k: col(k) for k in ('name of student', 'on/off', 'name of activity', 'date', 'venue', 'time', 'participants',
                               'narrative', 'evaluation', 'financial', 'budget')}
    n = 0
    for r in rows:
        if not r or not isinstance(r[0], (int, float)):
            continue
        g = lambda k: r[ix[k]] if ix[k] is not None and ix[k] < len(r) else None
        title = re.sub(r'\s+', ' ', str(g('name of activity') or '')).strip()
        if not title:
            continue
        n += 1
        start, end = parse_date(g('date'), year)
        reps = {}
        for key, nm in (('narrative', 'Narrative Report with Documentation'), ('evaluation', 'Evaluation'),
                        ('financial', 'Financial Report')):
            reps[nm] = report_cell(g(key))
        # A row marked "* NO REPORTS SUBMITTED" puts the note in the first report column only.
        budget, fund = budget_cell(g('budget'))
        if fund and re.match(r'^source of funds?:?$', fund.strip(), re.I):
            fund = None
        bix = ix['budget']
        extra = extra_cell(r[bix + 1]) if bix is not None and bix + 1 < len(r) else None
        part = g('participants')
        cat, cat_src = categorize(title, overrides.get(title.lower()))
        orgraw = re.sub(r'\s+', ' ', str(g('name of student'))).strip()
        acts.append({
            'id': 'arc-%s-%03d' % (str(year)[2:], n),
            'org': org_id_for(orgraw), 'sponsor': orgraw, 'title': title, 'category': cat, 'categorySource': cat_src,
            'venueType': venue_type(g('on/off')), 'venue': re.sub(r'\s+', ' ', str(g('venue') or '')).strip(),
            'dateStart': start, 'dateEnd': end,
            'dateText': re.sub(r'\s+', ' ', str(g('date'))).strip() if not isinstance(g('date'), datetime.datetime) else None,
            'timeStart': time_cell(g('time')) if ix['time'] is not None else None,
            'participants': part if isinstance(part, (int, float)) else None,
            'who': None if isinstance(part, (int, float)) or part is None else re.sub(r'\s+', ' ', str(part)).strip(),
            'budget': budget, 'fund': fund, 'remarks': extra,
            'reports': {k: v for k, v in reps.items()}, 'source': source,
        })
    return n


wb23 = openpyxl.load_workbook(F2023, data_only=True)
overrides = {}
for sheet, cat in CATEGORY_SHEETS.items():
    for r in wb23[sheet].iter_rows(values_only=True):
        if r and isinstance(r[0], (int, float)) and r[3]:
            overrides[re.sub(r'\s+', ' ', str(r[3])).strip().lower()] = cat

n23 = load(F2023, 'July-December', 2023, 'SASO List of Student Activities 2023 (July - December)', overrides)
n24 = load(F2024, 'July-December', 2024, 'SASO List of Student Activities 2024 (July - December)', {})

out = {'orgs': list(orgs.values()), 'activities': acts}
js = ('/* =========================================================================\n'
      '   activity-archive.js  -  Past school years from SASO\'s own records.\n\n'
      '   GENERATED from the SASO workbooks "List of Student Activities 2023\n'
      '   (July - December)" (%d activities) and "List of Student Activities 2024\n'
      '   (July - December)" (%d activities). Organization, activity, date, venue,\n'
      '   participants, report columns and budget are copied as SASO recorded them.\n\n'
      '   Two things are NOT in the workbooks and were added by the researchers:\n'
      '   - category: taken from SASO\'s per-category sheets where the activity\n'
      '     appears there (categorySource "SASO category list"); otherwise\n'
      '     inferred from the title (categorySource "inferred").\n'
      '   - the organization record for each name (college, type) is a best\n'
      '     reading of the name; accreditation levels are not on file.\n\n'
      '   Rows naming several organizations are filed under the first one; the\n'
      '   full text is kept in "sponsor". Do not edit by hand: regenerate.\n'
      '   ========================================================================= */\n\n'
      'window.SASO = window.SASO || {};\nSASO.ARCHIVE = ' % (n23, n24)) + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w', encoding='utf-8').write(js)
print(n23, n24, len(orgs))
