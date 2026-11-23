import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {useAudioPlayer,useAudioPlayerStatus,setAudioModeAsync} from 'expo-audio';
const CUES=[require('../../assets/audio/onboarding/cue-1.m4a'),require('../../assets/audio/onboarding/cue-2.m4a'),require('../../assets/audio/onboarding/cue-3.m4a'),require('../../assets/audio/onboarding/cue-4.m4a'),require('../../assets/audio/onboarding/cue-5.m4a'),require('../../assets/audio/onboarding/cue-6.m4a')];
export default function OnboardingSound({step,muted,playOnEntry=true}:{step:number;muted:boolean;playOnEntry?:boolean}){
 const player=useAudioPlayer(step>0&&playOnEntry?CUES[step-1]:null),status=useAudioPlayerStatus(player),played=useRef(-1);
 useEffect(()=>{void setAudioModeAsync({playsInSilentMode:false,shouldPlayInBackground:false}).catch(()=>{});const s=AppState.addEventListener('change',state=>{if(state!=='active')player.pause();});return()=>s.remove();},[player]);
 useEffect(()=>{let active=true;if(muted||!playOnEntry)player.pause();if(step>0&&playOnEntry&&status.isLoaded&&!muted&&played.current!==step&&AppState.currentState!=='background'&&AppState.currentState!=='inactive'){played.current=step;player.volume=.65;void player.seekTo(0).then(()=>{if(active)player.play();}).catch(()=>{});}return()=>{active=false;};},[step,status.isLoaded,muted,playOnEntry,player]);
 return null;
}
