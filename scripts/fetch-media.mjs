// One-time public media migration. No passwords, cookies or tokens are sent.
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'docs/media-manifest.json'),'utf8'));
const origin=new URL(manifest.sourceOrigin).origin;
let failures=0;
for(const item of manifest.files){
 const target=path.join(root,'public',item.target.slice(1));
 try{if((await fs.stat(target)).size>0)continue}catch{}
 try{
  const url=new URL(item.source,origin);
  if(url.origin!==origin)throw Error('Unexpected source origin');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  if(!/^(image\/|video\/|application\/pdf)/.test(response.headers.get('content-type')||''))throw Error('Unexpected file format');
  const body=Buffer.from(await response.arrayBuffer());if(!body.length)throw Error('Empty file');
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,body);
  console.log('Imported',path.basename(target));
 }catch(error){failures++;console.error('Could not import',path.basename(target),error.message)}
}
if(failures){console.error(`${failures} files remain. See docs/MIGRATION-STATUS.md.`);process.exit(1)}
console.log('All uploaded media is available locally. Run pnpm check:assets.');
