'use strict';
const $ = id => document.getElementById(id);
const ROM_PATH = 'roms/goof-troop-usa.sfc';
let loading = false;
let watchdog;
function status(message, error = false) {
  for (const id of ['status', 'play-status']) {
    $(id).textContent = message;
    $(id).classList.toggle('error', error);
  }
}
function fail(message) {
  clearTimeout(watchdog);
  status(message, true);
  $('retry').hidden = false;
}
function requestGameFullscreen() {
  const stage = $('play-stage');
  const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
  if (!request) return;
  try {
    const pending = request.call(stage);
    if (pending?.catch) pending.catch(() => {});
  } catch { /* Full-viewport layout remains active when native fullscreen is unavailable. */ }
}
async function verifyRom() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const url = new URL(ROM_PATH, location.href).href;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('rom');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== 524288) throw new Error('rom');
    const title = new TextDecoder().decode(new Uint8Array(bytes, 0x7fc0, 21));
    if (!title.startsWith('GOOF TROOP')) throw new Error('rom');
    return url;
  } finally { clearTimeout(timer); }
}
$('start').addEventListener('click', async () => {
  if (loading) return;
  loading = true;
  $('start').disabled = true;
  $('play-stage').hidden = false;
  document.body.classList.add('playing');
  // Request inside the click, before asynchronous work loses the user gesture.
  requestGameFullscreen();
  status('Preparando Goof Troop…');
  try {
    const romUrl = await verifyRom();
    window.EJS_player = '#game';
    window.EJS_core = 'snes9x';
    window.EJS_gameUrl = romUrl;
    window.EJS_gameName = 'Goof Troop';
    window.EJS_gameID = 1993001;
    window.EJS_pathtodata = 'emulator/';
    window.EJS_startOnLoaded = true;
    window.EJS_threads = false;
    window.EJS_language = 'pt-BR';
    window.EJS_color = '#ffae59';
    window.EJS_backgroundColor = '#000';
    window.EJS_controlScheme = 'snes';
    window.EJS_Buttons = { saveState: true, loadState: true, gamepad: true, settings: true, cheat: false, screenRecord: false, exitEmulation: false };
    window.EJS_ready = () => status('Emulador pronto. Preparando o jogo…');
    window.EJS_onGameStart = () => {
      clearTimeout(watchdog);
      document.body.classList.add('game-running');
      status('Goof Troop · boa aventura!');
    };
    window.EJS_onExit = () => location.reload();
    status('Carregando o emulador…');
    const script = document.createElement('script');
    script.src = window.EJS_pathtodata + 'loader.js';
    script.onerror = () => fail('Não foi possível carregar o emulador. Toque em Tentar novamente.');
    document.body.appendChild(script);
    watchdog = setTimeout(() => fail('O jogo não iniciou. Confira a conexão e toque em Tentar novamente.'), 60000);
  } catch (error) {
    fail(error.message === 'rom' ? 'O arquivo do jogo não carregou corretamente. Toque em Tentar novamente.' : 'Falha de conexão ao carregar o jogo. Toque em Tentar novamente.');
  }
});
$('home').addEventListener('click', () => location.reload());
$('retry').addEventListener('click', () => location.reload());
$('fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else requestGameFullscreen();
});
$('crt').addEventListener('click', () => {
  const enabled = $('screen').classList.toggle('crt-on');
  $('play-stage').classList.toggle('crt-on', enabled);
  $('crt').setAttribute('aria-pressed', String(enabled));
  $('crt-label').textContent = enabled ? 'ON' : 'OFF';
});
window.addEventListener('error', event => {
  const source = event.filename || event.target?.src || '';
  if (loading && !document.body.classList.contains('game-running') && source.includes('/emulator/')) fail('Não foi possível concluir o carregamento. Toque em Tentar novamente.');
}, true);
