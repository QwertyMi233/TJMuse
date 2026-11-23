"""Split the six supplied chimes and bake a gentle stereo echo into each cue.
Usage: PYTHONPATH=.build-tools/audio-python python scripts/prepare-onboarding-audio.py input.m4a
Requires imageio-ffmpeg. Keeps the supplied recording unchanged.
"""
import hashlib,json,subprocess,sys
from pathlib import Path
import imageio_ffmpeg
source=Path(sys.argv[1]);root=Path(__file__).resolve().parent.parent
out=root/'assets/audio/onboarding';out.mkdir(parents=True,exist_ok=True)
ranges=[(2.50,5.30),(6.07,9.30),(9.71,12.60),(13.25,16.00),(17.28,19.60),(20.65,23.10)]
for index,(start,end) in enumerate(ranges,1):
    target=out/f'cue-{index}.m4a'
    fx='apad=pad_dur=3.3,aecho=0.72:0.85:170|310|530|790|1150|1630|2210:0.30|0.25|0.20|0.16|0.12|0.08|0.045,afade=t=in:d=0.018,alimiter=limit=0.85'
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-ss',str(start),'-t',str(end-start),'-i',str(source),'-af',fx,'-c:a','aac','-b:a','128k','-movflags','+faststart',str(target)],check=True)
manifest={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'segmentsSeconds':ranges,'echo':'Seven progressively quieter delays; padded tail, no looping.','cues':[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob('cue-*.m4a'))]}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(manifest))
