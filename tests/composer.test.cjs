const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const build=fs.mkdtempSync(path.join(os.tmpdir(),'prompt-song-tests-'));
const compile=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','lib/song.ts','lib/audio.ts','--outDir',build,'--module','commonjs','--target','ES2022','--lib','ES2022,DOM','--skipLibCheck'],{encoding:'utf8'});
assert.equal(compile.status,0,compile.stdout+compile.stderr);
const {compose,validateSong,remix,GENRES,TRACKS,SCALES,stepTime,duration,noteMidi,chordName,encodeWav,patternForBar,noteBeats,noteDelay,editPatternStep}=require(path.join(build,'song.js'));
const {interpretPrompt}=require(path.join(build,'interpret.js'));
const {Synth,Player,renderWav}=require(path.join(build,'audio.js'));
process.on('exit',()=>fs.rmSync(build,{recursive:true,force:true}));
test('same seed and prompt reproduce the entire patch',()=>{assert.deepEqual(compose('House 128 BPM in F major',{seed:17}),compose('House 128 BPM in F major',{seed:17}));});
test('prompt language chooses style, tempo, flats, scale and instrument',()=>{const s=compose('Lo-fi 82 BPM in Bb dorian with bell and acid bass');assert.equal(s.genre,'Lo-fi');assert.equal(s.bpm,82);assert.equal(s.root,10);assert.equal(s.scale,'dorian');assert.equal(s.sound.lead,'bell');assert.equal(s.sound.bass,'acid');assert.ok(s.swing>0);});
test('style override wins and tempo remains bounded',()=>{const s=compose('house at 999 BPM',{genre:'Ambient'});assert.equal(s.genre,'Ambient');assert.equal(s.bpm,180);assert.ok(s.patterns.kick.every(v=>v===0));});
test('no-drums request keeps all percussion silent',()=>{const s=compose('House without drums');for(const t of ['kick','snare','hat'])assert.ok(s.patterns[t].every(v=>v===0));});
test('500 seeds per style produce valid bounded playable patches',()=>{for(const genre of GENRES)for(let seed=0;seed<500;seed++){const s=compose('A night in the city',{genre,seed});assert.deepEqual(validateSong(s),s);for(const t of TRACKS)assert.equal(s.patterns[t].length,16);assert.ok(s.patterns.lead.some(v=>v>=0));assert.ok(Number.isFinite(duration(s)));}});
test('malformed files fail before they can touch the current song',()=>{for(const value of [null,{},[],{version:2}, {...compose('House'),patterns:{kick:[1]}}])assert.throws(()=>validateSong(value));const s=compose('House');s.patterns.bass[0]=NaN;assert.throws(()=>validateSong(s));});
test('dangerous settings and unexpected properties are normalized',()=>{const s=compose('House');const input={...s,bpm:Infinity,bars:1e9,scale:'__proto__',root:-20,swing:100,extra:'discard',mix:{kick:200},muted:{hat:'false'}};const clean=validateSong(input);assert.equal(clean.bpm,108);assert.equal(clean.bars,8);assert.equal(clean.root,0);assert.equal(clean.scale,'minor');assert.equal(clean.swing,.3);assert.equal(clean.mix.kick,1);assert.equal(clean.muted.hat,false);assert.ok(!('extra' in clean));});
test('chord labels and scale degrees correspond to real pitches',()=>{const s=compose('C major');s.chords=[0,4,5,6];assert.deepEqual(s.chords.map((_,i)=>chordName(s,i)),['C','G','Am','Bdim']);assert.equal(noteMidi(s,7,4)-noteMidi(s,0,4),12);});
test('swing preserves bar boundaries and monotonic scheduling',()=>{for(const bpm of [55,108,180])for(const swing of [0,.16,.3]){const s={...compose('House'),bpm,swing,bars:16};let last=-1;for(let step=0;step<=256;step++){const time=stepTime(s,step);assert.ok(time>last);last=time;}assert.equal(stepTime(s,256),duration(s));assert.ok(Math.abs(stepTime(s,16)-240/bpm)<1e-8);}});
test('remix changes melody without changing harmony, tempo or mix',()=>{const s=compose('Trance',{seed:12}),copy=structuredClone(s),next=remix(s,932);assert.deepEqual(s,copy);assert.equal(next.bpm,s.bpm);assert.deepEqual(next.chords,s.chords);assert.deepEqual(next.mix,s.mix);assert.notDeepEqual(next.patterns,s.patterns);});
test('WAV export has correct stereo PCM header, clipping and nonfinite handling',()=>{const buffer=encodeWav([new Float32Array([-2,0,.5,NaN]),new Float32Array([2,-.5,0,Infinity])],44100),v=new DataView(buffer);assert.equal(buffer.byteLength,60);assert.equal(Buffer.from(buffer).subarray(0,4).toString(),'RIFF');assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),44100);assert.equal(v.getUint32(40,true),16);assert.equal(v.getInt16(44,true),-32768);assert.equal(v.getInt16(46,true),32767);assert.equal(v.getInt16(56,true),0);assert.equal(v.getInt16(58,true),0);});
// An instrumented Web Audio contract catches invalid schedules and verifies the shared live/export path.
class Param {value=0;setValueAtTime(v,t){assert.ok(Number.isFinite(v)&&Number.isFinite(t)&&t>=0);}linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);}exponentialRampToValueAtTime(v,t){assert.ok(v>0);this.setValueAtTime(v,t);}setTargetAtTime(v,t,c){assert.ok(c>0);this.setValueAtTime(v,t);}}
class Node {constructor(ctx){this.ctx=ctx;for(const key of ['gain','frequency','detune','Q','delayTime','threshold','knee','ratio','attack','release'])this[key]=new Param();}connect(){return this;}disconnect(){}start(t){assert.ok(Number.isFinite(t)&&t>=0);this.started=t;this.ctx.events.push({time:t});}stop(t){assert.ok(t>this.started);}getByteFrequencyData(a){a.fill(0);}}
class Context {currentTime=0;sampleRate=8000;events=[];state='running';constructor(channels=2,length=8000,rate=8000){this.sampleRate=rate;this.channels=channels;this.length=length;this.destination=new Node(this);}createGain(){return new Node(this);}createDynamicsCompressor(){return new Node(this);}createAnalyser(){return new Node(this);}createConvolver(){return new Node(this);}createDelay(){return new Node(this);}createBiquadFilter(){return new Node(this);}createOscillator(){return new Node(this);}createBufferSource(){return new Node(this);}createBuffer(channels,length,rate){const c=Array.from({length:channels},()=>new Float32Array(length));return {sampleRate:rate,getChannelData:i=>c[i]};}async startRendering(){return this.createBuffer(this.channels,this.length,this.sampleRate);}async resume(){this.state='running';}async close(){this.state='closed';}}
test('all voices and instruments schedule finite positive envelopes',()=>{for(const genre of GENRES)for(const lead of ['bell','square','pluck','keys','sine','supersaw']){const s=compose('Melodic music',{genre,seed:7});s.sound.lead=lead;const ctx=new Context(),synth=new Synth(ctx,s);for(let step=0;step<s.bars*16;step++)synth.step(s,step,stepTime(s,step));assert.ok(ctx.events.length>0, `${genre} ${lead} must schedule audible voices`);synth.updateMix({...s,muted:{...s.muted,bass:true}},.4);}});
test('export duration is exact and optional tail adds two seconds',async()=>{global.OfflineAudioContext=Context;const s={...compose('House'),bars:4,bpm:120};const loop=await renderWav(s,.65,false),full=await renderWav(s,.65,true);assert.equal(loop.size,44+8*44100*4);assert.equal(full.size-loop.size,2*44100*4);});
test('rapid start/stop cannot leave audio playing and closes contexts',async()=>{global.window={AudioContext:Context};const p=new Player(),s=compose('House');const pending=p.start(s,()=>{},()=>{});const ctx=p.context;p.stop();await pending;assert.equal(p.playing,false);assert.equal(p.context,null);assert.equal(ctx.state,'closed');await p.start(s,()=>{},()=>{});assert.equal(p.playing,true);assert.ok(p.context.events.length>0);p.stop();assert.equal(p.timer,null);});

test('styles differ rhythmically even with identical pitch, tempo and seed',()=>{
  const signatures=GENRES.map(genre=>{
    const s=compose('C minor at 120 BPM',{genre,seed:76});
    return JSON.stringify(TRACKS.map(t=>s.patterns[t].map(v=>t==='bass'||t==='lead'?v>=0:v>0)));
  });
  assert.equal(new Set(signatures).size,GENRES.length,'Every style must have a distinct onset fingerprint, independent of pitch and tempo');
});
test('new seeds produce different grooves within each style',()=>{
  for(const genre of GENRES){const signatures=new Set();for(let seed=0;seed<30;seed++){
    const s=compose('C minor 120 BPM',{genre,seed});
    signatures.add(JSON.stringify(TRACKS.map(t=>s.patterns[t].map(v=>t==='bass'||t==='lead'?v>=0:v>0))));
  }assert.ok(signatures.size>=3,`${genre} needs multiple rhythms, got ${signatures.size}`);}
});
test('ambient sustains and rests; trance has a denser rhythm at the same tempo',()=>{
  const ambient=compose('C minor at 120 BPM',{genre:'Ambient',seed:42}),trance=compose('C minor at 120 BPM',{genre:'Trance',seed:42});
  const count=s=>s.patterns.lead.filter(v=>v>=0).length;
  assert.ok(count(ambient)<count(trance));
  const a=ambient.patterns.lead.findIndex(v=>v>=0),t=trance.patterns.lead.findIndex(v=>v>=0);
  assert.ok(noteBeats(ambient,'lead',a,0)>noteBeats(trance,'lead',t,0)*3);
  assert.notEqual(ambient.sound.lead,trance.sound.lead);
});
test('four bars contain phrasing and edits target only the selected bar',()=>{
  const s=compose('Synthwave',{seed:12}),snapshot=structuredClone(s);
  assert.notDeepEqual(patternForBar(s,0).lead,patternForBar(s,1).lead);
  const edited=editPatternStep(s,2,'lead',0,13);
  assert.equal(patternForBar(edited,2).lead[0],13);assert.deepEqual(patternForBar(edited,0),patternForBar(s,0));assert.deepEqual(s,snapshot);
  assert.deepEqual(patternForBar(s,4),patternForBar(s,0));
});
test('four-bar patches round-trip and corrupt variation bars are rejected',()=>{
  const s=compose('Lo-fi',{seed:938});assert.deepEqual(validateSong(JSON.parse(JSON.stringify(s))),s);
  assert.throws(()=>validateSong({...s,variations:[]}));
  const invalid=structuredClone(s);invalid.variations[1].hat[0]='oops';assert.throws(()=>validateSong(invalid));
});
test('no drums, melody or bass stays silent in every phrase',()=>{
  const s=compose('House without drums, no melody, no bass');
  for(let bar=0;bar<4;bar++){const p=patternForBar(s,bar);for(const t of ['kick','snare','hat'])assert.ok(p[t].every(v=>v===0));assert.ok(p.bass.every(v=>v===-1));assert.ok(p.lead.every(v=>v===-1));}
});
test('old saved patches keep their one-bar structure and original note lengths',()=>{
  const old=compose('Synthwave');delete old.composerVersion;delete old.variations;delete old.performance;delete old.sound.kit;delete old.interpretation;
  old.sound.lead='pluck';old.sound.pad='warm';const restored=validateSong(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(restored,old);assert.deepEqual(patternForBar(restored,3),restored.patterns);
  assert.equal(noteBeats(restored,'bass',0,0),.46);assert.equal(noteBeats(restored,'lead',0,0),.65);assert.equal(noteDelay(restored,7,'hat'),0);
});
test('phrasing and deterministic timing offsets remain bounded at tempo extremes',()=>{
  for(const genre of GENRES)for(const bpm of [55,180]){const s=compose(`C minor ${bpm} BPM`,{genre,seed:101});
    for(let bar=0;bar<4;bar++)for(let step=0;step<16;step++)for(const t of ['lead','bass','pad']){
      const beats=noteBeats(s,t,step,bar);assert.ok(Number.isFinite(beats)&&beats>0&&beats<=6);
      const delay=noteDelay(s,bar*16+step,t);assert.ok(delay>=0&&delay<=.02);assert.equal(delay,noteDelay(s,bar*16+step,t));
    }
  }
});

test('the exact Dungeon Crawler Carl prompt maps to a fast upbeat boss fight',()=>{
  const prompt='dungeon crawler Carl enters into a boss fight with upbeat and fast music';
  const plan=interpretPrompt(prompt),s=compose(prompt,{seed:314});
  assert.equal(plan.scene,'battle');assert.equal(plan.mood,'Upbeat');assert.equal(plan.pace,'Fast');
  assert.equal(plan.bpm,160);assert.ok(plan.energy>=.9);assert.equal(plan.genre,'Trance');
  assert.equal(s.bpm,plan.bpm);assert.equal(s.energy,plan.energy);assert.equal(s.scale,'dorian');
  assert.equal(s.interpretation.scene,'battle');assert.equal(s.sound.kit,'breakbeat');assert.equal(s.sound.lead,'supersaw');
  assert.ok(s.patterns.kick.filter(v=>v>0).length>=5);assert.ok(s.patterns.bass.filter(v=>v>=0).length>=8);
});
test('scene interpretation does not depend on a particular character or franchise',()=>{
  for(const name of ['Carl','Captain Marisol','an unknown adventurer']){
    const p=interpretPrompt(`${name} enters a boss battle. Upbeat, fast music.`);
    assert.equal(p.scene,'battle');assert.equal(p.bpm,160);assert.equal(p.mood,'Upbeat');
  }
});
test('descriptive scene families choose appropriate energy and pace',()=>{
  const cases=[
    ['Carl rests at a campfire, calm and slow','rest',74],
    ['A spaceship is chased through an asteroid field','chase',168],
    ['Sneaking through a haunted house','suspense',82],
    ['Our hero celebrates victory after the boss fight','victory',128],
    ['Two travelers reunite in a tender embrace','romance',82],
    ['A farewell filled with grief and slow music','sadness',74],
    ['Exploring an ancient forest on an adventure','exploration',110],
  ];
  for(const [prompt,scene,bpm] of cases){const p=interpretPrompt(prompt);assert.equal(p.scene,scene,prompt);assert.equal(p.bpm,bpm,prompt);}
});
test('ordinary story nouns are not accidentally interpreted as music genres',()=>{
  assert.equal(interpretPrompt('Sneaking through a haunted house').genre,'Ambient');
  assert.equal(interpretPrompt('House music at 126 BPM').genre,'House');
  assert.equal(interpretPrompt('Uplifting house for a celebration').genre,'House');
});
test('negated pace and action words do not reverse the request',()=>{
  const a=interpretPrompt('Slow music, not fast');assert.equal(a.bpm,74);
  const b=interpretPrompt('No boss fight, just calm exploration with slow music');assert.equal(b.scene,'exploration');assert.equal(b.bpm,74);assert.ok(b.energy<=.35);
  const c=interpretPrompt('A fast breakfast with cheerful music');assert.equal(c.bpm,160);
  assert.notEqual(interpretPrompt('Breakfast with cheerful music').pace,'Fast');
});
test('explicit tempo, key and manual controls override inferred settings',()=>{
  const p=interpretPrompt('A boss fight with upbeat fast music, 92 BPM in C minor',{genre:'Lo-fi',energy:.2});
  assert.equal(p.bpm,92);assert.equal(p.root,0);assert.equal(p.scale,'minor');assert.equal(p.genre,'Lo-fi');assert.equal(p.energy,.2);
  const s=compose('A boss fight with upbeat fast music, 92 BPM in C minor',{genre:'Lo-fi',energy:.2,seed:18});
  assert.equal(s.bpm,p.bpm);assert.equal(s.energy,p.energy);assert.equal(s.sound.kit,'soft');
});
test('scene transformation honors requested instruments and exclusions',()=>{
  const s=compose('A fast upbeat boss fight, with bell melody, round bass, without percussion',{seed:92});
  assert.equal(s.sound.lead,'bell');assert.equal(s.sound.bass,'round');
  for(let bar=0;bar<4;bar++)for(const t of ['kick','snare','hat'])assert.ok(patternForBar(s,bar)[t].every(v=>v===0));
  const dark=compose('A boss fight, not calm, with intense fast music, no melody and no bass');
  for(let bar=0;bar<4;bar++){assert.ok(patternForBar(dark,bar).lead.every(v=>v===-1));assert.ok(patternForBar(dark,bar).bass.every(v=>v===-1));}
});
test('unsupported descriptions and contradictory pace get visible explanations',()=>{
  assert.equal(interpretPrompt('Carl and Princess Donut').recognized,false);
  assert.ok(interpretPrompt('Carl and Princess Donut').notes.some(n=>n.includes('Names alone')));
  assert.ok(interpretPrompt('An orchestral boss fight with vocals').notes.some(n=>n.includes('electronic instruments')));
  const p=interpretPrompt('A slow but also fast chase');assert.ok(p.notes.some(n=>n.includes('Both fast and slow')));
});
test('interpretation metadata survives export without changing legacy files',()=>{
  const s=compose('A heroic fast boss fight');assert.deepEqual(validateSong(JSON.parse(JSON.stringify(s))),s);
  const old=structuredClone(s);delete old.interpretation;assert.equal(validateSong(old).interpretation,undefined);
});

test('remix retains the scene rather than falling back to its genre template',()=>{
  const s=compose('An upbeat fast boss fight',{seed:7}),next=remix(s,103);
  assert.equal(s.interpretation.genreSource,'scene');
  assert.ok(next.patterns.kick.filter(v=>v>0).length>=5);
  assert.equal(next.patterns.pad[8],.78);assert.equal(next.interpretation.scene,'battle');
});
test('low energy reduces battle density and percussion strength',()=>{
  const high=compose('A boss fight',{seed:18,energy:.95}),low=compose('A boss fight',{seed:18,energy:.2});
  assert.ok(low.patterns.kick.filter(v=>v>0).length<high.patterns.kick.filter(v=>v>0).length);
  assert.ok(low.mix.kick<high.mix.kick);assert.equal(low.energy,.2);
});

test('narrative titles retain the character and action across seeds and style overrides',()=>{
  for(let seed=0;seed<10;seed++)for(const genre of ['Auto','House']){
    const s=compose('Dungeon Crawler Carl enters into a boss fight with upbeat and fast music.',{seed,genre});
    assert.match(s.title,/Dungeon Crawler Carl/);assert.match(s.title,/Boss Fight/);
  }
});
test('titles distinguish different descriptions within the same style',()=>{
  const a=compose('A chase through a frozen forest',{genre:'House',seed:2});
  const b=compose('A chase through a burning city',{genre:'House',seed:2});
  assert.match(a.title,/Frozen Forest/);assert.match(b.title,/Burning City/);assert.notEqual(a.title,b.title);
});
test('titles preserve explicit names, stay bounded and avoid negated cues',()=>{
  assert.equal(compose('Fast music titled "Carl’s Last Stand"').title,'Carl’s Last Stand');
  assert.doesNotMatch(compose('Calm campfire music without drums').title,/Drums/i);
  for(const p of ['海辺の静かな夜','x'.repeat(2000),'House 128 BPM in F major']){const title=compose(p).title;assert.ok(title.length>0&&title.length<=80);assert.doesNotMatch(title,/128|BPM/);}
});
test('saved, imported and manually edited titles remain intact',()=>{
  const s={...compose('Carl enters a boss fight'),title:'My custom name'};
  assert.equal(validateSong(JSON.parse(JSON.stringify(s))).title,s.title);
  assert.equal(remix(s,17).title,'My custom name · variation');
});
test('title variations remain repeatable and descriptive',()=>{
  const prompt='Carl enters a boss fight';
  const titles=[0,1,2,3].map(seed=>compose(prompt,{seed}).title);
  assert.ok(new Set(titles).size>1);assert.equal(titles[0],compose(prompt,{seed:0}).title);
  for(const title of titles){assert.match(title,/Carl/);assert.match(title,/Boss Fight/);}
});

test('batch generation returns 1–5 repeatable independent takes with shared requested settings',()=>{
  const {composeBatch}=require(path.join(build,'song.js'));
  for(const genre of GENRES){const batch=composeBatch('Fast music at 130 BPM in F major',5,{genre,energy:.7,seed:21});assert.equal(batch.length,5);assert.equal(new Set(batch.map(s=>s.id)).size,5);assert.ok(new Set(batch.map(s=>JSON.stringify(s.patterns))).size>1);for(const s of batch){assert.equal(s.bpm,130);assert.equal(s.root,5);assert.equal(s.scale,'major');assert.equal(s.energy,.7);assert.equal(s.genre,genre);}assert.deepEqual(batch,composeBatch('Fast music at 130 BPM in F major',5,{genre,energy:.7,seed:21}));}
  assert.equal(composeBatch('Boss fight',1).length,1);
  for(const n of [0,6,-1,1.5,NaN])assert.throws(()=>composeBatch('Boss fight',n));
});
