import React,{memo} from 'react';
import Svg,{Path} from 'react-native-svg';
import {dateDigitPaths} from '../core/date-number';
export default memo(function DateNumber({day,bold,filled,color}:{day:number;bold:boolean;filled:boolean;color:string}){
  return <Svg width={38} height={32} viewBox="0 0 38 32" accessible={false} aria-hidden>
    {dateDigitPaths(day,bold).map((digit,i)=><Path key={i} d={digit.path} transform={`translate(${digit.x} 0)`} fill={filled?color:'none'} stroke={filled?'none':color} strokeWidth={.85} strokeLinejoin="round" strokeLinecap="round"/>)}
  </Svg>;
});
