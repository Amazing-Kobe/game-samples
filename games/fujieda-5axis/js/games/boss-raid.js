(() => {
  'use strict';

  const Lab = window.FujiedaLab;
  const phases = [
    {
      id: 'deep', jp: '深穴アプローチ', en: 'DEEP HOLE', code: 'WEAK 01', x: 38, y: 36,
      condition: '深さ 6D・小径・横荷重許容は低。切りくず滞留リスクも高い。到達、剛性、排出を同時に満たせ。',
      correct: { tool: 'reach-rigid', stance: 'coaxial', process: 'step-clear' },
      reasons: { tool: '深穴には「届く長さ」と剛性の両立が必要です。', stance: '穴軸と同軸なら横方向のたわみを抑えられます。', process: '段階加工と退避で切りくずを排出します。' },
      options: {
        tool: [
          { id: 'reach-rigid', label: '必要長・高剛性工具', note: '到達 ○ / 剛性 ○', risk: [2, 1, 0], time: 3 },
          { id: 'short', label: 'ショート工具', note: '剛性 ◎ / 到達 ×', risk: [34, 5, 0], time: -2 },
          { id: 'ball', label: 'ボールエンド', note: '曲面 ○ / 深穴 △', risk: [24, 12, 0], time: 1 }
        ],
        stance: [
          { id: 'coaxial', label: '穴軸へ同軸', note: '横荷重を抑制', risk: [1, 1, 0], time: 1 },
          { id: 'tilt', label: 'A軸を大きく傾斜', note: '接近 ○ / 横荷重 ↑', risk: [21, 10, 0], time: -1 },
          { id: 'side-entry', label: '側面から侵入', note: '距離 △ / たわみ ↑', risk: [31, 8, 0], time: 0 }
        ],
        process: [
          { id: 'step-clear', label: '段階加工＋退避', note: '排出 ◎ / 時間 △', risk: [2, 2, 0], time: 7 },
          { id: 'one-pass', label: '一気に最深部へ', note: '時間 ◎ / 排出 ×', risk: [15, 28, 0], time: -7 },
          { id: 'high-feed', label: '高送りを維持', note: '時間 ◎ / 負荷 ↑', risk: [14, 24, 0], time: -5 }
        ]
      }
    },
    {
      id: 'wall', jp: '薄肉フィニッシュ', en: 'THIN WALL', code: 'WEAK 02', x: 55, y: 28,
      condition: '壁厚 0.8mm・片持ち・変形許容は小。偏荷重と切削抵抗を抑え、壁の支持を残しながら仕上げよ。',
      correct: { tool: 'short-rigid', stance: 'alternate', process: 'light-cut' },
      reasons: { tool: '短く高剛性な工具で振動源を減らします。', stance: '左右交互の工程で薄壁への偏った力を抑えます。', process: '低切込み仕上げで変形とビビりを抑制します。' },
      options: {
        tool: [
          { id: 'short-rigid', label: 'ショート高剛性', note: '剛性 ◎ / 到達 ○', risk: [1, 2, 2], time: 2 },
          { id: 'long-slim', label: 'ロングスリム', note: '接近 ◎ / 剛性 △', risk: [17, 19, 13], time: 0 },
          { id: 'large', label: '大径工具', note: '能率 ◎ / 押力 ↑', risk: [4, 9, 29], time: -4 }
        ],
        stance: [
          { id: 'alternate', label: '左右交互に加工', note: '負荷を分散', risk: [1, 2, 3], time: 5 },
          { id: 'one-side', label: '片側から連続', note: '段取り ○ / 偏荷重 ↑', risk: [4, 12, 32], time: -4 },
          { id: 'deep-angle', label: '急角度で押し込む', note: '接近 ○ / 変形 ↑', risk: [12, 14, 26], time: -1 }
        ],
        process: [
          { id: 'light-cut', label: '低切込み仕上げ', note: '安定 ◎ / 時間 △', risk: [1, 2, 3], time: 7 },
          { id: 'heavy-cut', label: '大切込みで一発', note: '時間 ◎ / 変形 ↑', risk: [9, 18, 36], time: -7 },
          { id: 'ultra-slow', label: '極低速で押し切る', note: '時間 × / ビビり △', risk: [2, 19, 9], time: 13 }
        ]
      }
    },
    {
      id: 'curve', jp: '複雑曲面コンボ', en: 'CURVED SURFACE', code: 'WEAK 03', x: 68, y: 47,
      condition: '曲率が連続し、法線変化が大きい自由曲面。面品位を優先し、接触点と工具負荷を急変させずにつなげ。',
      correct: { tool: 'ball-end', stance: 'continuous-5', process: 'constant-load' },
      reasons: { tool: '球状刃先は曲面へ連続的に接触させやすい選択です。', stance: '連続5軸で曲面法線へ姿勢をつなぎます。', process: '一定負荷の送りで面品位と時間を両立します。' },
      options: {
        tool: [
          { id: 'ball-end', label: 'ボールエンド', note: '曲面追従 ◎ / 能率 ○', risk: [1, 2, 1], time: 3 },
          { id: 'flat-end', label: 'フラットエンド', note: '平面 ◎ / 曲面 △', risk: [4, 22, 6], time: -2 },
          { id: 'long-slim', label: 'ロングスリム', note: '接近 ◎ / たわみ ↑', risk: [24, 15, 2], time: 1 }
        ],
        stance: [
          { id: 'continuous-5', label: '連続5軸追従', note: '接触 ○ / 同期 ◎', risk: [2, 2, 1], time: 2 },
          { id: 'indexed', label: '割出しで分割', note: '安定 ○ / 継ぎ目 △', risk: [2, 14, 4], time: 7 },
          { id: 'fixed', label: '姿勢を固定', note: '操作 ○ / 接触 ×', risk: [8, 28, 8], time: -3 }
        ],
        process: [
          { id: 'constant-load', label: '一定負荷送り', note: '面品位 ◎ / 時間 ○', risk: [1, 2, 1], time: 3 },
          { id: 'max-speed', label: '常時最高送り', note: '時間 ◎ / 負荷変動 ↑', risk: [8, 29, 4], time: -8 },
          { id: 'safe-slow', label: '全域を最低送り', note: '安定 ○ / 時間 ×', risk: [1, 7, 1], time: 14 }
        ]
      }
    }
  ];

  const categoryNames = { tool: 'TOOL / 工具', stance: 'STANCE / 姿勢', process: 'PROCESS / 工程' };
  let container;
  let services;
  let root;
  let state;
  let raf = 0;
  let lastFrame = 0;
  let timers = [];

  function freshState() {
    return {
      phase: 0,
      started: false,
      running: false,
      paused: false,
      executing: false,
      complete: false,
      failed: false,
      elapsed: 0,
      riskRemaining: 100,
      integrity: 100,
      gauges: { deflection: 8, chatter: 8, deformation: 8 },
      selections: { tool: null, stance: null, process: null },
      phaseQualities: [],
      failures: 0,
      attempts: 0,
      feedback: '形状条件を読み、3つの判断を組み合わせてください。',
      pending: null
    };
  }

  function template() {
    return `
      <div class="game-root boss-game">
        <div class="game-status-strip">
          <div class="status-cluster">
            <span class="status-chip is-live" data-status>READY / STRATEGY</span>
            <span class="status-chip">PHASE <b data-phase-count>01 / 03</b></span>
            <span class="status-chip">TIME <b data-time>00:00</b></span>
          </div>
          <div class="risk-bar metric-row">
            <div class="metric-head"><span>難加工残量 / BOSS RISK</span><b data-risk-text>100%</b></div>
            <div class="meter"><i data-risk-meter style="--meter-color:#ffd83d"></i></div>
          </div>
          <span class="status-chip">TOOL INTEGRITY <b data-integrity>100%</b></span>
        </div>

        <div class="boss-layout">
          <aside class="glass-panel boss-brief">
            <p class="panel-label" data-phase-code>WEAK 01 / DEEP HOLE</p>
            <h2 data-phase-title>深穴アプローチ</h2>
            <div class="phase-condition" data-condition>深さ 6D・小径・横荷重許容は低。切りくず滞留リスクも高い。到達、剛性、排出を同時に満たせ。</div>
            <div class="weakness-map">
              ${phases.map((phase, index) => `
                <div class="weakness-row${index === 0 ? ' is-current' : ''}" data-weakness="${index}">
                  <span>0${index + 1}</span><div><b>${phase.jp}</b><small>${phase.en}</small></div><em>${index === 0 ? 'ACTIVE' : 'LOCKED'}</em>
                </div>`).join('')}
            </div>
            <div class="boss-gauges">
              <div class="metric-row"><div class="metric-head"><span>たわみ / DEFLECTION</span><b data-gauge-value="deflection">8%</b></div><div class="meter"><i data-gauge="deflection"></i></div></div>
              <div class="metric-row"><div class="metric-head"><span>ビビり / CHATTER</span><b data-gauge-value="chatter">8%</b></div><div class="meter"><i data-gauge="chatter"></i></div></div>
              <div class="metric-row"><div class="metric-head"><span>変形 / DEFORMATION</span><b data-gauge-value="deformation">8%</b></div><div class="meter"><i data-gauge="deformation"></i></div></div>
            </div>
            <div class="phase-feedback" data-feedback>形状条件を読み、3つの判断を組み合わせてください。</div>
          </aside>

          <section class="boss-arena" aria-label="難加工ワークの攻略表示">
            <div class="arena-phase"><small data-arena-code>WEAK POINT 01</small><strong data-arena-title>深穴 / DEEP HOLE</strong></div>
            <div class="boss-hotspot" aria-hidden="true"><span data-hotspot-label>DEEP</span></div>
            <div class="attack-readout">
              <div><span>TOOL</span><b data-readout="tool">未選択</b></div>
              <div><span>STANCE</span><b data-readout="stance">未選択</b></div>
              <div><span>PROCESS</span><b data-readout="process">未選択</b></div>
            </div>
            <div class="stage-banner" data-boss-ready>
              <div>
                <p class="panel-label">IMPOSSIBLE SHAPE / READY</p>
                <strong>難加工ワーク出現</strong>
                <p>条件を読み、工具・姿勢・工程の3つを選んで難加工リスクを解除します。</p>
                <button class="primary-action" type="button" data-boss-action="start">攻略開始</button>
              </div>
            </div>
            <div class="stage-banner" data-phase-result role="dialog" aria-modal="true" aria-labelledby="phaseResultTitle" hidden>
              <div>
                <p class="panel-label" data-result-kicker>ANALYSIS</p>
                <strong id="phaseResultTitle" data-result-title>解析結果</strong>
                <p data-result-copy></p>
                <button class="primary-action" type="button" data-boss-action="continue">条件を組み直す</button>
              </div>
            </div>
            <div class="impact-flash" data-impact role="status" aria-live="assertive" tabindex="-1" hidden><strong>RISK −34</strong></div>
          </section>

          <section class="glass-panel boss-command-deck" aria-label="攻略コマンド">
            <div class="deck-condition">
              <span>ACTIVE CONDITION</span>
              <b data-deck-title>深穴アプローチ</b>
              <p data-deck-condition>深さ 6D・小径・横荷重許容は低。切りくず滞留リスクも高い。到達、剛性、排出を同時に満たせ。</p>
            </div>
            <div class="choice-groups" data-choice-groups></div>
            <div class="attack-actions">
              <span class="combo-preview">COMMAND LOCK <b data-selection-count>0 / 3</b></span>
              <button class="primary-action" type="button" data-boss-action="execute" disabled>加工シーケンス実行</button>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  const q = (selector) => root.querySelector(selector);
  const qa = (selector) => [...root.querySelectorAll(selector)];
  const currentPhase = () => phases[Math.min(state.phase, phases.length - 1)];

  function optionFor(category, id) {
    return currentPhase().options[category].find((option) => option.id === id);
  }

  function later(callback, delay) {
    const timer = { id: 0, callback, remaining: delay, deadline: performance.now() + delay };
    timer.id = window.setTimeout(() => {
      timers = timers.filter((entry) => entry !== timer);
      callback();
    }, delay);
    timers.push(timer);
    return timer;
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer.id));
    timers = [];
  }

  function pauseTimers() {
    const now = performance.now();
    timers.forEach((timer) => {
      window.clearTimeout(timer.id);
      timer.remaining = Math.max(0, timer.deadline - now);
    });
  }

  function resumeTimers() {
    timers.forEach((timer) => {
      timer.deadline = performance.now() + timer.remaining;
      timer.id = window.setTimeout(() => {
        timers = timers.filter((entry) => entry !== timer);
        timer.callback();
      }, Math.max(20, timer.remaining));
    });
  }

  function renderDeck() {
    const phase = currentPhase();
    q('[data-choice-groups]').innerHTML = Object.entries(categoryNames).map(([category, label]) => `
      <fieldset class="choice-group">
        <legend>${label}</legend>
        <div class="choice-row">
          ${phase.options[category].map((option) => `
            <button class="choice-card" type="button" data-choice-category="${category}" data-choice-id="${option.id}" aria-pressed="${state.selections[category] === option.id}" ${state.started && !state.executing ? '' : 'disabled'}>
              <b>${option.label}</b><small>${option.note}</small>
            </button>`).join('')}
        </div>
      </fieldset>`).join('');
  }

  function render() {
    const phase = currentPhase();
    q('[data-phase-count]').textContent = `0${state.phase + 1} / 03`;
    q('[data-time]').textContent = services.utils.formatTime(state.elapsed);
    q('[data-risk-text]').textContent = `${Math.round(state.riskRemaining)}%`;
    q('[data-integrity]').textContent = `${Math.round(state.integrity)}%`;
    services.utils.setMeter(q('[data-risk-meter]'), state.riskRemaining);
    q('[data-phase-code]').textContent = `${phase.code} / ${phase.en}`;
    q('[data-phase-title]').textContent = phase.jp;
    q('[data-condition]').textContent = phase.condition;
    q('[data-arena-code]').textContent = `WEAK POINT 0${state.phase + 1}`;
    q('[data-arena-title]').textContent = `${phase.jp} / ${phase.en}`;
    q('[data-deck-title]').textContent = phase.jp;
    q('[data-deck-condition]').textContent = phase.condition;
    q('[data-hotspot-label]').textContent = phase.id.toUpperCase();
    q('.boss-arena').style.setProperty('--hotspot-x', `${phase.x}%`);
    q('.boss-arena').style.setProperty('--hotspot-y', `${phase.y}%`);
    q('[data-feedback]').textContent = state.feedback;
    q('[data-feedback]').classList.toggle('is-error', state.feedback.startsWith('不安定') || state.feedback.startsWith('工具'));
    qa('[data-weakness]').forEach((row, index) => {
      row.classList.toggle('is-current', index === state.phase && !state.complete);
      row.classList.toggle('is-done', index < state.phase || (state.complete && !state.failed));
      row.querySelector('em').textContent = index < state.phase ? 'CLEARED' : index === state.phase ? 'ACTIVE' : 'LOCKED';
    });
    Object.entries(state.gauges).forEach(([key, value]) => {
      q(`[data-gauge-value="${key}"]`).textContent = `${Math.round(value)}%`;
      const meter = q(`[data-gauge="${key}"]`);
      services.utils.setMeter(meter, value);
      meter.style.setProperty('--meter-color', value > 72 ? '#ff5d61' : value > 45 ? '#ffd83d' : '#53f06b');
    });
    Object.keys(state.selections).forEach((category) => {
      const selected = optionFor(category, state.selections[category]);
      q(`[data-readout="${category}"]`).textContent = selected ? selected.label : '未選択';
    });
    const selectionCount = Object.values(state.selections).filter(Boolean).length;
    q('[data-selection-count]').textContent = `${selectionCount} / 3`;
    q('[data-boss-action="execute"]').disabled = selectionCount !== 3 || state.executing || !state.started || Boolean(state.pending);
    q('[data-status]').textContent = state.executing ? 'MACHINING / ANALYZE' : state.started ? 'STRATEGY / ACTIVE' : 'READY / STRATEGY';
    qa('[data-choice-category]').forEach((button) => {
      button.setAttribute('aria-pressed', String(state.selections[button.dataset.choiceCategory] === button.dataset.choiceId));
      button.disabled = !state.started || state.executing || state.complete || Boolean(state.pending);
    });
  }

  function configurePhase() {
    renderDeck();
    render();
  }

  function bind() {
    root.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice-category]');
      if (choice) {
        choose(choice.dataset.choiceCategory, choice.dataset.choiceId);
        return;
      }
      const action = event.target.closest('[data-boss-action]');
      if (!action) return;
      if (action.dataset.bossAction === 'start') start();
      if (action.dataset.bossAction === 'execute') execute();
      if (action.dataset.bossAction === 'continue') continueAfterResult();
    });
    root.addEventListener('keydown', (event) => {
      const phaseResult = q('[data-phase-result]:not([hidden])');
      if (phaseResult && event.key === 'Tab') {
        event.preventDefault();
        phaseResult.querySelector('button').focus();
      }
    });
  }

  function start() {
    if (!state || state.started || state.complete) return;
    state.started = true;
    state.running = true;
    state.paused = false;
    const ready = q('[data-boss-ready]');
    ready.hidden = true;
    ready.inert = true;
    ready.setAttribute('aria-hidden', 'true');
    ready.classList.add('is-hidden');
    renderDeck();
    render();
    lastFrame = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    services.announce('難加工クエストを開始。形状条件から3つのコマンドを選んでください。');
    if (window.matchMedia('(max-width: 560px)').matches) {
      window.setTimeout(() => q('.boss-command-deck')?.scrollIntoView({ behavior: services.reducedMotion.matches ? 'auto' : 'smooth', block: 'start' }), 80);
    }
    requestAnimationFrame(() => q('[data-choice-category]:not(:disabled)')?.focus());
  }

  function choose(category, id) {
    if (!state.started || state.executing || state.complete) return;
    state.selections[category] = id;
    services.sound('select');
    render();
  }

  function evaluate() {
    const phase = currentPhase();
    const categories = Object.keys(categoryNames);
    const wrong = categories.filter((category) => state.selections[category] !== phase.correct[category]);
    const risks = [0, 0, 0];
    let timeCost = 0;
    categories.forEach((category) => {
      const option = optionFor(category, state.selections[category]);
      option.risk.forEach((value, index) => { risks[index] += value; });
      timeCost += option.time;
    });
    const riskAverage = (risks[0] + risks[1] + risks[2]) / 3;
    const quality = services.utils.clamp(100 - wrong.length * 24 - riskAverage * .35 - Math.max(0, timeCost - 14) * .25, 8, 100);
    return { wrong, risks, timeCost, quality, pass: wrong.length <= 1 && riskAverage < 38 };
  }

  function execute() {
    if (Object.values(state.selections).some((value) => !value) || state.executing || state.complete) return;
    state.executing = true;
    state.attempts += 1;
    const evaluation = evaluate();
    render();
    const impact = q('[data-impact]');
    impact.hidden = false;
    impact.querySelector('strong').textContent = evaluation.pass ? 'RISK BREAK' : 'LOAD LIMIT';
    services.sound('cut');
    services.vibrate(evaluation.pass ? 25 : [45, 35, 45]);
    services.announce('加工シーケンスを実行しています。');
    requestAnimationFrame(() => impact.focus());
    later(() => {
      impact.hidden = true;
      applyEvaluation(evaluation);
    }, services.reducedMotion.matches ? 180 : 1450);
  }

  function applyEvaluation(evaluation) {
    const phase = currentPhase();
    state.executing = false;
    const factors = .22;
    state.gauges.deflection = services.utils.clamp(state.gauges.deflection + evaluation.risks[0] * factors, 0, 100);
    state.gauges.chatter = services.utils.clamp(state.gauges.chatter + evaluation.risks[1] * factors, 0, 100);
    state.gauges.deformation = services.utils.clamp(state.gauges.deformation + evaluation.risks[2] * factors, 0, 100);
    state.integrity = services.utils.clamp(state.integrity - (evaluation.pass ? Math.max(2, evaluation.wrong.length * 8) : 18 + evaluation.wrong.length * 8), 0, 100);
    state.elapsed += Math.max(0, evaluation.timeCost) * .15;

    const overlay = q('[data-phase-result]');
    const resultTitle = q('[data-result-title]');
    const resultCopy = q('[data-result-copy]');
    const resultKicker = q('[data-result-kicker]');
    const continueButton = overlay.querySelector('button');
    overlay.hidden = false;
    q('.boss-command-deck').inert = true;
    q('.boss-brief').inert = true;

    if (evaluation.pass) {
      const reduction = state.phase === 0 ? 34 : 33;
      state.riskRemaining = Math.max(0, state.riskRemaining - reduction);
      state.phaseQualities.push(evaluation.quality);
      state.pending = state.phase === phases.length - 1 ? 'finish' : 'next';
      state.feedback = evaluation.wrong.length
        ? `攻略成功。代替条件を含むため品質 ${Math.round(evaluation.quality)}%。次はさらに安定を狙えます。`
        : `完全攻略。${phase.reasons.tool} ${phase.reasons.stance}`;
      resultKicker.textContent = 'WEAK POINT CLEARED';
      resultTitle.textContent = `${phase.jp} 攻略`;
      resultCopy.textContent = evaluation.wrong.length
        ? `リスクは解除しましたが、1項目が最適条件ではありません。品質評価 ${Math.round(evaluation.quality)}%。`
        : `3つの判断が形状条件と一致。低いリスクで工程を完了しました。`;
      continueButton.textContent = state.pending === 'finish' ? '最終解析を見る' : '次の弱点へ';
      services.sound('success');
      services.burst(q('.boss-hotspot'), '#ffd83d', 20);
    } else {
      state.failures += 1;
      state.pending = state.integrity <= 0 || state.failures >= 3 ? 'fail' : 'retry';
      const reason = evaluation.wrong.map((category) => phase.reasons[category]).join(' ');
      state.feedback = `不安定加工：${reason}`;
      resultKicker.textContent = 'PROCESS UNSTABLE';
      resultTitle.textContent = '加工条件を再構築';
      resultCopy.textContent = `${reason} 工具健全度 ${Math.round(state.integrity)}%。`;
      continueButton.textContent = state.pending === 'fail' ? '解析結果を見る' : '条件を組み直す';
      services.sound('error');
    }
    render();
    requestAnimationFrame(() => continueButton.focus());
  }

  function continueAfterResult() {
    q('[data-phase-result]').hidden = true;
    q('.boss-command-deck').inert = false;
    q('.boss-brief').inert = false;
    if (state.pending === 'finish') {
      finish(true);
      return;
    }
    if (state.pending === 'fail') {
      finish(false);
      return;
    }
    if (state.pending === 'next') state.phase += 1;
    state.selections = { tool: null, stance: null, process: null };
    state.feedback = state.pending === 'next'
      ? '新しい形状条件を確認し、最適な3コマンドを選んでください。'
      : '原因の説明を手掛かりに、組み合わせを変更してください。';
    state.pending = null;
    configurePhase();
    services.announce(state.phase < phases.length ? `${currentPhase().jp}へ移行しました。` : '条件を再選択してください。');
    if (window.matchMedia('(max-width: 560px)').matches) {
      window.setTimeout(() => q('.boss-command-deck')?.scrollIntoView({ behavior: services.reducedMotion.matches ? 'auto' : 'smooth', block: 'start' }), 40);
    }
    requestAnimationFrame(() => q('[data-choice-category]:not(:disabled)')?.focus());
  }

  function tick(now) {
    if (!state.running) return;
    const delta = Math.min(.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    state.elapsed += delta;
    q('[data-time]').textContent = services.utils.formatTime(state.elapsed);
    raf = requestAnimationFrame(tick);
  }

  function finish(success) {
    if (state.complete) return;
    state.complete = true;
    state.failed = !success;
    state.running = false;
    cancelAnimationFrame(raf);
    const averageQuality = state.phaseQualities.length
      ? state.phaseQualities.reduce((sum, value) => sum + value, 0) / state.phaseQualities.length
      : 15;
    const gaugeAverage = (state.gauges.deflection + state.gauges.chatter + state.gauges.deformation) / 3;
    const stability = services.utils.clamp(108 - gaugeAverage, 15, 100);
    const timeScore = services.utils.clamp(112 - Math.max(0, state.elapsed - 48) * .85, 45, 100);
    const completion = state.phaseQualities.length / phases.length * 100;
    const score = averageQuality * .42 + stability * .22 + state.integrity * .15 + timeScore * .08 + completion * .13;
    services.finish({
      score,
      outcome: success ? 'success' : 'failed',
      title: success ? '難加工リスク 完全解除' : '工具限界 / 再設計',
      metrics: [
        { label: 'RISK REMAIN', value: `${Math.round(state.riskRemaining)}%` },
        { label: 'QUALITY', value: `${Math.round(averageQuality)}%` },
        { label: 'STABILITY', value: `${Math.round(stability)}%` },
        { label: 'TOOL INTEGRITY', value: `${Math.round(state.integrity)}%` },
        { label: 'RETRY', value: `${state.failures} 回` },
        { label: 'TIME', value: services.utils.formatTime(state.elapsed) }
      ],
      learning: '深穴は到達と剛性・排出、薄肉は偏荷重と変形、複雑曲面は工具形状と連続姿勢が鍵。速さだけでなく、品質を守る組み合わせが難加工攻略につながります。'
    });
  }

  function pause() {
    if (!state || !state.running || state.paused) return;
    state.running = false;
    state.paused = true;
    cancelAnimationFrame(raf);
    pauseTimers();
  }

  function resume() {
    if (!state || !state.started || state.complete || !state.paused) return;
    state.paused = false;
    state.running = true;
    resumeTimers();
    lastFrame = performance.now();
    raf = requestAnimationFrame(tick);
  }

  const game = {
    id: 'boss',
    index: '04',
    title: '難加工クエスト',
    kicker: 'SELECT × EXECUTE',
    theme: '#ffd83d',
    image: 'assets/gameplay_bossraid.png',
    briefing: {
      summary: '深穴・薄肉・複雑曲面という3つの難加工リスクを、工具・姿勢・工程の組み合わせで攻略します。ボスHPは「残っている加工リスク」です。',
      objectives: [
        { label: 'READ', text: '形状条件から弱点を読む' },
        { label: 'BUILD', text: '3コマンドを組み合わせる' },
        { label: 'PROTECT', text: '品質と工具健全度を守る' }
      ],
      guide: '左の条件文が攻略の根拠です。各カードには長所とトレードオフがあります。2項目以上が条件とずれると工程は不安定になり、3回の重大失敗で終了します。',
      controls: ['CARD / CLICK OR ENTER', 'EXECUTE / CONFIRM', '3 PHASES / CLEAR'],
      learning: '難しい形状ほど、工具・姿勢・工程を形状ごとに組み立て、たわみ・ビビり・変形を抑える判断が重要です。'
    },
    mount(target, sharedServices) {
      container = target;
      services = sharedServices;
      state = freshState();
      clearTimers();
      container.innerHTML = template();
      root = container.firstElementChild;
      bind();
      configurePhase();
    },
    start,
    pause,
    resume,
    reset() {
      cancelAnimationFrame(raf);
      clearTimers();
      if (container && services) this.mount(container, services);
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearTimers();
      state && (state.running = false);
    }
  };

  Lab.registerGame(game);
})();
