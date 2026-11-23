"""Generate clean UI vectors from Inter (SIL OFL). Dev: fonttools, skia-pathops.
Usage: python scripts/generate-date-digits.py /path/to/Inter-variable.ttf
The font itself is not bundled; its license is in assets/licenses/Inter-OFL.txt.
"""
import json,sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.ttLib.removeOverlaps import removeOverlaps
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
root=Path(__file__).resolve().parent.parent
font=TTFont(sys.argv[1]);result={'license':(root/'assets/licenses/Inter-OFL.txt').read_text(encoding='utf-8')}
for name,weight in [('regular',400),('bold',700)]:
    static=instantiateVariableFont(font,{'wght':weight,'opsz':25},inplace=False)
    cmap=static.getBestCmap();names=[cmap[ord(str(n))] for n in range(10)]
    removeOverlaps(static,glyphNames=names,removeHinting=True)
    glyphs=static.getGlyphSet();scale=25/static['head'].unitsPerEm
    outlines=[]
    for glyph in names:
        pen=SVGPathPen(glyphs,ntos=lambda v:format(v,'.3f').rstrip('0').rstrip('.') if v else '0')
        glyphs[glyph].draw(TransformPen(pen,(scale,0,0,-scale,0,25)))
        outlines.append({'advance':round(static['hmtx'][glyph][0]*scale,4),'path':pen.getCommands()})
    result[name]=outlines
text='// Inter digit outlines, Copyright 2020 The Inter Project Authors. SIL OFL 1.1.\n// Instantiated and unioned before export; license: assets/licenses/Inter-OFL.txt.\n'
text+='export const DATE_DIGITS='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+' as const;\n'
(root/'src/assets/date-digits.ts').write_text(text,encoding='utf-8')
print(json.dumps({'generatedDigitOutlines':20,'bytes':len(text.encode())}))
