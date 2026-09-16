/** Bounded composition contract shared by the local planner and future server planners. */
export const SECTION_ROLES=['Intro','Theme','Build','Peak','Release'] as const;
export type SectionRole=typeof SECTION_ROLES[number];
export type MusicalPlan={version:1;sections:{role:SectionRole;bars:number;density:number}[]};
export function validatePlan(raw:unknown):MusicalPlan{
  if(!raw||typeof raw!=='object')throw new Error('Missing musical plan.');
  const p=raw as MusicalPlan;
  if(p.version!==1||!Array.isArray(p.sections)||p.sections.length!==5)throw new Error('A score needs five sections.');
  const sections=p.sections.map((s,i)=>{
    if(!s||s.role!==SECTION_ROLES[i]||!Number.isInteger(s.bars)||s.bars<1||s.bars>16||typeof s.density!=='number'||!Number.isFinite(s.density)||s.density<.1||s.density>1)throw new Error('Invalid score section.');
    return {role:s.role,bars:s.bars,density:s.density};
  });
  if(![16,32].includes(sections.reduce((n,s)=>n+s.bars,0)))throw new Error('A score must contain 16 or 32 bars.');
  return {version:1,sections};
}
export function localPlan(bars:16|32=16,energy=.65):MusicalPlan{
  const factor=bars/16;
  return validatePlan({version:1,sections:SECTION_ROLES.map((role,i)=>({role,bars:[2,4,4,4,2][i]*factor,density:Math.min(1,[.25,.65,.78,1,.28][i]*(.7+energy*.3))}))});
}
