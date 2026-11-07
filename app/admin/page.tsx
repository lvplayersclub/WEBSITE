import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import {readContent} from '@/lib/content';
import Admin from './panel';
export const dynamic='force-dynamic';
export default async function AdminPage(){if(!await isAdmin(new Request('https://site.local/admin',{headers:await headers()})))redirect('/entry/admin');const {content,revision}=await readContent();return <Admin initial={content} initialRevision={revision}/>}
