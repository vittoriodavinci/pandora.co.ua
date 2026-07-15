const { spawn } = require('child_process');
const chrome = 'C:/Users/user/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const port = 9241;
const child = spawn(chrome, ['--headless=new','--disable-gpu','--no-sandbox',`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--user-data-dir=D:/~Pandora.co.ua/pandora-usen/backups/chrome-swipe-diagnostic'], {stdio:'ignore'});
const wait = ms => new Promise(r=>setTimeout(r,ms));
async function main(){
 let version; for(let i=0;i<60;i++){try{version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();break}catch{await wait(100)}}
 if(!version) throw Error('CDP unavailable');
 const ws=new WebSocket(version.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let id=0,sessionId; const pending=new Map(); ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id||!pending.has(m.id))return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result)});
 function call(method,params={},session=true){const n=++id;return new Promise((r,j)=>{pending.set(n,{r,j});const m={id:n,method,params};if(session&&sessionId)m.sessionId=sessionId;ws.send(JSON.stringify(m))})}
 const target=await call('Target.createTarget',{url:'about:blank'},false); sessionId=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},false)).sessionId;
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true}); await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await call('Page.navigate',{url:'http://127.0.0.1:8796/index.html?swipe=baseline'}); await wait(1600);
 async function evalv(expression){return (await call('Runtime.evaluate',{expression,returnByValue:true})).result.value}
 async function swipe(label,setup){await evalv(setup);await wait(250);const before=await evalv(`({y:scrollY,hash:location.hash,el:(()=>{const e=document.elementFromPoint(195,650);return e&&e.tagName+'.'+e.className})(),overflow:getComputedStyle(document.documentElement).overflowY+'/'+getComputedStyle(document.body).overflowY,scrollHeight:document.documentElement.scrollHeight})`);await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:700}]});for(const y of [650,600,550,500,450,400,350,300,250,200]){await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y}]});await wait(18)}await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(500);const after=await evalv(`({y:scrollY,hash:location.hash})`);console.log(JSON.stringify({label,before,after,delta:after.y-before.y}));}
 await swipe('hero','scrollTo(0,0)');
 await swipe('about','document.querySelector("#about").scrollIntoView()');
 await swipe('project-center','document.querySelector("#project-intro").scrollIntoView();window.pandoraProjectCarousel.goToCenter()');
 await swipe('project-side','document.querySelector("#project-intro").scrollIntoView();document.querySelector(".apl-arrow-right").click()');
 ws.close();
}
main().catch(e=>{console.error(e.stack);process.exitCode=1}).finally(()=>child.kill());
