/* Shared UI helpers: theme, jalali date, numbers, toast, tooltip, sidebar drawer, ripple. */
(() => {
  'use strict';

  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const WEEKS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* ---------- numbers ---------- */
  const toFa = v => String(v).replace(/[0-9]/g, d => FA_DIGITS[Number(d)]);
  const toEn = v => String(v).replace(/[۰-۹]/g, d => String(FA_DIGITS.indexOf(d)));
  const digits = v => toEn(v).replace(/[^0-9]/g, '');
  const group = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const money = v => toFa(group(Math.round(Number(v) || 0)));

  /* ---------- Jalali date ---------- */
  function jalaliParts(date) {
    const g = new Date(date);
    const gy = g.getFullYear();
    const gm = g.getMonth() + 1;
    const gd = g.getDate();
    const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = gy > 1600 ? 979 : 0;
    const gy2 = gy - (gy > 1600 ? 1600 : 621);
    let d = 365 * gy2 + Math.floor((gy2 + (gm > 2 ? 1 : 0) + 3) / 4) - Math.floor((gy2 + (gm > 2 ? 1 : 0) + 99) / 100) + Math.floor((gy2 + (gm > 2 ? 1 : 0) + 399) / 400) - 80 + gd + gdm[gm - 1];
    jy += 33 * Math.floor(d / 12053);
    d %= 12053;
    jy += 4 * Math.floor(d / 1461);
    d %= 1461;
    if (d > 365) {
      jy += Math.floor((d - 1) / 365);
      d = (d - 1) % 365;
    }
    const jm = d < 186 ? 1 + Math.floor(d / 31) : 7 + Math.floor((d - 186) / 30);
    const jd = 1 + (d < 186 ? d % 31 : (d - 186) % 30);
    return [jy, jm, jd];
  }

  const pad = n => String(n).padStart(2, '0');
  const shortDate = (date = new Date()) => {
    const [y, m, d] = jalaliParts(date);
    return `${toFa(y)}/${toFa(pad(m))}/${toFa(pad(d))}`;
  };
  const longDate = (date = new Date()) => {
    const [y, m, d] = jalaliParts(date);
    return `${WEEKS[new Date(date).getDay()]} ${toFa(d)} ${MONTHS[m - 1]} ${toFa(y)}`;
  };

  /* ---------- theme ---------- */
  const THEME_KEY = 'milan-theme';

  function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    }
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      btn.setAttribute('title', theme === 'dark' ? 'پوستهٔ روشن' : 'پوستهٔ تاریک');
    });
  }

  function initTheme() {
    let theme = null;
    try { theme = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme, false);

    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
        toast(next === 'dark' ? 'پوستهٔ تاریک فعال شد' : 'پوستهٔ روشن فعال شد');
      });
    });
  }

  /* ---------- toast ---------- */
  let toastWrap = null;

  function toast(message, kind) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      toastWrap.setAttribute('role', 'status');
      toastWrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastWrap);
    }
    const node = document.createElement('div');
    node.className = 'toast' + (kind ? ' ' + kind : '');
    const icon = kind === 'bad' ? 'fa-circle-exclamation' : kind === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    const i = document.createElement('i');
    i.className = 'fas ' + icon;
    const span = document.createElement('span');
    span.textContent = message;
    node.append(i, span);
    toastWrap.appendChild(node);
    while (toastWrap.children.length > 3) toastWrap.firstElementChild.remove();
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 320);
    }, 2600);
  }

  /* ---------- tooltip ---------- */
  let tip = null;
  let tipTimer = null;

  function hideTip() {
    if (tip) tip.classList.remove('show');
    clearTimeout(tipTimer);
  }

  function showTipFor(el) {
    if (!el.dataset.tip) return;
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tip';
      document.body.appendChild(tip);
    }
    tip.textContent = el.dataset.tip;
    const rect = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - tw / 2, innerWidth - tw - 8)) + 'px';
    tip.style.top = Math.max(6, rect.top - tip.offsetHeight - 9) + 'px';
    tip.classList.add('show');
  }

  function initTips() {
    if (canHover) {
      document.addEventListener('pointerover', e => {
        const el = e.target.closest('[data-tip]');
        clearTimeout(tipTimer);
        if (!el) { hideTip(); return; }
        tipTimer = setTimeout(() => showTipFor(el), 280);
      });
      document.addEventListener('pointerout', e => {
        if (e.target.closest('[data-tip]')) hideTip();
      });
    }
    document.addEventListener('focusin', e => {
      const el = e.target.closest('[data-tip]');
      if (el) showTipFor(el);
    });
    document.addEventListener('focusout', e => {
      if (e.target.closest('[data-tip]')) hideTip();
    });
    window.addEventListener('scroll', hideTip, { capture: true, passive: true });
    window.addEventListener('resize', hideTip);
  }

  /* ---------- ripple ---------- */
  const RIPPLE_SELECTOR = '.btn, .dock-btn, .icon-btn, .menu-toggle, .tool-button, .action-btn, .page-number, .page-arrow, .per-page, .seg, .pc, .report-btn, .ghost-add, .add-more';

  function initRipple() {
    if (reduced) return;
    document.querySelectorAll(RIPPLE_SELECTOR).forEach(el => el.classList.add('ripple-host'));
    document.addEventListener('pointerdown', event => {
      const btn = event.target.closest('.ripple-host');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const wave = document.createElement('span');
      wave.className = 'ripple';
      wave.style.width = wave.style.height = size + 'px';
      wave.style.left = (event.clientX - rect.left - size / 2) + 'px';
      wave.style.top = (event.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(wave);
      setTimeout(() => wave.remove(), 620);
    });
  }

  /* ---------- sidebar (off-canvas under 900px) ---------- */
  function initSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('menuToggle');
    const closeBtn = document.getElementById('sidebarClose');
    if (!sidebar) return;

    const setOpen = open => {
      sidebar.classList.toggle('open', open);
      if (overlay) overlay.classList.toggle('show', open);
      if (toggle) toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    };

    const isDrawer = () => window.matchMedia('(max-width: 900px)').matches;

    if (toggle) toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
    if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));
    if (overlay) overlay.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        setOpen(false);
        if (toggle) toggle.focus();
      }
    });

    window.addEventListener('resize', () => { if (!isDrawer()) setOpen(false); });

    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => { if (isDrawer()) setOpen(false); });
    });
  }

  /* ---------- active nav item ---------- */
  function initNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll('.main-nav .nav-item').forEach(item => {
      const on = item.dataset.page === page;
      item.classList.toggle('active', on);
      if (on) item.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- dates ---------- */
  function initDates() {
    const pill = document.getElementById('todayPill');
    if (pill) pill.textContent = shortDate();

    const label = document.getElementById('todayLabel');
    if (label) label.textContent = longDate();

    const range = document.getElementById('dateRange');
    if (range) range.textContent = `${shortDate()} - ${shortDate()}`;
  }

  /* ---------- table search ---------- */
  function initSearch() {
    const inputs = Array.prototype.slice.call(document.querySelectorAll('.search-box input, .sidebar-search input'));
    const wrap = document.querySelector('.table-wrap');
    if (!inputs.length || !wrap) return;

    const rows = Array.prototype.slice.call(wrap.querySelectorAll('tbody tr'));
    if (!rows.length) return;

    const note = document.createElement('div');
    note.className = 'table-note hidden';
    note.textContent = 'موردی با این عبارت پیدا نشد';
    wrap.insertAdjacentElement('afterend', note);

    inputs.forEach(input => {
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        let shown = 0;
        rows.forEach(row => {
          const hit = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
          row.classList.toggle('hidden', !hit);
          if (hit) shown++;
        });
        note.classList.toggle('hidden', shown > 0);
        inputs.forEach(other => { if (other !== input) other.value = input.value; });
      });
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    initTheme();
    initTips();
    initRipple();
    initSidebar();
    initNav();
    initDates();
    initSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.App = {
    toFa, toEn, digits, group, money,
    jalaliParts, shortDate, longDate,
    toast, applyTheme, currentTheme,
    THEME_KEY, MONTHS, WEEKS
  };
})();
