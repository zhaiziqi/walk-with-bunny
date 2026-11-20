import { createFloofCanvas } from '/src/scene/floofCompanionArt.ts';
import { createPaperBirdCanvas } from '/src/scene/hillMoon.ts';
import { DURATION, poseAt } from './motion.js';

const $=id=>document.getElementById(id);
const canvas=$('painting'),ctx=canvas.getContext('2d'),world=$('world');
const play=$('play'),timeInput=$('time'),quiet=$('reduced'),status=$('status');
const media=matchMedia('(prefers-reduced-motion: reduce)');
const bird={body:createPaperBirdCanvas('body'),left:createPaperBirdCanvas('leftWing'),right:createPaperBirdCanvas('rightWing')};
const floof=createFloofCanvas();
let assets,seconds=0,playing=false,frame=0,lastFrame=0,width=0,height=0,tagOpen=false,background;
quiet.checked=media.matches;
const image=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('A painted layer could not load. Please refresh.'));img.src=src;});
function shadow(x,y,rx,ry,alpha=.16){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,.04,0,0,1);g.addColorStop(0,`rgba(45,65,64,${alpha})`);g.addColorStop(1,'rgba(45,65,64,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
function cover(target,img,w,h){const ratio=Math.max(w/img.width,h/img.height);target.drawImage(img,(w-img.width*ratio)/2,(h-img.height*ratio)/2,img.width*ratio,img.height*ratio);}
function prepareGround(){
  background=document.createElement('canvas');background.width=width;background.height=height;const c=background.getContext('2d');
  cover(c,assets.ground,width,height);c.fillStyle='rgba(235,240,223,.48)';c.fillRect(0,0,width,height);
  c.globalAlpha=.115;cover(c,assets.grass,width,height);c.globalAlpha=1;
  // One light pool uses the same ground beneath both actors, never a rectangular stage.
  c.save();c.translate(width*.51,height*.63);c.rotate(-.35);c.scale(width*.37,height*.39);const glow=c.createRadialGradient(0,0,.02,0,0,1);glow.addColorStop(0,'rgba(255,246,210,.24)');glow.addColorStop(.6,'rgba(244,237,209,.10)');glow.addColorStop(1,'rgba(240,234,213,0)');c.fillStyle=glow;c.fillRect(-1,-1,2,2);c.restore();
}
function drawBird(p){
  ctx.save();ctx.translate(p.beakX,p.beakY);ctx.rotate(p.rotation*Math.PI/180);
  const scale=.44;ctx.scale(scale,scale);ctx.translate(-146,-107);
  for(const [side,img] of [[-1,bird.left],[1,bird.right]]){ctx.save();ctx.translate(128,126);ctx.rotate(side*p.wing*.34);ctx.scale(1,1-p.wing*.2);ctx.drawImage(img,-128,-126);ctx.restore();}
  ctx.drawImage(bird.body,0,0);ctx.restore();
}
function render(){
  if(!assets||!width)return;const p=poseAt(seconds),dpr=Math.min(devicePixelRatio||1,2);
  // A display/zoom change can alter pixel density without resizing the world.
  // Keep the backing bitmap matched before drawing any scene coordinates.
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(background,0,0);
  const scale=Math.min(width/1350,height/630,1.18),originX=width*.46,originY=height*(height<560?.54:.64);
  ctx.save();ctx.translate(originX,originY);ctx.scale(scale,scale);
  shadow(1,48,91,15,.18);shadow(-130+p.orb.x,43,50,13,.18);shadow(p.bird.beakX+17,p.bird.beakY+41,31,8,.10);
  ctx.drawImage(assets.folio,-74,-40,148,99);
  const paper=p.paper;shadow(paper.x+paper.width*.48,paper.y+paper.height*.73,paper.width*.40,10,.09);
  ctx.drawImage(assets.tissue,paper.x,paper.y,paper.width,paper.height);
  ctx.save();ctx.translate(-134+p.orb.x,-7+p.orb.y);ctx.rotate(p.orb.rotation*Math.PI/180);ctx.scale(p.orb.scaleX,p.orb.scaleY);ctx.drawImage(floof,-65,-65,130,130);ctx.restore();
  drawBird(p.bird);ctx.restore();
  $('birthday').style.opacity=p.titleAlpha;$('tag').hidden=!p.revealed;
  $('tag').style.left=`${originX+22*scale}px`;$('tag').style.top=`${originY+79*scale}px`;
  $('gift-name').style.left=`${originX+22*scale+105}px`;$('gift-name').style.top=`${originY+89*scale}px`;
  if(!p.revealed&&tagOpen){tagOpen=false;updateTag();}
  timeInput.value=seconds;$('clock').textContent=`${seconds.toFixed(1)} / ${DURATION.toFixed(1)}s`;
  world.dataset.phase=p.phase;
  document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(seconds-Number(b.dataset.time))<.1)));
}
function resize(){width=world.clientWidth;height=world.clientHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(assets){prepareGround();render();}}
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;play.textContent=seconds>=DURATION?'Replay the ending':seconds>0?'Continue':'Play the ending';}
function seek(value){stop();seconds=Math.max(0,Math.min(DURATION,value));render();play.textContent=seconds>=DURATION?'Replay the ending':seconds>0?'Continue':'Play the ending';status.textContent=seconds>=DURATION?'The gift is unwrapped. Happy birthday.':`${poseAt(seconds).phase}.`;}
function tick(now){if(!playing)return;seconds=Math.min(DURATION,seconds+(now-lastFrame)/1000);lastFrame=now;render();if(seconds>=DURATION){stop();status.textContent='The gift is unwrapped. Happy birthday.';}else frame=requestAnimationFrame(tick);}
function start(){if(quiet.checked){seek(DURATION);return;}if(playing){stop();return;}if(seconds>=DURATION)seconds=0;playing=true;lastFrame=performance.now();play.textContent='Pause';status.textContent='The paper bird is helping unwrap the gift.';frame=requestAnimationFrame(tick);}
function updateTag(){$('tag').setAttribute('aria-expanded',String(tagOpen));$('tag').setAttribute('aria-label',tagOpen?'Passport holder. Turn the tag back over':'Turn the small paper tag over');$('gift-name').hidden=!tagOpen;}
play.addEventListener('click',start);timeInput.addEventListener('input',()=>seek(Number(timeInput.value)));
document.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>seek(Number(button.dataset.time))));
$('tag').addEventListener('click',()=>{tagOpen=!tagOpen;updateTag();});
quiet.addEventListener('change',()=>seek(quiet.checked?DURATION:0));media.addEventListener('change',()=>{quiet.checked=media.matches;seek(media.matches?DURATION:0);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
new ResizeObserver(resize).observe(world);
window.addEventListener('resize',resize);
Promise.all([image('/art/gifts/dream-ground-v1.png'),image('/art/floof/painted-ground-material-v1.png'),image('./art/folio.png'),image('./art/tissue.png')]).then(([ground,grass,folio,tissue])=>{assets={ground,grass,folio,tissue};$('loading').hidden=true;document.querySelectorAll('.review-controls button,input[type=range]').forEach(e=>e.disabled=false);resize();if(quiet.checked)seek(DURATION);else seek(0);}).catch(error=>{$('loading').textContent=error.message;});
