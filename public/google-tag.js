/* Google Analytics G-YR7B1XDDLM. Basic consent: no Google request before opt-in. */
(() => {
  if (window.artificialsAnalytics) return;
  const id = 'G-YR7B1XDDLM';
  const key = 'artificials-analytics-consent-v1';
  const disabled = `ga-disable-${id}`;
  let consent = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'granted' || saved === 'denied') consent = saved;
  } catch {
    /* Preferences remain usable in memory when storage is unavailable. */
  }
  let current = null;
  let previous = '';
  let lastSent = '';
  let started = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };
  window[disabled] = true;
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  const announce = () => window.dispatchEvent(new Event('artificials:analytics-consent'));
  function clearCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? '; Domain=' + domain : ''}`;
      }
    }
  }
  function measure() {
    const allowed = consent === 'granted' && current && location.hostname === 'artificials.net';
    window[disabled] = !allowed;
    if (!allowed || current.location === lastSent) return;
    if (!started) {
      started = true;
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      window.gtag('js', new Date());
      window.gtag('config', id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: current.location,
        page_referrer: '',
      });
      const script = document.createElement('script');
      script.id = 'artificials-google-tag';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      script.referrerPolicy = 'origin';
      document.head.appendChild(script);
    }
    window.gtag('event', 'page_view', {
      send_to: id,
      page_location: current.location,
      page_title: current.title,
      page_referrer: previous,
    });
    lastSent = current.location;
    previous = current.location;
  }
  window.artificialsAnalytics = {
    getConsent: () => consent,
    setConsent(value) {
      if (value !== 'granted' && value !== 'denied') return;
      consent = value;
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Memory fallback. */
      }
      if (value === 'denied') {
        window[disabled] = true;
        lastSent = previous = '';
        window.gtag('consent', 'update', { analytics_storage: 'denied' });
        clearCookies();
      } else if (started) {
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
      }
      measure();
      announce();
    },
    page(page) {
      current = page;
      if (!page) {
        lastSent = '';
        previous = '';
      }
      measure();
    },
  };
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    const next = event.newValue === 'granted' ? 'granted' : 'denied';
    // Reuse the same withdrawal path without persisting another storage event.
    if (next !== consent) window.artificialsAnalytics.setConsent(next);
  });
})();
