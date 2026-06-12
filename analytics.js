(function () {
  var endpoint = 'https://analytics.nice.okinawa/collect';
  var site = 'translation.nice.okinawa';
  var sessionKey = 'nice_analytics_session';
  var start = Date.now();
  var maxScroll = 0;
  var visibleSections = {};
  var sectionTimers = {};
  var lastSection = '';

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }

  function getSessionId() {
    try {
      var existing = sessionStorage.getItem(sessionKey);
      if (existing) return existing;
      var id = uuid();
      sessionStorage.setItem(sessionKey, id);
      return id;
    } catch (e) {
      return uuid();
    }
  }

  var sessionId = getSessionId();
  var visitorId = (function () {
    try {
      var key = 'nice_analytics_visitor';
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var id = uuid();
      localStorage.setItem(key, id);
      return id;
    } catch (e) {
      return '';
    }
  })();

  function language() {
    return document.documentElement.dataset.staticLang || document.body.dataset.lang || document.documentElement.lang || navigator.language || '';
  }

  function scrollDepth() {
    var doc = document.documentElement;
    var body = document.body;
    var scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
    var height = Math.max(body.scrollHeight, doc.scrollHeight) - window.innerHeight;
    if (height <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((scrollTop / height) * 100)));
  }

  function payload(type, extra) {
    var data = {
      type: type,
      site: site,
      session_id: sessionId,
      visitor_id: visitorId,
      path: location.pathname,
      title: document.title,
      url: location.href,
      referrer: document.referrer,
      lang: language(),
      browser_lang: navigator.language || '',
      screen: (screen && screen.width ? screen.width + 'x' + screen.height : ''),
      viewport: window.innerWidth + 'x' + window.innerHeight,
      ts: new Date().toISOString()
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        data[key] = extra[key];
      });
    }
    return data;
  }

  function send(type, extra, keepalive) {
    var body = JSON.stringify(payload(type, extra));
    if (navigator.sendBeacon && keepalive) {
      try {
        var blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
        return;
      } catch (e) {}
    }
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body,
        keepalive: !!keepalive,
        mode: 'cors'
      }).catch(function () {});
    } catch (e) {}
  }

  function contactType(el) {
    var href = el.getAttribute('href') || '';
    var text = (el.textContent || '').toLowerCase();
    if (href.indexOf('wa.me') >= 0 || text.indexOf('whatsapp') >= 0) return 'whatsapp';
    if (href.indexOf('mailto:') === 0 || text.indexOf('email') >= 0) return 'email';
    if (text.indexOf('wechat') >= 0 || text.indexOf('okinawaonline') >= 0) return 'wechat';
    if (href.indexOf('#contact') >= 0) return 'contact';
    return '';
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a, button, summary, select');
    if (!link) return;
    var kind = '';
    var label = (link.textContent || link.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    var href = link.getAttribute && link.getAttribute('href');
    var contact = link.matches('a') ? contactType(link) : '';
    if (contact) kind = 'contact_' + contact;
    else if (link.closest('#nl')) kind = 'nav';
    else if (link.closest('#fab')) kind = 'floating_contact';
    else if (link.id === 'langSel') kind = 'language_select';
    else kind = link.tagName.toLowerCase();
    send('click', {
      event_name: kind,
      label: label,
      href: href || '',
      section: lastSection
    });
  }, true);

  window.addEventListener('scroll', function () {
    maxScroll = Math.max(maxScroll, scrollDepth());
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.id || entry.target.tagName.toLowerCase();
        if (entry.isIntersecting) {
          lastSection = id;
          visibleSections[id] = (visibleSections[id] || 0) + 1;
          sectionTimers[id] = Date.now();
          send('section_view', { section: id });
        } else if (sectionTimers[id]) {
          var ms = Date.now() - sectionTimers[id];
          sectionTimers[id] = 0;
          if (ms > 800) send('section_time', { section: id, duration_ms: ms });
        }
      });
    }, { threshold: 0.55 });
    document.querySelectorAll('header[id], section[id]').forEach(function (section) {
      observer.observe(section);
    });
  }

  send('page_view', {
    utm_source: new URLSearchParams(location.search).get('utm_source') || '',
    utm_medium: new URLSearchParams(location.search).get('utm_medium') || '',
    utm_campaign: new URLSearchParams(location.search).get('utm_campaign') || ''
  });

  window.addEventListener('pagehide', function () {
    send('page_leave', {
      duration_ms: Date.now() - start,
      max_scroll: Math.max(maxScroll, scrollDepth()),
      section: lastSection
    }, true);
  });
})();
