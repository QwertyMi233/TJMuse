"""Compile editable UI translations. Dev dependency: opencc-python-reimplemented."""
import json
from pathlib import Path
from opencc import OpenCC
root=Path(__file__).resolve().parent.parent;cc=OpenCC('s2twp');catalog={}
for line in ((root/'assets/translations-ui.tsv').read_text(encoding='utf-8')+'\n'+(root/'assets/translations-greetings.tsv').read_text(encoding='utf-8')).splitlines():
 if not line or line.startswith('#'):continue
 parts=[s.replace('\\n','\n') for s in line.split('|')]
 assert len(parts)==5,line
 zh,en,ja,es,fr=parts
 catalog[zh]={'zh-TW':cc.convert(zh),'en-US':en,'ja':ja,'es':es,'fr':fr}
extra=root/'assets/translations-help.tsv'
if extra.exists():
 for line in extra.read_text(encoding='utf-8').splitlines():
  if not line or line.startswith('#'):continue
  zh,en=line.split('|');catalog.setdefault(zh,{'zh-TW':cc.convert(zh),'en-US':en})
machine=root/'assets/translations-help.json'
if machine.exists():
 for zh,translations in json.loads(machine.read_text(encoding='utf-8')).items():
  catalog.setdefault(zh,{}).update({k:v for k,v in translations.items() if k not in catalog.get(zh,{})})
for zh in json.loads((root/'assets/translation-keys.json').read_text(encoding='utf-8')):
 catalog.setdefault(zh,{'zh-TW':cc.convert(zh)})
for zh,values in catalog.items():values.setdefault('zh-TW',cc.convert(zh))
(root/'src/assets/translations.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print(json.dumps({'phrases':len(catalog),'fullyTranslated':sum('fr' in v for v in catalog.values())}))
