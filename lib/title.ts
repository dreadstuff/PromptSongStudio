import { positiveDescription, type Interpretation } from './interpret';

const clean=(text:string)=>text.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const titleCase=(text:string)=>text.replace(/(^|[\s-])(\p{L})/gu,(_,gap,letter)=>gap+letter.toUpperCase());
const stop=new Set('a an the and or with without no not for of in into on at by to from through music song track soundtrack beat please create generate make me some that is it as very kind feeling sound sounds'.split(' '));
function words(text:string,max:number){return (text.match(/[\p{L}][\p{L}\p{N}’'-]*/gu)||[]).filter(w=>!stop.has(w.toLowerCase())).slice(0,max).join(' ');}

/** Titles use prompt words, not genre-specific random imagery. No composition RNG is consumed. */
export function generateTitle(prompt:string,plan:Interpretation,seed:number):string {
  const input=clean(prompt.slice(0,2000));
  const explicit=input.match(/\b(?:title\s*:?|titled|called|name it)\s*["“]([^"”]+)["”]/i);
  if(explicit?.[1].trim())return clean(explicit[1]).slice(0,80);
  const positive=positiveDescription(input);
  const sceneWords:Record<Interpretation['scene'],string>={battle:/\bboss[ -]?(fight|battle)\b/.test(positive)?'Boss Fight':'Battle',chase:'Chase',suspense:'Suspense',exploration:'Adventure',victory:'Victory',rest:'Rest',romance:'Romance',sadness:'Farewell',neutral:''};
  const scene=sceneWords[plan.scene];
  // A narrative subject before an action is more distinctive than the musical settings.
  const subjectMatch=positive.match(/^(.{1,70}?)\s+(?:enters?|faces?|fights?|battles?|runs?|escapes?|explores?|discovers?|defeats?|celebrates?|rests?|walks?|ventures?)\b/i);
  const subject=subjectMatch?titleCase(words(subjectMatch[1],5)):'';
  const focus=positive
    .replace(/\b\d+(?:\.\d+)?\s*(?:bpm|beats per minute)\b/gi,'')
    .replace(/\b(?:in\s+)?[a-g](?:#|b| flat| sharp)?\s+(?:major|minor|dorian)\b/gi,'')
    .replace(/\b(?:boss[ -]?(?:fight|battle)|fight\w*|battle\w*|chase|adventure|victory|rest|romance|farewell)\b/gi,scene?'':'$&');
  // Keep descriptive details ahead of genre labels and generic musical instructions.
  const descriptive=focus.replace(/\b(?:synthwave|house|lo[ -]?fi|ambient|drum\s*(?:&|and)\s*bass|chiptune|trance|hip[ -]?hop|bpm)\b/gi,'');
  const detail=titleCase(words(descriptive,4));
  let choices:string[];
  if(subject&&scene)choices=[`${subject} · ${scene}`,`${scene} · ${subject}`];
  else if(scene&&detail)choices=[`${detail} · ${scene}`,`${scene} · ${detail}`];
  else if(scene)choices=[`${plan.mood==='Balanced'?'':plan.mood+' '}${scene}`];
  else if(detail)choices=[detail,`${detail} · ${plan.genre}`];
  else choices=[titleCase(words(focus,5))||`${plan.mood==='Balanced'?'':plan.mood+' '}${plan.genre}`];
  return clean(choices[(seed>>>0)%choices.length]).slice(0,80).trim();
}
