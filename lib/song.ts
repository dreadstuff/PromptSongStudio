import { interpretPrompt, positiveDescription, type Interpretation } from './interpret';
import { applyScene, applyExclusions } from './scene';
import { composePhrases } from './composer';
import { generateTitle } from './title';
export const TRACKS = ['kick','snare','hat','bass','lead','pad'] as const;
export type Track = typeof TRACKS[number];
export const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const SCALES = { minor:[0,2,3,5,7,8,10], major:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10] };
export const GENRES = ['Synthwave','House','Lo-fi','Ambient','Drum & bass','Chiptune','Trance','Hip-hop'] as const;
export type Genre = typeof GENRES[number];
export const DIRECTIONS=['Melody-led','Rhythm-led','Atmospheric','Balanced','Pulse'] as const;
export type Direction=typeof DIRECTIONS[number];
export type Song = { direction?:Direction; version:1; id:string; title:string; prompt:string; seed:number; genre:Genre; bpm:number; root:number; scale:keyof typeof SCALES; bars:number; swing:number; energy:number; chords:number[]; patterns:Record<Track,number[]>; mix:Record<Track,number>; muted:Record<Track,boolean>; sound:{bass:'round'|'acid'|'sub';lead:'pluck'|'bell'|'square'|'keys'|'sine'|'supersaw';pad:'warm'|'glass'|'keys';kit?:'tight'|'soft'|'retro'|'breakbeat'|'808';reverb:number;delay:number};composerVersion?:2;variations?:Record<Track,number[]>[];performance?:{bassGate:number;leadGate:number;padGate:number;leadOctave:number;humanize:number};interpretation?:{version:1;scene:Interpretation['scene'];mood:string;genreSource?:Interpretation['genreSource']} };
export const EXAMPLES = [
  {title:'Into the boss room',genre:'Story prompt',prompt:'Dungeon Crawler Carl enters into a boss fight with upbeat and fast music.',color:'#c6a0ff'},
  {title:'Main character energy',genre:'House',prompt:'Uplifting house at 128 BPM in F major. Four-on-the-floor drums, an acid bass, bright plucks, and big weekend energy.',color:'#dafa7b'},
  {title:'Rain on the window',genre:'Lo-fi',prompt:'Mellow lo-fi at 78 BPM in D minor. Soft drums, a round bass, warm chords, and a delicate bell melody with swing.',color:'#7dcbc6'},
  {title:'Save point',genre:'Chiptune',prompt:'Playful chiptune at 140 BPM in C major. Bouncy square-wave arpeggios and a retro game adventure feeling.',color:'#f5ad7d'},
];
export function hash(text:string){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function rng(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const bounded=(v:unknown,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function validatePattern(raw:unknown):Song['patterns']{
  if(!raw||typeof raw!=='object')throw new Error('Missing instrument patterns.');
  const source=raw as Song['patterns'],result={} as Song['patterns'];
  for(const t of TRACKS){const p=source[t];if(!Array.isArray(p)||p.length!==16||p.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw new Error(`${t} must have 16 numeric steps.`);result[t]=p.map(v=>t==='bass'||t==='lead'?Math.round(bounded(v,-1,13,-1)):bounded(v,0,1,0));}
  return result;
}
export function patternForBar(s:Song,bar:number):Song['patterns']{const i=((Math.floor(bar)%4)+4)%4;return s.composerVersion===2&&i>0?s.variations![i-1]:s.patterns;}
export function editPatternStep(s:Song,bar:number,track:Track,step:number,value:number):Song{
  if(!Number.isInteger(bar)||bar<0||bar>3||!Number.isInteger(step)||step<0||step>15)throw new Error('Invalid pattern position.');
  const copy=structuredClone(s),pattern=patternForBar(copy,bar);pattern[track][step]=value;return validateSong(copy);
}
export function noteBeats(s:Song,track:'bass'|'lead'|'pad',step:number,bar:number){
  if(!s.performance)return track==='bass'?.46:track==='pad'?3.95:s.sound.lead==='bell'?1.2:.65;
  const p=patternForBar(s,bar)[track];let next=step+1;
  while(next<16&&(track==='pad'?p[next]<=0:p[next]<0))next++;
  const gate=s.performance[`${track}Gate`];return Math.max(.08,(next-step)/4*gate);
}
export function noteDelay(s:Song,absoluteStep:number,track:Track){
  return s.performance?hash(`${s.seed}:${absoluteStep}:${track}`)/4294967296*Math.min(s.performance.humanize,60/s.bpm/4*.15):0;
}
export function validateSong(raw:unknown):Song {
  if(!raw||typeof raw!=='object')throw new Error('This file does not contain a song.');
  const s=raw as Song;
  if(s.version!==1||!s.patterns||!Array.isArray(s.chords)||s.chords.length!==4)throw new Error('Please import a Prompt Song Studio v1 JSON file.');
  const patterns=validatePattern(s.patterns);
  if(s.composerVersion!==undefined&&s.composerVersion!==2)throw new Error('Unsupported composer version.');
  if(s.composerVersion===2&&(!Array.isArray(s.variations)||s.variations.length!==3))throw new Error('This song needs three variation bars.');
  const extended:Partial<Song>=s.composerVersion===2?{composerVersion:2,variations:s.variations!.map(validatePattern),performance:{bassGate:bounded(s.performance?.bassGate,.1,1.4,.7),leadGate:bounded(s.performance?.leadGate,.1,1.5,.7),padGate:bounded(s.performance?.padGate,.1,1,.9),leadOctave:Math.round(bounded(s.performance?.leadOctave,3,5,4)),humanize:bounded(s.performance?.humanize,0,.02,0)}}:{};
  const mix={} as Song['mix'], muted={} as Song['muted'];
  for(const t of TRACKS){mix[t]=bounded(s.mix?.[t],0,1,.65);muted[t]=s.muted?.[t]===true;}
  return {...extended,...(DIRECTIONS.includes(s.direction as Direction)?{direction:s.direction}:{}),...(s.interpretation?.version===1?{interpretation:{version:1 as const,scene:['battle','chase','suspense','exploration','victory','rest','romance','sadness','neutral'].includes(s.interpretation.scene)?s.interpretation.scene:'neutral' as const,mood:typeof s.interpretation.mood==='string'?s.interpretation.mood.slice(0,40):'Balanced',...(s.interpretation.genreSource&&['manual','prompt','scene','fallback'].includes(s.interpretation.genreSource)?{genreSource:s.interpretation.genreSource}:{})}}:{}),version:1,id:typeof s.id==='string'?s.id.slice(0,80):`import-${hash(JSON.stringify(patterns))}`,title:typeof s.title==='string'?s.title.slice(0,80):'Untitled loop',prompt:typeof s.prompt==='string'?s.prompt.slice(0,2000):'',seed:bounded(s.seed,0,4294967295,1)>>>0,genre:GENRES.includes(s.genre)?s.genre:'Synthwave',bpm:Math.round(bounded(s.bpm,55,180,108)),root:Math.round(bounded(s.root,0,11,9)),scale:Object.hasOwn(SCALES,s.scale)?s.scale:'minor',bars:[4,8,16].includes(s.bars)?s.bars:8,swing:bounded(s.swing,0,.3,0),energy:bounded(s.energy,0,1,.65),chords:s.chords.map(v=>Math.round(bounded(v,0,6,0))),patterns,mix,muted,sound:{bass:['round','acid','sub'].includes(s.sound?.bass)?s.sound.bass:'round',lead:['pluck','bell','square','keys','sine','supersaw'].includes(s.sound?.lead)?s.sound.lead:'pluck',pad:['glass','keys'].includes(s.sound?.pad)?s.sound.pad:'warm',...(s.sound?.kit?{kit:['tight','soft','retro','breakbeat','808'].includes(s.sound.kit)?s.sound.kit:'tight' as const}:{}),reverb:bounded(s.sound?.reverb,0,.6,.2),delay:bounded(s.sound?.delay,0,.5,.2)}};
}
export function compose(prompt:string,options:{genre?:string;energy?:number;seed?:number}={}):Song {
  const p=prompt.trim().slice(0,2000); if(!p)throw new Error('Describe a sound to get started.');
  const low=p.toLowerCase();const seed=options.seed??hash(p),random=rng(seed);
  const interpretation=interpretPrompt(p,options);
  const {genre,bpm,energy,root,scale}=interpretation;
  const {phrases,palette,progression}=composePhrases(genre,energy,random,positiveDescription(low));
  let sound={...palette.sound};
  const mix=Object.fromEntries(TRACKS.map((t,i)=>[t,palette.mix[i]])) as Song['mix'];
  random(); // Preserve the legacy title draw so title changes do not alter the music.
  const song=validateSong({version:1,composerVersion:2,interpretation:{version:1,scene:interpretation.scene,mood:interpretation.mood,genreSource:interpretation.genreSource},id:`song-${seed}`,title:generateTitle(p,interpretation,seed),prompt:p,seed,genre,bpm,root,scale,bars:8,swing:/straight|no swing/.test(low)?0:/swing/.test(low)?Math.max(.16,palette.swing):palette.swing,energy,chords:progression,patterns:phrases[0],variations:phrases.slice(1),performance:{bassGate:palette.gates[0],leadGate:palette.gates[1],padGate:palette.gates[2],leadOctave:palette.octave,humanize:palette.humanize},mix,muted:{},sound});
  const scored=applyScene(song,interpretation,random);
  sound=scored.sound;
  const toneText=positiveDescription(p);
  if(/acid/.test(toneText))sound.bass='acid';else if(/sub bass|808 bass/.test(toneText))sound.bass='sub';else if(/round bass/.test(toneText))sound.bass='round';
  if(/bell/.test(toneText))sound.lead='bell';else if(/square/.test(toneText))sound.lead='square';else if(/pluck|arpeggio/.test(toneText)&&genre!=='Trance')sound.lead='pluck';else if(/piano|keys/.test(toneText))sound.lead='keys';
  if(/warm pads?/.test(toneText))sound.pad='warm';else if(/glass/.test(toneText))sound.pad='glass';
  return validateSong(applyExclusions(scored));
}
/** Generate independent takes while preserving the same prompt and explicit settings. */
export function composeBatch(prompt:string,count:number,options:{genre?:string;energy?:number;seed?:number}={}):Song[]{
  if(!Number.isInteger(count)||count<1||count>5)throw new Error('Choose between 1 and 5 tracks.');
  const base=options.seed??hash(prompt);
  return Array.from({length:count},(_,i)=>arrange(compose(prompt,{...options,seed:(base+Math.imul(i,0x9e3779b9))>>>0}),count===1?'Balanced':DIRECTIONS[i]));
}
/** Arrangement changes rhythm, note space and balance without overriding prompt exclusions. */
export function arrange(source:Song,direction:Direction):Song {
  const s=structuredClone(source);s.direction=direction;
  const phrases=[s.patterns,...(s.variations||[])];
  for(const p of phrases){
    if(direction==='Melody-led'){
      p.hat=p.hat.map((v,i)=>i%4===0?v:0);p.bass=p.bass.map((v,i)=>i%4===0?v:-1);
    }else if(direction==='Rhythm-led'){
      p.lead=p.lead.map((v,i)=>i%8===0?v:-1);
      p.pad=p.pad.map((v,i)=>i===0?v:0);
    }else if(direction==='Atmospheric'){
      for(const t of ['kick','snare','hat'] as const)p[t]=p[t].map((v,i)=>i===0?v*.35:0);
      p.lead=p.lead.map((v,i)=>i%8===0?v:-1);p.bass=p.bass.map((v,i)=>i===0?v:-1);
      p.pad=p.pad.map((v,i)=>i===0?Math.max(v,.65):0);
    }else if(direction==='Pulse'){
      p.lead=p.lead.map((v,i)=>i%2===0?v:-1);
      // Rearticulate only existing bass notes; never introduce an excluded voice.
      const note=p.bass.find(v=>v>=0);if(note!==undefined)p.bass=p.bass.map((_,i)=>i%4===2?note:-1);
      p.pad=p.pad.map((v,i)=>i%8===0?v:0);
    }
  }
  if(direction==='Melody-led'){s.mix.lead=Math.min(1,s.mix.lead*1.3);s.mix.pad*=.7;s.mix.hat*=.6;}
  if(direction==='Rhythm-led'){s.mix.lead*=.65;s.mix.pad*=.6;s.mix.kick=Math.min(1,s.mix.kick*1.15);s.mix.bass=Math.min(1,s.mix.bass*1.15);if(s.performance)s.performance.padGate=.25;}
  if(direction==='Atmospheric'){s.mix.pad=Math.min(1,s.mix.pad*1.4);if(s.performance){s.performance.leadGate=1.35;s.performance.padGate=.99;}}
  if(direction==='Pulse'&&s.performance){s.performance.bassGate=.4;s.performance.leadGate=.45;}
  return validateSong(applyExclusions(s));
}
/** Keep the favorite's harmony, sounds, mix and opening motif; vary the answering phrases. */
export function moreLike(source:Song,count:number,seed:number):Song[]{
  if(!Number.isInteger(count)||count<1||count>5)throw new Error('Choose between 1 and 5 tracks.');
  return Array.from({length:count},(_,i)=>{
    const nextSeed=(seed+Math.imul(i,0x9e3779b9))>>>0;
    const fresh=compose(source.prompt||source.genre,{genre:source.genre,energy:source.energy,seed:nextSeed});
    const variations=fresh.variations!.map((p,bar)=>{
      const original=patternForBar(source,bar+1),next=structuredClone(original);
      for(const t of ['kick','snare','hat','bass'] as const)next[t]=p[t];
      // Keep the melodic idea recognizable, but vary its ending and leave new rests.
      next.lead=original.lead.map((v,step)=>v<0?v:step>7&&((step+i+bar)%3===0)?-1:step>7?Math.min(13,Math.max(0,v+(i%2?2:-2))):v);
      return next;
    });
    const next=validateSong({...source,id:`song-${nextSeed}`,seed:nextSeed,composerVersion:2,patterns:structuredClone(source.patterns),variations,performance:source.performance||fresh.performance,title:source.title.replace(/ · variation \d+$/,'').slice(0,60)+` · variation ${i+1}`});
    const result=source.direction?arrange(next,source.direction):next;
    // Preserve the exact favorite opening, including hand edits.
    result.patterns=structuredClone(source.patterns);result.mix={...source.mix};result.sound={...source.sound};
    return validateSong(applyExclusions(result));
  });
}
export function noteMidi(s:Song,degree:number,octave:number){const scale=SCALES[s.scale];return octave*12+s.root+scale[((degree%7)+7)%7]+Math.floor(degree/7)*12;}
export function chordName(s:Song,index:number){const d=s.chords[index%4],scale=SCALES[s.scale];const root=NOTES[(s.root+scale[d])%12];const third=noteMidi(s,d+2,4)-noteMidi(s,d,4),fifth=noteMidi(s,d+4,4)-noteMidi(s,d,4);return root+(fifth===6?'dim':third===3?'m':'');}
export function duration(s:Song){return s.bars*240/s.bpm;}
export function remix(s:Song,seed:number){
  const fresh=compose(s.prompt||s.genre,{genre:s.interpretation?.genreSource==='scene'?'Auto':s.genre,energy:s.energy,seed});
  return validateSong({...s,composerVersion:2,seed,id:`song-${seed}`,title:s.title.replace(/ · variation$/,'')+' · variation',patterns:fresh.patterns,variations:fresh.variations,performance:fresh.performance});
}
export function stepTime(s:Song,step:number){const d=60/s.bpm/4;return step*d+(step%2?s.swing*d:0);}
export function encodeWav(channels:Float32Array[],sampleRate:number){
  if(!channels.length||channels.some(c=>c.length!==channels[0].length))throw new Error('Invalid audio channels.');
  const frames=channels[0].length,n=channels.length,buffer=new ArrayBuffer(44+frames*n*2),view=new DataView(buffer);const word=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
  word(0,'RIFF');view.setUint32(4,36+frames*n*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,n,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*n*2,true);view.setUint16(32,n*2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,frames*n*2,true);
  for(let i=0;i<frames;i++)for(let c=0;c<n;c++){const v=Math.max(-1,Math.min(1,Number.isFinite(channels[c][i])?channels[c][i]:0));view.setInt16(44+(i*n+c)*2,Math.round(v*(v<0?32768:32767)),true);}return buffer;
}
