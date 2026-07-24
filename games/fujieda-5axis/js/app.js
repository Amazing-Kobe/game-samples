(() => {
  'use strict';

  const Lab = window.FujiedaLab;
  const hubView = document.getElementById('hubView');
  const gameView = document.getElementById('gameView');
  const gameMount = document.getElementById('gameMount');
  const gameBackdrop = document.getElementById('gameBackdrop');
  const gameTitle = document.getElementById('currentGameTitle');
  const gameIndex = document.getElementById('currentGameIndex');
  const gameKicker = document.getElementById('currentGameKicker');
  const soundToggle = document.getElementById('soundToggle');
  const dialog = document.getElementById('systemDialog');
  const dialogKicker = document.getElementById('dialogKicker');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogBody = document.getElementById('dialogBody');
  const dialogActions = document.getElementById('dialogActions');
  const dialogClose = dialog.querySelector('[data-dialog="close"]');
  const hubSlides = [...document.querySelectorAll('[data-hub-id]')];
  const hubTabs = [...document.querySelectorAll('[data-hub-target]')];
  const hubOrder = hubSlides.map((slide) => slide.dataset.hubId);
  const hubDock = document.querySelector('.hub-version-dock');
  const hubAutoplayToggle = document.querySelector('[data-action="autoplay"]');

  let currentGame = null;
  let currentId = null;
  let lastTrigger = null;
  let hasStarted = false;
  let dialogOnDismiss = null;
  let dialogActionChosen = false;
  let dialogLocked = false;
  let hubSelection = hubOrder[0] || 'command';
  let hubAutoplayEnabled = !Lab.reducedMotion.matches;
  let hubAutoplayPointerHeld = false;
  let hubAutoplayFocusHeld = false;
  let hubAutoplayTimer = 0;

  const services = {
    finish: finishGame,
    sound: Lab.sound,
    vibrate: Lab.vibrate,
    announce: Lab.announce,
    toast: Lab.toast,
    burst: Lab.burst,
    reducedMotion: Lab.reducedMotion,
    utils: Lab.utils
  };

  function updateSoundButton() {
    const enabled = Lab.isSoundEnabled();
    soundToggle.setAttribute('aria-pressed', String(enabled));
    soundToggle.setAttribute('aria-label', enabled ? 'サウンドをオフにする' : 'サウンドをオンにする');
  }

  function updateBestScores() {
    document.querySelectorAll('[data-best]').forEach((element) => {
      const best = Lab.getBest(element.dataset.best);
      element.textContent = best ? `BEST ${best.grade} / ${best.score}` : 'BEST —';
    });
  }

  function themeFor(game) {
    return game && game.theme ? game.theme : '#53f06b';
  }

  function canRunHubAutoplay() {
    return hubAutoplayEnabled && !hubAutoplayPointerHeld && !hubAutoplayFocusHeld && !currentGame && !hubView.hidden && !dialog.open && !document.hidden;
  }

  function updateHubAutoplayUI() {
    const running = canRunHubAutoplay();
    hubDock?.classList.toggle('is-autoplay', running);
    if (!hubAutoplayToggle) return;
    hubAutoplayToggle.setAttribute('aria-pressed', String(hubAutoplayEnabled));
    const label = hubAutoplayEnabled ? '自動切り替えを停止' : '自動切り替えを再開';
    hubAutoplayToggle.setAttribute('aria-label', label);
    hubAutoplayToggle.title = label;
    const icon = hubAutoplayToggle.querySelector('span');
    if (icon) icon.textContent = hubAutoplayEnabled ? 'Ⅱ' : '▶';
  }

  function scheduleHubAutoplay() {
    window.clearTimeout(hubAutoplayTimer);
    hubAutoplayTimer = 0;
    updateHubAutoplayUI();
    if (!canRunHubAutoplay()) return;
    hubAutoplayTimer = window.setTimeout(() => {
      if (!canRunHubAutoplay()) {
        scheduleHubAutoplay();
        return;
      }
      const currentIndex = Math.max(0, hubOrder.indexOf(hubSelection));
      selectHub(hubOrder[(currentIndex + 1) % hubOrder.length], false, false);
    }, 7000);
  }

  function toggleHubAutoplay() {
    hubAutoplayEnabled = !hubAutoplayEnabled;
    scheduleHubAutoplay();
    Lab.announce(hubAutoplayEnabled ? 'ゲームの自動切り替えを再開しました。' : 'ゲームの自動切り替えを停止しました。');
  }

  function selectHub(id, focusTab = false, announce = true) {
    if (!hubOrder.includes(id)) return;
    hubSelection = id;
    hubSlides.forEach((slide) => {
      const active = slide.dataset.hubId === id;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    hubTabs.forEach((tab) => {
      const active = tab.dataset.hubTarget === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    });
    if (announce) {
      const title = document.querySelector(`[data-hub-id="${id}"] h2`)?.innerText.replace(/\s+/g, ' ').trim();
      Lab.announce(`${title || id}を選択しました。`);
      Lab.sound('select');
    }
    scheduleHubAutoplay();
  }

  function openDialog(config) {
    const theme = config.theme || themeFor(currentGame);
    dialog.style.setProperty('--dialog-theme', theme);
    dialogKicker.textContent = config.kicker || 'MISSION BRIEFING';
    dialogTitle.textContent = config.title || 'INFORMATION';
    dialogBody.innerHTML = config.body || '';
    dialogActions.replaceChildren();
    dialogClose.hidden = config.hideClose === true;
    dialogOnDismiss = config.onDismiss || null;
    dialogActionChosen = false;
    dialogLocked = config.hideClose === true;

    (config.actions || []).forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = item.primary ? 'dialog-primary' : 'dialog-secondary';
      button.textContent = item.label;
      if (item.autofocus || (index === 0 && config.autoFocusFirst)) button.autofocus = true;
      button.addEventListener('click', () => {
        dialogActionChosen = true;
        dialog.close(item.value || 'action');
        window.setTimeout(() => item.action && item.action(), 0);
      });
      dialogActions.appendChild(button);
    });

    if (!dialog.open) dialog.showModal();
    scheduleHubAutoplay();
    const focusTarget = dialog.querySelector('[autofocus]') || dialogActions.querySelector('button') || dialogClose;
    requestAnimationFrame(() => focusTarget && focusTarget.focus());
  }

  function briefingMarkup(game) {
    const briefing = game.briefing;
    return `
      <p>${briefing.summary}</p>
      <div class="brief-objectives">
        ${briefing.objectives.map((item) => `<div class="brief-objective"><small>${item.label}</small><b>${item.text}</b></div>`).join('')}
      </div>
      <p>${briefing.guide}</p>
      <div class="control-hints">${briefing.controls.map((item) => `<span>${item}</span>`).join('')}</div>
    `;
  }

  function showBriefing(allowStart = true) {
    if (!currentGame) {
      showLabGuide();
      return;
    }
    const shouldResume = hasStarted;
    if (shouldResume) currentGame.pause?.();
    const returnToGame = () => {
      if (shouldResume) currentGame?.resume?.();
      requestAnimationFrame(() => gameMount.focus());
    };
    const actions = [{ label: '閉じる', action: returnToGame }];
    if (allowStart && !hasStarted) {
      actions.push({ label: 'ミッション開始', primary: true, autofocus: true, action: startCurrentGame });
    } else {
      actions.push({ label: 'ゲームへ戻る', primary: true, autofocus: true, action: returnToGame });
    }
    openDialog({
      kicker: `MISSION ${currentGame.index} / ${currentGame.kicker}`,
      title: currentGame.title,
      body: briefingMarkup(currentGame),
      actions,
      onDismiss: returnToGame
    });
  }

  function showLabGuide() {
    openDialog({
      theme: '#53f06b',
      kicker: 'ABOUT THIS BUILD',
      title: '3つの技術を、遊んで理解する。',
      body: `
        <p>5案をゲーム性・技術訴求・短時間での分かりやすさから評価し、相互補完する3案を実装しました。</p>
        <div class="brief-objectives">
          <div class="brief-objective"><small>01 / CONTROL</small><b>5軸の姿勢と送りを同期</b></div>
          <div class="brief-objective"><small>03 / INSPECT</small><b>CADとの差分を発見・補正</b></div>
          <div class="brief-objective"><small>04 / STRATEGY</small><b>難加工リスクを組合せで攻略</b></div>
        </div>
        <p>すべてマウス・タッチ・キーボードで操作できます。音を切っても、色・形・文字による同等のフィードバックがあります。</p>
        <div class="control-hints"><span>TAB / FOCUS</span><span>ENTER / SELECT</span><span>ESC / PAUSE</span><span>RANGE / ARROW KEYS</span></div>
      `,
      actions: [{ label: 'ゲームを選ぶ', primary: true, autofocus: true, action: () => document.querySelector('.hub-slide.is-active [data-game]')?.focus() }]
    });
  }

  function showHubBriefing(trigger = null) {
    const game = Lab.getGame(hubSelection);
    if (!game) {
      showLabGuide();
      return;
    }
    const returnTarget = trigger || document.querySelector('.hub-slide.is-active .hub-guide');
    const playButton = document.querySelector('.hub-slide.is-active [data-game]');
    const returnToHub = () => requestAnimationFrame(() => returnTarget?.focus());
    openDialog({
      theme: themeFor(game),
      kicker: `MISSION ${game.index} / ${game.kicker}`,
      title: game.title,
      body: briefingMarkup(game),
      actions: [
        { label: '選択画面へ戻る', action: returnToHub },
        { label: 'このゲームを開始', primary: true, autofocus: true, action: () => openGame(game.id, playButton) }
      ],
      onDismiss: returnToHub
    });
  }

  function mountGame(game) {
    gameMount.replaceChildren();
    currentGame = game;
    hasStarted = false;
    game.mount(gameMount, services);
    requestAnimationFrame(() => gameMount.focus());
  }

  function openGame(id, trigger = null) {
    const nextGame = Lab.getGame(id);
    if (!nextGame) return;
    selectHub(id, false, false);
    lastTrigger = trigger && trigger.matches?.('button[data-game]') ? trigger : null;
    if (currentGame && typeof currentGame.destroy === 'function') currentGame.destroy();
    currentId = id;
    currentGame = nextGame;
    gameView.dataset.game = id;
    gameView.style.setProperty('--game-image', `url("../${nextGame.image}")`);
    gameBackdrop.style.backgroundImage = `url("${nextGame.image}")`;
    gameIndex.textContent = nextGame.index;
    gameKicker.textContent = nextGame.kicker;
    gameTitle.textContent = nextGame.title;
    hubView.hidden = true;
    hubView.classList.remove('is-active');
    gameView.hidden = false;
    gameView.classList.add('is-active');
    document.body.classList.add('is-playing');
    scheduleHubAutoplay();
    window.scrollTo(0, 0);
    document.title = `${nextGame.title}｜FUJIEDA 5AXIS GAME LAB`;
    history.replaceState(null, '', `#${id}`);
    mountGame(nextGame);
    Lab.sound('select');
    showBriefing(true);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }

  function startCurrentGame() {
    if (!currentGame) return;
    hasStarted = true;
    Lab.sound('start');
    currentGame.start();
  }

  function goHome() {
    const returningId = currentId || hubSelection;
    if (currentGame && typeof currentGame.destroy === 'function') currentGame.destroy();
    currentGame = null;
    currentId = null;
    hasStarted = false;
    if (dialog.open) dialog.close('home');
    gameMount.replaceChildren();
    gameView.hidden = true;
    gameView.classList.remove('is-active');
    document.body.classList.remove('is-playing');
    hubView.hidden = false;
    hubView.classList.add('is-active');
    selectHub(returningId, false, false);
    document.title = 'FUJIEDA 5AXIS GAME LAB｜藤枝鉄工';
    history.replaceState(null, '', location.pathname + location.search);
    updateBestScores();
    requestAnimationFrame(() => {
      const target = lastTrigger && lastTrigger.isConnected ? lastTrigger : document.querySelector('.hub-slide.is-active [data-game]');
      target?.focus();
    });
  }

  function restartCurrentGame() {
    if (!currentGame) return;
    if (typeof currentGame.reset === 'function') currentGame.reset();
    hasStarted = true;
    currentGame.start();
    Lab.sound('start');
    Lab.toast('ミッションを最初から再開しました');
  }

  function pauseCurrentGame() {
    if (!currentGame || dialog.open || !hasStarted) return;
    if (typeof currentGame.pause === 'function') currentGame.pause();
    openDialog({
      kicker: 'SIMULATION PAUSED',
      title: '一時停止',
      body: '<p>ゲームを停止しました。現在の状態は保持されています。</p>',
      actions: [
        { label: 'LABへ戻る', action: goHome },
        { label: '最初から', action: restartCurrentGame },
        { label: '再開', primary: true, autofocus: true, action: () => { currentGame.resume?.(); gameMount.focus(); } }
      ],
      onDismiss: () => { currentGame?.resume?.(); requestAnimationFrame(() => gameMount.focus()); }
    });
  }

  function finishGame(result) {
    if (!currentGame) return;
    hasStarted = false;
    const score = Math.round(Lab.utils.clamp(Number(result.score) || 0, 0, 100));
    const grade = result.grade || Lab.utils.gradeFor(score);
    const outcome = ['success', 'partial', 'failed'].includes(result.outcome) ? result.outcome : 'success';
    const normalized = { ...result, score, grade, outcome };
    const isBest = outcome === 'success' ? Lab.saveBest(currentId, normalized) : false;
    updateBestScores();
    Lab.sound('finish');
    Lab.vibrate([30, 35, 55]);
    Lab.burst(gameMount, themeFor(currentGame), grade === 'S' ? 34 : 22);
    const metrics = (result.metrics || []).slice(0, 6);
    const body = `
      <div class="result-hero">
        <div class="result-grade">${grade}</div>
        <div class="result-score"><small>${isBest ? 'NEW BEST / GAME SCORE' : 'GAME SCORE'}</small><strong>${score}</strong><p>${Lab.utils.scoreLabel(grade)}</p></div>
      </div>
      <div class="result-metrics">
        ${metrics.map((metric) => `<div class="result-metric"><small>${metric.label}</small><b>${metric.value}</b></div>`).join('')}
      </div>
      <div class="result-learning"><strong>TECH POINT：</strong> ${result.learning || currentGame.briefing.learning}</div>
    `;
    openDialog({
      kicker: `${outcome === 'success' ? 'MISSION COMPLETE' : outcome === 'partial' ? 'MISSION PARTIAL / ANALYSIS' : 'MISSION FAILED / ANALYSIS'} / ${currentGame.title}`,
      title: result.title || '加工ミッション完了',
      body,
      hideClose: true,
      actions: [
        { label: 'LABへ戻る', action: goHome },
        { label: 'もう一度', primary: true, autofocus: true, action: restartCurrentGame }
      ]
    });
  }

  function handleAction(action, trigger = null) {
    switch (action) {
      case 'home': goHome(); break;
      case 'help': showBriefing(true); break;
      case 'preview-help': showHubBriefing(trigger); break;
      case 'autoplay': toggleHubAutoplay(); break;
      case 'restart': restartCurrentGame(); break;
      default: break;
    }
  }

  document.addEventListener('click', (event) => {
    const hubTarget = event.target.closest('[data-hub-target]');
    if (hubTarget) {
      selectHub(hubTarget.dataset.hubTarget, false, true);
      return;
    }
    const gameButton = event.target.closest('button[data-game]');
    if (gameButton) {
      openGame(gameButton.dataset.game, gameButton);
      return;
    }
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) handleAction(actionButton.dataset.action, actionButton);
  });

  dialogClose.addEventListener('click', () => dialog.close('close'));
  dialog.addEventListener('cancel', (event) => {
    if (dialogLocked) event.preventDefault();
  });
  dialog.addEventListener('close', () => {
    dialogClose.hidden = false;
    const dismiss = !dialogActionChosen ? dialogOnDismiss : null;
    dialogOnDismiss = null;
    dialogLocked = false;
    dialogActionChosen = false;
    if (dismiss) dismiss();
    else if (currentGame && !hasStarted) requestAnimationFrame(() => gameMount.focus());
    scheduleHubAutoplay();
  });

  hubDock?.addEventListener('pointerenter', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    hubAutoplayPointerHeld = true;
    scheduleHubAutoplay();
  });
  hubDock?.addEventListener('pointerleave', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    hubAutoplayPointerHeld = false;
    scheduleHubAutoplay();
  });
  hubDock?.addEventListener('focusin', () => {
    requestAnimationFrame(() => {
      hubAutoplayFocusHeld = Boolean(hubDock.querySelector(':focus-visible'));
      scheduleHubAutoplay();
    });
  });
  hubDock?.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      hubAutoplayFocusHeld = Boolean(hubDock.querySelector(':focus-visible'));
      scheduleHubAutoplay();
    });
  });

  soundToggle.addEventListener('click', () => {
    const enabled = Lab.setSoundEnabled(!Lab.isSoundEnabled());
    updateSoundButton();
    Lab.toast(enabled ? 'サウンド ON' : 'サウンド OFF');
  });

  document.addEventListener('keydown', (event) => {
    if (!currentGame && !dialog.open && !hubView.hidden) {
      const direct = { '1': 'command', '3': 'digital', '4': 'boss' }[event.key];
      if (direct) {
        event.preventDefault();
        selectHub(direct, true, true);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const currentIndex = Math.max(0, hubOrder.indexOf(hubSelection));
        selectHub(hubOrder[(currentIndex + direction + hubOrder.length) % hubOrder.length], true, true);
        return;
      }
    }
    if (event.key === 'Escape' && !dialog.open && currentGame) {
      event.preventDefault();
      pauseCurrentGame();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentGame && hasStarted && !dialog.open) pauseCurrentGame();
    scheduleHubAutoplay();
  });

  Lab.reducedMotion.addEventListener?.('change', (event) => {
    if (!event.matches) return;
    hubAutoplayEnabled = false;
    scheduleHubAutoplay();
  });

  updateSoundButton();
  updateBestScores();
  selectHub(hubSelection, false, false);

  const initialId = location.hash.slice(1);
  if (initialId && Lab.getGame(initialId)) {
    openGame(initialId, null);
  }
})();
