import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Exercise the actual hook using the same deterministic host approach as the
// pointer checks. This verifies Web Audio scheduling, not audible speaker output.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  stdin: { contents: `export {useGardenSound} from './src/motion/useGardenSound';`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node',
  plugins: [{ name: 'sound-hook-host', setup(builder) {
    builder.onResolve({filter:/^react$/},()=>({path:'react',namespace:'hook-host'}));
    builder.onLoad({filter:/.*/,namespace:'hook-host'},()=>({contents:`const host=globalThis.__soundHookHost; export const useState=(...a)=>host.useState(...a);export const useRef=(...a)=>host.useRef(...a);export const useCallback=(...a)=>host.useCallback(...a);export const useEffect=(...a)=>host.useEffect(...a);`}));
  }}],
});
async function withHook(run, initial = {}) {
  let cursor=0,dirty=true,effects=[],nextTimer=1,options={visible:true,reading:false,moving:false,worldEvents:[],...initial};
  const slots=[],timers=new Map(),contexts=[];
  const equal=(a,b)=>a?.length===b?.length&&a.every((value,i)=>Object.is(value,b[i]));
  const host={result:null,
    useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},
    useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},
    useCallback(callback,dependencies){const i=cursor++;if(!slots[i]||!equal(slots[i].dependencies,dependencies))slots[i]={callback,dependencies};return slots[i].callback;},
    useEffect(callback,dependencies){const i=cursor++;if(!slots[i]||!equal(slots[i].dependencies,dependencies)){const previous=slots[i];slots[i]={dependencies,cleanup:previous?.cleanup};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=callback();});}},
  };
  class Param {
    value=0;events=[];
    cancelScheduledValues(...args){this.events.push({kind:'cancel',args});}
    setTargetAtTime(value,...args){this.value=value;this.events.push({kind:'target',value,args});}
    setValueAtTime(value,...args){this.value=value;this.events.push({kind:'set',value,args});}
    exponentialRampToValueAtTime(value,...args){this.value=value;this.events.push({kind:'ramp',value,args});}
  }
  class Node {
    connections=[];disconnected=false;started=false;stops=[];
    gain=new Param();frequency=new Param();Q=new Param();
    connect(node){this.connections.push(node);return node;}
    disconnect(){this.disconnected=true;}
    start(at){this.started=true;this.startedAt=at;}
    stop(at){this.stops.push(at);}
  }
  class AudioContext {
    state='suspended';currentTime=12;sampleRate=200;destination=new Node();nodes=[];oscillators=[];resumeCalls=0;suspendCalls=0;closeCalls=0;
    constructor(){contexts.push(this);}
    node(){const node=new Node();this.nodes.push(node);return node;}
    createGain(){return this.node();} createBufferSource(){return this.node();}createBiquadFilter(){return this.node();}
    createOscillator(){const node=this.node();this.oscillators.push(node);return node;}
    createBuffer(channels,length){return{getChannelData(){return new Float32Array(length);}};}
    resume(){this.resumeCalls++;this.state='running';return Promise.resolve();}
    suspend(){this.suspendCalls++;this.state='suspended';return Promise.resolve();}
    close(){this.closeCalls++;this.state='closed';return Promise.resolve();}
  }
  const fakeWindow={AudioContext,setTimeout(callback,delay){const id=nextTimer++;timers.set(id,{callback,delay});return id;},clearTimeout(id){timers.delete(id);}};
  const replacements={window:fakeWindow,__soundHookHost:host};
  const saved=Object.fromEntries(Object.keys(replacements).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const[key,value]of Object.entries(replacements))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  const module={exports:{}};new Function('module','exports',bundled.outputFiles[0].text)(module,module.exports);
  const commit=()=>{for(let attempts=0;dirty;attempts++){assert.ok(attempts<20,'hook commit must settle');dirty=false;cursor=0;host.result=module.exports.useGardenSound(options);const pending=effects;effects=[];pending.forEach(effect=>effect());}};
  const flush=async()=>{await Promise.resolve();await Promise.resolve();commit();};
  let unmounted=false;
  const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
  commit();
  const api={contexts,get result(){return host.result;},get notes(){return contexts.flatMap(context=>context.oscillators.filter(node=>node.frequency.value>20));},
    get master(){return contexts.at(-1)?.nodes[0];},
    setOptions(next){options={...options,...next};dirty=true;commit();},
    async toggle(){host.result.toggleSound();commit();await flush();},
    flush,unmount,
    runTimers(){const pending=[...timers.values()];timers.clear();pending.forEach(timer=>timer.callback());commit();},
  };
  try{await run(api);}finally{unmount();for(const[key,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
let checks=0,failures=0;
async function check(name,run){checks++;try{await run();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}\n${error.stack}`);}}
await check('muted encounters never create an audio graph or note',()=>withHook(async h=>{
  h.setOptions({worldEvents:['chime-note-1','chime-note-2']});assert.equal(h.contexts.length,0);assert.equal(h.notes.length,0);assert.equal(h.result.soundOn,false);
}));
await check('explicit enabling starts ambience without replaying past chime events',()=>withHook(async h=>{
  h.setOptions({worldEvents:['chime-note-1']});await h.toggle();assert.equal(h.result.soundOn,true);assert.equal(h.contexts.length,1);assert.equal(h.notes.length,0);assert.equal(h.contexts[0].resumeCalls,1);assert.equal(h.master.gain.value,.12);
}, {worldEvents:['chime-note-0']}));
await check('a new chime strike schedules one quiet two-part response at 880 Hz',()=>withHook(async h=>{
  await h.toggle();h.setOptions({worldEvents:['chime-note-1']});assert.equal(h.notes.length,2);
  assert.deepEqual(h.notes.map(note=>note.frequency.value),[880,880*2.01]);
  for(const note of h.notes){assert.ok(note.started);assert.ok(note.stops[0]>note.startedAt);assert.ok(note.stops[0]-note.startedAt<1.8);}
}));
await check('duplicate events and ordinary rerenders cannot repeat a strike',()=>withHook(async h=>{
  await h.toggle();h.setOptions({worldEvents:['chime-note-1']});h.setOptions({worldEvents:['chime-note-1']});h.setOptions({moving:true});h.setOptions({moving:false});assert.equal(h.notes.length,2);
  h.setOptions({worldEvents:['chime-note-1','chime-note-2']});assert.equal(h.notes.length,4);
}));
await check('reading suppresses new notes and closing the panel does not replay them',()=>withHook(async h=>{
  await h.toggle();h.setOptions({reading:true});assert.equal(h.master.gain.value,.025);h.setOptions({worldEvents:['chime-note-1']});assert.equal(h.notes.length,0);
  h.setOptions({reading:false});assert.equal(h.notes.length,0);assert.equal(h.master.gain.value,.12);
  h.setOptions({worldEvents:['chime-note-1','chime-note-2']});assert.equal(h.notes.length,2);
}));
await check('hiding the page fades and suspends sound until another explicit enable',()=>withHook(async h=>{
  await h.toggle();h.setOptions({visible:false,worldEvents:['chime-note-1']});assert.equal(h.result.soundOn,false);assert.equal(h.master.gain.value,0);h.runTimers();await h.flush();assert.equal(h.contexts[0].state,'suspended');assert.equal(h.notes.length,0);
  h.setOptions({visible:true});assert.equal(h.result.soundOn,false);assert.equal(h.notes.length,0);await h.toggle();assert.equal(h.notes.length,0);assert.equal(h.result.soundOn,true);
}));
await check('turning sound off prevents later strikes and re-enabling skips muted history',()=>withHook(async h=>{
  await h.toggle();h.setOptions({worldEvents:['chime-note-1']});await h.toggle();assert.equal(h.master.gain.value,0);h.runTimers();h.setOptions({worldEvents:['chime-note-1','chime-note-2']});assert.equal(h.notes.length,2);
  await h.toggle();assert.equal(h.notes.length,2);h.setOptions({worldEvents:['chime-note-1','chime-note-2','chime-note-3']});assert.equal(h.notes.length,4);
}));
await check('restoring several events schedules at most one response and no delayed backlog',()=>withHook(async h=>{
  await h.toggle();h.setOptions({worldEvents:['chime-note-1','chime-note-2','chime-note-3']});assert.equal(h.notes.length,2);h.setOptions({worldEvents:['chime-note-1','chime-note-2','chime-note-3']});assert.equal(h.notes.length,2);
}));
await check('non-note arch discovery stays silent and existing discovery tones retain their pitch',()=>withHook(async h=>{
  await h.toggle();h.setOptions({worldEvents:['arch-awake','chime-note-invalid']});assert.equal(h.notes.length,0);
  h.setOptions({worldEvents:['arch-awake','chime-note-invalid','trail-flower-open']});assert.deepEqual(h.notes.map(note=>note.frequency.value),[659.25,659.25*2.01]);
}));
await check('unmount stops voices, disconnects the graph and closes the audio context',()=>withHook(async h=>{
  await h.toggle();h.setOptions({worldEvents:['chime-note-1']});const context=h.contexts[0];h.unmount();await h.flush();assert.equal(context.state,'closed');assert.equal(context.closeCalls,1);assert.ok(context.oscillators.every(node=>node.stops.length>0));assert.ok(context.nodes[0].disconnected);
}));
console.log(`${checks-failures}/${checks} chime sound checks passed.`);if(failures)process.exitCode=1;
