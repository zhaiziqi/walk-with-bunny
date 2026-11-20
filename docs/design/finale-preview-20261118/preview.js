import { DURATION, poseAt, paperPoint } from './motion.js';
const $=id=>document.getElementById(id);
const canvas=$('painting'),ctx=canvas.getContext('2d'),world=$('world');
const play=$('play'),timeInput=$('time'),quiet=$('reduced'),status=$('status');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let assets,seconds=0,playing=false,frame=0,lastFrame=0,width=0,height=0,tagOpen=false,background;
quiet.checked=media.matches;
const loadImage=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('A painted layer could not load. Please refresh.'));i.src=src;});
function cover(c,img,w,h){const scale=Math.max(w/img.width,h/img.height);c.drawImage(img,(w-img.width*scale)/2,(h-img.height*scale)/2,img.width*scale,img.height*scale);}
function prepareGround(){background=document.createElement('canvas');background.width=Math.ceil(width);background.height=Math.ceil(height);cover(background.getContext('2d'),assets.ground,width,height);}
function shadow(x,y,rx,ry,alpha=.18){ctx.save();ctx.translate(x,y);ctx.rotate(-.13);ctx.scale(rx,ry);const g=ctx.createRadialGradient(.15,-.1,.02,0,0,1);g.addColorStop(0,`rgba(61,67,84,${alpha})`);g.addColorStop(.65,`rgba(61,67,84,${alpha*.3})`);g.addColorStop(1,'rgba(61,67,84,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
// A texture mesh gives the paper a fold rooted beside the gift. Each vertex is
// deterministic, so seeking and reduced motion produce the same exact scene.
function triangle(img,uv,dst){
 const sx=uv.map(p=>p.x*img.width),sy=uv.map(p=>p.y*img.height);
 const dx1=sx[1]-sx[0],dy1=sy[1]-sy[0],dx2=sx[2]-sx[0],dy2=sy[2]-sy[0],det=dx1*dy2-dx2*dy1;
 if(Math.abs(det)<1e-8)return;
 const a=((dst[1].x-dst[0].x)*dy2-(dst[2].x-dst[0].x)*dy1)/det;
 const c=(dx1*(dst[2].x-dst[0].x)-dx2*(dst[1].x-dst[0].x))/det;
 const b=((dst[1].y-dst[0].y)*dy2-(dst[2].y-dst[0].y)*dy1)/det;
 const d=(dx1*(dst[2].y-dst[0].y)-dx2*(dst[1].y-dst[0].y))/det;
 const e=dst[0].x-a*sx[0]-c*sy[0],f=dst[0].y-b*sx[0]-d*sy[0];
 const centre={x:(dst[0].x+dst[1].x+dst[2].x)/3,y:(dst[0].y+dst[1].y+dst[2].y)/3};
 ctx.save();ctx.beginPath();dst.forEach((p,i)=>{const r=Math.hypot(p.x-centre.x,p.y-centre.y)||1;const x=p.x+(p.x-centre.x)*.28/r,y=p.y+(p.y-centre.y)*.28/r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(img,0,0);ctx.restore();
}
function drawPaper(p){const nx=24,ny=12;for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const uv=[{x:i/nx,y:j/ny},{x:(i+1)/nx,y:j/ny},{x:(i+1)/nx,y:(j+1)/ny},{x:i/nx,y:(j+1)/ny}],ds=uv.map(v=>paperPoint(v.x,v.y,p));triangle(assets.paper,[uv[0],uv[1],uv[2]],[ds[0],ds[1],ds[2]]);triangle(assets.paper,[uv[0],uv[2],uv[3]],[ds[0],ds[2],ds[3]]);}}
function drawBird(p){ctx.save();ctx.translate(p.bird.beakX,p.bird.beakY);ctx.rotate(p.bird.rotation*Math.PI/180);const w=260,h=w*assets.bird.height/assets.bird.width;ctx.drawImage(assets.bird,-w*.15,-h*.535,w,h);ctx.restore();}
function render(){if(!assets||!width)return;const p=poseAt(seconds),dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(background,0,0,width,height);
 const scale=Math.min(width/1360,height/710,1.15),ox=width*.47,oy=height*.73;
 ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
 shadow(16,63,180,30,.19);shadow(-213+p.orb.x,53,102,24,.30);shadow(p.bird.beakX+74,p.bird.beakY+65,86,16,.22);
 shadow(-213+p.orb.x,50,69,7,.24);shadow(20,61,105,8,.16);shadow(p.bird.beakX+75,p.bird.beakY+58,49,5,.15);
 ctx.drawImage(assets.gift,-145,-95,410,205);
 drawPaper(p);
 ctx.save();ctx.translate(-207+p.orb.x,52+p.orb.y);ctx.rotate(p.orb.rotation*Math.PI/180);ctx.scale(p.orb.scaleX,p.orb.scaleY);ctx.drawImage(assets.floof,-175,-291,350,350);ctx.restore();
 drawBird(p);ctx.restore();
 $('birthday').style.opacity=p.titleAlpha;$('birthday').setAttribute('aria-hidden',String(p.titleAlpha<.5));$('tag').hidden=!p.revealed;
 $('tag').style.left=`${ox-24*scale}px`;$('tag').style.top=`${oy+41*scale}px`;
 $('gift-name').style.left=`${ox-24*scale-105}px`;$('gift-name').style.top=`${oy+43*scale}px`;
 if(!p.revealed&&tagOpen){tagOpen=false;updateTag();}
 timeInput.value=seconds;$('clock').textContent=`${seconds.toFixed(1)} / ${DURATION.toFixed(1)}s`;world.dataset.phase=p.phase;
 document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(seconds-Number(b.dataset.time))<.08)));
}
function resize(){width=world.clientWidth;height=world.clientHeight;if(assets){prepareGround();render();}}
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;play.textContent=seconds>=DURATION?'Replay the scene':seconds>0?'Continue':'Play the scene';}
function seek(value){stop();seconds=Math.max(0,Math.min(DURATION,value));render();play.textContent=seconds>=DURATION?'Replay the scene':seconds>0?'Continue':'Play the scene';status.textContent=seconds>=DURATION?'The gift is unwrapped. Happy birthday.':`${poseAt(seconds).phase}.`;}
function tick(now){if(!playing)return;seconds=Math.min(DURATION,seconds+(now-lastFrame)/1000);lastFrame=now;render();if(seconds>=DURATION){stop();status.textContent='The gift is unwrapped. Happy birthday.';}else frame=requestAnimationFrame(tick);}
function start(){if(quiet.checked){seek(DURATION);return;}if(playing){stop();return;}if(seconds>=DURATION){seconds=0;tagOpen=false;updateTag();}playing=true;lastFrame=performance.now();play.textContent='Pause';status.textContent='The paper bird is unwrapping the gift.';frame=requestAnimationFrame(tick);}
function updateTag(){$('tag').setAttribute('aria-expanded',String(tagOpen));$('tag').setAttribute('aria-label',tagOpen?'Passport holder. Turn the tag back over':'Turn the small paper tag over');$('gift-name').hidden=!tagOpen;}
play.addEventListener('click',start);timeInput.addEventListener('input',()=>seek(Number(timeInput.value)));
document.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>seek(Number(button.dataset.time))));$('tag').addEventListener('click',()=>{tagOpen=!tagOpen;updateTag();});
quiet.addEventListener('change',()=>seek(quiet.checked?DURATION:0));media.addEventListener('change',()=>{quiet.checked=media.matches;seek(media.matches?DURATION:0);});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
new ResizeObserver(resize).observe(world);window.addEventListener('resize',resize);
Promise.all(['ground','gift-v2','paper','bunny-reference-v4','bird-v2'].map(name=>loadImage(`./art/${name}.png`))).then(([ground,gift,paper,floof,bird])=>{assets={ground,gift,paper,floof,bird};$('loading').hidden=true;document.querySelectorAll('.review-controls button,input[type=range]').forEach(e=>e.disabled=false);resize();seek(quiet.checked?DURATION:0);}).catch(error=>{$('loading').textContent=error.message;});
