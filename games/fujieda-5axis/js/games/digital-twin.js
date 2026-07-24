(() => {
  'use strict';

  const Lab = window.FujiedaLab;
  const anomalyData = [
    {
      id: 'residue', name: '削り残し', code: 'TOLERANCE +', shape: 'shape-circle', color: '#ff5d61', x: 43, y: 57,
      signal: 'CAD面より材料が残っている反応。追加の仕上げが必要です。',
      options: [
        { id: 'cut-side', label: '工具径補正を切込み側へ', note: '残り代を除去する方向へ補正', correct: true, explanation: '削り残しには、工具を追加切込み側へ補正して仕上げパスを再計算します。' },
        { id: 'escape', label: '工具を退避側へ', note: 'ワークからさらに離す', correct: false, explanation: '退避側へ動かすと材料がさらに残ります。差分の符号を確認してください。' },
        { id: 'speed', label: '送りを上げる', note: '加工時間のみを優先', correct: false, explanation: '送りだけでは形状差分の方向を直せません。まず幾何補正が必要です。' }
      ]
    },
    {
      id: 'overcut', name: '削り過ぎ', code: 'TOLERANCE −', shape: 'shape-diamond', color: '#ffd83d', x: 57, y: 36,
      signal: 'CAD面より深く加工された反応。工具位置を退避側へ戻します。',
      options: [
        { id: 'deeper', label: '工具長補正を切込み側へ', note: 'さらに加工を深くする', correct: false, explanation: '切込み側への補正は削り過ぎを増やします。差分の向きと逆です。' },
        { id: 'length-safe', label: '工具長補正を退避側へ', note: '基準面へ近づけて再計算', correct: true, explanation: '削り過ぎには、工具位置を退避側へ補正し、基準CAD面へ近づけます。' },
        { id: 'coolant', label: 'クーラント量を変更', note: '熱条件だけを調整', correct: false, explanation: '今回の差分は位置補正の問題です。冷却条件だけでは一致しません。' }
      ]
    },
    {
      id: 'collision', name: '仮想干渉候補', code: 'COLLISION RISK', shape: 'shape-triangle', color: '#62dfff', x: 66, y: 64,
      signal: 'ホルダとワークが接近。工具姿勢と経路の再計算が必要です。',
      options: [
        { id: 'axis-recalc', label: 'A軸姿勢を変更＋再計算', note: '安全コーン内へ工具姿勢を変更', correct: true, explanation: '干渉候補には工具姿勢を安全側へ変更し、ツールパスを再計算します。' },
        { id: 'ignore', label: '送りだけを下げて続行', note: '同じ経路を低速で通過', correct: false, explanation: '速度を下げても幾何学的な干渉は残ります。経路または姿勢の変更が必要です。' },
        { id: 'offset-part', label: '部品原点を移動', note: '設計基準そのものを変更', correct: false, explanation: '設計基準を動かすと他の面までずれます。局所的な姿勢変更が適切です。' }
      ]
    }
  ];

  let container;
  let services;
  let root;
  let state;
  let raf = 0;
  let verifyTimer = 0;
  let verifyDeadline = 0;
  let verifyRemaining = 0;
  let lastFrame = 0;
  let runToken = 0;

  function freshState() {
    return {
      scan: 14,
      started: false,
      running: false,
      paused: false,
      complete: false,
      verifying: false,
      timeLeft: 90,
      revealed: new Set(),
      fixed: new Set(),
      selected: null,
      errors: 0,
      corrections: 0,
      feedback: null
    };
  }

  function shapeMarkup(item) {
    return `<span class="objective-shape ${item.shape}" aria-hidden="true">${item.shape === 'shape-triangle' ? '' : '<span>·</span>'}</span>`;
  }

  function template() {
    return `
      <div class="game-root twin-game">
        <div class="game-status-strip">
          <div class="process-flow" aria-label="検証工程">
            <div class="process-step is-current" data-process="scan"><span>1</span>SCAN</div><i class="process-arrow">→</i>
            <div class="process-step" data-process="mark"><span>2</span>MARK</div><i class="process-arrow">→</i>
            <div class="process-step" data-process="fix"><span>3</span>FIX</div><i class="process-arrow">→</i>
            <div class="process-step" data-process="verify"><span>4</span>VERIFY</div>
          </div>
          <div class="status-cluster">
            <span class="status-chip">TIME <b data-time>01:30</b></span>
            <span class="status-chip">CAD MATCH <b data-match>94.2%</b></span>
            <span class="status-chip">RISK <b data-risk>18%</b></span>
          </div>
        </div>

        <div class="twin-layout">
          <aside class="glass-panel twin-objectives">
            <p class="panel-label">INSPECTION TARGETS</p>
            <h2>差分シグナル 3件</h2>
            <p class="instruction-copy">スキャン線を動かし、色・形・ラベルが異なる3種類の反応を検出してください。</p>
            <div class="objective-stack">
              ${anomalyData.map((item, index) => `
                <div class="objective-item" data-objective="${item.id}">
                  ${shapeMarkup(item)}<div><b>シグナル 0${index + 1}</b><small>${item.name} / ${item.code}</small></div>
                </div>`).join('')}
            </div>
            <div class="tech-note"><strong>TECH POINT</strong><br>仮想CADと加工結果を重ね、差分の種類に応じて補正。再スキャンで一致と安全を検証します。</div>
          </aside>

          <section class="twin-viewport" aria-label="デジタルツイン走査ビュー">
            <div class="viewport-label">CAD / MACHINED PART COMPARISON</div>
            <div class="scan-line" aria-hidden="true"></div>
            ${anomalyData.map((item) => `
              <button class="anomaly" type="button" data-anomaly="${item.id}" style="--x:${item.x}%;--y:${item.y}%;color:${item.color}" aria-label="${item.name}の反応をマーク">
                <span class="shape ${item.shape}" aria-hidden="true"></span>
              </button>`).join('')}
            <div class="scan-controls">
              <label for="scanPosition">SCAN POSITION</label>
              <input id="scanPosition" type="range" min="10" max="90" step="1" value="14" data-scan aria-valuetext="14パーセント">
              <output for="scanPosition" data-scan-output>014%</output>
            </div>
            <div class="stage-banner" data-twin-ready>
              <div>
                <p class="panel-label">TWIN INSPECTOR / READY</p>
                <strong>走査データ準備完了</strong>
                <p>スキャン線を左右へ動かし、反応が現れた場所を選択します。</p>
                <button class="primary-action" type="button" data-twin-action="start">スキャン開始</button>
              </div>
            </div>
            <div class="verify-sweep" data-verify-sweep hidden></div>
          </section>

          <aside class="glass-panel correction-panel">
            <p class="panel-label">INSTANT CORRECTION</p>
            <h2>補正プログラム</h2>
            <div data-correction-content role="status" aria-live="polite">
              <div class="selection-empty">検出した差分マーカーを選ぶと、原因と補正候補を表示します。</div>
            </div>
            <button class="primary-action verify-button" type="button" data-twin-action="verify" disabled>再スキャンで検証</button>
          </aside>
        </div>
      </div>
    `;
  }

  const q = (selector) => root.querySelector(selector);
  const qa = (selector) => [...root.querySelectorAll(selector)];
  const getAnomaly = (id) => anomalyData.find((item) => item.id === id);

  function hideReadyBanner() {
    const banner = q('[data-twin-ready]');
    banner.hidden = true;
    banner.inert = true;
    banner.setAttribute('aria-hidden', 'true');
    banner.classList.add('is-hidden');
  }

  function scheduleVerify(delay) {
    const token = runToken;
    verifyRemaining = delay;
    verifyDeadline = performance.now() + delay;
    window.clearTimeout(verifyTimer);
    verifyTimer = window.setTimeout(() => {
      verifyRemaining = 0;
      if (token === runToken && state?.verifying && !state.complete) finish(true);
    }, delay);
  }

  function metrics() {
    const match = services.utils.clamp(94.2 + state.fixed.size * 1.87 - state.errors * .18, 90, 99.8);
    const risk = services.utils.clamp(18 - state.fixed.size * 6 + state.errors * 3, 0, 35);
    return { match, risk };
  }

  function processState() {
    let current = 'scan';
    const done = new Set();
    if (state.revealed.size > 0) {
      done.add('scan');
      current = 'mark';
    }
    if (state.selected) {
      done.add('mark');
      current = 'fix';
    }
    if (state.fixed.size === anomalyData.length) {
      done.add('scan'); done.add('mark'); done.add('fix');
      current = 'verify';
    }
    if (state.verifying || state.complete) {
      done.add('verify');
      current = null;
    }
    qa('[data-process]').forEach((element) => {
      element.classList.toggle('is-current', element.dataset.process === current);
      element.classList.toggle('is-done', done.has(element.dataset.process));
    });
  }

  function render() {
    const currentMetrics = metrics();
    q('[data-time]').textContent = services.utils.formatTime(state.timeLeft);
    q('[data-match]').textContent = `${currentMetrics.match.toFixed(1)}%`;
    q('[data-risk]').textContent = `${Math.round(currentMetrics.risk)}%`;
    q('[data-scan-output]').textContent = `${String(Math.round(state.scan)).padStart(3, '0')}%`;
    q('[data-scan]').setAttribute('aria-valuetext', `${Math.round(state.scan)}パーセント`);
    q('.twin-viewport').style.setProperty('--scan-x', `${state.scan}%`);
    anomalyData.forEach((item) => {
      const button = q(`[data-anomaly="${item.id}"]`);
      const objective = q(`[data-objective="${item.id}"]`);
      button.classList.toggle('is-revealed', state.revealed.has(item.id));
      button.classList.toggle('is-selected', state.selected === item.id);
      button.classList.toggle('is-fixed', state.fixed.has(item.id));
      button.disabled = state.fixed.has(item.id) || !state.revealed.has(item.id);
      objective.classList.toggle('is-fixed', state.fixed.has(item.id));
    });
    q('[data-twin-action="verify"]').disabled = state.fixed.size !== anomalyData.length || state.verifying;
    processState();
  }

  function renderCorrection() {
    const mount = q('[data-correction-content]');
    if (!state.selected) {
      const message = state.feedback || (state.fixed.size
        ? `${state.fixed.size}件を補正済み。残りの反応をスキャンしてください。`
        : '検出した差分マーカーを選ぶと、原因と補正候補を表示します。');
      mount.innerHTML = `<div class="selection-empty">${message}</div>`;
      return;
    }
    const item = getAnomaly(state.selected);
    mount.innerHTML = `
      <div class="anomaly-detail">
        <span class="anomaly-detail-tag" style="color:${item.color}">${item.code}</span>
        <h3>${item.name}</h3>
        <p>${item.signal}</p>
      </div>
      ${state.feedback ? `<div class="fix-feedback${state.feedback.error ? ' is-error' : ''}" role="${state.feedback.error ? 'alert' : 'status'}">${state.feedback.text}</div>` : ''}
      <div class="fix-options" role="group" aria-label="${item.name}の補正候補">
        ${item.options.map((option) => `
          <button class="fix-option" type="button" data-fix="${option.id}">
            <b>${option.label}</b><small>${option.note}</small>
          </button>`).join('')}
      </div>
    `;
  }

  function scanForSignals() {
    if (!state.started || state.complete) return;
    let foundNew = false;
    anomalyData.forEach((item) => {
      if (!state.fixed.has(item.id) && Math.abs(state.scan - item.x) <= 5.5 && !state.revealed.has(item.id)) {
        state.revealed.add(item.id);
        foundNew = true;
        services.sound('lock');
        services.vibrate(18);
        services.announce(`${item.name}の反応を検出しました。マーカーを選択してください。`);
      }
    });
    if (foundNew) services.toast('異常反応を検出 — マーカーを選択');
    render();
  }

  function selectAnomaly(id) {
    if (!state.revealed.has(id) || state.fixed.has(id)) return;
    state.selected = id;
    state.feedback = null;
    services.sound('select');
    renderCorrection();
    render();
    q('[data-correction-content]').scrollIntoView({ behavior: services.reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    requestAnimationFrame(() => q('[data-fix]')?.focus());
  }

  function applyFix(optionId) {
    if (!state.selected || state.complete) return;
    const item = getAnomaly(state.selected);
    const option = item.options.find((candidate) => candidate.id === optionId);
    if (!option) return;
    state.corrections += 1;
    if (option.correct) {
      state.fixed.add(item.id);
      state.feedback = `${item.name}を補正しました。${option.explanation}`;
      services.sound('success');
      services.vibrate(24);
      services.burst(q(`[data-anomaly="${item.id}"]`), '#62dfff', 14);
      services.toast(`${item.name} / CORRECTION APPLIED`);
      services.announce(`${item.name}の補正に成功しました。`);
      state.selected = null;
      renderCorrection();
    } else {
      state.errors += 1;
      state.timeLeft = Math.max(0, state.timeLeft - 5);
      state.feedback = { error: true, text: `補正不一致：${option.explanation}（TIME −5秒）` };
      services.sound('error');
      services.vibrate([35, 30, 35]);
      renderCorrection();
    }
    render();
    requestAnimationFrame(() => {
      if (!option.correct) {
        q(`[data-fix="${optionId}"]`)?.focus();
        return;
      }
      const next = anomalyData.find((candidate) => state.revealed.has(candidate.id) && !state.fixed.has(candidate.id));
      const target = state.fixed.size === anomalyData.length
        ? q('[data-twin-action="verify"]')
        : next ? q(`[data-anomaly="${next.id}"]`) : q('[data-scan]');
      target?.focus();
      if (window.matchMedia('(max-width: 560px)').matches) {
        q('.twin-viewport')?.scrollIntoView({ behavior: services.reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  function bind() {
    root.addEventListener('input', (event) => {
      if (!event.target.matches('[data-scan]')) return;
      state.scan = Number(event.target.value);
      scanForSignals();
    });
    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-scan]')) services.sound('scan');
    });
    root.addEventListener('click', (event) => {
      const anomaly = event.target.closest('[data-anomaly]');
      if (anomaly) {
        selectAnomaly(anomaly.dataset.anomaly);
        return;
      }
      const fix = event.target.closest('[data-fix]');
      if (fix) {
        applyFix(fix.dataset.fix);
        return;
      }
      const action = event.target.closest('[data-twin-action]');
      if (!action) return;
      if (action.dataset.twinAction === 'start') start();
      if (action.dataset.twinAction === 'verify') verify();
    });
  }

  function start() {
    if (!state || state.complete || state.running) return;
    state.started = true;
    state.running = true;
    state.paused = false;
    hideReadyBanner();
    q('[data-scan]').disabled = false;
    lastFrame = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    services.sound('scan');
    services.announce('スキャンを開始しました。スライダーを左右へ動かしてください。');
    requestAnimationFrame(() => q('[data-scan]').focus());
  }

  function tick(now) {
    if (!state.running) return;
    const delta = Math.min(.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    state.timeLeft = Math.max(0, state.timeLeft - delta);
    render();
    if (state.timeLeft <= 0) {
      timeout();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function verify() {
    if (state.fixed.size !== anomalyData.length || state.verifying) return;
    state.verifying = true;
    state.running = false;
    cancelAnimationFrame(raf);
    q('[data-scan]').disabled = true;
    q('[data-verify-sweep]').hidden = false;
    q('[data-twin-action="verify"]').disabled = true;
    services.sound('scan');
    services.announce('再スキャンを実行しています。');
    render();
    scheduleVerify(services.reducedMotion.matches ? 250 : 2250);
  }

  function finish(success) {
    if (state.complete) return;
    state.complete = true;
    state.running = false;
    cancelAnimationFrame(raf);
    const current = metrics();
    const correctionScore = services.utils.clamp(100 - state.errors * 16, 35, 100);
    const timeScore = services.utils.clamp(state.timeLeft / 90 * 100, 0, 100);
    const completionScore = state.fixed.size / anomalyData.length * 100;
    const score = success
      ? current.match * .52 + correctionScore * .31 + timeScore * .17
      : completionScore * .55 + correctionScore * .2 + timeScore * .25;
    services.finish({
      score,
      outcome: success ? 'success' : state.fixed.size ? 'partial' : 'failed',
      title: success ? 'デジタルツイン 一致' : '検証時間終了',
      metrics: [
        { label: 'CAD MATCH', value: `${current.match.toFixed(1)}%` },
        { label: 'RISK', value: `${Math.round(current.risk)}%` },
        { label: 'CORRECTIONS', value: `${state.corrections} 回` },
        { label: 'MIS-SELECT', value: `${state.errors} 回` },
        { label: 'TIME LEFT', value: services.utils.formatTime(state.timeLeft) },
        { label: 'SIGNALS', value: `${state.fixed.size} / 3` }
      ],
      learning: '差分の符号と種類を見分け、形状差には位置補正、干渉候補には姿勢・経路変更を選ぶことで、設計→加工→検証→即修正の流れがつながります。'
    });
  }

  function timeout() {
    state.running = false;
    services.sound('warning');
    services.announce('検証時間が終了しました。');
    finish(false);
  }

  function pause() {
    if (!state || state.paused || state.complete) return;
    if (state.verifying) {
      verifyRemaining = Math.max(0, verifyDeadline - performance.now());
      window.clearTimeout(verifyTimer);
      state.paused = true;
      return;
    }
    if (!state.running) return;
    state.running = false;
    state.paused = true;
    cancelAnimationFrame(raf);
  }

  function resume() {
    if (!state || !state.started || state.complete || !state.paused) return;
    if (state.verifying) {
      state.paused = false;
      scheduleVerify(Math.max(20, verifyRemaining));
      return;
    }
    state.paused = false;
    state.running = true;
    lastFrame = performance.now();
    raf = requestAnimationFrame(tick);
  }

  const game = {
    id: 'digital',
    index: '03',
    title: 'DIGITAL TWIN LAB',
    kicker: 'SCAN × FIND × FIX',
    theme: '#62dfff',
    image: 'assets/gameplay_digitaltwin.png',
    briefing: {
      summary: '仮想CADモデルと加工結果をスキャンし、削り残し・削り過ぎ・干渉候補を発見。原因に合う補正を選び、再スキャンで一致を確認します。',
      objectives: [
        { label: 'SCAN', text: '3種類の反応を検出' },
        { label: 'FIX', text: '原因に合う補正を選択' },
        { label: 'VERIFY', text: '一致率99%超へ再検証' }
      ],
      guide: 'スキャン線が異常位置へ近づくと、形の異なるマーカーが現れます。マーカーを選び、説明を読んで補正してください。誤補正は5秒のペナルティです。',
      controls: ['SCAN / DRAG OR ARROWS', 'MARK / CLICK OR ENTER', 'FIX / SELECT CARD'],
      learning: '現場の加工結果をデジタルデータと照合し、その場で補正へつなぐ「現場×デジタル」を体験します。'
    },
    mount(target, sharedServices) {
      window.clearTimeout(verifyTimer);
      verifyRemaining = 0;
      runToken += 1;
      container = target;
      services = sharedServices;
      state = freshState();
      container.innerHTML = template();
      root = container.firstElementChild;
      q('[data-scan]').disabled = true;
      bind();
      render();
      renderCorrection();
    },
    start,
    pause,
    resume,
    reset() {
      cancelAnimationFrame(raf);
      window.clearTimeout(verifyTimer);
      verifyRemaining = 0;
      runToken += 1;
      if (container && services) this.mount(container, services);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.clearTimeout(verifyTimer);
      verifyRemaining = 0;
      runToken += 1;
      state && (state.running = false);
    }
  };

  Lab.registerGame(game);
})();
