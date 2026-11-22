(() => {
'use strict';

// ---------- Config ----------
const TILE = 48;           // css px per tile
const MAP_W = 48;
const MAP_H = 36;
const PLAYER_SPEED = 4.2;  // tiles / second
const WALL = 1;
const FLOOR = 0;
const STAIRS = 2;

const ENEMY_TYPES = {
  zombie:   { hp: 6, speed: 1.5, dmg: 2, color: '#4f9d3a', dark: '#2f6322', size: 0.4,  reach: 0.9 },
  skeleton: { hp: 4, speed: 2.0, dmg: 1, color: '#d9d9d2', dark: '#8e8e88', size: 0.36, reach: 0.9 },
};

// ---------- Canvas ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0;
let H = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---------- Utils ----------
const rand = () => Math.random();
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
function tileHash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// ---------- Level generation ----------
function generate(level) {
  const g = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(WALL));
  const rooms = [];
  const target = Math.min(5 + level, 12);
  for (let t = 0; t < 400 && rooms.length < target; t++) {
    const w = randInt(5, 9);
    const h = randInt(5, 8);
    const x = randInt(1, MAP_W - w - 1);
    const y = randInt(1, MAP_H - h - 1);
    const overlaps = rooms.some(o =>
      x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y);
    if (overlaps) continue;
    const room = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
    rooms.push(room);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) g[yy][xx] = FLOOR;
    }
  }
  // Connect consecutive rooms with L-shaped corridors.
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) g[a.cy][x] = FLOOR;
    for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) g[y][b.cx] = FLOOR;
  }
  return { g, rooms };
}

// ---------- State ----------
const state = {
  mode: 'title',       // 'title' | 'play' | 'dead'
  level: 1,
  grid: null,
  enemies: [],
  player: null,
  slashes: [],
  toast: '',
  toastT: 0,
  deadAt: 0,
  time: 0,
};

function toast(text, seconds = 2) {
  state.toast = text;
  state.toastT = seconds;
}

function newPlayer() {
  return { x: 0, y: 0, r: 0.35, hp: 20, maxHp: 20, dmg: 3, cd: 0, fx: 0, fy: 1, flash: 0 };
}

function loadLevel(lvl) {
  const { g, rooms } = generate(lvl);
  const start = rooms[0];
  const end = rooms[rooms.length - 1];
  g[end.cy][end.cx] = STAIRS;

  state.grid = g;
  state.level = lvl;
  state.slashes = [];

  const p = state.player;
  p.x = start.cx + 0.5;
  p.y = start.cy + 0.5;
  p.dmg = 3 + Math.floor((lvl - 1) / 2);

  state.enemies = [];
  for (let i = 1; i < rooms.length - 1; i++) {
    const r = rooms[i];
    const n = randInt(1, 1 + Math.floor(lvl / 2));
    for (let k = 0; k < n; k++) {
      const type = rand() < 0.6 ? 'zombie' : 'skeleton';
      const def = ENEMY_TYPES[type];
      const hp = def.hp + Math.floor(lvl / 3);
      state.enemies.push({
        type, def, hp, maxHp: hp, r: def.size, cd: 0.6, flash: 0,
        x: r.x + 0.5 + rand() * (r.w - 1),
        y: r.y + 0.5 + rand() * (r.h - 1),
      });
    }
  }
  toast(`Level ${lvl}`, 2.5);
}

function newGame() {
  state.player = newPlayer();
  state.mode = 'play';
  loadLevel(1);
}

// ---------- Collision ----------
function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return state.grid[ty][tx] === WALL;
}

function blockedAt(x, y, r) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
  const y0 = Math.floor(y - r), y1 = Math.floor(y + r);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(tx, ty)) return true;
    }
  }
  return false;
}

function moveEntity(e, dx, dy) {
  if (dx) {
    const nx = e.x + dx;
    if (!blockedAt(nx, e.y, e.r)) e.x = nx;
  }
  if (dy) {
    const ny = e.y + dy;
    if (!blockedAt(e.x, ny, e.r)) e.y = ny;
  }
}

// ---------- Input ----------
const keys = new Set();
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
let attackQueued = false;
let joy = null;          // {id, ox, oy, x, y}
let attackPointer = null;

function queueAttack() { attackQueued = true; }

function attackButton() {
  return { x: W - 86, y: H - 110, r: 52 };
}

function confirmAction() {
  if (state.mode === 'title') {
    newGame();
  } else if (state.mode === 'dead' && state.time - state.deadAt > 0.8) {
    newGame();
  }
}

window.addEventListener('keydown', e => {
  const dir = KEYMAP[e.code];
  if (dir) { keys.add(dir); e.preventDefault(); }
  if (e.code === 'Space' || e.code === 'KeyJ') { queueAttack(); e.preventDefault(); }
  if (e.code === 'Enter') confirmAction();
});
window.addEventListener('keyup', e => {
  const dir = KEYMAP[e.code];
  if (dir) keys.delete(dir);
});

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  if (state.mode !== 'play') { confirmAction(); return; }
  const b = attackButton();
  if (Math.hypot(e.clientX - b.x, e.clientY - b.y) <= b.r + 14) {
    attackPointer = e.pointerId;
    queueAttack();
    return;
  }
  if (e.clientX < W * 0.6 && !joy) {
    joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  } else {
    queueAttack();
  }
});
canvas.addEventListener('pointermove', e => {
  if (joy && joy.id === e.pointerId) { joy.x = e.clientX; joy.y = e.clientY; }
});
const endPointer = e => {
  if (joy && joy.id === e.pointerId) joy = null;
  if (attackPointer === e.pointerId) attackPointer = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function inputVector() {
  let mx = 0;
  let my = 0;
  if (keys.has('left')) mx -= 1;
  if (keys.has('right')) mx += 1;
  if (keys.has('up')) my -= 1;
  if (keys.has('down')) my += 1;
  if (joy) {
    const dx = joy.x - joy.ox;
    const dy = joy.y - joy.oy;
    const len = Math.hypot(dx, dy);
    if (len > 8) {
      const m = Math.min(len / 60, 1);
      mx += (dx / len) * m;
      my += (dy / len) * m;
    }
  }
  const l = Math.hypot(mx, my);
  if (l > 1) { mx /= l; my /= l; }
  return { mx, my };
}

// ---------- Gameplay ----------
function hurtPlayer(n) {
  const p = state.player;
  p.hp -= n;
  p.flash = 0.15;
  if (p.hp <= 0) {
    p.hp = 0;
    state.mode = 'dead';
    state.deadAt = state.time;
  }
}

function attack() {
  const p = state.player;
  p.cd = 0.4;
  state.slashes.push({ x: p.x + p.fx * 0.7, y: p.y + p.fy * 0.7, ang: Math.atan2(p.fy, p.fx), t: 0.18 });
  for (const e of state.enemies) {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1.6 || d < 0.001) continue;
    if ((dx * p.fx + dy * p.fy) / d < 0.2) continue; // roughly a 160° front arc
    e.hp -= p.dmg;
    e.flash = 0.15;
    moveEntity(e, p.fx * 0.6, p.fy * 0.6);
  }
  const before = state.enemies.length;
  state.enemies = state.enemies.filter(e => e.hp > 0);
  if (state.enemies.length === 0 && before > 0) toast('All clear! Find the stairs.', 2);
}

function update(dt) {
  state.time += dt;
  if (state.toastT > 0) state.toastT -= dt;
  for (const s of state.slashes) s.t -= dt;
  state.slashes = state.slashes.filter(s => s.t > 0);

  if (state.mode !== 'play') {
    attackQueued = false;
    return;
  }

  const p = state.player;
  const { mx, my } = inputVector();
  if (mx || my) {
    const l = Math.hypot(mx, my);
    moveEntity(p, mx * PLAYER_SPEED * dt, my * PLAYER_SPEED * dt);
    p.fx = mx / l;
    p.fy = my / l;
  }
  p.cd = Math.max(0, p.cd - dt);
  p.flash = Math.max(0, p.flash - dt);

  if (attackQueued && p.cd <= 0) attack();
  attackQueued = false;

  for (const e of state.enemies) {
    if (state.mode !== 'play') break;
    e.cd = Math.max(0, e.cd - dt);
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 8 && d > 0.8) {
      const sp = e.def.speed * dt;
      moveEntity(e, (dx / d) * sp, (dy / d) * sp);
    }
    if (d <= e.def.reach && e.cd <= 0) {
      hurtPlayer(e.def.dmg);
      e.cd = 1.0;
    }
  }

  if (state.mode !== 'play') return;

  const tx = Math.floor(p.x);
  const ty = Math.floor(p.y);
  if (state.grid[ty][tx] === STAIRS) {
    if (state.enemies.length === 0) {
      p.hp = Math.min(p.maxHp, p.hp + 5);
      loadLevel(state.level + 1);
    } else if (state.toastT <= 0) {
      toast('Defeat every monster first!', 1.5);
    }
  }
}

// ---------- Rendering ----------
function drawTile(tx, ty) {
  const t = state.grid[ty][tx];
  const px = tx * TILE;
  const py = ty * TILE;
  const n = tileHash(tx, ty);

  if (t === WALL) {
    ctx.fillStyle = n < 0.5 ? '#4b4b52' : '#44444a';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#6a6a72';
    ctx.fillRect(px, py, TILE, 6);
    ctx.fillRect(px, py, 6, TILE);
    ctx.fillStyle = '#2b2b30';
    ctx.fillRect(px, py + TILE - 6, TILE, 6);
    ctx.fillRect(px + TILE - 6, py, 6, TILE);
    if (n > 0.6) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(px + 12, py + 16, 8, 8);
    }
    return;
  }

  ctx.fillStyle = n < 0.5 ? '#7a6a52' : '#73634c';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(px + 4 + Math.floor(n * 20), py + 4 + Math.floor(n * 30) % 30, 10, 6);

  if (t === STAIRS) {
    const cols = ['#9a8f6a', '#7d7352', '#5f5638'];
    for (let i = 0; i < cols.length; i++) {
      const inset = 6 + i * 6;
      ctx.fillStyle = cols[i];
      ctx.fillRect(px + inset, py + inset, TILE - inset * 2, TILE - inset * 2);
    }
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(px + TILE / 2 - 3, py + TILE / 2 - 3, 6, 6);
  }
}

function drawShadow(x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, w, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(p) {
  const px = p.x * TILE;
  const py = p.y * TILE;
  drawShadow(px, py, 14);
  ctx.fillStyle = '#2c3e8f';
  ctx.fillRect(px - 9, py + 2, 7, 12);
  ctx.fillRect(px + 2, py + 2, 7, 12);
  ctx.fillStyle = p.flash > 0 ? '#ff6a6a' : '#3ab0c6';
  ctx.fillRect(px - 11, py - 12, 22, 16);
  ctx.fillStyle = '#e6b98f';
  ctx.fillRect(px - 9, py - 30, 18, 18);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(px - 9, py - 30, 18, 6);
  ctx.fillStyle = '#111';
  const ex = p.fx * 2;
  const ey = p.fy * 2;
  ctx.fillRect(px - 5 + ex, py - 22 + ey, 3, 3);
  ctx.fillRect(px + 2 + ex, py - 22 + ey, 3, 3);
}

function drawEnemy(e) {
  const px = e.x * TILE;
  const py = e.y * TILE;
  drawShadow(px, py, 12);
  ctx.fillStyle = e.def.dark;
  ctx.fillRect(px - 8, py + 8, 6, 8);
  ctx.fillRect(px + 2, py + 8, 6, 8);
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.def.color;
  ctx.fillRect(px - 10, py - 10, 20, 20);
  ctx.fillRect(px - 9, py - 24, 18, 16);
  ctx.fillStyle = '#111';
  ctx.fillRect(px - 6, py - 19, 3, 3);
  ctx.fillRect(px + 3, py - 19, 3, 3);
  if (e.hp < e.maxHp) {
    ctx.fillStyle = '#000';
    ctx.fillRect(px - 14, py - 34, 28, 5);
    ctx.fillStyle = '#e03b3b';
    ctx.fillRect(px - 13, py - 33, 26 * (e.hp / e.maxHp), 3);
  }
}

function drawSlashes() {
  for (const s of state.slashes) {
    const a = s.t / 0.18;
    ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(s.x * TILE, s.y * TILE, 34, s.ang - 1.2, s.ang + 1.2);
    ctx.stroke();
  }
}

function drawWorld() {
  const p = state.player;
  const camX = p.x * TILE - W / 2;
  const camY = p.y * TILE - H / 2;
  ctx.save();
  ctx.translate(-camX, -camY);

  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const x1 = Math.min(MAP_W - 1, Math.floor((camX + W) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const y1 = Math.min(MAP_H - 1, Math.floor((camY + H) / TILE) + 1);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) drawTile(tx, ty);
  }

  const list = [p, ...state.enemies].sort((a, b) => a.y - b.y);
  for (const ent of list) {
    if (ent === p) drawPlayer(ent);
    else drawEnemy(ent);
  }
  drawSlashes();
  ctx.restore();
}

function drawHUD() {
  const p = state.player;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(10, 10, 240, 58);
  ctx.fillStyle = '#000';
  ctx.fillRect(18, 18, 224, 18);
  ctx.fillStyle = '#d1343a';
  ctx.fillRect(19, 19, 222 * (p.hp / p.maxHp), 16);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, 18, 56);
  ctx.fillText(`Level ${state.level}  ·  Monsters ${state.enemies.length}`, 110, 56);

  const b = attackButton();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = p.cd > 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ATK', b.x, b.y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (joy) {
    ctx.beginPath();
    ctx.arc(joy.ox, joy.oy, 60, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    const dx = joy.x - joy.ox;
    const dy = joy.y - joy.oy;
    const len = Math.min(Math.hypot(dx, dy), 60);
    const ang = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.arc(joy.ox + Math.cos(ang) * len, joy.oy + Math.sin(ang) * len, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
  }

  if (state.toastT > 0) {
    ctx.globalAlpha = Math.min(1, state.toastT);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 22px system-ui, sans-serif';
    const w = ctx.measureText(state.toast).width + 32;
    ctx.fillRect(W / 2 - w / 2, H * 0.22 - 22, w, 40);
    ctx.fillStyle = '#ffe27a';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, W / 2, H * 0.22 + 6);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

function drawCenteredLines(lines, startY) {
  ctx.textAlign = 'center';
  let y = startY;
  for (const [text, font, color, gap] of lines) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, W / 2, y);
    y += gap;
  }
  ctx.textAlign = 'left';
}

function drawTitle() {
  ctx.fillStyle = '#14110f';
  ctx.fillRect(0, 0, W, H);
  // decorative blocks
  for (let i = 0; i < 60; i++) {
    const n = tileHash(i, 7);
    ctx.fillStyle = n < 0.5 ? '#2a2623' : '#34302b';
    const s = 30 + Math.floor(n * 60);
    ctx.fillRect((tileHash(i, 1) * W) | 0, (tileHash(i, 2) * H) | 0, s, s);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
  drawCenteredLines([
    ['BLOCKCRAWL DUNGEON', 'bold 44px system-ui, sans-serif', '#ffd34d', 0],
    ['Offline dungeon crawler', '18px system-ui, sans-serif', '#d8d2c6', 0],
  ], H * 0.36);
  drawCenteredLines([
    ['Move: joystick (left side) / WASD · Arrows', '15px system-ui, sans-serif', '#c9c2b4', 26],
    ['Attack: ATK button (right side) / Space / J', '15px system-ui, sans-serif', '#c9c2b4', 26],
    ['Clear each room, reach the stairs, go deeper.', '15px system-ui, sans-serif', '#c9c2b4', 26],
  ], H * 0.5);
  ctx.globalAlpha = pulse;
  drawCenteredLines([
    ['Tap or press Enter to start', 'bold 20px system-ui, sans-serif', '#ffffff', 0],
  ], H * 0.78);
  ctx.globalAlpha = 1;
}

function drawDead() {
  ctx.fillStyle = 'rgba(80,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  const ready = state.time - state.deadAt > 0.8;
  drawCenteredLines([
    ['You were defeated', 'bold 40px system-ui, sans-serif', '#ff8a8a', 0],
    [`Reached level ${state.level}`, '20px system-ui, sans-serif', '#ffffff', 0],
  ], H * 0.4);
  if (ready) {
    drawCenteredLines([
      ['Tap or press Enter to try again', 'bold 18px system-ui, sans-serif', '#ffffff', 0],
    ], H * 0.6);
  }
}

function draw() {
  if (state.mode === 'title') { drawTitle(); return; }
  drawWorld();
  drawHUD();
  if (state.mode === 'dead') drawDead();
}

// ---------- Loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Small hook for automated tests.
window.__dungeon = { state, newGame };
})();
