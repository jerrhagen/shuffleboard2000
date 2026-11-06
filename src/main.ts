import '@fontsource/michroma/400.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './styles.css';
import { buzz, isMuted, setMuted, sfx, unlockAudio } from './audio';
import { LiveCamera, canUseLiveCamera, fileToPhoto } from './camera';
import { deletePlayer, loadPlayers, readSetting, savePlayer, writeSetting, type Player } from './data/store';
import { drawTeams, matchups, maxTables, type DrawnTable } from './domain/draw';
import type { Stage, StageEvent } from './scene/stage';

const app = document.querySelector<HTMLDivElement>('#app')!;
const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;

let players: Player[] = [];
let tables = Math.max(1, Number(readSetting('tables', '1')) || 1);
let editing = false;
let stage: Stage | null = null;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const active = () => players.filter((player) => player.active);
const effectiveTables = () => Math.min(tables, maxTables(active().length));

function puckHtml(player: Player, extra = ''): string {
  const inner = player.photo
    ? `<img src="${player.photo}" alt="" draggable="false" />`
    : `<span class="initial">${esc(player.name.trim().charAt(0).toUpperCase() || '?')}</span>`;
  return `<span class="puck ${extra}">${inner}</span>`;
}

function logoHtml(): string {
  return `<h1 class="logo" aria-label="Shuffleboard 2000">
    <span class="logo-word" aria-hidden="true">SHUFFLEBOARD</span>
    <span class="logo-year" aria-hidden="true">2000</span>
  </h1>`;
}

function soundIcon(): string {
  return isMuted()
    ? '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
}

// Startsidan

function renderHome(): void {
  app.innerHTML = `
    <main class="home">
      <header class="top">
        ${logoHtml()}
        <button class="icon-button" data-action="sound" aria-label="${isMuted() ? 'Slå på ljudet' : 'Stäng av ljudet'}">${soundIcon()}</button>
      </header>
      <section class="panel roster">
        <div class="panel-head">
          <h2>Spelare <span id="count"></span></h2>
          <button class="text-button" data-action="edit" ${players.length ? '' : 'hidden'}>${editing ? 'Klar' : 'Ändra'}</button>
        </div>
        <p class="hint" id="hint"></p>
        <ul class="grid" id="grid">
          <li><button class="add" data-action="add"><span class="puck add-puck">+</span><span class="name">Ny spelare</span></button></li>
          ${players.map((player, i) => playerItem(player, i)).join('')}
        </ul>
      </section>
      <footer class="panel controls">
        <div class="stepper" role="group" aria-label="Antal bord">
          <button data-action="less" aria-label="Färre bord">−</button>
          <div class="stepper-value"><strong id="tables"></strong><span id="tables-label"></span></div>
          <button data-action="more" aria-label="Fler bord">+</button>
        </div>
        <p class="summary" id="summary"></p>
        <button class="primary" data-action="draw" id="draw"><span>Slumpa lag</span></button>
      </footer>
    </main>`;
  updateHome();
}

function playerItem(player: Player, index: number): string {
  return `<li style="--i:${index}">
    <button class="player ${player.active ? '' : 'out'}" data-action="player" data-id="${player.id}" aria-pressed="${player.active}">
      ${puckHtml(player, editing ? 'wiggle' : '')}
      <span class="name">${esc(player.name)}</span>
    </button>
  </li>`;
}

function updateHome(): void {
  const count = active().length;
  const shown = effectiveTables();
  const set = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('count', players.length ? `${count} av ${players.length} med` : '');
  set('hint', editing ? 'Tryck på en spelare för att ändra namn eller foto.' : players.length ? 'Tryck på en spelare för att sätta hen på bänken.' : 'Börja med att fota minst två spelare.');
  set('tables', String(shown));
  set('tables-label', shown === 1 ? 'bord' : 'bord');
  const lines = count >= 2 ? matchups(count, shown) : [];
  const unique = [...new Set(lines)];
  set('summary', count < 2 ? 'Det behövs minst två spelare' : unique.join(' och ') + (shown > 1 && unique.length === 1 ? ' på varje bord' : ''));
  const draw = document.getElementById('draw') as HTMLButtonElement | null;
  if (draw) draw.disabled = count < 2;
  const less = app.querySelector<HTMLButtonElement>('[data-action="less"]');
  const more = app.querySelector<HTMLButtonElement>('[data-action="more"]');
  if (less) less.disabled = shown <= 1;
  if (more) more.disabled = shown >= maxTables(count);
}

// Spelarkortet med kameran

function openSheet(player: Player | null): void {
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', player ? 'Ändra spelare' : 'Ny spelare');
  sheet.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-head">
        <h2>${player ? 'Ändra spelare' : 'Ny spelare'}</h2>
        <button class="icon-button" data-sheet="close" aria-label="Stäng">✕</button>
      </div>
      <div class="lens">
        <span class="lens-ring"></span>
        <span class="lens-ring two"></span>
        <div class="lens-view">
          <video playsinline muted></video>
          <img class="still" alt="" hidden />
          <div class="lens-empty" hidden>Ingen bild än</div>
          <span class="scan"></span>
        </div>
        <span class="flash"></span>
      </div>
      <p class="sheet-status" role="status"></p>
      <div class="cam-buttons">
        <button class="ghost" data-sheet="flip" hidden>Vänd kameran</button>
        <button class="shutter" data-sheet="shoot" aria-label="Ta foto" hidden></button>
        <button class="ghost" data-sheet="retake" hidden>Ta nytt foto</button>
        <label class="ghost file-pick" hidden>Öppna kameran<input type="file" accept="image/*" capture="user" hidden /></label>
      </div>
      <label class="field">
        <span>Namn</span>
        <input type="text" maxlength="20" autocomplete="off" enterkeyhint="done" value="${player ? esc(player.name) : ''}" />
      </label>
      <div class="sheet-actions">
        <button class="primary small" data-sheet="save"><span>Spara</span></button>
        ${player ? '<button class="ghost danger" data-sheet="delete">Ta bort</button>' : '<button class="ghost" data-sheet="save-next">Spara och nästa</button>'}
      </div>
    </div>`;
  document.body.append(sheet);

  const q = <T extends HTMLElement>(selector: string) => sheet.querySelector<T>(selector)!;
  const video = q<HTMLVideoElement>('video');
  const still = q<HTMLImageElement>('.still');
  const empty = q('.lens-empty');
  const status = q('.sheet-status');
  const flip = q('[data-sheet="flip"]');
  const shoot = q('[data-sheet="shoot"]');
  const retake = q('[data-sheet="retake"]');
  const pick = q('.file-pick');
  const fileInput = q<HTMLInputElement>('input[type="file"]');
  const nameInput = q<HTMLInputElement>('input[type="text"]');
  const camera = new LiveCamera(video);
  let photo = player?.photo ?? null;
  let confirmDelete = false;

  stage?.setPaused(true);

  const showStill = (src: string | null) => {
    still.hidden = !src;
    video.hidden = Boolean(src);
    empty.hidden = Boolean(src);
    if (src) still.src = src;
    flip.hidden = shoot.hidden = true;
    retake.hidden = !src || !canUseLiveCamera();
    pick.hidden = canUseLiveCamera() && !fallback;
  };

  let fallback = false;
  const startCamera = async () => {
    if (!canUseLiveCamera()) return useFallback('Telefonens kamera öppnas i ett eget fönster.');
    still.hidden = true;
    empty.hidden = true;
    video.hidden = false;
    retake.hidden = true;
    status.textContent = 'Startar kameran …';
    try {
      await camera.start();
      status.textContent = '';
      flip.hidden = shoot.hidden = false;
    } catch {
      useFallback('Kameran gick inte att starta här. Tillåt kameran i webbläsaren, eller öppna den nedan.');
    }
  };
  const useFallback = (message: string) => {
    fallback = true;
    status.textContent = message;
    showStill(photo);
    pick.hidden = false;
  };

  const close = () => {
    camera.stop();
    sheet.remove();
    stage?.setPaused(false);
  };

  const save = async (next: boolean) => {
    const name = nameInput.value.trim();
    if (!name) {
      status.textContent = 'Spelaren behöver ett namn.';
      nameInput.focus();
      return;
    }
    const saved: Player = player
      ? { ...player, name, photo }
      : { id: crypto.randomUUID(), name, photo, active: true, createdAt: Date.now() };
    try {
      await savePlayer(saved);
    } catch {
      status.textContent = 'Det gick inte att spara på den här telefonen.';
      return;
    }
    const index = players.findIndex((item) => item.id === saved.id);
    if (index >= 0) players[index] = saved;
    else players.push(saved);
    sfx.tap();
    close();
    renderHome();
    if (next) openSheet(null);
  };

  sheet.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-sheet]');
    if (!button) return;
    unlockAudio();
    switch (button.dataset.sheet) {
      case 'close':
        close();
        break;
      case 'flip':
        status.textContent = '';
        try {
          await camera.flip();
        } catch {
          status.textContent = 'Den andra kameran gick inte att starta.';
        }
        break;
      case 'shoot':
        photo = camera.capture();
        sfx.shutter();
        buzz(25);
        q('.lens').classList.remove('snap');
        void q('.lens').offsetWidth;
        q('.lens').classList.add('snap');
        camera.stop();
        showStill(photo);
        if (!nameInput.value) nameInput.focus();
        break;
      case 'retake':
        photo = null;
        await startCamera();
        break;
      case 'save':
        await save(false);
        break;
      case 'save-next':
        await save(true);
        break;
      case 'delete':
        if (!confirmDelete) {
          confirmDelete = true;
          button.textContent = 'Tryck igen för att ta bort';
          break;
        }
        await deletePlayer(player!.id);
        players = players.filter((item) => item.id !== player!.id);
        if (!players.length) editing = false;
        close();
        renderHome();
        break;
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      photo = await fileToPhoto(file);
      status.textContent = '';
      showStill(photo);
    } catch {
      status.textContent = 'Bilden gick inte att läsa.';
    }
  });

  if (photo) showStill(photo);
  else void startCamera();
}

// Lottningen

const POP_MS = 1400;

function showShow(): HTMLElement {
  const show = document.createElement('div');
  show.className = 'show';
  show.innerHTML = `
    <div class="show-flash"></div>
    <div class="show-top"></div>
    <div class="show-name"></div>
    <button class="ghost show-skip">Hoppa över</button>`;
  document.body.append(show);
  return show;
}

async function runDraw(): Promise<void> {
  const drawn = drawTeams(active(), effectiveTables());
  buzz(20);
  if (!stage || reducedMotion) {
    renderResult(drawn);
    return;
  }
  app.innerHTML = '';
  const show = showShow();
  const top = show.querySelector<HTMLElement>('.show-top')!;
  const nameEl = show.querySelector<HTMLElement>('.show-name')!;
  const flash = show.querySelector<HTMLElement>('.show-flash')!;
  show.querySelector('.show-skip')!.addEventListener('click', () => stage?.skip());
  let nameTimer = 0;

  const onEvent = (event: StageEvent) => {
    switch (event.type) {
      case 'launch':
        top.innerHTML = '<p class="show-title">Puckarna släpps</p>';
        break;
      case 'vortex':
        top.innerHTML = '<p class="show-title hot">Lagen blandas</p>';
        break;
      case 'flash':
        flash.classList.remove('go');
        void flash.offsetWidth;
        flash.classList.add('go');
        break;
      case 'table':
        top.innerHTML = `
          <p class="show-table">Bord ${event.index + 1}</p>
          <p class="show-vs"><span class="red">${esc(event.redName)}</span><em>mot</em><span class="blue">${esc(event.blueName)}</span></p>`;
        break;
      case 'player':
        nameEl.className = `show-name ${event.team}`;
        nameEl.textContent = event.name;
        void nameEl.offsetWidth;
        nameEl.classList.add('in');
        clearTimeout(nameTimer);
        nameTimer = window.setTimeout(() => nameEl.classList.remove('in'), POP_MS);
        break;
      case 'tableDone':
        nameEl.classList.remove('in');
        break;
    }
  };

  await stage.play(drawn, onEvent);
  clearTimeout(nameTimer);
  show.remove();
  renderResult(drawn);
}

function teamHtml(team: 'red' | 'blue', name: string, members: Player[], delay: number): string {
  return `<div class="team ${team}">
    <h3>${esc(name)}</h3>
    <ul>
      ${members
        .map(
          (player, i) => `<li style="--d:${delay + i * 90}ms">
            ${puckHtml(player)}
            <span>${esc(player.name)}</span>
          </li>`,
        )
        .join('')}
    </ul>
  </div>`;
}

function renderResult(drawn: DrawnTable<Player>[]): void {
  app.innerHTML = `
    <main class="result">
      <header class="result-head">
        <h2>Lagen är klara</h2>
        <button class="icon-button" data-action="sound" aria-label="${isMuted() ? 'Slå på ljudet' : 'Stäng av ljudet'}">${soundIcon()}</button>
      </header>
      <div class="tables">
        ${drawn
          .map(
            (table) => `<article class="card" style="--c:${table.index * 180}ms">
              <h3 class="card-title">Bord ${table.index + 1}</h3>
              <div class="match">
                ${teamHtml('red', table.redName, table.red, 200 + table.index * 180)}
                <span class="vs">VS</span>
                ${teamHtml('blue', table.blueName, table.blue, 320 + table.index * 180)}
              </div>
            </article>`,
          )
          .join('')}
      </div>
      <footer class="result-actions">
        <button class="primary" data-action="draw"><span>Slumpa igen</span></button>
        <button class="ghost" data-action="home">Ändra spelare</button>
      </footer>
    </main>`;
}

// Händelser

app.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!button) return;
  unlockAudio();
  switch (button.dataset.action) {
    case 'sound':
      setMuted(!isMuted());
      button.innerHTML = soundIcon();
      button.setAttribute('aria-label', isMuted() ? 'Slå på ljudet' : 'Stäng av ljudet');
      break;
    case 'edit':
      editing = !editing;
      renderHome();
      break;
    case 'add':
      sfx.tap();
      openSheet(null);
      break;
    case 'player': {
      const player = players.find((item) => item.id === button.dataset.id);
      if (!player) break;
      sfx.tap();
      if (editing) {
        openSheet(player);
        break;
      }
      player.active = !player.active;
      button.classList.toggle('out', !player.active);
      button.setAttribute('aria-pressed', String(player.active));
      updateHome();
      void savePlayer(player);
      break;
    }
    case 'less':
    case 'more':
      tables = effectiveTables() + (button.dataset.action === 'more' ? 1 : -1);
      writeSetting('tables', String(tables));
      sfx.tap();
      updateHome();
      break;
    case 'draw':
      await runDraw();
      break;
    case 'home':
      renderHome();
      break;
  }
});

async function start(): Promise<void> {
  try {
    players = await loadPlayers();
  } catch {
    players = [];
  }
  renderHome();
  void navigator.storage?.persist?.();
  try {
    const { Stage } = await import('./scene/stage');
    stage = await Stage.create(canvas);
    canvas.classList.add('on');
  } catch (error) {
    // Utan WebGL fungerar appen ändå: lagen visas direkt, utan showen.
    console.warn('3D-scenen gick inte att starta', error);
  }
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }
}

void start();

