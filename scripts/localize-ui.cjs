// One-time codemod: localize app-owned text and placeholders, preserving user content.
const fs=require('fs'),path=require('path'),ts=require('typescript');
for(const folder of ['src/ui','src/screens','app'])walk(folder);
function walk(folder){for(const file of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,file.name);if(file.isDirectory()){walk(full);continue;}if(!full.endsWith('.tsx')||/LocalizedText(Input)?\.tsx$/.test(full)||full.endsWith('LocaleContext.tsx'))continue;
 let text=fs.readFileSync(full,'utf8'),source=ts.createSourceFile(full,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 for(const declaration of source.statements){if(!ts.isImportDeclaration(declaration)||declaration.moduleSpecifier.text!=='react-native'||!declaration.importClause?.namedBindings||!ts.isNamedImports(declaration.importClause.namedBindings))continue;
  const named=declaration.importClause.namedBindings.elements,names=named.filter(n=>n.name.text!=='Text'&&n.name.text!=='TextInput');let replacements=names.length?`import {${names.map(n=>n.getText(source)).join(',')}} from 'react-native';\n`:'';
  for(const name of ['Text','TextInput'])if(named.some(n=>n.name.text===name)){let target=path.relative(path.dirname(full),'src/ui/Localized'+name).replaceAll('\\','/');if(!target.startsWith('.'))target='./'+target;replacements+=`import ${name} from '${target}';\n`;}
  if(names.length!==named.length)edits.push({start:declaration.getStart(source),end:declaration.end,value:replacements});
 }
 function visit(node){if(ts.isJsxOpeningElement(node)&&node.tagName.getText(source)==='Text'&&!node.attributes.properties.some(p=>p.name?.getText(source)==='translate')){const children=node.parent.children?.map(c=>c.getText(source)).join('')||'';
  if(/\b(task|message|profile|assignment|lesson|table|draft|selected|token|source|asset|item|s|a)\.(title|content|description|nickname|name|teacher|location|purpose|url|baseUrl)\b/.test(children))edits.push({start:node.tagName.end,end:node.tagName.end,value:' translate={false}'});
 }ts.forEachChild(node,visit);}visit(source);
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.value+text.slice(e.end);if(edits.length)fs.writeFileSync(full,text);
}}
