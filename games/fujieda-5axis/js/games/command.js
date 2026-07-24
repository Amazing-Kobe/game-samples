(() => {
  'use strict';

  const Lab = window.FujiedaLab;
  const stages = [
    {
      name: 'APPROACH VECTOR', jp: '入口姿勢', description: 'A軸を安全コーンへ合わせ、刃先をブレード入口へ導く。',
      duration: 8.4, axes: ['A'], tolerance: 10, collision: 22,
      targetA: (t) => 10 + Math.sin(t * Math.PI * 1.3) * 16,
      targetC: () => -18, idealFeed: () => 72
    },
    {
      name: 'SIDE CUT SYNC', jp: '側面同期', description: 'A/Cを同時に追従し、治具とのクリアランスを守る。',
      duration: 9.4, axes: ['A', 'C'], tolerance: 17, collision: 42,
      targetA: (t) => -12 + Math.sin(t * Math.PI * 1.7) * 20,
      targetC: (t) => -40 + t * 82,
      idealFeed: () => 76
    },
    {
      name: 'CURVE FINISH', jp: '曲面仕上げ', description: '姿勢と送りを両立し、面粗度を守って仕上げる。',
      duration: 10.6, axes: ['A', 'C', 'F'], tolerance: 18, collision: 46,
      targetA: (t) => 8 + Math.sin(t * Math.PI * 2.1) * 22,
      targetC: (t) => -58 + t * 116,
      idealFeed: (t) => 70 + Math.sin(t * Math.PI) * 14
    }
  ];

  let container;
  let services;
  let root;
  let raf = 0;
  let finishTimer = 0;
  let lastFrame = 0;
  let state;

  function freshState() {
    return {
      stage: 0,
      progress: 0,
      a: 0,
      c: 0,
      feed: 72,
      targetA: 10,
      targetC: -18,
      idealFeed: 72,
      clearance: 5.2,
      roughness: .8,
      load: 48,
      running: false,
      paused: false,
      ready: true,
      complete: false,
      collisionOpen: false,
      collisionGraceUntil: 0,
      collisions: 0,
      rewinds: 0,
      elapsed: 0,
      qualityIntegral: 0,
      qualityTime: 0,
      stageQualityIntegral: 0,
      stageQualityTime: 0,
      stageScores: []
    };
  }

  function template() {
    return `
      <div class="game-root command-game">
        <div class="game-status-strip">
          <div class="status-cluster">
            <span class="status-chip is-live" data-status>READY / SIMULATION</span>
            <span class="status-chip">STAGE <b data-stage-count>01 / 03</b></span>
            <span class="status-chip">TIME <b data-time>00:00</b></span>
          </div>
          <div class="status-cluster">
            <div class="phase-pips" aria-label="工程進行度"><i class="is-current"></i><i></i><i></i></div>
            <span class="status-chip">ONE CHUCK <b>ACTIVE</b></span>
          </div>
        </div>

        <div class="command-layout">
          <aside class="glass-panel command-brief">
            <p class="panel-label">MISSION SEQUENCE</p>
            <h2 data-stage-jp>入口姿勢</h2>
            <p class="instruction-copy" data-stage-description>A軸を安全コーンへ合わせ、刃先をブレード入口へ導く。</p>
            <div class="stage-list">
              ${stages.map((stage, index) => `
                <div class="stage-item${index === 0 ? ' is-current' : ''}" data-stage-item="${index}">
                  <span>0${index + 1}</span><div><b>${stage.jp}</b><small>${stage.name}</small></div><em></em>
                </div>`).join('')}
            </div>
            <div class="tech-note"><strong>TECH POINT</strong><br>X/Y/Zは予定経路を自動進行。プレイヤーは回転軸A/Cと送りを判断し、同時5軸の姿勢制御を体験します。</div>
          </aside>

          <section class="machine-window" aria-label="5軸加工シミュレーション表示">
            <div class="viewport-label">LIVE TOOLPATH / GAME SIM</div>
            <svg class="toolpath-svg" viewBox="0 0 600 400" aria-hidden="true">
              <path class="toolpath-base" d="M115 302 C146 180 232 116 305 179 C372 236 431 208 500 84" pathLength="600"></path>
              <path class="toolpath-live" d="M115 302 C146 180 232 116 305 179 C372 236 431 208 500 84" pathLength="600"></path>
            </svg>
            <div class="tool-cursor" aria-hidden="true"></div>
            <div class="machine-readout" aria-label="現在の仮想軸値">
              <span>X/Y/Z<b data-xyz>+000 / +000 / +000</b></span>
              <span>A / C<b data-ac>+00° / +00°</b></span>
              <span>FEED<b data-feed-readout>072%</b></span>
            </div>
            <div class="stage-banner" data-stage-banner>
              <div>
                <p class="panel-label">STAGE 01 / APPROACH VECTOR</p>
                <strong>加工準備完了</strong>
                <p>黄色のTARGETマーカーへ姿勢を合わせながら、ツールパスを進めます。</p>
                <button class="primary-action" type="button" data-command-action="begin">この工程を開始</button>
              </div>
            </div>
            <div class="collision-alert" data-collision hidden>
              <div class="collision-card">
                <p class="panel-label">INTERFERENCE DETECTED</p>
                <h3>仮想干渉を検知</h3>
                <p data-collision-copy>工具姿勢が安全コーンを外れました。8%巻き戻し、A/CをTARGETへ近づけて再開してください。</p>
                <button class="danger-action" type="button" data-command-action="recover">姿勢を修正して再開</button>
              </div>
            </div>
          </section>

          <aside class="glass-panel control-console">
            <p class="panel-label">AXIS CONTROL</p>
            <h2>姿勢コントローラー</h2>
            <p class="instruction-copy">TARGETピンを追従。赤い警告へ入る前に角度を修正してください。</p>
            <div class="axis-stack">
              <div class="axis-control" data-axis-control="A">
                <div class="axis-heading"><label for="commandA"><b>A</b>傾斜軸</label><output class="axis-value" for="commandA" data-a-value>+0°</output></div>
                <div class="range-track"><span class="target-pin" data-a-target></span><input id="commandA" data-axis="a" type="range" min="-45" max="45" step="1" value="0" aria-describedby="aHint"></div>
                <span class="axis-safety" id="aHint" data-axis-safety="a"><b>TARGET +10°</b><em>Δ 10° / SAFE</em></span>
              </div>
              <div class="axis-control" data-axis-control="C">
                <div class="axis-heading"><label for="commandC"><b>C</b>回転軸</label><output class="axis-value" for="commandC" data-c-value>+0°</output></div>
                <div class="range-track"><span class="target-pin" data-c-target></span><input id="commandC" data-axis="c" type="range" min="-90" max="90" step="1" value="0" disabled></div>
                <span class="axis-safety" data-axis-safety="c"><b>TARGET −18°</b><em>工程2で解放</em></span>
              </div>
              <div class="axis-control" data-axis-control="F">
                <div class="axis-heading"><label for="commandFeed"><b>F</b>送り</label><output class="axis-value" for="commandFeed" data-feed-value>72%</output></div>
                <div class="range-track"><span class="target-pin" data-feed-target></span><input id="commandFeed" data-axis="feed" type="range" min="40" max="120" step="1" value="72" disabled></div>
                <div class="feed-bands" aria-hidden="true"><i></i><i></i><i></i></div>
                <span class="axis-safety" data-axis-safety="feed"><b>TARGET 72%</b><em>工程3で解放</em></span>
              </div>
            </div>
            <div class="console-actions">
              <button class="primary-action" type="button" data-command-action="toggle">加工開始</button>
            </div>
            <div class="command-metrics" aria-label="加工評価メーター">
              <div class="metric-row"><div class="metric-head"><span>CLEARANCE</span><b data-clearance>5.2 mm</b></div><div class="meter"><i data-clearance-meter></i></div></div>
              <div class="metric-row"><div class="metric-head"><span>GAME Ra</span><b data-roughness>0.80</b></div><div class="meter"><i data-roughness-meter></i></div></div>
              <div class="metric-row"><div class="metric-head"><span>TOOL LOAD</span><b data-load>48%</b></div><div class="meter"><i data-load-meter></i></div></div>
              <div class="metric-row"><div class="metric-head"><span>PATH</span><b data-progress>0%</b></div><div class="meter"><i data-progress-meter></i></div></div>
            </div>
          </aside>
        </div>
      </div>
    `;
  }

  const q = (selector) => root.querySelector(selector);
  const qa = (selector) => [...root.querySelectorAll(selector)];
  const signed = (value) => `${value >= 0 ? '+' : ''}${Math.round(value)}`;
  const compact = () => window.matchMedia('(max-width: 560px)').matches;

  function scrollToControl() {
    if (!compact()) return;
    window.setTimeout(() => q('.control-console')?.scrollIntoView({
      behavior: services.reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start'
    }), 80);
  }

  function setBannerVisibility(visible) {
    const banner = q('[data-stage-banner]');
    banner.hidden = !visible;
    banner.inert = !visible;
    banner.setAttribute('aria-hidden', String(!visible));
    banner.classList.toggle('is-hidden', !visible);
  }

  function currentStage() {
    return stages[Math.min(state.stage, stages.length - 1)];
  }

  function bind() {
    root.addEventListener('input', (event) => {
      const input = event.target.closest('[data-axis]');
      if (!input) return;
      state[input.dataset.axis] = Number(input.value);
      updateControls();
    });
    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-axis]')) services.sound('select');
    });
    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-command-action]');
      if (!button) return;
      const action = button.dataset.commandAction;
      if (action === 'begin') beginStage();
      if (action === 'toggle') toggleRun();
      if (action === 'recover') recover();
    });
  }

  function configureStage() {
    const stage = currentStage();
    q('[data-stage-jp]').textContent = stage.jp;
    q('[data-stage-description]').textContent = stage.description;
    q('[data-stage-count]').textContent = `0${state.stage + 1} / 03`;
    qa('[data-stage-item]').forEach((item, index) => {
      item.classList.toggle('is-current', index === state.stage);
      item.classList.toggle('is-done', index < state.stage);
    });
    qa('.phase-pips i').forEach((pip, index) => {
      pip.classList.toggle('is-current', index === state.stage);
      pip.classList.toggle('is-done', index < state.stage);
    });
    const cInput = q('[data-axis="c"]');
    const feedInput = q('[data-axis="feed"]');
    cInput.disabled = !stage.axes.includes('C');
    feedInput.disabled = !stage.axes.includes('F');
    q('[data-axis-control="C"]').style.opacity = cInput.disabled ? '.5' : '1';
    q('[data-axis-control="F"]').style.opacity = feedInput.disabled ? '.5' : '1';
    updateTargets();
    updateControls();
  }

  function updateTargets() {
    const stage = currentStage();
    state.targetA = stage.targetA(state.progress);
    state.targetC = stage.targetC(state.progress);
    state.idealFeed = stage.idealFeed(state.progress);
    if (!stage.axes.includes('C')) {
      state.c = state.targetC;
      q('[data-axis="c"]').value = String(Math.round(state.c));
    }
    if (!stage.axes.includes('F')) {
      state.feed = state.idealFeed;
      q('[data-axis="feed"]').value = String(Math.round(state.feed));
    }
    q('[data-a-target]').style.setProperty('--target', `${services.utils.inverseLerp(-45, 45, state.targetA) * 100}%`);
    q('[data-c-target]').style.setProperty('--target', `${services.utils.inverseLerp(-90, 90, state.targetC) * 100}%`);
    q('[data-feed-target]').style.setProperty('--target', `${services.utils.inverseLerp(40, 120, state.idealFeed) * 100}%`);
  }

  function metrics() {
    const stage = currentStage();
    const aError = Math.abs(state.a - state.targetA);
    const cError = stage.axes.includes('C') ? services.utils.angleDelta(state.c, state.targetC) * .68 : 0;
    const combinedError = aError + cError;
    const feedError = stage.axes.includes('F') ? Math.abs(state.feed - state.idealFeed) : 0;
    state.clearance = services.utils.clamp(5.4 - combinedError * .12, 0, 5.4);
    state.roughness = services.utils.clamp(.54 + combinedError * .018 + feedError * .014, .45, 2.8);
    state.load = services.utils.clamp(38 + state.feed * .28 + combinedError * .72, 0, 100);
    const quality = services.utils.clamp(100 - combinedError * 1.2 - feedError * .65, 0, 100);
    return { aError, cError, combinedError, feedError, quality, stage };
  }

  function updateControls() {
    q('[data-a-value]').textContent = `${signed(state.a)}°`;
    q('[data-c-value]').textContent = `${signed(state.c)}°`;
    q('[data-feed-value]').textContent = `${Math.round(state.feed)}%`;
    q('[data-ac]').textContent = `${signed(state.a)}° / ${signed(state.c)}°`;
    q('[data-feed-readout]').textContent = `${String(Math.round(state.feed)).padStart(3, '0')}%`;
    const x = Math.round(-42 + state.progress * 84);
    const y = Math.round(Math.sin(state.progress * Math.PI) * 36);
    const z = Math.round(18 + state.progress * 47);
    q('[data-xyz]').textContent = `${signed(x)} / ${signed(y)} / ${signed(z)}`;
    const result = updateMetrics();
    const stage = currentStage();
    const safety = (error, limit) => error > limit ? 'DANGER' : error > limit * .62 ? 'CAUTION' : 'SAFE';
    const updateSafety = (axis, target, error, enabled, suffix = '°') => {
      const element = q(`[data-axis-safety="${axis}"]`);
      const status = enabled ? safety(error, axis === 'feed' ? 19 : stage.collision) : `工程${axis === 'c' ? '2' : '3'}で解放`;
      element.className = `axis-safety${enabled ? ` is-${status.toLowerCase()}` : ''}`;
      element.querySelector('b').textContent = `TARGET ${axis === 'feed' ? Math.round(target) : signed(target)}${suffix}`;
      element.querySelector('em').textContent = enabled ? `Δ ${Math.round(error)}${suffix} / ${status}` : status;
    };
    updateSafety('a', state.targetA, result.aError, true);
    updateSafety('c', state.targetC, result.cError, stage.axes.includes('C'));
    updateSafety('feed', state.idealFeed, result.feedError, stage.axes.includes('F'), '%');
  }

  function updateMetrics() {
    const result = metrics();
    q('[data-clearance]').textContent = `${state.clearance.toFixed(1)} mm`;
    q('[data-roughness]').textContent = state.roughness.toFixed(2);
    q('[data-load]').textContent = `${Math.round(state.load)}%`;
    q('[data-progress]').textContent = `${Math.round(state.progress * 100)}%`;
    services.utils.setMeter(q('[data-clearance-meter]'), state.clearance, 5.4);
    services.utils.setMeter(q('[data-roughness-meter]'), Math.max(0, 2.8 - state.roughness), 2.35);
    services.utils.setMeter(q('[data-load-meter]'), state.load);
    services.utils.setMeter(q('[data-progress-meter]'), state.progress, 1);
    q('[data-load-meter]').style.setProperty('--meter-color', state.load > 86 ? '#ff5d61' : state.load > 72 ? '#ffd83d' : '#53f06b');
    q('[data-clearance-meter]').style.setProperty('--meter-color', state.clearance < 1.2 ? '#ff5d61' : state.clearance < 2.3 ? '#ffd83d' : '#53f06b');
    root.classList.toggle('is-danger', result.combinedError > result.stage.tolerance || state.load > 90);
    return result;
  }

  function updateVisuals() {
    const pathOffset = 600 * (1 - state.progress);
    q('.toolpath-live').style.setProperty('--path-offset', String(pathOffset));
    const toolX = 20 + state.progress * 64;
    const toolY = 75 - Math.sin(state.progress * Math.PI) * 46 - state.progress * 19;
    q('.machine-window').style.setProperty('--tool-x', `${toolX}%`);
    q('.machine-window').style.setProperty('--tool-y', `${toolY}%`);
    q('[data-time]').textContent = services.utils.formatTime(state.elapsed);
  }

  function setBanner(title, copy, buttonLabel, stageLabel) {
    const banner = q('[data-stage-banner]');
    setBannerVisibility(true);
    banner.querySelector('.panel-label').textContent = stageLabel;
    banner.querySelector('strong').textContent = title;
    banner.querySelector('p:not(.panel-label)').textContent = copy;
    banner.querySelector('button').textContent = buttonLabel;
    requestAnimationFrame(() => banner.querySelector('button').focus());
  }

  function beginStage() {
    if (state.complete) return;
    const stage = currentStage();
    state.ready = false;
    state.running = true;
    state.paused = false;
    state.collisionOpen = false;
    state.collisionGraceUntil = performance.now() + 1600;
    setBannerVisibility(false);
    q('[data-collision]').hidden = true;
    q('[data-status]').textContent = 'CUTTING / LIVE';
    q('[data-command-action="toggle"]').textContent = '一時停止';
    lastFrame = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    services.announce(`${stage.jp}を開始。ターゲットへ姿勢を合わせてください。`);
    requestAnimationFrame(() => q('[data-axis="a"]:not(:disabled)')?.focus());
    scrollToControl();
  }

  function toggleRun() {
    if (state.complete || state.collisionOpen) return;
    if (state.ready) {
      beginStage();
      return;
    }
    if (state.running) pause(); else resume();
  }

  function pause() {
    if (!state || !state.running) return;
    state.running = false;
    state.paused = true;
    cancelAnimationFrame(raf);
    if (root) {
      q('[data-status]').textContent = 'PAUSED / HOLD';
      q('[data-command-action="toggle"]').textContent = '加工を再開';
    }
  }

  function resume() {
    if (!state || state.complete || state.collisionOpen || state.ready || !state.paused) return;
    state.running = true;
    state.paused = false;
    state.collisionGraceUntil = performance.now() + 900;
    q('[data-status]').textContent = 'CUTTING / LIVE';
    q('[data-command-action="toggle"]').textContent = '一時停止';
    lastFrame = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function collision(result) {
    state.running = false;
    state.paused = true;
    state.collisionOpen = true;
    state.collisions += 1;
    state.rewinds += 1;
    state.progress = Math.max(0, state.progress - .08);
    cancelAnimationFrame(raf);
    updateVisuals();
    updateControls();
    q('[data-collision]').hidden = false;
    q('[data-collision-copy]').textContent = `安全姿勢との差が ${Math.round(result.combinedError)}° になりました。8%巻き戻しました。A ${signed(state.targetA)}° / C ${signed(state.targetC)}° 付近へ修正してください。`;
    q('[data-status]').textContent = 'INTERFERENCE / STOP';
    q('[data-command-action="toggle"]').textContent = '安全停止中';
    services.sound('warning');
    services.vibrate([55, 45, 55]);
    services.announce('仮想干渉を検知。加工を安全停止しました。');
    requestAnimationFrame(() => q('[data-command-action="recover"]').focus());
  }

  function recover() {
    state.collisionOpen = false;
    q('[data-collision]').hidden = true;
    state.a = state.targetA;
    state.c = state.targetC;
    q('[data-axis="a"]').value = String(Math.round(state.a));
    q('[data-axis="c"]').value = String(Math.round(state.c));
    updateControls();
    services.sound('select');
    resume();
    requestAnimationFrame(() => q('[data-axis="a"]:not(:disabled)')?.focus());
  }

  function tick(now) {
    if (!state.running) return;
    const delta = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    const stage = currentStage();
    updateTargets();
    const result = updateMetrics();
    const speedFactor = stage.axes.includes('F') ? services.utils.clamp(state.feed / state.idealFeed, .62, 1.5) : 1;
    state.progress = Math.min(1, state.progress + delta / stage.duration * speedFactor);
    state.elapsed += delta;
    state.qualityIntegral += result.quality * delta;
    state.qualityTime += delta;
    state.stageQualityIntegral += result.quality * delta;
    state.stageQualityTime += delta;
    updateVisuals();
    updateControls();
    if (now > state.collisionGraceUntil && result.combinedError > stage.collision) {
      collision(result);
      return;
    }
    if (state.progress >= 1) {
      completeStage();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function completeStage() {
    state.running = false;
    cancelAnimationFrame(raf);
    const stageScore = state.stageQualityTime ? state.stageQualityIntegral / state.stageQualityTime : 0;
    state.stageScores.push(stageScore);
    state.stageQualityIntegral = 0;
    state.stageQualityTime = 0;
    services.sound('success');
    services.burst(q('.tool-cursor'), '#53f06b', 15);
    const completedStage = state.stage;
    state.stage += 1;
    if (state.stage >= stages.length) {
      finish();
      return;
    }
    state.progress = 0;
    state.ready = true;
    configureStage();
    setBanner('工程クリア', `${stages[completedStage].jp}を完了。次は「${currentStage().jp}」です。`, '次の工程へ', `STAGE 0${state.stage + 1} / ${currentStage().name}`);
    q('[data-status]').textContent = 'CHECKPOINT / READY';
    q('[data-command-action="toggle"]').textContent = '次の工程を開始';
    services.announce(`${stages[completedStage].jp}を完了しました。`);
  }

  function finish() {
    state.complete = true;
    q('[data-status]').textContent = 'COMPLETE / SAFE';
    const averageQuality = state.qualityTime ? state.qualityIntegral / state.qualityTime : 0;
    const timeScore = services.utils.clamp(112 - Math.max(0, state.elapsed - 26) * 2.4, 55, 100);
    const safetyScore = services.utils.clamp(100 - state.collisions * 24, 25, 100);
    const finalScore = averageQuality * .62 + timeScore * .16 + safetyScore * .22;
    const averageRa = services.utils.clamp(.5 + (100 - averageQuality) * .014, .5, 2.2);
    services.finish({
      score: finalScore,
      title: 'ワンチャック加工 完了',
      metrics: [
        { label: 'PATH QUALITY', value: `${Math.round(averageQuality)}%` },
        { label: 'GAME Ra', value: averageRa.toFixed(2) },
        { label: 'TIME', value: services.utils.formatTime(state.elapsed) },
        { label: 'INTERFERENCE', value: `${state.collisions} 回` },
        { label: 'SETUP', value: 'ONE CHUCK' },
        { label: 'AXIS SYNC', value: '05 / 05' }
      ],
      learning: 'X/Y/Zの予定経路にA/Cの姿勢を同期すると、つかみ直しを減らしながら複雑曲面へ工具を導けます。干渉回避と面粗度、時間の両立が評価の鍵です。'
    });
  }

  const game = {
    id: 'command',
    index: '01',
    title: '5AXIS COMMAND',
    kicker: 'PRECISION CONTROL',
    theme: '#53f06b',
    image: 'assets/gameplay_command.png',
    briefing: {
      summary: 'X/Y/Zで進む仮想ツールパスに、回転軸A/Cの姿勢と送りを同期。治具との干渉を避け、3工程をワンチャックで仕上げます。',
      objectives: [
        { label: 'CONTROL', text: 'TARGETへA/Cを追従' },
        { label: 'PROTECT', text: 'クリアランスを確保' },
        { label: 'FINISH', text: '面粗度と時間を両立' }
      ],
      guide: '工程1はA軸、工程2はA/C、工程3で送りを追加します。TARGETピンは常に安全姿勢を示します。干渉時は自動停止し、修正して再開できます。',
      controls: ['RANGE / DRAG', 'ARROW KEYS / FINE ADJUST', 'BUTTON / PAUSE'],
      learning: 'A/C姿勢とX/Y/Z経路を同期し、一度の固定で複雑面へ到達する考え方を体験します。'
    },
    mount(target, sharedServices) {
      window.clearTimeout(finishTimer);
      container = target;
      services = sharedServices;
      state = freshState();
      container.innerHTML = template();
      root = container.firstElementChild;
      bind();
      configureStage();
      updateVisuals();
    },
    start() {
      if (!root) return;
      if (state.complete) this.reset();
      beginStage();
    },
    pause,
    resume,
    reset() {
      cancelAnimationFrame(raf);
      window.clearTimeout(finishTimer);
      if (container && services) this.mount(container, services);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.clearTimeout(finishTimer);
      state && (state.running = false);
    }
  };

  Lab.registerGame(game);
})();
