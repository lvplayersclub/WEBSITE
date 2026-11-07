export const fontOptions=[
 {id:'barlow',label:'Barlow Condensed',stack:"'Barlow Condensed',Impact,'Arial Narrow',sans-serif"},
 {id:'dm-sans',label:'DM Sans',stack:"'DM Sans',Arial,sans-serif"},
 {id:'oswald',label:'Oswald',stack:"'Oswald',Impact,sans-serif"},
 {id:'montserrat',label:'Montserrat',stack:"'Montserrat',Arial,sans-serif"},
 {id:'manrope',label:'Manrope',stack:"'Manrope',Arial,sans-serif"},
 {id:'system',label:'Arial / sistēmas fonts',stack:'Arial,Helvetica,sans-serif'},
 {id:'georgia',label:'Georgia',stack:'Georgia,serif'},
] as const;
export type FontId=typeof fontOptions[number]['id'];
export type Sizes={hero:number;section:number;subheading:number;body:number;button:number;navigation:number};
export type Design={headingFont:FontId;bodyFont:FontId;background:string;accent:string;text:string;muted:string;desktop:Sizes;mobile:Sizes;sectionSpace:number;sectionSpaceMobile:number;lineHeight:number};
export const defaultDesign:Design={headingFont:'barlow',bodyFont:'dm-sans',background:'#0b0c0a',accent:'#ffe533',text:'#f6f4e9',muted:'#aaa99e',desktop:{hero:150,section:76,subheading:36,body:13,button:12,navigation:11},mobile:{hero:74,section:50,subheading:30,body:12,button:11,navigation:11},sectionSpace:95,sectionSpaceMobile:58,lineHeight:1.8};
export function designVariables(design?:Design){const d=design||defaultDesign;const v:Record<string,string>={'--black':d.background,'--yellow':d.accent,'--cream':d.text,'--muted':d.muted,'--display':fontOptions.find(f=>f.id===d.headingFont)?.stack||fontOptions[0].stack,'--body':fontOptions.find(f=>f.id===d.bodyFont)?.stack||fontOptions[1].stack,'--section-space':d.sectionSpace+'px','--section-space-mobile':d.sectionSpaceMobile+'px','--body-leading':String(d.lineHeight)};for(const group of ['desktop','mobile'] as const)for(const [key,value] of Object.entries(d[group]))v[`--${key}-${group}`]=value+'px';return v}
