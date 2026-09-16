import type { Song, Track } from './song';
import type { Interpretation } from './interpret';

// Scene decisions affect the notes that are rendered, not just a label or title.
// Explicit genre selections retain their own characteristic rhythm palette.
export function applyScene(s:Song,plan:Interpretation,random:()=>number):Song {
  if(plan.genreSource!=='scene'||plan.scene==='neutral')return s;
  const phrases=[s.patterns,...(s.variations??[]),...(s.arrangement?.bars.map(b=>b.patterns)||[])];
  const fill=(positions:number[],value:number,empty=0)=>Array.from({length:16},(_,i)=>positions.includes(i)?value:empty);
  if(plan.scene==='battle'){
    const drive=.55+plan.energy*.45;
    const kick=plan.energy<.45?[0,8]:random()>.5?[0,3,6,8,10,14]:[0,2,6,8,11,14];
    const bassNotes=plan.mood==='Upbeat'?[0,0,4,0,0,7,4,2]:[0,0,0,4,0,0,2,0];
    phrases.forEach((p,bar)=>{
      p.kick=fill(kick,.92*drive);p.snare=fill([4,12],.85*drive);
      p.hat=Array.from({length:16},(_,i)=>plan.energy<.45?(i%4===2?.22:0):i%2===0?.42:plan.energy>.8?.24:0);
      p.bass=Array.from({length:16},(_,i)=>i%2===0?bassNotes[(i/2+bar%2)%8]:-1);
      const motif=plan.mood==='Upbeat'?[0,2,4,7,4,2,6,4]:[0,0,2,4,2,0,6,4];
      p.lead=Array.from({length:16},(_,i)=>i%(plan.energy<.45?4:2)===0?motif[(i/2+(bar===2?2:0))%8]:-1);
      p.pad=fill([0,8],.78);
      if(bar===0){p.lead[0]=-1;p.lead[2]=-1;} // Entrance pickup before the motif.
      if(bar===3){p.snare[14]=.5;p.snare[15]=.65;p.lead[14]=0;}
    });
    s.chords=plan.mood==='Upbeat'?[0,3,5,4]:[0,5,3,6];
    s.sound={...s.sound,bass:'acid',lead:'supersaw',pad:'warm',kit:'breakbeat',reverb:.16,delay:.12};
    s.mix={...s.mix,kick:.9*drive,snare:.65*drive,bass:.72*drive,lead:.4*drive,pad:.32};
    s.performance={...s.performance!,bassGate:.65,leadGate:.8,padGate:.48};

  }else if(plan.scene==='chase'){
    s.sound={...s.sound,bass:'acid',kit:'breakbeat',reverb:.1,delay:.14};
    phrases.forEach((p,bar)=>{if(bar===3){p.snare[14]=.34;p.snare[15]=.48;}});

  }else if(plan.scene==='suspense'){
    // Widely spaced low pulses leave room for tension rather than a dance groove.
    phrases.forEach((p,bar)=>{
      p.kick=fill([0,2],.4);p.snare.fill(0);p.hat.fill(0);
      p.bass=fill([0],0,-1);p.lead=fill(bar%2===0?[6]:[12],bar%2===0?1:6,-1);
    });
    s.mix={...s.mix,kick:.48,bass:.48,lead:.25,pad:.5};s.sound={...s.sound,lead:'sine',bass:'sub',kit:'soft',delay:.25};
    s.performance={...s.performance!,leadOctave:3};
  }else if(plan.scene==='exploration'){
    phrases.forEach(p=>{p.kick=fill([0,8],.64);p.hat=p.hat.map((v,i)=>i%4===2?v:0);});
    s.sound={...s.sound,lead:'bell',bass:'round',kit:'soft',reverb:.35};
  }else if(plan.scene==='victory'){
    s.chords=[0,3,4,0];s.sound={...s.sound,lead:'supersaw',pad:'warm',reverb:.24};

  }else if(plan.scene==='rest'||plan.scene==='romance'||plan.scene==='sadness'){

    s.sound={...s.sound,kit:'soft',reverb:plan.scene==='sadness'?.45:.26};
  }
  return s;
}

export function applyExclusions(s:Song):Song {
  const phrases=[s.patterns,...(s.variations??[]),...(s.arrangement?.bars.map(b=>b.patterns)||[])];
  const prompt=s.prompt.toLowerCase();
  for(const p of phrases){
    if(/\b(?:no|without) (?:any )?(?:drums|percussion)\b/.test(prompt))for(const t of ['kick','snare','hat'] as Track[])p[t].fill(0);
    if(/\b(?:no|without) (?:any )?(?:melody|lead)\b/.test(prompt))p.lead.fill(-1);
    if(/\b(?:no|without) (?:any )?bass\b/.test(prompt))p.bass.fill(-1);
  }
  return s;
}
