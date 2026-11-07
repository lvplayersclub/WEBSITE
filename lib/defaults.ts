import {defaultGames} from './games';
import {defaultImages,defaultLogo} from './media';
import {normalizeLocations} from './locations';
import {defaultDesign} from './design';
import type {SiteContent} from './types';
export const defaults:SiteContent=normalizeLocations({games:defaultGames,logo:defaultLogo,images:defaultImages,design:defaultDesign,copy:{},
heroVideo:'/assets/hero.mp4',heroPoster:'/assets/hero.jpg',drinksUrl:'/assets/drinks.png',
socials:{facebook:'https://www.facebook.com/playersclublv',instagram:'https://www.instagram.com/players_club_lv/',tiktok:'https://www.tiktok.com/@playersclub_lv'},
events:[],locations:[
{id:'xl',name:'Players Club XL',address:'Jēkaba iela 3/5, Rīga',area:{lv:'VECRĪGA',en:'OLD TOWN'},signature:{lv:'RODEO BULLIS',en:'RODEO BULL'},description:{lv:'Lielāks laukums tavam vakaram. Rodeo bullis, biljards, arkādes un privātais bārs 3. stāvā.',en:'More room for your night. A rodeo bull, pool, arcade games and a private third-floor bar.'},price:'20',studentPrice:'18',image:'/assets/bull.jpg',ticketUrl:'https://shop.aula.lv/event/players-club-xl-apmekljums-44v8rf',googleUrl:'https://www.google.com/maps?cid=7740050684845942036',tripadvisorUrl:'https://www.tripadvisor.com/Attraction_Review-g274967-d33031026-Reviews-Players_Club_Xl-Riga_Riga_Region.html',mapEmbed:'https://www.google.com/maps?q=Players+Club+XL+Jekaba+3%2F5+Riga&output=embed',hours:{lv:'',en:''},published:true,menuUrl:''},
{id:'barona',name:'Players Club',address:'Krišjāņa Barona iela 31, Rīga',area:{lv:'CENTRS',en:'CITY CENTRE'},signature:{lv:'NEONA MINIGOLFS',en:'NEON MINI GOLF'},description:{lv:'Kompaktāks klubs ar savu raksturu. Neona minigolfs, spēles un bārs pašā Rīgas centrā.',en:'A smaller club with a character of its own. Neon mini golf, games and a bar in central Riga.'},price:'15',studentPrice:'13',image:'/assets/golf.jpg',ticketUrl:'https://shop.aula.lv/event/players-club-apmekljums-qjupmv',googleUrl:'https://www.google.com/maps?cid=10553448517790925715',tripadvisorUrl:'https://www.tripadvisor.com/Attraction_Review-g274967-d27124857-Reviews-Players_Club-Riga_Riga_Region.html',mapEmbed:'https://www.google.com/maps?q=Players+Club+Barona+31+Riga&output=embed',hours:{lv:'',en:''},published:true,menuUrl:''}
]});
