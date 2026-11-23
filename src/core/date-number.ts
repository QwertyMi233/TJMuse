import {DATE_DIGITS} from '../assets/date-digits';
export function dateDigitPaths(day:number,bold=false){
  if(!Number.isInteger(day)||day<1||day>31)return [];
  const digits=String(day).split('').map(d=>DATE_DIGITS[bold?'bold':'regular'][Number(d)]!);
  let x=(38-digits.reduce((sum,d)=>sum+d.advance,0))/2;
  return digits.map(d=>{const offset=x;x+=d.advance;return {path:d.path,x:offset};});
}
