import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const content=JSON.parse(fs.readFileSync(path.join(root,'lib/initial-content.json'),'utf8'));
const refs=new Set();
function walk(v){if(typeof v==='string'&&v.startsWith('/assets/'))refs.add(v);else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)}
walk(content);
const missing=[...refs].filter(v=>!fs.existsSync(path.join(root,'public',v.slice(1))));
if(missing.length){console.error(`Trūkst ${missing.length} publicētā satura failu. Izpildi pnpm media:fetch vai pievieno tos public/assets/imported/.`);for(const v of missing)console.error(v);process.exit(1)}
console.log(`PASS: all ${refs.size} local content assets exist.`);
