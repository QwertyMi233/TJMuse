"""Verify an APK using separately generated apksigner/aapt reports."""
import argparse,hashlib,json,re,zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('apk',type=Path);p.add_argument('--signature',type=Path,required=True);p.add_argument('--badging',type=Path,required=True);p.add_argument('--previous-info',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parent.parent;cfg=json.loads((root/'app.json').read_text(encoding='utf-8'))['expo'];signature=a.signature.read_text(encoding='utf-8-sig');badging=a.badging.read_text(encoding='utf-8-sig')
assert re.search(r'Verified using v2 scheme.*: true',signature)
cert=re.search(r'certificate SHA-256 digest: ([a-f0-9]+)',signature)[1];assert cert==json.loads(a.previous_info.read_text(encoding='utf-8-sig'))['android']['certificateSha256']
assert f"name='{cfg['android']['package']}'" in badging and f"versionCode='{cfg['android']['versionCode']}'" in badging and f"versionName='{cfg['version']}'" in badging
with zipfile.ZipFile(a.apk) as z:
 assert z.testzip() is None
 assert {n.split('/')[1] for n in z.namelist() if n.startswith('lib/') and n.endswith('.so')}=={'arm64-v8a'}
 bundle=z.read('assets/index.android.bundle')
 for marker in ['edit_course_occurrences','edit_homework_local','temporaryDisabled','courseOverrides','getRsaKey','userNoLogin','loginByTicket','tjmuse.zhixuemeng.native-session.v1','打开网页，读取并保存令牌']:
  assert marker.encode() in bundle or marker.encode('utf-16-le') in bundle,marker
 assert 'android.permission.RECORD_AUDIO' not in badging
result={'file':a.apk.name,'type':'release APK','architecture':'arm64-v8a','version':cfg['version'],'versionCode':cfg['android']['versionCode'],'minSdk':int(re.search(r"sdkVersion:'(\d+)'",badging)[1]),'targetSdk':int(re.search(r"targetSdkVersion:'(\d+)'",badging)[1]),'signatureVerified':True,'certificateSha256':cert,'matchesPreviousSigningCertificate':True,'deviceLaunchVerified':False,'sizeBytes':a.apk.stat().st_size,'sha256':hashlib.sha256(a.apk.read_bytes()).hexdigest(),'zipIntegrityVerified':True,'featureMarkersVerified':True}
a.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))
