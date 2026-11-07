import {env} from 'cloudflare:workers';
import {isAdmin,sameOrigin} from '@/lib/admin-auth';
export async function POST(req:Request){
 if(!await isAdmin(req)||!sameOrigin(req))return Response.json({error:'Nav piekļuves'},{status:403});
 if(!env.BUCKET)return Response.json({error:'Failu krātuve nav pieejama'},{status:503});
 if(Number(req.headers.get('content-length')||0)>80*1024*1024)return Response.json({error:'Maksimālais faila izmērs ir 75 MB'},{status:413});
 let form:FormData;try{form=await req.formData()}catch{return Response.json({error:'Nederīgs faila pieprasījums'},{status:400})}const file=form.get('file');
 if(!(file instanceof File)||!file.size||file.size>75*1024*1024)return Response.json({error:'Izvēlies failu līdz 75 MB'},{status:400});
 const b=new Uint8Array(await file.arrayBuffer());const ascii=new TextDecoder().decode(b.slice(0,16));
 let type='',ext='';
 if(b[0]===255&&b[1]===216&&b[2]===255){type='image/jpeg';ext='jpg'}
 else if(b[0]===137&&ascii.slice(1,4)==='PNG'){type='image/png';ext='png'}
 else if(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP'){type='image/webp';ext='webp'}
 else if(ascii.startsWith('%PDF-')){type='application/pdf';ext='pdf'}
 else if(ascii.slice(4,8)==='ftyp'&&file.type==='video/mp4'){type='video/mp4';ext='mp4'}
 else if(b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163&&file.type==='video/webm'){type='video/webm';ext='webm'}
 const kind=form.get('kind');if((kind==='image'&&!type.startsWith('image/'))||(kind==='video'&&!type.startsWith('video/'))||(kind==='menu'&&!type.startsWith('image/')&&type!=='application/pdf'))return Response.json({error:'Šim laukam izvēlēts neatbilstošs faila veids'},{status:400});
 if(!type)return Response.json({error:'Atļauts JPG, PNG, WebP, PDF, MP4 vai WebM'},{status:400});
 const id=crypto.randomUUID()+'.'+ext;
 await env.BUCKET.put(id,b,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'}});
 return Response.json({url:'/api/media/'+id});
}
