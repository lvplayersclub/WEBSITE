import {legacyDrinksText,baronaFoodText,xlFoodText} from './menu-seeds';
import type {Location,SiteContent,MenuDocument} from './types';
export function locationMenus(content:SiteContent,l:Location):MenuDocument[]{if(l.menus!==undefined){const docs=l.menus.map(hydrateMenu);if(content.menuSchemaVersion!==1&&docs.length&&!docs.some(m=>m.kind==='food')&&(l.id==='xl'||l.id==='barona'))docs.push(legacyFood(l));return docs;}const url=l.menuUrl||content.drinksUrl;const docs:MenuDocument[]=url?[hydrateMenu({id:'legacy-drinks',kind:'drinks',title:{lv:'Dzērienkarte',en:'Drinks menu'},url})]:[];if(l.id==='xl'||l.id==='barona')docs.push(legacyFood(l));return docs}
export function menuMediaKey(locationId:string,id:string){return `menu:${locationId}:${id}`}
export function isMenuImage(url:string){return /\.(png|jpe?g|webp)(\?|$)/i.test(url)}
export function changeLocationMenus(content:SiteContent,id:string,change:(docs:MenuDocument[])=>MenuDocument[]):SiteContent{return {...content,locations:content.locations.map(l=>l.id===id?{...l,menus:change(locationMenus(content,l))}:l)}}

export function hydrateMenu(m:MenuDocument):MenuDocument{if(m.sections!==undefined)return m;const sections=['/assets/drinks.png','/api/media/61703107-3c28-49ec-8a0b-a502a529abec.png','/api/media/634ed81f-4f73-426b-91ac-937bde33c288.png','/api/media/008018ba-0542-4996-a591-ad9e2ec09557.png','/api/media/12ae97bf-91d7-4c06-99c6-fee96d02d34f.png'].includes(m.url.replace('/assets/imported/','/api/media/'))||/\/2(?:-768x432)?\.png$/.test(m.url)?legacyDrinksText:m.url==='/assets/menu-xl.jpg'||/IMG_1188(?:-706x1024)?\.jpg$/.test(m.url)?xlFoodText:m.url==='/assets/menu-barona.jpg'||/WhatsApp-Image-2025-02-24-at-12.22.17(?:-768x1089)?\.jpeg$/.test(m.url)?baronaFoodText:undefined;return sections?{...m,sections}:m}

function legacyFood(l:Location):MenuDocument{return {id:'legacy-food',kind:'food',title:{lv:'Ēdienkarte',en:'Food menu'},url:'/assets/menu-'+l.id+'.jpg',sections:l.id==='xl'?xlFoodText:baronaFoodText}}
