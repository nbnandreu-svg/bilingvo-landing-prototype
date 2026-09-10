"""Generate pinned, SRI-verified release files and the reviewed Tilda fragment."""
from pathlib import Path
from bs4 import BeautifulSoup
import sys,subprocess,re,hashlib,base64,json
ROOT=Path(__file__).resolve().parents[1]
PUBLIC='https://nbnandreu-svg.github.io/bilingvo-landing-prototype/'
tag=sys.argv[1] if len(sys.argv)>1 else '2026-09-11-security-v1'
if not re.fullmatch(r'[a-zA-Z0-9_-]{1,64}',tag):raise ValueError('Invalid release name')
release=ROOT/'releases'/tag;release.mkdir(parents=True,exist_ok=True)
def canonical(p):
 data=p.read_text(encoding='utf-8-sig').replace('\r\n','\n').encode('utf-8')
 p.write_bytes(data);return data
def sri(data):return 'sha384-'+base64.b64encode(hashlib.sha384(data).digest()).decode()

doc=BeautifulSoup((ROOT/'index.html').read_text(encoding='utf-8'),'html.parser')
for form in doc.select('#bilingvo-site form'):
 if not (form.has_attr('data-lead-form') or form.has_attr('data-kind')):continue
 form['method']='dialog'
 form.attrs.pop('action',None)
 if not form.find('fieldset',attrs={'data-bl-form':True}):
  field=doc.new_tag('fieldset');field['data-bl-form']='';field['disabled']='';field['class']='bl-form-fields'
  for node in list(form.contents):field.append(node.extract())
  form.append(field)
 for control in form.select('input:not([type=checkbox]),textarea'):
  name=control.get('name','')
  control['maxlength']=str({'name':100,'email':254,'contact':120,'company':200,'message':2000}.get(name,32))
for old in doc.head.select('script[src]'):old.decompose()
for file in ['security.js','app.js','globe.js']:
 data=canonical(ROOT/file);script=doc.new_tag('script',src=file+'?v='+tag);script['defer']='';script['integrity']=sri(data);script['crossorigin']='anonymous';script['referrerpolicy']='no-referrer';doc.head.append(script)
policy="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"
for key,value in [('referrer','no-referrer')]:
 meta=doc.head.find('meta',attrs={'name':key})
 if not meta:meta=doc.new_tag('meta');meta['name']=key;doc.head.insert(1,meta)
 meta['content']=value
csp=doc.head.find('meta',attrs={'http-equiv':'Content-Security-Policy'})
if not csp:csp=doc.new_tag('meta');csp['http-equiv']='Content-Security-Policy';doc.head.insert(1,csp)
csp['content']=policy
for link in doc.head.select('link[rel=stylesheet]'):
 path=link['href'].split('?')[0];data=canonical(ROOT/path);link['href']=path+'?v='+tag;link['integrity']=sri(data);link['crossorigin']='anonymous'
(ROOT/'index.html').write_text(str(doc),encoding='utf-8')
subprocess.run([sys.executable,str(ROOT/'scripts/build_tilda.py')],cwd=ROOT,check=True)
manifest={'release':tag,'files':[]}
for src in ['security.js','app.js','globe.js','tilda/bilingvo-scoped.css']:
 data=canonical(ROOT/src);stem=Path(src).stem;ext=Path(src).suffix;filename=f'{stem}.{hashlib.sha256(data).hexdigest()[:16]}{ext}'
 dest=release/filename
 if dest.exists() and dest.read_bytes()!=data:raise ValueError('Release content collision')
 dest.write_bytes(data)
 manifest['files'].append({'source':src,'url':PUBLIC+dest.relative_to(ROOT).as_posix(),'path':dest.relative_to(ROOT).as_posix(),'integrity':sri(data),'sha256':hashlib.sha256(data).hexdigest()})
full=BeautifulSoup((ROOT/'tilda/T123-full.html').read_text(encoding='utf-8'),'html.parser');site=full.select_one('#bilingvo-site')
css=next(f for f in manifest['files'] if f['source'].endswith('.css'))
fragment=f'<link rel="stylesheet" href="{css["url"]}" integrity="{css["integrity"]}" crossorigin="anonymous" referrerpolicy="no-referrer">\n'+str(site)+'\n'
for f in manifest['files']:
 if not f['source'].endswith('.js'):continue
 fragment+=f'<script defer src="{f["url"]}" integrity="{f["integrity"]}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n'
(ROOT/'tilda/T123-compact.html').write_text(fragment,encoding='utf-8')
(release/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
(ROOT/'tmp/release-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Built integrity-pinned release',tag)
