/** Browser smoke test for the dependency-free, directly openable static site. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'sbrs-smoke-'));
const port = 9242;
const browser = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  pathToFileURL(resolve('index.html')).href,
], { windowsHide: true, stdio: 'ignore' });
let socket;

try {
  let tab;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      tab = tabs.find(item => item.type === 'page' && item.url.includes('index.html'));
      if (tab) break;
    } catch {}
    await new Promise(done => setTimeout(done, 100));
  }
  assert.ok(tab, 'Chromium opened the local page');

  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  const pending = new Map();
  const errors = [];
  let requestId = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { done, fail } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? fail(Error(message.error.message)) : done(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
    }
  });
  const command = (method, params = {}) => new Promise((done, fail) => {
    const id = ++requestId;
    pending.set(id, { done, fail });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  await command('Runtime.enable');
  await command('Page.enable');
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await evaluate("document.readyState === 'complete' && !!document.querySelector('#spkGrid')")) break;
    await new Promise(done => setTimeout(done, 100));
  }

  const structure = await evaluate(`(() => ({
    styles: document.querySelectorAll('link[href^="styles/"]').length,
    scripts: document.querySelectorAll('script[src^="scripts/"]').length,
    speakers: document.querySelectorAll('#spkGrid .spk').length,
    members: document.querySelectorAll('.committee-list li').length,
    peopleGrid: getComputedStyle(document.querySelector('#spkGrid')).display,
    globeReady: document.querySelector('.hero-stage').classList.contains('gl-on')
  }))()`);
  assert.equal(structure.styles, 7, 'seven named stylesheets load');
  assert.equal(structure.scripts, 10, 'ten named behavior and data scripts load');
  assert.equal(structure.speakers, 12);
  assert.equal(structure.members, 10);
  assert.equal(structure.peopleGrid, 'grid', 'feature CSS applies');
  assert.equal(structure.globeReady, true);

  await evaluate('document.fonts.ready');
  const typography = await evaluate(`(() => ({
    body: getComputedStyle(document.body).fontFamily,
    display: getComputedStyle(document.querySelector('.hero-mark')).fontFamily,
    loaded: [...document.fonts].filter(face => face.status === 'loaded').map(face => face.family)
  }))()`);
  assert.match(typography.body, /Source Sans 3/, 'body uses a humanist reading face');
  assert.match(typography.display, /Fraunces/, 'display headings use the editorial face');
  assert.ok(typography.loaded.includes('Source Sans 3'), 'self-hosted body font loads');
  assert.ok(typography.loaded.includes('Fraunces'), 'self-hosted display font loads');
  assert.match(await evaluate("getComputedStyle(document.querySelector('.spk-name')).fontFamily"), /Fraunces/,
    'speaker names use the editorial face');
  if (process.env.SBRS_CAPTURE) {
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${process.env.SBRS_CAPTURE}-desktop.png`, Buffer.from(shot.data, 'base64'));
  }

  const globeMovement = await evaluate(`(() => {
    const canvas = document.querySelector('#heroCanvas');
    const bounds = canvas.getBoundingClientRect();
    const originalArc = CanvasRenderingContext2D.prototype.arc;
    let venue = null;
    // The venue's 30px halo is drawn once per frame. Capture its projected position.
    CanvasRenderingContext2D.prototype.arc = function(x, y, radius, ...rest) {
      if (Math.abs(radius - 30) < 0.01) venue = { x, y };
      return originalArc.call(this, x, y, radius, ...rest);
    };
    const key = name => canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: name, bubbles: true, cancelable: true
    }));
    const pointer = (target, type, x, y) => target.dispatchEvent(new MouseEvent(type, {
      clientX: x, clientY: y, bubbles: true, cancelable: true
    }));
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    try {
      key('Home');
      const start = { ...venue };
      pointer(canvas, 'pointerdown', x, y);
      pointer(window, 'pointermove', x, y - 50);
      const dragUp = { ...venue };
      pointer(window, 'pointerup', x, y - 50);
      key('Home');
      pointer(canvas, 'pointerdown', x, y);
      pointer(window, 'pointermove', x, y + 50);
      const dragDown = { ...venue };
      pointer(window, 'pointerup', x, y + 50);
      key('Home');
      pointer(canvas, 'pointerdown', x, y);
      pointer(window, 'pointermove', x + 50, y);
      const dragRight = { ...venue };
      pointer(window, 'pointerup', x + 50, y);
      key('Home');
      key('ArrowUp');
      const arrowUp = { ...venue };
      key('Home');
      key('ArrowDown');
      const arrowDown = { ...venue };
      return { start, dragUp, dragDown, dragRight, arrowUp, arrowDown };
    } finally {
      CanvasRenderingContext2D.prototype.arc = originalArc;
    }
  })()`);
  assert.ok(globeMovement.dragUp.y < globeMovement.start.y, 'upward drag moves globe content up');
  assert.ok(globeMovement.dragDown.y > globeMovement.start.y, 'downward drag moves globe content down');
  assert.ok(globeMovement.arrowUp.y < globeMovement.start.y, 'Up arrow moves globe content up');
  assert.ok(globeMovement.arrowDown.y > globeMovement.start.y, 'Down arrow moves globe content down');
  assert.ok(globeMovement.dragRight.x > globeMovement.start.x, 'rightward drag still moves globe content right');

  for (const [width, mobile] of [[1280, false], [375, true], [360, true], [320, true]]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 812, deviceScaleFactor: 1, mobile });
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const overflow = await evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    const offenders = overflow ? await evaluate(`[...document.querySelectorAll('body *')]
      .filter(element => element.getBoundingClientRect().right > innerWidth + 1 && !element.closest('.tbl-scroll'))
      .slice(0, 12).map(element => ({ tag: element.tagName, className: element.className?.baseVal || element.className }))`) : [];
    const sizes = overflow ? await evaluate(`['html','body','.wrap','.tbl-scroll','.tbl'].map(selector => {
      const element = document.querySelector(selector), rect = element.getBoundingClientRect();
      return [selector, rect.left, rect.right, element.clientWidth, element.scrollWidth];
    })`) : [];
    const internals = overflow ? await evaluate(`[...document.querySelectorAll('body *')]
      .filter(element => element.scrollWidth > element.clientWidth + 1 && !element.closest('.tbl-scroll'))
      .slice(0, 12).map(element => [element.tagName, element.className?.baseVal || element.className,
        element.clientWidth, element.scrollWidth])`) : [];
    assert.equal(overflow, 0, `no horizontal overflow at ${width}px: ${JSON.stringify({offenders,sizes,internals})}`);
  }
  if (process.env.SBRS_CAPTURE) {
    await evaluate("document.querySelector('#hosts').scrollIntoView({ behavior: 'instant' })");
    await evaluate('new Promise(resolve => setTimeout(resolve, 850))');
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${process.env.SBRS_CAPTURE}-hosts-small.png`, Buffer.from(shot.data, 'base64'));
    await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
  }
  if (process.env.SBRS_CAPTURE) {
    await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate("document.querySelector('#speakers').scrollIntoView({ behavior: 'instant' })");
    await evaluate('new Promise(resolve => setTimeout(resolve, 850))');
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${process.env.SBRS_CAPTURE}-speakers.png`, Buffer.from(shot.data, 'base64'));
    await evaluate('window.scrollTo(0, 0)');
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  if (process.env.SBRS_CAPTURE) {
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${process.env.SBRS_CAPTURE}-mobile.png`, Buffer.from(shot.data, 'base64'));
  }
  const menu = await evaluate(`(() => {
    const toggle = document.querySelector('#navToggle');
    toggle.click();
    const opened = toggle.getAttribute('aria-expanded');
    document.querySelector('#nav a[href="#speakers"]').click();
    return { opened, closed: toggle.getAttribute('aria-expanded'), hash: location.hash };
  })()`);
  assert.deepEqual(menu, { opened: 'true', closed: 'false', hash: '#speakers' });

  const filter = await evaluate(`(() => {
    document.querySelector('[data-filter="china"]').click();
    const china = [...document.querySelectorAll('#spkGrid .spk')].filter(card => !card.hidden).length;
    document.querySelector('[data-filter="all"]').click();
    return { china, all: [...document.querySelectorAll('#spkGrid .spk')].filter(card => !card.hidden).length };
  })()`);
  assert.deepEqual(filter, { china: 2, all: 12 });

  const form = await evaluate(`(() => {
    document.querySelector('[data-open="register"]').click();
    const dialog = document.querySelector('#dlgRegister');
    dialog.querySelector('[type="submit"]').click();
    return { opened: dialog.open, invalid: dialog.querySelectorAll('[aria-invalid="true"]').length };
  })()`);
  assert.equal(form.opened, true);
  assert.ok(form.invalid > 0, 'empty form shows validation');
  assert.deepEqual(errors, [], 'no browser JavaScript errors');
  console.log('Static site smoke test passed');
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
}
