from pathlib import Path
import json,numpy as np
from matplotlib.path import Path as Polygon
root=Path(__file__).resolve().parents[1]
geo=json.loads((root/'assets/world-land.json').read_text())
n=58000
y=1-2*(np.arange(n)+.5)/n
phi=np.arcsin(y)
lon=(np.arange(n)*(np.pi*(3-np.sqrt(5)))+np.pi)%(2*np.pi)-np.pi
points=np.column_stack([np.degrees(lon),np.degrees(phi)])
mask=np.zeros(n,dtype=bool)
for f in geo['features']:
 polygons=f['geometry']['coordinates'] if f['geometry']['type']=='MultiPolygon' else [f['geometry']['coordinates']]
 for polygon in polygons:
  inside=Polygon(polygon[0]).contains_points(points)
  for hole in polygon[1:]:inside&=~Polygon(hole).contains_points(points)
  mask|=inside
vectors=np.column_stack([np.cos(phi)*np.sin(lon),np.sin(phi),np.cos(phi)*np.cos(lon)])[mask]
(root/'assets/globe-land.json').write_text(json.dumps(np.round(vectors,5).tolist(),separators=(',',':')))
print('Spherical land points:',len(vectors))
