"""Build a self-contained T123 fragment without leaking styles into other Tilda blocks."""
from pathlib import Path
import re,json,hashlib
from bs4 import BeautifulSoup
import tinycss2

ROOT=Path(__file__).resolve().parents[1]
PUBLIC='https://nbnandreu-svg.github.io/bilingvo-landing-prototype/'
OUT=ROOT/'tilda'
OUT.mkdir(exist_ok=True)
NAMESPACE='#bilingvo-site'

def scope_selector(selector):
 selector=selector.strip()
 if not selector:return selector
 if NAMESPACE in selector:return selector
 selector=re.sub(r'(?<![\w-])(?:body|html|:root)(?![\w-])',NAMESPACE,selector)
 if selector.startswith(NAMESPACE):return selector
 return NAMESPACE+' '+selector

def scope_rules(css):
 result=[]
 for rule in tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True):
  if rule.type=='qualified-rule':
   # Commas nested in :is(), attribute selectors or :not() are not separators.
   groups=[];current=[]
   for token in rule.prelude:
    if token.type=='literal' and token.value==',':groups.append(tinycss2.serialize(current));current=[]
    else:current.append(token)
   groups.append(tinycss2.serialize(current))
   result.append(','.join(scope_selector(s) for s in groups)+'{'+tinycss2.serialize(rule.content)+'}')
  elif rule.type=='at-rule':
   pre='@'+rule.at_keyword+' '+tinycss2.serialize(rule.prelude).strip()
   if rule.content is None:result.append(pre+';')
   elif rule.lower_at_keyword in ['media','supports','container','layer']:
    result.append(pre+'{'+scope_rules(tinycss2.serialize(rule.content))+'}')
   else:result.append(pre+'{'+tinycss2.serialize(rule.content)+'}')
 return '\n'.join(result)

def absolutize_css(css,base):
 def url(m):
  raw=m.group(1).strip(' \"\'')
  if raw.startswith(('https:','http:','data:','#')):return m.group(0)
  from urllib.parse import urljoin
  return 'url("'+urljoin(base,raw)+'")'
 return re.sub(r'url\(([^)]+)\)',url,css)

doc=BeautifulSoup((ROOT/'index.html').read_text(encoding='utf-8'),'html.parser')
site=doc.select_one(NAMESPACE)
site['data-asset-base']=PUBLIC+'assets/'
for el in site.find_all(True):
 for attr in ['src','poster']:
  value=el.get(attr)
  if value and not value.startswith(('https:','http:','data:','#')):el[attr]=PUBLIC+value.removeprefix('./')

css=''
for file in ['assets/fonts.css','styles.css','motion.css']:
 content=(ROOT/file).read_text(encoding='utf-8')
 content=absolutize_css(content,PUBLIC+file)
 css+=scope_rules(content)+'\n'
# An explicit root baseline avoids depending on the Tilda body's font/margins.
css+='\n#bilingvo-site{font:300 20px/1.3 Geologica,Arial,sans-serif;margin:0;width:100%;max-width:none;box-sizing:border-box}#bilingvo-site a{color:inherit}#bilingvo-site .button{color:white}#bilingvo-site .outline,#bilingvo-site .light{color:var(--night)}#bilingvo-site .next-actions .outline{color:white}\n'
css+='@media(max-width:600px){#bilingvo-site{font-size:16px}}'
js=(ROOT/'app.js').read_text(encoding='utf-8')+'\n'+(ROOT/'globe.js').read_text(encoding='utf-8')
fragment='<!-- Bilingvo: paste this entire fragment into one Tilda T123 block. -->\n<style>\n'+css+'\n</style>\n'+str(site)+'\n<script>\n'+js+'\n</script>\n'
(OUT/'T123-full.html').write_text(fragment,encoding='utf-8')
(OUT/'bilingvo-scoped.css').write_text(css,encoding='utf-8')
# Realistic host-page fixture: Tilda-like global styles outside the embedded section.
fixture='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Проверка встраивания Билингво</title><style>body{margin:0;font:16px Arial;background:#fafafa}#host-sentinel{padding:20px;background:#234;color:#fff}a{color:orange}button{font-family:Arial}h2{font-size:17px}.t-rec{width:100%}</style></head><body><div id="host-sentinel">Тестовый блок вне Билингво. Его оформление не должно меняться.</div><div class="t-rec">'''
local=fragment.replace(PUBLIC,'../')
(OUT/'preview.html').write_text(fixture+local+'</div><div id="host-footer" style="padding:20px">Тестовый нижний блок</div></body></html>',encoding='utf-8')
print('Built T123-full.html:',len(fragment.encode('utf-8')),'bytes')
