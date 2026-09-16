/** Bounded composition contract shared by the local planner and future server planners. */
export const SECTION_ROLES=['Intro','Theme','Build','Peak','Release'] as const;
export const FULL_SONG_ROLES=['Intro','Theme','Variation','Build','Peak','Breakdown','Return','Release'] as const;
export type SectionRole=typeof FULL_SONG_ROLES[number];
type Section={role:SectionRole;bars:number;density:number};
export type MusicalPlan={version:1;sections:Section[]}|{version:2;targetSeconds:number;sections:Section[]};
export function validatePlan(raw:unknown):MusicalPlan{
  if(!raw||typeof raw!=='object')throw new Error('Missing musical plan.');
  const p=raw as MusicalPlan;
  if(p.version!==1&&p.version!==2)throw new Error('Unsupported musical plan.');
  const roles=p.version===1?SECTION_ROLES:FULL_SONG_ROLES;
  if(!Array.isArray(p.sections)||p.sections.length!==roles.length)throw new Error('Invalid score sections.');
  if(p.version===2&&(!Number.isInteger(p.targetSeconds)||p.targetSeconds<120||p.targetSeconds>300))throw new Error('Choose a duration between 120 and 300 seconds.');
  const sections=p.sections.map((s,i)=>{
    if(!s||s.role!==roles[i]||!Number.isInteger(s.bars)||s.bars<1||s.bars>(p.version===1?16:64)||(p.version===2&&s.bars%2!==0)||typeof s.density!=='number'||!Number.isFinite(s.density)||s.density<.1||s.density>1)throw new Error('Invalid score section.');
    return {role:s.role,bars:s.bars,density:s.density};
  });
  const total=sections.reduce((n,s)=>n+s.bars,0);
  if(p.version===1?![16,32].includes(total):total<16||total>226)throw new Error('Invalid score length.');
  return p.version===1?{version:1,sections}:{version:2,targetSeconds:p.targetSeconds,sections};
}
/** Round up to a two-bar phrase so the requested duration is never cut short. */
export function fullSongBars(bpm:number,seconds:number){
  if(!Number.isFinite(bpm)||bpm<55||bpm>180||!Number.isInteger(seconds)||seconds<120||seconds>300)throw new Error('Choose a duration between 120 and 300 seconds.');
  return Math.ceil(seconds*bpm/480)*2;
}
export function fullSongPlan(bpm:number,seconds:number):MusicalPlan{
  const units=fullSongBars(bpm,seconds)/2,weights=[1,3,2,2,3,2,3,1],sum=weights.reduce((a,b)=>a+b,0);
  const shares=weights.map(w=>(units-8)*w/sum),counts=shares.map(n=>1+Math.floor(n));
  const order=shares.map((n,i)=>({i,remainder:n%1})).sort((a,b)=>b.remainder-a.remainder);
  for(let i=0,left=units-counts.reduce((a,b)=>a+b,0);i<left;i++)counts[order[i].i]++;
  return validatePlan({version:2,targetSeconds:seconds,sections:FULL_SONG_ROLES.map((role,i)=>({role,bars:counts[i]*2,density:[.25,.7,.65,.8,1,.3,.95,.2][i]}))});
}
export function localPlan(bars:16|32=16,energy=.65):MusicalPlan{
  const factor=bars/16;
  return validatePlan({version:1,sections:SECTION_ROLES.map((role,i)=>({role,bars:[2,4,4,4,2][i]*factor,density:Math.min(1,[.25,.65,.78,1,.28][i]*(.7+energy*.3))}))});
}
