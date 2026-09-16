import type { Genre, Song } from './song';

export type Scene = 'battle'|'chase'|'suspense'|'exploration'|'victory'|'rest'|'romance'|'sadness'|'neutral';
export type Interpretation = {
  version:1; scene:Scene; label:string; mood:string; pace:string;
  genre:Genre; genreSource:'manual'|'prompt'|'scene'|'fallback';
  bpm:number; energy:number; root:number; scale:Song['scale'];
  evidence:string[]; notes:string[]; recognized:boolean;
};
export type PromptOptions = {genre?:string;energy?:number};
export const SCENES:Record<Scene,{label:string;genre:Genre;bpm:number;energy:number}> = {
  battle:{label:'Boss fight / battle',genre:'Trance',bpm:150,energy:.92},
  chase:{label:'Chase / escape',genre:'Drum & bass',bpm:168,energy:.9},
  suspense:{label:'Suspense / danger',genre:'Ambient',bpm:82,energy:.38},
  exploration:{label:'Exploration / adventure',genre:'Synthwave',bpm:110,energy:.58},
  victory:{label:'Victory / celebration',genre:'House',bpm:128,energy:.82},
  rest:{label:'Rest / reflection',genre:'Lo-fi',bpm:76,energy:.25},
  romance:{label:'Romance / connection',genre:'Lo-fi',bpm:82,energy:.35},
  sadness:{label:'Loss / sadness',genre:'Ambient',bpm:66,energy:.22},
  neutral:{label:'Musical idea',genre:'Synthwave',bpm:108,energy:.65},
};
const GENRE_CUES:[Genre,RegExp][] = [
  ['Drum & bass',/\b(?:drum\s*(?:&|and|n)\s*bass|dnb)\b/i],
  ['Lo-fi',/\b(?:lo[ -]?fi|chillhop)\b/i],['Ambient',/\b(?:ambient|meditation|meditative)\b/i],
  ['Chiptune',/\b(?:chiptune|8[ -]?bit|retro game)\b/i],['Trance',/\btrance\b/i],
  ['Hip-hop',/\b(?:hip[ -]?hop|trap music)\b/i],['House',/\b(?:house (?:music|beat|track|groove)|(?:deep|tech|progressive|uplifting) house|edm|dance music)\b|^house\b/i],
  ['Synthwave',/\b(?:synthwave|synth[ -]?pop|retrowave)\b/i],
];
const DEFAULT_BPM:Record<Genre,number>={'Synthwave':108,'House':128,'Lo-fi':78,'Ambient':68,'Drum & bass':172,'Chiptune':140,'Trance':138,'Hip-hop':90};
const SCENE_CUES:[Scene,RegExp][] = [
  ['victory',/\b(?:victory|celebrat\w*|triumph\w*|after the battle|boss (?:is )?defeated|won the (?:fight|battle))\b/i],
  ['rest',/\b(?:resting|relax\w*|sleep\w*|peaceful|unwind\w*|campfire|cozy|cosy|safe haven|quiet evening)\b/i],
  ['romance',/\b(?:romantic|romance|falling in love|tender|embrace|kiss\w*|reunit\w*)\b/i],
  ['sadness',/\b(?:grief|griev\w*|mourning|heartbreak|farewell|funeral|loss|sadness)\b/i],
  ['battle',/\b(?:boss[ -]?(?:fight|battle)|final[ -]?(?:fight|battle|showdown)|fight\w*|battle\w*|combat|showdown|warfare|clash\w*|last stand)\b/i],
  ['chase',/\b(?:chase|chased|chasing|pursuit|escap\w*|running from|racing|race against|flee\w*)\b/i],
  ['suspense',/\b(?:sneak\w*|stealth|stalk\w*|suspense|tension|tense|danger|horror|haunted|creep\w*|ominous|mystery)\b/i],
  ['exploration',/\b(?:explor\w*|adventure|journey|quest|dungeon|discover\w*|wandering|travel\w*|forest|space voyage)\b/i],
];
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
// Ignore common negated descriptions, e.g. "slow, not fast" and "no boss fight".
// This is deliberately a bounded English interpreter, not a language model.
export function positiveDescription(prompt:string){
  return prompt.toLowerCase().replace(/[’]/g,"'").replace(/\b(?:no|not|never|without|avoid|don't|do not)\s+(?:(?:a|an|the|any|too|very|really)\s+)?[a-z]+(?:-[a-z]+)?(?:\s+(?:fight|battle|music|sound|tempo|drums|bass|melody|lead|pace|energy))?\b/g,' ');
}
export function interpretPrompt(prompt:string,options:PromptOptions={}):Interpretation {
  const text=positiveDescription(prompt.trim().slice(0,2000));
  const evidence:string[]=[],notes:string[]=[];
  const sceneHit=SCENE_CUES.find(([,pattern])=>pattern.test(text));
  const scene=sceneHit?.[0]??'neutral',preset=SCENES[scene];
  if(sceneHit)evidence.push(text.match(sceneHit[1])![0]);
  const genreHit=GENRE_CUES.find(([,pattern])=>pattern.test(text));
  const manual=GENRE_CUES.some(([genre])=>genre===options.genre);
  const genre:Genre=manual?options.genre as Genre:genreHit?.[0]??preset.genre;
  const genreSource:Interpretation['genreSource']=manual?'manual':genreHit?'prompt':scene!=='neutral'?'scene':'fallback';
  if(genreHit)evidence.push(text.match(genreHit[1])![0]);
  const bright=text.match(/\b(?:up[ -]?beat|happy|uplifting|cheerful|joyful|playful|hopeful|heroic|optimistic|bright)\b/);
  const dark=text.match(/\b(?:dark|sinister|menacing|ominous|scary|evil|grim)\b/);
  const sad=text.match(/\b(?:sad|melanchol\w*|sorrow\w*|somber|sombre)\b/);
  const calm=text.match(/\b(?:calm|gentle|mellow|soft|peaceful|soothing|relaxed|quiet)\b/);
  let mood=bright?'Upbeat':sad?'Melancholic':dark?'Dark':calm?'Calm':scene==='battle'?'Intense':scene==='chase'?'Urgent':scene==='victory'?'Triumphant':scene==='suspense'?'Tense':scene==='exploration'?'Adventurous':scene==='sadness'?'Melancholic':scene==='romance'?'Tender':scene==='rest'?'Calm':'Balanced';
  for(const m of [bright,dark,sad,calm])if(m)evidence.push(m[0]);
  const explicitKey=text.match(/\b([a-g])([#b]?)\s+(minor|major|dorian)\b/);
  const notesByName=['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];
  const root=explicitKey?(notesByName.indexOf(explicitKey[1])+(explicitKey[2]==='#'?1:explicitKey[2]==='b'?-1:0)+12)%12:9;
  const scale:Song['scale']=explicitKey?explicitKey[3] as Song['scale']:bright?(scene==='battle'||scene==='chase'?'dorian':'major'):scene==='victory'?'major':scene==='exploration'?'dorian':'minor';
  if(explicitKey)evidence.push(explicitKey[0]);
  let bpm=genreSource==='manual'||genreSource==='prompt'?DEFAULT_BPM[genre]:preset.bpm;
  let energy=scene==='neutral'?.65:preset.energy;
  if(bright)energy=Math.max(energy,.76);if(dark)energy=Math.max(energy,.5);if(calm)energy=Math.min(energy,.35);if(sad)energy=Math.min(energy,.3);
  const intensity=text.match(/\b(?:intense|intensity|powerful|energetic|aggressive|explosive|relentless|epic|heavy)\b/);
  if(intensity){energy=Math.max(energy,.9);evidence.push(intensity[0]);}
  const fast=text.match(/\b(?:very fast|super fast|fast[ -]paced|fast|rapid|high[ -]speed|quick|frantic|breakneck)\b/);
  const slow=text.match(/\b(?:very slow|slow[ -]paced|slow|unhurried|leisurely|laid[ -]back)\b/);
  const medium=text.match(/\b(?:mid[ -]?tempo|moderate|medium[ -]paced|steady pace)\b/);
  const explicitBpm=text.match(/\b(\d{2,3})\s*(?:bpm|beats per minute)\b/);
  if(slow){bpm=/very slow/.test(slow[0])?60:74;evidence.push(slow[0]);}
  if(medium){bpm=112;evidence.push(medium[0]);}
  if(fast){bpm=/very fast|super fast|frantic|breakneck/.test(fast[0])?176:160;evidence.push(fast[0]);energy=Math.max(energy,.82);}
  if(fast&&slow)notes.push('Both fast and slow were mentioned. This loop uses the faster pace; add a BPM to choose one.');
  if(explicitBpm){bpm=clamp(+explicitBpm[1],55,180);evidence.push(explicitBpm[0]);if(+explicitBpm[1]!==bpm)notes.push('Tempo is limited to 55–180 BPM.');}
  if(typeof options.energy==='number'&&Number.isFinite(options.energy))energy=clamp(options.energy,0,1);
  const pace=bpm>=150?'Fast':bpm<=90?'Slow':'Moderate';
  const unsupported=text.match(/\b(?:orchestral|orchestra|acoustic guitar|electric guitar|metal|jazz|vocals|singing|lyrics|violin|cello|brass)\b/);
  if(unsupported)notes.push(`“${unsupported[0]}” is beyond the current synth sounds; the scene will use electronic instruments.`);
  const recognizableInstrument=/\b(?:bass|pads?|synths?|piano|keys|bell|pluck|arpeggio|drums?|percussion|melody)\b/.test(text);
  const recognized=!!(sceneHit||genreHit||bright||dark||sad||calm||intensity||fast||slow||medium||explicitBpm||explicitKey||recognizableInstrument||manual);
  if(!recognized)notes.push('Add what is happening, a mood, or a pace. Names alone do not describe a musical scene.');
  if(manual&&scene!=='neutral')notes.push(`Your ${genre} style choice takes priority over the scene’s suggested style.`);
  return {version:1,scene,label:preset.label,mood,pace,genre,genreSource,bpm,energy:Math.round(energy*100)/100,root,scale,evidence:[...new Set(evidence)].slice(0,10),notes,recognized};
}
