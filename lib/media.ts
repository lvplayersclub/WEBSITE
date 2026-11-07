import {getGames} from './games';
import {locationHeroPhoto} from './gallery';
import {locationMenus,changeLocationMenus,menuMediaKey} from './menus';
import type {Location,SiteContent} from './types';
export const defaultLogo='/assets/playersclub-logo.png';
export const defaultImages={games:'/assets/hero.jpg',partyBanner:'/assets/hero.jpg',partyPage:'/assets/hero.jpg'};
export type MediaKind='image'|'video'|'menu';
export type MediaSlot={key:string;label:string;group:string;url:string;kind:MediaKind;shared?:string};
export function imageUrl(content:SiteContent,key:keyof typeof defaultImages){return content.images?.[key]||defaultImages[key]}
export function locationHeroMediaKey(l:Location){const photo=locationHeroPhoto(l);return photo?`gallery:${l.id}:${photo.id}`:`location:${l.id}:image`}
export function mediaSlots(c:SiteContent):MediaSlot[]{return [
 {key:'site:logo',label:'Players Club logo',group:'Zīmols',url:c.logo||defaultLogo,kind:'image',shared:'Kopīgs logo visu lapu galvenē un kājenē.'},
 {key:'site:heroVideo',label:'Sākumlapas titulvideo',group:'Sākumlapa',url:c.heroVideo,kind:'video'},
 {key:'site:heroPoster',label:'Titulvideo rezerves attēls',group:'Sākumlapa',url:c.heroPoster,kind:'image',shared:'Redzams, kamēr ielādējas video, vai ja video nevar atskaņot.'},
 {key:'image:games',label:'Spēļu sadaļas attēls',group:'Sākumlapa',url:imageUrl(c,'games'),kind:'image'},
 {key:'image:partyBanner',label:'Pasākumu bloka fona attēls',group:'Sākumlapa',url:imageUrl(c,'partyBanner'),kind:'image'},
 {key:'image:partyPage',label:'Pasākumu lapas lielais attēls',group:'Pasākumu lapa',url:imageUrl(c,'partyPage'),kind:'image'},
 {key:'site:drinksUrl',label:'Kopējā dzērienkarte',group:'Dzērienkarte',url:c.drinksUrl,kind:'menu'},
 ...c.locations.flatMap(l=>[
  {key:`location:${l.id}:image`,label:`${l.name} — sākumlapas kartīte`,group:l.address||l.name,url:l.image,kind:'image' as const},
  ...(l.vipGallery||[]).map((p,i)=>({key:`vip:${l.id}:${p.id}`,label:`${l.name} — VIP foto ${i+1}: ${p.caption.lv||'VIP istaba'}`,group:l.address||l.name,url:p.url,kind:'image' as const})),
  ...(l.gallery||[]).map((p,i)=>({key:`gallery:${l.id}:${p.id}`,label:`${l.name} — foto ${i+1}: ${p.caption.lv||'galerija'}`,group:l.address||l.name,url:p.url,kind:'image' as const,shared:locationHeroPhoto(l)?.id===p.id?'Šis foto ir arī lokācijas lapas titulattēls.':undefined})),
  {key:`location:${l.id}:menuUrl`,label:`${l.name} — atsevišķa dzērienkarte`,group:l.address||l.name,url:l.menuUrl,kind:'menu' as const}
 ]),
 ...c.locations.flatMap(l=>locationMenus(c,l).map(m=>({key:menuMediaKey(l.id,m.id),label:`${l.name} — ${m.kind==='food'?'ēdienkarte':'dzērienkarte'}: ${m.title.lv}`,group:l.address||l.name,url:m.url,kind:'menu' as const}))),
 ...getGames(c).map(g=>({key:`game:${g.id}:image`,label:`Spēle — ${g.title.lv}`,group:'Spēles',url:g.image,kind:'image' as const})),
 ...c.events.map(e=>({key:`event:${e.id}:image`,label:e.title.lv||'Jauna aktualitāte',group:'Aktualitātes',url:e.image,kind:'image' as const}))
]}
export function updateMedia(c:SiteContent,key:string,url:string):SiteContent{
 if(!mediaSlots(c).some(s=>s.key===key))return c;
 const [kind,id,field]=key.split(':');
 if(kind==='site'&&['logo','heroVideo','heroPoster','drinksUrl'].includes(id))return {...c,[id]:url};
 if(kind==='image'&&Object.hasOwn(defaultImages,id))return {...c,images:{...defaultImages,...c.images,[id]:url}};
 if(kind==='location'&&['image','menuUrl'].includes(field))return {...c,locations:c.locations.map(l=>l.id===id?{...l,[field]:url}:l)};
 if(kind==='vip')return {...c,locations:c.locations.map(l=>l.id===id?{...l,vipGallery:l.vipGallery?.map(p=>p.id===field?{...p,url}:p)}:l)};
 if(kind==='gallery')return {...c,locations:c.locations.map(l=>l.id===id?{...l,gallery:l.gallery?.map(p=>p.id===field?{...p,url}:p)}:l)};
 if(kind==='menu')return changeLocationMenus(c,id,docs=>docs.map(m=>m.id===field?{...m,url}:m));
 if(kind==='game'&&field==='image')return {...c,games:getGames(c).map(g=>g.id===id?{...g,image:url}:g)};
 if(kind==='event'&&field==='image')return {...c,events:c.events.map(e=>e.id===id?{...e,image:url}:e)};
 return c;
}
