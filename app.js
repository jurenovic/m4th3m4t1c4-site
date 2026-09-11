(function () {
  'use strict';

  var LANGS = window.M4_LANGUAGES;
  var DEFAULT = window.M4_DEFAULT_LANG;
  var APP_STORE = window.M4_APP_STORE;
  var PLAY_STORE = window.M4_PLAY_STORE;
  var EMAIL = window.M4_SUPPORT_EMAIL;
  var STORAGE_KEY = 'm4th:lang';
  var cache = {};
  var state = { lang: DEFAULT, view: 'home', strings: null, menuOpen: false, langOpen: false };

  var ASSETS = {
    journey: './assets/light-journey-xMfei9hJ.png',
    practise: './assets/light-free-practise-i24tnlOp.png',
    question: './assets/light-question-DAvM9LYx.png',
    success: './assets/light-success-DACb4oEo.png',
  };

  var FEATURE_COLORS = [
    { color: '#2db88a', bg: '#EAF7F2' },
    { color: '#f0503a', bg: '#FFF0EF' },
    { color: '#e6a23c', bg: '#FFF7E8' },
    { color: '#ba8ce8', bg: '#F6EFFC' },
    { color: '#3d7ea6', bg: '#EAF3F8' },
    { color: '#f0503a', bg: '#FFF0EF' },
  ];

  function supportedCodes() {
    return LANGS.map(function (l) { return l.code; });
  }

  function detectBrowserLang() {
    var list = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || DEFAULT];
    for (var i = 0; i < list.length; i++) {
      var raw = (list[i] || '').toLowerCase();
      var primary = raw.split('-')[0];
      // nb/no mapping
      if (primary === 'no') primary = 'nb';
      if (supportedCodes().indexOf(primary) !== -1) return primary;
    }
    return DEFAULT;
  }

  function parseRoute() {
    // Restore path after 404.html redirect
    var redirected = sessionStorage.getItem('m4th:redirect');
    if (redirected) {
      sessionStorage.removeItem('m4th:redirect');
      history.replaceState(null, '', redirected);
    }
    var path = location.pathname.replace(/\/+/g, '/');
    // Strip trailing index.html
    path = path.replace(/\/index\.html$/i, '/');
    var parts = path.split('/').filter(Boolean);
    // If first segment is a language code
    var lang = null;
    var view = 'home';
    if (parts.length && supportedCodes().indexOf(parts[0]) !== -1) {
      lang = parts[0];
      if (parts[1] === 'privacy') view = 'privacy';
      else if (parts[1] === 'terms') view = 'terms';
    } else if (parts[0] === 'privacy') {
      view = 'privacy';
    } else if (parts[0] === 'terms') {
      view = 'terms';
    }
    return { lang: lang, view: view };
  }

  function resolveLang(routeLang) {
    if (routeLang) return routeLang;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && supportedCodes().indexOf(stored) !== -1) return stored;
    } catch (e) {}
    return detectBrowserLang();
  }

  function localePath(lang, view) {
    var base = '/' + lang + '/';
    if (view === 'privacy') return base + 'privacy';
    if (view === 'terms') return base + 'terms';
    return base;
  }

  function navigate(lang, view, replace) {
    var url = localePath(lang, view || 'home');
    if (replace) history.replaceState({ lang: lang, view: view }, '', url);
    else history.pushState({ lang: lang, view: view }, '', url);
    state.lang = lang;
    state.view = view || 'home';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    loadAndRender();
  }

  function t() { return state.strings || {}; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadLocale(code) {
    if (cache[code]) return Promise.resolve(cache[code]);
    return fetch('./locales/' + code + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('missing locale ' + code);
        return r.json();
      })
      .then(function (json) {
        cache[code] = json;
        return json;
      });
  }

  function setDocumentMeta(s, lang) {
    document.documentElement.lang = lang;
    document.title = s.meta.title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', s.meta.description);
  }

  function storeBadge(href, small, strong, svg) {
    return (
      '<a class="store-badge" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
        svg +
        '<span><small>' + esc(small) + '</small><strong>' + esc(strong) + '</strong></span>' +
      '</a>'
    );
  }

  var appleSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.8.88-2.12 1.56-3.26 1.46-.14-1.1.42-2.26 1.16-3.06.82-.9 2.24-1.56 3.28-1.42zM20.7 17.3c-.54 1.24-.8 1.78-1.5 2.86-.98 1.5-2.36 3.36-4.08 3.38-1.52.02-1.92-.98-4-.98-2.1 0-2.54.96-4.04.98-1.72.04-3.04-1.72-4.02-3.2C1.1 17.1-.5 12.4 1.56 9.18c1.02-1.6 2.64-2.62 4.46-2.64 1.74-.04 3.38 1.18 4 1.18.6 0 2.56-1.46 4.32-1.24.74.04 2.82.3 4.16 2.24-.1.06-2.48 1.46-2.46 4.36.04 3.44 3 4.58 3.02 4.6-.02.06-.46 1.62-1.36 3.62z"/></svg>';
  var playSvg = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M3 20.5V3.5c0-.5.3-.9.7-1.1l11.2 9.1L3.7 21.6c-.4-.2-.7-.6-.7-1.1z"/><path fill="#FBBC04" d="M16.5 14.7l-2.6-2.1 2.6-2.1 3.3 1.9c.8.5.8 1.6 0 2.1l-3.3 2.2z"/><path fill="#4285F4" d="M3.7 21.6l10.9-8.9 2 1.6-11.2 8.4c-.6.4-1.4-.1-1.7-1.1z"/><path fill="#34A853" d="M3.7 2.4C4 1.4 4.8.9 5.4 1.3l11.2 8.4-2 1.6L3.7 2.4z"/></svg>';

  function renderNav(s) {
    var lang = LANGS.find(function (l) { return l.code === state.lang; }) || LANGS[6];
    var items = LANGS.map(function (l) {
      return '<button type="button" class="lang-item' + (l.code === state.lang ? ' active' : '') +
        '" data-lang="' + l.code + '">' + l.flag + ' ' + esc(l.name) + '</button>';
    }).join('');
    return (
      '<header class="nav"><div class="container nav-inner">' +
        '<a class="brand" href="' + localePath(state.lang, 'home') + '" data-nav="home">M4th3m4t1c4</a>' +
        '<button type="button" class="menu-toggle" id="menuToggle" aria-label="Menu">☰</button>' +
        '<nav class="nav-links" id="navLinks">' +
          '<a href="#features" data-scroll="features">' + esc(s.nav.features) + '</a>' +
          '<a href="#how" data-scroll="how">' + esc(s.nav.how) + '</a>' +
          '<a href="#screenshots" data-scroll="screenshots">' + esc(s.nav.screenshots) + '</a>' +
          '<a class="nav-cta" href="#download" data-scroll="download">' + esc(s.nav.download) + '</a>' +
          '<div class="lang-wrap">' +
            '<button type="button" class="lang-btn" id="langBtn" aria-haspopup="listbox">' +
              lang.flag + ' ' + esc(lang.name) + ' ▾</button>' +
            '<div class="lang-menu" id="langMenu" role="listbox">' + items + '</div>' +
          '</div>' +
        '</nav>' +
      '</div></header>'
    );
  }

  function renderHome(s) {
    var feats = s.features.items.map(function (item, i) {
      var c = FEATURE_COLORS[i % FEATURE_COLORS.length];
      return '<article class="feature"><div class="emoji" style="background:' + c.bg + '">' +
        item.emoji + '</div><h3>' + esc(item.title) + '</h3><p>' + esc(item.desc) + '</p></article>';
    }).join('');

    var steps = s.how.steps.map(function (step) {
      return '<article class="step"><div class="n">' + esc(step.n) + ' ' + step.icon +
        '</div><h3>' + esc(step.title) + '</h3><p>' + esc(step.desc) + '</p></article>';
    }).join('');

    var shots = [
      { src: ASSETS.practise, cap: s.screenshots.caps[0] },
      { src: ASSETS.journey, cap: s.screenshots.caps[1] },
      { src: ASSETS.question, cap: s.screenshots.caps[2] },
      { src: ASSETS.success, cap: s.screenshots.caps[3] },
    ].map(function (sh) {
      return '<figure class="shot"><img src="' + sh.src + '" alt="' + esc(sh.cap) +
        '" loading="lazy" /><figcaption>' + esc(sh.cap) + '</figcaption></figure>';
    }).join('');

    var stats = s.hero.stats.map(function (st) {
      return '<div class="stat"><div class="num">' + esc(st.value) + '</div><div class="label">' +
        esc(st.label) + '</div></div>';
    }).join('');

    return (
      renderNav(s) +
      '<main>' +
        '<section class="hero"><div class="container hero-grid">' +
          '<div>' +
            '<div class="eyebrow">' + esc(s.hero.eyebrow) + '</div>' +
            '<h1>' + esc(s.hero.titleBefore) + ' <span class="accent">' + esc(s.hero.titleAccent) + '</span></h1>' +
            '<p class="hero-lead">' + esc(s.hero.lead) + '</p>' +
            '<div class="store-row">' +
              storeBadge(APP_STORE, s.hero.downloadOn, s.hero.appStore, appleSvg) +
              storeBadge(PLAY_STORE, s.hero.getItOn, s.hero.googlePlay, playSvg) +
            '</div>' +
            '<div class="loved">' + esc(s.hero.loved) + '</div>' +
            '<div class="stats">' + stats + '</div>' +
          '</div>' +
          '<div class="phone-stack" aria-hidden="true">' +
            '<div class="phone p1"><img src="' + ASSETS.journey + '" alt="" /></div>' +
            '<div class="phone p2"><img src="' + ASSETS.success + '" alt="" /></div>' +
          '</div>' +
        '</div></section>' +

        '<section id="features"><div class="container">' +
          '<div class="section-kicker">' + esc(s.features.kicker) + '</div>' +
          '<h2 class="section-title">' + esc(s.features.title) + '</h2>' +
          '<p class="section-sub">' + esc(s.features.sub) + '</p>' +
          '<div class="features">' + feats + '</div>' +
        '</div></section>' +

        '<section class="how" id="how"><div class="container">' +
          '<div class="section-kicker">' + esc(s.how.kicker) + '</div>' +
          '<h2 class="section-title">' + esc(s.how.title) + '</h2>' +
          '<p class="section-sub">' + esc(s.how.sub) + '</p>' +
          '<div class="steps">' + steps + '</div>' +
        '</div></section>' +

        '<section id="screenshots"><div class="container">' +
          '<div class="section-kicker">' + esc(s.screenshots.kicker) + '</div>' +
          '<h2 class="section-title">' + esc(s.screenshots.title) + '</h2>' +
          '<p class="section-sub">' + esc(s.screenshots.sub) + '</p>' +
          '<div class="shots-grid">' + shots + '</div>' +
        '</div></section>' +

        '<section class="cta" id="download"><div class="container">' +
          '<h2>' + esc(s.cta.title) + '</h2>' +
          '<p>' + esc(s.cta.sub) + '</p>' +
          '<div class="qr-row">' +
            '<div class="qr-card"><div class="qr-box" id="qrApple"></div><div class="qr-label">' +
              esc(s.cta.scanApple) + '</div></div>' +
            '<div class="qr-card"><div class="qr-box" id="qrPlay"></div><div class="qr-label">' +
              esc(s.cta.scanPlay) + '</div></div>' +
          '</div>' +
          '<div class="store-row" style="justify-content:center">' +
            storeBadge(APP_STORE, s.hero.downloadOn, s.hero.appStore, appleSvg) +
            storeBadge(PLAY_STORE, s.hero.getItOn, s.hero.googlePlay, playSvg) +
          '</div>' +
          '<p class="cta-note">' + esc(s.cta.note) + '</p>' +
        '</div></section>' +
      '</main>' +
      renderFooter(s)
    );
  }

  function renderFooter(s) {
    return (
      '<footer class="footer"><div class="container footer-inner">' +
        '<div>' +
          '<a href="' + localePath(state.lang, 'privacy') + '" data-nav="privacy">' + esc(s.footer.privacy) + '</a>' +
          '<a href="' + localePath(state.lang, 'terms') + '" data-nav="terms">' + esc(s.footer.terms) + '</a>' +
          '<a href="mailto:' + EMAIL + '">' + esc(s.footer.support) + '</a>' +
        '</div>' +
        '<div class="copy">' + esc(s.footer.copy) + '</div>' +
      '</div></footer>'
    );
  }

  function renderLegal(s, kind) {
    var md = kind === 'privacy' ? s.legal.privacy : s.legal.terms;
    var html = (window.marked && marked.parse) ? marked.parse(md) : '<pre>' + esc(md) + '</pre>';
    return (
      renderNav(s) +
      '<main class="legal-page"><div class="container"><div class="legal-card">' +
        '<div class="legal-toolbar">' +
          '<button type="button" class="back-btn" data-nav="home">← ' + esc(s.legal.back) + '</button>' +
          '<button type="button" class="copy-btn" id="copySection">' + esc(s.legal.copyLink) + '</button>' +
        '</div>' +
        '<div class="legal-md">' + html + '</div>' +
        '<div class="questions">' + esc(s.legal.questions) + ' <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></div>' +
      '</div></div></main>' +
      renderFooter(s)
    );
  }

  function paintQr(el, text) {
    if (!el || !window.qrcode) return;
    try {
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      el.innerHTML = qr.createImgTag(4, 8);
      var img = el.querySelector('img');
      if (img) { img.alt = text; img.width = 140; img.height = 140; }
    } catch (e) {
      el.textContent = text;
    }
  }

  function bindUi() {
    var root = document.getElementById('root');
    root.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        navigate(state.lang, el.getAttribute('data-nav'));
        window.scrollTo(0, 0);
      });
    });
    root.querySelectorAll('[data-scroll]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (state.view !== 'home') {
          ev.preventDefault();
          navigate(state.lang, 'home');
          setTimeout(function () {
            var t = document.getElementById(el.getAttribute('data-scroll'));
            if (t) t.scrollIntoView({ behavior: 'smooth' });
          }, 50);
          return;
        }
        var t = document.getElementById(el.getAttribute('data-scroll'));
        if (t) { ev.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
      });
    });
    var menuToggle = document.getElementById('menuToggle');
    var navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
      });
    }
    var langBtn = document.getElementById('langBtn');
    var langMenu = document.getElementById('langMenu');
    if (langBtn && langMenu) {
      langBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        langMenu.classList.toggle('open');
      });
      langMenu.querySelectorAll('[data-lang]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          navigate(btn.getAttribute('data-lang'), state.view);
        });
      });
      document.addEventListener('click', function () { langMenu.classList.remove('open'); }, { once: true });
    }
    var copyBtn = document.getElementById('copySection');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.textContent = t().legal.copied;
            setTimeout(function () { copyBtn.textContent = t().legal.copyLink; }, 1500);
          });
        }
      });
    }
    paintQr(document.getElementById('qrApple'), APP_STORE);
    paintQr(document.getElementById('qrPlay'), PLAY_STORE);
  }

  function render() {
    var s = t();
    setDocumentMeta(s, state.lang);
    var root = document.getElementById('root');
    if (state.view === 'privacy' || state.view === 'terms') {
      root.innerHTML = renderLegal(s, state.view);
    } else {
      root.innerHTML = renderHome(s);
    }
    bindUi();
  }

  function loadAndRender() {
    return loadLocale(state.lang).catch(function () {
      if (state.lang !== DEFAULT) {
        state.lang = DEFAULT;
        return loadLocale(DEFAULT);
      }
      throw new Error('en locale missing');
    }).then(function (strings) {
      state.strings = strings;
      render();
    }).catch(function (err) {
      document.getElementById('root').innerHTML =
        '<p style="padding:40px;font-family:sans-serif">Failed to load locale: ' + esc(err.message) + '</p>';
    });
  }

  function boot() {
    var route = parseRoute();
    state.view = route.view;
    state.lang = resolveLang(route.lang);
    // Normalize URL to include lang prefix
    var desired = localePath(state.lang, state.view);
    if (location.pathname.replace(/\/+/g, '/') !== desired &&
        location.pathname.replace(/\/index\.html$/i, '/') !== desired) {
      history.replaceState({ lang: state.lang, view: state.view }, '', desired);
    }
    try { localStorage.setItem(STORAGE_KEY, state.lang); } catch (e) {}
    loadAndRender();
  }

  window.addEventListener('popstate', function () {
    var route = parseRoute();
    state.lang = resolveLang(route.lang);
    state.view = route.view;
    loadAndRender();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
