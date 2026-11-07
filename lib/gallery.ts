import type {Location,GalleryPhoto} from './types';
export function locationHeroPhoto(l:Location){return l.gallery?.find(p=>p.id===l.heroPhotoId&&p.url)||l.gallery?.find(p=>p.url)}
export function updateLocationGallery(l:Location,change:(photos:GalleryPhoto[])=>GalleryPhoto[]):Location{const gallery=change(l.gallery||[]);return {...l,gallery,heroPhotoId:l.heroPhotoId&&gallery.some(p=>p.id===l.heroPhotoId&&p.url)?l.heroPhotoId:gallery.find(p=>p.url)?.id}}
export function removeGalleryPhoto(photos:GalleryPhoto[],id:string){return photos.filter(p=>p.id!==id)}
export function restoreGalleryPhoto(photos:GalleryPhoto[],photo:GalleryPhoto,index:number){if(photos.some(p=>p.id===photo.id))return photos;const restored=[...photos];restored.splice(Math.min(index,restored.length),0,photo);return restored}
