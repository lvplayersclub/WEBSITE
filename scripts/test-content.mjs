import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const env={ADMIN_USERNAME:'test-admin',ADMIN_PASSWORD:'test-admin-password',SESSION_SECRET:'test-session-key-only',DB:null,BUCKET:null};const cache=new Map();
function load(file){file=path.resolve(file);if(!fs.existsSync(file)&&file.endsWith('.ts'))file+='x';if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;const localRequire=id=>{if(id.endsWith('.json'))return JSON.parse(fs.readFileSync(path.resolve(path.dirname(file),id),'utf8'));if(id==='cloudflare:workers')return {env};if(id.startsWith('@/'))return load(id.slice(2)+'.ts');if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id)+'.ts');return require(id)};vm.runInNewContext(js,{module,exports:module.exports,require:localRequire,Response,Request,Headers,File,FormData,Uint8Array,TextDecoder,TextEncoder,URL,URLSearchParams,Date,crypto,console},{filename:file});return module.exports}
const {contentSchema}=load('lib/validation.ts');const {defaults}=load('lib/defaults.ts');
assert.equal(contentSchema.safeParse(defaults).success,true,'Initial content is valid');
let bad=structuredClone(defaults);bad.heroVideo='javascript:alert(1)';assert.equal(contentSchema.safeParse(bad).success,false,'Reject script URLs');
bad=structuredClone(defaults);bad.locations[0].mapEmbed='https://evil.example/maps';assert.equal(contentSchema.safeParse(bad).success,false,'Reject foreign iframe hosts');
bad=structuredClone(defaults);bad.locations.push(bad.locations[0]);assert.equal(contentSchema.safeParse(bad).success,false,'Reject duplicate location IDs');
bad=structuredClone(defaults);bad.events=[{id:'test',title:{lv:'Test',en:''},description:{lv:'Test',en:'Test'},date:'2026-12-01',endDate:'',locationId:'xl',image:'/assets/bull.jpg',link:'',published:true}];assert.equal(contentSchema.safeParse(bad).success,false,'Published events require both translations');bad.events[0].published=false;assert.equal(contentSchema.safeParse(bad).success,true,'Incomplete event can be a draft');bad.events[0].endDate='2026-11-01';assert.equal(contentSchema.safeParse(bad).success,false,'Reject reversed dates');
const {isAdmin,sameOrigin}=load('lib/admin-auth.ts');const testAdminCookie='__Host-pc_admin='+await load('lib/password-auth.ts').makeSession('admin',env);const headers={cookie:testAdminCookie,origin:'https://club.example','oai-authenticated-user-id':'site-user-1','oai-authenticated-user-email':'owner@example.com','content-type':'application/json'};
assert.equal(await isAdmin(new Request('https://club.example/api/content',{headers})),true);assert.equal(await isAdmin(new Request('https://club.example/api/content')),false);assert.equal(await isAdmin(new Request('https://club.example/api/content',{headers:{...headers,cookie:''}})),false);assert.equal(sameOrigin(new Request('https://club.example/api/content',{headers:{origin:'https://evil.example'}})),false);
let row=null;env.DB={prepare(sql){return {bind(...args){return {async first(){return row},async run(){if(sql.startsWith('INSERT')){if(row)return {meta:{changes:0}};row={data:args[1],updated_at:args[2]};return {meta:{changes:1}}}if(sql.startsWith('UPDATE')){if(row?.updated_at!==args[3])return {meta:{changes:0}};row={data:args[0],updated_at:args[1]};return {meta:{changes:1}}}throw Error('Unexpected SQL')}}}}}};
const route=load('app/api/content/route.ts');const req=(content=defaults,revision=null,custom=headers)=>new Request('https://club.example/api/content',{method:'PUT',headers:custom,body:JSON.stringify({content,revision})});
assert.equal((await route.PUT(req(defaults,null,{'content-type':'application/json'}))).status,403,'Anonymous writes rejected');assert.equal((await route.PUT(req(defaults,null,{...headers,origin:'https://evil.example'}))).status,403,'Cross-origin writes rejected');
assert.equal((await route.PUT(req(bad))).status,400,'Invalid content rejected');
let response=await route.PUT(req());assert.equal(response.status,200);const first=await response.json();assert.ok(first.revision);assert.equal((await route.PUT(req())).status,409,'Concurrent first writes conflict');
const updated=structuredClone(defaults);updated.drinksUrl='/assets/new-menu.pdf';response=await route.PUT(req(updated,first.revision));assert.equal(response.status,200);assert.equal(JSON.parse(row.data).drinksUrl,'/assets/new-menu.pdf','Updates persist');assert.equal((await route.PUT(req(defaults,first.revision))).status,409,'Stale saves rejected');assert.equal((await route.GET(new Request('https://club.example/api/content'))).status,403,'Draft content is private');
const upload=load('app/api/upload/route.ts');assert.equal((await upload.POST(new Request('https://club.example/api/upload',{method:'POST'}))).status,403,'Anonymous uploads rejected');let stored;env.BUCKET={async put(id,bytes,opts){stored={id,bytes,opts}}};let form=new FormData();form.set('file',new File(['<svg onload="alert(1)"></svg>'],'bad.svg',{type:'image/svg+xml'}));assert.equal((await upload.POST(new Request('https://club.example/api/upload',{method:'POST',headers:{origin:headers.origin,cookie:headers.cookie,'oai-authenticated-user-id':headers['oai-authenticated-user-id'],'oai-authenticated-user-email':headers['oai-authenticated-user-email']},body:form}))).status,400,'Active SVG content rejected');form=new FormData();form.set('file',new File(['%PDF-1.7\nexample'],'menu.pdf',{type:'application/pdf'}));response=await upload.POST(new Request('https://club.example/api/upload',{method:'POST',headers:{origin:headers.origin,cookie:headers.cookie,'oai-authenticated-user-id':headers['oai-authenticated-user-id'],'oai-authenticated-user-email':headers['oai-authenticated-user-email']},body:form}));assert.equal(response.status,200);assert.equal(stored.opts.httpMetadata.contentType,'application/pdf');assert.ok((await response.json()).url.startsWith('/api/media/'));
console.log('PASS: content validation, admin authorization, CSRF, draft privacy, persistent updates, concurrent save protection, file validation and uploads.');

const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const Website=load('app/website.tsx').default;
for(const lang of ['lv','en']){for(const view of ['home','party','news','drinks']){const html=renderToStaticMarkup(React.createElement(Website,{content:defaults,initialLang:lang,view}));assert.ok(html.includes('LV')&&html.includes('EN'));assert.ok(html.includes('https://www.tiktok.com/@playersclub_lv'));if(view==='home'){assert.ok(html.includes('<video'));assert.ok(html.includes('RODEO'));assert.ok(html.includes('MINI'));assert.ok(html.includes(defaults.locations[0].ticketUrl));assert.ok(html.includes(defaults.locations[1].ticketUrl));assert.ok(html.includes('Tripadvisor'));assert.ok(html.includes('<details>'));assert.equal((html.match(/<iframe/g)||[]).length,2,'Both locations have embedded maps');assert.ok(html.includes('loading="lazy"'),'Maps use lazy loading')}if(view==='drinks')assert.ok(html.includes('/assets/drinks.png'));if(view==='party')assert.ok(html.includes('<form'));}}
for(const file of ['hero.mp4','hero.jpg','bull.jpg','golf.jpg','drinks.png'])assert.ok(fs.statSync('public/assets/'+file).size>1000,'Media asset exists: '+file);
console.log('PASS: all eight LV/EN page variants render, ticket and social links, signature games, lazy maps, FAQ and menu assets.');

const {defaultDesign,designVariables}=load('lib/design.ts');const {copyDefaults,getText}=load('lib/copy.ts');
let custom=structuredClone(defaults);custom.design={...defaultDesign,headingFont:'oswald',desktop:{...defaultDesign.desktop,hero:180},mobile:{...defaultDesign.mobile,hero:60},accent:'#ffd500'};custom.copy={hero1:{lv:'MANS JAUNAIS TEKSTS',en:'MY NEW HEADING'},ticker:{lv:'Mana josla',en:'My banner'},faq0q:{lv:'Mans jautājums?',en:'My question?'}};
assert.equal(contentSchema.safeParse(custom).success,true);assert.equal(designVariables(custom.design)['--hero-desktop'],'180px');assert.equal(designVariables(custom.design)['--hero-mobile'],'60px');assert.equal(getText(custom,'en').hero1,'MY NEW HEADING');
let html=renderToStaticMarkup(React.createElement(Website,{content:custom,initialLang:'lv',view:'home'}));assert.ok(html.includes('MANS JAUNAIS TEKSTS'));assert.ok(html.includes('Mana josla'));assert.ok(html.includes('Mans jautājums?'));assert.ok(html.includes('--hero-desktop:180px'));assert.ok(html.includes('data-edit-key="location:xl:signature"'));
const publicHtml=html;assert.ok(!publicHtml.includes('text-editing'),'Public page does not enable editing');html=renderToStaticMarkup(React.createElement(Website,{content:custom,initialLang:'en',view:'home',onTextSelect:()=>{}}));assert.ok(html.includes('MY NEW HEADING'));assert.ok(html.includes('text-editing'));
for(const badDesign of [{...defaultDesign,headingFont:'evil;display:none'},{...defaultDesign,accent:'red; color:red'},{...defaultDesign,desktop:{...defaultDesign.desktop,hero:-1}},{...defaultDesign,mobile:{...defaultDesign.mobile,body:200}}])assert.equal(contentSchema.safeParse({...custom,design:badDesign}).success,false,'Reject invalid design settings');
assert.equal(contentSchema.safeParse({...custom,copy:{unknownField:{lv:'a',en:'b'}}}).success,false,'Reject unknown copy fields');
custom.copy.hero1.lv='<script>alert(1)</script>';html=renderToStaticMarkup(React.createElement(Website,{content:custom,initialLang:'lv',view:'home'}));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'),'Copy is escaped as text');
const legacy=structuredClone(defaults);delete legacy.design;delete legacy.copy;row={data:JSON.stringify(legacy),updated_at:'old-revision'};const legacyRead=await load('lib/content.ts').readContent();assert.deepEqual(legacyRead.content.design,defaultDesign);assert.equal(legacyRead.content.heroVideo,defaults.heroVideo);assert.equal(Object.keys(legacyRead.content.copy).length,0);assert.equal(legacyRead.revision,'old-revision');
let designSave=await route.PUT(req(custom,'old-revision'));assert.equal(designSave.status,200);assert.equal(JSON.parse(row.data).design.desktop.hero,180);assert.equal(JSON.parse(row.data).copy.ticker.lv,'Mana josla','Design and text updates persist in the existing CMS');
const DesignEditor=load('app/admin/design-editor.tsx').default;html=renderToStaticMarkup(React.createElement(DesignEditor,{content:defaults,onChange:()=>{},savedDesign:defaultDesign}));assert.ok(html.includes('/admin/preview'));assert.ok(html.includes('Atjaunot sākotnējo dizainu'));assert.ok(html.includes('Telefons'));assert.ok(html.includes('English'));
console.log('PASS: design ranges and injection protection, LV/EN text overrides and escaping, responsive settings, legacy content compatibility, saved design persistence and preview controls.');
const {locationPath,findLocation,normalizeLocation,initialHours}=load('lib/locations.ts');
assert.equal(locationPath(defaults.locations[0]),'/lokacijas/xl');assert.equal(locationPath(defaults.locations[0],'en'),'/en/locations/xl');
for(const lang of ['lv','en'])for(const l of defaults.locations){const html=renderToStaticMarkup(React.createElement(Website,{content:defaults,initialLang:lang,view:'location',locationId:l.id}));assert.ok(html.includes(l.name));assert.ok(html.includes(l.hours[lang].split('\n')[0].split(': ')[0]));assert.ok(html.includes('14+'));assert.ok(html.includes('18+'));assert.ok(html.includes(l.gallery[0].url));assert.ok(html.includes(locationPath(l,lang==='lv'?'en':'lv')),'Language switch preserves selected club');assert.equal(html.includes('id="vip"'),l.id==='xl','VIP section is only present at XL');if(l.id==='xl'){assert.ok(html.includes('150'));assert.ok(html.includes('170'));assert.ok(html.includes(lang==='lv'?'tikai dzērieniem':'drinks only'));}}
const third=normalizeLocation({...structuredClone(defaults.locations[1]),id:'new-club',slug:'agenskalns',name:'Players Club Āgenskalns',gallery:[],vipEnabled:false});const withThird={...defaults,locations:[...defaults.locations,third]};assert.equal(contentSchema.safeParse(withThird).success,true);assert.equal(findLocation(withThird.locations,'agenskalns').id,'new-club');assert.equal(locationPath(third),'/lokacijas/agenskalns');assert.equal(findLocation([{...third,published:false}],'agenskalns'),undefined,'Draft location is not a public page');assert.equal(findLocation(withThird.locations,'missing'),undefined,'Missing location is not resolved');
let invalid=structuredClone(withThird);invalid.locations[2].slug='xl';assert.equal(contentSchema.safeParse(invalid).success,false,'Reject duplicate public paths');invalid=structuredClone(withThird);invalid.locations[2].slug='../admin';assert.equal(contentSchema.safeParse(invalid).success,false,'Reject traversal slugs');invalid=structuredClone(withThird);invalid.locations[2].hours={lv:'',en:''};assert.equal(contentSchema.safeParse(invalid).success,false,'Published clubs need opening hours');invalid=structuredClone(withThird);invalid.locations[0].gallery[0].url='javascript:alert(1)';assert.equal(contentSchema.safeParse(invalid).success,false,'Reject unsafe gallery links');
let locationSave=await route.PUT(req(withThird,row.updated_at));assert.equal(locationSave.status,200);assert.equal(JSON.parse(row.data).locations.length,3);assert.equal(JSON.parse(row.data).locations[0].gallery.length,4);assert.ok(fs.statSync('public/assets/xl-bull.jpg').size>1000);assert.ok(fs.statSync('public/assets/barona-minigolf.jpg').size>1000);
console.log('PASS: LV/EN location pages, per-club hours and galleries, XL-only VIP, public/draft route resolution, slug validation and new club persistence.');
const {mediaSlots,updateMedia,imageUrl,locationHeroMediaKey,defaultImages}=load('lib/media.ts');
const slots=mediaSlots(defaults);assert.equal(new Set(slots.map(s=>s.key)).size,slots.length,'Media slot IDs are unique');assert.ok(slots.some(s=>s.key==='site:heroVideo'));assert.ok(slots.some(s=>s.key==='site:heroPoster'));assert.ok(slots.some(s=>s.key==='image:games'));assert.ok(slots.some(s=>s.key==='image:partyBanner'));assert.ok(slots.some(s=>s.key==='image:partyPage'));for(const l of defaults.locations){assert.ok(slots.some(s=>s.key===`location:${l.id}:image`));for(const p of l.gallery)assert.ok(slots.some(s=>s.key===`gallery:${l.id}:${p.id}`));assert.ok(slots.some(s=>s.key===locationHeroMediaKey(l)))}
for(const slot of slots){const url=slot.kind==='video'?'/api/media/11111111-1111-4111-8111-111111111111.mp4':'/api/media/11111111-1111-4111-8111-111111111111.jpg';const changed=updateMedia(defaults,slot.key,url);assert.equal(mediaSlots(changed).find(s=>s.key===slot.key).url,url,'Replacement works: '+slot.key);assert.equal(contentSchema.safeParse(changed).success,true,'Replacement remains valid');}
assert.equal(updateMedia(defaults,'site:evil','https://evil.example'),defaults,'Unknown media slots are ignored');const oneChanged=updateMedia(defaults,'image:games','/assets/new-games.jpg');assert.equal(imageUrl(oneChanged,'games'),'/assets/new-games.jpg');assert.equal(imageUrl(oneChanged,'partyBanner'),defaultImages.partyBanner,'Same original file can be changed independently');
const legacyMedia=structuredClone(defaults);delete legacyMedia.images;assert.equal(contentSchema.safeParse(legacyMedia).success,true,'Old content gets image defaults');assert.equal(imageUrl(legacyMedia,'games'),defaultImages.games);
let eventContent=structuredClone(defaults);eventContent.events=[{id:'media-event',title:{lv:'Jaunums',en:'News'},description:{lv:'Apraksts',en:'Description'},date:'2099-01-01',endDate:'',locationId:'xl',image:'/assets/bull.jpg',link:'',published:true}];assert.ok(mediaSlots(eventContent).some(s=>s.key==='event:media-event:image'));eventContent=updateMedia(eventContent,'event:media-event:image','/assets/new-event.jpg');assert.equal(eventContent.events[0].image,'/assets/new-event.jpg');
let mediaChanged=updateMedia(defaults,'site:heroVideo','/assets/new-video.mp4');mediaChanged=updateMedia(mediaChanged,'image:partyPage','/assets/new-party.jpg');html=renderToStaticMarkup(React.createElement(Website,{content:mediaChanged,initialLang:'lv',view:'home',onMediaSelect:()=>{},onTextSelect:()=>{}}));assert.ok(html.includes('/assets/new-video.mp4'));assert.ok(html.includes('Nomainīt titulvideo'));assert.ok(html.includes('data-media-key="game:darts:image"'));html=renderToStaticMarkup(React.createElement(Website,{content:mediaChanged,initialLang:'en',view:'party'}));assert.ok(html.includes('/assets/new-party.jpg'));assert.ok(!html.includes('Nomainīt titulvideo'));
const MediaEditor=load('app/admin/media-editor.tsx').default;html=renderToStaticMarkup(React.createElement(MediaEditor,{content:defaults,onChange:()=>{},selectedKey:'site:heroVideo',onSelect:()=>{},onBusy:()=>{}}));assert.ok(html.includes('Augšupielādēt savu failu'));assert.ok(html.includes('video/mp4,video/webm'));assert.ok(html.includes('Izmantot šo failu'));
let wrongForm=new FormData();wrongForm.set('file',new File(['%PDF-1.7\nexample'],'bad.pdf',{type:'application/pdf'}));wrongForm.set('kind','image');response=await upload.POST(new Request('https://club.example/api/upload',{method:'POST',headers:{origin:headers.origin,cookie:headers.cookie,'oai-authenticated-user-id':headers['oai-authenticated-user-id'],'oai-authenticated-user-email':headers['oai-authenticated-user-email']},body:wrongForm}));assert.equal(response.status,400,'Image slots reject PDF uploads');
const savedMedia=await route.PUT(req(mediaChanged,row.updated_at));assert.equal(savedMedia.status,200);assert.equal(JSON.parse(row.data).images.partyPage,'/assets/new-party.jpg');assert.equal(JSON.parse(row.data).heroVideo,'/assets/new-video.mp4');
console.log('PASS: all image/video slots, independent replacements, gallery and event images, legacy image defaults, upload modal, media-kind validation and durable image/video saves.');

const logoContent=updateMedia(defaults,'site:logo','/assets/custom-logo.png');
assert.equal(contentSchema.parse(logoContent).logo,'/assets/custom-logo.png');
const logoHtml=renderToStaticMarkup(React.createElement(Website,{content:logoContent,initialLang:'lv',view:'home'}));
assert.equal((logoHtml.match(/src="\/assets\/custom-logo.png"/g)||[]).length,2,'Shared logo appears in header and footer');
assert.ok(!logoHtml.includes('♠'),'Old brand mark is removed');
console.log('Shared editable logo checks passed');

// The simulator sticker must win over its parent image's edit target.
const stickerCopy={...defaults,copy:{...defaults.copy,gameSticker:{lv:'JAUNA SPĒLE\nVĒLREIZ',en:'NEW GAME\nAGAIN'},partyRing:{lv:'MŪSU\nVAKARS',en:'OUR\nNIGHT'}}};
assert.equal(contentSchema.safeParse(stickerCopy).success,true);
const stickerHtml=renderToStaticMarkup(React.createElement(Website,{content:stickerCopy,initialLang:'lv',view:'home',onTextSelect:()=>{},onMediaSelect:()=>{}}));
assert.match(stickerHtml,/data-edit-key="game:darts:title"/);
assert.match(stickerHtml,/class="party-ring" data-edit-key="partyRing"/);
const {Media}=load('app/admin/panel.tsx');
const fieldHtml=renderToStaticMarkup(React.createElement(Media,{label:'Pasākuma foto',value:'',onChange:()=>{},onBusy:()=>{}}));
assert.match(fieldHtml,/<button type="button" class="upload-btn">Izvēlēties failu<\/button>/,'Explicit button opens file input');
assert.match(fieldHtml,/class="upload-file-input" type="file"/);
for(const [name,bytes,mime,expected] of [['photo.png',fs.readFileSync('public/assets/playersclub-logo.png'),'image/png','image/png'],['photo.jpg',fs.readFileSync('public/assets/hero.jpg'),'','image/jpeg']]){
 const fd=new FormData();fd.set('kind','image');fd.set('file',new File([bytes],name,{type:mime}));
 const result=await upload.POST(new Request('https://club.example/api/upload',{method:'POST',headers:{origin:headers.origin,cookie:headers.cookie,'oai-authenticated-user-id':headers['oai-authenticated-user-id'],'oai-authenticated-user-email':headers['oai-authenticated-user-email']},body:fd}));
 assert.equal(result.status,200);assert.equal(stored.opts.httpMetadata.contentType,expected);const {url}=await result.json();
 const newsDraft={...defaults,events:[{id:'upload-check',title:{lv:'Pārbaude',en:'Check'},description:{lv:'Apraksts',en:'Description'},date:'2099-01-01',endDate:'',locationId:'xl',image:url,link:'',published:true}]};
 assert.equal((await route.PUT(req(newsDraft,row.updated_at))).status,200);assert.equal(JSON.parse(row.data).events[0].image,url);
}
console.log('PASS: editable simulator/banner overlays, explicit event file picker, real PNG/JPEG uploads (including missing MIME), event image persistence.');

const {passwordGate,hasSession,makeSession}=load('lib/password-auth.ts');
const authEnv={SITE_PASSWORD:'test-guest',ADMIN_USERNAME:'test-admin',ADMIN_PASSWORD:'test-admin-password',SESSION_SECRET:'test-session-key-only',DB:{prepare(sql){return {bind(){return {async first(){return {attempts:1}},async run(){return {}}}}}}}};
const gateReq=(p,opts={})=>new Request('https://club.example'+p,opts);
assert.equal(await passwordGate(gateReq('/'),authEnv),null);
assert.equal((await passwordGate(gateReq('/admin'),authEnv)).headers.get('location'),'/entry/admin');
assert.equal(await passwordGate(gateReq('/assets/hero.jpg'),authEnv),null);
assert.equal(await passwordGate(gateReq('/api/media/example.png'),authEnv),null);
assert.equal((await passwordGate(gateReq('/api/content'),authEnv)).status,401);
assert.equal(await passwordGate(gateReq('/'),{}),null,'Public pages need no login secrets');
assert.equal((await passwordGate(gateReq('/admin'),{})).status,503,'Admin fails closed with missing secrets');
assert.equal((await passwordGate(gateReq('/admin/preview'),authEnv)).headers.get('location'),'/entry/admin');
const login=(path,password,username='')=>gateReq(path,{method:'POST',headers:{origin:'https://club.example'},body:new URLSearchParams({password,username})});
assert.equal((await passwordGate(login('/entry','wrong'),authEnv)).headers.get('location'),'/');
assert.equal((await passwordGate(login('/entry/admin','test-guest','test-admin'),authEnv)).status,401,'Guest password cannot grant admin');
const guestCookie='__Host-pc_guest='+await makeSession('guest',authEnv);assert.equal((await passwordGate(gateReq('/entry'),authEnv)).headers.get('location'),'/');
assert.equal(await passwordGate(gateReq('/',{headers:{cookie:guestCookie}}),authEnv),null);
assert.equal((await passwordGate(gateReq('/admin',{headers:{cookie:guestCookie}}),authEnv)).status,303);
const adminLogin=await passwordGate(login('/entry/admin','test-admin-password','test-admin'),authEnv);const adminCookie=adminLogin.headers.get('set-cookie').split(';')[0];assert.equal(await passwordGate(gateReq('/admin',{headers:{cookie:adminCookie}}),authEnv),null);
assert.equal(await passwordGate(gateReq('/api/upload',{headers:{cookie:adminCookie}}),authEnv),null);
assert.equal(await hasSession(gateReq('/',{headers:{cookie:adminCookie+'tampered'}}),'admin',authEnv),false);
const expired=await makeSession('admin',authEnv,Date.now()-1000);assert.equal(await hasSession(gateReq('/',{headers:{cookie:'__Host-pc_admin='+expired}}),'admin',authEnv),false);
assert.equal(await hasSession(gateReq('/',{headers:{cookie:adminCookie}}),'admin',{...authEnv,ADMIN_PASSWORD:'changed'}),false,'Password change revokes sessions');
assert.equal((await passwordGate(gateReq('/entry/admin',{method:'POST',headers:{origin:'https://evil.example'},body:'password=x'}),authEnv)).status,403);
const limited={...authEnv,DB:{prepare(){return {bind(){return {async first(){return {attempts:21}}}}}}}};assert.equal((await passwordGate(login('/entry/admin','test-admin-password','test-admin'),limited)).status,429);
const logout=await passwordGate(gateReq('/entry/logout',{method:'POST',headers:{origin:'https://club.example',cookie:adminCookie}}),authEnv);assert.equal(logout.status,303);assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
console.log('PASS: public pages and media, admin/editor and API protection, secure signed cookies, expiry, revocation, CSRF, logout and durable attempt limits.');

const {listEvents,featuredEvents}=load('lib/events.ts');
const eventExamples=[
{id:'past',title:{lv:'Šautriņu vakars',en:'Darts night'},date:'2020-01-01'},
{id:'future',title:{lv:'Rodeo turnīrs',en:'Rodeo tournament'},date:'2099-02-01'},
{id:'first',title:{lv:'Biljarda vakars',en:'Pool night'},date:'2099-01-01'},
{id:'draft',title:{lv:'Neredzams',en:'Hidden'},date:'2099-01-01',published:false}
].map(e=>({...eventContent.events[0],published:true,...e}));
assert.deepEqual(Array.from(listEvents(eventExamples),e=>e.id),['past','first','future']);
assert.deepEqual(Array.from(listEvents(eventExamples,'','desc'),e=>e.id),['future','first','past']);
assert.deepEqual(Array.from(listEvents(eventExamples,'  SAUTRINU  '),e=>e.id),['past']);
assert.equal(listEvents(eventExamples,'DARTS')[0].id,'past');
assert.equal(listEvents(eventExamples,'no match').length,0);
assert.deepEqual(Array.from(featuredEvents(eventExamples,'2026-10-20'),e=>e.id),['first','future','past']);
const eventPage={...defaults,events:eventExamples};
for(const lang of ['lv','en']){
 const eventHtml=renderToStaticMarkup(React.createElement(Website,{content:eventPage,initialLang:lang,view:'news'}));
 for(const e of eventExamples.filter(e=>e.published))assert.ok(eventHtml.includes(e.title[lang]),'Every published event, including past dates, is visible');
 assert.ok(!eventHtml.includes(eventExamples[3].title[lang]));assert.ok(eventHtml.includes('type="search"'));assert.ok(eventHtml.includes('value="asc"'));assert.ok(eventHtml.includes('value="desc"'));
}
const publishedPast={...defaults,events:[eventExamples[0]]};
assert.equal((await route.PUT(req(publishedPast,row.updated_at))).status,200);
const reread=await load('lib/content.ts').readContent();assert.ok(renderToStaticMarkup(React.createElement(Website,{content:reread.content,initialLang:'lv',view:'home'})).includes('Šautriņu vakars'),'Saved past-date event renders on homepage');
console.log('PASS: published past/future events, hidden drafts, upcoming homepage priority, bilingual/accent-insensitive title search, both date orders and saved-event rendering.');

const {default:EventCard,EventDialog,eventDate}=load('app/event-card.tsx');
for(const lang of ['lv','en']){
 const detailEvent={...eventExamples[1],locationId:'xl',endDate:'2099-02-03',link:'https://example.com/event'};
 const cardMarkup=renderToStaticMarkup(React.createElement(EventCard,{e:detailEvent,content:defaults,lang}));
 assert.ok(cardMarkup.includes('aria-haspopup="dialog"'));assert.match(cardMarkup,/<a[^>]*class="event-card-open"[^>]*>[\s\S]*<img[\s\S]*<h3[\s\S]*<p/,'Image, title and description share the opening action');
 const dialogMarkup=renderToStaticMarkup(React.createElement(EventDialog,{e:detailEvent,content:defaults,lang,onClose:()=>{}}));
 for(const value of [detailEvent.image,detailEvent.title[lang],detailEvent.description[lang],detailEvent.link,defaults.locations[0].address])assert.ok(dialogMarkup.includes(value));
 assert.ok(dialogMarkup.includes('<dialog'));assert.ok(dialogMarkup.includes('aria-labelledby'));assert.ok(eventDate(detailEvent,lang).includes(' – '));assert.ok(dialogMarkup.includes(lang==='lv'?'Aizvērt pasākumu':'Close event'));
}
console.log('PASS: event image/title/description trigger, accessible dialog, full-size artwork, date range, location, description and external link in LV/EN.');

for(const path of ['/entry/admin']){const entry=await passwordGate(gateReq(path),authEnv);const csp=entry.headers.get('content-security-policy');assert.ok(csp.includes("frame-ancestors 'self' https://chatgpt.com;"),'Only own origin and ChatGPT can embed login');assert.ok(!csp.includes('frame-ancestors *'));assert.ok(csp.includes("form-action 'self'"));assert.equal(entry.headers.get('cache-control'),'private, no-store');}
for(const response of [adminLogin]){const cookies=response.headers.getSetCookie();assert.ok(cookies[0].includes('SameSite=None; Partitioned'));assert.ok(cookies[0].includes('HttpOnly; Secure;'));assert.ok(cookies[1].includes('Max-Age=0'),'Legacy session is removed');}
assert.equal(logout.headers.getSetCookie().length,4,'Logout clears partitioned and legacy sessions for both roles');
assert.ok(logout.headers.getSetCookie().some(c=>c.includes('Partitioned')));
console.log('PASS: ChatGPT frame allowlist, embedded partitioned cookies, retained CSRF protection and legacy-cookie cleanup.');

const {locationMenus,changeLocationMenus,menuMediaKey}=load('lib/menus.ts');
const menuDocs=[{id:'drinks-main',kind:'drinks',title:{lv:'Dzērieni',en:'Drinks'},url:'/assets/drinks.png'},{id:'drinks-special',kind:'drinks',title:{lv:'Kokteiļi',en:'Cocktails'},url:'/api/media/11111111-1111-4111-8111-111111111111.pdf'},{id:'food-main',kind:'food',title:{lv:'Picas',en:'Pizza'},url:'/assets/pizza.jpg'},{id:'food-extra',kind:'food',title:{lv:'Uzkodas',en:'Snacks'},url:'/assets/snacks.png'}];
assert.equal(locationMenus(defaults,defaults.locations[0])[0].url,defaults.drinksUrl,'Existing shared menu is retained');
assert.equal(locationMenus(defaults,{...defaults.locations[0],menuUrl:'/assets/xl-specific.pdf'})[0].url,'/assets/xl-specific.pdf');
let perClub=changeLocationMenus({...defaults,menuSchemaVersion:1},'xl',()=>menuDocs);
perClub=changeLocationMenus(perClub,'barona',()=>[{...menuDocs[0],id:'barona-drinks',url:'/assets/barona-drinks.jpg'}]);
assert.equal(contentSchema.safeParse(perClub).success,true);
assert.equal(locationMenus(perClub,perClub.locations[0]).length,4);
assert.equal(locationMenus(perClub,perClub.locations[1]).length,1);
assert.equal(locationMenus(defaults,{...defaults.locations[0],menus:[]}).length,0,'Removing every menu does not resurrect the old file');
const changedMenu=updateMedia(perClub,menuMediaKey('xl','food-main'),'/assets/new-pizza.png');assert.equal(changedMenu.locations[0].menus[2].url,'/assets/new-pizza.png');assert.equal(changedMenu.locations[1].menus[0].url,'/assets/barona-drinks.jpg');
for(const m of menuDocs)assert.ok(mediaSlots(perClub).some(s=>s.key===menuMediaKey('xl',m.id)&&s.kind==='menu'));
let invalidMenus=structuredClone(perClub);invalidMenus.locations[0].menus.push(invalidMenus.locations[0].menus[0]);assert.equal(contentSchema.safeParse(invalidMenus).success,false,'Duplicate menu IDs rejected');
invalidMenus=structuredClone(perClub);invalidMenus.locations[0].menus[0].url='javascript:alert(1)';assert.equal(contentSchema.safeParse(invalidMenus).success,false);
invalidMenus=structuredClone(perClub);invalidMenus.locations[0].menus[0].url='';assert.equal(contentSchema.safeParse(invalidMenus).success,false,'Empty menu rows must be completed or removed');
const {default:MenuGallery,MenuViewer}=load('app/menu-gallery.tsx');
for(const lang of ['lv','en']){
 const menuHtml=renderToStaticMarkup(React.createElement(MenuGallery,{content:perClub,lang}));for(const m of menuDocs)assert.ok(menuHtml.includes(m.title[lang]));assert.equal((menuHtml.match(/aria-haspopup="dialog"/g)||[]).length,5);assert.ok(menuHtml.includes('menu-xl'));assert.ok(menuHtml.includes('menu-barona'));
 const pdfHtml=renderToStaticMarkup(React.createElement(MenuViewer,{content:perClub,location:perClub.locations[0],initialId:'drinks-special',lang,onClose:()=>{}}));assert.ok(pdfHtml.includes('type="application/pdf"'));assert.ok(pdfHtml.includes('aria-labelledby'));assert.ok(pdfHtml.includes(menuDocs[2].title[lang]));assert.ok(!pdfHtml.includes('/assets/barona-drinks.jpg'),'Viewer only includes selected club');
 const foodHtml=renderToStaticMarkup(React.createElement(MenuViewer,{content:perClub,location:perClub.locations[0],initialId:'food-main',lang,onClose:()=>{}}));assert.ok(foodHtml.includes('src="/assets/pizza.jpg"'));
}
const manager=load('app/admin/panel.tsx').MenuManager;const managerHtml=renderToStaticMarkup(React.createElement(manager,{content:perClub,onChange:()=>{},onBusy:()=>{}}));assert.equal((managerHtml.match(/Pievienot dzērienkarti/g)||[]).length,2);assert.equal((managerHtml.match(/Pievienot ēdienkarti/g)||[]).length,2);assert.ok(managerHtml.includes('application/pdf,image/jpeg,image/png'));
assert.equal((await route.PUT(req(perClub,row.updated_at))).status,200);const savedClubMenus=await load('lib/content.ts').readContent();assert.equal(savedClubMenus.content.locations[0].menus.length,4);assert.equal(savedClubMenus.content.locations[1].menus.length,1);
console.log('PASS: multi-file food/drinks menus by club, legacy retention, independent editing, PDF/image viewers, admin add/reorder controls, validation and durable menu saves.');

const {LocationPrices}=load('app/admin/panel.tsx');const priceMarkup=renderToStaticMarkup(React.createElement(LocationPrices,{locations:defaults.locations,onChange:()=>{}}));
assert.equal((priceMarkup.match(/inputMode="decimal"/g)||[]).length,4,'Both existing clubs expose standard and student price fields');assert.ok(priceMarkup.includes('Players Club XL'));assert.ok(priceMarkup.includes('studentu biļetes cena'));
const newPrices={...defaults,locations:defaults.locations.map((l,i)=>({...l,price:i?'19.75':'27.50',studentPrice:i?'17.25':'24.50'}))};
assert.equal((await route.PUT(req(newPrices,row.updated_at))).status,200);const priceSaved=await load('lib/content.ts').readContent();
for(const lang of ['lv','en']){
 const homePrices=renderToStaticMarkup(React.createElement(Website,{content:priceSaved.content,initialLang:lang,view:'home'}));
 for(const l of priceSaved.content.locations){assert.ok(homePrices.includes(l.price+' €'));assert.ok(homePrices.includes(l.studentPrice+' €'));assert.ok(homePrices.includes(`data-edit-key="location:${l.id}:studentPrice"`));const detailPrices=renderToStaticMarkup(React.createElement(Website,{content:priceSaved.content,initialLang:lang,view:'location',locationId:l.id}));assert.ok(detailPrices.includes(l.price+' €'));assert.ok(detailPrices.includes(l.studentPrice+' €'));assert.ok(detailPrices.includes(`data-edit-key="location:${l.id}:price"`));assert.ok(detailPrices.includes(`data-edit-key="location:${l.id}:studentPrice"`));}
}
const noStudent={...newPrices,locations:newPrices.locations.map(l=>({...l,studentPrice:''}))};for(const view of ['home','location']){const markup=renderToStaticMarkup(React.createElement(Website,{content:noStudent,initialLang:'lv',view,locationId:'xl'}));assert.ok(!markup.includes('24.50 €'));assert.ok(!markup.includes('17.25 €'));}
assert.equal(newPrices.locations[0].vipDetails.lv,defaults.locations[0].vipDetails.lv,'Ticket price changes do not change VIP prices');
console.log('PASS: visible ticket fields for both existing clubs, durable standard/student price updates across LV/EN homepage and location pages, and optional student price.');

const ReviewLinks=load('app/review-links.tsx').default;const {reviewRatings}=load('lib/reviews.ts');
for(const lang of ['lv','en'])for(const l of defaults.locations){const reviews=renderToStaticMarkup(React.createElement(ReviewLinks,{location:l,content:defaults,lang}));assert.ok(reviews.includes(l.googleUrl.replaceAll('&','&amp;')));assert.ok(reviews.includes(l.tripadvisorUrl));assert.equal((reviews.match(/class="review-stars"/g)||[]).length,2);assert.ok(reviews.includes(lang==='lv'?'4,9':'4.9'));assert.ok(reviews.includes('width:98%'));assert.ok(reviews.includes('target="_blank"'));for(const view of ['home','location'])assert.ok(renderToStaticMarkup(React.createElement(Website,{content:defaults,initialLang:lang,view,locationId:l.id})).includes('rating-links'));}
const noRating={...defaults.locations[0],id:'future-venue',ratings:undefined};assert.equal(Object.keys(reviewRatings(noRating)).length,0,'New clubs do not inherit made-up ratings');
let reviewMarkup=renderToStaticMarkup(React.createElement(ReviewLinks,{location:noRating,content:defaults,lang:'en'}));assert.ok(!reviewMarkup.includes('review-stars'));assert.ok(reviewMarkup.includes(noRating.googleUrl));
const ratingUpdate={...defaults,locations:defaults.locations.map(l=>l.id==='xl'?{...l,ratings:{google:4.6,tripadvisor:4.8,checkedAt:'2026-10-20'}}:l)};assert.equal(contentSchema.safeParse(ratingUpdate).success,true);assert.equal((await route.PUT(req(ratingUpdate,row.updated_at))).status,200);const ratingSaved=await load('lib/content.ts').readContent();assert.equal(ratingSaved.content.locations[0].ratings.google,4.6);assert.equal(ratingSaved.content.locations[1].ratings.google,4.9);
for(const value of [-1,5.1,NaN])assert.equal(contentSchema.safeParse({...ratingUpdate,locations:[{...defaults.locations[0],ratings:{google:value}}]}).success,false);
reviewMarkup=renderToStaticMarkup(React.createElement(ReviewLinks,{location:{...defaults.locations[0],ratings:{google:null,tripadvisor:0}},content:defaults,lang:'en'}));assert.equal((reviewMarkup.match(/class="review-stars"/g)||[]).length,1);assert.ok(reviewMarkup.includes('0.0'));assert.ok(reviewMarkup.includes('width:0%'));
console.log('PASS: clickable fractional stars and provider URLs across all LV/EN club views, no fabricated new-club scores, rating persistence, validation and optional ratings.');

const vipPhotos=[{id:'vip-one',url:'/assets/vip-one.jpg',caption:{lv:'Mazā VIP istaba',en:'Small VIP room'}},{id:'vip-two',url:'/assets/vip-two.png',caption:{lv:'Lielā VIP istaba',en:'Large VIP room'}}];
const withVipPhotos={...defaults,locations:defaults.locations.map(l=>l.id==='xl'?{...l,vipGallery:vipPhotos}:l)};
assert.equal(contentSchema.safeParse(withVipPhotos).success,true);assert.ok(mediaSlots(withVipPhotos).some(s=>s.key==='vip:xl:vip-one'));
const swappedVip=updateMedia(withVipPhotos,'vip:xl:vip-one','/assets/replacement-vip.png');assert.equal(swappedVip.locations[0].vipGallery[0].url,'/assets/replacement-vip.png');assert.equal(swappedVip.locations[0].gallery[0].url,defaults.locations[0].gallery[0].url);
const {default:VipGallery,VipPhotoDialog}=load('app/vip-gallery.tsx');for(const lang of ['lv','en']){const vipMarkup=renderToStaticMarkup(React.createElement(Website,{content:withVipPhotos,initialLang:lang,view:'location',locationId:'xl'}));for(const p of vipPhotos){assert.ok(vipMarkup.includes(p.url));assert.ok(vipMarkup.includes(p.caption[lang]));}const dialogMarkup=renderToStaticMarkup(React.createElement(VipPhotoDialog,{location:withVipPhotos.locations[0],lang,index:1,onChange:()=>{},onClose:()=>{}}));assert.ok(dialogMarkup.includes('<dialog'));assert.ok(dialogMarkup.includes(vipPhotos[1].url));}
assert.equal(renderToStaticMarkup(React.createElement(VipGallery,{location:{...withVipPhotos.locations[0],vipEnabled:false},lang:'lv'})),'','VIP images stay private when VIP is disabled');
let badVip=structuredClone(withVipPhotos);badVip.locations[0].vipGallery[0].url='javascript:alert(1)';assert.equal(contentSchema.safeParse(badVip).success,false);badVip=structuredClone(withVipPhotos);badVip.locations[0].vipGallery.push(vipPhotos[0]);assert.equal(contentSchema.safeParse(badVip).success,false);
assert.equal((await route.PUT(req(withVipPhotos,row.updated_at))).status,200);assert.equal((await load('lib/content.ts').readContent()).content.locations[0].vipGallery.length,2);
const panelSource=fs.readFileSync('app/admin/panel.tsx','utf8');assert.ok(!panelSource.includes('<LocationPrices locations={content.locations}'));assert.ok(panelSource.includes('<LocationPrices locations={[l]}'));assert.ok(panelSource.includes('photos={l.vipGallery||[]}'));assert.ok(panelSource.includes("vip?'+ Pievienot VIP foto'"));
console.log('PASS: integrated per-location pricing, multiple VIP photos, independent Editing mode replacements, LV/EN public VIP gallery, disabled VIP privacy, validation and persistence.');

const {locationHeroPhoto,updateLocationGallery,removeGalleryPhoto,restoreGalleryPhoto}=load('lib/gallery.ts');
let coverClub={...defaults.locations[0],heroPhotoId:defaults.locations[0].gallery[2].id};const chosen=coverClub.gallery[2];
assert.equal(locationHeroPhoto(coverClub).id,chosen.id);assert.equal(locationHeroMediaKey(coverClub),`gallery:xl:${chosen.id}`);
coverClub=updateLocationGallery(coverClub,p=>[...p].reverse());assert.equal(locationHeroPhoto(coverClub).id,chosen.id,'Reordering does not change selected cover');
const beforeRemoval=coverClub.gallery,indexRemoved=beforeRemoval.findIndex(p=>p.id===chosen.id);
const removedCover=updateLocationGallery(coverClub,p=>removeGalleryPhoto(p,chosen.id));assert.ok(!removedCover.gallery.some(p=>p.id===chosen.id));assert.equal(locationHeroPhoto(removedCover).id,removedCover.gallery[0].id);
const restoredPhotos=restoreGalleryPhoto(removedCover.gallery,chosen,indexRemoved);assert.equal(restoredPhotos[indexRemoved].id,chosen.id);assert.equal(restoreGalleryPhoto(restoredPhotos,chosen,indexRemoved).length,restoredPhotos.length);
const emptyClub=updateLocationGallery(coverClub,()=>[]);assert.equal(locationHeroPhoto(emptyClub),undefined);assert.equal(locationHeroMediaKey(emptyClub),'location:xl:image');
const coverContent={...defaults,locations:defaults.locations.map(l=>l.id==='xl'?coverClub:l)};assert.equal((await route.PUT(req(coverContent,row.updated_at))).status,200);const coverSaved=await load('lib/content.ts').readContent();assert.equal(coverSaved.content.locations[0].heroPhotoId,chosen.id);
for(const lang of ['lv','en']){const coverHtml=renderToStaticMarkup(React.createElement(Website,{content:coverSaved.content,initialLang:lang,view:'location',locationId:'xl'}));assert.ok(coverHtml.includes(`data-media-key="gallery:xl:${chosen.id}"><img src="${chosen.url}"`),'Selected hero is rendered in each language');}
const GalleryFields=load('app/admin/panel.tsx').GalleryFields;const galleryControls=renderToStaticMarkup(React.createElement(GalleryFields,{photos:coverClub.gallery,clubName:coverClub.name,heroPhotoId:chosen.id,onHeroChange:()=>{},onChange:()=>{},onBusy:()=>{}}));assert.equal((galleryControls.match(/type="radio"/g)||[]).length,coverClub.gallery.length);assert.equal((galleryControls.match(/checked=""/g)||[]).length,1);
const galleryFn=fs.readFileSync('app/admin/panel.tsx','utf8').split('export function GalleryFields(')[1].split('export function MenuManager')[0];assert.ok(!galleryFn.includes('confirm('),'Photo removal does not depend on blocked browser dialogs');assert.ok(galleryFn.includes('Atjaunot foto'));
console.log('PASS: photo removal and undo, single cover selection, cover persistence through reorder/save, deleted-cover fallback and LV/EN hero rendering.');

const {uploadGalleryFiles}=load('lib/gallery-upload.ts');const bulkPhotos=[],bulkProgress=[];const bulkAbort=new AbortController();
const files=[new File(['jpeg'],'first.jpg',{type:'image/jpeg'}),new File(['bad'],'broken.png',{type:'image/png'}),new File(['png'],'last.png',{type:'image/png'})];let attempts=0;
const bulkResult=await uploadGalleryFiles(files,{signal:bulkAbort.signal,onUploaded:p=>bulkPhotos.push(p),onProgress:(done,total)=>bulkProgress.push([done,total]),transport:async(url,options)=>{assert.equal(options.body.get('kind'),'image');attempts++;return attempts===2?Response.json({error:'Bad image'},{status:400}):Response.json({url:'/api/media/'+attempts+'.jpg'})}});
assert.equal(bulkResult.added,2);assert.equal(bulkResult.errors.length,1);assert.ok(bulkResult.errors[0].includes('broken.png'));assert.equal(bulkPhotos[0].caption.lv,'');assert.equal(bulkPhotos[0].caption.en,'');assert.equal(bulkPhotos[1].url,'/api/media/3.jpg');assert.equal(bulkProgress.length,3);assert.equal(new Set(bulkPhotos.map(p=>p.id)).size,2);
const allDeleted=updateLocationGallery(defaults.locations[0],()=>[]);const deletedContent={...defaults,locations:defaults.locations.map(l=>l.id==='xl'?allDeleted:l)};assert.equal((await route.PUT(req(deletedContent,row.updated_at))).status,200);assert.equal((await load('lib/content.ts').readContent()).content.locations[0].gallery.length,0,'Deleted initial images do not return after save/reload');
const batchContent={...defaults,locations:defaults.locations.map(l=>l.id==='xl'?{...l,gallery:bulkPhotos}:l)};assert.equal(contentSchema.safeParse(batchContent).success,true,'Descriptions may remain blank');assert.equal((await route.PUT(req(batchContent,row.updated_at))).status,200);assert.equal((await load('lib/content.ts').readContent()).content.locations[0].gallery.length,2);
const bulkMarkup=renderToStaticMarkup(React.createElement(GalleryFields,{photos:coverClub.gallery,clubName:coverClub.name,heroPhotoId:chosen.id,onHeroChange:()=>{},onChange:()=>{},onBusy:()=>{}}));assert.ok(bulkMarkup.includes('multiple=""'));assert.equal((bulkMarkup.match(/class="gallery-photo-remove"/g)||[]).length,coverClub.gallery.length);assert.ok(bulkMarkup.indexOf('gallery-photo-remove')<bulkMarkup.indexOf('gallery-photo-edit'),'Removal is visible outside collapsed edit panel');assert.ok(bulkMarkup.includes('Apraksts un faila nomaiņa (nav obligāti)'));
console.log('PASS: multiple uploads with partial failure recovery, blank optional captions, visible per-image deletion, and deletion/bulk-gallery persistence after reload.');

const {defaultGames,getGames}=load('lib/games.ts');assert.equal(defaultGames.length,10);const legacyGames={...defaults,images:{...defaultImages,games:'/api/media/old-racing.jpg'}};delete legacyGames.games;assert.equal(getGames(legacyGames).find(g=>g.id==='racing').image,'/api/media/old-racing.jpg','Existing racing image is retained');
let editedGames={...defaults,games:defaultGames.map(g=>g.id==='darts'?{...g,title:{lv:'Manas šautriņas',en:'My darts'},description:{lv:'Mans īsais apraksts',en:'My short description'},image:'/assets/darts-new.png'}:g)};
assert.equal(contentSchema.safeParse(editedGames).success,true);assert.equal((await route.PUT(req(editedGames,row.updated_at))).status,200);const savedGames=await load('lib/content.ts').readContent();assert.equal(savedGames.content.games[0].description.lv,'Mans īsais apraksts');
for(const lang of ['lv','en']){const gameHtml=renderToStaticMarkup(React.createElement(Website,{content:savedGames.content,initialLang:lang,view:'home'}));for(const g of editedGames.games.slice(0,6))assert.ok(gameHtml.includes(g.title[lang]));assert.ok(gameHtml.includes(editedGames.games[0].description[lang]));assert.ok(gameHtml.includes('/assets/darts-new.png'));assert.ok(gameHtml.includes(lang==='lv'?'šīs un vēl daudz citas spēles':'these and many more games'));assert.ok(gameHtml.includes('data-edit-key="game:darts:description"'));}
assert.ok(mediaSlots(editedGames).some(s=>s.key==='game:darts:image'));assert.equal(updateMedia(editedGames,'game:darts:image','/assets/darts-replaced.jpg').games[0].image,'/assets/darts-replaced.jpg');
let badGames=structuredClone(editedGames);badGames.games.push(badGames.games[0]);assert.equal(contentSchema.safeParse(badGames).success,false);badGames=structuredClone(editedGames);badGames.games[0].image='javascript:alert(1)';assert.equal(contentSchema.safeParse(badGames).success,false);badGames=structuredClone(editedGames);badGames.games[0].title.en='';assert.equal(contentSchema.safeParse(badGames).success,false);
const hiddenGames={...editedGames,games:editedGames.games.map(g=>g.id==='darts'?{...g,published:false}:g)};assert.ok(!renderToStaticMarkup(React.createElement(Website,{content:hiddenGames,initialLang:'lv',view:'home'})).includes('Manas šautriņas'));
const gamesManager=load('app/admin/panel.tsx').GamesManager;const gamesAdminHtml=renderToStaticMarkup(React.createElement(gamesManager,{content:editedGames,onChange:()=>{},onBusy:()=>{}}));assert.ok(gamesAdminHtml.includes('Spēles bilde'));assert.ok(gamesAdminHtml.includes('Īss apraksts'));assert.ok(gamesAdminHtml.includes('Pievienot spēli'));
console.log('PASS: ten bilingual editable games, legacy photo retention, optional images, game image/text persistence, hidden drafts, editor markers and validation.');

// New catalog routes, semantic headings, availability and accessible text menus.
const {gamePath,gameSlug,gameLocations,specialGames}=load('lib/games.ts');
const {gameDetails}=load('lib/game-details.ts');
let catalog={...defaults,gamesSchemaVersion:1,menuSchemaVersion:1,games:[...defaultGames,...specialGames]};
assert.equal(gamePath(defaultGames[0]),'/speles/sautrinas');assert.equal(gamePath(defaultGames[0],'en'),'/en/games/sautrinas');
assert.equal(gamePath(specialGames[0]),'/speles/minigolfs');
assert.equal(gameLocations(specialGames[0],catalog)[0].id,'barona');assert.equal(gameLocations(specialGames[1],catalog)[0].id,'xl');
assert.equal(gameLocations({...defaultGames[0],locationIds:[]},catalog).length,0,'Unassigned availability is never guessed');
assert.ok(gameDetails(defaultGames[0]).lv.length>150);
for(const lang of ['lv','en']){
 let h=renderToStaticMarkup(React.createElement(Website,{content:catalog,initialLang:lang,view:'home'}));assert.equal((h.match(/<h1[ >]/g)||[]).length,1);assert.ok(h.includes('class="hero-slogan"'));assert.ok(h.includes(lang==='lv'?'Izklaides centrs Rīgā':'Entertainment centre in Riga'));assert.ok(h.includes(' </span>')||h.includes('</span> <br'));
 h=renderToStaticMarkup(React.createElement(Website,{content:catalog,initialLang:lang,view:'party'}));assert.equal((h.match(/<h1[ >]/g)||[]).length,1);assert.ok(h.includes(lang==='lv'?'Korporatīvie un privātie pasākumi':'Corporate &amp; private events'));
 h=renderToStaticMarkup(React.createElement(Website,{content:catalog,initialLang:lang,view:'games'}));assert.equal((h.match(/<h1[ >]/g)||[]).length,1);assert.ok(h.includes('aria-pressed="true"'));for(const g of catalog.games)assert.ok(h.includes(gamePath(g,lang)));
 for(const g of catalog.games){h=renderToStaticMarkup(React.createElement(Website,{content:catalog,initialLang:lang,view:'game',gameId:g.id}));assert.equal((h.match(/<h1[ >]/g)||[]).length,1);assert.ok(h.includes(g.title[lang]));assert.ok(h.includes(gamePath(catalog.games.find(x=>x.id!==g.id),lang)));assert.ok(h.includes('data-edit-key="game:'+g.id+':details"'));}
 h=renderToStaticMarkup(React.createElement(Website,{content:catalog,initialLang:lang,view:'location',locationId:'xl'}));assert.ok(h.includes(gamePath(specialGames[1],lang)));assert.ok(!h.includes(gamePath(specialGames[0],lang)),'Club catalog only includes selected games');
 for(const img of h.matchAll(/<img\s[^>]*>/g))assert.ok(/alt="[^"]+"/.test(img[0]),'Every public image has a nonempty description');
}
let duplicateSlug={...catalog,games:catalog.games.map(g=>g.id==='pool'?{...g,slug:gameSlug(defaultGames[0])}:g)};assert.equal(contentSchema.safeParse(duplicateSlug).success,false);
let unknownAvailability={...catalog,games:[{...defaultGames[0],locationIds:['missing']}]};assert.equal(contentSchema.safeParse(unknownAvailability).success,false);
const {hydrateMenu}=load('lib/menus.ts');const legacyAsset=hydrateMenu({id:'live-drinks',kind:'drinks',title:{lv:'Dzērieni',en:'Drinks'},url:'/api/media/61703107-3c28-49ec-8a0b-a502a529abec.png'});assert.equal(legacyAsset.sections.length,8);assert.ok(legacyAsset.sections.flatMap(s=>s.items).some(i=>i.name.lv==='Vanilla Beach'));assert.equal(hydrateMenu({...legacyAsset,sections:[]}).sections.length,0,'Removed text is not reintroduced');assert.equal(hydrateMenu({...legacyAsset,url:'/api/media/new-menu.png',sections:undefined}).sections,undefined,'New uploaded files never inherit obsolete prices');
const {MenuText}=load('app/menu-gallery.tsx');for(const lang of ['lv','en']){const h=renderToStaticMarkup(React.createElement(MenuText,{document:legacyAsset,lang}));assert.ok(h.includes('<h4>'));assert.ok(h.includes('Vanilla Beach'));assert.ok(h.includes('12,00 €'));assert.ok(h.includes('<li '));}
const textOnly={...catalog,locations:catalog.locations.map(l=>({...l,menus:[{...legacyAsset,url:''}]}))};assert.equal(contentSchema.safeParse(textOnly).success,true,'Structured menus work without image files');
assert.equal((await route.PUT(req(textOnly,row.updated_at))).status,200);let storedText=await load('lib/content.ts').readContent();assert.equal(storedText.content.locations[0].menus[0].sections.length,8);assert.equal(storedText.content.games.length,12);
const menuEditor=load('app/admin/menu-text-editor.tsx').default;const editorMarkup=renderToStaticMarkup(React.createElement(menuEditor,{document:legacyAsset,onChange:()=>{}}));assert.ok(editorMarkup.includes('Kategorijas virsraksts'));assert.ok(editorMarkup.includes('Cena (piemēram'));assert.ok(editorMarkup.includes('Pievienot pozīciju'));
console.log('PASS: bilingual catalog and all 24 game views, single H1 semantics, location availability, clean unique routes, related games, meaningful image alt, full legacy menu text, no stale-price hydration, text-only menu validation and durable CMS saves.');

for(const lang of ['lv','en']){const home=renderToStaticMarkup(React.createElement(Website,{content:catalog,initialLang:lang,view:'home'})),all=renderToStaticMarkup(React.createElement(Website,{content:catalog,initialLang:lang,view:'games'}));assert.equal((home.match(/class="game-showcase-card"/g)||[]).length,6);assert.equal((all.match(/class="game-showcase-card"/g)||[]).length,12);assert.ok(home.includes(lang==='lv'?'Apskatīt visas spēles':'Explore all games'));const nav=home.match(/<nav class="desktop-nav">(.*?)<\/nav>/s)[1];assert.ok(nav.includes(lang==='lv'?'href="/speles/"':'href="/en/games/"'));assert.ok(!nav.includes('#speles'));}
console.log('PASS: six homepage games, full catalog unchanged, and direct LV/EN header links to the games page.');
for(const lang of ['lv','en']){const home=renderToStaticMarkup(React.createElement(Website,{content:defaults,initialLang:lang,view:'home'}));const party=renderToStaticMarkup(React.createElement(Website,{content:defaults,initialLang:lang,view:'party'}));assert.ok(home.includes('class="footer-contact" href="'+(lang==='lv'?'/pasakumi':'/en/events')+'#pieprasijums"'));assert.ok(!home.includes('class="footer-contact" href="mailto:'));assert.ok(party.includes('id="pieprasijums"'));assert.ok(party.includes(lang==='lv'?'Nokopēt e-pastu':'Copy email address'));assert.ok(party.includes('class="footer-contact" href="#pieprasijums"'));}
console.log('PASS: footer contact opens on-site contact details in LV/EN, contact anchor exists, and selectable email/copy fallback is available.');
