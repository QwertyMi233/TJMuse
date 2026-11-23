/** Public screen measurements only; no private device corner-radius APIs. */
export function sheetContentHeight(header:number,body:number,footer:number,maximum:number,large=false){
  const ready=header>0&&body>0&&footer>=0;
  return {ready,height:!ready||large?maximum:Math.min(maximum,Math.ceil(header+body+footer))};
}
export function attachedSheetGeometry(width:number,viewportHeight:number,height:number,cap:number,ios:boolean,topInset=0){
  const sheetWidth=ios&&width<600?width:Math.min(width,560);
  const maximum=Math.max(1,Math.min(cap,viewportHeight-Math.max(topInset,12)));
  const sheetHeight=Math.max(1,Math.min(height,maximum));
  return {
    width:sheetWidth,height:sheetHeight,
    borderTopLeftRadius:Math.min(ios?sheetWidth*.125:30,56,sheetHeight/2),
    borderTopRightRadius:Math.min(ios?sheetWidth*.125:30,56,sheetHeight/2),
    borderBottomLeftRadius:0,borderBottomRightRadius:0,
  };
}
