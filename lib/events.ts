import type {Event} from './types';
export type EventOrder='asc'|'desc';
function normalized(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim()}
export function listEvents(events:Event[],query='',order:EventOrder='asc'){
 const term=normalized(query);
 return events.filter(e=>e.published&&(!term||normalized(e.title.lv).includes(term)||normalized(e.title.en).includes(term))).sort((a,b)=>{
  const byDate=a.date.localeCompare(b.date);return (order==='desc'?-byDate:byDate)||a.id.localeCompare(b.id);
 });
}
export function featuredEvents(events:Event[],today:string){const published=listEvents(events);return [...published.filter(e=>(e.endDate||e.date)>=today),...published.filter(e=>(e.endDate||e.date)<today).reverse()].slice(0,3)}
