import {env} from 'cloudflare:workers';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf|mp4|webm)$/.test(id)||!env.BUCKET)return new Response('Not found',{status:404});
 const object=await env.BUCKET.get(id,{range:req.headers});if(!object)return new Response('Not found',{status:404});
 const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('x-content-type-options','nosniff');headers.set('accept-ranges','bytes');
 let status=200;
 if(object.range&&'offset' in object.range&&'length' in object.range&&typeof object.range.offset==='number'&&typeof object.range.length==='number'){const r=object.range as {offset:number;length:number};headers.set('content-range',`bytes ${r.offset}-${r.offset+r.length-1}/${object.size}`);headers.set('content-length',String(r.length));status=206}
 else headers.set('content-length',String(object.size));
 return new Response(object.body,{status,headers});
}
