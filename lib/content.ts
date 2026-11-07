import {locationMenus} from './menus';
import {getGames} from './games';
import {defaultImages,defaultLogo} from './media';
import {normalizeLocations} from './locations';
import {env} from 'cloudflare:workers';
import {defaultDesign} from './design';
import initialContent from './initial-content.json';
import type {SiteContent} from './types';
export async function readContent(){
 if(!env.DB)throw new Error('Content database unavailable');
 const row=await env.DB.prepare('SELECT data, updated_at FROM content WHERE id = ?').bind('site').first<{data:string;updated_at:string}>();
 const data=row?JSON.parse(row.data) as SiteContent:initialContent as SiteContent;return {content:normalizeLocations({...data,locations:data.locations.map(l=>({...l,menus:locationMenus(data,l)})),menuSchemaVersion:1,gamesSchemaVersion:1,games:getGames(data),logo:data.logo||defaultLogo,images:{...defaultImages,...data.images},design:data.design||defaultDesign,copy:data.copy||{}}),revision:row?.updated_at||null};
}
