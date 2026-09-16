import type { Genre, Song, Track } from './song';

export type Pattern = Song['patterns'];
type Rhythm = number[][];
type Palette = {
  kick: Rhythm; snare: Rhythm; hat: Rhythm; bass: Rhythm; lead: Rhythm; pad: Rhythm;
  contours: number[][]; bassNotes: number[][]; gates: [number, number, number];
  sound: Song['sound']; swing: number; octave: number; humanize: number;
  mix: [number, number, number, number, number, number];
  progressions: number[][];
};
const eighths = [0,2,4,6,8,10,12,14];
const sixteenths = Array.from({length:16},(_,i)=>i);

// Rhythm is authored per musical role. Seeded choices vary within a style;
// a style is never implemented as transposition of one universal arpeggio.
export const PALETTES: Record<Genre, Palette> = {
  Synthwave: {
    kick:[[0,8],[0,6,8],[0,8,10]], snare:[[4,12]], hat:[eighths,[0,2,6,8,10,14]],
    bass:[eighths,[0,2,4,6,8,10,13,14],[0,3,4,6,8,11,12,14]],
    lead:[[0,3,6,8,11,14],[0,4,7,10,12],[0,2,6,8,12,15]], pad:[[0]],
    contours:[[0,4,2,7,4,2],[4,2,0,2,4,7],[0,2,4,2,7,4]], bassNotes:[[0,0,7,0,0,4,7,4],[0,7,0,4,0,7,4,0]],
    gates:[.72,.85,.97], sound:{bass:'round',lead:'pluck',pad:'warm',kit:'retro',reverb:.28,delay:.23},
    swing:0,octave:4,humanize:0,mix:[.8,.6,.35,.62,.43,.38],progressions:[[0,5,2,6],[0,3,5,4],[0,6,5,3]]
  },
  House: {
    kick:[[0,4,8,12]], snare:[[4,12],[4,11,12]], hat:[[2,6,10,14],[2,6,9,10,14],[2,5,6,10,13,14]],
    bass:[[2,6,10,14],[0,3,6,10,14],[2,6,8,11,14]], lead:[[3,6,10,14],[2,7,10],[0,6,11,14]],
    pad:[[2,6,10,14],[0,6,12],[2,10,14]],contours:[[0,2,4,2],[4,4,2,0],[0,4,7,4]],bassNotes:[[0,0,4,0],[0,7,0,4]],
    gates:[.5,.43,.24],sound:{bass:'acid',lead:'keys',pad:'keys',kit:'tight',reverb:.1,delay:.08},
    swing:.025,octave:4,humanize:.004,mix:[.9,.5,.45,.65,.36,.48],progressions:[[0,3,5,4],[0,5,3,4],[0,4,5,3]]
  },
  'Lo-fi': {
    kick:[[0,7,10],[0,6,11],[0,3,10]],snare:[[4,12],[4,12,15]],hat:[[0,3,6,8,11,14],[0,2,5,8,10,14],[0,3,5,8,11]],
    bass:[[0,7,10],[0,6,12],[0,10]],lead:[[1,6,11],[0,5,10,14],[2,8,13]],pad:[[0,7],[0,10],[0]],
    contours:[[4,2,0,2],[2,4,2,0],[0,2,4,6]],bassNotes:[[0,4,2],[0,2,4],[0,4]],
    gates:[.88,1.1,.75],sound:{bass:'round',lead:'keys',pad:'keys',kit:'soft',reverb:.2,delay:.06},
    swing:.2,octave:4,humanize:.012,mix:[.68,.5,.24,.6,.47,.44],progressions:[[1,4,0,5],[0,3,1,4],[5,1,4,0]]
  },
  Ambient: {
    kick:[[]],snare:[[]],hat:[[]],bass:[[0],[],[0,12]],lead:[[0],[4,12],[2,10]],pad:[[0]],
    contours:[[4,7],[2,6],[0,4]],bassNotes:[[0],[4]],gates:[.95,1.35,.99],
    sound:{bass:'sub',lead:'sine',pad:'glass',kit:'soft',reverb:.56,delay:.36},
    swing:0,octave:5,humanize:.012,mix:[0,0,0,.35,.35,.65],progressions:[[0,3,0,5],[0,5,3,0],[0,2,5,3]]
  },
  'Drum & bass': {
    kick:[[0,7,10],[0,6,10],[0,7,9,14]],snare:[[4,12],[4,10,12,15],[4,12,14]],hat:[sixteenths,[0,2,3,6,8,10,11,14],[0,2,5,6,8,10,13,14,15]],
    bass:[[0,3,7,10,14],[0,6,9,12],[0,2,7,10,13,15]],lead:[[0,6,12],[3,10,14],[0,7,11]],pad:[[0],[0,8]],
    contours:[[0,7,4],[4,2,0],[0,2,6]],bassNotes:[[0,0,7,4,0],[0,4,2,0],[0,7,4,7,0]],
    gates:[.83,.63,.8],sound:{bass:'acid',lead:'pluck',pad:'warm',kit:'breakbeat',reverb:.13,delay:.2},
    swing:0,octave:4,humanize:.003,mix:[.85,.7,.36,.76,.34,.24],progressions:[[0,5,3,4],[0,6,3,5],[0,2,5,6]]
  },
  Chiptune: {
    kick:[[0,8,11],[0,6,8,14],[0,7,10]],snare:[[4,12]],hat:[[0,4,8,12],[2,6,10,14]],
    bass:[[0,4,8,12],[0,4,7,8,12],[0,3,8,12]],lead:[[0,1,2,4,6,7,8,10,12,13,14],[0,2,3,4,6,8,9,10,12,14,15],[0,1,4,5,6,8,10,11,12,14]],pad:[[0,8],[0,4,8,12]],
    contours:[[0,2,4,7,6,4,2,0,2,4,7],[4,2,0,2,4,6,7,4,2,4,0],[0,0,4,4,7,6,4,2,0,2,4]],bassNotes:[[0,4,0,4],[0,7,4,7]],
    gates:[.68,.72,.16],sound:{bass:'round',lead:'square',pad:'glass',kit:'retro',reverb:0,delay:0},
    swing:0,octave:4,humanize:0,mix:[.65,.44,.23,.55,.46,.28],progressions:[[0,4,5,3],[0,3,4,0],[0,5,1,4]]
  },
  Trance: {
    kick:[[0,4,8,12]],snare:[[4,12]],hat:[[2,6,10,14],[0,2,6,8,10,14]],
    bass:[[1,2,3,5,6,7,9,10,11,13,14,15],[2,3,6,7,10,11,14,15]],lead:[sixteenths,[0,1,2,4,5,6,8,9,10,12,13,14]],pad:[[0]],
    contours:[[0,4,7,4,2,4,7,4],[7,4,2,4,0,4,2,4],[0,2,4,7,6,4,2,4]],bassNotes:[[0,0,0,0,7,0],[0,0,7,0]],
    gates:[.48,.7,.95],sound:{bass:'sub',lead:'supersaw',pad:'warm',kit:'tight',reverb:.3,delay:.35},
    swing:0,octave:4,humanize:0,mix:[.85,.48,.37,.64,.31,.4],progressions:[[0,5,2,6],[5,3,0,4],[0,3,5,6]]
  },
  'Hip-hop': {
    kick:[[0,3,10],[0,6,9,14],[0,7,11]],snare:[[8],[8,15]],hat:[[0,2,4,6,8,10,12,14,15],[0,3,4,6,8,10,13,14,15],[0,2,4,7,8,10,12,13,14,15]],
    bass:[[0,3,10],[0,6,14],[0,7,11]],lead:[[0,6,14],[2,10],[0,7,12]],pad:[[0],[0,10]],
    contours:[[0,2,0],[4,2,0],[0,4,2]],bassNotes:[[0,0,4],[0,7,4]],
    gates:[1.08,.65,.8],sound:{bass:'sub',lead:'bell',pad:'keys',kit:'808',reverb:.16,delay:.1},
    swing:.07,octave:4,humanize:.007,mix:[.86,.68,.32,.8,.4,.26],progressions:[[0,0,5,4],[0,3,0,6],[0,5,0,4]]
  }
};

const tracks:Track[]=['kick','snare','hat','bass','lead','pad'];
export function composePhrases(genre:Genre,energy:number,random:()=>number,prompt:string) {
  const palette=PALETTES[genre];
  const pick=<T,>(items:T[])=>items[Math.floor(random()*items.length)];
  const selected=Object.fromEntries(tracks.map(t=>[t,pick(palette[t])])) as Record<Track,number[]>;
  const contour=pick(palette.contours),bassContour=pick(palette.bassNotes);
  const sparse=/sparse|minimal|gentle|mellow|calm/.test(prompt);
  const busy=/busy|driving|intense|energetic/.test(prompt);
  const phrases:Pattern[]=[];
  for(let bar=0;bar<4;bar++){
    const patterns={} as Pattern;
    for(const t of tracks){
      const melodic=t==='lead'||t==='bass';
      patterns[t]=Array(16).fill(melodic?-1:0);
      let onsets=[...(bar===2&&t==='lead'?pick(palette.lead):selected[t])];
      if(t==='lead'&&bar%2===1&&onsets.length>2)onsets=onsets.filter((_,i)=>i!==onsets.length-2); // Answer with breathing room.
      if((t==='hat'||t==='lead')&&(sparse||energy<.35))onsets=onsets.filter((_,i)=>i%2===0);
      if(t==='hat'&&busy&&genre!=='Ambient'&&energy>.6)onsets=[...new Set([...onsets,7,15])].sort((a,b)=>a-b);
      onsets.forEach((step,n)=>{
        if(t==='lead'){
          // Preserve a motif but resolve the response and vary its contour, not only its root.
          patterns[t][step]=bar%2===1&&n===onsets.length-1?0:contour[(n+(bar===2?2:0))%contour.length];
        }else if(t==='bass')patterns[t][step]=bassContour[(n+(bar===3?1:0))%bassContour.length];
        else patterns[t][step]=t==='pad'?.8:t==='kick'?(step%4===0?.95:.76):t==='snare'?(step%4===0?.78:.25):(step%4===2?.6:.32);
      });
      // Small, reproducible changes across tracks and bars; no timing jitter can cross the bar boundary.
      if(!melodic&&t!=='pad')patterns[t]=patterns[t].map(v=>v?Math.min(1,v*(.9+random()*.17)):0);
      if(bar===3&&genre!=='Ambient'&&!sparse){
        if(t==='snare'&&energy>.45)patterns[t][genre==='Hip-hop'?14:15]=.34;
        if(t==='hat'&&energy>.45)patterns[t][15]=.28;
      }
    }
    if(/no drums|without drums/.test(prompt))for(const t of ['kick','snare','hat'] as Track[])patterns[t].fill(0);
    if(/no melody|without melody|no lead/.test(prompt))patterns.lead.fill(-1);
    if(/no bass|without bass/.test(prompt))patterns.bass.fill(-1);
    phrases.push(patterns);
  }
  return {phrases,palette,progression:pick(palette.progressions)};
}
