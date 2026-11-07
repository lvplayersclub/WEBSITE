export type PasswordEnv={SITE_PASSWORD?:string;ADMIN_USERNAME?:string;ADMIN_PASSWORD?:string;SESSION_SECRET?:string;DB?:D1Database};
const encoder=new TextEncoder();
async function signature(value:string,secret:string){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function makeSession(role:'guest'|'admin',env:PasswordEnv,expires=Date.now()+12*60*60*1000){if(!env.SESSION_SECRET)throw Error('Session configuration missing');const payload=role+'.'+expires;return payload+'.'+await signature(payload,env.SESSION_SECRET+'|'+(role==='admin'?env.ADMIN_PASSWORD:env.SITE_PASSWORD))}
export async function hasSession(req:Request,role:'guest'|'admin',env:PasswordEnv){if(!env.SESSION_SECRET)return false;const name=role==='admin'?'__Host-pc_admin':'__Host-pc_guest';const token=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);if(!token)return false;const [r,exp,sig]=token.split('.');if(r!==role||!/^\d+$/.test(exp)||Number(exp)<=Date.now()||!sig||token.split('.').length!==3)return false;const expected=await makeSession(role,env,Number(exp));return equal(token,expected)}
function equal(a:string,b:string){let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0}
function safePath(value:string|null){return value?.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!value.startsWith('/entry')?value:'/'}
function page(admin:boolean,error=false){return `<!doctype html><html lang="lv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Players Club — ${admin?'Administrācija':'Ieeja'}</title><style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#0b0c0a;color:#f6f4e9;font-family:Arial,sans-serif}main{width:min(360px,84vw);padding:40px 0}h1{font-size:32px}p{color:#aaa99e;line-height:1.6}label{display:block;margin:24px 0;font-size:14px}input{box-sizing:border-box;width:100%;margin-top:10px;padding:14px;border:1px solid #555;background:#161910;color:white;font-size:16px;border-radius:3px}button{width:100%;background:#ffe533;color:#0b0c0a;border:0;padding:16px;font-size:16px;font-weight:bold;cursor:pointer;border-radius:3px}a{color:#ffe533;font-size:13px}.error{color:#ffb7aa}</style><main><a href="/">PLAYERS CLUB ↗</a><h1>${admin?'Administrācija':'Laipni lūdzam!'}</h1><p>${admin?'Pieslēdzies, lai rediģētu mājaslapu.':'Ievadi ieejas paroli, lai apskatītu mājaslapu.'}</p>${error?'<p class="error" role="alert">Nepareizi pieslēgšanās dati. Mēģini vēlreiz.</p>':''}<form method="post">${admin?'<label>Lietotājvārds<input name="username" autocomplete="username" required></label>':''}<label>Parole<input name="password" type="password" autocomplete="${admin?'current-password':'off'}" required maxlength="200"></label><button type="submit">${admin?'Pieslēgties':'Atvērt mājaslapu'} →</button></form><p><a href="${admin?'/entry':'/entry/admin'}">${admin?'Atpakaļ uz lapas ieeju':'Administrācijas ieeja'}</a></p></main></html>`}
const privateHeaders={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com; base-uri 'none'",'Referrer-Policy':'same-origin'};
export async function passwordGate(req:Request,env:PasswordEnv):Promise<Response|null>{
 const url=new URL(req.url),path=url.pathname.replace(/\/+$/,'')||'/';const admin=path==='/admin'||path.startsWith('/admin/')||path==='/api/content'||path==='/api/upload';
 if(path==='/entry')return new Response(null,{status:303,headers:{Location:safePath(url.searchParams.get('next')),'Cache-Control':'no-store'}});
 if(!admin&&path!=='/entry/admin'&&path!=='/entry/logout')return null;
 if(!env.ADMIN_PASSWORD||!env.ADMIN_USERNAME||!env.SESSION_SECRET)return new Response('Piekļuve īslaicīgi nav pieejama.',{status:503,headers:privateHeaders});
 if(path==='/entry/admin'){
  const loginAdmin=path.endsWith('/admin');if(req.method==='GET')return new Response(page(loginAdmin),{headers:privateHeaders});
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  if(req.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403});
  const raw=await req.text();if(raw.length>2048)return new Response('Request too large',{status:413});
  // Durable per-IP attempt limit; passwords and cookies are never stored here.
  if(!env.DB)return new Response('Piekļuve īslaicīgi nav pieejama.',{status:503,headers:privateHeaders});
  const bucket=Math.floor(Date.now()/600000);const ip=req.headers.get('cf-connecting-ip')||'unknown';const key=await signature(ip+'|'+bucket+'|'+path,env.SESSION_SECRET);
  const result=await env.DB.prepare('INSERT INTO login_attempts(key, attempts, expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key,Date.now()+1200000).first<{attempts:number}>();
  if(!result||result.attempts>20)return new Response('Pārāk daudz mēģinājumu. Mēģini pēc 10 minūtēm.',{status:429,headers:{...privateHeaders,'Retry-After':'600'}});
  const data=new URLSearchParams(raw);const valid=equal(data.get('password')||'',env.ADMIN_PASSWORD)&&(!loginAdmin||equal(data.get('username')||'',env.ADMIN_USERNAME));
  if(!valid)return new Response(page(loginAdmin,true),{status:401,headers:privateHeaders});
  await env.DB.prepare('DELETE FROM login_attempts WHERE expires < ?').bind(Date.now()).run();
  const role=loginAdmin?'admin':'guest',token=await makeSession(role,env);const headers=new Headers({'Location':loginAdmin?'/admin':safePath(url.searchParams.get('next')),'Cache-Control':'no-store'});
  headers.append('Set-Cookie',`__Host-pc_${role}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=43200`);
  // Remove legacy unpartitioned sessions so the browser uses the new context-bound cookie.
  headers.append('Set-Cookie',`__Host-pc_${role}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return new Response(null,{status:303,headers});
 }
 if(path==='/entry/logout'&&req.method==='POST'){
  if(req.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403});
  const h=new Headers({'Location':'/','Cache-Control':'no-store'});for(const role of ['guest','admin']){h.append('Set-Cookie',`__Host-pc_${role}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`);h.append('Set-Cookie',`__Host-pc_${role}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);}return new Response(null,{status:303,headers:h});
 }
 const isAdmin=await hasSession(req,'admin',env);if(isAdmin)return null;
 if(path.startsWith('/api/'))return Response.json({error:'Nepieciešama pieslēgšanās'},{status:401,headers:{'Cache-Control':'no-store'}});
 return new Response(null,{status:303,headers:{Location:admin?'/entry/admin':'/entry?next='+encodeURIComponent(path+url.search),'Cache-Control':'no-store'}});
}
