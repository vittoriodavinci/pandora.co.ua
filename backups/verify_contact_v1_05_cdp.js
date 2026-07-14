const { spawn } = require('child_process');
const fs = require('fs');

const chrome = 'C:/Users/user/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const port = 9238;
const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
  '--user-data-dir=D:/~Pandora.co.ua/pandora-usen/backups/chrome-final-profile'
], { stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  let version;
  for (let i = 0; i < 60; i += 1) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; }
    catch { await wait(100); }
  }
  if (!version) throw new Error('CDP unavailable');
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let id = 0, sessionId = null;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (!m.id || !pending.has(m.id)) return;
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  });
  function call(method, params = {}, session = true) {
    const current = ++id;
    return new Promise((resolve, reject) => {
      pending.set(current, { resolve, reject });
      const m = { id: current, method, params };
      if (session && sessionId) m.sessionId = sessionId;
      ws.send(JSON.stringify(m));
    });
  }
  const target = await call('Target.createTarget', { url: 'about:blank' }, false);
  sessionId = (await call('Target.attachToTarget', { targetId: target.targetId, flatten: true }, false)).sessionId;
  const expr = `(() => {
    const rect = s => { const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect(); return {top:+r.top.toFixed(2),bottom:+r.bottom.toFixed(2),height:+r.height.toFixed(2),visible:r.bottom>0&&r.top<innerHeight}; };
    const controls=[...document.querySelectorAll('#contact .contact-form label input, #contact .contact-form label select, #contact .contact-form label textarea')].map(e=>{const r=e.getBoundingClientRect();return {name:e.name,height:+r.height.toFixed(2),top:+r.top.toFixed(2),bottom:+r.bottom.toFixed(2)};});
    return {viewport:{w:innerWidth,h:innerHeight},hash:location.hash,scrollY:+scrollY.toFixed(2),contact:rect('#contact'),form:rect('#contact .contact-form'),footer:rect('footer'),signalJoin:rect('#signal .final-actions a'),captcha:rect('#contact .pandora-hcaptcha'),submit:rect('#contact .contact-submit'),controls};
  })()`;
  for (const [width,height] of [[390,844],[393,873],[412,915]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await call('Page.navigate',{url:`http://127.0.0.1:8796/index.html?verify=${width}x${height}#contact`});
    await wait(1800);
    const result=await call('Runtime.evaluate',{expression:expr,returnByValue:true});
    const data=result.result.value;
    fs.writeFileSync(`backups/contact_v1_05_${width}x${height}_geometry.json`,JSON.stringify(data,null,2));
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    fs.writeFileSync(`backups/contact_v1_05_${width}x${height}.png`,Buffer.from(shot.data,'base64'));
    console.log(JSON.stringify(data));
  }
  ws.close();
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(()=>child.kill());
