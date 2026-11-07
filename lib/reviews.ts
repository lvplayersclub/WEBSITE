import type {Location,ReviewRatings} from './types';
// Snapshot checked 2026-10-20. These values are editable, not live API data.
// Tripadvisor: each club's tripadvisorUrl. Google ratings cross-checked at
// https://swingsgolf.lv/en/things-to-do-in-riga (Barona also at Wanderlog).
export const initialRatings:Record<string,ReviewRatings>={xl:{google:4.9,tripadvisor:4.9,checkedAt:'2026-10-20'},barona:{google:4.9,tripadvisor:4.9,checkedAt:'2026-10-20'}};
export function reviewRatings(l:Location){return l.ratings??initialRatings[l.id]??{}}
