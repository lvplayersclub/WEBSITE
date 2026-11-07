import {gameSlug,getGames} from '@/lib/games';
import {findLocation} from '@/lib/locations';
import {notFound} from 'next/navigation';
import {readContent} from '@/lib/content';
import Website from '@/app/website';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{path?:string[]}>}){
 const {path=[]}=await params;const en=path[0]==='en';const slug=path.slice(en?1:0).join('/');
 const views:Record<string,string>=en?{'':'home',events:'party',happenings:'news',drinks:'drinks',games:'games'}:{'':'home',pasakumi:'party',aktualitates:'news',dzerienkarte:'drinks',speles:'games'};
 const {content}=await readContent();const segments=path.slice(en?1:0);const isLocation=segments.length===2&&segments[0]===(en?'locations':'lokacijas');const location=isLocation?findLocation(content.locations,segments[1]):undefined;const isGame=segments.length===2&&segments[0]===(en?'games':'speles');const game=isGame?getGames(content).find(g=>g.published&&gameSlug(g)===segments[1]):undefined;if((isGame&&!game)||(isLocation&&!location)||(!isLocation&&!isGame&&!(slug in views)))notFound();
 return <Website content={{...content,locations:content.locations.filter(l=>l.published),events:content.events.filter(e=>e.published)}} initialLang={en?'en':'lv'} view={isGame?'game':isLocation?'location':views[slug]} gameId={game?.id} locationId={location?.id}/>;
}

export async function generateMetadata({params}:{params:Promise<{path?:string[]}>}){const {path=[]}=await params,en=path[0]==='en',lang=en?'en':'lv',parts=path.slice(en?1:0);const {content}=await readContent();const g=parts[0]===(en?'games':'speles')?getGames(content).find(g=>g.published&&gameSlug(g)===parts[1]):undefined;const l=parts[0]===(en?'locations':'lokacijas')?findLocation(content.locations,parts[1]):undefined;const titles:Record<string,string>=en?{'':'Entertainment centre in Riga',games:'Games',events:'Corporate & private events',happenings:'Events and news',drinks:'Food and drinks menus'}:{'':'Izklaides centrs Rīgā',speles:'Spēles',pasakumi:'Korporatīvie un privātie pasākumi',aktualitates:'Notikumi un pasākumi',dzerienkarte:'Ēdienkartes un dzērienkartes'};return {title:(g?.title[lang]||l?.name||titles[parts[0]||'']||'Players Club')+' | Players Club',description:g?.description[lang]||l?.description[lang]||(en?'Games, a bar and time with friends at Players Club in Riga. Explore our clubs, games and menus.':'Spēles, bārs un laiks ar draugiem Players Club Rīgā. Iepazīsti klubus, spēles un ēdienkartes.')}}
