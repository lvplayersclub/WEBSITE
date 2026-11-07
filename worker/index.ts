import handler from 'vinext/server/fetch-handler';
import {passwordGate} from '../lib/password-auth';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const blocked=await passwordGate(request,env);if(blocked)return blocked;
  const headers=new Headers(request.headers);headers.set('x-players-language',new URL(request.url).pathname.match(/^\/en(?:\/|$)/)?'en':'lv');
  const response=await handler.fetch(new Request(request,{headers}),env,ctx);
  const result=new Response(response.body,response);result.headers.set('Cache-Control','private, no-store');
  if(new URL(request.url).pathname.match(/^\/(admin|api|entry)(?:\/|$)/))result.headers.set('X-Robots-Tag','noindex, nofollow');
  else result.headers.delete('X-Robots-Tag');return result;
 }
};
