"""Prepare country meshes and geographic city/language markers for the globe."""
from pathlib import Path
import json, math
import numpy as np
from shapely.geometry import shape
from shapely import constrained_delaunay_triangles

ROOT=Path(__file__).resolve().parents[1]
rows=[
 ['Москва',55.75,37.62,'RUS','Россия','RU','Русский'],
 ['Лондон',51.507,-.128,'GBR','Великобритания','EN','English'],
 ['Париж',48.857,2.352,'FRA','Франция','FR','Français'],
 ['Мадрид',40.416,-3.704,'ESP','Испания','ES','Español'],
 ['Берлин',52.52,13.405,'DEU','Германия','DE','Deutsch'],
 ['Рим',41.903,12.496,'ITA','Италия','IT','Italiano'],
 ['Лиссабон',38.722,-9.139,'PRT','Португалия','PT','Português'],
 ['Амстердам',52.367,4.904,'NLD','Нидерланды','NL','Nederlands'],
 ['Варшава',52.23,21.012,'POL','Польша','PL','Polski'],
 ['Прага',50.075,14.438,'CZE','Чехия','CS','Čeština'],
 ['Стокгольм',59.329,18.069,'SWE','Швеция','SV','Svenska'],
 ['Осло',59.913,10.752,'NOR','Норвегия','NO','Norsk'],
 ['Хельсинки',60.17,24.938,'FIN','Финляндия','FI','Suomi'],
 ['Копенгаген',55.676,12.568,'DNK','Дания','DA','Dansk'],
 ['Афины',37.984,23.728,'GRC','Греция','EL','Ελληνικά'],
 ['Бухарест',44.426,26.103,'ROU','Румыния','RO','Română'],
 ['Будапешт',47.498,19.04,'HUN','Венгрия','HU','Magyar'],
 ['Стамбул',41.008,28.978,'TUR','Турция','TR','Türkçe'],
 ['Пекин',39.904,116.407,'CHN','Китай','ZH','中文'],
 ['Токио',35.68,139.69,'JPN','Япония','JA','日本語'],
 ['Сеул',37.567,126.978,'KOR','Южная Корея','KO','한국어'],
 ['Дели',28.614,77.209,'IND','Индия','HI','हिन्दी'],
 ['Бангкок',13.756,100.502,'THA','Таиланд','TH','ไทย'],
 ['Ханой',21.028,105.834,'VNM','Вьетнам','VI','Tiếng Việt'],
 ['Джакарта',-6.209,106.846,'IDN','Индонезия','ID','Indonesia'],
 ['Куала-Лумпур',3.139,101.687,'MYS','Малайзия','MS','Melayu'],
 ['Манила',14.6,120.984,'PHL','Филиппины','TL','Filipino'],
 ['Улан-Батор',47.918,106.917,'MNG','Монголия','MN','Монгол'],
 ['Астана',51.169,71.449,'KAZ','Казахстан','KK','Қазақша'],
 ['Ташкент',41.299,69.24,'UZB','Узбекистан','UZ','O‘zbek'],
 ['Тегеран',35.689,51.389,'IRN','Иран','FA','فارسی'],
 ['Эр-Рияд',24.714,46.675,'SAU','Саудовская Аравия','AR','العربية'],
 ['Каир',30.044,31.236,'EGY','Египет','AR','العربية'],
 ['Дубай',25.205,55.271,'ARE','ОАЭ','AR','العربية'],
 ['Касабланка',33.573,-7.59,'MAR','Марокко','AR','العربية'],
 ['Дакар',14.716,-17.467,'SEN','Сенегал','FR','Français'],
 ['Найроби',-1.286,36.817,'KEN','Кения','SW','Kiswahili'],
 ['Аддис-Абеба',9.03,38.74,'ETH','Эфиопия','AM','አማርኛ'],
 ['Лагос',6.524,3.379,'NGA','Нигерия','EN','English'],
 ['Кейптаун',-33.925,18.424,'ZAF','ЮАР','AF','Afrikaans'],
 ['Нью-Йорк',40.713,-74.006,'USA','США','EN','English'],
 ['Лос-Анджелес',34.052,-118.244,'USA','США','EN','English'],
 ['Торонто',43.653,-79.383,'CAN','Канада','EN','English'],
 ['Монреаль',45.502,-73.567,'CAN','Канада','FR','Français'],
 ['Мехико',19.433,-99.133,'MEX','Мексика','ES','Español'],
 ['Гавана',23.113,-82.366,'CUB','Куба','ES','Español'],
 ['Богота',4.711,-74.072,'COL','Колумбия','ES','Español'],
 ['Лима',-12.046,-77.043,'PER','Перу','ES','Español'],
 ['Сан-Паулу',-23.55,-46.633,'BRA','Бразилия','PT','Português'],
 ['Буэнос-Айрес',-34.604,-58.382,'ARG','Аргентина','ES','Español'],
 ['Сантьяго',-33.449,-70.669,'CHL','Чили','ES','Español'],
 ['Сидней',-33.869,151.209,'AUS','Австралия','EN','English'],
 ['Мельбурн',-37.814,144.963,'AUS','Австралия','EN','English'],
 ['Окленд',-36.849,174.763,'NZL','Новая Зеландия','EN','English'],
 ['Санкт-Петербург',59.934,30.335,'RUS','Россия','RU','Русский'],
 ['Новосибирск',55.008,82.936,'RUS','Россия','RU','Русский'],
 ['Владивосток',43.116,131.885,'RUS','Россия','RU','Русский'],
 ['Шанхай',31.23,121.474,'CHN','Китай','ZH','中文'],
 ['Гуанчжоу',23.129,113.264,'CHN','Китай','ZH','中文'],
 ['Мумбаи',19.076,72.878,'IND','Индия','MR','मराठी'],
 ['Осака',34.694,135.502,'JPN','Япония','JA','日本語'],
 ['Рио-де-Жанейро',-22.907,-43.173,'BRA','Бразилия','PT','Português'],
 ['Сан-Франциско',37.775,-122.419,'USA','США','EN','English'],
 ['Ванкувер',49.283,-123.121,'CAN','Канада','EN','English']
]
cities=[dict(zip(['name','lat','lon','country','countryName','lang','native'],r)) for r in rows]
for i,c in enumerate(cities):c['priority']=i
(ROOT/'assets/globe-cities.json').write_text(json.dumps(cities,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
needed={c['country'] for c in cities}
source=ROOT/'tmp/countries.geojson'
if not source.exists():
 import urllib.request
 source.parent.mkdir(exist_ok=True)
 urllib.request.urlretrieve('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',source)
geo=json.loads(source.read_text(encoding='utf-8'))
def vector(coord):
 lon,lat=np.radians(coord[:2]);return np.array([np.cos(lat)*np.sin(lon),np.sin(lat),np.cos(lat)*np.cos(lon)])
def midpoint(a,b):
 v=a+b;return v/np.linalg.norm(v)
def subdivide(a,b,c,out,depth=0):
 edges=[np.linalg.norm(a-b),np.linalg.norm(b-c),np.linalg.norm(c-a)]
 if max(edges)>.09 and depth<7:
  ab,bc,ca=midpoint(a,b),midpoint(b,c),midpoint(c,a)
  for tri in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]:subdivide(*tri,out,depth+1)
 else:out.append(np.round([a,b,c],5).tolist())
countries={}
for f in geo['features']:
 code=f['properties']['ADM0_A3']
 if code not in needed:continue
 geom=shape(f['geometry']).buffer(0);triangles=[];rings=[]
 for p in (list(geom.geoms) if geom.geom_type=='MultiPolygon' else [geom]):
  for triangle in constrained_delaunay_triangles(p).geoms:
   coords=list(triangle.exterior.coords)[:3]
   subdivide(*(vector(c) for c in coords),triangles)
  for ring in [p.exterior,*p.interiors]:
   coords=list(ring.coords);dense=[]
   for a,b in zip(coords,coords[1:]):
    va,vb=vector(a),vector(b);n=max(1,int(np.linalg.norm(va-vb)/.025)+1)
    for i in range(n):
     v=va*(1-i/n)+vb*i/n;dense.append(np.round(v/np.linalg.norm(v),5).tolist())
   dense.append(dense[0]);rings.append(dense)
 countries[code]={'triangles':triangles,'rings':rings}
assert needed<=countries.keys(),needed-countries.keys()
(ROOT/'assets/globe-countries.json').write_text(json.dumps(countries,separators=(',',':')))
print('Cities:',len(cities),'Languages:',len({c['lang'] for c in cities}),'Countries:',len(countries),'Mesh MB:',round((ROOT/'assets/globe-countries.json').stat().st_size/1e6,2))

