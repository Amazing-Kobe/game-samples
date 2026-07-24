(() => {
  'use strict';

  const games = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let audioContext = null;
  let soundEnabled = readBoolean('fujieda-sound', true);
  let toastTimer = 0;

  function storageGet(key, fallback = null) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readBoolean(key, fallback) {
    const value = storageGet(key, fallback);
    return typeof value === 'boolean' ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function inverseLerp(min, max, value) {
    return max === min ? 0 : clamp((value - min) / (max - min), 0, 1);
  }

  function angleDelta(a, b) {
    return Math.abs((((a - b) + 180) % 360 + 360) % 360 - 180);
  }

  function gradeFor(score) {
    if (score >= 94) return 'S';
    if (score >= 84) return 'A';
    if (score >= 70) return 'B';
    return 'C';
  }

  function scoreLabel(grade) {
    return ({ S: 'PRECISION MASTER', A: 'EXCELLENT CONTROL', B: 'MISSION CLEAR', C: 'KEEP IMPROVING' })[grade] || 'MISSION CLEAR';
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safe / 60);
    return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  function registerGame(game) {
    if (!game || !game.id || typeof game.mount !== 'function') {
      throw new TypeError('A game requires an id and mount(container, services).');
    }
    games.set(game.id, game);
  }

  function getGame(id) {
    return games.get(id);
  }

  function listGames() {
    return [...games.values()];
  }

  function getAudioContext() {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      audioContext = new Context();
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function tone(frequency, duration = .08, delay = 0, type = 'sine', volume = .045, endFrequency = null) {
    if (!soundEnabled) return;
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume), now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .03);
  }

  function noise(duration = .09, delay = 0, volume = .018) {
    if (!soundEnabled) return;
    const context = getAudioContext();
    if (!context) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = 1250;
    filter.Q.value = .8;
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(context.currentTime + delay);
  }

  function sound(name) {
    if (!soundEnabled) return;
    switch (name) {
      case 'hover': tone(520, .035, 0, 'sine', .018); break;
      case 'select': tone(410, .055, 0, 'triangle', .04, 620); break;
      case 'start':
        tone(180, .15, 0, 'sawtooth', .025, 340);
        tone(410, .11, .09, 'triangle', .035, 690);
        break;
      case 'scan': tone(280, .16, 0, 'sine', .028, 920); break;
      case 'lock':
        tone(660, .07, 0, 'sine', .04);
        tone(990, .08, .055, 'sine', .03);
        break;
      case 'cut':
        noise(.15, 0, .025);
        tone(150, .18, 0, 'sawtooth', .025, 90);
        break;
      case 'warning':
        tone(170, .12, 0, 'square', .032);
        tone(150, .12, .14, 'square', .032);
        break;
      case 'error':
        tone(220, .16, 0, 'sawtooth', .04, 110);
        noise(.1, 0, .015);
        break;
      case 'success':
        tone(520, .1, 0, 'sine', .035);
        tone(720, .12, .085, 'sine', .04);
        tone(1040, .18, .17, 'sine', .035);
        break;
      case 'finish':
        tone(392, .11, 0, 'triangle', .035);
        tone(523, .11, .1, 'triangle', .04);
        tone(659, .14, .2, 'triangle', .04);
        tone(784, .28, .31, 'sine', .04);
        break;
      default: tone(440, .06, 0, 'sine', .025);
    }
  }

  function setSoundEnabled(enabled) {
    soundEnabled = Boolean(enabled);
    storageSet('fujieda-sound', soundEnabled);
    if (soundEnabled) sound('select');
    return soundEnabled;
  }

  function isSoundEnabled() {
    return soundEnabled;
  }

  function vibrate(pattern = 18) {
    if ('vibrate' in navigator && !reducedMotion.matches) navigator.vibrate(pattern);
  }

  function announce(message) {
    const region = document.getElementById('liveRegion');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => { region.textContent = message; }, 20);
  }

  function toast(message, duration = 2300) {
    const element = document.getElementById('toast');
    if (!element) return;
    window.clearTimeout(toastTimer);
    element.textContent = message;
    element.classList.add('is-visible');
    toastTimer = window.setTimeout(() => element.classList.remove('is-visible'), duration);
  }

  function burst(target, color = '#53f06b', count = 18) {
    if (reducedMotion.matches) return;
    const layer = document.getElementById('fxLayer');
    if (!layer) return;
    const rect = target && typeof target.getBoundingClientRect === 'function'
      ? target.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement('i');
      const angle = (Math.PI * 2 * index / count) + Math.random() * .35;
      const distance = 30 + Math.random() * 75;
      const size = 2 + Math.random() * 4;
      particle.className = 'fx-particle';
      particle.style.setProperty('--x', `${x}px`);
      particle.style.setProperty('--y', `${y}px`);
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--s', `${size}px`);
      particle.style.setProperty('--c', color);
      layer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 850);
    }
  }

  function saveBest(id, result) {
    const best = storageGet('fujieda-best', {});
    const previous = best[id];
    if (!previous || Number(result.score) > Number(previous.score)) {
      best[id] = { score: Math.round(result.score), grade: result.grade, date: new Date().toISOString() };
      storageSet('fujieda-best', best);
      return true;
    }
    return false;
  }

  function getBest(id) {
    const best = storageGet('fujieda-best', {});
    return best[id] || null;
  }

  function setMeter(element, value, max = 100) {
    if (!element) return;
    const percent = clamp((value / max) * 100, 0, 100);
    element.style.setProperty('--value', `${percent}%`);
  }

  window.FujiedaLab = {
    registerGame,
    getGame,
    listGames,
    sound,
    setSoundEnabled,
    isSoundEnabled,
    vibrate,
    announce,
    toast,
    burst,
    saveBest,
    getBest,
    reducedMotion,
    utils: { clamp, lerp, inverseLerp, angleDelta, gradeFor, scoreLabel, formatTime, setMeter, storageGet, storageSet }
  };
})();
