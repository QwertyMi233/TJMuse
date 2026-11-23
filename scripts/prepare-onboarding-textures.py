"""Render original radial UI textures once; devices only composite the images."""
from pathlib import Path
from PIL import Image
import math
root=Path(__file__).resolve().parent.parent
out=root/'assets/onboarding';out.mkdir(exist_ok=True)
layers={'back':[(310,120,240,'77BFFF',1),(100,440,250,'082B59',1),(55,90,185,'A9D8FF',.9)],'front':[(300,280,215,'A9D8FF',.95),(95,700,265,'74BFFF',.95)]}
stops=[(0,.95),(.32,.70),(.70,.24),(1,0)]
for name,glows in layers.items():
 image=Image.new('RGBA',(400,900));pixels=image.load()
 for y in range(900):
  for x in range(400):
   red=green=blue=alpha=0.
   for cx,cy,r,color,opacity in glows:
    d=math.hypot(x-cx,y-cy)/r
    if d>=1:continue
    left,right=next((stops[i],stops[i+1]) for i in range(3) if stops[i][0]<=d<=stops[i+1][0])
    a=(left[1]+(right[1]-left[1])*(d-left[0])/(right[0]-left[0]))*opacity
    c=[int(color[i:i+2],16) for i in (0,2,4)]
    red=c[0]*a+red*(1-a);green=c[1]*a+green*(1-a);blue=c[2]*a+blue*(1-a);alpha=a+alpha*(1-a)
   if alpha:pixels[x,y]=(round(red/alpha),round(green/alpha),round(blue/alpha),round(alpha*255))
 image.save(out/f'aura-{name}.png',optimize=True)
print('Rendered original blue radial textures.')
