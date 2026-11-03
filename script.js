
const $ = (id) => document.getElementById(id);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const KB_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const BUBBLE_SIZE = 56;     
const MIN_BUBBLES = 5;       
const MAX_BUBBLES = 10;
const POINTS_PER_POP = 10;
const POPS_PER_LEVEL = 5;    

const BUBBLE_CFG = {
  easy:   { label: 'Easy',   speed: 45, base: 5, interval: 1300, missLimit: 8,  penalty: 1 },
  medium: { label: 'Medium', speed: 55, base: 5, interval: 1300, missLimit: 10, penalty: 1 },
  hard:   { label: 'Hard',   speed: 68, base: 6, interval: 1100, missLimit: 8,  penalty: 2 }
};

const MAGNET_CFG = {
  easy:   { label: 'Easy',   duration: 60, keyLimit: 0,    hint: true,  wrong: 2, bonus: false },
  medium: { label: 'Medium', duration: 45, keyLimit: 3000, hint: true,  wrong: 3, bonus: true  },
  hard:   { label: 'Hard',   duration: 30, keyLimit: 1800, hint: false, wrong: 5, bonus: true  }
};

/* Key sets for Mode B - the chosen set changes the targets generated */
const KEY_SETS = {
  home:   { label: 'Home row',    keys: ['A', 'S', 'D', 'F', 'J', 'K', 'L'] },
  top:    { label: 'Top row',     keys: 'QWERTYUIOP'.split('') },
  bottom: { label: 'Bottom row',  keys: 'ZXCVBNM'.split('') },
  all:    { label: 'All letters', keys: ALPHABET }
};

const DIFF_HINTS = {
  easy: [
    '<b>Bubbles:</b> slow bubbles, 5 at a time, 8 misses allowed, small penalty (-1)',
    '<b>KeyMagnet:</b> 60 seconds, target is highlighted on the keyboard, no per-key limit'
  ],
  medium: [
    '<b>Bubbles:</b> a bit faster, 5 at a time, 10 misses allowed, penalty -1',
    '<b>KeyMagnet:</b> 45 seconds, target highlighted, 3 seconds per key, speed bonus'
  ],
  hard: [
    '<b>Bubbles:</b> faster bubbles, 6 at a time, 8 misses allowed, penalty -2',
    '<b>KeyMagnet:</b> 30 seconds, <b>no keyboard hint</b>, 1.8 seconds per key, speed bonus'
  ]
};

const app = {
  mode: null,            
  difficulty: 'medium',
  keySet: 'home',
  status: 'idle',        
  rafId: null,           
  intervalId: null,      
  game: null             
};

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(name).classList.add('active');
}

function setHud(items) {
  items.forEach(([label, value], i) => {
    $('hudL' + (i + 1)).textContent = label;
    $('hudV' + (i + 1)).textContent = value;
  });
}

function setFeedback(type, text) {
  const el = $('feedback');
  el.className = 'feedback ' + type;
  el.innerHTML = text || '&nbsp;';
}

function restartAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

function flashStage(type) {              
  restartAnimation($('stage'), 'flash-' + type);
}

function flashKey(letter, type) {        
  const k = document.querySelector(`.key[data-key="${letter}"]`);
  if (k) restartAnimation(k, type);
}

function updateButtons() {
  $('btnStart').disabled = app.status === 'running';
}

function getBest(key) {
  try { return parseInt(localStorage.getItem('typerush-best-' + key), 10) || 0; }
  catch (e) { return 0; }
}
function setBest(key, value) {
  try { localStorage.setItem('typerush-best-' + key, String(value)); } catch (e) { /* ignore */ }
}

function buildKeyboard() {
  const kb = $('keyboard');
  kb.innerHTML = '';
  KB_ROWS.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    row.split('').forEach((ch) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.dataset.key = ch;
      b.textContent = ch;
      b.tabIndex = -1;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleKey(ch);
      });
      rowEl.appendChild(b);
    });
    kb.appendChild(rowEl);
  });
}

function clearKeyboardMarks() {
  document.querySelectorAll('.key').forEach((k) => k.classList.remove('target', 'good', 'bad'));
}

function stopAll() {
  if (app.rafId !== null) { cancelAnimationFrame(app.rafId); app.rafId = null; }
  if (app.intervalId !== null) { clearInterval(app.intervalId); app.intervalId = null; }
}

function enterMode(mode) {
  app.mode = mode;
  const isBubbles = mode === 'bubbles';

  $('modeTitle').textContent = isBubbles ? 'Bubbles' : 'KeyMagnet';
  const diffLabel = (isBubbles ? BUBBLE_CFG : MAGNET_CFG)[app.difficulty].label;
  $('diffBadge').textContent = isBubbles ? diffLabel : `${diffLabel} \u00B7 ${KEY_SETS[app.keySet].label}`;

  $('bubbleArea').classList.toggle('hidden', !isBubbles);
  $('magnetArea').classList.toggle('hidden', isBubbles);

  const set = KEY_SETS[app.keySet].keys;
  document.querySelectorAll('.key').forEach((k) => {
    k.classList.toggle('in-set', !isBubbles && set.includes(k.dataset.key));
  });

  showScreen('game');
  startGame();
}

function startGame() {
  stopAll();                 
  resetState();             
  app.status = 'running';
  updateButtons();
  $('overlay').classList.add('hidden');

  if (app.mode === 'bubbles') startBubbles();
  else startMagnet();
}

function resetGame() {
  stopAll();
  app.status = 'idle';
  resetState();
  $('overlay').classList.remove('hidden');
  $('overlayText').innerHTML = 'Game reset. Press <b>Start</b> to play again';
  updateButtons();
}

function goHome() {
  stopAll();
  app.status = 'idle';
  app.game = null;
  showScreen('home');
}

function resetState() {
  $('bubbleArea').innerHTML = '';
  clearKeyboardMarks();
  $('keyTimerFill').style.width = '100%';
  $('targetLetter').textContent = '?';
  $('targetLetter').className = 'target-letter';
  setFeedback('', '');

  if (app.mode === 'bubbles') {
    app.game = {
      score: 0, popped: 0, wrong: 0, misses: 0, level: 1,
      speed: BUBBLE_CFG[app.difficulty].speed,
      bubbles: [], lastSpawn: 0, lastTime: 0, startTime: 0
    };
  } else {
    app.game = {
      score: 0, correct: 0, incorrect: 0, timeouts: 0,
      times: [], target: null, shownAt: 0, endAt: 0, timeLeft: MAGNET_CFG[app.difficulty].duration * 1000
    };
  }
  updateHud();
}

function updateHud() {
  const g = app.game;
  if (!g) return;
  if (app.mode === 'bubbles') {
    const cfg = BUBBLE_CFG[app.difficulty];
    setHud([
      ['Score', g.score],
      ['Misses', `${g.misses} / ${cfg.missLimit}`],
      ['Level', g.level],
      ['Wrong keys', g.wrong]
    ]);
  } else {
    const avg = g.times.length ? Math.round(g.times.reduce((a, b) => a + b, 0) / g.times.length) + ' ms' : '-';
    setHud([
      ['Score', g.score],
      ['Time left', Math.ceil(g.timeLeft / 1000) + 's'],
      ['Correct / Wrong', `${g.correct} / ${g.incorrect}`],
      ['Avg response', avg]
    ]);
  }
}

function handleKey(letter) {
  if (app.status !== 'running') return;
  if (app.mode === 'bubbles') handleBubbleKey(letter);
  else handleMagnetKey(letter);
}

function endGame(title, reason) {
  stopAll();
  app.status = 'over';
  updateButtons();

  const g = app.game;
  const pct = (a, b) => (a + b === 0 ? '0%' : Math.round((a / (a + b)) * 100) + '%');
  let stats = [];
  let bestKey;

  if (app.mode === 'bubbles') {
    const secs = ((performance.now() - g.startTime) / 1000).toFixed(1);
    bestKey = 'bubbles-' + app.difficulty;
    stats = [
      ['Difficulty', BUBBLE_CFG[app.difficulty].label],
      ['Bubbles popped', g.popped],
      ['Wrong key presses', g.wrong],
      ['Misses', g.misses],
      ['Accuracy', pct(g.popped, g.wrong)],
      ['Level reached', g.level],
      ['Time survived', secs + 's']
    ];
  } else {
    const avg = g.times.length ? Math.round(g.times.reduce((a, b) => a + b, 0) / g.times.length) + ' ms' : '-';
    const fastest = g.times.length ? Math.round(Math.min(...g.times)) + ' ms' : '-';
    bestKey = `magnet-${app.difficulty}-${app.keySet}`;
    stats = [
      ['Difficulty', MAGNET_CFG[app.difficulty].label],
      ['Key set', KEY_SETS[app.keySet].label],
      ['Correct responses', g.correct],
      ['Incorrect responses', g.incorrect],
      ['Timeouts', g.timeouts],
      ['Accuracy', pct(g.correct, g.incorrect)],
      ['Average response', avg],
      ['Fastest response', fastest]
    ];
  }

  const best = getBest(bestKey);
  if (g.score > best) { setBest(bestKey, g.score); $('resBest').textContent = '\u2605 New high score!'; }
  else { $('resBest').textContent = 'Best score for this setting: ' + best; }

  $('resTitle').textContent = title;
  $('resReason').textContent = reason;
  $('resScore').textContent = g.score;
  $('resStats').innerHTML = stats
    .map(([label, value]) => `<div class="stat"><span>${label}</span><b>${value}</b></div>`)
    .join('');

  showScreen('results');
}

function startBubbles() {
  const g = app.game;
  const cfg = BUBBLE_CFG[app.difficulty];
  const h = $('bubbleArea').clientHeight;

  g.startTime = performance.now();
  g.lastTime = g.startTime;
  g.lastSpawn = g.startTime;

  const step = (h - 120) / cfg.base;
  for (let i = 0; i < cfg.base; i++) spawnBubble(h - 60 - i * step);

  setFeedback('info', 'Pop the bubbles! Type the letter you see.');
  app.rafId = requestAnimationFrame(bubbleLoop);
}

function pickLetter(exclude) {
  const pool = ALPHABET.filter((c) => !exclude.includes(c));  // unique letters on screen
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnBubble(startY) {
  const g = app.game;
  const field = $('bubbleArea');
  const w = field.clientWidth;
  const y = startY === undefined ? field.clientHeight - 40 : startY;

  let x = 6;
  for (let t = 0; t < 15; t++) {
    x = 6 + Math.random() * Math.max(10, w - BUBBLE_SIZE - 12);
    const clash = g.bubbles.some((b) =>
      Math.abs(b.x - x) < BUBBLE_SIZE + 6 && Math.abs(b.y - y) < BUBBLE_SIZE + 6);
    if (!clash) break;
  }

  const letter = pickLetter(g.bubbles.map((b) => b.letter));
  const el = document.createElement('div');
  el.className = 'bubble';
  el.style.setProperty('--hue', Math.floor(Math.random() * 360));
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.innerHTML = `<div class="bubble-body">${letter}</div>`;
  field.appendChild(el);
  g.bubbles.push({ el, letter, x, y });
}

function removeBubble(index, popped) {
  const [b] = app.game.bubbles.splice(index, 1);
  b.el.classList.add(popped ? 'pop' : 'missed');
  b.el.querySelector('.bubble-body')
    .addEventListener('animationend', () => b.el.remove(), { once: true });
}


function bubbleLoop(ts) {
  if (app.status !== 'running' || app.mode !== 'bubbles') return;   

  const g = app.game;
  const cfg = BUBBLE_CFG[app.difficulty];
  const dt = Math.min((ts - g.lastTime) / 1000, 0.05);   
  g.lastTime = ts;

  for (let i = g.bubbles.length - 1; i >= 0; i--) {
    const b = g.bubbles[i];
    b.y -= g.speed * dt;
    if (b.y <= 0) {
      removeBubble(i, false);
      g.misses++;
      flashStage('bad');
      setFeedback('bad', `Missed "${b.letter}"! (${g.misses}/${cfg.missLimit})`);
    } else {
      b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
    }
  }

  updateHud();

  if (g.misses >= cfg.missLimit) {
    endGame('Game Over', `You reached the miss limit (${cfg.missLimit}).`);
    return;
  }

  const wanted = Math.min(MAX_BUBBLES, cfg.base + g.level - 1);
  if (g.bubbles.length < MIN_BUBBLES) {
    while (g.bubbles.length < MIN_BUBBLES) spawnBubble();
    g.lastSpawn = ts;
  } else if (g.bubbles.length < wanted && ts - g.lastSpawn >= cfg.interval) {
    spawnBubble();
    g.lastSpawn = ts;
  }

  app.rafId = requestAnimationFrame(bubbleLoop);
}

function handleBubbleKey(letter) {
  const g = app.game;
  const cfg = BUBBLE_CFG[app.difficulty];
  const matches = g.bubbles.filter((b) => b.letter === letter);

  if (matches.length) {
    // pop the bubble that is closest to the top (most urgent)
    const target = matches.reduce((a, b) => (a.y < b.y ? a : b));
    removeBubble(g.bubbles.indexOf(target), true);
    g.score += POINTS_PER_POP;
    g.popped++;
    flashStage('good');
    flashKey(letter, 'good');
    setFeedback('good', `\u2714 Nice! +${POINTS_PER_POP}`);

    if (g.popped % POPS_PER_LEVEL === 0) {
      g.level++;
      g.speed = Math.min(cfg.speed * 1.8, cfg.speed * (1 + 0.06 * (g.level - 1)));
      setFeedback('info', `\u2B06 Level ${g.level}! Bubbles are faster and more numerous.`);
    }
  } else {
  
    g.wrong++;
    g.score = Math.max(0, g.score - cfg.penalty);
    flashStage('bad');
    flashKey(letter, 'bad');
    setFeedback('bad', `\u2716 No "${letter}" on screen! -${cfg.penalty}`);
  }
  updateHud();
}

function startMagnet() {
  const g = app.game;
  const cfg = MAGNET_CFG[app.difficulty];

  g.endAt = performance.now() + cfg.duration * 1000;
  nextTarget();
  setFeedback('info', cfg.hint ? 'Press the highlighted key!' : 'No hints on Hard - find the key yourself!');

  // ONE timer drives the countdown and the per-key time limit
  app.intervalId = setInterval(magnetTick, 50);
}

function nextTarget() {
  const g = app.game;
  const keys = KEY_SETS[app.keySet].keys;       // targets come from a JS array
  let t;
  do {
    t = keys[Math.floor(Math.random() * keys.length)];
  } while (keys.length > 1 && t === g.target);  // never repeat the same key twice

  g.target = t;
  g.shownAt = performance.now();
  $('targetLetter').textContent = t;
  $('keyTimerFill').style.width = '100%';

  document.querySelectorAll('.key').forEach((k) => k.classList.remove('target'));
  if (MAGNET_CFG[app.difficulty].hint) {
    const k = document.querySelector(`.key[data-key="${t}"]`);
    if (k) k.classList.add('target');
  }
}

function magnetTick() {
  if (app.status !== 'running' || app.mode !== 'magnet') return;   // safety guard

  const g = app.game;
  const cfg = MAGNET_CFG[app.difficulty];
  const now = performance.now();

  g.timeLeft = Math.max(0, g.endAt - now);

  if (cfg.keyLimit > 0) {
    const used = now - g.shownAt;
    $('keyTimerFill').style.width = Math.max(0, 100 - (used / cfg.keyLimit) * 100) + '%';
    if (used >= cfg.keyLimit) {
      g.incorrect++;
      g.timeouts++;
      g.score = Math.max(0, g.score - cfg.wrong);
      flashStage('bad');
      setFeedback('bad', `\u23F1 Too slow! -${cfg.wrong}`);
      nextTarget();
    }
  } else {
    $('keyTimerFill').style.width = (g.timeLeft / (cfg.duration * 1000)) * 100 + '%';
  }

  updateHud();

  // completion condition: the round timer reaches zero
  if (g.timeLeft <= 0) {
    endGame("Time's Up!", `The ${cfg.duration}-second round is complete.`);
  }
}

function handleMagnetKey(letter) {
  const g = app.game;
  const cfg = MAGNET_CFG[app.difficulty];
  const elapsed = performance.now() - g.shownAt;
  const box = $('targetLetter');

  if (letter === g.target) {
    let pts = 10;
    let msg = '\u2714 Correct!';
    if (cfg.bonus && elapsed < 1000) { pts += 5; msg += ' Speed bonus!'; }
    g.score += pts;
    g.correct++;
    g.times.push(elapsed);
    flashKey(letter, 'good');
    flashStage('good');
    restartAnimation(box, 'ok');
    setFeedback('good', `${msg} +${pts} (${Math.round(elapsed)} ms)`);
    nextTarget();
  } else {
    g.incorrect++;
    g.score = Math.max(0, g.score - cfg.wrong);
    flashKey(letter, 'bad');
    flashStage('bad');
    restartAnimation(box, 'err');
    setFeedback('bad', `\u2716 You pressed ${letter}, target is ${g.target}. -${cfg.wrong}`);
  }
  updateHud();
}

document.addEventListener('keydown', (e) => {
  if (app.status !== 'running' || e.repeat) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) return;
  const k = e.key.toUpperCase();
  if (!/^[A-Z]$/.test(k)) return;
  e.preventDefault();
  handleKey(k);
});

$('difficultyPicker').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  app.difficulty = btn.dataset.level;
  document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
  $('difficultyHint').innerHTML = DIFF_HINTS[app.difficulty].map((t) => `<li>${t}</li>`).join('');
});

$('keySetSelect').addEventListener('change', (e) => { app.keySet = e.target.value; });
$('startBubbles').addEventListener('click', () => enterMode('bubbles'));
$('startMagnet').addEventListener('click', () => enterMode('magnet'));

const bindBtn = (id, fn) => $(id).addEventListener('click', (e) => { e.currentTarget.blur(); fn(); });
bindBtn('btnStart', () => { if (app.status !== 'running') startGame(); });
bindBtn('btnRestart', startGame);
bindBtn('btnReset', resetGame);
bindBtn('btnHome', goHome);

bindBtn('btnPlayAgain', () => { showScreen('game'); startGame(); });
bindBtn('btnResultsHome', goHome);

buildKeyboard();
$('difficultyHint').innerHTML = DIFF_HINTS[app.difficulty].map((t) => `<li>${t}</li>`).join('');