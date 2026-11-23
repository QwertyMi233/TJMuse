declare const aesjs:{utils:{utf8:{toBytes:(text:string)=>Uint8Array}},padding:{pkcs7:{pad:(bytes:Uint8Array)=>Uint8Array}},ModeOfOperation:{ecb:new(key:Uint8Array)=>{encrypt:(bytes:Uint8Array)=>Uint8Array}}};
export = aesjs;
