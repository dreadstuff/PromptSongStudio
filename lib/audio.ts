import { TRACKS, type Track, type Song, noteMidi, chordDegree, duration, stepTime, encodeWav, rng, patternForBar, noteBeats, noteDelay } from './song';
const frequency=(midi:number)=>440*2**((midi-69)/12);
export type Progress={step:number;bar:number;elapsed:number};
export class Synth {
  ctx:BaseAudioContext; buses={} as Record<Track,GainNode>; master:GainNode; analyser:AnalyserNode; noise:AudioBuffer; nodes=new Set<AudioScheduledSourceNode>();
  constructor(ctx:BaseAudioContext,s:Song,volume=.65){
    this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=volume*.65;
    const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.15;
    this.analyser=ctx.createAnalyser();this.analyser.fftSize=256;this.master.connect(limiter);limiter.connect(this.analyser);this.analyser.connect(ctx.destination);
    const reverb=ctx.createConvolver(),impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*1.6),ctx.sampleRate),random=rng(s.seed);
    for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*Math.pow(1-i/data.length,3);}
    reverb.buffer=impulse;const wet=ctx.createGain();wet.gain.value=s.sound.reverb;reverb.connect(wet);wet.connect(this.master);
    const delay=ctx.createDelay(2);delay.delayTime.value=60/s.bpm*.75;const feedback=ctx.createGain();feedback.gain.value=.28;const delayWet=ctx.createGain();delayWet.gain.value=s.sound.delay;delay.connect(feedback);feedback.connect(delay);delay.connect(delayWet);delayWet.connect(this.master);
    for(const t of TRACKS){const bus=ctx.createGain();bus.gain.value=s.muted[t]?0:s.mix[t];bus.connect(this.master);if(['lead','pad','snare'].includes(t))bus.connect(reverb);if(t==='lead')bus.connect(delay);this.buses[t]=bus;}
    this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const n=this.noise.getChannelData(0),nr=rng(s.seed+1);for(let i=0;i<n.length;i++)n[i]=nr()*2-1;
  }
  updateMix(s:Song,volume:number){this.master.gain.setTargetAtTime(volume*.65,this.ctx.currentTime,.015);for(const t of TRACKS)this.buses[t].gain.setTargetAtTime(s.muted[t]?0:s.mix[t],this.ctx.currentTime,.015);}
  source(source:AudioScheduledSourceNode,start:number,end:number){this.nodes.add(source);source.onended=()=>{source.disconnect();this.nodes.delete(source);};source.start(start);source.stop(end);}
  tone(track:Track,midi:number,time:number,length:number,type:OscillatorType,level:number,attack=.007,cutoff=6000,detune=0){
    const ctx=this.ctx,osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();osc.type=type;osc.frequency.value=frequency(midi);osc.detune.value=detune;filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,time);filter.frequency.exponentialRampToValueAtTime(Math.max(160,cutoff*.35),time+length);filter.Q.value=track==='bass'?1.2:.6;
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+Math.min(attack,length*.3));gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    osc.connect(filter);filter.connect(gain);gain.connect(this.buses[track]);this.source(osc,time,time+length+.02);
    osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();this.nodes.delete(osc);};
  }
  drum(track:Track,time:number,velocity:number,kit?:Song['sound']['kit']){
    const kits={tight:[170,48,.24,1600,.12,7800,.045],soft:[95,45,.2,1800,.14,4800,.07],retro:[130,48,.3,2100,.22,6200,.045],breakbeat:[155,52,.18,2200,.13,8200,.035],'808':[115,38,.52,2600,.1,8500,.04]};
    const [pitch,endPitch,kickLength,snareCutoff,snareLength,hatCutoff,hatLength]=kit?kits[kit]:[145,44,.32,1400,.17,7200,.055];
    if(track==='kick'){
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.frequency.setValueAtTime(pitch,time);o.frequency.exponentialRampToValueAtTime(endPitch,time+Math.min(.12,kickLength*.5));
      g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(.82*velocity,time+.003);g.gain.exponentialRampToValueAtTime(.0001,time+kickLength);
      o.connect(g);g.connect(this.buses.kick);this.source(o,time,time+kickLength+.02);
      o.onended=()=>{o.disconnect();g.disconnect();this.nodes.delete(o);};return;
    }
    const src=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();
    src.buffer=this.noise;filter.type=kit==='soft'?'bandpass':'highpass';filter.frequency.value=track==='hat'?hatCutoff:snareCutoff;
    const len=track==='hat'?hatLength:snareLength;
    g.gain.setValueAtTime(.0001,time);g.gain.linearRampToValueAtTime(velocity*(track==='hat'?.2:kit==='soft'?.28:.4),time+.002);g.gain.exponentialRampToValueAtTime(.0001,time+len);
    src.connect(filter);filter.connect(g);g.connect(this.buses[track]);this.source(src,time,time+len+.01);
    src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();this.nodes.delete(src);};
    if(track==='snare')this.tone(track,kit==='breakbeat'?58:kit==='808'?64:50,time,kit==='808'?.06:.1,'triangle',velocity*.2);
  }
  step(s:Song,absoluteStep:number,time:number){
    const i=absoluteStep%16,bar=Math.floor(absoluteStep/16),chord=chordDegree(s,bar),beat=60/s.bpm,patterns=patternForBar(s,bar),expression=s.arrangement?.bars[bar]?.expression??1;
    for(const track of TRACKS){
      const v=patterns[track][i],at=time+noteDelay(s,absoluteStep,track);
      if(['kick','snare','hat'].includes(track)){if(v>0)this.drum(track,at,v*expression,s.sound.kit);}
      else if(track==='bass'&&v>=0){
        const length=beat*noteBeats(s,'bass',i,bar);
        this.tone(track,noteMidi(s,chord+v,2),at,length,s.sound.bass==='acid'?'sawtooth':s.sound.bass==='sub'?'sine':'triangle',.5*expression,.008,s.sound.bass==='acid'?1800:700);
      }else if(track==='lead'&&v>=0){
        const midi=noteMidi(s,chord+v,s.performance?.leadOctave??4),length=beat*noteBeats(s,'lead',i,bar);
        const accent=(s.composerVersion===2?(i%4===0?1:.82):1)*expression;
        if(s.sound.lead==='bell'){
          this.tone(track,midi,at,length,'sine',.3*accent);this.tone(track,midi+12,at,s.performance?length*.42:beat*.5,'sine',.08*accent);
        }else if(s.sound.lead==='keys'){
          this.tone(track,midi,at,length,'triangle',.23*accent,.005,2800);
          this.tone(track,midi+12,at,length*.4,'sine',.065*accent,.003,5000);
          this.tone(track,midi+19,at,length*.19,'sine',.02*accent,.002,5000);
        }else if(s.sound.lead==='sine'){
          this.tone(track,midi,at,length,'sine',.3*accent,.16,4000);
        }else if(s.sound.lead==='reed'){
          this.tone(track,midi,at,length,'triangle',.22*accent,.055,2200);
          this.tone(track,midi+19,at,length*.7,'sine',.045*accent,.04,3400);
        }else if(s.sound.lead==='mallet'){
          this.tone(track,midi,at,length*.9,'sine',.32*accent,.002,4800);
          this.tone(track,midi+19,at,length*.22,'sine',.075*accent,.002,6500);
          this.tone(track,midi+28,at,length*.12,'sine',.025*accent,.002,7500);
        }else if(s.sound.lead==='strings'){
          this.tone(track,midi,at,length,'sawtooth',.085*accent,.12,2100,-7);
          this.tone(track,midi,at,length,'triangle',.14*accent,.16,2400,7);
        }else if(s.sound.lead==='supersaw'){
          for(const detune of [-9,0,9])this.tone(track,midi,at,length,'sawtooth',.075*accent,.012,3600,detune);
        }else this.tone(track,midi,at,length,s.sound.lead==='square'?'square':'sawtooth',.2*accent,.008,s.sound.lead==='square'?4000:2800);
      }else if(track==='pad'&&v>0){
        const length=beat*noteBeats(s,'pad',i,bar),keys=s.sound.pad==='keys';
        const inversion=s.arrangement?.bars[bar]?.inversion??0;
        const voicing=(keys?[0,2,4,6]:[0,2,4]).map((degree,index)=>degree+(index<inversion?7:0));
        for(const degree of voicing){
          const midi=noteMidi(s,chord+degree,3);
          this.tone(track,midi,at,length,keys?'triangle':s.sound.pad==='glass'?'sine':'sawtooth',.105*v*expression,keys?.006:.18,keys?2600:1300,keys?0:-4);
          if(!keys)this.tone(track,midi,at,length,'triangle',.08*v*expression,.2,1000,4);
          else this.tone(track,midi+12,at,length*.35,'sine',.025*v*expression,.004,4000);
        }
      }
    }
  }
}
export class Player {
  context:AudioContext|null=null;synth:Synth|null=null;timer:ReturnType<typeof setInterval>|null=null;queue:{time:number;step:number}[]=[];nextStep=0;origin=0;token=0;playing=false;loop=true;song:Song|null=null;volume=.65;
  async start(song:Song,onProgress:(p:Progress)=>void,onEnd:()=>void){
    this.stop();const token=++this.token;
    const Constructor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
    if(!Constructor)throw new Error('This browser cannot play synthesized audio. Try Safari or Chrome.');
    const ctx=new Constructor();this.context=ctx;
    try{await ctx.resume();if(token!==this.token){if(ctx.state!=='closed')await ctx.close();return;}this.song=song;this.synth=new Synth(ctx,song,this.volume);this.origin=ctx.currentTime+.08;this.nextStep=0;this.queue=[];this.playing=true;
      const tick=()=>{
        if(!this.song||!this.synth||ctx.state==='closed')return;
        const total=this.song.bars*16;
        // Skip missed steps after tab throttling instead of bursting old notes.
        if(this.origin+stepTime(this.song,this.nextStep)<ctx.currentTime-.3){this.nextStep=Math.max(0,Math.ceil((ctx.currentTime-this.origin)/(60/this.song.bpm/4)));this.queue=[];}
        while(this.origin+stepTime(this.song,this.nextStep)<ctx.currentTime+.12&&(this.loop||this.nextStep<total)){
          const at=this.origin+stepTime(this.song,this.nextStep);this.synth.step(this.song,this.nextStep%total,Math.max(ctx.currentTime,at));this.queue.push({time:at,step:this.nextStep%total});this.nextStep++;
        }
        while(this.queue.length&&this.queue[0].time<=ctx.currentTime){const q=this.queue.shift()!;onProgress({step:q.step%16,bar:Math.floor(q.step/16),elapsed:Math.max(0,(ctx.currentTime-this.origin)%duration(this.song))});}
        if(!this.loop&&ctx.currentTime>=this.origin+duration(this.song)+2){this.stop();onEnd();}
      };tick();this.timer=setInterval(tick,25);
    }catch(error){if(this.context===ctx)this.stop();throw error;}
  }
  setMix(song:Song,volume:number){this.volume=volume;if(this.song)this.song={...this.song,mix:song.mix,muted:song.muted};this.synth?.updateMix(song,volume);}
  stop(){this.token++;this.playing=false;if(this.timer)clearInterval(this.timer);this.timer=null;this.queue=[];const ctx=this.context;this.context=null;this.synth=null;if(ctx&&ctx.state!=='closed')void ctx.close().catch(()=>{});}
}
export async function renderWav(song:Song,volume=.65,tail=true,onProgress?:(fraction:number)=>void){
  const seconds=duration(song)+(tail?2:0);const ctx=new OfflineAudioContext(2,Math.ceil(seconds*44100),44100);const synth=new Synth(ctx,song,volume);
  const total=song.bars*16,chunk=64;let next=0;
  const schedule=(end:number)=>{for(;next<Math.min(end,total);next++)synth.step(song,next,stepTime(song,next));};
  onProgress?.(0);
  let buffer:AudioBuffer;
  if(total>chunk&&typeof ctx.suspend==='function'&&typeof ctx.resume==='function'){
    // One continuous context preserves effects/tails, while bounding future audio nodes.
    // Schedule each suspension before starting/resuming to avoid racing the render thread.
    schedule(chunk);let pause:Promise<void>|null=ctx.suspend(stepTime(song,next));
    const rendering=ctx.startRendering();
    while(pause){
      await Promise.race([pause,rendering.then(()=>{throw new Error('Audio rendering ended before its next section.');})]);
      onProgress?.(Math.min(.99,ctx.currentTime/seconds));
      schedule(next+chunk);
      pause=next<total?ctx.suspend(stepTime(song,next)):null;
      await ctx.resume();
    }
    buffer=await rendering;
  }else{schedule(total);buffer=await ctx.startRendering();}
  onProgress?.(1);
  return new Blob([encodeWav([buffer.getChannelData(0),buffer.getChannelData(1)],buffer.sampleRate)],{type:'audio/wav'});
}
export function saveFile(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
