// Serve an Expo web export locally, including extensionless static routes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist'),port=Number(process.argv[2]||8081);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2','.m4a':'audio/mp4','.wav':'audio/wav','.mp3':'audio/mpeg'};
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),requested=path.resolve(root,'.'+pathname);
    if(requested!==root&&!requested.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
    const target=[requested,requested+'.html',path.join(requested,'index.html')].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
    if(!target){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(400);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`TJMuse exported preview: http://127.0.0.1:${port}/schedule?demo=021`));
