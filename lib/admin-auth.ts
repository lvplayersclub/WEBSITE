import {hasSession} from './password-auth';
import {env} from 'cloudflare:workers';
export async function isAdmin(request:Request){return hasSession(request,'admin',env)}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !!origin&&origin===new URL(request.url).origin;}
