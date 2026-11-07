import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const db=c.d1_databases?.find(x=>x.binding==='DB');
if(!db||db.database_id==='00000000-0000-4000-8000-000000000000')throw Error('Pirms publicēšanas aizvieto database_id failā wrangler.jsonc ar savas Cloudflare D1 datubāzes ID.');
if(!c.r2_buckets?.some(x=>x.binding==='BUCKET'))throw Error('Trūkst R2 BUCKET piesaistes.');
console.log('Deployment resource configuration is ready.');
