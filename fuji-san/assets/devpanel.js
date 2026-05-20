/* Dev panel — live design tweaking for Fuji-san */
(function () {
  'use strict';

  // ── Presets ────────────────────────────────────────────────────────────────

  var MODE = {
    dark: {
      label: 'Dark',
      vars: {
        '--card-bg': 'rgba(0, 0, 0, 0.22)',
        '--card-backdrop': 'blur(20px) saturate(160%)',
        '--card-text': '#f8f8f8',
        '--card-border-color': 'rgba(100, 100, 100, 0.45)',
        '--card-inset': 'inset 0 1px 0 rgba(100, 100, 100, 0.80)',
      },
    },
    light: {
      label: 'Light',
      vars: {
        '--card-bg': 'rgba(255, 255, 255, 0.55)',
        '--card-backdrop': 'blur(20px) saturate(160%)',
        '--card-text': '#0d0d0d',
        '--card-border-color': 'rgba(200, 190, 180, 0.55)',
        '--card-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.80)',
      },
    },
    cream: {
      label: 'Cream',
      vars: {
        '--card-bg': 'rgba(240, 220, 180, 0.58)',
        '--card-backdrop': 'blur(20px) saturate(160%)',
        '--card-text': '#1e130a',
        '--card-border-color': 'rgba(170, 140, 90, 0.50)',
        '--card-inset': 'inset 0 1px 0 rgba(255, 248, 220, 0.75)',
      },
    },
  };

  var SHADOW = {
    none:   { label: 'None',   value: '0 0 0 0 transparent' },
    soft:   { label: 'Soft',   value: '0 8px 28px rgba(0, 0, 0, 0.22)' },
    strong: { label: 'Strong', value: '0 16px 48px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.20)' },
  };

  var BORDER = {
    none:   { label: 'None',   override: 'transparent', suppressInset: true },
    subtle: { label: 'Subtle', override: 'rgba(150, 150, 150, 0.25)', suppressInset: false },
    glass:  { label: 'Glass',  override: null, suppressInset: false }, // uses mode default
  };

  var THUMB_FRAME = {
    none:     { label: 'None',         cls: '' },
    border:   { label: 'White border', cls: 'thumb-frame-border' },
    polaroid: { label: 'Polaroid',     cls: 'thumb-frame-polaroid' },
  };

  var THUMB_HOVER = {
    none:  { label: 'None',  cls: '' },
    scale: { label: 'Scale', cls: 'thumb-hover-scale' },
    lift:  { label: 'Lift',  cls: 'thumb-hover-lift' },
    glow:  { label: 'Glow',  cls: 'thumb-hover-glow' },
  };

  var THUMB_TILT = {
    off:    { label: 'Off',  range: 0 },
    subtle: { label: '±2°', range: 2 },
    bold:   { label: '±5°', range: 5 },
  };

  // ── State ──────────────────────────────────────────────────────────────────

  var state = {
    mode: 'dark',
    shadow: 'soft',
    border: 'glass',
    thumbFrame: 'none',
    thumbHover: 'none',
    thumbTilt: 'off',
  };

  // ── Apply state ────────────────────────────────────────────────────────────

  var tiltSeeds = {};

  function applyState() {
    var root = document.documentElement;
    var modeVars = MODE[state.mode].vars;

    // Mode (bg, backdrop, text, default border-color, inset)
    Object.keys(modeVars).forEach(function (k) {
      root.style.setProperty(k, modeVars[k]);
    });

    // Shadow
    root.style.setProperty('--card-shadow', SHADOW[state.shadow].value);

    // Border color + inset
    var borderPreset = BORDER[state.border];
    if (borderPreset.override !== null) {
      root.style.setProperty('--card-border-color', borderPreset.override);
    }
    if (borderPreset.suppressInset) {
      root.style.setProperty('--card-inset', 'inset 0 0 0 0 transparent');
    }

    // Thumbnail frame classes
    Object.keys(THUMB_FRAME).forEach(function (k) {
      if (THUMB_FRAME[k].cls) document.body.classList.remove(THUMB_FRAME[k].cls);
    });
    if (THUMB_FRAME[state.thumbFrame].cls) {
      document.body.classList.add(THUMB_FRAME[state.thumbFrame].cls);
    }

    // Thumbnail hover classes
    Object.keys(THUMB_HOVER).forEach(function (k) {
      if (THUMB_HOVER[k].cls) document.body.classList.remove(THUMB_HOVER[k].cls);
    });
    if (THUMB_HOVER[state.thumbHover].cls) {
      document.body.classList.add(THUMB_HOVER[state.thumbHover].cls);
    }

    // Tilt
    applyTilt();
  }

  function applyTilt() {
    var range = THUMB_TILT[state.thumbTilt].range;
    document.querySelectorAll('.chapter-gallery-item').forEach(function (item, i) {
      if (range === 0) {
        item.style.removeProperty('--thumb-tilt');
      } else {
        if (tiltSeeds[i] === undefined) {
          tiltSeeds[i] = Math.random() * 2 - 1; // −1 to +1
        }
        item.style.setProperty('--thumb-tilt', (tiltSeeds[i] * range).toFixed(1) + 'deg');
      }
    });
  }

  function reshuffleTilt() {
    tiltSeeds = {};
    applyTilt();
  }

  // Re-apply tilt when the story renders gallery items
  var observer = new MutationObserver(function () {
    if (state.thumbTilt !== 'off') applyTilt();
  });

  // ── Copy output ────────────────────────────────────────────────────────────

  function buildCopyText() {
    var root = document.documentElement;
    var modeVars = MODE[state.mode].vars;
    var shadow = SHADOW[state.shadow].value;
    var borderColor = BORDER[state.border].override !== null
      ? BORDER[state.border].override
      : modeVars['--card-border-color'];
    var inset = BORDER[state.border].suppressInset
      ? 'inset 0 0 0 0 transparent'
      : modeVars['--card-inset'];

    var classes = [];
    if (THUMB_FRAME[state.thumbFrame].cls) classes.push(THUMB_FRAME[state.thumbFrame].cls);
    if (THUMB_HOVER[state.thumbHover].cls) classes.push(THUMB_HOVER[state.thumbHover].cls);

    var lines = [
      'Fuji-san Design Choices',
      '═══════════════════════════════',
      '',
      'Step Cards',
      '  Mode:    ' + MODE[state.mode].label,
      '  Shadow:  ' + SHADOW[state.shadow].label,
      '  Border:  ' + BORDER[state.border].label,
      '',
      'Gallery Thumbnails',
      '  Frame:   ' + THUMB_FRAME[state.thumbFrame].label,
      '  Hover:   ' + THUMB_HOVER[state.thumbHover].label,
      '  Tilt:    ' + THUMB_TILT[state.thumbTilt].label,
      '',
      '───────────────────────────────',
      'CSS :root variables',
      '───────────────────────────────',
      ':root {',
      '  --card-bg: ' + modeVars['--card-bg'] + ';',
      '  --card-backdrop: ' + modeVars['--card-backdrop'] + ';',
      '  --card-text: ' + modeVars['--card-text'] + ';',
      '  --card-border-color: ' + borderColor + ';',
      '  --card-shadow: ' + shadow + ';',
      '  --card-inset: ' + inset + ';',
      '}',
    ];

    if (classes.length) {
      lines.push('');
      lines.push('───────────────────────────────');
      lines.push('Add to <body> element');
      lines.push('───────────────────────────────');
      lines.push('class="' + classes.join(' ') + '"');
    }

    if (state.thumbTilt !== 'off') {
      lines.push('');
      lines.push('───────────────────────────────');
      lines.push('Thumbnail tilt');
      lines.push('───────────────────────────────');
      lines.push('Range: ±' + THUMB_TILT[state.thumbTilt].range + '°');
      lines.push('Apply random --thumb-tilt on each .chapter-gallery-item');
      lines.push('(see devpanel.js applyTilt() for the JS logic)');
    }

    return lines.join('\n');
  }

  // ── Panel UI ───────────────────────────────────────────────────────────────

  var BTN_BASE = [
    'padding:3px 9px',
    'border-radius:5px',
    'border:1px solid rgba(255,255,255,0.16)',
    'background:rgba(255,255,255,0.06)',
    'color:#e8e8e8',
    'font-size:11px',
    'cursor:pointer',
    'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
    'transition:background 0.12s,border-color 0.12s,font-weight 0.12s',
    'line-height:1.7',
    'white-space:nowrap',
  ].join(';');

  var BTN_ACTIVE_BG = 'rgba(255,255,255,0.20)';
  var BTN_ACTIVE_BORDER = 'rgba(255,255,255,0.50)';

  function makeToggleGroup(labelText, options, getCurrentKey, onChange) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:9px;';

    var lbl = document.createElement('div');
    lbl.textContent = labelText;
    lbl.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.55;margin-bottom:4px;';
    wrap.appendChild(lbl);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';

    function refreshButtons() {
      var active = getCurrentKey();
      row.querySelectorAll('[data-pkey]').forEach(function (b) {
        var on = b.dataset.pkey === active;
        b.style.background = on ? BTN_ACTIVE_BG : 'rgba(255,255,255,0.06)';
        b.style.borderColor = on ? BTN_ACTIVE_BORDER : 'rgba(255,255,255,0.16)';
        b.style.fontWeight = on ? '700' : '400';
        b.style.color = on ? '#fff' : '#e8e8e8';
      });
    }

    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.dataset.pkey = opt.key;
      btn.textContent = opt.label;
      btn.style.cssText = BTN_BASE;
      btn.addEventListener('click', function () {
        onChange(opt.key);
        refreshButtons();
      });
      row.appendChild(btn);
    });

    refreshButtons();
    wrap.appendChild(row);
    return { el: wrap, refresh: refreshButtons };
  }

  function makeSectionTitle(text) {
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;opacity:0.45;margin:0 0 8px;';
    return el;
  }

  function makeDivider() {
    var el = document.createElement('div');
    el.style.cssText = 'height:1px;background:rgba(255,255,255,0.09);margin:10px 0 12px;';
    return el;
  }

  function buildPanel() {
    // ── Toggle button ──
    var toggleBtn = document.createElement('button');
    toggleBtn.title = 'Design panel';
    toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    toggleBtn.style.cssText = [
      'position:fixed',
      'top:14px',
      'right:14px',
      'z-index:2001',
      'width:34px',
      'height:34px',
      'border-radius:50%',
      'background:rgba(10,8,6,0.72)',
      'color:#ddd',
      'border:1px solid rgba(255,255,255,0.18)',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'backdrop-filter:blur(10px)',
      'box-shadow:0 2px 10px rgba(0,0,0,0.45)',
      'transition:opacity 0.15s,background 0.15s',
      'padding:0',
    ].join(';');
    document.body.appendChild(toggleBtn);

    // ── Panel container ──
    var panel = document.createElement('div');
    panel.style.cssText = [
      'position:fixed',
      'top:56px',
      'right:14px',
      'z-index:2000',
      'width:252px',
      'background:rgba(14,11,9,0.90)',
      'backdrop-filter:blur(24px) saturate(180%)',
      '-webkit-backdrop-filter:blur(24px) saturate(180%)',
      'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:12px',
      'padding:14px 13px 13px',
      'box-shadow:0 10px 40px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.09)',
      'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
      'font-size:12px',
      'color:#e8e8e8',
      'display:none',
    ].join(';');

    // Panel header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    var title = document.createElement('span');
    title.textContent = 'Design Panel';
    title.style.cssText = 'font-weight:700;letter-spacing:0.04em;font-size:12px;';
    header.appendChild(title);
    panel.appendChild(header);

    // ── Step Cards section ──
    panel.appendChild(makeSectionTitle('Step Cards'));

    var modeGroup = makeToggleGroup('Mode',
      Object.keys(MODE).map(function (k) { return { key: k, label: MODE[k].label }; }),
      function () { return state.mode; },
      function (k) { state.mode = k; applyState(); }
    );
    panel.appendChild(modeGroup.el);

    var shadowGroup = makeToggleGroup('Shadow',
      Object.keys(SHADOW).map(function (k) { return { key: k, label: SHADOW[k].label }; }),
      function () { return state.shadow; },
      function (k) { state.shadow = k; applyState(); }
    );
    panel.appendChild(shadowGroup.el);

    var borderGroup = makeToggleGroup('Border',
      Object.keys(BORDER).map(function (k) { return { key: k, label: BORDER[k].label }; }),
      function () { return state.border; },
      function (k) { state.border = k; applyState(); }
    );
    panel.appendChild(borderGroup.el);

    panel.appendChild(makeDivider());

    // ── Gallery Thumbnails section ──
    panel.appendChild(makeSectionTitle('Gallery Thumbnails'));

    var frameGroup = makeToggleGroup('Frame',
      Object.keys(THUMB_FRAME).map(function (k) { return { key: k, label: THUMB_FRAME[k].label }; }),
      function () { return state.thumbFrame; },
      function (k) { state.thumbFrame = k; applyState(); }
    );
    panel.appendChild(frameGroup.el);

    var hoverGroup = makeToggleGroup('On hover',
      Object.keys(THUMB_HOVER).map(function (k) { return { key: k, label: THUMB_HOVER[k].label }; }),
      function () { return state.thumbHover; },
      function (k) { state.thumbHover = k; applyState(); }
    );
    panel.appendChild(hoverGroup.el);

    // Tilt row + Re-tilt button
    var tiltWrap = document.createElement('div');
    tiltWrap.style.cssText = 'margin-bottom:9px;';
    var tiltLbl = document.createElement('div');
    tiltLbl.textContent = 'Tilt';
    tiltLbl.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.55;margin-bottom:4px;';
    tiltWrap.appendChild(tiltLbl);

    var tiltRow = document.createElement('div');
    tiltRow.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;';

    var tiltBtns = [];

    function refreshTiltBtns() {
      tiltBtns.forEach(function (b) {
        var on = b.dataset.pkey === state.thumbTilt;
        b.style.background = on ? BTN_ACTIVE_BG : 'rgba(255,255,255,0.06)';
        b.style.borderColor = on ? BTN_ACTIVE_BORDER : 'rgba(255,255,255,0.16)';
        b.style.fontWeight = on ? '700' : '400';
        b.style.color = on ? '#fff' : '#e8e8e8';
      });
      reshuffleBtn.style.display = state.thumbTilt === 'off' ? 'none' : 'inline-block';
    }

    Object.keys(THUMB_TILT).forEach(function (k) {
      var btn = document.createElement('button');
      btn.dataset.pkey = k;
      btn.textContent = THUMB_TILT[k].label;
      btn.style.cssText = BTN_BASE;
      btn.addEventListener('click', function () {
        state.thumbTilt = k;
        applyState();
        refreshTiltBtns();
      });
      tiltRow.appendChild(btn);
      tiltBtns.push(btn);
    });

    var reshuffleBtn = document.createElement('button');
    reshuffleBtn.textContent = '↺';
    reshuffleBtn.title = 'Re-randomise tilt';
    reshuffleBtn.style.cssText = BTN_BASE + ';display:none;padding:3px 7px;opacity:0.7;';
    reshuffleBtn.addEventListener('click', reshuffleTilt);
    tiltRow.appendChild(reshuffleBtn);

    refreshTiltBtns();
    tiltWrap.appendChild(tiltRow);
    panel.appendChild(tiltWrap);

    panel.appendChild(makeDivider());

    // ── Copy button ──
    var copyBtn = document.createElement('button');
    copyBtn.textContent = '📋  Copy choices';
    copyBtn.style.cssText = [
      'width:100%',
      'padding:7px 0',
      'border-radius:7px',
      'border:1px solid rgba(255,255,255,0.20)',
      'background:rgba(255,255,255,0.09)',
      'color:#e8e8e8',
      'font-size:11px',
      'cursor:pointer',
      'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
      'font-weight:600',
      'letter-spacing:0.04em',
      'transition:background 0.15s',
    ].join(';');

    copyBtn.addEventListener('mouseenter', function () {
      copyBtn.style.background = 'rgba(255,255,255,0.15)';
    });
    copyBtn.addEventListener('mouseleave', function () {
      copyBtn.style.background = 'rgba(255,255,255,0.09)';
    });

    copyBtn.addEventListener('click', function () {
      var text = buildCopyText();
      function done() {
        copyBtn.textContent = '✓  Copied!';
        copyBtn.style.borderColor = 'rgba(100,220,130,0.55)';
        setTimeout(function () {
          copyBtn.textContent = '📋  Copy choices';
          copyBtn.style.borderColor = 'rgba(255,255,255,0.20)';
        }, 2200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text);
        done();
      }
    });

    panel.appendChild(copyBtn);
    document.body.appendChild(panel);

    // ── Toggle open/close ──
    var isOpen = false;
    toggleBtn.addEventListener('click', function () {
      isOpen = !isOpen;
      panel.style.display = isOpen ? 'block' : 'none';
      toggleBtn.style.background = isOpen ? 'rgba(30,24,18,0.90)' : 'rgba(10,8,6,0.72)';
      toggleBtn.style.borderColor = isOpen ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.18)';
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* silent */ }
    document.body.removeChild(ta);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    buildPanel();
    applyState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
