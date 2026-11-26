import { TsuwanoScene } from './scene3d.js';

document.addEventListener('DOMContentLoaded', () => {
  const htmlEl = document.documentElement;
  const headerEl = document.getElementById('siteHeader');
  const scrollProgressEl = document.getElementById('scrollProgress');
  const canvasEl = document.getElementById('tsuwanoCanvas');
  const heroTargetEl = document.getElementById('heroStageTarget');

  // -------------------------------------------------------------------------
  // 1. Initialize Three.js 3D Tsuwano Diorama (with graceful WebGL fallback)
  // -------------------------------------------------------------------------
  let tsuwanoScene = null;
  if (canvasEl) {
    try {
      tsuwanoScene = new TsuwanoScene(canvasEl, heroTargetEl);
    } catch (err) {
      console.warn('WebGL 3D scene could not initialize, falling back cleanly:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Day / Hygge Night Mood Synchronization
  // -------------------------------------------------------------------------
  const moodToggleBtn = document.getElementById('moodToggle');
  const moodLabel = document.getElementById('moodLabel');
  const sceneMoodBtns = document.querySelectorAll('[data-scene-mood]');
  const bounceBtn = document.getElementById('bounceIslandBtn');

  function applyMood(mode) {
    const isNight = mode === 'night';
    htmlEl.setAttribute('data-theme', isNight ? 'night' : 'day');

    if (moodToggleBtn) {
      moodToggleBtn.setAttribute('aria-pressed', String(isNight));
    }
    if (moodLabel) {
      moodLabel.textContent = isNight ? 'ひるの津和野へ' : 'たきびの夜へ';
    }

    sceneMoodBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.sceneMood === mode);
    });

    if (tsuwanoScene) {
      tsuwanoScene.setMood(mode);
      tsuwanoScene.triggerPopBurst(isNight ? 0xf6cd68 : 0x7ac08a);
    }
  }

  if (moodToggleBtn) {
    moodToggleBtn.addEventListener('click', () => {
      const current = htmlEl.getAttribute('data-theme') === 'night' ? 'night' : 'day';
      applyMood(current === 'night' ? 'day' : 'night');
    });
  }

  sceneMoodBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyMood(btn.dataset.sceneMood);
    });
  });

  if (bounceBtn) {
    bounceBtn.addEventListener('click', () => {
      if (tsuwanoScene) {
        tsuwanoScene.triggerPopBurst();
      }
    });
  }

  // -------------------------------------------------------------------------
  // 3. Mobile Navigation Drawer
  // -------------------------------------------------------------------------
  const menuToggle = document.getElementById('menuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');

  function setDrawerOpen(open) {
    if (!menuToggle || !mobileDrawer) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    mobileDrawer.hidden = !open;
  }

  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      setDrawerOpen(!isOpen);
    });

    mobileDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setDrawerOpen(false));
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    });
  }

  // -------------------------------------------------------------------------
  // 4. Scroll Progress, Floating Header Shadow & Active Nav Spy
  // -------------------------------------------------------------------------
  const navLinks = document.querySelectorAll('.desktop-nav .nav-link');
  const sections = Array.from(navLinks)
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function onScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;

    if (scrollProgressEl) {
      scrollProgressEl.style.width = `${pct}%`;
    }
    if (headerEl) {
      headerEl.classList.toggle('is-scrolled', scrollTop > 24);
    }

    // Active section highlight
    let currentId = '';
    const offset = window.innerHeight * 0.35;
    sections.forEach((sec) => {
      if (sec.offsetTop - offset <= scrollTop) {
        currentId = sec.id;
      }
    });
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${currentId}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // -------------------------------------------------------------------------
  // 5. Scroll-Triggered Gentle Reveal Animations
  // -------------------------------------------------------------------------
  const revealEls = document.querySelectorAll('.reveal-up');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -36px 0px' }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }

  // -------------------------------------------------------------------------
  // 6. Interactive "4つのじかん" Tab Switcher
  // -------------------------------------------------------------------------
  const rhythmTabs = document.querySelectorAll('.rhythm-tab');
  const rhythmPanels = document.querySelectorAll('.rhythm-panel');

  rhythmTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('aria-controls');

      rhythmTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });

      rhythmPanels.forEach((panel) => {
        const isMatch = panel.id === targetId;
        panel.hidden = !isMatch;
        panel.classList.toggle('is-active', isMatch);
      });

      // Playful tie-in: clicking NIGHT tab softly sprinkles warm golden sparkles
      if (tsuwanoScene && tab.dataset.rhythm === 'night') {
        tsuwanoScene.triggerPopBurst(0xf6cd68);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 7. Interactive Mini Check-in Widget ("今の気持ちチェックイン")
  // -------------------------------------------------------------------------
  const checkinData = {
    pause: {
      badge: 'YOHAKU MESSAGE / 立ち止まるじかん',
      text: '毎日がんばっている心とからだに、まずは深呼吸をひとつ。津和野には「何もしない時間」をいっしょに喜んでくれる仲間と、やさしい風が待っています。',
      color: 0x8cc996
    },
    nature: {
      badge: 'TSUWANO NATURE / 緑と清流のなかで',
      text: '赤い石州瓦の町並みと、鯉が泳ぐ澄んだ水路、見上げれば満天の星。五感をひらいて歩くだけで、不思議と心がやわらかくほどけていきます。',
      color: 0x7ac08a
    },
    talk: {
      badge: 'HYGGE DIALOGUE / あたたかな対話',
      text: '肩書も正解もいらない食卓と焚き火のそばなら、うまく話そうとしなくても大丈夫。ただ「今ここ」の気持ちを聴き合うだけで、ほっとできる時間になります。',
      color: 0xf4c95d
    },
    spark: {
      badge: 'NEW QUESTION / 新しい問いと脱皮',
      text: '「これからどう生きたい？」という大きな問いも、津和野のまち歩きや多様な人との出会いのなかでは、ワクワクする発見に変わっていきます。',
      color: 0xe87a5d
    }
  };

  const checkinBtns = document.querySelectorAll('[data-checkin]');
  const responseBox = document.getElementById('checkinResponse');
  const responseBadge = document.getElementById('responseBadge');
  const responseText = document.getElementById('responseText');

  checkinBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.checkin;
      const item = checkinData[key];
      if (!item) return;

      checkinBtns.forEach((b) => b.classList.toggle('is-selected', b === btn));

      if (responseBadge) responseBadge.textContent = item.badge;
      if (responseText) responseText.textContent = item.text;

      if (responseBox) {
        responseBox.classList.remove('is-popping');
        // Reflow for crisp pop replay
        void responseBox.offsetWidth;
        responseBox.classList.add('is-popping');
      }

      if (tsuwanoScene) {
        tsuwanoScene.triggerPopBurst(item.color);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 8. Back-to-top button
  // -------------------------------------------------------------------------
  const backTopBtn = document.getElementById('backTopBtn');
  if (backTopBtn) {
    backTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
