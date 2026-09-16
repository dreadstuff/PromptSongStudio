import type { Song, Track } from './song';
import { validatePattern } from './song';
import { localPlan, validatePlan, type MusicalPlan, type SectionRole } from './plan';

export type ScoreBar={role:SectionRole;patterns:Song['patterns'];chord:number;inversion:number;expression:number};
export type Arrangement={version:1;plan:MusicalPlan;bars:ScoreBar[]};
export function validateArrangement(raw:unknown,total:number):Arrangement{
  const a=raw as Arrangement;
  if(!a||a.version!==1)throw new Error('Unsupported score arrangement.');
  const plan=validatePlan(a.plan),roles=plan.sections.flatMap(s=>Array(s.bars).fill(s.role));
  if(!Array.isArray(a.bars)||a.bars.length!==total||roles.length!==total)throw new Error('Score length does not match its sections.');
  const bars=a.bars.map((b,i)=>{
    if(!b||b.role!==roles[i]||!Number.isInteger(b.chord)||b.chord<0||b.chord>6||!Number.isInteger(b.inversion)||b.inversion<0||b.inversion>2||!Number.isFinite(b.expression)||b.expression<.1||b.expression>1)throw new Error('Invalid score bar.');
    return {role:b.role,patterns:validatePattern(b.patterns),chord:b.chord,inversion:b.inversion,expression:b.expression};
  });return {version:1,plan,bars};
}
/** Transform a phrase into an arc. The base phrase remains available for loop mode. */
export function buildScore(source:Song,total:16|32=16,requestedPlan?:unknown):Song{
  const s=structuredClone(source),plan=requestedPlan?validatePlan(requestedPlan):localPlan(total,s.energy);
  total=plan.sections.reduce<number>((n,p)=>n+p.bars,0) as 16|32;
  const phrases=[s.patterns,...(s.variations||[])],bars:ScoreBar[]=[];
  const available=(t:Track)=>phrases.some(p=>p[t].some(v=>t==='lead'||t==='bass'?v>=0:v>0));
  let previousVoicing:number[]=[];
  for(const section of plan.sections){
    for(let local=0;local<section.bars;local++){
      const absolute=bars.length,role=section.role,p=structuredClone(phrases[local%phrases.length]);
      const melody=p.lead.map((v,i)=>({v,i})).filter(n=>n.v>=0);
      // Quote the motif in the intro, answer it during the theme, sequence it in the build.
      if(role==='Intro'){
        for(const t of ['kick','snare','hat','bass'] as const)p[t].fill(t==='bass'?-1:0);
        p.lead.fill(-1);melody.slice(0,2).forEach(n=>p.lead[n.i]=n.v);
      }else if(role==='Theme'&&local%2===1){
        if(melody.length){const last=melody[melody.length-1];p.lead[last.i]=0;}
        p.hat=p.hat.map((v,i)=>i%4===2?v:0);
      }else if(role==='Build'){
        p.lead=p.lead.map((v,i)=>v<0?v:i>=8?Math.min(13,v+2):v);
        if(available('hat')&&s.direction!=='Atmospheric')for(const i of [6,14])p.hat[i]=Math.max(p.hat[i],.2+.2*local/section.bars);
      }else if(role==='Peak'){
        // A higher register and an answering phrase create a return with more intensity.
        p.lead=p.lead.map((v,i)=>v<0?v:i>=8?Math.min(13,v+7):v);
        if(available('snare')&&local===section.bars-1&&s.direction!=='Atmospheric')for(const i of [13,14,15])p.snare[i]=.2+(i-13)*.12;
      }else if(role==='Release'){
        for(const t of ['kick','snare','hat'] as const)p[t].fill(0);
        p.bass=p.bass.map((v,i)=>i===0?v:-1);p.lead.fill(-1);
        if(melody.length)p.lead[0]=local===section.bars-1?0:melody[0].v;
      }
      const expression=role==='Build'?.55+.35*(local+1)/section.bars:role==='Release'?.45-.2*local/section.bars:role==='Intro'?.45:role==='Peak'?1:.75;
      const density=section.density;
      // Apply density to supporting percussion; mute/exclusion intents cannot reappear.
      if(density<.5)p.hat=p.hat.map((v,i)=>i%8===0?v:0);
      const chord=role==='Intro'?s.chords[0]:role==='Release'&&local===section.bars-1?0:s.chords[local%4];
      // Choose the closest triad inversion in scale degrees to reduce chord jumps.
      const candidates=[[chord,chord+2,chord+4],[chord+2,chord+4,chord+7],[chord+4,chord+7,chord+9]];
      const distances=candidates.map(v=>previousVoicing.length?v.reduce((n,d,i)=>n+Math.abs(d-previousVoicing[i]),0):0);
      const inversion=distances.indexOf(Math.min(...distances));previousVoicing=candidates[inversion];
      bars.push({role,patterns:p,chord,inversion,expression:Math.max(.1,expression)});
    }
  }
  s.bars=total;s.arrangement={version:1,plan,bars};return s;
}
export function withoutScore(source:Song,bars=8):Song{const s=structuredClone(source);delete s.arrangement;s.bars=bars;return s;}
