"""Local SDK integration test: no request can leave this fixture."""
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
doc=BeautifulSoup((ROOT/'tmp/form-preview.html').read_text(encoding='utf-8'),'html.parser')
doc.select_one('#bilingvo-site')['data-asset-base']='../assets/'
doc.select_one('script[src="forms-stub.js"]')['src']='native-adapter-test.js'
setup=doc.new_tag('script',src='native-server-stub.js');doc.head.insert(0,setup)
for i,name in enumerate(['tilda-scripts.js','tilda-forms.js']):
 tag=doc.new_tag('script',src=name);tag['defer']='';doc.head.insert(1+i,tag)
doc.body['id']='allrecords';doc.body['data-tilda-page-id']='0';doc.body['data-tilda-project-id']='0'
carrier=BeautifulSoup('''<div id="rec3791816301" class="r" style="display:none"><form id="form3791816301" class="t-form js-form-proccess" data-formactiontype="2" method="post"><input type="hidden" class="js-formaction-services" name="formservices[]" value="00000000000000000000000000000000"><input class="js-tilda-rule" type="email" name="Email" data-tilda-rule="email" data-tilda-req="1"><input name="Name"><div class="t-form__errorbox-middle"><div class="js-errorbox-all" style="display:none"><p class="js-rule-error-all"></p></div></div><div class="js-successbox"></div><button type="submit" class="t-submit">Send</button></form></div><output id="sdk-test-status" style="position:fixed;top:0;left:0;background:white;z-index:99999">No request</output>''','html.parser');doc.body.append(carrier)
(ROOT/'tmp/native-preview.html').write_text(str(doc),encoding='utf-8')
(ROOT/'tmp/native-adapter-test.js').write_text((ROOT/'tilda-forms.js').read_text(encoding='utf-8').replace("location.origin==='https://welcomebilingvo.tilda.ws'","location.origin==='http://127.0.0.1:3992'"),encoding='utf-8')
(ROOT/'tmp/native-server-stub.js').write_text('''function t_onReady(f){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',f):f()};function t_onFuncLoad(name,f){if(typeof window[name]==='function')f();else setTimeout(()=>t_onFuncLoad(name,f),50)};
const blRealOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url,...args){document.querySelector('#sdk-test-status').textContent='LOCAL SDK REQUEST: '+method+' '+url;return blRealOpen.call(this,method,location.origin+'/_sdk-response'+location.search,...args)};
''',encoding='utf-8')
