const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chrome = 'C:/Users/user/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const port = 9237;
const profile = 'D:/~Pandora.co.ua/pandora-usen/backups/chrome-measure-profile-node';
const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
  `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function main() {
  let version;
  for (let i = 0; i < 60; i += 1) {
    try {
      version = await getJson(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch {
      await wait(100);
    }
  }
  if (!version) throw new Error('Chrome DevTools endpoint not ready');

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  });

  let sessionId = null;
  function call(method, params = {}, useSession = true) {
    id += 1;
    const current = id;
    return new Promise((resolve, reject) => {
      pending.set(current, { resolve, reject });
      const message = { id: current, method, params };
      if (useSession && sessionId) message.sessionId = sessionId;
      ws.send(JSON.stringify(message));
    });
  }

  const created = await call('Target.createTarget', { url: 'about:blank' }, false);
  const attached = await call('Target.attachToTarget', {
    targetId: created.targetId,
    flatten: true
  }, false);
  sessionId = attached.sessionId;

  for (const [width, height] of [[390, 844], [393, 873], [412, 915]]) {
    await call('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: true
    });
    await call('Page.navigate', {
      url: `http://127.0.0.1:8796/backups/contact_verify_v1_04.html?viewport=${width}x${height}#contact`
    });
    await wait(1400);
    const result = await call('Runtime.evaluate', {
      expression: 'document.querySelector("#geometry-output")?.textContent',
      returnByValue: true
    });
    const raw = result.result.value;
    if (!raw) throw new Error(`No geometry for ${width}x${height}`);
    const data = JSON.parse(raw);
    fs.writeFileSync(
      path.join('backups', `geometry_exact_${width}x${height}.json`),
      JSON.stringify(data, null, 2),
      'utf8'
    );
    console.log(JSON.stringify({ viewport: `${width}x${height}`, data }));
  }

  ws.close();
}

main()
  .catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => child.kill());
