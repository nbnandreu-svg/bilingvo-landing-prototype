from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
doc=BeautifulSoup((ROOT/'index.html').read_text(encoding='utf-8'),'html.parser')
doc.select_one('meta[http-equiv="Content-Security-Policy"]').decompose()
for el in doc.select('[src],[href],[poster]'):
 for attr in ['src','href','poster']:
  value=el.get(attr,'')
  if value and not value.startswith(('http:','https:','#','mailto:','tel:')):el[attr]='../'+value
for script in doc.select('script[src]'):
 if 'tilda-forms.js' in script['src']:
  script['src']='forms-stub.js';script.attrs.pop('integrity',None)
(ROOT/'tmp/form-preview.html').write_text(str(doc),encoding='utf-8')
(ROOT/'tmp/forms-stub.js').write_text("Object.defineProperty(window,'BilingvoForms',{value:Object.freeze({available:()=>true,send:async()=>{await new Promise(r=>setTimeout(r,150));if(location.search.includes('fail'))throw Error('Simulated server failure');}})});",encoding='utf-8')
(ROOT/'tmp/mobile.html').write_text('''<!doctype html><html><head><meta charset="utf-8"><title>Mobile QA</title><style>body{margin:0;background:#ddd}iframe{display:block;width:390px;height:844px;border:0;margin:10px auto}</style></head><body><iframe title="Mobile preview" src="../?lang=fr"></iframe></body></html>''',encoding='utf-8')
