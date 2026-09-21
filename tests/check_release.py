from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib,base64

root=Path(__file__).resolve().parents[1]
def sri(data):return 'sha384-'+base64.b64encode(hashlib.sha384(data).digest()).decode()
manifest=json.loads((root/'tmp/release-manifest.json').read_text())
for entry in manifest['files']:
 assert sri((root/entry['path']).read_bytes())==entry['integrity'],entry['path']
doc=BeautifulSoup((root/'index.html').read_text(encoding='utf-8'),'html.parser')
forms=doc.select('form[data-lead-form],form[data-kind]')
assert len(forms)==6
assert all(f.get('method')=='dialog' and f.find('fieldset',disabled=True) for f in forms)
assert doc.select_one('meta[http-equiv="Content-Security-Policy"]')
assert doc.select_one('#bilingvo-site')['style']=='display:none!important'
assert doc.select_one('script[src]')['src'].startswith('frame-guard.js?')
for script in doc.select('script[src]'):
 assert script.get('integrity')==sri((root/script['src'].split('?')[0]).read_bytes())
tilda=BeautifulSoup((root/'tilda/T123-compact.html').read_text(encoding='utf-8'),'html.parser')
assert not any(s.get_text(strip=True) for s in tilda.find_all('script'))
assert all(s.get('integrity','').startswith('sha384-') and s.get('crossorigin')=='anonymous' for s in tilda.select('script[src],link[rel=stylesheet]'))
assert all('/releases/' in s.get('src',s.get('href','')) for s in tilda.select('script[src],link[rel=stylesheet]'))
assert tilda.select_one('#bilingvo-site')['style']=='display:none!important'
assert '/frame-guard.' in tilda.select_one('script[src]')['src']
# A valid-looking SRI attribute is insufficient: verify every Tilda reference
# against the actual release bytes and the exact approved asset origin.
entries={entry['url']:entry for entry in manifest['files']}
nodes=tilda.select('script[src],link[rel=stylesheet]')
assert len(nodes)==len(entries)
for node in nodes:
 url=node.get('src',node.get('href'))
 assert url.startswith('https://nbnandreu-svg.github.io/bilingvo-landing-prototype/releases/')
 assert url in entries,url
 assert node['integrity']==entries[url]['integrity'],url
 assert node.get('referrerpolicy')=='no-referrer'
print('PASS: 6 fail-closed forms, CSP, local integrity and all pinned Tilda resources')
print('PASS: fail-closed frame guard in standalone and Tilda builds')
