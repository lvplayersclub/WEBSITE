import type {Game,SiteContent} from './types';
const entries=[
 ['darts','Šautriņas','Darts','Precizitāte, punkti un draudzīga sacensība — pārbaudi savu trāpīgumu.','Aim for the bullseye and challenge your friends to a game.'],
 ['pool','Biljards','Pool','Izplāno nākamo sitienu un izaicini draugus uz partiju.','Plan your next shot and challenge your friends to a round.'],
 ['racing','Auto simulators','Racing simulator','Sēdies pie stūres un izmēģini savas braukšanas prasmes virtuālajā trasē.','Take the wheel and test your driving skills on a virtual track.'],
 ['table-tennis','Galda teniss','Table tennis','Ātra bumbiņa, asas reakcijas un vēl viena izspēle.','Fast rallies, quick reactions and one more round.'],
 ['air-hockey','Gaisa hokejs','Air hockey','Aizstāvi savus vārtus un raidī ripu pretinieka pusē.','Defend your goal and send the puck flying past your opponent.'],
 ['xbox','Xbox','Xbox','Izvēlies spēli un pievienojies konsoles spēļu izaicinājumam.','Pick a game and join the console gaming challenge.'],
 ['playstation','PlayStation','PlayStation','Paņem kontrolieri un izbaudi spēļu vakaru kopā ar savējiem.','Grab a controller and enjoy a gaming night with your people.'],
 ['seated-football','Sēžamais futbols','Seated football','Futbols citā formātā — sēdies spēlē un izaicini draugus.','Football with a twist — take a seat and challenge your friends.'],
 ['novuss','Novuss','Novuss','Klasiska spēle, kur precizitāte satiekas ar taktiku.','A classic game where accuracy meets tactics.'],
 ['arcades','Arkādes','Arcade games','Atklāj arkāžu izaicinājumus un mēģini pārspēt savu rezultātu.','Explore arcade challenges and try to beat your best score.']
];
export const defaultGames:Game[]=entries.map(([id,lv,en,descriptionLv,descriptionEn])=>({id,title:{lv,en},description:{lv:descriptionLv,en:descriptionEn},image:id==='pool'?'/assets/barona-pool.jpg':id==='air-hockey'?'/assets/xl-airhockey.jpg':'',published:true}));
export const specialGames:Game[]=[{id:'minigolf',slug:'minigolfs',title:{lv:'Neona minigolfs',en:'Neon mini golf'},description:{lv:'Minigolfa izaicinājums neona gaismās Players Club Barona ielā.',en:'A neon mini golf challenge at Players Club on Barona Street.'},image:'/assets/barona-minigolf.jpg',published:true,locationIds:['barona']},{id:'rodeo',slug:'rodeo-bullis',title:{lv:'Rodeo bullis',en:'Rodeo bull'},description:{lv:'Pārbaudi līdzsvaru un noturību uz rodeo buļļa Players Club XL.',en:'Test your balance and endurance on the rodeo bull at Players Club XL.'},image:'/assets/xl-bull.jpg',published:true,locationIds:['xl']}];
const slugs:Record<string,string>={darts:'sautrinas',pool:'biljards',racing:'auto-simulators','table-tennis':'galda-teniss','air-hockey':'gaisa-hokejs',xbox:'xbox',playstation:'playstation','seated-football':'sezamais-futbols',novuss:'novuss',arcades:'arkades'};
export function gameSlug(g:Game){return g.slug||slugs[g.id]||g.id}
export function gamePath(g:Game,lang:'lv'|'en'='lv'){return (lang==='lv'?'/speles/':'/en/games/')+encodeURIComponent(gameSlug(g))}
// Initial availability verified against lvplayersclub.lv/speles/ on 2026-10-26.
export function initialGameLocationIds(g:Game):string[]{if(g.id==='minigolf')return ['barona'];if(['novuss','rodeo'].includes(g.id))return ['xl'];return ['darts','pool','racing','table-tennis','air-hockey','xbox','playstation','seated-football','arcades'].includes(g.id)?['xl','barona']:[]}
export function gameLocations(g:Game,c:SiteContent){const ids=g.locationIds??initialGameLocationIds(g);return c.locations.filter(l=>l.published&&ids.includes(l.id))}
export function getGames(c:SiteContent){const base=c.games??defaultGames.map(g=>g.id==='racing'&&c.images?.games?{...g,image:c.images.games}:g);return (c.gamesSchemaVersion===1?base:[...base,...specialGames.filter(g=>c.locations.some(l=>g.locationIds?.includes(l.id))&&!base.some(x=>x.id===g.id))]).map(g=>g.locationIds!==undefined?g:{...g,locationIds:initialGameLocationIds(g).filter(id=>c.locations.some(l=>l.id===id))})}
