import {env} from 'cloudflare:workers';
import {readContent} from '@/lib/content';
import {isAdmin,sameOrigin} from '@/lib/admin-auth';
import {contentSchema} from '@/lib/validation';
export async function GET(req:Request){
 if(!await isAdmin(req))return Response.json({error:'Nav piekļuves'},{status:403});
 return Response.json(await readContent(),{headers:{'Cache-Control':'no-store'}});
}
export async function PUT(req:Request){
 if(!await isAdmin(req))return Response.json({error:'Nav piekļuves'},{status:403});
 if(!sameOrigin(req))return Response.json({error:'Nederīgs pieprasījuma avots'},{status:403});
 if(Number(req.headers.get('content-length')||0)>2000000)return Response.json({error:'Saturs ir pārāk liels'},{status:413});
 let body:{content?:unknown;revision?:unknown};try{const raw=await req.text();if(raw.length>2000000)return Response.json({error:'Saturs ir pārāk liels'},{status:413});const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=='object')throw new Error();body=parsed}catch{return Response.json({error:'Nederīgs saturs'},{status:400})}
 const valid=contentSchema.safeParse(body.content);if(!valid.success)return Response.json({error:valid.error.issues.map(x=>x.path.join('.')+': '+x.message).join('\n')},{status:400});
 if(!env.DB)return Response.json({error:'Datubāze nav pieejama'},{status:503});
 const revision=crypto.randomUUID();let result;
 if(body.revision===null)result=await env.DB.prepare('INSERT INTO content(id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').bind('site',JSON.stringify(valid.data),revision).run();
 else if(typeof body.revision==='string')result=await env.DB.prepare('UPDATE content SET data = ?, updated_at = ? WHERE id = ? AND updated_at = ?').bind(JSON.stringify(valid.data),revision,'site',body.revision).run();
 else return Response.json({error:'Nav versijas numura'},{status:400});
 if(!result.meta.changes)return Response.json({error:'Saturs jau mainīts citā logā. Nokopē savus labojumus un pārlādē lapu.'},{status:409});
 return Response.json({revision},{headers:{'Cache-Control':'no-store'}});
}
