import { validateSong, type Song } from './song';
export const RECENT_KEY='pss:recent:v1';
export type RecentBatch={id:string;createdAt:number;label:string;takes:Song[]};
export function readRecent(raw:string|null):{batches:RecentBatch[];activeId:string}{
  try{
    const data=JSON.parse(raw||'null');if(data?.version!==1||!Array.isArray(data.batches))return {batches:[],activeId:''};
    const batches:RecentBatch[]=data.batches.slice(0,12).flatMap((b:RecentBatch)=>{
      if(!b||typeof b.id!=='string'||!Array.isArray(b.takes)||!Number.isFinite(b.createdAt))return [];
      const takes=b.takes.slice(0,6).flatMap(t=>{try{return [validateSong(t)];}catch{return [];}});
      return takes.length?[{id:b.id.slice(0,100),createdAt:b.createdAt,label:typeof b.label==='string'?b.label.slice(0,160):'Recent generation',takes}]:[];
    });return {batches,activeId:batches.some(b=>b.id===data.activeId)?data.activeId:''};
  }catch{return {batches:[],activeId:''};}
}
export function upsertRecent(batches:RecentBatch[],batch:RecentBatch){return [batch,...batches.filter(b=>b.id!==batch.id)].slice(0,12);}
