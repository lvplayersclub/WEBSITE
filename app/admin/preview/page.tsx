import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import {readContent} from '@/lib/content';
import Preview from './preview';
export const dynamic='force-dynamic';
export default async function PreviewPage(){if(!await isAdmin(new Request('https://site.local/admin/preview',{headers:await headers()})))redirect('/entry/admin');const {content}=await readContent();return <Preview initial={content}/>}
