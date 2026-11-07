import type {GalleryPhoto} from './types';
export async function uploadGalleryFiles(files:File[],options:{signal:AbortSignal;onUploaded:(photo:GalleryPhoto)=>void;onProgress:(done:number,total:number)=>void;transport?:typeof fetch}){
 const errors:string[]=[];let added=0;
 for(let i=0;i<files.length;i++){
  if(options.signal.aborted)break;const file=files[i];
  try{
   if(!file.size||file.size>75*1024*1024)throw Error('Izvēlies failu līdz 75 MB.');
   const body=new FormData();body.set('file',file);body.set('kind','image');
   const response=await (options.transport||fetch)('/api/upload',{method:'POST',body,signal:options.signal});
   const data=await response.json().catch(()=>({error:'Augšupielāde neizdevās. Pārbaudi pieslēgšanos.'})) as {url?:string;error?:string};
   if(!response.ok||!data.url)throw Error(data.error||'Neizdevās augšupielādēt.');
   if(options.signal.aborted)break;
   options.onUploaded({id:crypto.randomUUID(),url:data.url,caption:{lv:'',en:''}});added++;
  }catch(error){if(options.signal.aborted)break;errors.push(file.name+': '+(error instanceof Error?error.message:'Augšupielāde neizdevās.'))}
  options.onProgress(i+1,files.length);
 }
 return {added,errors};
}
