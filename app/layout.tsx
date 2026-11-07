import {headers} from 'next/headers';
import type {Metadata} from 'next';
import './globals.css';
import './design-styles.css';
export const metadata:Metadata={title:'Players Club — Level up your fun',description:'Spēles, minigolfs, rodeo bullis un bārs divās lokācijās Rīgā. Games, mini golf, a rodeo bull and great nights in Riga.',icons:{icon:'/assets/playersclub-logo.png'}};
export default async function RootLayout({children}:{children:React.ReactNode}){const lang=(await headers()).get('x-players-language')==='en'?'en':'lv';return <html lang={lang}><body>{children}</body></html>}
