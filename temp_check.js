
    if (localStorage.getItem('theme') === 'light') {
      document.documentElement.classList.add('light-theme');
    }
    // в”Ђв”Ђв”Ђ BLOB URL TRACKING (prevent memory leaks from photo previews) в”Ђв”Ђв”Ђ

    // в”Ђв”Ђв”Ђ GLOBAL FOOTER EVENT DELEGATION в”Ђв”Ђв”Ђ
    document.addEventListener('click', (e) => {
      const footerLink = e.target.closest('.footer-link');
      if (footerLink) {
        e.preventDefault();
        const link = footerLink.getAttribute('data-link');
        if (link === 'faq') {
          currentSubScreen = 'faq';
          renderCurrentScreen();
        } else if (link === 'about') {
          currentSubScreen = 'about';
          renderCurrentScreen();
        } else if (link === 'offer') {
          downloadAgreement();
        } else {
          tgUtil.alert(footerLink.innerText + ' Р±СѓРґРµС‚ РґРѕСЃС‚СѓРїРЅРѕ РїРѕР·Р¶Рµ');
        }
        return;
      }

      const socialIcon = e.target.closest('.social-icon');
      if (socialIcon) {
        e.preventDefault();
        tgUtil.alert('РЎРѕС†СЃРµС‚Рё Р±СѓРґСѓС‚ РїРѕРґРєР»СЋС‡РµРЅС‹ РїРѕР·Р¶Рµ');
        return;
      }
    });

    const _photoBlobUrls = new Map();
    function trackBlobUrl(key, file) {
      const old = _photoBlobUrls.get(key);
      if (old) URL.revokeObjectURL(old);
      const url = URL.createObjectURL(file);
      _photoBlobUrls.set(key, url);
      return url;
    }
    function clearBlobUrls(prefix) {
      for (const [key, url] of _photoBlobUrls.entries()) {
        if (!prefix || key.startsWith(prefix)) {
          URL.revokeObjectURL(url);
          _photoBlobUrls.delete(key);
        }
      }
    }

    // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    // ICE LOGIX ICON SYSTEM вЂ” inline SVG icons rendered via ix(name, opts)
    // 24Г—24 viewBox, currentColor stroke, 2px stroke, round caps. Glass-style.
    // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    const ICON_PATHS = {
      // Status & feedback
      check:        '<polyline points="20 6 9 17 4 12"/>',
      x:            '<path d="M18 6 6 18M6 6l12 12"/>',
      info:         '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
      warn:         '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
      error:        '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
      hourglass:    '<path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
      celebrate:    '<path d="m5.8 11.3 2.9 7.1L21 8M9 16l-3 3-3-3M9 8l3-3 3 3"/><circle cx="12" cy="12" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/>',
      sparkles:     '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/>',

      // Navigation & arrows
      arrowLeft:    '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
      arrowRight:   '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
      arrowUp:      '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
      arrowDown:    '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
      arrowUpRight: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
      chevronLeft:  '<polyline points="15 18 9 12 15 6"/>',
      chevronRight: '<polyline points="9 18 15 12 9 6"/>',
      chevronDown:  '<polyline points="6 9 12 15 18 9"/>',
      chevronUp:    '<polyline points="18 15 12 9 6 15"/>',
      externalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      refresh:      '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
      compare:      '<path d="M21 8 17 4M17 4l-4 4M17 4v16"/><path d="m3 16 4 4M7 20l4-4M7 20V4"/>',

      // Actions & tools
      plus:         '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      minus:        '<line x1="5" y1="12" x2="19" y2="12"/>',
      edit:         '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
      trash:        '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
      copy:         '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      paste:        '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
      save:         '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
      send:         '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
      filter:       '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
      settings:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      search:       '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      eye:          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
      eyeOff:       '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
      link:         '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
      attach:       '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
      upload:       '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      download:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',

      // People & profile
      user:         '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      users:        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      crown:        '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14"/>',
      wave:         '<path d="M21 6.7c-1 0-1.8.8-1.8 1.8V15M16.5 5.5c-1 0-1.8.8-1.8 1.8V15M11.5 8c-1 0-1.8.8-1.8 1.8V15M7 11c-1 0-1.8.8-1.8 1.8V15"/><path d="M19.2 15v.5a7.2 7.2 0 0 1-14.4 0V11"/>',

      // Communication
      bell:         '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      chat:         '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      mail:         '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
      phone:        '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',

      // Commerce
      cart:         '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
      bag:          '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
      package:      '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      truck:        '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
      gift:         '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
      tag:          '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
      coins:        '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
      wallet:       '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4z"/>',
      card:         '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
      diamond:      '<polygon points="6 3 18 3 22 9 12 22 2 9 6 3"/><line x1="11" y1="3" x2="8" y2="9"/><line x1="13" y1="3" x2="16" y2="9"/><line x1="2" y1="9" x2="22" y2="9"/>',

      // Hearts & social
      heart:        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
      heartOutline: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
      star:         '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      starHalf:     '<defs><linearGradient id="_sh" x1="0" x2="1" y1="0" y2="0"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#_sh)"/>',
      fire:         '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',

      // Media & content
      image:        '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
      camera:       '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
      video:        '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
      file:         '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      clipboard:    '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
      note:         '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
      bookOpen:     '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
      academy:      '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
      chart:        '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
      trendingUp:   '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      trophy:       '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16M10 14.66V17c0 .55-.47 1-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47 1 .97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
      shieldCheck:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
      lock:         '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      unlock:       '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
      key:          '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
      globe:        '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      clock:        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      calendar:     '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      mapPin:       '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
      home:         '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      list:         '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
      grid:         '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      menu:         '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
      flash:        '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      robot:        '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>',
      airplane:     '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.2.6-.6.5-1.1z"/>',
      moon:         '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
      sun:          '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
      database:     '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
      passport:     '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 17h6"/>',
      languages:    '<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1"/><path d="m22 22-5-10-5 10M14 18h6"/>',
      // Product / category icons
      sneaker:      '<path d="M2 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2.5L18 13l-3-1-2-3-3-2H5l-3 4z"/><path d="M2 15h20"/>',
      boot:         '<path d="M4 4v12a4 4 0 0 0 4 4h6l4-3v-5l4-1V6a2 2 0 0 0-2-2z"/><path d="M4 13h10"/>',
      sandal:       '<path d="M5 6h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><circle cx="9" cy="3" r="1"/><circle cx="15" cy="3" r="1"/><circle cx="12" cy="3" r="1"/>',
      shoe:         '<path d="M2 16v3a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-3l-5-3-3 1-3-4-4-1H4z"/>',
      tshirt:       '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47A1 1 0 0 0 3.84 10H7v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9h3.16a1 1 0 0 0 .98-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
      jacket:       '<path d="M16 2v2l5 2v6l-3 1v9h-4v-9l-2 2-2-2v9H6v-9l-3-1V6l5-2V2"/>',
      pants:        '<path d="M6 2h12l-1 8 1 12h-4l-2-12-2 12H6l1-12z"/>',
      shorts:       '<path d="M5 4h14l-1 8 1 8h-5l-2-7-2 7H4l1-8z"/>',
      dress:        '<path d="M9 3 7 8l-3 11h16L17 8l-2-5M9 3h6M12 8v3M10 11h4"/>',
      suit:         '<path d="M16 2v2l4 4v12a2 2 0 0 1-2 2h-2v-9l-4-4h-1l-4 4v9H4a2 2 0 0 1-2-2V8l4-4V2M11 8l1 6 1-6"/>',
      swim:         '<path d="M4 8h6l1 4M14 12l1-4h6M4 8l2 14h12l2-14M11 12h2"/>',
      backpack:     '<path d="M4 20V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 4V2h6v2M4 14h16"/>',
      bagHandle:    '<path d="M6 6v4a6 6 0 0 0 12 0V6M3 8h18l-1.5 12a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z"/>',
      walletSmall:  '<path d="M3 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4h2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM17 14h2"/>',
      belt:         '<rect x="2" y="9" width="20" height="6" rx="1"/><rect x="9" y="11" width="6" height="2"/>',
      watch:        '<circle cx="12" cy="12" r="6"/><path d="M12 9v3l2 2M9 4l1.5-2h3L15 4M9 20l1.5 2h3L15 20"/>',
      sunglasses:   '<path d="M6 14a4 4 0 1 0 8 0v-2H6v2M10 14a4 4 0 1 0 8 0v-2h-8v2"/><path d="M2 9l4 3M22 9l-4 3"/>',
      cap:          '<path d="M2 18h20l-1-3a8 8 0 0 0-7-5h-4a8 8 0 0 0-7 5z"/><path d="M2 18v2h20v-2"/>',
      ring:         '<circle cx="12" cy="15" r="6"/><path d="M9 4l3 6 3-6z"/>',
      flower:       '<circle cx="12" cy="12" r="3"/><path d="M12 9V3M12 21v-6M9 12H3M21 12h-6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2"/>',
      cosmetic:     '<path d="M9 3h6v4l-1 1v3h-4V8L9 7z"/><rect x="8" y="11" width="8" height="10" rx="1"/>',
      smartphone:   '<rect x="7" y="2" width="10" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
      briefcase:    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
      // Misc
      pin:          '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>',
      ticket:       '<path d="M3 7v4a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><line x1="13" y1="5" x2="13" y2="7"/><line x1="13" y1="11" x2="13" y2="13"/><line x1="13" y1="17" x2="13" y2="19"/>',
      megaphone:    '<path d="M3 11l18-5v12L3 14z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
      box:          '<path d="M3 7l9 5 9-5"/><path d="M3 7v10l9 5 9-5V7l-9-5z"/><line x1="12" y1="12" x2="12" y2="22"/>',
      newBadge:     '<rect x="2" y="6" width="20" height="12" rx="6"/><path d="M7 9v6M7 9l4 6V9M14 9v6h3M14 12h3M19 9v6"/>',
      bot:          '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/>',
      // Marketplace dots вЂ” accent colors used by mpDot()
      // (no path вЂ” handled by mpDot helper)
    };

    /**
     * Render an inline SVG icon.
     * @param {string} name - icon name from ICON_PATHS.
     * @param {object} opts - { size, cls, stroke, fill, viewBox, style }.
     * @returns {string} HTML string.
     */
    function ix(name, opts = {}) {
      const p = ICON_PATHS[name];
      if (!p) return '';
      const cls = ['ix', opts.cls || ''].filter(Boolean).join(' ');
      const sz  = opts.size || '';
      const sw  = opts.stroke ?? 2;
      const vb  = opts.viewBox || '0 0 24 24';
      const fill= opts.fill || 'none';
      const stl = opts.style ? ` style="${opts.style}"` : '';
      const szAttr = sz ? ` style="width:${sz};height:${sz}"` : '';
      return `<span class="${cls}"${szAttr}${stl}><svg viewBox="${vb}" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg></span>`;
    }

    /**
     * Render the brand snowflake as a styled SVG (replaces the вќ„пёЏ emoji
     * for non-balance places that still want a stylized snowflake).
     */
    function brandFlake(opts = {}) {
      const sz = opts.size || '1em';
      const cls = ['brand-flake', opts.cls || ''].filter(Boolean).join(' ');
      return `<span class="${cls}" style="width:${sz};height:${sz}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span>`;
    }

    /** Render a marketplace colored dot вЂ” replaces рџџўрџџ рџџЎрџџ¤вљ«рџ”µ emoji. */
    function mpDot(color) {
      const safe = String(color || '#9CA3AF').replace(/[^#a-zA-Z0-9(),.\s]/g, '');
      return `<span class="mp-dot" style="background:${safe}" aria-hidden="true"></span>`;
    }

    /** Render a 1-5 star rating row using star icons. */
    function starRow(rating, max = 5) {
      const r = Math.max(0, Math.min(max, Number(rating) || 0));
      let html = '<span class="star-row">';
      for (let i = 1; i <= max; i++) {
        if (i <= Math.floor(r)) html += ix('star', { cls: 'ix-fill' });
        else if (i - r < 1) html += ix('starHalf', { cls: 'ix-fill' });
        else html += `<span class="ix" style="color: rgba(255,255,255,0.25)">${ix('star').replace('<span class="ix">','').replace('</span>','')}</span>`;
      }
      return html + '</span>';
    }

    // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    // GLASS MODAL вЂ” in-app alert / confirm / popup that replaces native dialogs
    // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    let _glassModalRoot = null;
    function _ensureGlassModalRoot() {
      if (_glassModalRoot && document.body.contains(_glassModalRoot)) return _glassModalRoot;
      _glassModalRoot = document.createElement('div');
      _glassModalRoot.id = 'glassModalRoot';
      document.body.appendChild(_glassModalRoot);
      return _glassModalRoot;
    }

    /**
     * Show a glass-style modal (alert / confirm / custom buttons).
     * @param {object} opts - { title, message, kind, buttons }
     *   - title: header text (string)
     *   - message: body text (string)
     *   - kind: 'info' | 'success' | 'warning' | 'error' | 'confirm'
     *   - buttons: array of { id, label, variant: 'primary'|'danger'|'ghost'|'' }
     * @returns {Promise<string>} resolves to clicked button id (or 'ok'/'cancel').
     */
    function glassModal(opts = {}) {
      const root = _ensureGlassModalRoot();
      const kind = opts.kind || 'info';
      const iconName = ({ success: 'check', warning: 'warn', error: 'error', info: 'info', confirm: 'info' })[kind] || 'info';
      const title = opts.title || ({ success: 'Р“РѕС‚РѕРІРѕ', warning: 'Р’РЅРёРјР°РЅРёРµ', error: 'РћС€РёР±РєР°', info: 'РЎРѕРѕР±С‰РµРЅРёРµ', confirm: 'РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ' })[kind];
      const message = opts.message || '';
      const buttons = opts.buttons && opts.buttons.length ? opts.buttons : [{ id: 'ok', label: 'РџРѕРЅСЏС‚РЅРѕ', variant: 'primary' }];

      const overlay = document.createElement('div');
      overlay.className = 'glass-modal-overlay';
      overlay.innerHTML = `
        <div class="glass-modal" role="dialog" aria-modal="true">
          <div class="glass-modal-header">
            <div class="glass-modal-icon ${kind}">${ix(iconName, { size: '24px' })}</div>
            <div class="glass-modal-title"></div>
          </div>
          <div class="glass-modal-body"></div>
          <div class="glass-modal-footer"></div>
        </div>
      `;
      overlay.querySelector('.glass-modal-title').textContent = title;
      overlay.querySelector('.glass-modal-body').textContent = message;
      const footer = overlay.querySelector('.glass-modal-footer');
      buttons.forEach((b) => {
        const btn = document.createElement('button');
        btn.className = 'glass-modal-btn ' + (b.variant || '');
        btn.textContent = b.label;
        btn.dataset.id = b.id;
        footer.appendChild(btn);
      });
      root.innerHTML = '';
      root.appendChild(overlay);
      // Trigger CSS transition
      requestAnimationFrame(() => overlay.classList.add('show'));

      return new Promise((resolve) => {
        const close = (id) => {
          overlay.classList.remove('show');
          setTimeout(() => { try { overlay.remove(); } catch {} resolve(id); }, 260);
        };
        footer.querySelectorAll('.glass-modal-btn').forEach((btn) => {
          btn.addEventListener('click', () => close(btn.dataset.id));
        });
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close('cancel');
        });
      });
    }

    /** Show a non-blocking glass toast (auto-dismisses). */
    function glassToast(message, opts = {}) {
      const kind = opts.kind || 'info';
      const iconName = ({ success: 'check', warning: 'warn', error: 'error', info: 'info' })[kind] || 'info';
      const duration = opts.duration ?? 2600;
      const node = document.createElement('div');
      node.className = `glass-toast toast-${kind}`;
      node.innerHTML = `${ix(iconName, { size: '20px' })}<span></span>`;
      node.querySelector('span').textContent = String(message ?? '');
      document.body.appendChild(node);
      requestAnimationFrame(() => node.classList.add('show'));
      setTimeout(() => {
        node.classList.remove('show');
        setTimeout(() => { try { node.remove(); } catch {} }, 300);
      }, duration);
    }

    /** Heuristic to pick a glass-modal kind from message text. */
    function _guessKind(msg) {
      const s = String(msg || '');
      if (/^вќЊ|РѕС€РёР±Рє|РЅРµ СѓРґР°|РЅРµ СѓРґР°Р»РѕСЃСЊ|СЃР±РѕР№|fail/i.test(s)) return 'error';
      if (/^вљ |РІРЅРёРјР°РЅРёРµ|warn/i.test(s)) return 'warning';
      if (/^(вњ…|рџЋ‰)|РіРѕС‚РѕРІРѕ|СѓСЃРїРµС€РЅ|СѓСЃРїРµС…|СЃРѕР·РґР°РЅ|СЃРѕС…СЂР°РЅС‘РЅ/i.test(s)) return 'success';
      return 'info';
    }
    /** Strip leading emoji prefix from a message (we render icon separately). */
    function _stripLeadEmoji(msg) {
      return String(msg || '').replace(/^[\s]*[вќЊвљ пёЏвњ…рџЋ‰в„№пёЏрџ“¦рџ”Ќ]+\s*/u, '').trim();
    }

    // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    // GLASS SELECT вЂ” enhances native <select> elements with a sheet picker
    // в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    function _gxRenderTrigger(sel, wrap) {
      const placeholder = sel.dataset.gxPlaceholder || 'Р’С‹Р±СЂР°С‚СЊвЂ¦';
      const opt = sel.options[sel.selectedIndex];
      const value = opt && opt.value !== '' ? opt.text : '';
      const iconName = opt && opt.dataset?.icon;
      const isPlaceholder = !value;
      const trig = wrap.querySelector('.gx-select-trigger');
      const valueSpan = trig.querySelector('.gx-select-trigger-value');
      if (isPlaceholder) {
        valueSpan.textContent = placeholder;
      } else if (iconName) {
        valueSpan.innerHTML = `${ix(iconName, { size: '18px' })}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</span>`;
      } else {
        valueSpan.textContent = value;
      }
      trig.classList.toggle('placeholder', isPlaceholder);
    }

    function _gxOpenSheet(sel, wrap) {
      const title = sel.dataset.gxTitle || sel.previousElementSibling?.textContent?.trim() || 'Р’С‹Р±СЂР°С‚СЊ';
      const overlay = document.createElement('div');
      overlay.className = 'gx-sheet-overlay';
      overlay.innerHTML = `
        <div class="gx-sheet" role="dialog" aria-modal="true">
          <div class="gx-sheet-handle"></div>
          <div class="gx-sheet-header">
            <div class="gx-sheet-title"></div>
            <button class="gx-sheet-close" aria-label="Р—Р°РєСЂС‹С‚СЊ">${ix('x', { size: '18px' })}</button>
          </div>
          <div class="gx-sheet-search" hidden>
            ${ix('search', { size: '16px' })}
            <input type="text" placeholder="РџРѕРёСЃРєвЂ¦" autocomplete="off" />
          </div>
          <div class="gx-sheet-list" role="listbox"></div>
        </div>
      `;
      overlay.querySelector('.gx-sheet-title').textContent = title;
      const list = overlay.querySelector('.gx-sheet-list');
      const search = overlay.querySelector('.gx-sheet-search');
      const searchInput = overlay.querySelector('input');
      const currentValue = sel.value;
      const options = [];
      // Walk options, supporting <optgroup>. Pick up data-icon attributes when set.
      Array.from(sel.children).forEach((child) => {
        if (child.tagName === 'OPTGROUP') {
          options.push({ group: child.label, icon: child.dataset?.icon || '' });
          Array.from(child.children).forEach((o) => {
            options.push({ value: o.value, label: o.text, icon: o.dataset?.icon || '', disabled: o.disabled });
          });
        } else {
          options.push({ value: child.value, label: child.text, icon: child.dataset?.icon || '', disabled: child.disabled });
        }
      });
      if (options.length > 8) search.hidden = false;

      const renderList = (filter = '') => {
        const q = filter.toLowerCase().trim();
        const items = [];
        let visible = 0;
        options.forEach((o) => {
          if (o.group) {
            const groupIcon = o.icon ? ix(o.icon, { size: '14px' }) : '';
            items.push(`<div class="gx-sheet-group-label">${groupIcon}<span style="margin-left:6px;vertical-align:middle">${escapeHtml(o.group)}</span></div>`);
          } else {
            if (q && !o.label.toLowerCase().includes(q)) return;
            const sel2 = (o.value === currentValue);
            const iconHtml = o.icon ? ix(o.icon, { size: '20px' }) : '';
            items.push(`<button class="gx-sheet-opt" role="option" data-value="${escapeHtml(o.value)}" aria-selected="${sel2}" ${o.disabled ? 'disabled' : ''}>
              ${iconHtml}<span class="gx-sheet-opt-label">${escapeHtml(o.label)}</span>
              <span class="gx-sheet-opt-check">${ix('check', { size: '18px' })}</span>
            </button>`);
            visible++;
          }
        });
        list.innerHTML = visible ? items.join('') : `<div class="gx-sheet-empty">РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ</div>`;
      };

      const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      renderList();
      searchInput?.addEventListener('input', (e) => renderList(e.target.value));

      document.body.appendChild(overlay);
      requestAnimationFrame(() => { overlay.classList.add('show'); wrap.classList.add('open'); });

      const close = () => {
        overlay.classList.remove('show');
        wrap.classList.remove('open');
        setTimeout(() => { try { overlay.remove(); } catch {} }, 280);
      };
      overlay.querySelector('.gx-sheet-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('.gx-sheet-opt');
        if (!btn || btn.disabled) return;
        sel.value = btn.dataset.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        _gxRenderTrigger(sel, wrap);
        close();
      });
    }

    /**
     * Enhance a native <select> with a glass sheet picker.
     * Original <select> stays in DOM (hidden) so form submission and JS reads
     * (`getElementById(...).value`) keep working unchanged.
     */
    function enhanceSelect(sel) {
      if (!sel || sel.dataset.gxEnhanced) return;
      sel.dataset.gxEnhanced = '1';
      const wrap = document.createElement('div');
      wrap.className = 'gx-select-wrap';
      // Preserve any explicit className that was on the select for layout (e.g. flex-1)
      const layoutClasses = (sel.className || '').match(/\b(flex-1|min-w-0)\b/g);
      if (layoutClasses) wrap.classList.add(...layoutClasses);

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'gx-select-trigger';
      trigger.innerHTML = `<span class="gx-select-trigger-value"></span>${ix('chevronDown', { cls: 'ix-chevron', size: '18px' })}`;

      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(trigger);
      wrap.appendChild(sel);
      sel.classList.add('gx-select-native');

      _gxRenderTrigger(sel, wrap);
      trigger.addEventListener('click', (e) => { e.preventDefault(); _gxOpenSheet(sel, wrap); });
      sel.addEventListener('change', () => _gxRenderTrigger(sel, wrap));
    }

    /** Enhance every <select> in a container (default: document). */
    function enhanceAllSelects(root = document) {
      root.querySelectorAll('select:not(.gx-select-native):not([data-gx-skip])').forEach(enhanceSelect);
    }

    // Re-enhance after any DOM mutation that adds new <select> elements.
    // Lightweight observer scoped to <body> children; debounced.
    let _gxObserverScheduled = false;
    function _scheduleGxScan() {
      if (_gxObserverScheduled) return;
      _gxObserverScheduled = true;
      requestAnimationFrame(() => {
        _gxObserverScheduled = false;
        try { enhanceAllSelects(document.body); } catch {}
      });
    }
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => _scheduleGxScan()).observe(document.documentElement, { childList: true, subtree: true });
    }

    // в”Ђв”Ђв”Ђ CATEGORY MAP (РЅР°РёРјРµРЅРѕРІР°РЅРёРµ С‚РѕРІР°СЂР°) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    // value = С‚РµРєСЃС‚, РєРѕС‚РѕСЂС‹Р№ СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ РІ Р‘Р” Рё РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ РІ РєР°СЂС‚РѕС‡РєРµ
    // broad = С€РёСЂРѕРєР°СЏ РєР°С‚РµРіРѕСЂРёСЏ РґР»СЏ weight_standards / РѕС‚С‡С‘С‚РѕРІ / РєР°С‚Р°Р»РѕРіР° РїР»РѕС‰Р°РґРѕРє
    // defaultWeight = РїРѕРґСЃС‚Р°РІРёС‚СЃСЏ РІ РїРѕР»Рµ В«Р’РµСЃВ» РµСЃР»Рё weight_standards РЅРµ РЅР°С€С‘Р» С‚РѕС‡РЅРѕРµ СЃРѕРІРїР°РґРµРЅРёРµ
    // .icon: name from ICON_PATHS вЂ” rendered as inline SVG in glass-select picker.
    // (Native <option> elements can't render SVG, so the dropdown that's visible
    // is the glass-style sheet, which reads data-icon from each option.)
    const CATEGORY_MAP = [
      // РћР±СѓРІСЊ
      { value: 'РљСЂРѕСЃСЃРѕРІРєРё',  icon: 'sneaker', broad: 'РћР±СѓРІСЊ',       defaultWeight: 1.2 },
      { value: 'РљРµРґС‹',       icon: 'sneaker', broad: 'РћР±СѓРІСЊ',       defaultWeight: 0.9 },
      { value: 'Р‘РѕС‚С‹',       icon: 'boot',    broad: 'РћР±СѓРІСЊ',       defaultWeight: 1.5 },
      { value: 'Р‘РѕС‚РёРЅРєРё',    icon: 'boot',    broad: 'РћР±СѓРІСЊ',       defaultWeight: 1.4 },
      { value: 'РЎР°РЅРґР°Р»РёРё',   icon: 'sandal',  broad: 'РћР±СѓРІСЊ',       defaultWeight: 0.6 },
      { value: 'РўСѓС„Р»Рё',      icon: 'shoe',    broad: 'РћР±СѓРІСЊ',       defaultWeight: 0.9 },
      // РћРґРµР¶РґР°
      { value: 'Р¤СѓС‚Р±РѕР»РєР°',   icon: 'tshirt',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.3 },
      { value: 'РџРѕР»Рѕ',       icon: 'tshirt',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.35 },
      { value: 'РҐСѓРґРё',       icon: 'jacket',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.7 },
      { value: 'РЎРІРёС‚С€РѕС‚',    icon: 'jacket',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.6 },
      { value: 'РўРѕР»СЃС‚РѕРІРєР°',  icon: 'jacket',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.7 },
      { value: 'Р”Р¶РёРЅСЃС‹',     icon: 'pants',   broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.7 },
      { value: 'Р‘СЂСЋРєРё',      icon: 'pants',   broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.6 },
      { value: 'РЁРѕСЂС‚С‹',      icon: 'shorts',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.4 },
      { value: 'РљСѓСЂС‚РєР°',     icon: 'jacket',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 1.0 },
      { value: 'РџСѓС…РѕРІРёРє',    icon: 'jacket',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 1.5 },
      { value: 'РџР°Р»СЊС‚Рѕ',     icon: 'jacket',  broad: 'РћРґРµР¶РґР°',      defaultWeight: 1.6 },
      { value: 'РџР»Р°С‚СЊРµ',     icon: 'dress',   broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.5 },
      { value: 'Р®Р±РєР°',       icon: 'dress',   broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.4 },
      { value: 'РљРѕСЃС‚СЋРј',     icon: 'suit',    broad: 'РћРґРµР¶РґР°',      defaultWeight: 1.5 },
      { value: 'РљСѓРїР°Р»СЊРЅРёРє',  icon: 'swim',    broad: 'РћРґРµР¶РґР°',      defaultWeight: 0.2 },
      // РђРєСЃРµСЃСЃСѓР°СЂС‹
      { value: 'Р СЋРєР·Р°Рє',     icon: 'backpack',    broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 1.0 },
      { value: 'РЎСѓРјРєР°',      icon: 'bagHandle',   broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.7 },
      { value: 'РљРѕС€РµР»С‘Рє',    icon: 'walletSmall', broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.2 },
      { value: 'Р РµРјРµРЅСЊ',     icon: 'belt',        broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.3 },
      { value: 'Р§Р°СЃС‹',       icon: 'watch',       broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.4 },
      { value: 'РћС‡РєРё',       icon: 'sunglasses',  broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.2 },
      { value: 'РЁР°РїРєР°',      icon: 'cap',         broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.2 },
      { value: 'Р‘РёР¶СѓС‚РµСЂРёСЏ',  icon: 'ring',        broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.1 },
      { value: 'РџР°СЂС„СЋРј',     icon: 'flower',      broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.5 },
      { value: 'РљРѕСЃРјРµС‚РёРєР°',  icon: 'cosmetic',    broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.5 },
      { value: 'Р­Р»РµРєС‚СЂРѕРЅРёРєР°',icon: 'smartphone',  broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 1.0 },
      { value: 'Р”СЂСѓРіРѕРµ',     icon: 'box',         broad: 'РђРєСЃРµСЃСЃСѓР°СЂС‹',  defaultWeight: 0.5 },
    ];
    // Group в†’ icon name (rendered via ix() in glass-select sheet).
    const CATEGORY_GROUP_ICONS = { 'РћР±СѓРІСЊ': 'sneaker', 'РћРґРµР¶РґР°': 'tshirt', 'РђРєСЃРµСЃСЃСѓР°СЂС‹': 'briefcase' };
    // РРµСЂР°СЂС…РёС‡РµСЃРєР°СЏ РІС‹Р±РѕСЂРєР° С‡РµСЂРµР· optgroup: 3 РіСЂСѓРїРїС‹ (РћР±СѓРІСЊ / РћРґРµР¶РґР° / РђРєСЃРµСЃСЃСѓР°СЂС‹)
    // Note: native <option> can't render SVG, so the visible UI is the glass-sheet
    // picker which reads data-icon from each option. The plain `value` is what's
    // submitted to forms / what JS reads (no emoji prefix).
    function renderCategoryOptions() {
      const groups = ['РћР±СѓРІСЊ', 'РћРґРµР¶РґР°', 'РђРєСЃРµСЃСЃСѓР°СЂС‹'];
      let html = '<option value="">вЂ” РЅР°РёРјРµРЅРѕРІР°РЅРёРµ С‚РѕРІР°СЂР° вЂ”</option>';
      for (const g of groups) {
        const items = CATEGORY_MAP.filter(c => c.broad === g);
        if (!items.length) continue;
        html += `<optgroup label="${g}" data-icon="${CATEGORY_GROUP_ICONS[g] || ''}">`;
        for (const c of items) {
          html += `<option value="${c.value}" data-icon="${c.icon}" data-broad="${c.broad}" data-default-weight="${c.defaultWeight}">${c.value}</option>`;
        }
        html += '</optgroup>';
      }
      return html;
    }
    function getCategoryBroad(specific) {
      const it = CATEGORY_MAP.find(c => c.value === specific);
      return it ? it.broad : (specific || null);
    }

    // в”Ђв”Ђв”Ђ 2-step category UI в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    // РџСЂРµРІСЂР°С‰Р°РµС‚ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ <select id="..."> РІ РґРІСѓС…СѓСЂРѕРІРЅРµРІС‹Р№ РІС‹Р±РѕСЂ:
    //   С€Р°Рі 1 вЂ” РћР±СѓРІСЊ / РћРґРµР¶РґР° / РђРєСЃРµСЃСЃСѓР°СЂС‹ (broad-select РґРѕР±Р°РІР»РµРЅ СЃРІРµСЂС…Сѓ)
    //   С€Р°Рі 2 вЂ” РєРѕРЅРєСЂРµС‚РЅРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ (master-select, РѕРїС†РёРё РѕС‚С„РёР»СЊС‚СЂРѕРІР°РЅС‹)
    // Р­С‚Рѕ РјРµРЅРµРµ РїРµСЂРµРіСЂСѓР¶РµРЅРЅРѕ РґР»СЏ РјРѕР±РёР»СЊРЅРѕРіРѕ UX Рё СЃС‚РёР»РёСЃС‚РёС‡РµСЃРєРё С‡РёС‰Рµ.
    function enhanceCategoryTwoStep(selectId) {
      const master = document.getElementById(selectId);
      if (!master || master.dataset.twoStepEnhanced === '1') return;
      master.dataset.twoStepEnhanced = '1';

      const groups = ['РћР±СѓРІСЊ', 'РћРґРµР¶РґР°', 'РђРєСЃРµСЃСЃСѓР°СЂС‹'];

      // РЎРѕР·РґР°С‘Рј broad-select
      const broad = document.createElement('select');
      broad.id = selectId + 'Broad';
      broad.className = master.className;
      broad.innerHTML = '<option value="">вЂ” С‚РёРї С‚РѕРІР°СЂР° вЂ”</option>' +
        groups.map(g => `<option value="${g}" data-icon="${CATEGORY_GROUP_ICONS[g] || ''}">${g}</option>`).join('');

      // Р’СЃС‚Р°РІР»СЏРµРј РїРµСЂРµРґ master
      master.parentNode.insertBefore(broad, master);

      // РЎРѕС…СЂР°РЅСЏРµРј РѕСЂРёРіРёРЅР°Р»СЊРЅС‹Р№ HTML РѕРїС†РёР№ РґР»СЏ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёСЏ
      const originalHTML = master.innerHTML;

      // РР·РЅР°С‡Р°Р»СЊРЅРѕ master СЃРєСЂС‹С‚ (broad РµС‰С‘ РЅРµ РІС‹Р±СЂР°РЅ)
      master.style.display = 'none';

      function rebuildSpecific(broadValue) {
        if (!broadValue) {
          master.innerHTML = originalHTML;
          master.style.display = 'none';
          master.value = '';
          return;
        }
        const items = CATEGORY_MAP.filter(c => c.broad === broadValue);
        let html = `<option value="">вЂ” РєРѕРЅРєСЂРµС‚РЅРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ вЂ”</option>`;
        for (const c of items) {
          html += `<option value="${c.value}" data-icon="${c.icon}" data-broad="${c.broad}" data-default-weight="${c.defaultWeight}">${c.value}</option>`;
        }
        master.innerHTML = html;
        master.style.display = '';
        master.value = '';
      }

      // Р•СЃР»Рё master СѓР¶Рµ РёРјРµР» РІС‹Р±СЂР°РЅРЅРѕРµ Р·РЅР°С‡РµРЅРёРµ (РЅР°РїСЂРёРјРµСЂ, РїСЂРёР»РµС‚РµР»Рѕ РёР· РїР°СЂСЃРµСЂР°)
      const initial = master.value;
      if (initial) {
        const broadVal = getCategoryBroad(initial);
        if (broadVal) {
          broad.value = broadVal;
          rebuildSpecific(broadVal);
          master.value = initial;
        }
      }

      broad.addEventListener('change', () => {
        rebuildSpecific(broad.value);
        // РўСЂРёРіРіРµСЂРёРј СЃРѕР±С‹С‚РёРµ РЅР° master С‡С‚РѕР±С‹ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёРµ onchange-С…РµРЅРґР»РµСЂС‹ (РІРµСЃ Рё С‚.Рґ.) СЃСЂР°Р±РѕС‚Р°Р»Рё
        master.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // РўР°РєР¶Рµ РµСЃР»Рё РєС‚Рѕ-С‚Рѕ СЃРЅР°СЂСѓР¶Рё Р·Р°РґР°С‘С‚ master.value РїСЂРѕРіСЂР°РјРјРЅРѕ (РїР°СЂСЃРµСЂ) вЂ” РїРѕРґРґРµСЂР¶РёРј broad
      const origDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      Object.defineProperty(master, 'value', {
        get() { return origDescriptor.get.call(this); },
        set(v) {
          const broadVal = getCategoryBroad(v);
          if (broadVal && broad.value !== broadVal) {
            broad.value = broadVal;
            rebuildSpecific(broadVal);
          }
          origDescriptor.set.call(this, v);
        },
        configurable: true,
      });
    }

    window.updateCategoryHint = (selectId, hintId) => {
      const selectEl = document.getElementById(selectId);
      const hintEl = document.getElementById(hintId);
      if (!selectEl || !hintEl) return;
      const opt = selectEl.options[selectEl.selectedIndex];
      if (opt && opt.dataset.defaultWeight) {
        hintEl.innerText = `рџ’Ў РћР±С‹С‡РЅРѕ РІРµСЃРёС‚ ~${opt.dataset.defaultWeight} РєРі`;
        hintEl.classList.remove('hidden');
      } else {
        hintEl.classList.add('hidden');
      }
    };

    // в”Ђв”Ђв”Ђ Р’РђР›РР”РђР¦РРЇ Р—РђРљРђР—Рђ РїРµСЂРµРґ РѕС‚РїСЂР°РІРєРѕР№ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    // РћСЃРѕР±РµРЅРЅРѕ РІР°Р¶РЅРѕ РґР»СЏ СЂРµР¶РёРјР° В«Р’СЂСѓС‡РЅСѓСЋВ» вЂ” С‚Р°Рј РґР°РЅРЅС‹Рµ РЅРµ РїСЂРѕС…РѕРґСЏС‚ РїР°СЂСЃРµСЂ.
    // Р’РѕР·РІСЂР°С‰Р°РµС‚ РјР°СЃСЃРёРІ РѕС€РёР±РѕРє (РїСѓСЃС‚РѕР№ = РІСЃС‘ РѕРє).
    const ALLOWED_MARKETPLACE_HOSTS = [
      'poizon.com', 'dewu.com', 'taobao.com', 'tmall.com', '1688.com', 'jd.com', 'xianyu.com',
      'zalando.pl', 'zalando.de', 'zalando.com', 'zalando-lounge.pl', 'asos.com', 'farfetch.com',
      'aboutyou.com', 'aboutyou.de', 'sneakerstudio.com', 'endclothing.com', 'ssense.com',
      'wildberries.ru', 'wildberries.by', 'ozon.ru', 'lamoda.ru', 'lamoda.by',
      'amazon.com', 'amazon.de', 'amazon.co.uk', 'ebay.com', 'aliexpress.com', 'aliexpress.ru',
      'shein.com', 'temu.com', 'h-m.com', 'hm.com', 'uniqlo.com',
    ];
    // Р Р°Р·СѓРјРЅС‹Рµ РґРёР°РїР°Р·РѕРЅС‹ С†РµРЅС‹ РїРѕ РІР°Р»СЋС‚Рµ (РІ РёСЃС…РѕРґРЅРѕР№ РІР°Р»СЋС‚Рµ)
    const PRICE_RANGES = {
      CNY: [10, 50000], USD: [3, 5000], EUR: [3, 5000], GBP: [3, 5000],
      RUB: [100, 500000], BYN: [3, 15000], PLN: [10, 20000],
      JPY: [300, 500000], KRW: [3000, 5000000],
    };
    function validateOrderBeforeSubmit(order) {
      const errors = [];
      if (!order) { errors.push('РќРµС‚ РґР°РЅРЅС‹С… Р·Р°РєР°Р·Р°'); return errors; }

      // 1. Р¦РµРЅР°
      const price = parseFloat(order.price);
      if (!isFinite(price) || price <= 0) {
        errors.push('РЈРєР°Р¶РёС‚Рµ С†РµРЅСѓ С‚РѕРІР°СЂР° (С‡РёСЃР»Рѕ > 0)');
      } else {
        const range = PRICE_RANGES[order.currency];
        if (range && (price < range[0] || price > range[1])) {
          errors.push(`Р¦РµРЅР° ${price} ${order.currency} РІРЅРµ СЂР°Р·СѓРјРЅРѕРіРѕ РґРёР°РїР°Р·РѕРЅР° (${range[0]}вЂ“${range[1]}). РЈРІРµСЂРµРЅС‹ С‡С‚Рѕ С†РµРЅР° РІ ${order.currency}?`);
        }
      }

      // 2. Р’Р°Р»СЋС‚Р°
      if (!order.currency) errors.push('Р’С‹Р±РµСЂРёС‚Рµ РІР°Р»СЋС‚Сѓ');

      // 3. Р’РµСЃ
      const weight = parseFloat(order.weight);
      if (!isFinite(weight) || weight <= 0) {
        errors.push('РЈРєР°Р¶РёС‚Рµ РІРµСЃ (> 0 РєРі)');
      } else if (weight < 0.05) {
        errors.push('Р’РµСЃ СЃР»РёС€РєРѕРј РјР°Р»РµРЅСЊРєРёР№ (РјРёРЅРёРјСѓРј 0.05 РєРі)');
      } else if (weight > 30) {
        errors.push('Р’РµСЃ СЃР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№ (РјР°РєСЃРёРјСѓРј 30 РєРі вЂ” РјС‹ РЅРµ РІРѕР·РёРј РіСЂСѓР·РѕРІС‹Рµ)');
      }

      // 4. РљР°С‚РµРіРѕСЂРёСЏ
      if (!order.category) errors.push('Р’С‹Р±РµСЂРёС‚Рµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ С‚РѕРІР°СЂР°');

      // 5. РЎС‚СЂР°РЅР°
      if (!order.country) errors.push('Р’С‹Р±РµСЂРёС‚Рµ СЃС‚СЂР°РЅСѓ РїР»РѕС‰Р°РґРєРё');

      // 6. URL вЂ” РµСЃР»Рё РІРІРµРґС‘РЅ, РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІР°Р»РёРґРЅС‹Рј http(s)://
      const url = (order.url || '').trim();
      if (url) {
        try {
          const u = new URL(url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            errors.push('РЎСЃС‹Р»РєР° РґРѕР»Р¶РЅР° РЅР°С‡РёРЅР°С‚СЊСЃСЏ СЃ http:// РёР»Рё https://');
          } else {
            // РџСЂРѕРІРµСЂРєР° РґРѕРјРµРЅР° (warning, РЅРµ РѕС€РёР±РєР° вЂ” РјС‹ РЅРµ С…РѕС‚РёРј Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ РЅРµРёР·РІРµСЃС‚РЅС‹Рµ РїР»РѕС‰Р°РґРєРё)
            const host = u.hostname.toLowerCase().replace(/^www\./, '');
            const isKnown = ALLOWED_MARKETPLACE_HOSTS.some(h => host === h || host.endsWith('.' + h));
            if (!isKnown && !window.confirm(`РџР»РѕС‰Р°РґРєР° ${host} РЅРµ РёР· РЅР°С€РµРіРѕ СЃРїРёСЃРєР°. РџСЂРѕРґРѕР»Р¶РёС‚СЊ?`)) {
              errors.push('РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РїР»РѕС‰Р°РґРєРё РѕС‚РјРµРЅРµРЅРѕ');
            }
          }
        } catch {
          errors.push('РЎСЃС‹Р»РєР° РЅРµ РїРѕС…РѕР¶Р° РЅР° РІР°Р»РёРґРЅС‹Р№ URL');
        }
      }

      // 7. РљСЂРѕСЃСЃ-РїСЂРѕРІРµСЂРєР° РІР°Р»СЋС‚Р° в‡„ СЃС‚СЂР°РЅР° (РјСЏРіРєР°СЏ вЂ” warning, РЅРµ Р±Р»РѕРєРёСЂСѓРµРј)
      const COUNTRY_DEFAULT_CURRENCY = { CN: 'CNY', PL: 'PLN', DE: 'EUR', UK: 'GBP', US: 'USD', RU: 'RUB', BY: 'BYN', JP: 'JPY', KR: 'KRW', EU: 'EUR' };
      if (order.country && order.currency && COUNTRY_DEFAULT_CURRENCY[order.country] && COUNTRY_DEFAULT_CURRENCY[order.country] !== order.currency) {
        const expected = COUNTRY_DEFAULT_CURRENCY[order.country];
        const ok = window.confirm(`РЎС‚СЂР°РЅРЅРѕ: СЃС‚СЂР°РЅР° ${order.country} РѕР±С‹С‡РЅРѕ РёСЃРїРѕР»СЊР·СѓРµС‚ ${expected}, Р° РІС‹ РІС‹Р±СЂР°Р»Рё ${order.currency}. РџСЂРѕРґРѕР»Р¶РёС‚СЊ?`);
        if (!ok) errors.push('РќРµСЃРѕРѕС‚РІРµС‚СЃС‚РІРёРµ РІР°Р»СЋС‚С‹ Рё СЃС‚СЂР°РЅС‹');
      }

      return errors;
    }
    function getCategoryDefaultWeight(specific) {
      const it = CATEGORY_MAP.find(c => c.value === specific);
      return it ? it.defaultWeight : null;
    }
    // РџРѕРґР±РёСЂР°РµРј option РІ СЃРµР»РµРєС‚Рµ РїРѕ Р·РЅР°С‡РµРЅРёСЋ. Р•СЃР»Рё LLM РІРµСЂРЅСѓР» С€РёСЂРѕРєСѓСЋ РєР°С‚РµРіРѕСЂРёСЋ ("РћР±СѓРІСЊ"),
    // РїРѕРґСЃС‚Р°РІР»СЏРµРј РїРµСЂРІРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ СЃ С‚РµРј Р¶Рµ broad. Р•СЃР»Рё РЅРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ вЂ” РІРѕР·РІСЂР°С‰Р°РµС‚ null.
    function findCategoryOption(selectEl, raw) {
      if (!selectEl || !raw) return null;
      const opts = Array.from(selectEl.options);
      const exact = opts.find(o => o.value === raw);
      if (exact) return exact;
      // РЎСЂР°РІРЅРёРј Р±РµР· СЂРµРіРёСЃС‚СЂР°
      const ci = opts.find(o => o.value.toLowerCase() === String(raw).toLowerCase());
      if (ci) return ci;
      // Р•СЃР»Рё raw = С€РёСЂРѕРєР°СЏ РєР°С‚РµРіРѕСЂРёСЏ вЂ” Р±РµСЂС‘Рј РїРµСЂРІРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ СЃ С‚Р°РєРёРј broad
      const broadMatch = opts.find(o => o.dataset && o.dataset.broad === raw);
      if (broadMatch) return broadMatch;
      return null;
    }

    // ==================== PREMIUM CODES & CONSTANTS ====================
    const PVS_DATA = {
      europoshta: {
        'РњРёРЅСЃРє': [
          'РћРџРЎ в„–119: РїСЂ-С‚ Р”Р·РµСЂР¶РёРЅСЃРєРѕРіРѕ, 119',
          'РћРџРЎ в„–11: СѓР». РџРµС‚СЂР° РњСЃС‚РёСЃР»Р°РІС†Р°, 11 (Dana Mall)',
          'РћРџРЎ в„–29: СѓР». РџСЂРёС‚С‹С†РєРѕРіРѕ, 29',
          'РћРџРЎ в„–9: РїСЂ-С‚ РџРѕР±РµРґРёС‚РµР»РµР№, 9 (Galleria)',
          'РћРџРЎ в„–159: СѓР». Р›РѕР±Р°РЅРєР°, 94',
          'РћРџРЎ в„–76: СѓР». Р РѕРјР°РЅРѕРІСЃРєР°СЏ РЎР»РѕР±РѕРґР°, 13'
        ],
        'Р“РѕРјРµР»СЊ': [
          'РћРџРЎ в„–97: СѓР». РЎРѕРІРµС‚СЃРєР°СЏ, 97',
          'РћРџРЎ в„–3: РїСЂ-С‚ Р›РµРЅРёРЅР°, 3',
          'РћРџРЎ в„–22: Р РµС‡РёС†РєРёР№ РїСЂРѕСЃРїРµРєС‚, 5Рђ'
        ],
        'Р‘СЂРµСЃС‚': [
          'РћРџРЎ в„–273: СѓР». РњРѕСЃРєРѕРІСЃРєР°СЏ, 273Рђ',
          'РћРџРЎ в„–16: РїСЂ-С‚ РњР°С€РµСЂРѕРІР°, 16',
          'РћРџРЎ в„–4: СѓР». Р“РѕРіРѕР»СЏ, 65'
        ],
        'Р“СЂРѕРґРЅРѕ': [
          'РћРџРЎ в„–81: СѓР». РљРѕСЃРјРѕРЅР°РІС‚РѕРІ, 81',
          'РћРџРЎ в„–91: СѓР». РЎРѕРІРµС‚СЃРєРёС… РџРѕРіСЂР°РЅРёС‡РЅРёРєРѕРІ, 91',
          'РћРџРЎ в„–5: РїСЂ-С‚ РЇРЅРєРё РљСѓРїР°Р»С‹, 87'
        ],
        'Р’РёС‚РµР±СЃРє': [
          'РћРџРЎ в„–26: СѓР». Р›РµРЅРёРЅР°, 26Рђ',
          'РћРџРЎ в„–81: РїСЂ-С‚ Р¤СЂСѓРЅР·Рµ, 81',
          'РћРџРЎ в„–10: СѓР». Р‘РѕРіР°С‚С‹СЂРµРІР°, 15'
        ],
        'РњРѕРіРёР»РµРІ': [
          'РћРџРЎ в„–57: СѓР». РџРµСЂРІРѕРјР°Р№СЃРєР°СЏ, 57',
          'РћРџРЎ в„–30: РїСЂ-С‚ РџСѓС€РєРёРЅСЃРєРёР№, 30',
          'РћРџРЎ в„–12: СѓР». РЇРєСѓР±РѕРІСЃРєРѕРіРѕ, 44'
        ],
        'default': [
          'Р¦РµРЅС‚СЂР°Р»СЊРЅРѕРµ РѕС‚РґРµР»РµРЅРёРµ (Р•РІСЂРѕРїРѕС‡С‚Р°)',
          'Р’С‚РѕСЂРѕРµ РѕС‚РґРµР»РµРЅРёРµ (Р•РІСЂРѕРїРѕС‡С‚Р°)'
        ]
      },
      sdek: {
        'РњРёРЅСЃРє': [
          'РњРЎРљ1: СѓР». РџСЂРёС‚С‹С†РєРѕРіРѕ, 79',
          'РњРЎРљ2: СѓР». Р›РµРІРєРѕРІР°, 9',
          'РњРЎРљ3: РїСЂ-С‚ РќРµР·Р°РІРёСЃРёРјРѕСЃС‚Рё, 95',
          'РњРЎРљ4: СѓР». РЎСѓСЂРіР°РЅРѕРІР°, 50'
        ],
        'Р“РѕРјРµР»СЊ': [
          'Р“РњР›1: СѓР». РљРёСЂРѕРІР°, 55',
          'Р“РњР›2: Р РµС‡РёС†РєРёР№ РїСЂРѕСЃРїРµРєС‚, 80'
        ],
        'Р‘СЂРµСЃС‚': [
          'Р‘Р Рў1: Р±СѓР»СЊРІР°СЂ РљРѕСЃРјРѕРЅР°РІС‚РѕРІ, 40',
          'Р‘Р Рў2: СѓР». РљР°СЂСЊРµСЂРЅР°СЏ, 12'
        ],
        'Р“СЂРѕРґРЅРѕ': [
          'Р“Р Р”1: СѓР». РљР°СЂР»Р° РњР°СЂРєСЃР°, 29',
          'Р“Р Р”2: СѓР». Р“РѕСЂСЊРєРѕРіРѕ, 91'
        ],
        'Р’РёС‚РµР±СЃРє': [
          'Р’РўР‘1: РїСЂ-С‚ РЎС‚СЂРѕРёС‚РµР»РµР№, 11Рђ',
          'Р’РўР‘2: СѓР». Р›РµРЅРёРЅР°, 54'
        ],
        'РњРѕРіРёР»РµРІ': [
          'РњР“Р›1: СѓР». РџРµСЂРІРѕРјР°Р№СЃРєР°СЏ, 12',
          'РњР“Р›2: СѓР». Р“Р°РіР°СЂРёРЅР°, 83'
        ],
        'default': [
          'Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№ РїСѓРЅРєС‚ РІС‹РґР°С‡Рё РЎР”Р­Рљ'
        ]
      },
      belpochta: {
        'РњРёРЅСЃРє': [
          'РџРћ-100: РїСЂ-С‚ РќРµР·Р°РІРёСЃРёРјРѕСЃС‚Рё, 10',
          'РџРћ-1: СѓР». Р“Р»Р°РІРЅР°СЏ, 25',
          'РџРћ-50: СѓР». РљРёСЂРѕРІР°, 8'
        ],
        'default': [
          'Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚ (РґРѕ РІРѕСЃС‚СЂРµР±РѕРІР°РЅРёСЏ)'
        ]
      }
    };

    const FORTUNE_REWARDS = [
      { text: '5 вќ„пёЏ', type: 'ice', value: 5, color: '#3A86F0', weight: 40 },
      { text: '10 вќ„пёЏ', type: 'ice', value: 10, color: '#00F2FE', weight: 25 },
      { text: '20 вќ„пёЏ', type: 'ice', value: 20, color: '#7000FF', weight: 10 },
      { text: 'РЎРєРёРґРєР° 5%', type: 'promo', value: 'ICE5', color: '#FF007F', weight: 10 },
      { text: 'РЎРєРёРґРєР° 10%', type: 'promo', value: 'ICE10', color: '#FF7F00', weight: 5 },
      { text: 'Р”РѕСЃС‚Р°РІРєР° 0', type: 'delivery', value: 'FREE', color: '#00FF7F', weight: 5 },
      { text: 'РџРѕРІРµР·РµС‚ Р·Р°РІС‚СЂР°', type: 'try_again', value: null, color: '#7F7F7F', weight: 5 }
    ];

    function getFortuneSpinCooldown() {
      const lastSpin = window.userSettings?.last_fortune_spin;
      if (!lastSpin) return 0;
      const elapsed = Date.now() - new Date(lastSpin).getTime();
      const cooldown = 24 * 60 * 60 * 1000;
      return Math.max(0, cooldown - elapsed);
    }

    function getAISizeRecommendation(category, height, weight, measure, brand = '') {
      if (!height && !weight && !measure) return null;
      
      const isShoes = ['РћР±СѓРІСЊ', 'РљРµРґС‹', 'РљСЂРѕСЃСЃРѕРІРєРё', 'Р‘РѕС‚РёРЅРєРё', 'РЎР»Р°РЅС†С‹', 'shoes', 'sneakers', 'boots', 'sandals'].some(keyword => 
        category.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isShoes) {
        if (measure) {
          const cm = parseFloat(measure);
          let eu = 35 + Math.round((cm - 22) * 1.5);
          let us = 4 + Math.round((cm - 22) * 1.0);
          return `Р РµРєРѕРјРµРЅРґСѓРµРј СЂР°Р·РјРµСЂ **EU ${eu}** / **US ${us}** (РґР»РёРЅР° СЃС‚РµР»СЊРєРё ${cm} СЃРј).`;
        }
        return `РЈРєР°Р¶РёС‚Рµ РґР»РёРЅСѓ СЃС‚РµР»СЊРєРё РІ СЃРј РґР»СЏ С‚РѕС‡РЅРѕРіРѕ РїРѕРґР±РѕСЂР° РѕР±СѓРІРё.`;
      }
      
      if (height && weight) {
        const h = parseInt(height);
        const w = parseFloat(weight);
        
        let size = 'M';
        if (h < 165 && w < 55) size = 'XS';
        else if (h < 172 && w < 65) size = 'S';
        else if (h < 178 && w < 75) size = 'M';
        else if (h < 185 && w < 85) size = 'L';
        else if (h < 192 && w < 95) size = 'XL';
        else size = 'XXL';
        
        let advice = `Р РµРєРѕРјРµРЅРґСѓРµРј СЂР°Р·РјРµСЂ **${size}** РЅР° РѕСЃРЅРѕРІРµ РІР°С€РµРіРѕ СЂРѕСЃС‚Р° (${h} СЃРј) Рё РІРµСЃР° (${w} РєРі).`;
        if (brand) {
          advice += ` Р’РЅРёРјР°РЅРёРµ: Р±СЂРµРЅРґ ${brand} РјРѕР¶РµС‚ РјР°Р»РѕРјРµСЂРёС‚СЊ, РµСЃР»Рё СЃРѕРјРЅРµРІР°РµС‚РµСЃСЊ вЂ” Р±РµСЂРёС‚Рµ РЅР° СЂР°Р·РјРµСЂ Р±РѕР»СЊС€Рµ.`;
        }
        return advice;
      }
      
      return `Р—Р°РїРѕР»РЅРёС‚Рµ СЂРѕСЃС‚ Рё РІРµСЃ (РґР»СЏ РѕРґРµР¶РґС‹) РёР»Рё СЃС‚РµР»СЊРєСѓ (РґР»СЏ РѕР±СѓРІРё) РґР»СЏ Р°РІС‚РѕРїРѕРґР±РѕСЂР° СЂР°Р·РјРµСЂР°.`;
    }

    async function showWheelOfFortuneModal() {
      const cd = getFortuneSpinCooldown();
      if (cd > 0) {
        glassToast('РљРѕР»РµСЃРѕ Р¤РѕСЂС‚СѓРЅС‹ РґРѕСЃС‚СѓРїРЅРѕ РѕРґРёРЅ СЂР°Р· РІ 24 С‡Р°СЃР°!', { kind: 'error' });
        return;
      }

      tgUtil.haptic('impact');

      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[120] p-4';
      modal.innerHTML = `
        <div class="glass-card max-w-sm w-full p-5 text-center flex flex-col items-center relative overflow-hidden border border-white/20 shadow-2xl" style="background: rgba(15, 23, 42, 0.9);">
          <div class="absolute -left-20 -top-20 w-44 h-44 rounded-full blur-3xl opacity-30" style="background: var(--ice-primary);"></div>
          <div class="absolute -right-20 -bottom-20 w-44 h-44 rounded-full blur-3xl opacity-20" style="background: #8B5CF6;"></div>

          <div class="w-full flex justify-between items-center mb-4 relative z-10">
            <h3 class="text-white font-bold text-base flex items-center gap-1.5">
              рџ”® РљРѕР»РµСЃРѕ РЈРґР°С‡Рё
            </h3>
            <button id="closeFortuneModalBtn" class="text-white/50 hover:text-white transition-colors text-lg">&times;</button>
          </div>

          <div class="relative w-[300px] h-[300px] my-4 flex items-center justify-center">
            <canvas id="fortuneWheelCanvas" width="300" height="300" class="w-[300px] h-[300px]"></canvas>
          </div>

          <p id="fortuneStatusText" class="text-white/80 text-sm font-semibold mb-5 h-5 relative z-10">РСЃРїС‹С‚Р°Р№С‚Рµ РІР°С€Сѓ СѓРґР°С‡Сѓ!</p>

          <button id="startFortuneSpinBtn" class="btn-primary w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 shadow-lg relative z-10" style="background: linear-gradient(135deg, var(--ice-primary), #8B5CF6); border: none;">
            рџ”® Р—РђРџРЈРЎРўРРўР¬ РљРћР›Р•РЎРћ!
          </button>
        </div>
      `;
      document.body.appendChild(modal);

      const canvas = document.getElementById('fortuneWheelCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const drawWheel = (rotation) => {
        const size = 300;
        const radius = size / 2;
        ctx.clearRect(0, 0, size, size);
        
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(rotation);
        
        const N = FORTUNE_REWARDS.length;
        const segmentAngle = (2 * Math.PI) / N;
        
        for (let i = 0; i < N; i++) {
          const r = FORTUNE_REWARDS[i];
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius - 10, i * segmentAngle, (i + 1) * segmentAngle);
          ctx.closePath();
          
          const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
          grad.addColorStop(0, '#0F172A');
          grad.addColorStop(1, r.color);
          ctx.fillStyle = grad;
          ctx.fill();
          
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          
          ctx.save();
          ctx.rotate(i * segmentAngle + segmentAngle / 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px Nunito';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.fillText(r.text, radius - 25, 0);
          ctx.restore();
        }
        
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(radius, radius, 22, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(radius, radius, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(radius - 10, 10);
        ctx.lineTo(radius + 10, 10);
        ctx.lineTo(radius, 28);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      let currentRotation = 0;
      drawWheel(currentRotation);

      const closeModal = () => modal.remove();
      document.getElementById('closeFortuneModalBtn').onclick = closeModal;

      const spinBtn = document.getElementById('startFortuneSpinBtn');
      if (spinBtn) {
        spinBtn.onclick = async () => {
          spinBtn.disabled = true;
          spinBtn.innerText = 'РљСЂСѓС‚РёС‚СЃСЏ...';
          spinBtn.style.opacity = '0.7';
          const closeBtn = document.getElementById('closeFortuneModalBtn');
          if (closeBtn) closeBtn.style.display = 'none';

          const rand = Math.random() * 100;
          let sum = 0;
          let targetIndex = 0;
          for (let i = 0; i < FORTUNE_REWARDS.length; i++) {
            sum += FORTUNE_REWARDS[i].weight;
            if (rand <= sum) {
              targetIndex = i;
              break;
            }
          }
          const reward = FORTUNE_REWARDS[targetIndex];

          const N = FORTUNE_REWARDS.length;
          const segmentAngle = (2 * Math.PI) / N;
          const stopAngle = (1.5 * Math.PI) - (targetIndex + 0.5) * segmentAngle + (10 * Math.PI);

          let startTime = null;
          const duration = 4000;
          let lastSpunSegment = -1;

          const animate = async (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            currentRotation = easeOut * stopAngle;
            
            const currentSegment = Math.floor(((1.5 * Math.PI - currentRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) / segmentAngle);
            if (currentSegment !== lastSpunSegment) {
              tgUtil.haptic('light');
              lastSpunSegment = currentSegment;
            }

            drawWheel(currentRotation);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              tgUtil.haptic('success');
              
              try {
                const nowStr = new Date().toISOString();
                const updatedSettings = {
                  ...window.userSettings,
                  last_fortune_spin: nowStr
                };

                let updateData = { settings: updatedSettings };
                let resultText = '';

                if (reward.type === 'ice') {
                  const addedIce = reward.value;
                  const newBalance = balance + addedIce;
                  updateData.ices_balance = newBalance;
                  balance = newBalance;
                  document.getElementById('headerBalance').innerText = newBalance;
                  resultText = `рџЋ‰ Р’С‹ РІС‹РёРіСЂР°Р»Рё ${addedIce} ICE!`;
                } else if (reward.type === 'promo') {
                  const promoPercent = reward.value === 'ICE5' ? 5 : 10;
                  const generatedPromo = 'ICE' + promoPercent + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                  
                  const { error: promoErr } = await supabaseClient.from('promocodes').insert({
                    code: generatedPromo,
                    discount_type: 'percent',
                    discount_value: promoPercent,
                    is_active: true
                  });
                  if (promoErr) throw promoErr;
                  
                  resultText = `рџЋ‰ РџСЂРѕРјРѕРєРѕРґ РЅР° ${promoPercent}%: ${generatedPromo}`;
                } else if (reward.type === 'delivery') {
                  updatedSettings.free_delivery_tokens = (updatedSettings.free_delivery_tokens || 0) + 1;
                  updateData.settings = updatedSettings;
                  resultText = `рџЋ‰ Р‘РµСЃРїР»Р°С‚РЅР°СЏ РґРѕСЃС‚Р°РІРєР° РЅР° СЃР»РµРґСѓСЋС‰РёР№ Р·Р°РєР°Р·!`;
                } else {
                  resultText = `рџЌЂ РџРѕРІРµР·РµС‚ Р·Р°РІС‚СЂР°! РЈРґР°С‡Рё!`;
                }

                const { error: userUpErr } = await supabaseClient.from('users').update(updateData).eq('user_id', userId);
                if (userUpErr) throw userUpErr;

                window.userSettings = updatedSettings;

                const statusTextEl = document.getElementById('fortuneStatusText');
                if (statusTextEl) {
                  statusTextEl.innerHTML = `<span class="text-green-400 font-bold">${resultText}</span>`;
                  statusTextEl.classList.add('scale-105');
                }
                
                spinBtn.innerText = 'РћС‚Р»РёС‡РЅРѕ!';
                spinBtn.disabled = false;
                spinBtn.style.opacity = '1';
                spinBtn.onclick = () => {
                  closeModal();
                  renderCurrentScreen();
                };

              } catch (dbErr) {
                console.error('Error saving fortune reward:', dbErr);
                glassToast('РћС€РёР±РєР° РЅР°РіСЂР°РґС‹: ' + dbErr.message, { kind: 'error' });
                spinBtn.innerText = 'Р—Р°РєСЂС‹С‚СЊ';
                spinBtn.disabled = false;
                spinBtn.onclick = closeModal;
              }
            }
          };

          requestAnimationFrame(animate);
        };
      }
    }

    let tg = null, userId = null, userName = 'Р“РѕСЃС‚СЊ', userAvatarUrl = null, isOwner = false, supabaseClient = null;
    let isRegistered = false;
    let originalAdminId = null;
    let isShadowMode = false;
    let adminAuthenticated = false;
    let currentTab = 'home', previousTab = null, currentSubScreen = null;

    // ==================== Telegram WebApp native helpers ====================
    // Wraps Telegram.WebApp APIs with graceful fallback to browser primitives.
    // Use tgUtil.alert / tgUtil.confirm / tgUtil.haptic / tgUtil.popup throughout the app.
    const tgUtil = {
      get _tg() { return window.Telegram?.WebApp || null; },

      alert(message, callback) {
        const msg = String(message ?? '');
        const kind = _guessKind(msg);
        const body = _stripLeadEmoji(msg);
        try {
          glassModal({ kind, message: body }).then(() => { if (typeof callback === 'function') callback(); });
          return;
        } catch (_) {}
        const w = this._tg;
        if (w?.showAlert) {
          try { w.showAlert(msg, callback); return; } catch {}
        }
        window.alert(msg);
        if (typeof callback === 'function') callback();
      },

      confirm(message) {
        const msg = String(message ?? '');
        return new Promise((resolve) => {
          try {
            glassModal({
              kind: 'confirm',
              message: _stripLeadEmoji(msg),
              buttons: [
                { id: 'cancel', label: 'РћС‚РјРµРЅР°', variant: 'ghost' },
                { id: 'ok',     label: 'РџСЂРѕРґРѕР»Р¶РёС‚СЊ', variant: 'primary' },
              ],
            }).then((id) => resolve(id === 'ok'));
            return;
          } catch (_) {}
          const w = this._tg;
          if (w?.showConfirm) {
            try { w.showConfirm(msg, (ok) => resolve(!!ok)); return; } catch {}
          }
          resolve(window.confirm(msg));
        });
      },

      // type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
      //       | 'success' | 'warning' | 'error' (notification)
      //       | 'selection' (selection change)
      haptic(type) {
        const hf = this._tg?.HapticFeedback;
        if (!hf) return;
        try {
          if (type === 'success' || type === 'warning' || type === 'error') {
            hf.notificationOccurred(type);
          } else if (type === 'selection') {
            hf.selectionChanged();
          } else {
            hf.impactOccurred(type || 'light');
          }
        } catch {}
      },

      // Rich popup with up to 3 buttons вЂ” uses our glass modal by default.
      popup(opts) {
        return new Promise((resolve) => {
          try {
            const o = opts || {};
            const kind = o.kind || _guessKind(o.message || o.title || '');
            const buttons = (Array.isArray(o.buttons) && o.buttons.length)
              ? o.buttons.map((b) => ({
                  id: b.id || b.text || 'ok',
                  label: b.text || b.label || 'OK',
                  variant: b.type === 'destructive' ? 'danger' : (b.type === 'cancel' ? 'ghost' : 'primary'),
                }))
              : [{ id: 'ok', label: 'РџРѕРЅСЏС‚РЅРѕ', variant: 'primary' }];
            glassModal({ kind, title: o.title, message: _stripLeadEmoji(o.message || ''), buttons }).then((id) => resolve(id || null));
            return;
          } catch (_) {}
          const w = this._tg;
          if (w?.showPopup) {
            try { w.showPopup(opts, (id) => resolve(id ?? null)); return; } catch {}
          }
          window.alert(opts?.message || opts?.title || '');
          resolve(null);
        });
      },

      // Non-blocking toast notification (auto-dismisses).
      toast(message, opts = {}) {
        try { glassToast(message, opts); } catch {}
      },

      // Telegram's offClick(cb) removes a listener by reference (=== comparison).
      // We must remember the exact handler we registered, otherwise the listener
      // accumulates on each call and every back-button tap fires N times.
      _bbHandler: null,
      _mbHandler: null,

      // Wires Telegram's native BackButton in the header. Replaces in-page back UI.
      setBackButton(handler) {
        const bb = this._tg?.BackButton;
        if (!bb) return;
        try {
          if (this._bbHandler) bb.offClick(this._bbHandler);
          this._bbHandler = null;
          if (handler) {
            this._bbHandler = handler;
            bb.onClick(handler);
            bb.show();
          } else {
            bb.hide();
          }
        } catch {}
      },

      // Wires Telegram's native MainButton (sticky bottom button).
      setMainButton({ text, onClick, color, textColor, isLoading } = {}) {
        const mb = this._tg?.MainButton;
        if (!mb) return;
        try {
          if (this._mbHandler) mb.offClick(this._mbHandler);
          this._mbHandler = null;
          if (!text || !onClick) { mb.hide(); return; }
          mb.setText(text);
          if (color) mb.color = color;
          if (textColor) mb.textColor = textColor;
          if (isLoading) mb.showProgress(false); else mb.hideProgress();
          this._mbHandler = onClick;
          mb.onClick(onClick);
          mb.enable();
          mb.show();
        } catch {}
      },

      hideMainButton() {
        const mb = this._tg?.MainButton;
        try {
          mb?.hide();
          if (this._mbHandler && mb) mb.offClick(this._mbHandler);
          this._mbHandler = null;
        } catch {}
      },

      // CloudStorage with localStorage fallback.
      async cloudGet(key) {
        const cs = this._tg?.CloudStorage;
        if (cs?.getItem) {
          return new Promise((resolve) => {
            try { cs.getItem(key, (err, value) => resolve(err ? null : (value ?? null))); }
            catch { resolve(null); }
          });
        }
        try { return localStorage.getItem(key); } catch { return null; }
      },
      async cloudSet(key, value) {
        const cs = this._tg?.CloudStorage;
        if (cs?.setItem) {
          return new Promise((resolve) => {
            try { cs.setItem(key, String(value ?? ''), (err) => resolve(!err)); }
            catch { resolve(false); }
          });
        }
        try { localStorage.setItem(key, String(value ?? '')); return true; } catch { return false; }
      },
      async cloudRemove(key) {
        const cs = this._tg?.CloudStorage;
        if (cs?.removeItem) {
          return new Promise((resolve) => {
            try { cs.removeItem(key, (err) => resolve(!err)); }
            catch { resolve(false); }
          });
        }
        try { localStorage.removeItem(key); return true; } catch { return false; }
      },
    };
    window.tgUtil = tgUtil;
    // ==================== /Telegram WebApp native helpers ====================

    let adminOrdersMode = 'active'; // 'active' РёР»Рё 'archived'
    let balance = 0;
    let adminOrdersPage = 1;
let adminOrdersFilter = 'all';
let adminOrdersTotalPages = 1;
    let userLimits = { dailyCount: 0, lastDate: null, isTrusted: false };
const MAX_REQUESTS_GUEST = 1;
const MAX_REQUESTS_NEW_USER = 3;
const MAX_REQUESTS_TRUSTED = 100;
    let appliedPromo = null;
    let userReferralCode = null;
    let wishlist = new Set();
    let productsPage = 1;
    let productsFilter = { category: 'all', brand: 'all', sort: 'new' };
    let productsTotalPages = 1;
    let isLoadingMoreProducts = false;
    let reviewsPage = 1;
    let reviewsTotalPages = 1;
    
    // AI Legit check state
    window.legitPhotos = [];
    window.legitResult = null;

    // Global key for Edge Function calls (Authorization header)
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndkYWdqcHR0dmZ2amFuYndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTc4MzgsImV4cCI6MjA5MTIzMzgzOH0.P9GQSW6NLN1BhR66PX-LP4ysZBXFeWIXRYIRvhRjo1c';

    // в”Ђв”Ђв”Ђ Р¤РРќРђР›Р¬РќРђРЇ РњРћР”РђР›РљРђ-РџР Р•Р’Р¬Р® РџР•Р Р•Р” РЎРћРҐР РђРќР•РќРР•Рњ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    // РџРѕРєР°Р·С‹РІР°РµС‚: С„РѕС‚Рѕ-РєР°РЅРґРёРґР°С‚ (image confirmation), СЃСЂР°РІРЅРµРЅРёРµ С†РµРЅС‹ СЃ СЂС‹РЅРєРѕРј,
    // РїРѕР»РЅС‹Р№ РѕР±Р·РѕСЂ Р·Р°РєР°Р·Р°. Р’РѕР·РІСЂР°С‰Р°РµС‚ Promise<boolean> вЂ” true РµСЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РїРѕРґС‚РІРµСЂРґРёР».
    function _ipMoneyFmt(v) { return (Math.round(Number(v || 0) * 100) / 100).toFixed(2); }
    function showOrderPreviewModal(order) {
      return new Promise((resolve) => {
        const title = order?.title || '';
        const brand = order?.brand || '';
        const marketplace = order?.marketplaceName || order?.marketplace || '';
        const price = Number(order?.price || 0);
        const currency = order?.currency || '';
        const size = order?.size || '';
        const country = order?.country || '';
        const weight = Number(order?.weight || 0);
        const totalByn = Number(order?.total_byn ?? order?.total ?? 0);
        const discount = Number(order?.discountAmount || 0);

        const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"'\/]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;'}[c]));

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4';
        overlay.innerHTML = `
          <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 border border-white/10 shadow-2xl">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-bold text-white"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> РџСЂРѕРІРµСЂСЊС‚Рµ Р·Р°РєР°Р·</h3>
              <button id="ipClose" class="text-white/60 hover:text-white text-2xl leading-none">Г—</button>
            </div>

            <div id="ipMatchPanel" class="bg-white/5 border border-white/10 rounded-xl p-3 mb-3 hidden">
              <p class="text-xs text-white/60 mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РџРѕС…РѕР¶Рµ РЅР° СЌС‚РѕС‚ С‚РѕРІР°СЂ:</p>
              <div class="flex gap-3 items-center">
                <img id="ipMatchImg" src="" class="w-20 h-20 rounded-lg object-cover bg-white/10 hidden">
                <div class="flex-1 min-w-0">
                  <p id="ipMatchTitle" class="text-sm text-white font-medium truncate"></p>
                  <p id="ipMatchPrice" class="text-xs text-cyan-400 mt-1"></p>
                  <a id="ipMatchLink" href="#" target="_blank" class="text-xs text-blue-400 hover:underline truncate block">РћС‚РєСЂС‹С‚СЊ <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></a>
                </div>
              </div>
            </div>

            <div id="ipPriceWarn" class="bg-orange-500/15 border border-orange-400/30 rounded-xl p-3 mb-3 text-sm text-orange-100 hidden"></div>

            <div class="bg-white/5 rounded-xl p-3 mb-3 space-y-1.5 text-sm">
              <div class="flex justify-between"><span class="text-white/60">РўРѕРІР°СЂ:</span><span class="text-white text-right ml-2">${_esc(title || 'вЂ”')}</span></div>
              ${brand ? `<div class="flex justify-between"><span class="text-white/60">Р‘СЂРµРЅРґ:</span><span class="text-white">${_esc(brand)}</span></div>` : ''}
              ${marketplace ? `<div class="flex justify-between"><span class="text-white/60">РџР»РѕС‰Р°РґРєР°:</span><span class="text-white">${_esc(marketplace)}</span></div>` : ''}
              ${size ? `<div class="flex justify-between"><span class="text-white/60">Р Р°Р·РјРµСЂ:</span><span class="text-white">${_esc(size)}</span></div>` : ''}
              ${country ? `<div class="flex justify-between"><span class="text-white/60">РЎС‚СЂР°РЅР°:</span><span class="text-white">${_esc(country)}</span></div>` : ''}
              ${weight ? `<div class="flex justify-between"><span class="text-white/60">Р’РµСЃ:</span><span class="text-white">${weight.toFixed(2)} РєРі</span></div>` : ''}
              ${price ? `<div class="flex justify-between"><span class="text-white/60">Р¦РµРЅР° С‚РѕРІР°СЂР°:</span><span class="text-white">${_ipMoneyFmt(price)} ${_esc(currency)}</span></div>` : ''}
              ${totalByn ? `
                <div class="flex justify-between text-base font-bold pt-2 border-t border-white/10 mb-2">
                  <span class="text-white">РС‚РѕРіРѕ:</span>
                  <span class="text-cyan-400">${_ipMoneyFmt(totalByn - discount)} BYN</span>
                </div>
                <div class="p-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-[10px] space-y-1 mt-2">
                  <p class="text-yellow-400 font-bold flex items-center gap-1">
                    ${ix('trending-up', { size: '12px' })} Р’С‹РіРѕРґР° Р·Р°РєР°Р·Р° РІ ICE LOGIX
                  </p>
                  <p class="text-white/70">
                    Р¦РµРЅР° РІ РўР¦ РњРёРЅСЃРєР°: <span class="text-red-400 line-through font-mono font-bold">${_ipMoneyFmt((totalByn - discount) * 1.7)} BYN</span><br>
                    рџ”Ґ Р’Р°С€Р° СЌРєРѕРЅРѕРјРёСЏ: <strong class="text-green-400 font-bold font-mono">${_ipMoneyFmt((totalByn - discount) * 0.7)} BYN (41%)</strong>!
                  </p>
                </div>
              ` : ''}
            </div>

            <div class="flex gap-2">
              <button id="ipBack" class="btn-secondary flex-1 bg-white/10 hover: text-white px-4 py-3 rounded-xl text-sm font-semibold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
              <button id="ipConfirm" class="flex-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-sm font-bold flex-1"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РЎРѕС…СЂР°РЅРёС‚СЊ Р·Р°РєР°Р·</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        const finish = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('#ipClose').onclick = () => finish(false);
        overlay.querySelector('#ipBack').onclick = () => finish(false);
        overlay.querySelector('#ipConfirm').onclick = () => finish(true);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });

        // Р¤РѕРЅРѕРІС‹Р№ РїРѕРёСЃРє: image confirmation + price comparison
        if (title && supabaseClient && window.iceLogixPricing) {
          const q = [brand, title].filter(Boolean).join(' ').trim();
          supabaseClient.functions.invoke('search-products', { body: { query: q, topN: 3, user_id: userId } })
            .then(({ data, error }) => {
              if (error || !data?.ok || !Array.isArray(data.results) || data.results.length === 0) return;
              const first = data.results.find(r => r.image_url || r.title) || data.results[0];
              if (!first) return;
              const panel = overlay.querySelector('#ipMatchPanel');
              const img = overlay.querySelector('#ipMatchImg');
              const tEl = overlay.querySelector('#ipMatchTitle');
              const pEl = overlay.querySelector('#ipMatchPrice');
              const lEl = overlay.querySelector('#ipMatchLink');
              if (panel) panel.classList.remove('hidden');
              if (img && first.image_url) { img.src = first.image_url; img.classList.remove('hidden'); }
              if (tEl) tEl.textContent = first.title || '';
              if (pEl && first.price && first.currency) {
                pEl.textContent = `${_ipMoneyFmt(first.price)} ${first.currency}`;
              }
              if (lEl && first.url) { lEl.href = first.url; }

              // Price comparison: avg РїРѕ СЂРµР·СѓР»СЊС‚Р°С‚Р°Рј РІ С‚РѕР№ Р¶Рµ РІР°Р»СЋС‚Рµ
              if (price && currency) {
                const sameCcy = data.results.filter(r => r.price && r.currency === currency);
                if (sameCcy.length >= 2) {
                  const avg = sameCcy.reduce((s, r) => s + r.price, 0) / sameCcy.length;
                  const dev = Math.abs(price - avg) / avg;
                  if (dev > 0.2) {
                    const warn = overlay.querySelector('#ipPriceWarn');
                    if (warn) {
                      warn.classList.remove('hidden');
                      const direction = price > avg ? 'РІС‹С€Рµ' : 'РЅРёР¶Рµ';
                      warn.innerHTML = `<span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Р’Р°С€Р° С†РµРЅР° <b>${_ipMoneyFmt(price)} ${_esc(currency)}</b> РЅР° ${(dev * 100).toFixed(0)}% ${direction} СЃСЂРµРґРЅРµР№ РїРѕ СЂС‹РЅРєСѓ (~${_ipMoneyFmt(avg)} ${_esc(currency)} РЅР° ${sameCcy.length} РїР»РѕС‰Р°РґРєР°С…). РџРµСЂРµРїСЂРѕРІРµСЂСЊС‚Рµ.`;
                    }
                  }
                }
              }
            })
            .catch(() => { /* silent вЂ” РјРѕРґР°Р»РєР° СЂР°Р±РѕС‚Р°РµС‚ Р±РµР· preview */ });
        }
      });
    }

    async function init() {
      console.log("=== ICE LOGIX VERSION: 2026.05.24.02 ===");
      try {
        // Safe Telegram check
        if (window.Telegram && window.Telegram.WebApp) {
          tg = window.Telegram.WebApp;
          try { tg.ready(); } catch {}
          try { tg.expand(); } catch {}
          // Enable closing-confirmation so accidental swipes don't kill the WebApp mid-checkout.
          try { tg.enableClosingConfirmation?.(); } catch {}
          // Match the Telegram chrome (header + background) to our dark gradient so the WebApp blends in seamlessly.
          try { tg.setHeaderColor?.('#0f172a'); } catch {}
          try { tg.setBackgroundColor?.('#0f172a'); } catch {}
          // Mark <body> so CSS hides duplicate in-page back buttons when native BackButton is available.
          if (tg?.BackButton) document.body.classList.add('tg-native-back');
          const user = tg.initDataUnsafe?.user;
          userId = user ? user.id : null;
          userName = user ? (user.first_name || user.username || 'Р“РѕСЃС‚СЊ') : 'Р“РѕСЃС‚СЊ';
          userAvatarUrl = user?.photo_url || null;
        } else {
          console.warn('Telegram WebApp is not available. Running in browser preview mode.');
        }

        // Safe Supabase check
        const SUPABASE_URL = 'https://vrvwdagjpttvfvjanbwq.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndkYWdqcHR0dmZ2amFuYndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTc4MzgsImV4cCI6MjA5MTIzMzgzOH0.P9GQSW6NLN1BhR66PX-LP4ysZBXFeWIXRYIRvhRjo1c';
        
        if (window.supabase) {
          supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
          console.error('Supabase SDK failed to load. Database calls will be disabled.');
        }

        if (supabaseClient) {
          try {
            await loadAppSettings();
          } catch (err) {
            console.error('Error loading app settings:', err);
          }
          try {
            await loadUserData();
          } catch (err) {
            console.error('Error loading user data:', err);
          }
          try {
            await migrateGuestCart();
          } catch (err) {
            console.error('Error migrating guest cart:', err);
          }
          try {
            await initReferralCode();
          } catch (err) {
            console.error('Error initializing referral code:', err);
          }
          try {
            await loadWishlist();
          } catch (err) {
            console.error('Error loading wishlist:', err);
          }
        }
        
        attachEventListeners();
        
        const avatarDiv = document.querySelector('#avatar');
        if (avatarDiv) {
          avatarDiv.innerHTML = userAvatarUrl ? `<img src="${userAvatarUrl}">` : (userName || 'Р“РѕСЃС‚СЊ').charAt(0).toUpperCase();
        }
        const userNameHeader = document.querySelector('#userNameHeader');
        if (userNameHeader) {
          userNameHeader.innerText = userName;
        }
        const logoImg = document.getElementById('logoImg');
        if (logoImg) {
          logoImg.onclick = () => switchTab('home');
        }
        const userCard = document.getElementById('userCard');
        if (userCard) {
          userCard.onclick = () => switchTab('profile');
        }
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
          settingsBtn.onclick = () => showAppSettings('theme');
        }
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
          notificationsBtn.onclick = () => showNotificationsPanel();
        }
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
          loginBtn.onclick = () => showAuthPage();
          if (!isRegistered) loginBtn.style.display = '';
        }

        // РџСЂРѕРіСЂРµРІР°РµРј РєСЌС€ РєСѓСЂСЃРѕРІ РќР‘Р Р‘ (1 С‡Р°СЃ) вЂ” РґР»СЏ quickEstimate РІ СЃРїРёСЃРєР°С…
        if (window.iceLogixPricing?.warmRates) window.iceLogixPricing.warmRates();
        // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё РѕС‚РєСЂС‹РІР°РµРј РѕРЅР±РѕСЂРґРёРЅРі РґР»СЏ РЅРѕРІС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
        if (!localStorage.getItem('ice_onboarding_shown') && window.iceLogixOnboarding) {
          setTimeout(() => window.iceLogixOnboarding.open(), 800);
        }

        // Performance: recover UI if app was backgrounded and content disappeared
        // window._appReady is set to true after first renderCurrentScreen completes
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && window._appReady) {
            const contentDiv = document.getElementById('content');
            if (contentDiv && (!contentDiv.innerHTML || contentDiv.innerHTML.trim().length < 50)) {
              renderCurrentScreen();
            }
          }
        });

        // Performance: handle Telegram WebApp activation/deactivation
        try {
          tg?.onEvent?.('activated', () => {
            if (!window._appReady) return;
            const contentDiv = document.getElementById('content');
            if (contentDiv && (!contentDiv.innerHTML || contentDiv.innerHTML.trim().length < 50)) {
              renderCurrentScreen();
            }
          });
        } catch(e) {}

        // Performance: use requestIdleCallback for non-critical post-init tasks
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            if (supabaseClient && userId) {
              supabaseClient.from('user_notifications').select('id', { count: 'exact', head: true })
                .eq('user_id', userId).eq('is_read', false).then(({ count }) => {
                  const badge = document.getElementById('notifBadge');
                  if (badge && count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('hidden');
                  }
                }).catch(() => {});
            }
          }, { timeout: 3000 });
        }
      } catch (globalInitErr) {
        console.error('CRITICAL ERROR during init():', globalInitErr);
      } finally {
        // ALWAYS call switchTab('home') to force the UI to boot and replace the loading skeletons!
        try {
          switchTab('home');
          window._appReady = true;
        } catch (tabErr) {
          console.error('Failed to switch tab to home:', tabErr);
        }

        // Deep-link: ?startapp=review_<order_id> в†’ Р°РІС‚Рѕ-РѕС‚РєСЂС‹С‚РёРµ С„РѕСЂРјС‹ РѕС‚Р·С‹РІР°
        try {
          const sp = tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('tgWebAppStartParam') || '';
          if (sp && sp.indexOf('review_') === 0) {
            const orderId = sp.slice('review_'.length);
            setTimeout(() => { try { openReviewForm(orderId); } catch (e) { console.error('openReviewForm failed:', e); } }, 600);
          }
        } catch (dlErr) { console.error('deep-link handling failed:', dlErr); }
      }

      // Watch for category selects to apply 2-step UI enhancement
      try {
        const enhanceAllCategorySelects = () => {
          ['calcCategory', 'orderCategory', 'productCategory'].forEach(enhanceCategoryTwoStep);
        };
        enhanceAllCategorySelects();
        const moEnhance = new MutationObserver(enhanceAllCategorySelects);
        moEnhance.observe(document.body, { childList: true, subtree: true });
      } catch (observerErr) {
        console.error('Failed to initialize category select observer:', observerErr);
      }
    }

    // Р¤РђР—Рђ 1: Р—Р°РіСЂСѓР·РєР° РЅР°СЃС‚СЂРѕРµРє (РїР°СѓР·Р° РїР»Р°С‚РµР¶РµР№, СЂРµРєРІРёР·РёС‚С‹)
    window.appSettings = null;
    async function loadAppSettings() {
      if (!supabaseClient) return;
      const { data, error } = await supabaseClient.from('app_settings').select('*').eq('id', 1).single();
      if (!error && data) {
        window.appSettings = data;
      }
    }

    async function loadUserData() {
      if (!userId) return;
      
      const { data, error } = await supabaseClient.from('users')
        .select('role, ices_balance, referral_code, referral_count, referral_bonus, daily_requests_count, last_request_date, is_trusted, settings, phone')
        .eq('user_id', userId).maybeSingle();
        
      if (!error && data) {
        isRegistered = true;
        isOwner = (data.role === 'owner' || data.role === 'admin');
        balance = data.ices_balance || 0;
        userReferralCode = data.referral_code;
        userLimits.dailyCount = data.daily_requests_count || 0;
        userLimits.lastDate = data.last_request_date ? new Date(data.last_request_date).toDateString() : null;
        userLimits.isTrusted = data.is_trusted || false;
        
        // Save user's sizes in a global variable for auto-population
        window.userSizing = data.settings?.sizing || null;
        window.userSettings = data.settings || {};
        
        document.getElementById('headerBalance').innerText = balance;
        applyTheme(data.settings?.theme || 'dark');
        // Update family balance in header вЂ” fire-and-forget, must not block init
        setTimeout(() => updateHeaderFamilyBalance().catch(() => {}), 0);
      } else {
        applyTheme('dark');
      }

      // Fetch global vacation & exchange buffer settings from the owner's row
      try {
        const { data: ownerRow } = await supabaseClient.from('users').select('settings').eq('role', 'owner').limit(1).maybeSingle();
        if (ownerRow && ownerRow.settings) {
          if (ownerRow.settings.buyer_vacation) {
            window.buyerVacation = ownerRow.settings.buyer_vacation;
          } else {
            window.buyerVacation = { active: false, days: 0 };
          }
          if (ownerRow.settings.exchange_buffer !== undefined) {
            window.iceLogixPricing.CONFIG.currency_buffer_pct = parseFloat(ownerRow.settings.exchange_buffer);
          }
        }
      } catch (err) {
        console.error('Error loading global vacation/buffer settings:', err);
      }
    }

    const HARD_DOMAINS = [
      'pinduoduo.com', 'yangkeduo.com',
      'goofish.com', 'xianyu.com',
      'xiaohongshu.com',
      'poizon.com', 'dewu.com',
      'taobao.com', 'tmall.com',
      '1688.com', 'jd.com'
    ];

    function isHardDomain(url) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return HARD_DOMAINS.some(d => host.includes(d));
      } catch { return false; }
    }

    async function getScreenshotUrl(path) {
      const { data, error } = await supabaseClient.storage
        .from('product-screenshots')
        .createSignedUrl(path, 600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }

    async function processScreenshot(taskId, file) {
      let sessionId = localStorage.getItem('icelogix_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('icelogix_session_id', sessionId);
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
      const path = `${sessionId}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabaseClient.storage
        .from('product-screenshots')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р»: ${uploadErr.message}`);
      const { data, error } = await supabaseClient.functions.invoke('parse-screenshot', {
        body: { jobId: taskId, screenshotPath: path },
      });
      if (error) throw new Error(`РћС€РёР±РєР° СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ: ${error.message}`);
      return data;
    }

    function applyScreenshotResult(data, context) {
      const currencySymbols = { GBP: 'ВЈ', USD: '$', EUR: 'в‚¬', CNY: 'ВҐ', RUB: 'в‚Ѕ', BYN: 'Br' };
      if (context === 'calc') {
        if (data.price != null && Number(data.price) > 0) {
          const el = document.getElementById('calcPrice');
          if (el) el.value = data.price;
        }
        if (data.currency) {
          const sel = document.getElementById('calcCurrency');
          if (sel) { const opt = Array.from(sel.options).find(o => o.value === data.currency); if (opt) sel.value = data.currency; }
          const lbl = document.getElementById('calcPriceCurrency');
          if (lbl) lbl.innerText = currencySymbols[data.currency] || data.currency;
        }
        const titleInp = document.getElementById('calcTitle');
        if (titleInp && data.title && !titleInp.value) titleInp.value = data.title;
      } else {
        if (data.price != null && Number(data.price) > 0) {
          const el = document.getElementById('orderPrice');
          if (el) el.value = data.price;
        }
        if (data.currency) {
          const sel = document.getElementById('orderCurrency');
          if (sel) { const opt = Array.from(sel.options).find(o => o.value === data.currency); if (opt) sel.value = data.currency; }
          const lbl = document.getElementById('orderPriceCurrency');
          if (lbl) lbl.innerText = currencySymbols[data.currency] || data.currency;
        }
        const titleInp = document.getElementById('orderTitle');
        if (titleInp && data.title && !titleInp.value) titleInp.value = data.title;
        if (typeof update === 'function') update();
      }
    }

    function showScreenshotWidget(taskId, checkData, context) {
      const containerId = context === 'calc' ? 'calcScreenshotWidget' : 'orderScreenshotWidget';
      const container = document.getElementById(containerId);
      if (!container) return;

      const hint = checkData.error_message ||
        'Р­С‚Р° РїР»РѕС‰Р°РґРєР° РѕС‚РґР°С‘С‚ РґР°РЅРЅС‹Рµ С‚РѕРІР°СЂР° С‚РѕР»СЊРєРѕ РІ РїСЂРёР»РѕР¶РµРЅРёРё. Р—Р°РіСЂСѓР·РёС‚Рµ СЃРєСЂРёРЅС€РѕС‚ вЂ” РјС‹ РёР·РІР»РµС‡С‘Рј РЅР°Р·РІР°РЅРёРµ Рё С†РµРЅСѓ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.';

      container.innerHTML = `
        <div class="screenshot-widget">
          <p style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;margin-bottom:4px"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> РќРµ СѓРґР°Р»РѕСЃСЊ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё СЂР°СЃРїРѕР·РЅР°С‚СЊ С‚РѕРІР°СЂ</p>
          <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:10px">${hint}</p>
          <div class="screenshot-actions">
            <button id="swUploadBtn" style="background:#3b82f6;color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> Р—Р°РіСЂСѓР·РёС‚СЊ СЃРєСЂРёРЅС€РѕС‚</button>
            <button id="swManualBtn" style="background:rgba(255,255,255,0.12);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Р’РІРµСЃС‚Рё РІСЂСѓС‡РЅСѓСЋ</button>
          </div>
          <div id="swUploadZone" style="display:none;margin-top:12px">
            <div class="screenshot-upload-zone" id="swDropZone">
              <div style="font-size:28px;margin-bottom:6px"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></div>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:4px">РџРµСЂРµС‚Р°С‰РёС‚Рµ С„Р°Р№Р» РёР»Рё РЅР°Р¶РјРёС‚Рµ РґР»СЏ РІС‹Р±РѕСЂР°</p>
              <p style="color:rgba(255,255,255,0.4);font-size:11px">РЎРєСЂРёРЅС€РѕС‚ СЃС‚СЂР°РЅРёС†С‹ С‚РѕРІР°СЂР° РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ.<br>Р”РѕР»Р¶РЅС‹ Р±С‹С‚СЊ РІРёРґРЅС‹ РЅР°Р·РІР°РЅРёРµ Рё С†РµРЅР°.<br>JPEG В· PNG В· WEBP В· HEIC вЂ” РґРѕ 10 РњР‘</p>
              <input type="file" id="swFileInput" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" style="display:none">
            </div>
            <img id="swPreview" class="screenshot-preview" style="display:none" alt="preview">
            <div id="swRecognizeWrap" style="display:none;text-align:center;margin-top:10px">
              <button id="swRecognizeBtn" style="background:#06b6d4;color:#fff;border:none;border-radius:10px;padding:9px 22px;font-size:13px;font-weight:600;cursor:pointer"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Р Р°СЃРїРѕР·РЅР°С‚СЊ С‚РѕРІР°СЂ</button>
            </div>
            <div id="swStatus" style="display:none;font-size:12px;text-align:center;margin-top:8px"></div>
          </div>
        </div>`;
      container.classList.remove('hidden');

      let selectedFile = null;

      const uploadBtn = document.getElementById('swUploadBtn');
      const manualBtn = document.getElementById('swManualBtn');
      const uploadZone = document.getElementById('swUploadZone');
      const dropZone = document.getElementById('swDropZone');
      const fileInput = document.getElementById('swFileInput');
      const preview = document.getElementById('swPreview');
      const recognizeWrap = document.getElementById('swRecognizeWrap');
      const recognizeBtn = document.getElementById('swRecognizeBtn');
      const statusEl = document.getElementById('swStatus');

      uploadBtn.addEventListener('click', () => {
        uploadZone.style.display = 'block';
        uploadBtn.style.display = 'none';
      });

      manualBtn.addEventListener('click', () => {
        container.innerHTML = '';
        container.classList.add('hidden');
      });

      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      });

      fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

      function handleFile(file) {
        if (file.size > 10 * 1024 * 1024) { tgUtil.alert('Р¤Р°Р№Р» СЃР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№. РњР°РєСЃРёРјСѓРј 10 РњР‘.'); return; }
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = ev => {
          preview.src = ev.target.result;
          preview.style.display = 'block';
          dropZone.classList.add('has-file');
          recognizeWrap.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }

      recognizeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        recognizeBtn.disabled = true;
        recognizeBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р Р°СЃРїРѕР·РЅР°С‘РјвЂ¦';
        statusEl.style.display = 'none';
        try {
          const data = await processScreenshot(taskId, selectedFile);
          if (data.status === 'done') {
            applyScreenshotResult(data, context);
            if (data.confidence === 'low') {
              container.innerHTML = '<div class="confidence-low"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Р Р°СЃРїРѕР·РЅР°РІР°РЅРёРµ СЃ РЅРёР·РєРѕР№ СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊСЋ, РїСЂРѕРІРµСЂСЊС‚Рµ РїРѕР»СЏ РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј</div>';
            } else {
              container.innerHTML = '';
              container.classList.add('hidden');
            }
          } else {
            container.innerHTML = '<div class="screenshot-widget"><p style="color:rgba(255,255,255,0.8);font-size:13px"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> РќРµ СѓРґР°Р»РѕСЃСЊ СЂР°СЃРїРѕР·РЅР°С‚СЊ РЅР° СЃРєСЂРёРЅС€РѕС‚Рµ вЂ” РІРІРµРґРёС‚Рµ РґР°РЅРЅС‹Рµ РІСЂСѓС‡РЅСѓСЋ</p></div>';
          }
        } catch (err) {
          recognizeBtn.disabled = false;
          recognizeBtn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Р Р°СЃРїРѕР·РЅР°С‚СЊ С‚РѕРІР°СЂ';
          statusEl.style.display = 'block';
          statusEl.style.color = '#f87171';
          statusEl.innerHTML = '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ' + err.message;
        }
      });
    }

    async function checkAndUpdateLimit() {
  const today = new Date().toDateString();
  
  // Р•СЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ (РіРѕСЃС‚СЊ)
  if (!userId) {
    const guestKey = 'ice_guest_requests';
    let guestData = JSON.parse(localStorage.getItem(guestKey) || '{"count":0,"date":""}');
    if (guestData.date !== today) {
      guestData = { count: 0, date: today };
    }
    const allowed = guestData.count < MAX_REQUESTS_GUEST;
    return { allowed, currentCount: guestData.count, maxRequests: MAX_REQUESTS_GUEST, today, guestData };
  }
  
  // РђРІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ
  let currentCount = userLimits.dailyCount;
  let lastDate = userLimits.lastDate;
  
  // РЎР±СЂРѕСЃ РїСЂРё РЅРѕРІРѕРј РґРЅРµ
  if (lastDate !== today) {
    currentCount = 0;
    userLimits.dailyCount = 0;
    userLimits.lastDate = today;
    await supabaseClient.from('users').update({ daily_requests_count: 0, last_request_date: new Date().toISOString() }).eq('user_id', userId);
  }
  
  const maxRequests = userLimits.isTrusted ? MAX_REQUESTS_TRUSTED : MAX_REQUESTS_NEW_USER;
  const allowed = currentCount < maxRequests;
  return { allowed, currentCount, maxRequests, today };
}

    async function initReferralCode() {
      if (!userId) return;
      if (userReferralCode) return;
      const code = 'ICE' + userId.toString().slice(-6);
      try {
        await supabaseClient.from('users').update({ referral_code: code }).eq('user_id', userId);
        userReferralCode = code;
      } catch(e) { console.log(e); }
    }

    async function loadWishlist() {
      if (!userId) return;
      try {
        const { data } = await supabaseClient.from('wishlist').select('product_id').eq('user_id', userId);
        if (data) data.forEach(item => wishlist.add(item.product_id));
      } catch(e) {}
    }

    function attachEventListeners() {
      document.getElementById('addBalanceBtn').onclick = () => {
        tgUtil.haptic('medium');
        const amount = prompt('Р’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ РїРѕРїРѕР»РЅРµРЅРёСЏ (РІ ICE / BYN):', '50');
        if (amount && !isNaN(amount) && Number(amount) > 0) {
          tgUtil.alert(`Р“РѕС‚РѕРІРёРј СЃС‡РµС‚ РЅР° ${amount} Telegram Stars...`);
          // Р—РґРµСЃСЊ Р±СѓРґРµС‚ РІС‹Р·РѕРІ bot api РґР»СЏ РіРµРЅРµСЂР°С†РёРё РёРЅРІРѕР№СЃР° Telegram Stars
          // Р’СЂРµРјРµРЅРЅРѕ СЃРёРјСѓР»РёСЂСѓРµРј РїРѕРїРѕР»РЅРµРЅРёРµ РґР»СЏ С‚РµСЃС‚РёСЂРѕРІР°РЅРёСЏ
          setTimeout(async () => {
            const addedIce = Number(amount);
            const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', userId).single();
            const newBal = (u.ices_balance || 0) + addedIce;
            await supabaseClient.from('users').update({ ices_balance: newBal }).eq('user_id', userId);
            balance = newBal;
            document.getElementById('headerBalance').innerText = balance;
            tgUtil.haptic('success');
            tgUtil.alert(`Р‘Р°Р»Р°РЅСЃ СѓСЃРїРµС€РЅРѕ РїРѕРїРѕР»РЅРµРЅ РЅР° ${addedIce} ICE!`);
          }, 1500);
        }
      };
      document.querySelectorAll('.tab-item').forEach(tab => {
        tab.onclick = () => {
          const tabName = tab.getAttribute('data-tab');
          currentSubScreen = null;
          appliedPromo = null;
          switchTab(tabName);
        };
      });
    }

    function switchTab(tabName, subScreen = null) {
      tgUtil.hideMainButton();
      if (tabName !== 'neworder') {
        window.tempOrder = null;
      }
      if (currentTab && currentTab !== tabName) previousTab = currentTab;
      currentTab = tabName;
      currentSubScreen = subScreen;
      if (tabName !== 'calculator') clearBlobUrls('calc:');
      if (tabName !== 'neworder') clearBlobUrls('order:');
      if (tabName !== 'legitcheck') {
        clearBlobUrls('legit:');
        window.legitPhotos = [];
        window.legitResult = null;
      }
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      const activeTab = document.querySelector(`.tab-item[data-tab="${tabName}"]`);
      if (activeTab) activeTab.classList.add('active');
      tgUtil.haptic('selection');
      
      const isDifferent = (window.currentTab !== tabName) || (window.currentSubScreen !== subScreen);
      if (isDifferent) {
        const contentDiv = document.getElementById('content');
        if (contentDiv) {
          contentDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-24 text-center w-full min-h-[50vh] page-enter">
              <div class="relative w-14 h-14 mb-4 flex items-center justify-center">
                <div class="absolute inset-0 rounded-full border-3 border-cyan-500/10"></div>
                <div class="absolute inset-0 rounded-full border-3 border-t-cyan-400 animate-spin"></div>
                <span class="text-xl">вќ„пёЏ</span>
              </div>
              <p class="text-white/40 text-xs tracking-wider uppercase font-medium">Р—Р°РіСЂСѓР·РєР°...</p>
            </div>
          `;
        }
      }
      
      // Scroll to the very top to prevent carrying scroll offset across tabs
      window.scrollTo(0, 0);
      renderCurrentScreen();
    }

    // Wires Telegram's native BackButton based on current tab/subscreen.
    // On 'home' вЂ” hides the BackButton. Anywhere else вЂ” shows it and on tap returns to home or previousTab.
    function syncTelegramBackButton() {
      const isRoot = currentTab === 'home' && !currentSubScreen;
      if (isRoot) {
        tgUtil.setBackButton(null);
        return;
      }
      tgUtil.setBackButton(() => {
        tgUtil.haptic('light');
        if (currentSubScreen) {
          currentSubScreen = null;
          renderCurrentScreen();
          syncTelegramBackButton();
          return;
        }
        if (previousTab && previousTab !== currentTab) {
          switchTab(previousTab);
        } else {
          switchTab('home');
        }
      });
    }

    function renderFooter() {
      return `
        <div class="app-footer">
          <img src="./assets/logo.png" class="footer-logo" alt="ICE LOGIX">
          <div class="social-icons">
            <div class="social-icon" data-social="tg" title="Telegram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div class="social-icon" data-social="ig" title="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </div>
            <div class="social-icon" data-social="vk" title="VK">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.597v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.684 4 8.277c0-.254.102-.491.597-.491h1.744c.447 0 .615.2.786.678.867 2.49 2.31 4.674 2.905 4.674.224 0 .33-.102.33-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.644v3.499c0 .373.17.508.271.508.224 0 .407-.135.814-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.644-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.491-.085.744-.576.744z"/>
              </svg>
            </div>
          </div>
          <div class="footer-links">
            <span class="footer-link" data-link="offer">РћС„РµСЂС‚Р°</span>
            <span class="footer-link" data-link="privacy">РљРѕРЅС„РёРґРµРЅС†РёР°Р»СЊРЅРѕСЃС‚СЊ</span>
            <span class="footer-link" data-link="contacts">РљРѕРЅС‚Р°РєС‚С‹</span>
            <span class="footer-link" data-link="faq">РћС‚РІРµС‚С‹ РЅР° РІРѕРїСЂРѕСЃС‹ (FAQ)</span>
          </div>
          <div class="copyright">
            РРџ РРІР°РЅРѕРІ Р.Р., РЈРќРџ 123456789<br>
            В© 2025 ICE LOGIX. Р”РѕСЃС‚Р°РІРєР° РјРµС‡С‚С‹ РёР· Р»СЋР±РѕР№ С‚РѕС‡РєРё РјРёСЂР° <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span>
          </div>
        </div>
      `;
    }

    async function renderPromoBanners() {
  try {
    const { data, error } = await supabaseClient
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    if (!data || data.length === 0) return '';
    
    return data.map(p => `
      <div class="banner-slide" data-promotion-id="${p.id}" style="background-image: url('${p.banner_url}'); background-size: cover; background-position: center; min-width: 280px; height: 120px;">
      </div>
    `).join('');
  } catch (err) {
    console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё Р±Р°РЅРЅРµСЂРѕРІ:', err);
    return '';
  }
}

        // ==================== Р Р•РќР”Р•Р  Р“Р›РђР’РќРћР™ РЎРўР РђРќРР¦Р« ====================
        async function renderHome() {
  const marketplaces = [
    { id: 1, name: 'Poizon', url: 'https://poizon.com', icon: '<span class="mp-dot" style="background:#22c55e" aria-hidden="true"></span>' },
    { id: 2, name: 'Taobao', url: 'https://taobao.com', icon: '<span class="mp-dot" style="background:#fb923c" aria-hidden="true"></span>' },
    { id: 3, name: '1688', url: 'https://1688.com', icon: '<span class="mp-dot" style="background:#facc15" aria-hidden="true"></span>' },
    { id: 4, name: 'Zalando', url: 'https://zalando.de', icon: '<span class="mp-dot" style="background:#92400e" aria-hidden="true"></span>' },
    { id: 5, name: 'Nike', url: 'https://nike.com', icon: '<span class="mp-dot" style="background:#374151" aria-hidden="true"></span>' },
    { id: 6, name: 'ASOS', url: 'https://asos.com', icon: '<span class="mp-dot" style="background:#3b82f6" aria-hidden="true"></span>' }
  ];
  
  return `
    <!-- Currency Tracker -->
    <div class="glass-card mb-5 page-enter" style="animation-delay: 0.12s; padding: 12px 16px;">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-white font-bold text-sm flex items-center gap-1"><span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span> Р‘РёСЂР¶РµРІРѕР№ РєСѓСЂСЃ ICE LOGIX</h3>
        <span class="text-green-400 text-[10px] bg-green-400/20 px-2 py-0.5 rounded-full animate-pulse">Live</span>
      </div>
      <div style="overflow-x: auto; margin: 0 -4px; padding: 2px 4px; scrollbar-width: none; -ms-overflow-style: none;">
        <div style="display: flex; gap: 6px; width: max-content; padding-bottom: 2px;">
          ${[
            { flag: 'рџ‡єрџ‡ё', code: 'USD', label: '$1',     key: 'usd_rate', def: 3.25,    mult: 1    },
            { flag: 'рџ‡Єрџ‡є', code: 'EUR', label: 'в‚¬1',     key: 'eur_rate', def: 3.55,    mult: 1    },
            { flag: 'рџ‡·рџ‡є', code: 'RUB', label: 'в‚Ѕ1',     key: 'rub_rate', def: 0.031,   mult: 1    },
            { flag: 'рџ‡Ёрџ‡і', code: 'CNY', label: 'ВҐ1',     key: 'cny_rate', def: 0.46,    mult: 1    },
            { flag: 'рџ‡µрџ‡±', code: 'PLN', label: 'zЕ‚1',    key: 'pln_rate', def: 0.80,    mult: 1    },
            { flag: 'рџ‡Їрџ‡µ', code: 'JPY', label: 'ВҐ100',   key: 'jpy_rate', def: 0.022,   mult: 100  },
            { flag: 'рџ‡»рџ‡і', code: 'VND', label: 'в‚«1000',  key: 'vnd_rate', def: 0.00013, mult: 1000 },
            { flag: 'рџ‡¦рџ‡Є', code: 'AED', label: 'ШЇ.ШҐ1',   key: 'aed_rate', def: 0.88,    mult: 1    },
            { flag: 'рџ‡№рџ‡·', code: 'TRY', label: 'в‚є1',     key: 'try_rate', def: 0.096,   mult: 1    },
            { flag: 'рџ‡°рџ‡·', code: 'KRW', label: 'в‚©1000',  key: 'krw_rate', def: 0.0024,  mult: 1000 },
          ].map(c => {
            const rate = (Number(window.settings?.[c.key] || c.def) * c.mult).toFixed(2);
            return \`<div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 6px 10px; flex-shrink: 0;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.45); white-space: nowrap; margin-bottom: 3px;">\${c.flag} \${c.code}</div>
              <div style="font-size: 11px; font-weight: 700; color: white; white-space: nowrap;">\${c.label} в‰€ <span style="color: #67e8f9;">\${rate} Br/ICE</span></div>
            </div>\`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Quick Actions - Story Cards with 3D-style icons -->
    <div class="scroll-hint-container mb-6 page-enter" style="animation-delay: 0.15s;">
    <div class="swipe-hint-icon">рџ‘‰</div>
    <div class="scroll-x" style="padding: 4px 0;">
      <div class="story-card" data-story="onboarding">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(99,202,253,0.2), rgba(59,130,246,0.1));">
          <span style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span></span>
        </div>
        <span class="story-label">Р“Р°Р№Рґ</span>
      </div>
      <div class="story-card" data-story="legitcheck">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1));">
          <span style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span></span>
        </div>
        <span class="story-label">Р›РµРіРёС‚-С‡РµРє</span>
      </div>
      <div class="story-card" data-story="reports">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1));">
          <span style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></span>
        </div>
        <span class="story-label">РћС‚С‡С‘С‚С‹</span>
      </div>
      <div class="story-card" data-story="reviews">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(251,191,36,0.25), rgba(234,179,8,0.15));">
          <span style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span></span>
        </div>
        <span class="story-label">РћС‚Р·С‹РІС‹</span>
      </div>
      <div class="story-card" data-story="promo">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1));">
          <span style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span></span>
        </div>
        <span class="story-label">РђРєС†РёРё</span>
      </div>
      <div class="story-card" data-story="resale">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(236,72,153,0.2), rgba(219,39,119,0.1));">
          <span style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span></span>
        </div>
        <span class="story-label">РџСЂРёСЃС‚СЂРѕР№</span>
      </div>
      <div class="story-card" data-story="academy">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15));">
          <span style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span></span>
        </div>
        <span class="story-label">РђРєР°РґРµРјРёСЏ</span>
      </div>
    </div>
    </div>

    <!-- Promo Banners -->
    <div class="scroll-hint-container mb-6 page-enter" style="animation-delay: 0.2s;">
    <div class="swipe-hint-icon">рџ‘‰</div>
    <div class="scroll-x" id="promoBannersContainer">
      ${await renderPromoBanners()}
    </div>
    </div>
    
    
    <!-- Popular Marketplaces Section -->
    <div class="mb-6 page-enter" style="animation-delay: 0.25s;">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span style="font-size: 20px;"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span></span>
          РџР»РѕС‰Р°РґРєРё
        </h3>
        <button id="moreMarketplacesBtn" class="text-sm font-semibold flex items-center gap-1" style="color: var(--ice-primary);">
          Р’СЃРµ
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      <div class="scroll-hint-container">
      <div class="swipe-hint-icon">рџ‘‰</div>
      <div class="scroll-x" style="padding: 4px 0;">
        ${marketplaces.map(mp => `
          <div class="story-card marketplace-story" data-url="${mp.url}">
            <div class="story-icon">
              <span style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">${mp.icon}</span>
            </div>
            <span class="story-label">${mp.name}</span>
          </div>
        `).join('')}
      </div>
      </div>
    </div>
    
    <!-- Recommended Products Section -->
    <div class="mb-6 page-enter" style="animation-delay: 0.3s;">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span style="font-size: 20px;"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/></svg></span></span>
          Р РµРєРѕРјРµРЅРґСѓРµРј
        </h3>
        <button id="moreProductsBtn" class="text-sm font-semibold flex items-center gap-1" style="color: var(--ice-primary);">
          РљР°С‚Р°Р»РѕРі
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button id="tabPopular" class="filter-chip active"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg></span> РџРѕРїСѓР»СЏСЂРЅС‹Рµ</button>
        <button id="tabForYou" class="filter-chip"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 3 18 3 22 9 12 22 2 9 6 3"/><line x1="11" y1="3" x2="8" y2="9"/><line x1="13" y1="3" x2="16" y2="9"/><line x1="2" y1="9" x2="22" y2="9"/></svg></span> Р”Р»СЏ РІР°СЃ</button>
      </div>
      <div class="grid grid-cols-2 gap-3" id="homeProductsGrid">
        <div class="skeleton" style="height: 200px; border-radius: 20px;"></div>
        <div class="skeleton" style="height: 200px; border-radius: 20px;"></div>
      </div>
    </div>
    
    ${renderFooter()}
  `;
}

// ==================== РћР‘Р РђР‘РћРўР§РРљ Р“Р›РђР’РќРћР™ ====================
function attachHomeHandlers() {
      document.querySelector('[data-story="onboarding"]')?.addEventListener('click', () => {
        if (window.iceLogixOnboarding) window.iceLogixOnboarding.open();
      });
      document.querySelector('[data-story="reports"]')?.addEventListener('click', () => switchTab('reports'));
      document.querySelector('[data-story="reviews"]')?.addEventListener('click', () => switchTab('reviews'));
      document.querySelector('[data-story="promo"]')?.addEventListener('click', () => switchTab('promo'));
      document.querySelector('[data-story="academy"]')?.addEventListener('click', () => switchTab('academy'));
      document.querySelector('[data-story="legitcheck"]')?.addEventListener('click', () => switchTab('legitcheck'));
      document.querySelector('[data-story="resale"]')?.addEventListener('click', () => switchTab('resale'));
      document.getElementById('moreMarketplacesBtn')?.addEventListener('click', () => {
        switchTab('catalogs', 'marketplaces');
      });
      document.getElementById('moreProductsBtn')?.addEventListener('click', () => {
        switchTab('catalogs', 'productsCatalog');
      });
      document.querySelectorAll('.marketplace-story').forEach(el => {
        el.addEventListener('click', () => {
          const url = el.getAttribute('data-url');
          if (url) window.open(url, '_blank');
          else tgUtil.alert('РЎСЃС‹Р»РєР° РЅР° РїР»РѕС‰Р°РґРєСѓ Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅР° РїРѕР·Р¶Рµ');
        });
      });
      document.querySelectorAll('.banner-slide').forEach(el => {
        el.addEventListener('click', () => tgUtil.alert('РџРѕРґСЂРѕР±РЅРµРµ Рѕ Р°РєС†РёРё Р±СѓРґРµС‚ РїРѕР·Р¶Рµ'));
      });
      document.querySelectorAll('.social-icon').forEach(el => {
        el.addEventListener('click', () => tgUtil.alert('РЎРѕС†СЃРµС‚Рё Р±СѓРґСѓС‚ РїРѕРґРєР»СЋС‡РµРЅС‹ РїРѕР·Р¶Рµ'));
      });

      loadHomeProducts('popular');
      document.getElementById('tabPopular')?.addEventListener('click', () => {
        document.getElementById('tabPopular').classList.add('active');
        document.getElementById('tabForYou').classList.remove('active');
        loadHomeProducts('popular');
      });
      document.getElementById('tabForYou')?.addEventListener('click', () => {
        document.getElementById('tabForYou').classList.add('active');
        document.getElementById('tabPopular').classList.remove('active');
        loadHomeProducts('for_you');
      });
      document.querySelectorAll('.banner-slide').forEach(el => {
  el.addEventListener('click', () => {
    const promoId = el.dataset.promotionId;
    if (promoId) {
      // РџСЂРё РєР»РёРєРµ РЅР° Р±Р°РЅРЅРµСЂ Р°РєС‚РёРІРёСЂСѓРµРј Р°РєС†РёСЋ РІ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂРµ
      window.activePromotionId = promoId;
      tgUtil.alert('РђРєС†РёСЏ РїСЂРёРјРµРЅРµРЅР°! РџРµСЂРµР№РґРёС‚Рµ РІ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂ.');
    }
  });
});

document.querySelectorAll('.addToCartBtn').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const productId = btn.dataset.productId;
    if (productId) addToCart(productId);
  };
});

document.querySelectorAll('.buyNowBtn').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const url = btn.dataset.url;
    const price = parseFloat(btn.dataset.price);
    if (url && !isNaN(price)) {
      window.tempOrder = {
        url: url,
        price: price,
        weight: 1,
        total: window.iceLogixPricing.quickEstimate(price, 1),
        discountAmount: 0,
        appliedPromo: null
      };
      switchTab('neworder');
    }
  };
});
    }

    async function loadHomeProducts(tab = 'popular') {
  const grid = document.getElementById('homeProductsGrid');
  if (!grid) return;
  try {
    let data = [];
    if (tab === 'for_you') {
      if (!userId) {
        grid.innerHTML = '<p class="text-white/50 text-sm col-span-2 text-center py-4">Р’РѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Рµ СЂРµРєРѕРјРµРЅРґР°С†РёРё</p>';
        return;
      }
      const { data: views } = await supabaseClient.from('user_views').select('product_id').eq('user_id', userId).order('viewed_at', { ascending: false }).limit(20);
      if (views && views.length > 0) {
        const ids = views.map(v => v.product_id);
        const { data: viewed } = await supabaseClient.from('products').select('*').in('id', ids).eq('is_active', true);
        if (viewed) data = viewed;
      }
      if (data.length === 0) {
        grid.innerHTML = '<p class="text-white/50 text-sm col-span-2 text-center py-4">РџСЂРѕСЃРјР°С‚СЂРёРІР°Р№С‚Рµ С‚РѕРІР°СЂС‹, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ СЂРµРєРѕРјРµРЅРґР°С†РёРё</p>';
        return;
      }
    } else {
      const { data: popular } = await supabaseClient.from('products').select('*').eq('is_active', true).limit(10);
      if (popular) data = popular;
    }

    grid.innerHTML = data.map(p => `
      <div class="product-card" data-product-id="${p.id}">
        <div class="aspect-square bg-white/10 flex items-center justify-center relative">
          <img src="${p.image_url || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover">
          <span class="absolute top-2 right-2 wishlist-heart text-xl ${wishlist.has(p.id) ? 'text-red-500' : 'text-white/50'}" data-product-id="${p.id}">${wishlist.has(p.id) ? '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>' : '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>'}</span>
        </div>
        <div class="p-2">
          <p class="text-white font-bold text-sm truncate">${p.title}</p>
          <p class="text-cyan-400 text-xs">${p.price} ${p.currency}</p>
          <div class="flex gap-1 mt-2">
            <button class="btn-primary addToCartBtn flex-1 bg-cyan-500/70 hover:" data-product-id="${p.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span></button>
            <button class="buyNowBtn flex-1 bg-green-500/70 hover:bg-green-500 py-1 rounded text-xs" data-url="${p.url}" data-price="${p.price}"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span></button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.wishlist-heart').forEach(heart => {
      heart.onclick = async (e) => {
        e.stopPropagation();
        const productId = heart.dataset.productId;
        if (wishlist.has(productId)) {
          await supabaseClient.from('wishlist').delete().eq('user_id', userId).eq('product_id', productId);
          wishlist.delete(productId);
          heart.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>';
          heart.classList.remove('text-red-500');
        } else {
          await supabaseClient.from('wishlist').insert({ user_id: userId, product_id: productId });
          wishlist.add(productId);
          heart.innerHTML = '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>';
          heart.classList.add('text-red-500');
        }
      };
    });

    grid.querySelectorAll('.addToCartBtn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const productId = btn.dataset.productId;
        if (productId) addToCart(productId);
      };
    });

    grid.querySelectorAll('.buyNowBtn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        const price = parseFloat(btn.dataset.price);
        if (url && !isNaN(price)) {
          window.tempOrder = { url, price, weight: 1, total: window.iceLogixPricing.quickEstimate(price, 1), discountAmount: 0, appliedPromo: null };
          switchTab('neworder');
        }
      };
    });

    grid.querySelectorAll('.product-card').forEach(card => {
      card.onclick = () => {
        const productId = card.dataset.productId;
        const url = card.querySelector('.buyNowBtn')?.dataset.url;
        const price = parseFloat(card.querySelector('.buyNowBtn')?.dataset.price);
        if (userId && productId) {
          supabaseClient.from('user_views').upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' }).then(() => {});
        }
        if (url && !isNaN(price)) {
          window.tempOrder = { url, price, weight: 1, total: window.iceLogixPricing.quickEstimate(price, 1), discountAmount: 0, appliedPromo: null };
          switchTab('neworder');
        }
      };
    });
  } catch(e) {
    console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё С‚РѕРІР°СЂРѕРІ РЅР° РіР»Р°РІРЅРѕР№:', e);
  }
}

    // ==================== Р Р•РќР”Р•Р  РљРђР›Р¬РљРЈР›РЇРўРћР Рђ ====================
    async function renderCalculator() {
      const limitInfo = await checkAndUpdateLimit();
      let limitMessage = '';
      if (!limitInfo.allowed) {
        limitMessage = `<div class="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4 text-center">
          <p class="text-red-400 font-bold"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Р”РЅРµРІРЅРѕР№ Р»РёРјРёС‚ РёСЃС‡РµСЂРїР°РЅ (${limitInfo.currentCount}/${limitInfo.maxRequests})</p>
          <p class="text-white/70 text-sm mt-1">РћС„РѕСЂРјРёС‚Рµ Р·Р°РєР°Р·, С‡С‚РѕР±С‹ СЃРЅСЏС‚СЊ РѕРіСЂР°РЅРёС‡РµРЅРёРµ</p>
        </div>`;
      } else {
        const remaining = limitInfo.maxRequests - limitInfo.currentCount;
        limitMessage = `<div class="bg-white/5 rounded-xl p-3 mb-4 text-center">
          <p class="text-white/70 text-sm">РћСЃС‚Р°Р»РѕСЃСЊ СЂР°СЃС‡С‘С‚РѕРІ СЃРµРіРѕРґРЅСЏ: <span class="text-cyan-400 font-bold">${remaining}</span> РёР· ${limitInfo.maxRequests}</p>
        </div>`;
      }

      let vacationBanner = '';
      if (window.buyerVacation && window.buyerVacation.active) {
        const days = window.buyerVacation.days || 0;
        vacationBanner = `
          <div class="mb-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex gap-3 items-center">
            <span class="text-2xl">рџЊґ</span>
            <div class="text-left">
              <p class="font-bold">Р‘Р°Р№РµСЂС‹ РЅР° РєР°РЅРёРєСѓР»Р°С…</p>
              <p class="text-xs text-white/70 mt-0.5">РЎСЂРѕРєРё РґРѕСЃС‚Р°РІРєРё СѓРІРµР»РёС‡РµРЅС‹ РЅР° ${days} РґРЅ. Р Р°СЃС‡С‘С‚С‹ РІ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂРµ СѓС‡РёС‚С‹РІР°СЋС‚ СЌС‚Рѕ РІСЂРµРјСЏ.</p>
            </div>
          </div>
        `;
      }

      // в”Ђв”Ђ Step 1: Country Selection в”Ђв”Ђ
      if (!window.calcCountry) {
        return `
          <div class="glass-card page-enter">
            <h2 class="text-xl font-bold mb-4 text-center"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> РљР°Р»СЊРєСѓР»СЏС‚РѕСЂ СЃС‚РѕРёРјРѕСЃС‚Рё</h2>
            <p class="text-white/60 text-sm text-center mb-6">Р’С‹Р±РµСЂРёС‚Рµ СЃС‚СЂР°РЅСѓ, РѕС‚РєСѓРґР° Р±СѓРґРµС‚ РѕС‚РїСЂР°РІР»РµРЅ С‚РѕРІР°СЂ. РћС‚ СЌС‚РѕРіРѕ Р·Р°РІРёСЃСЏС‚ С‚Р°СЂРёС„С‹ Рё СЃСЂРѕРєРё.</p>
            ${vacationBanner}
            ${limitMessage}
            <div class="grid grid-cols-1 gap-4">
              <!-- China -->
              <div class="glass-card p-4 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition flex items-center gap-4" onclick="selectCalcCountry('CN')">
                <div class="text-4xl">рџ‡Ёрџ‡і</div>
                <div class="flex-1">
                  <h3 class="font-bold text-white text-base">РљРёС‚Р°Р№ (Poizon, Taobao, 1688)</h3>
                  <p class="text-xs text-white/50 mt-0.5">РћРіСЂРѕРјРЅС‹Р№ РІС‹Р±РѕСЂ, Р»СѓС‡С€РёРµ С†РµРЅС‹ РЅР° РѕСЂРёРіРёРЅР°Р»С‹</p>
                  <div class="flex gap-4 mt-2 text-xs">
                    <span class="text-cyan-400 font-semibold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> $10 / РєРі</span>
                    <span class="text-white/60"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> 10-15 РґРЅРµР№</span>
                  </div>
                </div>
              </div>
              <!-- Poland/EU -->
              <div class="glass-card p-4 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition flex items-center gap-4" onclick="selectCalcCountry('PL')">
                <div class="text-4xl">рџ‡µрџ‡±</div>
                <div class="flex-1">
                  <h3 class="font-bold text-white text-base">РџРѕР»СЊС€Р° / Р•РЎ (Zalando, ASOS, Farfetch)</h3>
                  <p class="text-xs text-white/50 mt-0.5">100% РѕСЂРёРіРёРЅР°Р»СЊРЅС‹Рµ РµРІСЂРѕРїРµР№СЃРєРёРµ РєРѕР»Р»РµРєС†РёРё</p>
                  <div class="flex gap-4 mt-2 text-xs">
                    <span class="text-cyan-400 font-semibold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> $15 / РєРі</span>
                    <span class="text-white/60"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> 14-20 РґРЅРµР№</span>
                  </div>
                </div>
              </div>
              <!-- Russia -->
              <div class="glass-card p-4 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition flex items-center gap-4" onclick="selectCalcCountry('RU')">
                <div class="text-4xl">рџ‡·рџ‡є</div>
                <div class="flex-1">
                  <h3 class="font-bold text-white text-base">Р РѕСЃСЃРёСЏ (WB, Lamoda, Ozon)</h3>
                  <p class="text-xs text-white/50 mt-0.5">РЎРІРµСЂС…Р±С‹СЃС‚СЂР°СЏ РґРѕСЃС‚Р°РІРєР°, Р±РµР· РїРѕС€Р»РёРЅ Р•РђР­РЎ</p>
                  <div class="flex gap-4 mt-2 text-xs">
                    <span class="text-cyan-400 font-semibold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> $5 / РєРі</span>
                    <span class="text-white/60"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> 3-5 РґРЅРµР№</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ${renderFooter()}
        `;
      }

      // в”Ђв”Ђ Step 2: Calculator Form в”Ђв”Ђ
      const countryLabel = window.calcCountry === 'CN' ? 'рџ‡Ёрџ‡і РљРёС‚Р°Р№' : window.calcCountry === 'PL' ? 'рџ‡µрџ‡± РџРѕР»СЊС€Р° / Р•РЎ' : 'рџ‡·рџ‡є Р РѕСЃСЃРёСЏ';
      const defaultCurrency = window.calcCountry === 'CN' ? 'CNY' : window.calcCountry === 'RU' ? 'RUB' : 'EUR';

      return `
        <div class="glass-card page-enter">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> Р Р°СЃС‡С‘С‚ СЃС‚РѕРёРјРѕСЃС‚Рё</h2>
            <button class="text-xs text-cyan-400 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition" onclick="window.calcCountry=null; renderCurrentScreen()">
              ${countryLabel} <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span> РЎРјРµРЅРёС‚СЊ
            </button>
          </div>
          ${vacationBanner}
          ${limitMessage}

          <div id="activePromoInfo" class="mb-3 p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hidden">
            <p class="text-cyan-400 font-bold"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span> РђРєС†РёСЏ: <span id="promoTitle"></span></p>
            <p class="text-white/70 text-sm" id="promoDesc"></p>
            <p class="text-green-400 text-sm mt-1" id="promoDiscount"></p>
          </div>

          <!-- 4-СЂРµР¶РёРјРЅС‹Р№ СЃРµР»РµРєС‚РѕСЂ РІРІРѕРґР° С‚РѕРІР°СЂР° -->
          <label class="text-white/70 text-xs mb-2 block">РљР°Рє РґРѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂ?</label>
          <div id="calcModeSelector" class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button type="button" data-calc-mode="manual" class="btn-secondary calc-mode-btn bg-white/10 font-bold transition flex flex-col items-center gap-1"><span class="text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></span><span>Р’СЂСѓС‡РЅСѓСЋ</span></button>
            <button type="button" data-calc-mode="link" class="btn-primary calc-mode-btn transition flex flex-col items-center gap-1"><span class="text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span></span><span>РџРѕ СЃСЃС‹Р»РєРµ</span></button>
            <button type="button" data-calc-mode="photo" class="btn-secondary calc-mode-btn bg-white/10 font-bold transition flex flex-col items-center gap-1"><span class="text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></span><span>РџРѕ С„РѕС‚Рѕ</span></button>
            <button type="button" data-calc-mode="text" class="btn-secondary calc-mode-btn bg-white/10 font-bold transition flex flex-col items-center gap-1"><span class="text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></span><span>РџРѕ РѕРїРёСЃР°РЅРёСЋ</span></button>
          </div>

          <!-- Mode: link & manual вЂ” РѕР±С‰РµРµ URL-РїРѕР»Рµ -->
          <div data-calc-mode-pane="link manual">
            <label class="text-white/70 text-sm">РЎСЃС‹Р»РєР° РЅР° С‚РѕРІР°СЂ <span data-calc-mode-pane="manual" class="text-white/40 text-xs hidden">(РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</span></label>
            <div class="flex flex-wrap gap-2 mt-1 mb-1 items-stretch">
              <div class="flex-1 min-w-[200px] flex gap-1 bg-white/5 border border-white/30 rounded-xl overflow-hidden px-1.5 py-1">
                <input type="text" id="calcUrl" class="bg-transparent flex-1 border-0 outline-none p-2 text-sm text-white" placeholder="https://poizon.com/...">
                <button type="button" id="calcPasteBtn" class="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-3.5 transition flex items-center justify-center text-cyan-400 gap-1.5 text-xs font-bold" title="Р’СЃС‚Р°РІРёС‚СЊ РёР· Р±СѓС„РµСЂР°">
                  ${ix('clipboard', { size: '14px' })}
                  <span>Р’СЃС‚Р°РІРёС‚СЊ</span>
                </button>
              </div>
              <button id="analyzeLinkBtn" data-calc-mode-pane="link" class="btn-primary whitespace-nowrap transition flex-shrink-0"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РђРЅР°Р»РёР·РёСЂРѕРІР°С‚СЊ</button>
            </div>
            <p data-calc-mode-pane="manual" class="text-white/40 text-xs mb-2 hidden">Р•СЃР»Рё СЃСЃС‹Р»РєРё РЅРµС‚ вЂ” Р·Р°РїРѕР»РЅРёС‚Рµ РїРѕР»СЏ РЅРёР¶Рµ РІСЂСѓС‡РЅСѓСЋ.</p>
          </div>

          <!-- Mode: photo (search by image) -->
          <div data-calc-mode-pane="photo" class="hidden">
            <label class="text-white/70 text-sm">Р¤РѕС‚Рѕ С‚РѕРІР°СЂР° (РјРѕР¶РЅРѕ РґРѕ 5)</label>
            <div id="calcPhotoUploadZone" class="mt-1 mb-2 p-4 border-2 border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:bg-white/5 transition">
              <div class="text-3xl mb-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></div>
              <p class="text-white/80 text-sm font-semibold">Р—Р°РіСЂСѓР·РёС‚Рµ С„РѕС‚Рѕ С‚РѕРІР°СЂР°</p>
              <p class="text-white/50 text-xs mt-1">РќРµСЃРєРѕР»СЊРєРѕ С„РѕС‚Рѕ = Р±РѕР»РµРµ С‚РѕС‡РЅС‹Р№ РїРѕРёСЃРє. РџСЂРёРЅРёРјР°РµРј РґРѕ 5 С€С‚.</p>
              <input type="file" id="calcPhotoInput" accept="image/*" multiple class="hidden">
            </div>
            <div id="calcPhotoPreview" class="hidden mb-2 grid grid-cols-3 gap-2"></div>
            <label class="text-white/70 text-xs mt-2 block">РћРїРёСЃР°РЅРёРµ С‚РѕРІР°СЂР° (РѕРїС†.) вЂ” СѓР»СѓС‡С€РёС‚ РїРѕРёСЃРє</label>
            <input id="calcPhotoHint" type="text" placeholder="РќР°РїСЂ. Calvin Klein zip hoodie СЃРµСЂС‹Р№ M" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-2 text-sm">
            <button id="calcPhotoSearchBtn" class="btn-primary hidden w-full transition mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РќР°Р№С‚Рё СЌС‚РѕС‚ С‚РѕРІР°СЂ</button>
          </div>

          <!-- Mode: text (search by description) -->
          <div data-calc-mode-pane="text" class="hidden">
            <label class="text-white/70 text-sm">РћРїРёСЃР°РЅРёРµ С‚РѕРІР°СЂР°</label>
            <input type="text" id="calcTextQuery" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-2" placeholder="РќР°РїСЂРёРјРµСЂ: Nike Dunk Low Panda РєСЂРѕСЃСЃРѕРІРєРё">
            <p class="text-white/40 text-xs mb-2">Р‘СЂРµРЅРґ + РјРѕРґРµР»СЊ + С†РІРµС‚ + РєР°С‚РµРіРѕСЂРёСЏ. РР СѓР»СѓС‡С€РёС‚ С„РѕСЂРјСѓР»РёСЂРѕРІРєСѓ вЂ” РїРёС€Рё РєР°Рє СѓРґРѕР±РЅРѕ.</p>
            <label class="text-white/70 text-xs mt-1 block">Р¤РѕС‚Рѕ (РѕРїС†.) вЂ” С‚РѕС‡РЅРµРµ СЂРµР·СѓР»СЊС‚Р°С‚С‹</label>
            <div id="calcTextPhotoZone" class="mt-1 mb-2 p-2 border border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:bg-white/5 transition text-xs text-white/60">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> РџСЂРёРєСЂРµРїРёС‚СЊ С„РѕС‚Рѕ (РѕРїС†.)
              <input type="file" id="calcTextPhotoInput" accept="image/*" class="hidden">
            </div>
            <div id="calcTextPhotoPreview" class="hidden mb-2"></div>
            <button id="calcTextSearchBtn" class="btn-primary w-full transition mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РќР°Р№С‚Рё С‚РѕРІР°СЂ</button>
          </div>

          <!-- Search results (shared by photo/text modes) -->
          <div id="calcSearchResults" class="hidden mb-3"></div>

          <div id="calcScreenshotWidget" class="hidden"></div>
          <label class="text-white/70 text-sm block mt-2">РќР°Р·РІР°РЅРёРµ С‚РѕРІР°СЂР°</label>
          <input type="text" id="calcTitle" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="РќР°РїСЂРёРјРµСЂ: Nike Dunk Low Panda">
          <label class="text-white/70 text-sm block mt-2">Р‘СЂРµРЅРґ <span class="text-white/40 text-xs">(РµСЃР»Рё РµСЃС‚СЊ)</span></label>
          <input type="text" id="calcBrand" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="Nike, Adidas, Stussy...">
          <label class="text-white/70 text-sm block mt-2">РџР»РѕС‰Р°РґРєР° <span class="text-white/40 text-xs">(РјР°СЂРєРµС‚РїР»РµР№СЃ)</span></label>
          <input type="text" id="calcMarketplace" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="Poizon, Zalando, Taobao...">
          <label class="text-white/70 text-sm block mt-2">РћРїРёСЃР°РЅРёРµ <span class="text-white/40 text-xs">(РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</span></label>
          <textarea id="calcDescription" rows="2" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="Р¦РІРµС‚, СЂР°Р·РјРµСЂ, РјР°С‚РµСЂРёР°Р», РѕСЃРѕР±РµРЅРЅРѕСЃС‚Рё"></textarea>

          <!-- Price & Currency вЂ” single row -->
          <div class="mb-3">
            <label class="text-white/70 text-sm block mb-1">Р¦РµРЅР° СЃ РІР°Р»СЋС‚РѕР№</label>
            <div class="flex gap-2">
              <div class="flex-1 min-w-0">
                <input type="number" id="calcPrice" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РЈРєР°Р¶РёС‚Рµ С†РµРЅСѓ С‚РѕРІР°СЂР°">
              </div>
              <div class="w-[110px] flex-shrink-0">
                <select id="calcCurrency" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" style="padding: 14px 10px !important;">
                  <option value="CNY" ${defaultCurrency === 'CNY' ? 'selected' : ''}>CNY (ВҐ)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR" ${defaultCurrency === 'EUR' ? 'selected' : ''}>EUR (в‚¬)</option>
                  <option value="GBP">GBP (ВЈ)</option>
                  <option value="PLN">PLN (zЕ‚)</option>
                  <option value="RUB" ${defaultCurrency === 'RUB' ? 'selected' : ''}>RUB (в‚Ѕ)</option>
                  <option value="BYN">BYN (Br)</option>
                </select>
              </div>
            </div>
          </div>

          <label class="text-white/70 text-sm block mt-2">РќР°РёРјРµРЅРѕРІР°РЅРёРµ (РґР»СЏ Р°РІС‚РѕРїРѕРґР±РѕСЂР° РІРµСЃР°)</label>
          <select id="calcCategory" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-1">${renderCategoryOptions()}</select>
          <p id="calcCategoryHint" class="text-cyan-400 text-[10px] hidden mb-3 font-semibold ml-1">рџ’Ў РћР±С‹С‡РЅРѕ РІРµСЃРёС‚ ~1.2 РєРі</p>
          <div class="flex justify-between items-center mt-2 mb-0.5">
            <label class="text-white/70 text-sm block">Р Р°Р·РјРµСЂ</label>
            <button type="button" class="text-xs text-cyan-400 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg hover:bg-white/10 transition" onclick="showSizeTablesModal()">
              ${ix('compare', { size: '12px' })} РўР°Р±Р»РёС†Р° СЂР°Р·РјРµСЂРѕРІ
            </button>
          </div>
          <input type="text" id="calcSize" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3" placeholder="Р Р°Р·РјРµСЂ (РЅР°РїСЂ. 42, M, L)">
          <div class="flex items-center gap-2 mb-3">
            <input type="checkbox" id="keepBox">
            <label for="keepBox" class="text-white/70 text-sm">РЎРѕС…СЂР°РЅРёС‚СЊ РѕСЂРёРіРёРЅР°Р»СЊРЅСѓСЋ РєРѕСЂРѕР±РєСѓ</label>
          </div>

          <!-- Sizing helper inputs block -->
          <div class="border border-cyan-500/20 bg-cyan-500/5 p-3 rounded-xl mb-3 text-left">
            <p class="text-cyan-400 text-xs font-bold mb-1 flex items-center gap-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 21H3L21 3v18z"/><path d="M15 15l2-2"/><path d="M11 19l2-2"/><path d="M13 13l2-2"/></svg></span> Р’РІРѕРґ Р·Р°РјРµСЂРѕРІ РґР»СЏ РР-РїРѕРґР±РѕСЂР° СЂР°Р·РјРµСЂР° (Р РµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ)</p>
            <p class="text-white/50 text-[10px] mb-2">РќР°С€ РїР°СЂС‚РЅРµСЂ РїРѕРґР±РµСЂРµС‚ СЂР°Р·РјРµСЂ РёРґРµР°Р»СЊРЅРѕ РЅР° РѕСЃРЅРѕРІРµ СЌС‚РёС… РґР°РЅРЅС‹С…</p>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-white/40 text-[9px] block">Р РѕСЃС‚ (СЃРј)</label>
                <input type="number" id="calcHeight" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg bg-white/5 text-white" placeholder="180">
              </div>
              <div>
                <label class="text-white/40 text-[9px] block">Р’РµСЃ (РєРі)</label>
                <input type="number" id="calcWeightKg" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg bg-white/5 text-white" placeholder="75">
              </div>
              <div>
                <label class="text-white/40 text-[9px] block">РЎС‚РµР»СЊРєР° (СЃРј)</label>
                <input type="number" id="calcMeasure" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg bg-white/5 text-white" placeholder="27">
              </div>
            </div>
            
            <div id="calcAiSizeAdvisorBanner" class="mt-3 p-3 rounded-xl border border-violet-500/30 bg-violet-500/10 text-xs text-white/80 hidden cursor-pointer">
              <p class="text-violet-400 font-bold flex items-center gap-1">
                <span>рџ”® РР-РЎРѕРІРµС‚РЅРёРє РїРѕ СЂР°Р·РјРµСЂСѓ</span>
              </p>
              <p class="mt-1 font-medium" id="calcAiSizeAdvisorText">Р РµРєРѕРјРµРЅРґСѓРµРј РІР°Рј СЂР°Р·РјРµСЂ ... РЅР° РѕСЃРЅРѕРІРµ РІР°С€РёС… Р·Р°РјРµСЂРѕРІ.</p>
              <p class="text-white/40 text-[9px] mt-1 leading-normal">вњЁ РќР°Р¶РјРёС‚Рµ, С‡С‚РѕР±С‹ РїСЂРёРјРµРЅРёС‚СЊ СЂРµРєРѕРјРµРЅРґРѕРІР°РЅРЅС‹Р№ СЂР°Р·РјРµСЂ</p>
            </div>
          </div>

          <label class="text-white/70 text-sm block">Р’РµСЃ С‚РѕРІР°СЂР° (РєРі)</label>
          <div class="flex items-center gap-3 mt-1 mb-4">
            <input type="range" id="calcWeight" min="0.1" max="30" step="0.1" value="1" class="flex-1 accent-cyan-500" data-packaging="0.3">
            <div class="flex items-center bg-white/10 px-2 py-1 rounded-full border border-white/20 whitespace-nowrap text-sm font-bold text-white">
              <input type="number" id="calcWeightInput" min="0.1" max="30" step="0.1" value="1.0" class="w-12 bg-transparent text-center text-white focus:outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" style="font-size: 14px; font-weight: 700; width: 44px;">
              <span class="mr-1">РєРі</span>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="text-white/70 text-sm block mb-1">РњРµС‚РѕРґ РґРѕСЃС‚Р°РІРєРё РїРѕ Р Р‘</label>
            <select id="calcDeliveryMethod" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm">
              <option value="none">Р‘РµР· РґРѕСЃС‚Р°РІРєРё РїРѕ Р Р‘ (РёР»Рё РЅРµРёР·РІРµСЃС‚РЅРѕ)</option>
              <option value="europost">Р•РІСЂРѕРїРѕС‡С‚Р°</option>
              <option value="sdek">РЎР”Р­Рљ</option>
              <option value="belpost">Р‘РµР»РїРѕС‡С‚Р°</option>
              <option value="pickup">РЎР°РјРѕРІС‹РІРѕР· (РњРёРЅСЃРє)</option>
            </select>
          </div>

          <div class="flex items-center gap-2 mt-3 mb-3">
            <input type="checkbox" id="calcInsurance">
            <label for="calcInsurance" class="text-white/70 text-sm"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></span> РЎС‚СЂР°С…РѕРІРєР° (+1.5% РѕС‚ СЃС‚РѕРёРјРѕСЃС‚Рё С‚РѕРІР°СЂР°)</label>
          </div>
          <button id="calcBtn" class="btn-primary mt-5 w-full transition"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> Р Р°СЃСЃС‡РёС‚Р°С‚СЊ</button>
          <div id="calcResult" class="mt-5 hidden">
            <div id="calcBreakdown" class="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl">
              <p class="text-white font-bold">РџСЂРёРјРµСЂРЅР°СЏ СЃС‚РѕРёРјРѕСЃС‚СЊ: <span id="totalPrice" class="font-bold text-cyan-400 text-xl">0</span> <span class="text-sm">BYN</span></p>
              <p class="text-white/70 text-xs mt-1">*РћРєРѕРЅС‡Р°С‚РµР»СЊРЅР°СЏ С†РµРЅР° РїРѕСЃР»Рµ РІР·РІРµС€РёРІР°РЅРёСЏ РЅР° СЃРєР»Р°РґРµ</p>
            </div>
            <div class="flex flex-col gap-2 mt-3">
              <button id="toNewOrderBtn" class="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span> РџРµСЂРµРЅРµСЃС‚Рё РІ Р·Р°РєР°Р·</button>
              <button id="calcShareBtn" class="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/10 active:scale-95" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border); color: #38bdf8;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                РџРѕРґРµР»РёС‚СЊСЃСЏ СЂР°СЃС‡РµС‚РѕРј
              </button>
            </div>
          </div>
        </div>
        ${renderFooter()}
      `;
    }

    async function attachCalculatorHandlers() {
  window.selectCalcCountry = (c) => {
    window.calcCountry = c;
    renderCurrentScreen();
  };

  if (!window.calcCountry) return;


  // Auto-populate user body sizes if available
  if (window.userSizing) {
    const h = document.getElementById('calcHeight');
    const w = document.getElementById('calcWeightKg');
    const m = document.getElementById('calcMeasure');
    if (h && window.userSizing.height) h.value = window.userSizing.height;
    if (w && window.userSizing.weight) w.value = window.userSizing.weight;
    if (m && window.userSizing.measure) m.value = window.userSizing.measure;
  }

  // Calc Size Advisor logic
  const updateCalcAiSizeAdvice = () => {
    const category = document.getElementById('calcCategory')?.value || '';
    const height = document.getElementById('calcHeight')?.value || '';
    const weight = document.getElementById('calcWeightKg')?.value || '';
    const measure = document.getElementById('calcMeasure')?.value || '';
    
    const advice = getAISizeRecommendation(category, height, weight, measure);
    const banner = document.getElementById('calcAiSizeAdvisorBanner');
    const textEl = document.getElementById('calcAiSizeAdvisorText');
    
    if (advice && banner && textEl) {
      banner.classList.remove('hidden');
      textEl.innerHTML = advice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    } else if (banner) {
      banner.classList.add('hidden');
    }
  };

  ['calcCategory', 'calcHeight', 'calcWeightKg', 'calcMeasure'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateCalcAiSizeAdvice);
      el.addEventListener('change', updateCalcAiSizeAdvice);
    }
  });
  
  const calcBanner = document.getElementById('calcAiSizeAdvisorBanner');
  if (calcBanner) {
    calcBanner.onclick = () => {
      const category = document.getElementById('calcCategory')?.value || '';
      const height = document.getElementById('calcHeight')?.value || '';
      const weight = document.getElementById('calcWeightKg')?.value || '';
      const measure = document.getElementById('calcMeasure')?.value || '';
      const advice = getAISizeRecommendation(category, height, weight, measure);
      if (advice) {
        const sizeMatch = advice.match(/\*\*(.*?)\*\*/);
        if (sizeMatch && sizeMatch[1]) {
          const sizeInput = document.getElementById('calcSize');
          if (sizeInput) {
            sizeInput.value = sizeMatch[1];
            tgUtil.haptic('light');
            glassToast(`Р Р°Р·РјРµСЂ ${sizeMatch[1]} РїСЂРёРјРµРЅС‘РЅ!`, { kind: 'success' });
          }
        }
      }
    };
  }

  updateCalcAiSizeAdvice();

  // РџСЂРѕРІРµСЂСЏРµРј, РµСЃС‚СЊ Р»Рё Р°РєС‚РёРІРёСЂРѕРІР°РЅРЅР°СЏ Р°РєС†РёСЏ (С‡РµСЂРµР· Р±Р°РЅРЅРµСЂ РёР»Рё СЃРѕС…СЂР°РЅС‘РЅРЅСѓСЋ)
  if (window.activePromotionId) {
    const { data: promo } = await supabaseClient.from('promotions').select('*').eq('id', window.activePromotionId).single();
    if (promo) {
      const activePromoInfo = document.getElementById('activePromoInfo');
      if (activePromoInfo) {
        activePromoInfo.classList.remove('hidden');
        document.getElementById('promoTitle').innerText = promo.title;
        document.getElementById('promoDesc').innerText = promo.description || '';
        const discountText = promo.discount_type === 'percent' 
          ? `РЎРєРёРґРєР° ${promo.discount_value}%` 
          : `РЎРєРёРґРєР° ${promo.discount_value} BYN`;
        document.getElementById('promoDiscount').innerText = discountText;
        window.currentPromotion = promo;
      }
    }
  }

  const slider = document.getElementById('calcWeight');
  const numericInput = document.getElementById('calcWeightInput');
  
  const updateWeightVal = (val, source) => {
    let num = parseFloat(val);
    if (isNaN(num)) return;
    num = Math.max(0.1, Math.min(30, num));
    
    if (source !== 'slider' && slider) slider.value = num;
    if (source !== 'input' && numericInput) numericInput.value = num.toFixed(1);
    
    // Trigger calculation auto-update if visible
    const resultBox = document.getElementById('calcResult');
    if (resultBox && !resultBox.classList.contains('hidden')) {
      doCalc();
    }
  };

  if (slider) {
    slider.oninput = () => {
      updateWeightVal(slider.value, 'slider');
    };
  }
  if (numericInput) {
    numericInput.oninput = () => {
      updateWeightVal(numericInput.value, 'input');
    };
  }
  
  // Auto-calculation on other fields too
  ['calcPrice', 'calcCurrency', 'calcCategory', 'calcInsurance', 'calcDeliveryMethod', 'keepBox'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        const resultBox = document.getElementById('calcResult');
        if (resultBox && !resultBox.classList.contains('hidden')) doCalc();
      });
      el.addEventListener('change', () => {
        const resultBox = document.getElementById('calcResult');
        if (resultBox && !resultBox.classList.contains('hidden')) doCalc();
      });
    }
  });

  async function fetchWeightFromStandard(category, size) {
    if (!category) return;
    // РЎРЅР°С‡Р°Р»Р° РїСЂРѕР±СѓРµРј РїРѕ РєРѕРЅРєСЂРµС‚РЅРѕРјСѓ РЅР°РёРјРµРЅРѕРІР°РЅРёСЋ + СЂР°Р·РјРµСЂСѓ (РґР»СЏ Р±СѓРґСѓС‰РёС… СЃС‚Р°РЅРґР°СЂС‚РѕРІ),
    // РїРѕС‚РѕРј РїРѕ С€РёСЂРѕРєРѕР№ РєР°С‚РµРіРѕСЂРёРё + СЂР°Р·РјРµСЂСѓ, Рё РЅР°РєРѕРЅРµС† вЂ” fallback РЅР° defaultWeight РёР· CATEGORY_MAP.
    const broad = getCategoryBroad(category);
    let applied = false;
    if (size) {
      try {
        for (const cat of [category, broad].filter(Boolean)) {
          const { data } = await supabaseClient
            .from('weight_standards')
            .select('weight_kg, packaging_weight_kg')
            .eq('category', cat)
            .eq('size_label', size)
            .eq('is_active', true)
            .maybeSingle();
          if (data && slider) {
            slider.value = data.weight_kg;
            slider.dataset.packaging = data.packaging_weight_kg || 0.3;
            if (valSpan) valSpan.innerText = parseFloat(data.weight_kg).toFixed(1) + ' РєРі';
            applied = true;
            break;
          }
        }
      } catch(e) { console.log('weight_standards:', e.message); }
    }
    if (!applied && slider) {
      const dw = getCategoryDefaultWeight(category);
      if (dw && (!slider.value || parseFloat(slider.value) === 1)) {
        slider.value = dw;
        if (valSpan) valSpan.innerText = dw.toFixed(1) + ' РєРі';
      }
    }
  }

  const calcCategory = document.getElementById('calcCategory');
  const calcSizeInput = document.getElementById('calcSize');
  const keepBox = document.getElementById('keepBox');
  if (calcCategory) calcCategory.addEventListener('change', () => {
    fetchWeightFromStandard(calcCategory.value, calcSizeInput?.value);
    if (window.updateCategoryHint) window.updateCategoryHint('calcCategory', 'calcCategoryHint');
  });
  if (calcSizeInput) calcSizeInput.onchange = () => fetchWeightFromStandard(calcCategory?.value, calcSizeInput.value);
  if (keepBox && slider) {
    keepBox.onchange = () => {
      const base = parseFloat(slider.value) || 0;
      const pkg = parseFloat(slider.dataset.packaging || 0.3);
      const newW = keepBox.checked
        ? Math.min(30, +(base + pkg).toFixed(1))
        : Math.max(0.1, +(base - pkg).toFixed(1));
      slider.value = newW;
      if (valSpan) valSpan.innerText = newW.toFixed(1) + ' РєРі';
    };
  }

  const calcBtn = document.getElementById('calcBtn');
  if (calcBtn) calcBtn.onclick = async () => {
    tgUtil.haptic('medium');
    const limitCheck = await checkAndUpdateLimit();
    if (!limitCheck.allowed) {
      tgUtil.haptic('warning');
      tgUtil.alert(`Р’С‹ РёСЃС‡РµСЂРїР°Р»Рё Р»РёРјРёС‚ Р±РµСЃРїР»Р°С‚РЅС‹С… СЂР°СЃС‡С‘С‚РѕРІ (${limitCheck.currentCount}/${limitCheck.maxRequests}). РћС„РѕСЂРјРёС‚Рµ Р·Р°РєР°Р·, С‡С‚РѕР±С‹ РїСЂРѕРґРѕР»Р¶РёС‚СЊ.`);
      return;
    }

    
    // РЈРІРµР»РёС‡РёРІР°РµРј СЃС‡С‘С‚С‡РёРє
    if (userId) {
      const newCount = limitCheck.currentCount + 1;
      await supabaseClient.from('users').update({ daily_requests_count: newCount, last_request_date: new Date().toISOString() }).eq('user_id', userId);
      userLimits.dailyCount = newCount;
    } else {
      const guestKey = 'ice_guest_requests';
      let guestData = JSON.parse(localStorage.getItem(guestKey) || '{"count":0,"date":""}');
      const today = new Date().toDateString();
      if (guestData.date !== today) guestData = { count: 0, date: today };
      guestData.count++;
      localStorage.setItem(guestKey, JSON.stringify(guestData));
    }
    
    // РџСЂРѕРІРµСЂРєР° РєСЌС€Р° parsed_products
    const urlValue = document.getElementById('calcUrl')?.value.trim();
    if (urlValue) {
      try {
        const { data: cached } = await supabaseClient
          .from('parsed_products')
          .select('*')
          .eq('url', urlValue)
          .gte('expires_at', new Date().toISOString())
          .maybeSingle();
        if (cached) {
          if (cached.price) document.getElementById('calcPrice').value = cached.price;
          if (cached.weight_kg && slider) {
            slider.value = cached.weight_kg;
            if (valSpan) valSpan.innerText = parseFloat(cached.weight_kg).toFixed(1) + ' РєРі';
          }
          const titleInp = document.getElementById('calcTitle');
          if (titleInp && cached.title && !titleInp.value) titleInp.value = cached.title;
        } else if (urlValue.startsWith('http')) {
          tgUtil.alert('РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРёР№ РїР°СЂСЃРёРЅРі РїРѕРєР° РЅРµРґРѕСЃС‚СѓРїРµРЅ. Р’РІРµРґРёС‚Рµ РґР°РЅРЅС‹Рµ РІСЂСѓС‡РЅСѓСЋ.');
        }
      } catch(e) { console.log('parsed_products cache:', e.message); }
    }

    const price = parseFloat(document.getElementById('calcPrice')?.value) || 0;
    const weight = parseFloat(slider?.value || 1);
    const currency = document.getElementById('calcCurrency')?.value || 'CNY';
    const country = window.calcCountry || 'CN';
    const category = document.getElementById('calcCategory')?.value || '';
    const insurance = document.getElementById('calcInsurance')?.checked || false;
    const legitCheck = false;

    // РџСЂРѕРјРѕ/Р°РєС†РёСЏ: СЃС‡РёС‚Р°РµРј СЃРєРёРґРєСѓ РґРѕ РІС‹Р·РѕРІР° РґРІРёР¶РєР°, Р·Р°С‚РµРј РїРµСЂРµРґР°С‘Рј РєР°Рє extra_discount_byn
    let promotionId = null;
    let promoExtraDiscount = 0;
    if (window.currentPromotion) {
      const promo = window.currentPromotion;
      const roughTotal = window.iceLogixPricing.quickEstimate(price, weight, currency, country);
      if (roughTotal >= (promo.min_order_amount || 0)) {
        promoExtraDiscount = promo.discount_type === 'percent'
          ? roughTotal * (promo.discount_value / 100)
          : Math.min(promo.discount_value, roughTotal);
        promotionId = promo.id;
      }
    }

    const result = await window.iceLogixPricing.calculatePrice({
      product_price: price,
      product_currency: currency || 'CNY',
      source_country: country,
      weight_kg: weight,
      category,
      insurance,
      local_delivery_method: document.getElementById('calcDeliveryMethod')?.value && document.getElementById('calcDeliveryMethod').value !== 'none' ? document.getElementById('calcDeliveryMethod').value : null,
      legit_check: legitCheck,
      client_level: window.userLevel || 'newbie',
      is_first_order: !!window.userIsFirstOrder,
      referral_used: !!window.referralCode,
      extra_discount_byn: promoExtraDiscount,
    });

    const breakdownEl = document.getElementById('calcBreakdown');
    const resultEl = document.getElementById('calcResult');
    const toOrderBtn = document.getElementById('toNewOrderBtn');

    if (!result.available) {
      if (breakdownEl) breakdownEl.innerHTML = window.iceLogixPricing.formatBreakdownHTML(result);
      if (resultEl) resultEl.classList.remove('hidden');
      if (toOrderBtn) toOrderBtn.classList.add('hidden');
      window.tempOrder = null;
      tgUtil.haptic('warning');
      return;
    }

    if (breakdownEl) {
      const baseBreakdown = window.iceLogixPricing.formatBreakdownHTML(result);
      const minskMallPrice = (result.breakdown.product_cost_byn + result.breakdown.commission_byn) * 1.7;
      const savings = minskMallPrice - result.total_byn;
      const savingsPercent = ((savings / minskMallPrice) * 100).toFixed(0);
      
      const comparisonHtml = `
        <div class="mt-3 p-3.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-xs space-y-2">
          <p class="text-yellow-400 font-bold flex items-center gap-1.5">
            ${ix('trending-up', { size: '14px' })}
            <span>Р’С‹РіРѕРґР° Р·Р°РєР°Р·Р° РІ ICE LOGIX</span>
          </p>
          <div class="grid grid-cols-2 gap-2 text-[11px] leading-relaxed">
            <div class="bg-white/5 p-2 rounded-lg">
              <span class="text-white/40 block">Р’ РўР¦ РњРёРЅСЃРєР°:</span>
              <span class="text-red-400 font-bold line-through font-mono text-sm">${minskMallPrice.toFixed(0)} BYN</span>
            </div>
            <div class="bg-white/5 p-2 rounded-lg border border-cyan-500/20">
              <span class="text-cyan-400/60 block font-bold">РќР°С€Р° С†РµРЅР°:</span>
              <span class="text-cyan-400 font-extrabold font-mono text-sm">${result.total_byn.toFixed(2)} BYN</span>
            </div>
          </div>
          <p class="text-white/80 font-medium text-[11px] text-center pt-1 border-t border-white/5">
            рџ”Ґ Р’Р°С€Р° С‡РёСЃС‚Р°СЏ СЌРєРѕРЅРѕРјРёСЏ: <strong class="text-green-400 font-bold font-mono text-xs">${savings.toFixed(0)} BYN (${savingsPercent}%)</strong>!
          </p>
        </div>
      `;
      breakdownEl.innerHTML = baseBreakdown + comparisonHtml;
    }
    if (resultEl) resultEl.classList.remove('hidden');
    if (toOrderBtn) toOrderBtn.classList.remove('hidden');
    tgUtil.haptic('success');

    const totalPriceEl = document.getElementById('totalPrice');
    if (totalPriceEl) totalPriceEl.innerText = result.total_byn.toFixed(2);

    window.tempOrder = {
      url: document.getElementById('calcUrl')?.value || '',
      price, weight,
      currency, country, category,
      insurance,
      total: result.total_byn,
      total_byn: result.total_byn,
      total_ice: result.total_ice,
      breakdown: result.breakdown,
      deliveryDays: result.delivery_days,
      finalTotal: result.total_byn,
      discountAmount: promoExtraDiscount,
      promotionId,
    };
    
    const shareBtn = document.getElementById('calcShareBtn');
    if (shareBtn) {
      shareBtn.onclick = () => {
        const title = document.getElementById('calcTitle')?.value || category || 'РўРѕРІР°СЂ';
        const msg = `рџ”Ґ *${title}*
Р¦РµРЅР° СЃ РґРѕСЃС‚Р°РІРєРѕР№: *${result.total_byn.toFixed(2)} BYN*
        
РЎС‡РёС‚Р°Р» С‡РµСЂРµР· ICE LOGIX! Р—Р°РєР°Р·С‹РІР°РµРј РІРјРµСЃС‚Рµ?`;
        const botUsername = tg.initDataUnsafe?.user?.username || 'icelogix_bot'; // or use the known bot name
        const shareUrl = `https://t.me/share/url?url=https://t.me/icelogix_bot/app&text=${encodeURIComponent(msg)}`;
        tgUtil.openTelegramLink(shareUrl);
      };
    }
  };
  
  const calcPasteBtn = document.getElementById('calcPasteBtn');
  const analyzeBtn = document.getElementById('analyzeLinkBtn');
  if (calcPasteBtn) {
    calcPasteBtn.onclick = async () => {
      tgUtil.haptic('light');
      try {
        const text = await navigator.clipboard.readText();
        const cleaned = text?.trim();
        if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.includes('dewu.com') || cleaned.includes('taobao.com') || cleaned.includes('1688.com') || cleaned.includes('poizon') || cleaned.includes('zalando') || cleaned.includes('vinted'))) {
          const inp = document.getElementById('calcUrl');
          if (inp) {
            inp.value = cleaned;
            glassToast('РЎСЃС‹Р»РєР° СѓСЃРїРµС€РЅРѕ РІСЃС‚Р°РІР»РµРЅР°!', { kind: 'success' });
            if (analyzeBtn) analyzeBtn.click();
          }
        } else if (cleaned) {
          const inp = document.getElementById('calcUrl');
          if (inp) inp.value = cleaned;
          glassToast('РўРµРєСЃС‚ РІСЃС‚Р°РІР»РµРЅ! РџСЂРѕРІРµСЂСЊС‚Рµ С„РѕСЂРјР°С‚ СЃСЃС‹Р»РєРё.', { kind: 'info' });
        } else {
          glassToast('Р‘СѓС„РµСЂ РѕР±РјРµРЅР° РїСѓСЃС‚!', { kind: 'info' });
        }
      } catch (err) {
        console.error('Clipboard paste failed:', err);
        glassToast('РќРµС‚ РґРѕСЃС‚СѓРїР° Рє Р±СѓС„РµСЂСѓ. Р’СЃС‚Р°РІСЊС‚Рµ РІСЂСѓС‡РЅСѓСЋ.', { kind: 'error' });
      }
    };
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      tgUtil.haptic('medium');
      const urlInput = document.getElementById('calcUrl');
      const url = urlInput?.value.trim();
      if (!url) { tgUtil.haptic('warning'); tgUtil.alert('Р’СЃС‚Р°РІСЊС‚Рµ СЃСЃС‹Р»РєСѓ'); return; }

      const limitCheck = await checkAndUpdateLimit();
      if (!limitCheck.allowed) {
        tgUtil.haptic('warning');
        tgUtil.alert(`Р›РёРјРёС‚ РёСЃС‡РµСЂРїР°РЅ (${limitCheck.currentCount}/${limitCheck.maxRequests}).`);
        return;
      }

      const originalText = analyzeBtn.innerText;
      analyzeBtn.innerHTML = isHardDomain(url) ? '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РћР±С…РѕРґРёРј Р·Р°С‰РёС‚СѓвЂ¦' : '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РђРЅР°Р»РёР·...';
      analyzeBtn.disabled = true;

      try {
        const { data: queueData, error: insErr } = await supabaseClient
          .from('parse_queue')
          .insert({ user_id: userId, url, status: 'pending' })
          .select('id')
          .single();
        if (insErr) throw new Error('РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ Р·Р°РґР°С‡Рё: ' + insErr.message);

        const taskId = queueData.id;
        let result = null;
        let manualRequired = false;

        if (isHardDomain(url)) console.log('Hard domain detected:', url);
        const maxIterations = isHardDomain(url) ? 90 : 75;
        for (let i = 0; i < maxIterations; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const { data: checkData } = await supabaseClient
            .from('parse_queue')
            .select('status, price, title, weight_kg, currency, country, category, description, color, brand, marketplace_name, error_message, parse_method, screenshot_path, image_url')
            .eq('id', taskId)
            .single();

          if (checkData?.status === 'done') { result = checkData; break; }
          if (checkData?.status === 'manual_required') {
            manualRequired = true;
            // Fill any partial data that came back
            if (checkData.weight_kg != null) {
              const slider = document.getElementById('calcWeight');
              const valSpan = document.getElementById('weightVal');
              if (slider) slider.value = checkData.weight_kg;
              if (valSpan) valSpan.innerText = parseFloat(checkData.weight_kg).toFixed(1) + ' РєРі';
            }
            if (checkData.category) {
              const categorySelect = document.getElementById('calcCategory');
              if (categorySelect) {
                const opt = findCategoryOption(categorySelect, checkData.category);
                if (opt) { categorySelect.value = opt.value; categorySelect.dispatchEvent(new Event('change')); }
              }
            }
            showScreenshotWidget(taskId, checkData, 'calc');
            break;
          }
          if (checkData?.status === 'error') {
            throw new Error(checkData.error_message || 'РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР°');
          }
        }

        if (!result && !manualRequired) throw new Error('РўР°Р№РјР°СѓС‚ РѕР¶РёРґР°РЅРёСЏ РїР°СЂСЃРёРЅРіР°');
        if (manualRequired) return;

        const calcPriceEl = document.getElementById('calcPrice');
        if (calcPriceEl) {
          if (result.price != null && result.price !== '' && Number(result.price) > 0) {
            calcPriceEl.value = result.price;
          } else {
            calcPriceEl.value = '';
          }
        }
        if (result.weight_kg != null) {
          const slider = document.getElementById('calcWeight');
          const valSpan = document.getElementById('weightVal');
          if (slider) slider.value = result.weight_kg;
          if (valSpan) valSpan.innerText = parseFloat(result.weight_kg).toFixed(1) + ' РєРі';
        }
        if (result.currency) {
          const currencySelect = document.getElementById('calcCurrency');
          if (currencySelect) {
            const option = Array.from(currencySelect.options).find(opt => opt.value === result.currency);
            if (option) currencySelect.value = result.currency;
          }
        }
        if (result.category) {
          const categorySelect = document.getElementById('calcCategory');
          if (categorySelect) {
            const option = findCategoryOption(categorySelect, result.category);
            if (option) {
              categorySelect.value = option.value;
              categorySelect.dispatchEvent(new Event('change'));
            }
          }
        }
        
        const currencySymbols = { GBP: 'ВЈ', USD: '$', EUR: 'в‚¬', CNY: 'ВҐ', RUB: 'в‚Ѕ', BYN: 'Br' };
        const currLabel = document.getElementById('calcPriceCurrency');
        if (currLabel) {
          currLabel.innerText = (result.currency && currencySymbols[result.currency]) || result.currency || 'ВҐ';
        }
        // Р—Р°РїРѕР»РЅСЏРµРј СЂРµРґР°РєС‚РёСЂСѓРµРјС‹Рµ РїРѕР»СЏ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂР° (Р±РµР· РїРµСЂРµР·Р°РїРёСЃРё РІРІРµРґС‘РЅРЅРѕРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј)
        const setIfEmpty = (id, val) => {
          const el = document.getElementById(id);
          if (el && val && (!el.value || el.value.trim() === '')) el.value = val;
        };
        setIfEmpty('calcTitle', result.title);
        setIfEmpty('calcBrand', result.brand);
        setIfEmpty('calcMarketplace', result.marketplace_name);
        const descParts = [];
        if (result.description) descParts.push(result.description);
        if (result.color) descParts.push('Р¦РІРµС‚: ' + result.color);
        if (descParts.length) setIfEmpty('calcDescription', descParts.join(' В· '));

        // Р›РёРјРёС‚С‹
        if (userId) {
          const newCount = limitCheck.currentCount + 1;
          await supabaseClient.from('users').update({ daily_requests_count: newCount, last_request_date: new Date().toISOString() }).eq('user_id', userId);
          userLimits.dailyCount = newCount;
        }

        analyzeBtn.classList.add('bg-green-500');
        setTimeout(() => analyzeBtn.classList.remove('bg-green-500'), 1000);
        tgUtil.haptic('success');

      } catch (err) {
        analyzeBtn.classList.add('bg-red-500');
        setTimeout(() => analyzeBtn.classList.remove('bg-red-500'), 2000);
        tgUtil.haptic('error');
        tgUtil.alert('вќЊ ' + (err && err.message ? err.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕР°РЅР°Р»РёР·РёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РІРІРµСЃС‚Рё РґР°РЅРЅС‹Рµ РІСЂСѓС‡РЅСѓСЋ.'));
      } finally {
        analyzeBtn.innerText = originalText;
        analyzeBtn.disabled = false;
      }
    });
  }

  const toNewOrderBtn = document.getElementById('toNewOrderBtn');
  if (toNewOrderBtn) toNewOrderBtn.onclick = () => { 
    const price = parseFloat(document.getElementById('calcPrice')?.value) || 0;
    const weight = parseFloat(document.getElementById('calcWeight')?.value) || 1;
    const currency = document.getElementById('calcCurrency')?.value || 'CNY';
    const category = document.getElementById('calcCategory')?.value || '';
    const insurance = document.getElementById('calcInsurance')?.checked || false;
    const legitCheck = false;
    const title = document.getElementById('calcTitle')?.value || '';
    const brand = document.getElementById('calcBrand')?.value || '';
    const marketplace = document.getElementById('calcMarketplace')?.value || '';
    const desc = document.getElementById('calcDescription')?.value || '';
    const size = document.getElementById('calcSize')?.value || '';
    const url = document.getElementById('calcUrl')?.value || '';

    let promotionId = null;
    let promoExtraDiscount = 0;
    if (window.currentPromotion) {
      const roughTotal = window.iceLogixPricing.quickEstimate(price, weight, currency, window.calcCountry);
      if (roughTotal >= (window.currentPromotion.min_order_amount || 0)) {
        promoExtraDiscount = window.currentPromotion.discount_type === 'percent'
          ? roughTotal * (window.currentPromotion.discount_value / 100)
          : Math.min(window.currentPromotion.discount_value, roughTotal);
        promotionId = window.currentPromotion.id;
      }
    }

    const calcObj = {
      price, weight, currency, category, insurance,
      title, brand, marketplace_name: marketplace,
      description: desc, size, url,
      promotion_id: promotionId,
      extra_discount_byn: promoExtraDiscount
    };
    
    // Switch to new order and pass this data
    window.orderCountry = window.calcCountry;
    window.startOrderAddMode = window.startOrderAddMode || function() {}; 
    window.orderAddMode = true;
    window.orderAddSubMode = 'manual';
    
    // Provide an event listener after render to populate it
    setTimeout(() => {
      if (document.getElementById('orderPrice')) document.getElementById('orderPrice').value = price;
      if (document.getElementById('orderWeight')) document.getElementById('orderWeight').value = weight;
      if (document.getElementById('orderCurrency')) document.getElementById('orderCurrency').value = currency;
      if (document.getElementById('orderCategory')) document.getElementById('orderCategory').value = category;
      if (document.getElementById('orderTitle')) document.getElementById('orderTitle').value = title;
      if (document.getElementById('orderBrand')) document.getElementById('orderBrand').value = brand;
      if (document.getElementById('orderSize')) document.getElementById('orderSize').value = size;
      if (document.getElementById('orderUrl')) document.getElementById('orderUrl').value = url;
    }, 100);
    
    switchTab('neworder');
  };



  // ==================== Р Р•Р–РРњР« Р’Р’РћР”Рђ Р’ РљРђР›Р¬РљРЈР›РЇРўРћР Р• (link/manual/photo/text) ====================
  const calcModeSelector = document.getElementById('calcModeSelector');
  const calcPanes = document.querySelectorAll('[data-calc-mode-pane]');
  const calcResultsBox = document.getElementById('calcSearchResults');

  function setCalcMode(mode) {
    document.querySelectorAll('.calc-mode-btn').forEach((btn) => {
      if (btn.dataset.calcMode === mode) {
        btn.classList.remove('bg-white/10', 'hover:bg-white/20');
        btn.classList.add('bg-cyan-500');
      } else {
        btn.classList.add('bg-white/10', 'hover:bg-white/20');
        btn.classList.remove('bg-cyan-500');
      }
    });
    calcPanes.forEach((pane) => {
      const allowed = (pane.dataset.calcModePane || '').split(/\s+/).filter(Boolean);
      if (allowed.includes(mode)) pane.classList.remove('hidden');
      else pane.classList.add('hidden');
    });
    if ((mode === 'manual' || mode === 'link') && calcResultsBox) {
      calcResultsBox.classList.add('hidden');
      calcResultsBox.innerHTML = '';
      if (typeof tgUtil !== 'undefined') {
        tgUtil.hideMainButton();
        tgUtil.setBackButton(null);
      }
      if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }
  }
  if (calcModeSelector) {
    calcModeSelector.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.calc-mode-btn');
      if (!btn) return;
      setCalcMode(btn.dataset.calcMode);
    });
  }

  // ---- Sanitization helpers (XSS) вЂ” С‚Рµ Р¶Рµ С‡С‚Рѕ Рё РІ attachOrderForm ----
  const _ESC_MAP_C = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };
  function escHtmlC(s) { return String(s == null ? '' : s).replace(/[&<>"'\/]/g, (c) => _ESC_MAP_C[c]); }
  function safeUrlC(u) {
    const s = String(u || '').trim();
    if (!s) return '';
    try {
      const parsed = new URL(s);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch { /* not a valid URL */ }
    return '';
  }

  function renderCalcSearchResults(payload) {
    if (!calcResultsBox) return;
    const updateCalc = () => { if(document.getElementById('calcResult').classList.contains('hidden')) return; doCalc(); };
        document.getElementById('calcPrice').addEventListener('input', updateCalc);
        document.getElementById('calcCurrency').addEventListener('change', updateCalc);
        document.getElementById('calcCategory').addEventListener('change', updateCalc);
        document.getElementById('calcWeight').addEventListener('input', updateCalc);
        document.getElementById('calcInsurance').addEventListener('change', updateCalc);
        document.getElementById('calcDeliveryMethod')?.addEventListener('change', updateCalc);
        document.getElementById('keepBox')?.addEventListener('change', updateCalc);
        document.getElementById('calcBtn').addEventListener('click', doCalc);
    const list = (payload && payload.results) || [];
    if (list.length === 0) {
      calcResultsBox.classList.remove('hidden');
      const errPlatforms = (payload?.errors || []).map((e) => escHtmlC(e.platform)).join(', ');
      calcResultsBox.innerHTML = `
        <div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80">
          <span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> РќРёС‡РµРіРѕ РЅРµ РЅР°С€Р»Рё. РџРѕРїСЂРѕР±СѓР№С‚Рµ СѓС‚РѕС‡РЅРёС‚СЊ Р·Р°РїСЂРѕСЃ РёР»Рё РґСЂСѓРіРѕР№ СЂРµР¶РёРј.
          ${errPlatforms ? '<br><span class="text-xs text-white/50">РџР»РѕС‰Р°РґРєРё СЃ РѕС€РёР±РєР°РјРё: ' + errPlatforms + '</span>' : ''}
        </div>`;
      return;
    }
    const cards = list.map((r, i) => {
      const priceNum = (typeof r.price === 'number' && isFinite(r.price)) ? r.price : null;
      const currency = typeof r.currency === 'string' ? escHtmlC(r.currency) : '';
      const priceLine = (priceNum && currency)
        ? `<div class="text-cyan-400 font-bold text-sm mt-1">${escHtmlC(priceNum)} ${currency}</div>`
        : '<div class="text-white/40 text-xs mt-1">Р¦РµРЅР° РЅРµ РѕРїСЂРµРґРµР»РµРЅР°</div>';
      const safeImg = safeUrlC(r.image_url);
      const img = safeImg
        ? `<img src="${escHtmlC(safeImg)}" class="w-16 h-16 object-cover rounded-lg flex-shrink-0" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
        : '<div class="w-16 h-16 bg-white/10 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span></div>';
      const safeHref = safeUrlC(r.url);
      const titleEsc = escHtmlC(r.title || '(Р±РµР· РЅР°Р·РІР°РЅРёСЏ)');
      const platformLabel = escHtmlC(r.platform_label || r.platform || '');
      const flag = escHtmlC(r.flag || '');
      return `
        <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3" data-calc-result-idx="${i}">
          ${img}
          <div class="flex-1 min-w-0">
            <div class="text-xs text-white/60 mb-1">${flag} ${platformLabel}</div>
            <div class="text-sm font-semibold text-white truncate" title="${titleEsc}">${titleEsc}</div>
            ${priceLine}
            <div class="flex gap-2 mt-2">
              <button data-calc-result-pick="${i}" class="btn-primary"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РСЃРїРѕР»СЊР·РѕРІР°С‚СЊ</button>
              ${safeHref ? `<a href="${escHtmlC(safeHref)}" target="_blank" rel="noopener noreferrer" class="btn-secondary bg-white/10 hover: font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span> РћС‚РєСЂС‹С‚СЊ</a>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
    const sourceLabel = payload.source === 'apify' || payload.source === 'apify+search-products'
      ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Google Lens'
      : (payload.source === 'vision-fallback' ? '<span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg></span> AI СЂР°СЃРїРѕР·РЅР°Р»' : null);
    const queryText = payload.query || payload.vision_query;
    const queryLine = (queryText && sourceLabel)
      ? `<div class="text-xs text-white/50 mb-2">${sourceLabel}: <span class="text-cyan-300">"${escHtmlC(queryText)}"</span></div>`
      : '';
    const replicaBanner = payload.authenticity_tier === 'replica' 
      ? `<div class="bg-orange-500/20 border border-orange-500/50 text-orange-400 p-2 rounded-lg text-xs font-bold mb-3 flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span> рџ”Ќ РќР°Р№РґРµРЅС‹ СЂРµРїР»РёРєРё</div>` 
      : '';
    const platformsCount = Array.isArray(payload.platforms) ? payload.platforms.length : 0;
    calcResultsBox.classList.remove('hidden');
    calcResultsBox.innerHTML = `
      <div class="text-white/70 text-xs mb-2 mt-2">РќР°Р№РґРµРЅРѕ ${list.length} СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ РЅР° ${platformsCount} РїР»РѕС‰Р°РґРєР°С…:</div>
      ${queryLine}
      ${replicaBanner}
      <div class="flex flex-col gap-2">${cards}</div>`;
    calcResultsBox.querySelectorAll('[data-calc-result-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.calcResultPick, 10);
        const picked = list[idx];
        if (!picked) return;
        const cleanedUrl = safeUrlC(picked.url);
        if (!cleanedUrl) return;
        setCalcMode('link');
        const urlEl = document.getElementById('calcUrl');
        if (urlEl) urlEl.value = cleanedUrl;
        if (picked.price) {
          const priceEl = document.getElementById('calcPrice');
          if (priceEl) priceEl.value = picked.price;
        }
        if (picked.currency) {
          const sel = document.getElementById('calcCurrency');
          if (sel) {
            const opt = Array.from(sel.options).find((o) => o.value === picked.currency);
            if (opt) sel.value = picked.currency;
          }
          const lbl = document.getElementById('calcPriceCurrency');
          const curSym = { GBP: 'ВЈ', USD: '$', EUR: 'в‚¬', CNY: 'ВҐ', RUB: 'в‚Ѕ', BYN: 'Br' };
          if (lbl) lbl.innerText = curSym[picked.currency] || picked.currency;
        }
        if (picked.title) {
          const titleInp = document.getElementById('calcTitle');
          if (titleInp && !titleInp.value) titleInp.value = picked.title;
        }
        if (picked.platform_label) {
          const mpInp = document.getElementById('calcMarketplace');
          if (mpInp && !mpInp.value) mpInp.value = picked.platform_label;
        }
        // Р—Р°РїСѓСЃРєР°РµРј СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ РїР°СЂСЃРµСЂ РґР»СЏ СѓС‚РѕС‡РЅРµРЅРёСЏ РІРµСЃР°/РєР°С‚РµРіРѕСЂРёРё/РѕРїРёСЃР°РЅРёСЏ
        const aBtn = document.getElementById('analyzeLinkBtn');
        if (aBtn) aBtn.click();
      });
    });
  }

  // ---- Mode: photo (search-by-image) ----
  const calcPhotoZone = document.getElementById('calcPhotoUploadZone');
  const calcPhotoInput = document.getElementById('calcPhotoInput');
  const calcPhotoPreview = document.getElementById('calcPhotoPreview');
  const calcPhotoSearchBtn = document.getElementById('calcPhotoSearchBtn');
  const calcPhotoHint = document.getElementById('calcPhotoHint');
  const calcPhotoFiles = []; // multi-photo (РґРѕ 5)
  function renderCalcPhotoPreviews() {
    if (!calcPhotoPreview) return;
    if (calcPhotoFiles.length === 0) {
      calcPhotoPreview.classList.add('hidden');
      calcPhotoPreview.innerHTML = '';
      if (calcPhotoSearchBtn) calcPhotoSearchBtn.classList.add('hidden');
      return;
    }
    calcPhotoPreview.classList.remove('hidden');
    calcPhotoPreview.innerHTML = calcPhotoFiles.map((f, i) =>
      `<div class="relative">
        <img src="${trackBlobUrl('calc:photo:' + i, f)}" class="rounded-xl w-full h-24 object-cover">
        <button type="button" data-rm-calc-photo="${i}" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">Г—</button>
      </div>`).join('');
    if (calcPhotoSearchBtn) calcPhotoSearchBtn.classList.remove('hidden');
    calcPhotoPreview.querySelectorAll('[data-rm-calc-photo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.rmCalcPhoto, 10);
        calcPhotoFiles.splice(i, 1);
        renderCalcPhotoPreviews();
      });
    });
  }
  if (calcPhotoZone && calcPhotoInput) {
    calcPhotoZone.addEventListener('click', () => calcPhotoInput.click());
    calcPhotoZone.addEventListener('dragover', (ev) => { ev.preventDefault(); calcPhotoZone.classList.add('bg-white/10'); });
    calcPhotoZone.addEventListener('dragleave', () => calcPhotoZone.classList.remove('bg-white/10'));
    calcPhotoZone.addEventListener('drop', (ev) => {
      ev.preventDefault();
      calcPhotoZone.classList.remove('bg-white/10');
      handleCalcPhotoFiles(ev.dataTransfer?.files);
    });
    calcPhotoInput.addEventListener('change', () => handleCalcPhotoFiles(calcPhotoInput.files));
  }
  function handleCalcPhotoFiles(files) {
    if (!files || !files.length) return;
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 10 * 1024 * 1024) { tgUtil.alert(`${f.name}: Р±РѕР»СЊС€Рµ 10 РњР‘`); continue; }
      if (calcPhotoFiles.length >= 5) { tgUtil.alert('РњРѕР¶РЅРѕ Р·Р°РіСЂСѓР·РёС‚СЊ РјР°РєСЃРёРјСѓРј 5 С„РѕС‚Рѕ'); break; }
      calcPhotoFiles.push(f);
    }
    renderCalcPhotoPreviews();
  }
  if (calcPhotoSearchBtn) {
    calcPhotoSearchBtn.addEventListener('click', async () => {
      if (calcPhotoFiles.length === 0) return;
      if (!supabaseClient) { tgUtil.alert('Р‘Р°Р·Р° РґР°РЅРЅС‹С… РЅРµРґРѕСЃС‚СѓРїРЅР°'); return; }
      const original = calcPhotoSearchBtn.innerText;
      calcPhotoSearchBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р—Р°РіСЂСѓР¶Р°СЋ С„РѕС‚РѕвЂ¦';
      calcPhotoSearchBtn.disabled = true;
      if (calcResultsBox) {
        calcResultsBox.classList.remove('hidden');
        calcResultsBox.innerHTML = '<div class="text-white/60 text-sm py-2"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р Р°СЃРїРѕР·РЅР°С‘Рј С‚РѕРІР°СЂ РЅР° С„РѕС‚Рѕ Рё РёС‰РµРј РЅР° РїР»РѕС‰Р°РґРєР°С…вЂ¦</div>';
      }
      try {
        let sessionId = localStorage.getItem('icelogix_session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem('icelogix_session_id', sessionId);
        }
        // Р—Р°РіСЂСѓР¶Р°РµРј РІСЃРµ С„РѕС‚Рѕ РїР°СЂР°Р»Р»РµР»СЊРЅРѕ, РїРµСЂРµРґР°С‘Рј РїРµСЂРІРѕРµ (Apify Lens СЂР°Р±РѕС‚Р°РµС‚ СЃ РѕРґРЅРёРј) + СЃРїРёСЃРѕРє РІСЃРµС…
        const paths = await Promise.all(calcPhotoFiles.map(async (f) => {
          const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
          const path = `${sessionId}/${Date.now()}_search_${safeName}`;
          const { error: upErr } = await supabaseClient.storage
            .from('product-screenshots')
            .upload(path, f, { contentType: f.type, upsert: false });
          if (upErr) throw new Error('Р—Р°РіСЂСѓР·РєР°: ' + upErr.message);
          return path;
        }));
        calcPhotoSearchBtn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РС‰РµРј РЅР° РїР»РѕС‰Р°РґРєР°С…вЂ¦';
        const { data, error } = await supabaseClient.functions.invoke('search-by-image', {
          body: {
            screenshotPath: paths[0],
            screenshotPaths: paths,
            descriptionHint: (calcPhotoHint?.value || '').trim() || null,
          },
        });
        if (error) throw new Error(error.message);
        if (!data?.ok) throw new Error(data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р№С‚Рё');
        renderCalcSearchResults(data);
      } catch (e) {
        if (calcResultsBox) {
          calcResultsBox.classList.remove('hidden');
          calcResultsBox.innerHTML = `<div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${escHtmlC(e.message)}</div>`;
        }
      } finally {
        calcPhotoSearchBtn.innerText = original;
        calcPhotoSearchBtn.disabled = false;
      }
    });
  }

  // ---- Mode: text (search-products by description, optional photo) ----
  const calcTextInput = document.getElementById('calcTextQuery');
  const calcTextSearchBtn = document.getElementById('calcTextSearchBtn');
  const calcTextPhotoZone = document.getElementById('calcTextPhotoZone');
  const calcTextPhotoInput = document.getElementById('calcTextPhotoInput');
  const calcTextPhotoPreview = document.getElementById('calcTextPhotoPreview');
  let calcTextPhotoFile = null;
  if (calcTextPhotoZone && calcTextPhotoInput) {
    calcTextPhotoZone.addEventListener('click', () => calcTextPhotoInput.click());
    calcTextPhotoInput.addEventListener('change', () => {
      const f = calcTextPhotoInput.files?.[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) { tgUtil.alert('РўРѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ'); return; }
      if (f.size > 10 * 1024 * 1024) { tgUtil.alert('Р¤Р°Р№Р» Р±РѕР»СЊС€Рµ 10 РњР‘'); return; }
      calcTextPhotoFile = f;
      if (calcTextPhotoPreview) {
        calcTextPhotoPreview.classList.remove('hidden');
        calcTextPhotoPreview.innerHTML =
          `<div class="relative inline-block">
            <img src="${trackBlobUrl('calc:textphoto', f)}" class="rounded-xl max-h-32 object-contain">
            <button type="button" id="calcTextPhotoRemove" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">Г—</button>
          </div>`;
        document.getElementById('calcTextPhotoRemove')?.addEventListener('click', () => {
          calcTextPhotoFile = null;
          calcTextPhotoPreview.classList.add('hidden');
          calcTextPhotoPreview.innerHTML = '';
          calcTextPhotoInput.value = '';
        });
      }
    });
  }
  if (calcTextSearchBtn && calcTextInput) {
    const runCalcTextSearch = async () => {
      const q = (calcTextInput.value || '').trim();
      if (q.length < 3) { tgUtil.alert('РњРёРЅРёРјСѓРј 3 СЃРёРјРІРѕР»Р° РІ РѕРїРёСЃР°РЅРёРё'); return; }
      if (!supabaseClient) { tgUtil.alert('Р‘Р°Р·Р° РґР°РЅРЅС‹С… РЅРµРґРѕСЃС‚СѓРїРЅР°'); return; }
      const original = calcTextSearchBtn.innerText;
      calcTextSearchBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РС‰РµРј РЅР° РїР»РѕС‰Р°РґРєР°С…вЂ¦';
      calcTextSearchBtn.disabled = true;
      if (calcResultsBox) {
        calcResultsBox.classList.remove('hidden');
        calcResultsBox.innerHTML = '<div class="text-white/60 text-sm py-2"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РР СѓР»СѓС‡С€Р°РµС‚ Р·Р°РїСЂРѕСЃ Рё РїР°СЂР°Р»Р»РµР»СЊРЅРѕ РѕРїСЂР°С€РёРІР°РµС‚ РїР»РѕС‰Р°РґРєРёвЂ¦</div>';
      }
      try {
        // Р•СЃР»Рё РїСЂРёР»РѕР¶РёР»Рё С„РѕС‚Рѕ вЂ” РѕС‚РїСЂР°РІР»СЏРµРј С‡РµСЂРµР· search-by-image (С„РѕС‚Рѕ РєР°Рє primary, С‚РµРєСЃС‚ РєР°Рє hint)
        if (calcTextPhotoFile) {
          let sessionId = localStorage.getItem('icelogix_session_id');
          if (!sessionId) {
            sessionId = crypto.randomUUID();
            localStorage.setItem('icelogix_session_id', sessionId);
          }
          const safeName = calcTextPhotoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
          const path = `${sessionId}/${Date.now()}_search_${safeName}`;
          const { error: upErr } = await supabaseClient.storage
            .from('product-screenshots')
            .upload(path, calcTextPhotoFile, { contentType: calcTextPhotoFile.type, upsert: false });
          if (upErr) throw new Error('Р—Р°РіСЂСѓР·РєР° С„РѕС‚Рѕ: ' + upErr.message);
          const { data, error } = await supabaseClient.functions.invoke('search-by-image', {
            body: { screenshotPath: path, descriptionHint: q },
          });
          if (error) throw new Error(error.message);
          if (!data?.ok) throw new Error(data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р№С‚Рё');
          renderCalcSearchResults(data);
        } else {
          const { data, error } = await supabaseClient.functions.invoke('search-products', {
            body: { query: q, user_id: userId },
          });
          if (error) throw new Error(error.message);
          if (!data?.ok) throw new Error(data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р№С‚Рё');
          renderCalcSearchResults(data);
        }
      } catch (e) {
        if (calcResultsBox) {
          calcResultsBox.classList.remove('hidden');
          calcResultsBox.innerHTML = `<div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${escHtmlC(e.message)}</div>`;
        }
      } finally {
        calcTextSearchBtn.innerText = original;
        calcTextSearchBtn.disabled = false;
      }
    };
    calcTextSearchBtn.addEventListener('click', runCalcTextSearch);
    calcTextInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); runCalcTextSearch(); }
    });
  }
  
  // РџСЂРёРјРµРЅСЏРµРј РїСЂРµРґСѓСЃС‚Р°РЅРѕРІР»РµРЅРЅС‹Р№ СЂРµР¶РёРј (РµСЃР»Рё Р±С‹Р» РїРµСЂРµС…РѕРґ СЃ Р“Р»Р°РІРЅРѕР№ РїРѕ "РџРѕРёСЃРє РїРѕ С„РѕС‚Рѕ")
  if (window.calcPreselectMode) {
    setCalcMode(window.calcPreselectMode);
    window.calcPreselectMode = null;
  } else {
    setCalcMode('link'); // РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ
  }
}

    // ==================== GLOBAL ORDER WIZARD STATE HELPERS ====================
    window.selectOrderCountry = (country) => {
      window.orderCountry = country;
      if (!window.tempOrder) {
        window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: country };
      } else {
        window.tempOrder.country = country;
      }
      window.orderAddMode = true; // immediately start in add mode to add the first item
      window.orderAddSubMode = 'link';
      renderCurrentScreen();
    };

    window.resetOrderCountry = () => {
      tgUtil.confirm('РЎРјРµРЅР° СЃС‚СЂР°РЅС‹ РѕС‡РёСЃС‚РёС‚ СЃРїРёСЃРѕРє РґРѕР±Р°РІР»РµРЅРЅС‹С… С‚РѕРІР°СЂРѕРІ. РџСЂРѕРґРѕР»Р¶РёС‚СЊ?').then(ok => {
        if (ok) {
          window.orderCountry = null;
          window.tempOrder = null;
          window.orderAddMode = false;
          renderCurrentScreen();
        }
      });
    };

    window.startOrderAddMode = () => {
      window.orderAddMode = true;
      window.orderAddSubMode = 'link';
      renderCurrentScreen();
    };

    window.stopOrderAddMode = () => {
      window.orderAddMode = false;
      if (typeof tgUtil !== 'undefined') {
        tgUtil.hideMainButton();
        tgUtil.setBackButton(null);
      }
      renderCurrentScreen();
    };

    window.setOrderAddSubMode = (mode) => {
      window.orderAddSubMode = mode;
      if (typeof tgUtil !== 'undefined') {
        tgUtil.hideMainButton();
        tgUtil.setBackButton(null);
      }
      renderCurrentScreen();
    };

    window.selectOrderGender = (gender) => {
      document.querySelectorAll('#orderGenderSelector button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      });
      const activeBtn = document.querySelector(`#orderGenderSelector button[data-gender="${gender}"]`);
      if (activeBtn) {
        activeBtn.classList.remove('btn-secondary');
        activeBtn.classList.add('btn-primary');
      }
      const hiddenInp = document.getElementById('orderGender');
      if (hiddenInp) hiddenInp.value = gender;
    };

    window.deleteOrderItem = (index) => {
      if (window.tempOrder && window.tempOrder.items) {
        window.tempOrder.items.splice(index, 1);
        let total = 0;
        window.tempOrder.items.forEach(item => {
          total += item.total_byn * item.quantity;
        });
        window.tempOrder.total = total;
        renderCurrentScreen();
      }
    };

    function getPlatformCountry(platform) {
      const cn = ['poizon', 'taobao', 'tmall', '1688', 'jd', 'dewu', 'pinduoduo'];
      const ru = ['avito', 'lamoda', 'wildberries', 'ozon'];
      if (cn.includes(platform?.toLowerCase())) return 'CN';
      if (ru.includes(platform?.toLowerCase())) return 'RU';
      return 'PL'; // Default to Europe/Poland
    }

    window.recalculateOrderTotals = async () => {
      if (!window.tempOrder || !window.tempOrder.items) return;

      const insurance = true; // mandatory
      const extraPhoto = document.getElementById('orderExtraPhoto')?.checked || false;
      const extraMeasure = document.getElementById('orderExtraMeasure')?.checked || false;
      const keepBox = document.getElementById('orderKeepBox')?.checked || false;
      const isGift = document.getElementById('orderIsGift')?.checked || false;
      const requiresVideoCheck = document.getElementById('orderRequiresVideoCheck')?.checked || false;
      const discount = window.tempOrder.discountAmount || 0;

      let aggregatedTotal = 0;
      const aggregatedBreakdown = {
        product_cost_byn: 0,
        delivery_cost_byn: 0,
        commission_byn: 0,
        insurance_byn: 0,
        customs_duty_byn: 0,
        currency_buffer_byn: 0,
        video_check_byn: 0,
        total_byn: 0
      };

      let aggregatedWeight = 0;
      let aggregatedOriginalPrice = 0;
      let aggregatedWarnings = [];
      let minDeliveryDays = 999;
      let maxDeliveryDays = 0;

      for (const item of window.tempOrder.items) {
        let weight = item.weight || 0.5;
        if (keepBox) {
          weight = Math.min(100, +(weight + 0.3).toFixed(2));
        }

        const res = await window.iceLogixPricing.calculatePrice({
          product_price: item.price,
          product_currency: item.currency,
          source_country: window.orderCountry,
          weight_kg: weight,
          category: item.category,
          insurance: insurance,
          extra_photo: extraPhoto,
          extra_measure: extraMeasure,
          legit_check: false,
          client_level: window.userLevel || 'newbie',
          is_first_order: !!window.userIsFirstOrder,
          referral_used: !!window.referralCode,
          extra_discount_byn: 0,
        });

        item.total_byn = res.total_byn;
        aggregatedTotal += res.total_byn * item.quantity;
        aggregatedWeight += weight * item.quantity;
        aggregatedOriginalPrice += item.price * item.quantity;

        const bk = res.breakdown || {};
        aggregatedBreakdown.product_cost_byn += (bk.product_cost_byn || 0) * item.quantity;
        aggregatedBreakdown.delivery_cost_byn += (bk.delivery_cost_byn || 0) * item.quantity;
        aggregatedBreakdown.commission_byn += (bk.commission_byn || 0) * item.quantity;
        aggregatedBreakdown.insurance_byn += (bk.insurance_byn || 0) * item.quantity;
        aggregatedBreakdown.customs_duty_byn += (bk.customs_duty_byn || 0) * item.quantity;
        aggregatedBreakdown.currency_buffer_byn += (bk.currency_buffer_byn || 0) * item.quantity;

        if (res.warnings && res.warnings.length) {
          res.warnings.forEach(w => {
            if (!aggregatedWarnings.includes(w)) aggregatedWarnings.push(w);
          });
        }
        if (res.delivery_days) {
          minDeliveryDays = Math.min(minDeliveryDays, res.delivery_days[0]);
          maxDeliveryDays = Math.max(maxDeliveryDays, res.delivery_days[1]);
        }
      }

      // Add domestic shipping fee (PVS fee) using pricing-engine LOCAL_DELIVERY_RATES
      const pvsMethod = document.getElementById('pvsMethodSelect')?.value || window.tempOrder?.pvs?.method || 'none';
      const pvsCity = document.getElementById('pvsCitySelect')?.value || window.tempOrder?.pvs?.city || 'РњРёРЅСЃРє';
      const pvsPoint = document.getElementById('pvsPointSelect')?.value || window.tempOrder?.pvs?.point || '';
      
      let pvsCost = 0;
      if (pvsMethod !== 'none' && window.iceLogixPricing.LOCAL_DELIVERY_RATES[pvsMethod]) {
        pvsCost = window.iceLogixPricing.LOCAL_DELIVERY_RATES[pvsMethod].calc(aggregatedWeight);
      }
      
      const useFreeDelivery = document.getElementById('orderUseFreeDelivery')?.checked || window.tempOrder?.useFreeDelivery || false;
      if (window.tempOrder) window.tempOrder.useFreeDelivery = useFreeDelivery;
      
      let deliveryDiscount = 0;
      if (useFreeDelivery && window.userSettings?.free_delivery_tokens > 0) {
        deliveryDiscount = pvsCost; // sets domestic fee to 0
      }
      
      aggregatedBreakdown.local_delivery_byn = pvsCost - deliveryDiscount;
      aggregatedTotal += pvsCost - deliveryDiscount;
      
      // Additional Services & Consolidation Splits
      window.tempOrder.consolidation = window.tempOrder.consolidation || {};
      window.tempOrder.packageExtras = window.tempOrder.packageExtras || {};

      const packages = {
        'CN': [],
        'PL': [],
        'RU': []
      };

      for (const item of window.tempOrder.items) {
        const country = getPlatformCountry(item.platform);
        packages[country].push(item);
      }

      let extraServicesTotal = 0;
      let consolidationDiscountTotal = 0;
      const serviceBreakdownHtmlRows = [];

      for (const country of ['CN', 'PL', 'RU']) {
        const pkgItems = packages[country];
        if (pkgItems.length === 0) continue;

        const countryLabel = country === 'CN' ? 'РљРёС‚Р°Р№' : country === 'PL' ? 'Р•РІСЂРѕРїР°' : 'Р РѕСЃСЃРёСЏ';

        // Check consolidation
        if (pkgItems.length >= 2 && window.tempOrder.consolidation[country]) {
          consolidationDiscountTotal += 3;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-green-400">
              <span>рџ“¦ РљРѕРЅСЃРѕР»РёРґР°С†РёСЏ (${countryLabel})</span>
              <span class="font-mono">-3.00 BYN</span>
            </div>
          `);
        }

        // Check package extras
        const extras = window.tempOrder.packageExtras[country] || {};
        if (extras.bubble) {
          extraServicesTotal += 3;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>рџ«§ РџР»С‘РЅРєР° РґР»СЏ РїРѕСЃС‹Р»РєРё (${countryLabel})</span>
              <span class="font-mono">+3.00 BYN</span>
            </div>
          `);
        }
        if (extras.wood) {
          extraServicesTotal += 10;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>рџЄµ РћР±СЂРµС€С‘С‚РєР° РїРѕСЃС‹Р»РєРё (${countryLabel})</span>
              <span class="font-mono">+10.00 BYN</span>
            </div>
          `);
        }
        if (extras.check) {
          extraServicesTotal += 5;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>рџ”Ќ РџСЂРѕРІРµСЂРєР° РЅР° Р±СЂР°Рє (${countryLabel})</span>
              <span class="font-mono">+5.00 BYN</span>
            </div>
          `);
        }
      }

      if (requiresVideoCheck) {
        aggregatedBreakdown.video_check_byn = 10;
        aggregatedTotal += 10;
      }

      aggregatedTotal += extraServicesTotal - consolidationDiscountTotal;
      
      // Update window.tempOrder.pvs
      if (window.tempOrder) {
        window.tempOrder.pvs = {
          method: pvsMethod,
          city: pvsCity,
          point: pvsPoint,
          cost: pvsCost
        };
        window.tempOrder.insurance = insurance;
        window.tempOrder.keepBox = keepBox;
        window.tempOrder.isGift = isGift;
        window.tempOrder.requiresVideoCheck = requiresVideoCheck;
      }

      // Customs Splitter dynamic container update
      const splitPlaceholder = document.getElementById('customsSplitPlaceholder');
      if (splitPlaceholder) {
        if (aggregatedBreakdown.customs_duty_byn > 0) {
          if (window.userRecipients && window.userRecipients.length > 0) {
            const isChecked = window.tempOrder?.useCustomsSplit || false;
            const currentRecId = window.tempOrder?.customsSplitRecipientId || '';
            const recOptions = window.userRecipients.map(r => `<option value="${r.id}" ${currentRecId === r.id ? 'selected' : ''}>${r.full_name} (***${r.passport.slice(-4)})</option>`).join('');

            splitPlaceholder.innerHTML = `
              <div class="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 mb-4 page-enter">
                <div class="flex items-start gap-2 text-left mb-2">
                  <input type="checkbox" id="orderUseCustomsSplit" class="mt-0.5 w-5 h-5 accent-cyan-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                  <div>
                    <label for="orderUseCustomsSplit" class="text-white text-xs font-semibold leading-normal cursor-pointer">
                      рџ›ЎпёЏ Р Р°Р·РґРµР»РёС‚СЊ РїРѕСЃС‹Р»РєСѓ РЅР° РґРІСѓС… РїРѕР»СѓС‡Р°С‚РµР»РµР№ (РѕР±РЅСѓР»РёС‚СЊ РїРѕС€Р»РёРЅСѓ)
                    </label>
                    <p class="text-white/40 text-[9px] mt-0.5">Р’С‹Р±РµСЂРёС‚Рµ РїРѕР»СѓС‡Р°С‚РµР»СЏ РґР»СЏ РІС‚РѕСЂРѕР№ С‡Р°СЃС‚Рё РїРѕСЃС‹Р»РєРё.</p>
                  </div>
                </div>
                <div id="customsSplitRecipientSelect" class="${isChecked ? '' : 'hidden'}">
                  <select id="splitRecipientDropdown" class="w-full p-2 text-sm rounded-lg border border-white/20 bg-slate-900 text-white mt-1">
                    <option value="">-- Р’С‹Р±РµСЂРёС‚Рµ РїРѕР»СѓС‡Р°С‚РµР»СЏ --</option>
                    ${recOptions}
                  </select>
                </div>
              </div>
            `;
            
            // Attach change event listener
            const chk = document.getElementById('orderUseCustomsSplit');
            const drop = document.getElementById('splitRecipientDropdown');
            if (chk) {
              chk.onchange = () => {
                window.tempOrder.useCustomsSplit = chk.checked;
                document.getElementById('customsSplitRecipientSelect').classList.toggle('hidden', !chk.checked);
                recalculateOrderTotals();
              };
            }
            if (drop) {
              drop.onchange = () => {
                window.tempOrder.customsSplitRecipientId = drop.value;
                const rec = window.userRecipients.find(r => r.id === drop.value);
                if (rec) window.tempOrder.customsSplitRecipientName = rec.full_name;
              };
            }
          } else {
            splitPlaceholder.innerHTML = `
              <div class="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 mb-4 text-xs text-amber-300 page-enter">
                рџ’Ў <strong>РџСЂРµРІС‹С€РµРЅ Р»РёРјРёС‚ РїРѕС€Р»РёРЅС‹ в‚¬200!</strong> Р’С‹ РјРѕР¶РµС‚Рµ РґРѕР±Р°РІРёС‚СЊ СЂРѕРґСЃС‚РІРµРЅРЅРёРєР° РІ <span class="underline cursor-pointer font-bold hover:text-white" onclick="switchTab('profile')">РџСЂРѕС„РёР»Рµ (РњРѕРё РїРѕР»СѓС‡Р°С‚РµР»Рё)</span>, С‡С‚РѕР±С‹ СЂР°Р·РґРµР»РёС‚СЊ РїРѕСЃС‹Р»РєСѓ Рё СЃСЌРєРѕРЅРѕРјРёС‚СЊ <strong>${aggregatedBreakdown.customs_duty_byn.toFixed(2)} BYN</strong> РЅР° РїРѕС€Р»РёРЅРµ.
              </div>
            `;
          }
        } else {
          splitPlaceholder.innerHTML = '';
        }
      }

      // Check if customs split is active and subtract duty
      const useCustomsSplit = window.tempOrder?.useCustomsSplit || false;
      if (useCustomsSplit && aggregatedBreakdown.customs_duty_byn > 0) {
        aggregatedTotal -= aggregatedBreakdown.customs_duty_byn;
        aggregatedBreakdown.customs_duty_byn = 0;
      } else if (!useCustomsSplit && window.tempOrder) {
        window.tempOrder.useCustomsSplit = false;
      }

      window.tempOrder.total = aggregatedTotal;
      window.tempOrder.weight = aggregatedWeight;
      window.tempOrder.price = aggregatedOriginalPrice;
      window.tempOrder.breakdown = aggregatedBreakdown;

      const finalTotal = Math.max(0, aggregatedTotal - discount);
      window.tempOrder.total_byn = finalTotal;

      const totalSpan = document.getElementById('orderTotal');
      const prepaymentSpan = document.getElementById('prepaymentAmount');
      const breakdownEl = document.getElementById('orderBreakdown');

      if (totalSpan) totalSpan.innerText = finalTotal.toFixed(2);
      if (prepaymentSpan) prepaymentSpan.innerText = (finalTotal * 0.70).toFixed(2);

      if (breakdownEl) {
        aggregatedBreakdown.total_byn = finalTotal;
        let baseHtml = window.iceLogixPricing.formatBreakdownHTML({
          available: true,
          total_byn: finalTotal,
          total_ice: finalTotal,
          breakdown: aggregatedBreakdown,
          warnings: aggregatedWarnings,
          delivery_days: [
            minDeliveryDays === 999 ? 0 : minDeliveryDays,
            maxDeliveryDays === 0 ? 0 : maxDeliveryDays
          ]
        });

        if (serviceBreakdownHtmlRows.length > 0) {
          const splitMarker = '<div class="border-t border-white/20 mt-2 pt-2';
          const idx = baseHtml.indexOf(splitMarker);
          if (idx !== -1) {
            baseHtml = baseHtml.substring(0, idx) + serviceBreakdownHtmlRows.join('') + baseHtml.substring(idx);
          }
        }

        breakdownEl.innerHTML = baseHtml;
        breakdownEl.classList.remove('hidden');
      }
    };

    // ==================== Р Р•РќР”Р•Р  РќРћР’РћР“Рћ Р—РђРљРђР—Рђ ====================
    async function renderNewOrder() {
      // Fetch recipients for customs split
      window.userRecipients = [];
      if (userId) {
        try {
          const { data } = await supabaseClient.from('recipients').select('*').eq('user_id', userId);
          if (data) window.userRecipients = data;
        } catch(e) {}
      }

      const limitInfo = await checkAndUpdateLimit();
      let limitMessage = '';
      if (!limitInfo.allowed) {
        limitMessage = `<div class="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4 text-center">
          <p class="text-red-400 font-bold"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Р”РЅРµРІРЅРѕР№ Р»РёРјРёС‚ РёСЃС‡РµСЂРїР°РЅ (${limitInfo.currentCount}/${limitInfo.maxRequests})</p>
          <p class="text-white/70 text-sm mt-1">РћС„РѕСЂРјРёС‚Рµ Р·Р°РєР°Р·, С‡С‚РѕР±С‹ СЃРЅСЏС‚СЊ РѕРіСЂР°РЅРёС‡РµРЅРёРµ</p>
        </div>`;
      } else {
        const remaining = limitInfo.maxRequests - limitInfo.currentCount;
        limitMessage = `<div class="bg-white/5 rounded-xl p-3 mb-4 text-center">
          <p class="text-white/70 text-sm">РћСЃС‚Р°Р»РѕСЃСЊ СЂР°СЃС‡С‘С‚РѕРІ СЃРµРіРѕРґРЅСЏ: <span class="text-cyan-400 font-bold">${remaining}</span> РёР· ${limitInfo.maxRequests}</p>
        </div>`;
      }

      let vacationBanner = '';
      if (window.buyerVacation && window.buyerVacation.active) {
        const days = window.buyerVacation.days || 0;
        vacationBanner = `
          <div class="mb-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex gap-3 items-center">
            <span class="text-2xl">рџЊґ</span>
            <div class="text-left">
              <p class="font-bold">Р‘Р°Р№РµСЂС‹ РЅР° РєР°РЅРёРєСѓР»Р°С…</p>
              <p class="text-xs text-white/70 mt-0.5">Р’СЃРµ СЃСЂРѕРєРё РґРѕСЃС‚Р°РІРєРё СѓРІРµР»РёС‡РµРЅС‹ РЅР° ${days} РґРЅ. РЎРѕР·РґР°РЅРёРµ Р·Р°РєР°Р·РѕРІ РґРѕСЃС‚СѓРїРЅРѕ РІ РѕР±С‹С‡РЅРѕРј СЂРµР¶РёРјРµ.</p>
            </div>
          </div>
        `;
      }

      if (!window.orderCountry) {
        // Step 1: Country Selection
        return `
          <div class="glass-card page-enter">
            <h2 class="text-xl font-bold mb-4 text-center"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> Р’С‹Р±РµСЂРёС‚Рµ СЃС‚СЂР°РЅСѓ РґРѕСЃС‚Р°РІРєРё</h2>
            <p class="text-white/60 text-sm text-center mb-6">РћС‚ СЃС‚СЂР°РЅС‹ Р·Р°РІРёСЃСЏС‚ С‚Р°СЂРёС„С‹ РЅР° РґРѕСЃС‚Р°РІРєСѓ, СЃСЂРѕРєРё Рё С‚Р°РјРѕР¶РµРЅРЅС‹Рµ РїРѕС€Р»РёРЅС‹.</p>
            ${vacationBanner}
            
            <div class="grid grid-cols-1 gap-4">
              <!-- China -->
              <div class="glass-card p-4 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition flex items-center gap-4" onclick="selectOrderCountry('CN')">
                <div class="text-4xl">рџ‡Ёрџ‡і</div>
                <div class="flex-1">
                  <h3 class="font-bold text-white text-base">РљРёС‚Р°Р№ (Poizon, Taobao, 1688)</h3>
                  <p class="text-xs text-white/50 mt-0.5">РћРіСЂРѕРјРЅС‹Р№ РІС‹Р±РѕСЂ, Р»СѓС‡С€РёРµ С†РµРЅС‹ РЅР° РѕСЂРёРіРёРЅР°Р»С‹</p>
                  <div class="flex gap-4 mt-2 text-xs">
                    <span class="text-cyan-400 font-semibold">вљЎ $10 / РєРі</span>
                    <span class="text-white/60"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> 10-15 РґРЅРµР№</span>
                  </div>
                </div>
              </div>
              
              <!-- Poland/EU -->
              <div class="glass-card p-4 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition flex items-center gap-4" onclick="selectOrderCountry('PL')">
                <div class="text-4xl">рџ‡µрџ‡±</div>
                <div class="flex-1">
                  <h3 class="font-bold text-white text-base">РџРѕР»СЊС€Р° / Р•РЎ (Zalando, ASOS, Farfetch)</h3>
                  <p class="text-xs text-white/50 mt-0.5">100% РѕСЂРёРіРёРЅР°Р»СЊРЅС‹Рµ РµРІСЂРѕРїРµР№СЃРєРёРµ РєРѕР»Р»РµРєС†РёРё</p>
                  <div class="flex gap-4 mt-2 text-xs">
                    <span class="text-cyan-400 font-semibold">вљЎ $15 / РєРі</span>
                    <span class="text-white/60"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> 14-20 РґРЅРµР№</span>
                  </div>
                </div>
              </div>
              
              <!-- Russia -->
              <div class="glass-card p-4 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition flex items-center gap-4" onclick="selectOrderCountry('RU')">
                <div class="text-4xl">рџ‡·рџ‡є</div>
                <div class="flex-1">
                  <h3 class="font-bold text-white text-base">Р РѕСЃСЃРёСЏ (WB, Lamoda, Ozon)</h3>
                  <p class="text-xs text-white/50 mt-0.5">РЎРІРµСЂС…Р±С‹СЃС‚СЂР°СЏ РґРѕСЃС‚Р°РІРєР°, Р±РµР· РїРѕС€Р»РёРЅ Р•РђР­РЎ</p>
                  <div class="flex gap-4 mt-2 text-xs">
                    <span class="text-cyan-400 font-semibold">вљЎ $5 / РєРі</span>
                    <span class="text-white/60"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> 3-5 РґРЅРµР№</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ${renderFooter()}
        `;
      }

      if (!window.orderAddMode) {
        // Step 2: Checkout / Added Items List
        if (!window.tempOrder) {
          window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: window.orderCountry };
        }
        window.tempOrder.items = window.tempOrder.items || [];
        
        let itemsHtml = '';
        let totalSum = 0;
        
        // Sum up total from all items
        window.tempOrder.items.forEach(item => {
          totalSum += item.total_byn * item.quantity;
        });

        if (window.tempOrder.items.length === 0) {
          itemsHtml = `
            <div class="text-center py-8 text-white/40 text-sm bg-white/5 rounded-2xl border border-dashed border-white/10">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V4h16v3M4 7l8 4 8-4M4 7v13h16V7"/></svg></span> РЈ РІР°СЃ РїРѕРєР° РЅРµС‚ РґРѕР±Р°РІР»РµРЅРЅС‹С… С‚РѕРІР°СЂРѕРІ.<br>РќР°Р¶РјРёС‚Рµ В«<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂВ» РЅРёР¶Рµ
            </div>
          `;
        } else {
          // Group items by country package
          const packages = {
            'CN': [],
            'PL': [],
            'RU': []
          };
          
          window.tempOrder.items.forEach((item, idx) => {
            item._originalIndex = idx;
            const country = getPlatformCountry(item.platform);
            packages[country].push(item);
          });

          // Auto-select tab if current active is empty
          window.activePackageTab = window.activePackageTab || 'CN';
          const activeTabsWithItems = Object.keys(packages).filter(c => packages[c].length > 0);
          if (activeTabsWithItems.length > 0 && !activeTabsWithItems.includes(window.activePackageTab)) {
            window.activePackageTab = activeTabsWithItems[0];
          }

          // Build package tabs layout
          const tabButtons = Object.keys(packages).map(country => {
            const count = packages[country].length;
            if (count === 0) return '';
            const flag = country === 'CN' ? 'рџ‡Ёрџ‡і' : country === 'PL' ? 'рџ‡µрџ‡±' : 'рџ‡·рџ‡є';
            const label = country === 'CN' ? 'РљРёС‚Р°Р№' : country === 'PL' ? 'Р•РІСЂРѕРїР°' : 'Р РѕСЃСЃРёСЏ';
            const active = window.activePackageTab === country;
            return `
              <button type="button" class="flex-1 py-2 text-center text-[10px] font-bold rounded-xl border transition ${active ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 hover:bg-white/5 text-white/70'}" onclick="window.switchPackageTab('${country}')">
                ${flag} ${label} (${count})
              </button>
            `;
          }).join('');

          const activePackageItems = packages[window.activePackageTab] || [];
          const itemsListHtml = activePackageItems.map((item) => {
            return `
              <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-bold text-white truncate">${item.title}</div>
                  <div class="text-xs text-white/60 mt-0.5">Р Р°Р·РјРµСЂ: ${item.size || 'РЅРµ СѓРєР°Р·Р°РЅ'} В· РљР°С‚РµРіРѕСЂРёСЏ: ${item.category}</div>
                  <div class="text-xs text-cyan-400 font-bold mt-1">${item.price} ${item.currency} (${item.total_byn.toFixed(2)} BYN)</div>
                </div>
                <button type="button" class="bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full w-8 h-8 flex items-center justify-center transition flex-shrink-0" onclick="deleteOrderItem(${item._originalIndex})">${ix('trash-2')}</button>
              </div>
            `;
          }).join('');

          // Consolidation checkbox
          window.tempOrder.consolidation = window.tempOrder.consolidation || {};
          const isConsolidated = window.tempOrder.consolidation[window.activePackageTab] || false;
          const consolidationWidget = activePackageItems.length >= 2 ? `
            <div class="flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 mt-3 mb-2 page-enter">
              <div class="flex items-center gap-2 text-left">
                <input type="checkbox" id="pkgConsolidationCheck" class="w-5 h-5 accent-cyan-500 cursor-pointer" ${isConsolidated ? 'checked' : ''} onchange="window.togglePackageConsolidation('${window.activePackageTab}')">
                <label for="pkgConsolidationCheck" class="text-white text-xs font-semibold leading-snug cursor-pointer">
                  рџ“¦ РћР±СЉРµРґРёРЅРёС‚СЊ С‚РѕРІР°СЂС‹ РІ РѕРґРЅСѓ РєРѕСЂРѕР±РєСѓ (СЃРєРёРґРєР° 3 BYN)
                </label>
              </div>
            </div>
          ` : '';

          // Package extras checkboxes
          window.tempOrder.packageExtras = window.tempOrder.packageExtras || {};
          const extras = window.tempOrder.packageExtras[window.activePackageTab] || {};
          const activeCountryLabel = window.activePackageTab === 'CN' ? 'РљРёС‚Р°Рµ' : window.activePackageTab === 'PL' ? 'РџРѕР»СЊС€Рµ' : 'Р РѕСЃСЃРёРё';
          const extrasWidget = `
            <div class="bg-white/5 p-3.5 rounded-xl border border-white/10 mt-2 mb-2 text-xs space-y-2.5 page-enter">
              <p class="text-white/60 font-bold uppercase tracking-wider text-[10px]">Р”РѕРї. СѓСЃР»СѓРіРё СЃРєР»Р°РґР° РІ ${activeCountryLabel}:</p>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="extraBubble" class="w-4 h-4 accent-cyan-500 cursor-pointer" ${extras.bubble ? 'checked' : ''} onchange="window.togglePackageExtra('${window.activePackageTab}', 'bubble')">
                <label for="extraBubble" class="text-white/70 cursor-pointer">Bubble-РїР»С‘РЅРєР° (+3 BYN)</label>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="extraWood" class="w-4 h-4 accent-cyan-500 cursor-pointer" ${extras.wood ? 'checked' : ''} onchange="window.togglePackageExtra('${window.activePackageTab}', 'wood')">
                <label for="extraWood" class="text-white/70 cursor-pointer">Р”РµСЂРµРІСЏРЅРЅР°СЏ РѕР±СЂРµС€С‘С‚РєР° (+10 BYN)</label>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="extraCheck" class="w-4 h-4 accent-cyan-500 cursor-pointer" ${extras.check ? 'checked' : ''} onchange="window.togglePackageExtra('${window.activePackageTab}', 'check')">
                <label for="extraCheck" class="text-white/70 cursor-pointer">Р”РµС‚Р°Р»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° РЅР° Р±СЂР°Рє/Р·Р°РјРµСЂС‹ (+5 BYN)</label>
              </div>
            </div>
          `;

          itemsHtml = `
            <div class="space-y-3">
              <!-- Package Tabs Navigation -->
              <div class="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                ${tabButtons}
              </div>
              
              <!-- Active Package Items -->
              <div class="mt-2">
                ${itemsListHtml}
              </div>

              <!-- Package Specific Services & Discounts -->
              ${consolidationWidget}
              ${extrasWidget}
            </div>
          `;
        }

        const discountLine = window.tempOrder.discountAmount > 0
          ? `<p class="text-green-400 text-sm mt-1">РЎРєРёРґРєР°: -${window.tempOrder.discountAmount.toFixed(2)} BYN</p>`
          : '';

        const finalTotal = Math.max(0, totalSum - (window.tempOrder.discountAmount || 0));

        const checkoutOptionsAndTotals = totalSum > 0 ? `
          <!-- Global Options -->
          <div class="bg-white/5 p-4 rounded-xl mb-4 space-y-3">
            <p class="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">РћРїС†РёРё Р·Р°РєР°Р·Р°:</p>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="orderKeepBox" ${window.tempOrder.keepBox ? 'checked' : ''}>
              <label for="orderKeepBox" class="text-white/70 text-sm">РЎРѕС…СЂР°РЅРёС‚СЊ РѕСЂРёРіРёРЅР°Р»СЊРЅСѓСЋ РєРѕСЂРѕР±РєСѓ</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="orderInsurance" checked disabled>
              <label for="orderInsurance" class="text-white/70 text-sm"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></span> РћР±СЏР·Р°С‚РµР»СЊРЅР°СЏ СЃС‚СЂР°С…РѕРІРєР° ShopByShop (+2%)</label>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input type="checkbox" id="orderExtraPhoto" ${window.tempOrder.extraPhoto ? 'checked' : ''} class="w-4 h-4 accent-cyan-500 cursor-pointer">
              <label for="orderExtraPhoto" class="text-white/70 text-sm cursor-pointer"><span class="text-cyan-400">рџ“ё Р”РµС‚Р°Р»СЊРЅС‹Рµ С„РѕС‚Рѕ СЃРѕ СЃРєР»Р°РґР°</span> (+3 BYN)</label>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input type="checkbox" id="orderExtraMeasure" ${window.tempOrder.extraMeasure ? 'checked' : ''} class="w-4 h-4 accent-cyan-500 cursor-pointer">
              <label for="orderExtraMeasure" class="text-white/70 text-sm cursor-pointer"><span class="text-cyan-400">рџ“Џ Р—Р°РјРµСЂ СЃС‚РµР»СЊРєРё/РґР»РёРЅС‹</span> (+3 BYN)</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="orderIsGift" ${window.tempOrder.isGift ? 'checked' : ''} class="w-4 h-4 accent-pink-500 cursor-pointer">
              <label for="orderIsGift" class="text-white/70 text-sm cursor-pointer"><span class="text-pink-400">рџЋЃ РџРѕРґР°СЂРѕРє</span> (РЎРєСЂС‹С‚СЊ С†РµРЅСѓ Рё С‡РµРє)</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="orderRequiresVideoCheck" ${window.tempOrder.requiresVideoCheck ? 'checked' : ''} class="w-4 h-4 accent-cyan-500 cursor-pointer">
              <label for="orderRequiresVideoCheck" class="text-white/70 text-sm cursor-pointer"><span class="text-cyan-400">рџ“№ Р’РёРґРµРѕ-РїСЂРѕРІРµСЂРєР°</span> СЃРѕ СЃРєР»Р°РґР° РІ РљРёС‚Р°Рµ (+10 BYN)</label>
            </div>
          </div>

          <!-- Pick-up Point (PVS) Selector -->
          <div class="bg-white/5 p-4 rounded-xl mb-4 space-y-3">
            <p class="text-white/60 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>рџљљ Р”РѕСЃС‚Р°РІРєР° РїРѕ Р‘РµР»Р°СЂСѓСЃРё:</span>
            </p>
            <div>
              <label class="text-white/50 text-[10px] block mb-1">РЎР»СѓР¶Р±Р° РґРѕСЃС‚Р°РІРєРё</label>
              <select id="pvsMethodSelect" class="w-full p-3 rounded-xl border border-white/20 text-sm bg-slate-900 text-white">
                <option value="none" ${(!window.tempOrder.pvs || window.tempOrder.pvs.method === 'none') ? 'selected' : ''}>РЎР°РјРѕРІС‹РІРѕР· / РџРѕС‡С‚Р° (Р‘РµР· РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅРѕР№ РїР»Р°С‚С‹)</option>
                <option value="europoshta" ${(window.tempOrder.pvs?.method === 'europoshta') ? 'selected' : ''}>Р•РІСЂРѕРїРѕС‡С‚Р° (РґРѕ РѕС‚РґРµР»РµРЅРёСЏ) вЂ” 5.00 BYN</option>
                <option value="belpochta" ${(window.tempOrder.pvs?.method === 'belpochta') ? 'selected' : ''}>Р‘РµР»РїРѕС‡С‚Р° (РґРѕ РѕС‚РґРµР»РµРЅРёСЏ) вЂ” 5.00 BYN</option>
                <option value="sdek" ${(window.tempOrder.pvs?.method === 'sdek') ? 'selected' : ''}>РЎР”Р­Рљ (РґРѕ РѕС‚РґРµР»РµРЅРёСЏ) вЂ” 8.00 BYN</option>
              </select>
            </div>
            
            <div id="pvsDetailContainer" class="${(!window.tempOrder.pvs || window.tempOrder.pvs.method === 'none') ? 'hidden' : ''} space-y-3">
              <button type="button" class="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 py-3 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-2" onclick="window.openYandexMapStub()">
                <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span> Р’С‹Р±СЂР°С‚СЊ РЅР° РєР°СЂС‚Рµ (РЇРЅРґРµРєСЃ)
              </button>
              <div>
                <label class="text-white/50 text-[10px] block mb-1">Р“РѕСЂРѕРґ</label>
                <select id="pvsCitySelect" class="w-full p-3 rounded-xl border border-white/20 text-sm bg-slate-900 text-white">
                  ${['РњРёРЅСЃРє', 'Р“РѕРјРµР»СЊ', 'Р‘СЂРµСЃС‚', 'Р“СЂРѕРґРЅРѕ', 'Р’РёС‚РµР±СЃРє', 'РњРѕРіРёР»РµРІ', 'Р‘Р°СЂР°РЅРѕРІРёС‡Рё', 'Р‘РѕР±СЂСѓР№СЃРє', 'Р‘РѕСЂРёСЃРѕРІ', 'Р›РёРґР°', 'РњРѕР·С‹СЂСЊ', 'РќРѕРІРѕРїРѕР»РѕС†Рє', 'РћСЂС€Р°', 'РџРёРЅСЃРє', 'РЎРѕР»РёРіРѕСЂСЃРє'].map(c => `
                    <option value="${c}" ${(window.tempOrder.pvs?.city === c) ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="text-white/50 text-[10px] block mb-1">РџСѓРЅРєС‚ РІС‹РґР°С‡Рё / РћС‚РґРµР»РµРЅРёРµ</label>
                <select id="pvsPointSelect" class="w-full p-3 rounded-xl border border-white/20 text-sm bg-slate-900 text-white">
                  <!-- Will be populated dynamically -->
                </select>
              </div>
            </div>
            
            ${(window.userSettings?.free_delivery_tokens > 0) ? `
              <div class="flex items-center justify-between p-3 rounded-xl border border-green-500/30 bg-green-500/10 mt-3">
                <div class="flex items-center gap-2 text-left">
                  <input type="checkbox" id="orderUseFreeDelivery" class="w-5 h-5 accent-green-500" ${window.tempOrder.useFreeDelivery ? 'checked' : ''}>
                  <label for="orderUseFreeDelivery" class="text-white text-xs font-semibold leading-snug">РСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РєСѓРїРѕРЅ РЅР° Р±РµСЃРїР»Р°С‚РЅСѓСЋ РґРѕСЃС‚Р°РІРєСѓ (РѕСЃС‚Р°Р»РѕСЃСЊ: ${window.userSettings.free_delivery_tokens})</label>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Promo Code -->
          <div class="bg-white/5 p-4 rounded-xl mb-4">
            <label class="text-white/70 text-sm block mb-1">РџСЂРѕРјРѕРєРѕРґ</label>
            <div class="flex gap-2">
              <input type="text" id="promoCode" class="btn-secondary flex-1 p-3 rounded-xl border border-white/30 text-sm" placeholder="Р’РІРµРґРёС‚Рµ РїСЂРѕРјРѕРєРѕРґ" value="${window.tempOrder.appliedPromo?.code || ''}">
              <button id="applyPromoBtn" class="btn-primary whitespace-nowrap px-4 rounded-xl text-sm font-bold">РџСЂРёРјРµРЅРёС‚СЊ</button>
            </div>
            <p id="promoMessage" class="text-xs mt-1 hidden"></p>
          </div>

          <!-- Customs Split Container Placeholders -->
          <div id="customsSplitPlaceholder"></div>

          <!-- Breakdown & Totals -->
          <div class="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl">
            <div id="orderBreakdown" class="mb-3 space-y-1 text-sm border-b border-white/10 pb-3"></div>
            
            <div class="flex justify-between items-baseline mb-1">
              <span class="text-white font-bold">РРўРћР“Рћ:</span>
              <span class="text-cyan-400 font-bold text-xl"><span id="orderTotal">${finalTotal.toFixed(2)}</span> <span class="text-sm">BYN</span></span>
            </div>
            ${discountLine}
            <p class="text-white/70 text-xs mt-1">*РћР±СЏР·Р°С‚РµР»СЊРЅР°СЏ РїСЂРµРґРѕРїР»Р°С‚Р° 70%: <span id="prepaymentAmount" class="font-bold text-cyan-300">${(finalTotal * 0.70).toFixed(2)}</span> BYN</p>
            
            <!-- Agree Offer -->
            <div class="mt-4 flex items-start gap-2 border-t border-white/10 pt-3 mb-2">
              <input type="checkbox" id="agreeOffer" class="mt-1">
              <label for="agreeOffer" class="text-white/70 text-xs leading-normal">
                РЇ РїСЂРёРЅРёРјР°СЋ СѓСЃР»РѕРІРёСЏ <a href="https://example.com/offer.pdf" target="_blank" class="text-cyan-400 underline font-bold">РїСѓР±Р»РёС‡РЅРѕР№ РѕС„РµСЂС‚С‹</a> Рё РґР°СЋ СЃРѕРіР»Р°СЃРёРµ РЅР° РѕР±СЂР°Р±РѕС‚РєСѓ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С…
              </label>
            </div>

            <!-- Agree Delivery Rules -->
            <div class="flex items-start gap-2 mb-4">
              <input type="checkbox" id="agreeDeliveryRules" class="mt-1">
              <label for="agreeDeliveryRules" class="text-white/70 text-xs leading-normal">
                РЇ РїСЂРѕС‡РёС‚Р°Р» Рё СЃРѕРіР»Р°СЃРµРЅ СЃ <button type="button" class="text-cyan-400 underline font-bold text-left" onclick="tgUtil.alert('РџСЂР°РІРёР»Р° РґРѕСЃС‚Р°РІРєРё:\\n\\n1. РЎСЂРѕРєРё РґРѕСЃС‚Р°РІРєРё СЏРІР»СЏСЋС‚СЃСЏ РѕСЂРёРµРЅС‚РёСЂРѕРІРѕС‡РёРЅС‹РјРё.\\n2. РС‚РѕРіРѕРІС‹Р№ РІРµСЃ РјРѕР¶РµС‚ РѕС‚Р»РёС‡Р°С‚СЊСЃСЏ РѕС‚ СЂР°СЃС‡РµС‚РЅРѕРіРѕ.\\n3. РћС‚РјРµРЅР° РІС‹РєСѓРїР»РµРЅРЅРѕРіРѕ Р·Р°РєР°Р·Р° РЅРµРІРѕР·РјРѕР¶РЅР°.')">РїСЂР°РІРёР»Р°РјРё РґРѕСЃС‚Р°РІРєРё</button>.
              </label>
            </div>

            <!-- Commission Contract -->
            <div class="flex items-start gap-2 mb-4">
              <input type="checkbox" id="agreeCommissionContract" class="mt-1">
              <label for="agreeCommissionContract" class="text-white/70 text-xs leading-normal">
                РЇ РїРѕРґРїРёСЃС‹РІР°СЋ <button type="button" class="text-cyan-400 underline font-bold text-left" onclick="showCommissionContractModal()">рџ“„ Р”РѕРіРѕРІРѕСЂ РєРѕРјРёСЃСЃРёРё Р±Р°Р№РµСЂР° (20% РЅР° СѓСЃР»СѓРіРё)</button> Рё РїРѕРґС‚РІРµСЂР¶РґР°СЋ С‚РѕС‡РЅРѕСЃС‚СЊ РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅРЅС‹С… РґР°РЅРЅС‹С….
              </label>
            </div>

            <!-- ERIP Instructions -->
            <button type="button" class="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 mb-3 border border-white/10 transition" onclick="tgUtil.alert('РРЅСЃС‚СЂСѓРєС†РёСЏ РѕРїР»Р°С‚С‹ Р•Р РРџ:\\n1. РџР»Р°С‚РµР¶Рё Рё РїРµСЂРµРІРѕРґС‹\\n2. РЎРёСЃС‚РµРјР° В«Р Р°СЃС‡РµС‚В» (Р•Р РРџ)\\n3. РРЅС‚РµСЂРЅРµС‚-РјР°РіР°Р·РёРЅС‹/СЃРµСЂРІРёСЃС‹\\n4. I -> ICE LOGIX\\n5. Р’РІРµРґРёС‚Рµ РЅРѕРјРµСЂ Р·Р°РєР°Р·Р° Рё СЃСѓРјРјСѓ РїСЂРµРґРѕРїР»Р°С‚С‹.')">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span> РРЅСЃС‚СЂСѓРєС†РёСЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р•Р РРџ
            </button>

            <button id="createOrderFinal" class="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> РћС„РѕСЂРјРёС‚СЊ Р·Р°РєР°Р·
            </button>
          </div>
        ` : '';

        return `
          <div class="glass-card page-enter">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></span> РћС„РѕСЂРјР»РµРЅРёРµ Р·Р°РєР°Р·Р°</h2>
              <button class="text-xs text-cyan-400 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition" onclick="resetOrderCountry()">
                ${window.orderCountry === 'CN' ? 'рџ‡Ёрџ‡і РљРёС‚Р°Р№' : window.orderCountry === 'PL' ? 'рџ‡µрџ‡± РџРѕР»СЊС€Р°' : 'рџ‡·рџ‡є Р РѕСЃСЃРёСЏ'} <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span> РЎРјРµРЅРёС‚СЊ
              </button>
            </div>
            
            ${vacationBanner}
            ${limitMessage}
            
            <div class="mb-4">
              <h3 class="text-sm font-semibold text-white/70 mb-2">РЎРїРёСЃРѕРє РІС‹Р±СЂР°РЅРЅС‹С… С‚РѕРІР°СЂРѕРІ:</h3>
              <div id="orderItemsList" class="flex flex-col gap-3">
                ${itemsHtml}
              </div>
            </div>
            
            <div class="flex flex-col gap-3 mt-4">
              <button type="button" class="btn-secondary w-full py-3 rounded-xl flex items-center justify-center gap-2 border border-dashed border-cyan-500/30 text-cyan-400 font-bold hover:bg-cyan-500/10 transition" onclick="startOrderAddMode()">
                <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂ
              </button>
              
              ${checkoutOptionsAndTotals}
            </div>
          </div>
          ${renderFooter()}
        `;
      }

      // Step 3 & 4: Add Product Screen
      const subMode = window.orderAddSubMode || 'link';
      return `
        <div class="glass-card page-enter">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ РЅРѕРІС‹Р№ С‚РѕРІР°СЂ</h2>
            <button class="text-xs text-white/50 hover:text-white" onclick="stopOrderAddMode()">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></span> РќР°Р·Р°Рґ Рє СЃРїРёСЃРєСѓ
            </button>
          </div>
          
          <!-- Step 3: Dual-Section Mode Selector -->
          <div class="mb-4">
            <p class="text-white/60 text-xs mb-2">Р’РІРѕРґ РґР°РЅРЅС‹С… (РµСЃР»Рё РІС‹ СЃР°РјРё РЅР°С€Р»Рё С‚РѕРІР°СЂ):</p>
            <div class="grid grid-cols-2 gap-2 mb-4">
              <button type="button" class="order-mode-btn ${subMode === 'manual' ? 'btn-primary' : 'btn-secondary'} transition text-xs font-bold py-2.5" onclick="setOrderAddSubMode('manual')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Р’СЂСѓС‡РЅСѓСЋ</button>
              <button type="button" class="order-mode-btn ${subMode === 'link' ? 'btn-primary' : 'btn-secondary'} transition text-xs font-bold py-2.5" onclick="setOrderAddSubMode('link')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> РџРѕ СЃСЃС‹Р»РєРµ / РЎРєСЂРёРЅС€РѕС‚Сѓ</button>
            </div>
            
            <p class="text-white/60 text-xs mb-2">РџРѕРёСЃРє С‚РѕРІР°СЂР° (РµСЃР»Рё С…РѕС‚РёС‚Рµ РЅР°Р№С‚Рё С‡РµСЂРµР· РР):</p>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="order-mode-btn ${subMode === 'photo' ? 'btn-primary' : 'btn-secondary'} transition text-xs font-bold py-2.5" onclick="setOrderAddSubMode('photo')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> РџРѕ С„РѕС‚Рѕ</button>
              <button type="button" class="order-mode-btn ${subMode === 'text' ? 'btn-primary' : 'btn-secondary'} transition text-xs font-bold py-2.5" onclick="setOrderAddSubMode('text')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span> РџРѕ РѕРїРёСЃР°РЅРёСЋ</button>
            </div>
          </div>
          
          <!-- Step 4: Mode Panes -->
          <!-- Link Mode Pane -->
          <div id="paneOrderLink" class="mode-pane ${subMode === 'link' ? '' : 'hidden'} mb-4">
            <label class="text-white/70 text-sm block mb-1">РЎСЃС‹Р»РєР° РЅР° С‚РѕРІР°СЂ</label>
            <div class="flex gap-2 items-stretch">
              <div class="flex-1 flex gap-1 bg-white/5 border border-white/30 rounded-xl overflow-hidden px-1.5 py-1">
                <input type="text" id="orderUrl" class="bg-transparent flex-1 border-0 outline-none p-2 text-sm text-white" placeholder="Р’СЃС‚Р°РІСЊС‚Рµ СЃСЃС‹Р»РєСѓ РЅР° Poizon, Taobao...">
                <button type="button" id="orderPasteBtn" class="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-3.5 transition flex items-center justify-center text-cyan-400 gap-1.5 text-xs font-bold" title="Р’СЃС‚Р°РІРёС‚СЊ РёР· Р±СѓС„РµСЂР°">
                  ${ix('clipboard', { size: '14px' })}
                  <span>Р’СЃС‚Р°РІРёС‚СЊ</span>
                </button>
              </div>
              <button id="analyzeOrderLinkBtn" class="btn-primary whitespace-nowrap transition flex-shrink-0"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РќР°Р№С‚Рё</button>
            </div>
            <p class="text-white/40 text-xs mt-1.5">Р•СЃР»Рё СЃСЃС‹Р»РєР° РЅРµ СЂР°СЃРїРѕР·РЅР°РµС‚СЃСЏ, РјС‹ РїСЂРµРґР»РѕР¶РёРј Р·Р°РіСЂСѓР·РёС‚СЊ СЃРєСЂРёРЅС€РѕС‚.</p>
          </div>
          
          <!-- Photo Mode Pane -->
          <div id="paneOrderPhoto" class="mode-pane ${subMode === 'photo' ? '' : 'hidden'} mb-4">
            <label class="text-white/70 text-sm block mb-1">Р¤РѕС‚Рѕ С‚РѕРІР°СЂР° (РјРѕР¶РЅРѕ РґРѕ 5)</label>
            <div id="orderPhotoUploadZone" class="screenshot-upload-zone p-4 border-2 border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:bg-white/5 transition">
              <span class="text-3xl mb-1 block"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></span>
              <span class="text-sm font-semibold block text-white">Р—Р°РіСЂСѓР·РёС‚СЊ С„РѕС‚Рѕ С‚РѕРІР°СЂР°</span>
              <span class="text-xs text-white/50 block mt-1">Р”Рѕ 5 РґРµС‚Р°Р»СЊРЅС‹С… С„РѕС‚Рѕ РґР»СЏ С‚РѕС‡РЅРѕРіРѕ РїРѕРёСЃРєР°</span>
              <input type="file" id="orderPhotoInput" accept="image/*" multiple class="hidden">
            </div>
            <div id="orderPhotoPreview" class="hidden mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2"></div>
            <label class="text-white/70 text-xs mt-2 block">РћРїРёСЃР°РЅРёРµ (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ) вЂ” СѓР»СѓС‡С€РёС‚ РїРѕРёСЃРє</label>
            <input id="orderPhotoHint" type="text" placeholder="РќР°РїСЂ. Calvin Klein zip hoodie СЃРµСЂС‹Р№ M" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm">
            <button id="orderPhotoSearchBtn" class="btn-primary w-full mt-2 transition"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РќР°Р№С‚Рё СЌС‚РѕС‚ С‚РѕРІР°СЂ</button>
          </div>
          
          <!-- Text Mode Pane -->
          <div id="paneOrderText" class="mode-pane ${subMode === 'text' ? '' : 'hidden'} mb-4">
            <label class="text-white/70 text-sm block mb-1">РћРїРёСЃР°РЅРёРµ С‚РѕРІР°СЂР°</label>
            <input type="text" id="orderTextQuery" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РќР°РїСЂРёРјРµСЂ: Nike Dunk Low Panda РєСЂРѕСЃСЃРѕРІРєРё">
            <p class="text-white/40 text-xs mt-1">РР СЂР°СЃРїРѕР·РЅР°РµС‚ Р±СЂРµРЅРґ, РјРѕРґРµР»СЊ Рё РєР°С‚РµРіРѕСЂРёСЋ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.</p>
            <button id="orderTextSearchBtn" class="btn-primary w-full mt-2 transition"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РСЃРєР°С‚СЊ С‚РѕРІР°СЂ</button>
          </div>
          
          <!-- Shared Search Results Box -->
          <div id="orderSearchResults" class="hidden mb-4 bg-white/5 p-3 rounded-xl"></div>
          <div id="orderScreenshotWidget" class="hidden mb-4 bg-white/5 p-3 rounded-xl"></div>
          
          <!-- Restructured Form: manually inputs / parsed results -->
          <div id="orderManualForm" class="mt-4 border-t border-white/10 pt-4">
            <!-- URL -->
            <div class="mb-3">
              <label class="text-white/70 text-sm block mb-1">РЎСЃС‹Р»РєР° РЅР° С‚РѕРІР°СЂ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</label>
              <input type="text" id="orderUrlManual" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="https://poizon.com/...">
            </div>
            
            <!-- Multi-Photo Dropzone for Manual upload -->
            <div class="mb-3">
              <label class="text-white/70 text-sm block mb-1">Р¤РѕС‚Рѕ С‚РѕРІР°СЂР° (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</label>
              <div id="orderManualPhotoUploadZone" class="screenshot-upload-zone p-3 border border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:bg-white/5 transition">
                <span class="text-sm text-white/70"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р—Р°РіСЂСѓР·РёС‚СЊ СЃРєСЂРёРЅС€РѕС‚ / С„РѕС‚Рѕ С‚РѕРІР°СЂР°</span>
                <input type="file" id="orderManualPhotoInput" accept="image/*" multiple class="hidden">
              </div>
              <div id="orderManualPhotoPreview" class="hidden mt-2 grid grid-cols-3 gap-2"></div>
            </div>
            
            <!-- Title Group -->
            <div class="bg-white/5 p-3 rounded-2xl mb-3">
              <p class="text-white/60 text-xs mb-2">РќР°Р·РІР°РЅРёРµ С‚РѕРІР°СЂР°:</p>
              <div class="mb-2">
                <label class="text-white/50 text-xs block mb-0.5">Р‘СЂРµРЅРґ</label>
                <input type="text" id="orderBrand" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РќР°РїСЂРёРјРµСЂ: Nike, Adidas, Stone Island">
              </div>
              <div class="mb-2">
                <label class="text-white/50 text-xs block mb-0.5">РњРѕРґРµР»СЊ</label>
                <input type="text" id="orderModel" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РќР°РїСЂРёРјРµСЂ: Air Force 1, Yeezy 350">
              </div>
              <div>
                <label class="text-white/50 text-xs block mb-0.5">РћСЃРѕР±РµРЅРЅРѕСЃС‚Рё</label>
                <input type="text" id="orderFeatures" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РќР°РїСЂРёРјРµСЂ: СЃРІРµС‚РѕРѕС‚СЂР°Р¶Р°СЋС‰РёРµ С€РЅСѓСЂРєРё, Р»РёРјРёС‚РёСЂРѕРІР°РЅРЅР°СЏ СЃРµСЂРёСЏ">
              </div>
            </div>
            
            <!-- Description Group -->
            <div class="bg-white/5 p-3 rounded-2xl mb-3">
              <p class="text-white/60 text-xs mb-2">РћРїРёСЃР°РЅРёРµ Рё РҐР°СЂР°РєС‚РµСЂРёСЃС‚РёРєРё:</p>
              
              <!-- Gender Chips selection -->
              <div class="mb-3">
                <label class="text-white/50 text-xs block mb-1">РџРѕР»</label>
                <div class="flex gap-2" id="orderGenderSelector">
                  <button type="button" data-gender="male" class="filter-chip flex-1 py-2 text-center text-xs border border-white/10 hover:bg-white/5 transition" onclick="selectOrderGender('male')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span> РњСѓР¶СЃРєРѕР№</button>
                  <button type="button" data-gender="female" class="filter-chip flex-1 py-2 text-center text-xs border border-white/10 hover:bg-white/5 transition" onclick="selectOrderGender('female')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span> Р–РµРЅСЃРєРёР№</button>
                  <button type="button" data-gender="unisex" class="filter-chip flex-1 py-2 text-center text-xs border border-white/10 hover:bg-white/5 transition" onclick="selectOrderGender('unisex')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span> РЈРЅРёСЃРµРєСЃ</button>
                  <input type="hidden" id="orderGender" value="">
                </div>
              </div>
              
              <!-- Category Single-line Dropdown -->
              <div class="mb-3">
                <label class="text-white/50 text-xs block mb-1">РљР°С‚РµРіРѕСЂРёСЏ</label>
                <select id="orderCategory" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm mb-1">${renderCategoryOptions()}</select>
                <p id="orderCategoryHint" class="text-cyan-400 text-[10px] hidden mb-2 font-semibold ml-1">рџ’Ў РћР±С‹С‡РЅРѕ РІРµСЃРёС‚ ~1.2 РєРі</p>
              </div>
              
              <!-- Color & Size -->
              <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label class="text-white/50 text-xs block mb-0.5">Р¦РІРµС‚</label>
                  <input type="text" id="orderColor" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РќР°РїСЂ. Р§РµСЂРЅС‹Р№">
                </div>
                <div>
                  <div class="flex justify-between items-center mb-0.5">
                    <label class="text-white/50 text-xs block">Р Р°Р·РјРµСЂ</label>
                    <button type="button" class="text-[9px] text-cyan-400 flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded hover:bg-white/10 transition" onclick="showSizeTablesModal()">
                      РўР°Р±Р»РёС†Р°
                    </button>
                  </div>
                  <input type="text" id="orderSize" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РќР°РїСЂ. US 9, EU 42.5">
                </div>
              </div>
              
              <!-- Sizing helper inputs block -->
              <div class="border border-cyan-500/20 bg-cyan-500/5 p-3 rounded-xl">
                <p class="text-cyan-400 text-xs font-bold mb-1 flex items-center gap-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 21H3L21 3v18z"/><path d="M15 15l2-2"/><path d="M11 19l2-2"/><path d="M13 13l2-2"/></svg></span> Р’РІРѕРґ Р·Р°РјРµСЂРѕРІ РґР»СЏ РР-РїРѕРґР±РѕСЂР° СЂР°Р·РјРµСЂР° (Р РµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ)</p>
                <p class="text-white/50 text-[10px] mb-2">РќР°С€ РїР°СЂС‚РЅРµСЂ РїРѕРґР±РµСЂРµС‚ СЂР°Р·РјРµСЂ РёРґРµР°Р»СЊРЅРѕ РЅР° РѕСЃРЅРѕРІРµ СЌС‚РёС… РґР°РЅРЅС‹С…</p>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-white/40 text-[9px] block">Р РѕСЃС‚ (СЃРј)</label>
                    <input type="number" id="orderHeight" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg" placeholder="180">
                  </div>
                  <div>
                    <label class="text-white/40 text-[9px] block">Р’РµСЃ (РєРі)</label>
                    <input type="number" id="orderWeightKg" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg" placeholder="75">
                  </div>
                  <div>
                    <label class="text-white/40 text-[9px] block">РЎС‚РµР»СЊРєР° / РћР±С…РІР°С‚ (СЃРј)</label>
                    <input type="number" id="orderMeasure" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg" placeholder="27">
                  </div>
                </div>
                
                <!-- Sanction Detector Banner (Hidden by default) -->
                <div id="sanctionBanner" class="mt-3 p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-xs text-white/90 hidden">
                  <p class="text-orange-400 font-bold flex items-center gap-1">
                    <span>вљ пёЏ Р’РЅРёРјР°РЅРёРµ: РЎР°РЅРєС†РёРѕРЅРЅС‹Р№ Р±СЂРµРЅРґ</span>
                  </p>
                  <p class="mt-1 font-medium text-white/80">РўРѕРІР°СЂС‹ СЌС‚РѕРіРѕ Р±СЂРµРЅРґР° РјРѕРіСѓС‚ Р±С‹С‚СЊ Р·Р°РґРµСЂР¶Р°РЅС‹ С‚Р°РјРѕР¶РЅРµР№ Р•РЎ. РќР°С€ РјРµРЅРµРґР¶РµСЂ РїСЂРѕРІРµСЂРёС‚ РІРѕР·РјРѕР¶РЅРѕСЃС‚СЊ С‚СЂР°РЅР·РёС‚Р° РїРѕСЃР»Рµ РѕС„РѕСЂРјР»РµРЅРёСЏ Р·Р°РєР°Р·Р°.</p>
                </div>
                
                <div id="aiSizeAdvisorBanner" class="mt-3 p-3 rounded-xl border border-violet-500/30 bg-violet-500/10 text-xs text-white/80 hidden cursor-pointer">
                  <p class="text-violet-400 font-bold flex items-center gap-1">
                    <span>рџ”® РР-РЎРѕРІРµС‚РЅРёРє РїРѕ СЂР°Р·РјРµСЂСѓ</span>
                  </p>
                  <p class="mt-1 font-medium" id="aiSizeAdvisorText">Р РµРєРѕРјРµРЅРґСѓРµРј РІР°Рј СЂР°Р·РјРµСЂ ... РЅР° РѕСЃРЅРѕРІРµ РІР°С€РёС… Р·Р°РјРµСЂРѕРІ.</p>
                  <p class="text-white/40 text-[9px] mt-1 leading-normal">вњЁ РќР°Р¶РјРёС‚Рµ, С‡С‚РѕР±С‹ РїСЂРёРјРµРЅРёС‚СЊ СЂРµРєРѕРјРµРЅРґРѕРІР°РЅРЅС‹Р№ СЂР°Р·РјРµСЂ</p>
                </div>
              </div>
            </div>
            
            
            <!-- Product Weight -->
            <div class="mb-4">
              <label class="text-white/70 text-sm block">Р’РµСЃ С‚РѕРІР°СЂР° (РєРі) <span class="text-white/40 text-xs">- РІР»РёСЏРµС‚ РЅР° СЃС‚РѕРёРјРѕСЃС‚СЊ РґРѕСЃС‚Р°РІРєРё</span></label>
              <div class="flex items-center gap-3 mt-1">
                <input type="range" id="orderWeight" min="0.1" max="30" step="0.1" value="1" class="flex-1 accent-cyan-500">
                <span id="orderWeightVal" class="text-white/80 bg-white/10 px-3 py-1 rounded-full whitespace-nowrap text-xs font-bold">1.0 РєРі</span>
              </div>
            </div>

            <!-- Price & Currency combined in a single row -->
            <div class="mb-4">
              <label class="text-white/70 text-sm block mb-1">Р¦РµРЅР° СЃ РІР°Р»СЋС‚РѕР№</label>
              <div class="flex gap-2">
                <div class="flex-[3]">
                  <input type="number" id="orderPrice" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="РЈРєР°Р¶РёС‚Рµ С†РµРЅСѓ С‚РѕРІР°СЂР°">
                </div>
                <div class="flex-[1]">
                  <select id="orderCurrency" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" style="padding: 14px 10px !important;">
                    <option value="CNY">CNY (ВҐ)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (в‚¬)</option>
                    <option value="PLN">PLN (zЕ‚)</option>
                    <option value="RUB">RUB (в‚Ѕ)</option>
                    <option value="BYN">BYN (Br)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="flex flex-col gap-2 mt-4">
              <button id="orderSaveItemBtn" class="btn-primary w-full py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2">
                <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂ РІ Р·Р°РєР°Р·
              </button>

            </div>
          </div>
        </div>
        ${renderFooter()}
      `;
    }

    function attachNewOrderHandlers() {
      if (!window.orderCountry) return;


      const orderResultsBox = document.getElementById('orderSearchResults');

      function setOrderMode(mode) {
        document.querySelectorAll('.order-mode-btn').forEach((btn) => {
          if (btn.getAttribute('onclick')?.includes(mode) || btn.classList.contains('active')) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
          } else {
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
          }
        });
        const panes = document.querySelectorAll('.mode-pane');
        panes.forEach((pane) => {
          if (pane.id === 'paneOrder' + mode.charAt(0).toUpperCase() + mode.slice(1)) {
            pane.classList.remove('hidden');
          } else {
            pane.classList.add('hidden');
          }
        });
        if ((mode === 'manual' || mode === 'link') && orderResultsBox) {
          orderResultsBox.classList.add('hidden');
          orderResultsBox.innerHTML = '';
        }
      }

      if (!window.orderAddMode) {
        // --- STEP 2: CHECKOUT HANDLERS ---
        const extraPhotoInp = document.getElementById('orderExtraPhoto');
        const extraMeasureInp = document.getElementById('orderExtraMeasure');
        const keepBoxInp = document.getElementById('orderKeepBox');

        if (extraPhotoInp) {
          extraPhotoInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.extraPhoto = extraPhotoInp.checked;
            recalculateOrderTotals();
          });
        }
        if (extraMeasureInp) {
          extraMeasureInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.extraMeasure = extraMeasureInp.checked;
            recalculateOrderTotals();
          });
        }
        if (keepBoxInp) {
          keepBoxInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.keepBox = keepBoxInp.checked;
            recalculateOrderTotals();
          });
        }
        const videoCheckInp = document.getElementById('orderRequiresVideoCheck');
        if (videoCheckInp) {
          videoCheckInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.requiresVideoCheck = videoCheckInp.checked;
            recalculateOrderTotals();
          });
        }

        // PVS Selection Handlers
        const pvsMethodSelect = document.getElementById('pvsMethodSelect');
        const pvsCitySelect = document.getElementById('pvsCitySelect');
        const pvsPointSelect = document.getElementById('pvsPointSelect');
        const pvsDetailContainer = document.getElementById('pvsDetailContainer');
        const orderUseFreeDelivery = document.getElementById('orderUseFreeDelivery');

        const PVS_DATA = {
          europoshta: {
            'РњРёРЅСЃРє': ['РћС‚РґРµР»РµРЅРёРµ в„–1 (РїСЂ-С‚ РќРµР·Р°РІРёСЃРёРјРѕСЃС‚Рё, 10)', 'РћС‚РґРµР»РµРЅРёРµ в„–5 (СѓР». РџСЂРёС‚С‹С†РєРѕРіРѕ, 29)', 'РћС‚РґРµР»РµРЅРёРµ в„–12 (СѓР». РќРµРјРёРіР°, 3)', 'РћС‚РґРµР»РµРЅРёРµ в„–30 (РїСЂ-С‚ Р”Р·РµСЂР¶РёРЅСЃРєРѕРіРѕ, 104)'],
            'Р“РѕРјРµР»СЊ': ['РћС‚РґРµР»РµРЅРёРµ в„–2 (СѓР». РЎРѕРІРµС‚СЃРєР°СЏ, 97)', 'РћС‚РґРµР»РµРЅРёРµ в„–8 (СѓР». РҐР°С‚Р°РµРІРёС‡Р°, 9)', 'РћС‚РґРµР»РµРЅРёРµ в„–14 (РїСЂ-С‚ Р РµС‡РёС†РєРёР№, 5Р’)'],
            'Р‘СЂРµСЃС‚': ['РћС‚РґРµР»РµРЅРёРµ в„–3 (СѓР». РњРѕСЃРєРѕРІСЃРєР°СЏ, 210)', 'РћС‚РґРµР»РµРЅРёРµ в„–7 (СѓР». РџСѓС€РєРёРЅСЃРєР°СЏ, 16)', 'РћС‚РґРµР»РµРЅРёРµ в„–11 (РїСЂ-С‚ РњР°С€РµСЂРѕРІР°, 17)'],
            'Р“СЂРѕРґРЅРѕ': ['РћС‚РґРµР»РµРЅРёРµ в„–4 (СѓР». РЎРѕРІРµС‚СЃРєР°СЏ, 18)', 'РћС‚РґРµР»РµРЅРёРµ в„–9 (СѓР». Р“РѕСЂСЊРєРѕРіРѕ, 91)', 'РћС‚РґРµР»РµРЅРёРµ в„–15 (РїСЂ-С‚ РљР»РµС†РєРѕРІР°, 15)'],
            'Р’РёС‚РµР±СЃРє': ['РћС‚РґРµР»РµРЅРёРµ в„–6 (СѓР». Р›РµРЅРёРЅР°, 26)', 'РћС‚РґРµР»РµРЅРёРµ в„–10 (РїСЂ-С‚ РЎС‚СЂРѕРёС‚РµР»РµР№, 1)', 'РћС‚РґРµР»РµРЅРёРµ в„–16 (СѓР». Р§РєР°Р»РѕРІР°, 35)'],
            'РњРѕРіРёР»РµРІ': ['РћС‚РґРµР»РµРЅРёРµ в„–1 (СѓР». РџРµСЂРІРѕРјР°Р№СЃРєР°СЏ, 57)', 'РћС‚РґРµР»РµРЅРёРµ в„–5 (РїСЂ-С‚ РџСѓС€РєРёРЅСЃРєРёР№, 30)', 'РћС‚РґРµР»РµРЅРёРµ в„–12 (СѓР». РћСЃС‚СЂРѕРІСЃРєРѕРіРѕ, 5)'],
            'default': ['Р¦РµРЅС‚СЂР°Р»СЊРЅРѕРµ РѕС‚РґРµР»РµРЅРёРµ']
          },
          sdek: {
            'РњРёРЅСЃРє': ['РџР’Р— РЎР”Р­Рљ (РїСЂ-С‚ Р”Р·РµСЂР¶РёРЅСЃРєРѕРіРѕ, 11)', 'РџР’Р— РЎР”Р­Рљ (СѓР». РљСѓР№Р±С‹С€РµРІР°, 40)', 'РџР’Р— РЎР”Р­Рљ (СѓР». Р›РѕР±Р°РЅРєР°, 14)', 'РџР’Р— РЎР”Р­Рљ (РїСЂ-С‚ РџРѕР±РµРґРёС‚РµР»РµР№, 65)'],
            'Р“РѕРјРµР»СЊ': ['РџР’Р— РЎР”Р­Рљ (СѓР». РРЅС‚РµСЂРЅР°С†РёРѕРЅР°Р»СЊРЅР°СЏ, 13)', 'РџР’Р— РЎР”Р­Рљ (СѓР». РљРёСЂРѕРІР°, 90)'],
            'Р‘СЂРµСЃС‚': ['РџР’Р— РЎР”Р­Рљ (СѓР». Р“РѕРіРѕР»СЏ, 65)', 'РџР’Р— РЎР”Р­Рљ (СѓР». РљСѓР№Р±С‹С€РµРІР°, 9)'],
            'Р“СЂРѕРґРЅРѕ': ['РџР’Р— РЎР”Р­Рљ (СѓР». РљР°СЂР»Р° РњР°СЂРєСЃР°, 30)', 'РџР’Р— РЎР”Р­Рљ (СѓР». РџРѕР»РёРіСЂР°С„РёСЃС‚РѕРІ, 2Рђ)'],
            'Р’РёС‚РµР±СЃРє': ['РџР’Р— РЎР”Р­Рљ (РїСЂ-С‚ Р§РµСЂРЅСЏС…РѕРІСЃРєРѕРіРѕ, 5)', 'РџР’Р— РЎР”Р­Рљ (СѓР». РџСЂР°РІРґС‹, 64Рђ)'],
            'РњРѕРіРёР»РµРІ': ['РџР’Р— РЎР”Р­Рљ (СѓР». РџРёРѕРЅРµСЂСЃРєР°СЏ, 12)', 'РџР’Р— РЎР”Р­Рљ (РїСЂ-С‚ РњРёСЂР°, 6)'],
            'default': ['Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№ РџР’Р— РЎР”Р­Рљ']
          },
          belpochta: {
            'РњРёРЅСЃРє': ['Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚ (РїСЂ-С‚ РќРµР·Р°РІРёСЃРёРјРѕСЃС‚Рё, 10)', 'РћС‚РґРµР»РµРЅРёРµ 220030 (СѓР». Р­РЅРіРµР»СЊСЃР°, 14)', 'РћС‚РґРµР»РµРЅРёРµ 220004 (СѓР». РљР°Р»СЊРІР°СЂРёР№СЃРєР°СЏ, 25)'],
            'Р“РѕРјРµР»СЊ': ['Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚ (СѓР». РљСѓСЂС‡Р°С‚РѕРІР°, 2)', 'РћС‚РґРµР»РµРЅРёРµ 246050 (СѓР». РЎРѕРІРµС‚СЃРєР°СЏ, 8)'],
            'Р‘СЂРµСЃС‚': ['Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚ (РїСЂ-С‚ РњР°С€РµСЂРѕРІР°, 32)', 'РћС‚РґРµР»РµРЅРёРµ 224005 (СѓР». РџСѓС€РєРёРЅСЃРєР°СЏ, 1)'],
            'Р“СЂРѕРґРЅРѕ': ['Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚ (СѓР». РљР°СЂР»Р° РњР°СЂРєСЃР°, 29)', 'РћС‚РґРµР»РµРЅРёРµ 230023 (СѓР». РћР¶РµС€РєРѕ, 9)'],
            'Р’РёС‚РµР±СЃРє': ['Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚ (РїСЂ-С‚ РњРѕСЃРєРѕРІСЃРєРёР№, 10)', 'РћС‚РґРµР»РµРЅРёРµ 210015 (СѓР». Р›РµРЅРёРЅР°, 12)'],
            'РњРѕРіРёР»РµРІ': ['Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚ (СѓР». РџРµСЂРІРѕРјР°Р№СЃРєР°СЏ, 28)', 'РћС‚РґРµР»РµРЅРёРµ 212030 (СѓР». Р›РµРЅРёРЅСЃРєР°СЏ, 1)'],
            'default': ['Р“Р»Р°РІРїРѕС‡С‚Р°РјС‚']
          }
        };

        const populatePvsPoints = () => {
          const method = pvsMethodSelect?.value || 'none';
          const city = pvsCitySelect?.value || 'РњРёРЅСЃРє';
          if (!pvsPointSelect) return;
          
          if (method === 'none' || method === 'pickup') {
            if (pvsDetailContainer) pvsDetailContainer.classList.add('hidden');
            if (window.tempOrder) {
              window.tempOrder.pvs = { method: method, city: '', point: '', cost: 0 };
            }
            return;
          }
          
          if (pvsDetailContainer) pvsDetailContainer.classList.remove('hidden');
          
          const list = PVS_DATA[method]?.[city] || PVS_DATA[method]?.['default'] || ['РћСЃРЅРѕРІРЅРѕРµ РѕС‚РґРµР»РµРЅРёРµ'];
          const currentSavedPoint = window.tempOrder?.pvs?.point;
          
          pvsPointSelect.innerHTML = list.map(p => `
            <option value="${p}" ${currentSavedPoint === p ? 'selected' : ''}>${p}</option>
          `).join('');
          
          window.tempOrder.pvs = {
            method: method,
            city: city,
            point: pvsPointSelect.value,
            cost: 0 // Will be dynamically calculated in recalculateOrderTotals
          };
        };

        if (pvsMethodSelect) {
          pvsMethodSelect.addEventListener('change', () => {
            populatePvsPoints();
            recalculateOrderTotals();
          });
        }
        if (pvsCitySelect) {
          pvsCitySelect.addEventListener('change', () => {
            populatePvsPoints();
            recalculateOrderTotals();
          });
        }
        if (pvsPointSelect) {
          pvsPointSelect.addEventListener('change', () => {
            if (window.tempOrder?.pvs) {
              window.tempOrder.pvs.point = pvsPointSelect.value;
            }
            recalculateOrderTotals();
          });
        }
        if (orderUseFreeDelivery) {
          orderUseFreeDelivery.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.useFreeDelivery = orderUseFreeDelivery.checked;
            recalculateOrderTotals();
          });
        }
        
        const isGiftInp = document.getElementById('orderIsGift');
        if (isGiftInp) {
          isGiftInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.isGift = isGiftInp.checked;
          });
        }
        
        // Sanction Check Handlers
        const sanBrands = ['dyson', 'sony', 'apple', 'zara', 'h&m', 'massimo dutti', 'samsung', 'playstation', 'xbox'];
        const orderNameInput = document.getElementById('orderName');
        const orderUrlInput = document.getElementById('orderUrl');
        const checkSanctions = () => {
          if (!document.getElementById('sanctionBanner')) return;
          const txt = ((orderNameInput?.value || '') + ' ' + (orderUrlInput?.value || '')).toLowerCase();
          // Check only if it's from Europe (PL or EU mode)
          if (window.orderCountry === 'PL' || window.orderCountry === 'EU') {
            const hasSanction = sanBrands.some(b => txt.includes(b));
            if (hasSanction) {
              document.getElementById('sanctionBanner').classList.remove('hidden');
            } else {
              document.getElementById('sanctionBanner').classList.add('hidden');
            }
          } else {
            document.getElementById('sanctionBanner').classList.add('hidden');
          }
        };
        if (orderNameInput) orderNameInput.addEventListener('input', checkSanctions);
        if (orderUrlInput) orderUrlInput.addEventListener('input', checkSanctions);

        populatePvsPoints();
        recalculateOrderTotals();

        // Promo code application
        const promoInput = document.getElementById('promoCode');
        const applyPromoBtn = document.getElementById('applyPromoBtn');
        const promoMessage = document.getElementById('promoMessage');

        if (applyPromoBtn) {
          applyPromoBtn.onclick = async () => {
            const code = promoInput?.value.trim().toUpperCase();
            if (!code) {
              promoMessage.innerText = 'Р’РІРµРґРёС‚Рµ РєРѕРґ';
              promoMessage.classList.remove('hidden');
              return;
            }

            try {
              const { data, error } = await supabaseClient
                .from('promocodes')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .maybeSingle();

              if (error) {
                promoMessage.innerText = 'РћС€РёР±РєР° РїСЂРѕРІРµСЂРєРё РєРѕРґР°';
                promoMessage.classList.remove('hidden');
                console.error(error);
                return;
              }
              if (!data) {
                promoMessage.innerText = 'РќРµРІРµСЂРЅС‹Р№ РёР»Рё РЅРµР°РєС‚РёРІРЅС‹Р№ РїСЂРѕРјРѕРєРѕРґ';
                promoMessage.classList.remove('hidden');
                return;
              }

              let discountAmount = 0;
              if (data.discount_type === 'percent') {
                discountAmount = window.tempOrder.total * (data.discount_value / 100);
              } else {
                discountAmount = data.discount_value;
              }
              if (discountAmount > window.tempOrder.total) discountAmount = window.tempOrder.total;

              window.tempOrder.discountAmount = discountAmount;
              window.tempOrder.appliedPromo = data;
              recalculateOrderTotals();
              
              promoMessage.innerHTML = `РџСЂРѕРјРѕРєРѕРґ РїСЂРёРјРµРЅС‘РЅ! РЎРєРёРґРєР°: ${discountAmount.toFixed(2)} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span>`;
              promoMessage.classList.remove('hidden');
              promoMessage.style.color = '#4ade80';
            } catch (err) {
              promoMessage.innerText = 'РћС€РёР±РєР°: ' + err.message;
              promoMessage.classList.remove('hidden');
            }
          };
        }

        
        const orderSlider = document.getElementById('orderWeight');
        const orderNumericInput = document.getElementById('orderWeightInput');

        const updateOrderWeight = (val, source) => {
          let num = parseFloat(val);
          if (isNaN(num)) return;
          num = Math.max(0.1, Math.min(30, num));

          if (source !== 'slider' && orderSlider) orderSlider.value = num;
          if (source !== 'input' && orderNumericInput) orderNumericInput.value = num.toFixed(1);

          if (window.tempOrder && window.tempOrder.items && window.tempOrder.items[0]) {
            window.tempOrder.items[0].weight = num;
          }
          // Recalculate totals
          recalculateOrderTotals();
        };

        if (orderSlider) {
          orderSlider.oninput = () => {
            updateOrderWeight(orderSlider.value, 'slider');
          };
        }
        if (orderNumericInput) {
          orderNumericInput.oninput = () => {
            updateOrderWeight(orderNumericInput.value, 'input');
          };
        }

        // Submit final order to Supabase
        const createBtn = document.getElementById('createOrderFinal');
        if (createBtn) {
          createBtn.onclick = async () => {
            if (!window.tempOrder || !userId) { tgUtil.alert('РћС€РёР±РєР°: Р°РІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ РёР»Рё Р·Р°РїРѕР»РЅРёС‚Рµ РїРѕР»СЏ'); return; }
            if (!window.tempOrder.items || window.tempOrder.items.length === 0) { tgUtil.alert('Р”РѕР±Р°РІСЊС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ С‚РѕРІР°СЂ РІ Р·Р°РєР°Р·'); return; }

            const agreeOffer = document.getElementById('agreeOffer');
            if (agreeOffer && !agreeOffer.checked) {
              tgUtil.alert('Р’С‹ РґРѕР»Р¶РЅС‹ РїСЂРёРЅСЏС‚СЊ СѓСЃР»РѕРІРёСЏ РїСѓР±Р»РёС‡РЅРѕР№ РѕС„РµСЂС‚С‹');
              return;
            }

            const agreeCommissionContract = document.getElementById('agreeCommissionContract');
            if (agreeCommissionContract && !agreeCommissionContract.checked) {
              tgUtil.alert('Р’С‹ РґРѕР»Р¶РЅС‹ РїРѕРґРїРёСЃР°С‚СЊ Р”РѕРіРѕРІРѕСЂ РєРѕРјРёСЃСЃРёРё Р±Р°Р№РµСЂР°');
              return;
            }

            const agreeDeliveryRules = document.getElementById('agreeDeliveryRules');
            if (agreeDeliveryRules && !agreeDeliveryRules.checked) {
              tgUtil.alert('Р’С‹ РґРѕР»Р¶РЅС‹ СЃРѕРіР»Р°СЃРёС‚СЊСЃСЏ СЃ РїСЂР°РІРёР»Р°РјРё РґРѕСЃС‚Р°РІРєРё');
              return;
            }

            if (window.tempOrder?.useCustomsSplit && !window.tempOrder?.customsSplitRecipientId) {
              tgUtil.alert('Р’С‹Р±РµСЂРёС‚Рµ РІС‚РѕСЂРѕРіРѕ РїРѕР»СѓС‡Р°С‚РµР»СЏ РґР»СЏ СЂР°Р·РґРµР»РµРЅРёСЏ РїРѕСЃС‹Р»РєРё.');
              return;
            }

            const consolidatedOrder = {
              price: window.tempOrder.price || 0,
              currency: window.tempOrder.items?.[0]?.currency || 'CNY',
              weight: document.getElementById('orderWeight') ? parseFloat(document.getElementById('orderWeight').value) : (window.tempOrder.weight || 1),
              category: window.tempOrder.items?.[0]?.category || '',
              country: window.orderCountry,
              url: window.tempOrder.items?.[0]?.url || '',
            };

            const validationErrors = validateOrderBeforeSubmit(consolidatedOrder);
            if (validationErrors.length) {
              tgUtil.haptic('warning');
              tgUtil.alert('РџСЂРѕРІРµСЂСЊС‚Рµ Р·Р°РєР°Р·:\\nвЂў ' + validationErrors.join('\\nвЂў '));
              return;
            }

            const aggregatedOrderForPreview = {
              ...window.tempOrder,
              title: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].title : `${window.tempOrder.items.length} С‚РѕРІР°СЂРѕРІ`,
              brand: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].brand : '',
              marketplaceName: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].marketplace_name : '',
              size: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].size : '',
              price: window.tempOrder.price,
              currency: consolidatedOrder.currency,
              weight: window.tempOrder.weight,
              total_byn: window.tempOrder.total_byn
            };

            const confirmed = await showOrderPreviewModal(aggregatedOrderForPreview);
            if (!confirmed) return;

            try {
              const bk = window.tempOrder.breakdown || {};
              const pvs = window.tempOrder.pvs || { method: 'none' };
              let pvsAddress = '';
              if (pvs.method !== 'none') {
                pvsAddress = `${pvs.method === 'europoshta' ? 'Р•РІСЂРѕРїРѕС‡С‚Р°' : pvs.method === 'sdek' ? 'РЎР”Р­Рљ' : 'Р‘РµР»РїРѕС‡С‚Р°'} | ${pvs.city} | ${pvs.point}`;
              }
              if (window.tempOrder?.useCustomsSplit && window.tempOrder?.customsSplitRecipientName) {
                const secName = window.tempOrder.customsSplitRecipientName;
                pvsAddress = pvsAddress 
                  ? `${pvsAddress} | рџ›ЎпёЏ Р РђР—Р”Р•Р›Р•РќРР•: ${secName}`
                  : `РЎР°РјРѕРІС‹РІРѕР· | рџ›ЎпёЏ Р РђР—Р”Р•Р›Р•РќРР•: ${secName}`;
              }
              if (window.tempOrder?.isGift) {
                pvsAddress = pvsAddress ? `${pvsAddress} | рџЋЃ РџРћР”РђР РћРљ (РЎРєСЂС‹С‚СЊ С‚РѕРІР°СЂ)` : `рџЋЃ РџРћР”РђР РћРљ (РЎРєСЂС‹С‚СЊ С‚РѕРІР°СЂ)`;
              }

              const fam = window.userSettings?.family || {};
              const isFamilyMember = fam.role === 'member' && fam.head_id;

              const { data, error } = await supabaseClient.from('orders').insert({
                user_id: userId,
                source_url: consolidatedOrder.url,
                items: window.tempOrder.items,
                cart_items: window.tempOrder.items,
                weight_estimated: window.tempOrder.weight || 1,
                price_original: window.tempOrder.price || 0,
                price_byn: bk.product_cost_byn ?? (window.tempOrder.price * 0.45),
                delivery_cost_estimated: bk.delivery_cost_byn ?? (window.tempOrder.weight * 12),
                commission_byn: bk.commission_byn || 0,
                insurance_byn: bk.insurance_byn || 0,
                legit_check_byn: 0,
                customs_duty_byn: bk.customs_duty_byn || 0,
                currency_buffer_byn: bk.currency_buffer_byn || 0,
                extra_services: {
                  extra_photo: window.tempOrder.extraPhoto || false,
                  extra_measure: window.tempOrder.extraMeasure || false,
                  is_gift: window.tempOrder.isGift || false
                },
                total_byn: window.tempOrder.total_byn,
                requires_video_check: window.tempOrder.requiresVideoCheck || false,
                delivery_days_min: null,
                delivery_days_max: null,
                source_country: window.orderCountry,
                product_currency: consolidatedOrder.currency,
                prepayment_amount: window.tempOrder.total_byn * 0.70,
                status: 'pending',
                auto_cancel_reason: isFamilyMember ? 'family_approval_pending' : null,
                discount_applied: window.tempOrder.discountAmount || 0,
                promo_code: window.tempOrder.appliedPromo?.code || null,
                tracking_number_by: pvsAddress || null
              }).select();

              if (error) throw error;

              // Consume free delivery token if checked
              if (window.tempOrder.useFreeDelivery && window.userSettings?.free_delivery_tokens > 0) {
                const updatedSettings = {
                  ...window.userSettings,
                  free_delivery_tokens: window.userSettings.free_delivery_tokens - 1
                };
                await supabaseClient.from('users').update({ settings: updatedSettings }).eq('user_id', userId);
                window.userSettings = updatedSettings;
              }

              let reqStr = '';
              if (window.appSettings && window.appSettings.payment_requisites) {
                const reqs = window.appSettings.payment_requisites;
                if (reqs.card) reqStr += `\\nрџ’і РљР°СЂС‚Р°: ${reqs.card}`;
                if (reqs.erip) reqStr += `\\nрџЏ¦ Р•Р РРџ: ${reqs.erip}`;
                if (reqs.crypto) reqStr += `\\nрџЄ™ РљСЂРёРїС‚Р°: ${reqs.crypto}`;
              }
              if (reqStr) {
                reqStr = '\\n\\nР РµРєРІРёР·РёС‚С‹ РґР»СЏ РѕРїР»Р°С‚С‹:' + reqStr;
              } else {
                reqStr = '\\n\\n(Р РµРєРІРёР·РёС‚С‹ Р±СѓРґСѓС‚ РѕС‚РїСЂР°РІР»РµРЅС‹ РјРµРЅРµРґР¶РµСЂРѕРј)';
              }

              tgUtil.haptic('success');
              tgUtil.alert(`Р—Р°РєР°Р· СЃРѕР·РґР°РЅ! РќРѕРјРµСЂ: ${data[0].id}.\\nРЎСѓРјРјР° РїСЂРµРґРѕРїР»Р°С‚С‹: ${(window.tempOrder.total_byn * 0.70).toFixed(2)} BYN${reqStr}`);

              const cartIds = window.tempOrder.items.map(item => item.cartId).filter(Boolean);
              if (cartIds.length > 0) {
                await supabaseClient.from('cart').delete().in('id', cartIds);
                await updateCartBadge();
              }

              if (!userLimits.isTrusted) {
                await supabaseClient.from('users').update({ is_trusted: true }).eq('user_id', userId);
                userLimits.isTrusted = true;
                tgUtil.alert('вњ… РџРѕР·РґСЂР°РІР»СЏРµРј СЃ РїРµСЂРІС‹Рј Р·Р°РєР°Р·РѕРј! Р›РёРјРёС‚ РЅР° СЂР°СЃС‡С‘С‚С‹ СѓРІРµР»РёС‡РµРЅ РґРѕ 100 РІ РґРµРЅСЊ.');
              }

              window.tempOrder = null;
              window.orderCountry = null;
              switchTab('home');
            } catch (err) {
              tgUtil.haptic('error');
              tgUtil.alert('РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ Р·Р°РєР°Р·Р°: ' + err.message);
            }
          };
        }
      } else {
        // --- STEP 4: ADD PRODUCT FORM HANDLERS ---
        if (window.userSizing) {
          const h = document.getElementById('orderHeight');
          const w = document.getElementById('orderWeightKg');
          const m = document.getElementById('orderMeasure');
          if (h && window.userSizing.height) h.value = window.userSizing.height;
          if (w && window.userSizing.weight) w.value = window.userSizing.weight;
          if (m && window.userSizing.measure) m.value = window.userSizing.measure;
        }

        // New Order Size Advisor logic
        const updateAiSizeAdvice = () => {
          const category = document.getElementById('orderCategory')?.value || '';
          const brand = document.getElementById('orderBrand')?.value || '';
          const height = document.getElementById('orderHeight')?.value || '';
          const weight = document.getElementById('orderWeightKg')?.value || '';
          const measure = document.getElementById('orderMeasure')?.value || '';
          
          const advice = getAISizeRecommendation(category, height, weight, measure, brand);
          const banner = document.getElementById('aiSizeAdvisorBanner');
          const textEl = document.getElementById('aiSizeAdvisorText');
          
          if (advice && banner && textEl) {
            banner.classList.remove('hidden');
            textEl.innerHTML = advice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          } else if (banner) {
            banner.classList.add('hidden');
          }
        };

        ['orderCategory', 'orderBrand', 'orderHeight', 'orderWeightKg', 'orderMeasure'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener('input', updateAiSizeAdvice);
            el.addEventListener('change', updateAiSizeAdvice);
          }
        });

        const orderCategoryEl = document.getElementById('orderCategory');
        if (orderCategoryEl) {
          orderCategoryEl.addEventListener('change', () => {
            if (window.updateCategoryHint) window.updateCategoryHint('orderCategory', 'orderCategoryHint');
          });
        }

        const manualBanner = document.getElementById('aiSizeAdvisorBanner');
        if (manualBanner) {
          manualBanner.onclick = () => {
            const category = document.getElementById('orderCategory')?.value || '';
            const brand = document.getElementById('orderBrand')?.value || '';
            const height = document.getElementById('orderHeight')?.value || '';
            const weight = document.getElementById('orderWeightKg')?.value || '';
            const measure = document.getElementById('orderMeasure')?.value || '';
            const advice = getAISizeRecommendation(category, height, weight, measure, brand);
            if (advice) {
              const sizeMatch = advice.match(/\*\*(.*?)\*\*/);
              if (sizeMatch && sizeMatch[1]) {
                const sizeInput = document.getElementById('orderSize');
                if (sizeInput) {
                  sizeInput.value = sizeMatch[1];
                  tgUtil.haptic('light');
                  glassToast(`Р Р°Р·РјРµСЂ ${sizeMatch[1]} РїСЂРёРјРµРЅС‘РЅ!`, { kind: 'success' });
                }
              }
            }
          };
        }

        updateAiSizeAdvice();

        const urlInp = document.getElementById('orderUrl');
        const orderPasteBtn = document.getElementById('orderPasteBtn');
        const analyzeOrderBtn = document.getElementById('analyzeOrderLinkBtn');

        if (orderPasteBtn) {
          orderPasteBtn.onclick = async () => {
            tgUtil.haptic('light');
            try {
              const text = await navigator.clipboard.readText();
              const cleaned = text?.trim();
              if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.includes('dewu.com') || cleaned.includes('taobao.com') || cleaned.includes('1688.com') || cleaned.includes('poizon') || cleaned.includes('zalando') || cleaned.includes('vinted'))) {
                if (urlInp) {
                  urlInp.value = cleaned;
                  glassToast('РЎСЃС‹Р»РєР° СѓСЃРїРµС€РЅРѕ РІСЃС‚Р°РІР»РµРЅР°!', { kind: 'success' });
                  if (analyzeOrderBtn) analyzeOrderBtn.click();
                }
              } else if (cleaned) {
                if (urlInp) urlInp.value = cleaned;
                glassToast('РўРµРєСЃС‚ РІСЃС‚Р°РІР»РµРЅ! РџСЂРѕРІРµСЂСЊС‚Рµ С„РѕСЂРјР°С‚ СЃСЃС‹Р»РєРё.', { kind: 'info' });
              } else {
                glassToast('Р‘СѓС„РµСЂ РѕР±РјРµРЅР° РїСѓСЃС‚!', { kind: 'info' });
              }
            } catch (err) {
              console.error('Clipboard paste failed:', err);
              glassToast('РќРµС‚ РґРѕСЃС‚СѓРїР° Рє Р±СѓС„РµСЂСѓ. Р’СЃС‚Р°РІСЊС‚Рµ РІСЂСѓС‡РЅСѓСЋ.', { kind: 'error' });
            }
          };
        }

        if (analyzeOrderBtn) {
          analyzeOrderBtn.addEventListener('click', async () => {
            const url = urlInp?.value.trim();
            if (!url) { tgUtil.alert('Р’СЃС‚Р°РІСЊС‚Рµ СЃСЃС‹Р»РєСѓ'); return; }

            const limitCheck = await checkAndUpdateLimit();
            if (!limitCheck.allowed) {
              tgUtil.alert(`Р›РёРјРёС‚ РёСЃС‡РµСЂРїР°РЅ (${limitCheck.currentCount}/${limitCheck.maxRequests}).`);
              return;
            }

            const originalText = analyzeOrderBtn.innerText;
            analyzeOrderBtn.innerHTML = isHardDomain(url) ? '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РћР±С…РѕРґРёРј Р·Р°С‰РёС‚СѓвЂ¦' : '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РђРЅР°Р»РёР·...';
            analyzeOrderBtn.disabled = true;

            try {
              const { data: queueData, error: insErr } = await supabaseClient
                .from('parse_queue')
                .insert({ user_id: userId, url, status: 'pending' })
                .select('id')
                .single();
              if (insErr) throw new Error('РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ Р·Р°РґР°С‡Рё: ' + insErr.message);

              const taskId = queueData.id;
              let result = null;
              let manualRequired = false;

              const maxIterations = isHardDomain(url) ? 90 : 75;
              for (let i = 0; i < maxIterations; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const { data: checkData } = await supabaseClient
                  .from('parse_queue')
                  .select('status, price, title, weight_kg, currency, country, category, description, color, brand, marketplace_name, error_message, parse_method, screenshot_path, image_url')
                  .eq('id', taskId)
                  .single();

                if (checkData?.status === 'done') { result = checkData; break; }
                if (checkData?.status === 'manual_required') {
                  manualRequired = true;
                  if (checkData.category) {
                    const categorySelect = document.getElementById('orderCategory');
                    if (categorySelect) {
                      const opt = findCategoryOption(categorySelect, checkData.category);
                      if (opt) { categorySelect.value = opt.value; categorySelect.dispatchEvent(new Event('change')); }
                    }
                  }
                  showScreenshotWidget(taskId, checkData, 'order');
                  break;
                }
                if (checkData?.status === 'error') {
                  throw new Error(checkData.error_message || 'РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР°');
                }
              }

              if (!result && !manualRequired) throw new Error('РўР°Р№РјР°СѓС‚ РѕР¶РёРґР°РЅРёСЏ РїР°СЂСЃРёРЅРіР°');
              if (manualRequired) return;

              const orderPriceEl = document.getElementById('orderPrice');
              if (orderPriceEl) {
                if (result.price != null && result.price !== '' && Number(result.price) > 0) {
                  orderPriceEl.value = result.price;
                } else {
                  orderPriceEl.value = '';
                }
              }
              if (result.currency) {
                const currencySelect = document.getElementById('orderCurrency');
                if (currencySelect) {
                  const option = Array.from(currencySelect.options).find(opt => opt.value === result.currency);
                  if (option) currencySelect.value = result.currency;
                }
              }
              if (result.category) {
                const categorySelect = document.getElementById('orderCategory');
                if (categorySelect) {
                  const option = findCategoryOption(categorySelect, result.category);
                  if (option) {
                    categorySelect.value = option.value;
                    categorySelect.dispatchEvent(new Event('change'));
                  }
                }
              }
              
              const setIfEmpty = (id, val) => {
                const el = document.getElementById(id);
                if (el && val && (!el.value || el.value.trim() === '')) el.value = val;
              };
              setIfEmpty('orderTitle', result.title);
              setIfEmpty('orderBrand', result.brand);
              setIfEmpty('orderModel', result.title);
              const descParts = [];
              if (result.description) descParts.push(result.description);
              if (result.color) descParts.push('Р¦РІРµС‚: ' + result.color);
              if (descParts.length) setIfEmpty('orderFeatures', descParts.join(' В· '));

              if (userId) {
                const newCount = limitCheck.currentCount + 1;
                await supabaseClient.from('users').update({ daily_requests_count: newCount, last_request_date: new Date().toISOString() }).eq('user_id', userId);
                userLimits.dailyCount = newCount;
              }

              analyzeOrderBtn.classList.add('bg-green-500');
              setTimeout(() => analyzeOrderBtn.classList.remove('bg-green-500'), 1000);
            } catch (err) {
              analyzeOrderBtn.classList.add('bg-red-500');
              setTimeout(() => analyzeOrderBtn.classList.remove('bg-red-500'), 2000);
              tgUtil.alert('вќЊ ' + (err && err.message ? err.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕР°РЅР°Р»РёР·РёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РІРІРµСЃС‚Рё РґР°РЅРЅС‹Рµ РІСЂСѓС‡РЅСѓСЋ.'));
            } finally {
              analyzeOrderBtn.innerText = originalText;
              analyzeOrderBtn.disabled = false;
            }
          });
        }

        const _ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };
        function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"'\\/]/g, (c) => _ESC_MAP[c]); }
        function safeUrl(u) {
          const s = String(u || '').trim();
          if (!s) return '';
          try {
            const parsed = new URL(s);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
          } catch { }
          return '';
        }

        function renderOrderSearchResults(payload) {
          if (!orderResultsBox) return;
          const list = (payload && payload.results) || [];
          if (list.length === 0) {
            orderResultsBox.classList.remove('hidden');
            const errPlatforms = (payload?.errors || []).map((e) => escHtml(e.platform)).join(', ');
            orderResultsBox.innerHTML = `
              <div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80">
                <span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> РќРёС‡РµРіРѕ РЅРµ РЅР°С€Р»Рё. РџРѕРїСЂРѕР±СѓР№С‚Рµ СѓС‚РѕС‡РЅРёС‚СЊ Р·Р°РїСЂРѕСЃ РёР»Рё РґСЂСѓРіРѕР№ СЂРµР¶РёРј.
                ${errPlatforms ? '<br><span class="text-xs text-white/50">РџР»РѕС‰Р°РґРєРё СЃ РѕС€РёР±РєР°РјРё: ' + errPlatforms + '</span>' : ''}
              </div>`;
            return;
          }

          const cards = list.map((r, i) => {
            const priceNum = (typeof r.price === 'number' && isFinite(r.price)) ? r.price : null;
            const currency = typeof r.currency === 'string' ? escHtml(r.currency) : '';
            const priceLine = (priceNum && currency)
              ? `<div class="text-cyan-400 font-bold text-sm mt-1">${escHtml(priceNum)} ${currency}</div>`
              : '<div class="text-white/40 text-xs mt-1">Р¦РµРЅР° РЅРµ РѕРїСЂРµРґРµР»РµРЅР°</div>';
            const safeImg = safeUrl(r.image_url);
            const img = safeImg
              ? `<img src="${escHtml(safeImg)}" class="w-16 h-16 object-cover rounded-lg flex-shrink-0" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
              : '<div class="w-16 h-16 bg-white/10 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span></div>';
            const safeHref = safeUrl(r.url);
            const titleEsc = escHtml(r.title || '(Р±РµР· РЅР°Р·РІР°РЅРёСЏ)');
            const platformLabel = escHtml(r.platform_label || r.platform || '');
            const flag = escHtml(r.flag || '');
            return `
              <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3" data-result-idx="${i}">
                ${img}
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-white/60 mb-1">${flag} ${platformLabel}</div>
                  <div class="text-sm font-semibold text-white truncate" title="${titleEsc}">${titleEsc}</div>
                  ${priceLine}
                  <div class="flex gap-2 mt-2">
                    <button data-result-pick="${i}" class="btn-primary"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РСЃРїРѕР»СЊР·РѕРІР°С‚СЊ</button>
                    ${safeHref ? `<a href="${escHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="btn-secondary bg-white/10 hover: font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span> РћС‚РєСЂС‹С‚СЊ</a>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('');

          const sourceLabel = payload.source === 'apify' || payload.source === 'apify+search-products'
            ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Google Lens'
            : (payload.source === 'vision-fallback' ? '<span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg></span> AI СЂР°СЃРїРѕР·РЅР°Р»' : null);
          const queryText = payload.query || payload.vision_query;
          const queryLine = (queryText && sourceLabel)
            ? `<div class="text-xs text-white/50 mb-2">${sourceLabel}: <span class="text-cyan-300">"${escHtml(queryText)}"</span></div>`
            : '';
          const replicaBanner = payload.authenticity_tier === 'replica' 
            ? `<div class="bg-orange-500/20 border border-orange-500/50 text-orange-400 p-2 rounded-lg text-xs font-bold mb-3 flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span> рџ”Ќ РќР°Р№РґРµРЅС‹ СЂРµРїР»РёРєРё</div>` 
            : '';

          const platformsCount = Array.isArray(payload.platforms) ? payload.platforms.length : 0;
          orderResultsBox.classList.remove('hidden');
          orderResultsBox.innerHTML = `
            <div class="text-white/70 text-xs mb-2 mt-2">РќР°Р№РґРµРЅРѕ ${list.length} СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ РЅР° ${platformsCount} РїР»РѕС‰Р°РґРєР°С…:</div>
            ${queryLine}
            ${replicaBanner}
            <div class="flex flex-col gap-2">${cards}</div>
          `;

          orderResultsBox.querySelectorAll('[data-result-pick]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.dataset.resultPick, 10);
              const picked = list[idx];
              if (!picked) return;
              setOrderMode('link');
              const urlEl = document.getElementById('orderUrl');
              if (urlEl && picked.url) urlEl.value = picked.url;
              if (picked.price) {
                const priceEl = document.getElementById('orderPrice');
                if (priceEl) priceEl.value = picked.price;
              }
              if (picked.currency) {
                const sel = document.getElementById('orderCurrency');
                if (sel) {
                  const opt = Array.from(sel.options).find((o) => o.value === picked.currency);
                  if (opt) sel.value = picked.currency;
                }
              }
              if (picked.title) {
                const titleInp = document.getElementById('orderTitle');
                if (titleInp && !titleInp.value) {
                  titleInp.value = picked.title;
                  const modInp = document.getElementById('orderModel');
                  if (modInp) modInp.value = picked.title;
                }
              }
              const aBtn = document.getElementById('analyzeOrderLinkBtn');
              if (aBtn) aBtn.click();
            });
          });
        }

        const photoZone = document.getElementById('orderPhotoUploadZone');
        const photoInput = document.getElementById('orderPhotoInput');
        const photoPreview = document.getElementById('orderPhotoPreview');
        const photoSearchBtn = document.getElementById('orderPhotoSearchBtn');
        const photoHint = document.getElementById('orderPhotoHint');
        const photoFiles = [];

        function renderOrderPhotoPreviews() {
          if (!photoPreview) return;
          if (photoFiles.length === 0) {
            photoPreview.classList.add('hidden');
            photoPreview.innerHTML = '';
            if (photoSearchBtn) photoSearchBtn.classList.add('hidden');
            return;
          }
          photoPreview.classList.remove('hidden');
          photoPreview.innerHTML = photoFiles.map((f, i) =>
            `<div class="relative">
              <img src="${trackBlobUrl('order:photo:' + i, f)}" class="rounded-xl w-full h-24 object-cover">
              <button type="button" data-rm-order-photo="${i}" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">Г—</button>
            </div>`).join('');
          if (photoSearchBtn) photoSearchBtn.classList.remove('hidden');
          photoPreview.querySelectorAll('[data-rm-order-photo]').forEach(btn => {
            btn.addEventListener('click', () => {
              const i = parseInt(btn.dataset.rmOrderPhoto, 10);
              photoFiles.splice(i, 1);
              renderOrderPhotoPreviews();
            });
          });
        }

        if (photoZone && photoInput) {
          photoZone.addEventListener('click', () => photoInput.click());
          photoZone.addEventListener('dragover', (ev) => { ev.preventDefault(); photoZone.classList.add('bg-white/10'); });
          photoZone.addEventListener('dragleave', () => photoZone.classList.remove('bg-white/10'));
          photoZone.addEventListener('drop', (ev) => {
            ev.preventDefault();
            photoZone.classList.remove('bg-white/10');
            handleOrderPhotoFiles(ev.dataTransfer?.files);
          });
          photoInput.addEventListener('change', () => handleOrderPhotoFiles(photoInput.files));
        }

        function handleOrderPhotoFiles(files) {
          if (!files || !files.length) return;
          for (const f of files) {
            if (!f.type.startsWith('image/')) continue;
            if (f.size > 10 * 1024 * 1024) { tgUtil.alert(`${f.name}: Р±РѕР»СЊС€Рµ 10 РњР‘`); continue; }
            if (photoFiles.length >= 5) { tgUtil.alert('РњРѕР¶РЅРѕ Р·Р°РіСЂСѓР·РёС‚СЊ РјР°РєСЃРёРјСѓРј 5 С„РѕС‚Рѕ'); break; }
            photoFiles.push(f);
          }
          renderOrderPhotoPreviews();
        }

        if (photoSearchBtn) {
          photoSearchBtn.addEventListener('click', async () => {
            if (photoFiles.length === 0) return;
            if (!supabaseClient) { tgUtil.alert('Р‘Р°Р·Р° РґР°РЅРЅС‹С… РЅРµРґРѕСЃС‚СѓРїРЅР°'); return; }
            const original = photoSearchBtn.innerText;
            photoSearchBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р—Р°РіСЂСѓР¶Р°СЋ С„РѕС‚РѕвЂ¦';
            photoSearchBtn.disabled = true;
            if (orderResultsBox) {
              orderResultsBox.classList.remove('hidden');
              orderResultsBox.innerHTML = '<div class="text-white/60 text-sm py-2"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р Р°СЃРїРѕР·РЅР°С‘Рј С‚РѕРІР°СЂ РЅР° С„РѕС‚Рѕ Рё РёС‰РµРј РЅР° РїР»РѕС‰Р°РґРєР°С…вЂ¦</div>';
            }
            try {
              let sessionId = localStorage.getItem('icelogix_session_id');
              if (!sessionId) {
                sessionId = crypto.randomUUID();
                localStorage.setItem('icelogix_session_id', sessionId);
              }
              const paths = await Promise.all(photoFiles.map(async (f) => {
                const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
                const path = `${sessionId}/${Date.now()}_search_${safeName}`;
                const { error: upErr } = await supabaseClient.storage
                  .from('product-screenshots')
                  .upload(path, f, { contentType: f.type, upsert: false });
                if (upErr) throw new Error('Р—Р°РіСЂСѓР·РєР°: ' + upErr.message);
                return path;
              }));
              photoSearchBtn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> РС‰РµРј РЅР° РїР»РѕС‰Р°РґРєР°С…вЂ¦';
              const { data, error } = await supabaseClient.functions.invoke('search-by-image', {
                body: {
                  screenshotPath: paths[0],
                  screenshotPaths: paths,
                  descriptionHint: (photoHint?.value || '').trim() || null,
                },
              });
              if (error) throw new Error(error.message);
              if (!data?.ok) throw new Error(data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р№С‚Рё');
              renderOrderSearchResults(data);
            } catch (e) {
              if (orderResultsBox) {
                orderResultsBox.classList.remove('hidden');
                orderResultsBox.innerHTML = `<div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${e.message}</div>`;
              }
            } finally {
              photoSearchBtn.innerText = original;
              photoSearchBtn.disabled = false;
            }
          });
        }

        const textInput = document.getElementById('orderTextQuery');
        const textSearchBtn = document.getElementById('orderTextSearchBtn');
        const textPhotoZone = document.getElementById('orderTextPhotoZone');
        const textPhotoInput = document.getElementById('orderTextPhotoInput');
        const textPhotoPreview = document.getElementById('orderTextPhotoPreview');
        let textPhotoFile = null;

        if (textPhotoZone && textPhotoInput) {
          textPhotoZone.addEventListener('click', () => textPhotoInput.click());
          textPhotoInput.addEventListener('change', () => {
            const f = textPhotoInput.files?.[0];
            if (!f) return;
            if (!f.type.startsWith('image/')) { tgUtil.alert('РўРѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ'); return; }
            if (f.size > 10 * 1024 * 1024) { tgUtil.alert('Р¤Р°Р№Р» Р±РѕР»СЊС€Рµ 10 РњР‘'); return; }
            textPhotoFile = f;
            if (textPhotoPreview) {
              textPhotoPreview.classList.remove('hidden');
              textPhotoPreview.innerHTML =
                `<div class="relative inline-block">
                  <img src="${trackBlobUrl('order:textphoto', f)}" class="rounded-xl max-h-32 object-contain">
                  <button type="button" id="orderTextPhotoRemove" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">Г—</button>
                </div>`;
              document.getElementById('orderTextPhotoRemove')?.addEventListener('click', () => {
                textPhotoFile = null;
                textPhotoPreview.classList.add('hidden');
                textPhotoPreview.innerHTML = '';
                textPhotoInput.value = '';
              });
            }
          });
        }

        if (textSearchBtn && textInput) {
          const runTextSearch = async () => {
            const q = (textInput.value || '').trim();
            if (q.length < 3) { tgUtil.alert('РњРёРЅРёРјСѓРј 3 СЃРёРјРІРѕР»Р° РІ РѕРїРёСЃР°РЅРёРё'); return; }
            if (!supabaseClient) { tgUtil.alert('Р‘Р°Р·Р° РґР°РЅРЅС‹С… РЅРµРґРѕСЃС‚СѓРїРЅР°'); return; }
            const original = textSearchBtn.innerText;
            textSearchBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РС‰РµРј РЅР° РїР»РѕС‰Р°РґРєР°С…вЂ¦';
            textSearchBtn.disabled = true;
            if (orderResultsBox) {
              orderResultsBox.classList.remove('hidden');
              orderResultsBox.innerHTML = '<div class="text-white/60 text-sm py-2"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РР СѓР»СѓС‡С€Р°РµС‚ Р·Р°РїСЂРѕСЃ Рё РїР°СЂР°Р»Р»РµР»СЊРЅРѕ РѕРїСЂР°С€РёРІР°РµС‚ РїР»РѕС‰Р°РґРєРёвЂ¦</div>';
            }
            try {
              if (textPhotoFile) {
                let sessionId = localStorage.getItem('icelogix_session_id');
                if (!sessionId) {
                  sessionId = crypto.randomUUID();
                  localStorage.setItem('icelogix_session_id', sessionId);
                }
                const safeName = textPhotoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
                const path = `${sessionId}/${Date.now()}_search_${safeName}`;
                const { error: upErr } = await supabaseClient.storage
                  .from('product-screenshots')
                  .upload(path, textPhotoFile, { contentType: textPhotoFile.type, upsert: false });
                if (upErr) throw new Error('Р—Р°РіСЂСѓР·РєР° С„РѕС‚Рѕ: ' + upErr.message);
                const { data, error } = await supabaseClient.functions.invoke('search-by-image', {
                  body: { screenshotPath: path, descriptionHint: q },
                });
                if (error) throw new Error(error.message);
                if (!data?.ok) throw new Error(data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р№С‚Рё');
                renderOrderSearchResults(data);
              } else {
                const { data, error } = await supabaseClient.functions.invoke('search-products', {
                  body: { query: q, user_id: userId },
                });
                if (error) throw new Error(error.message);
                if (!data?.ok) throw new Error(data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р№С‚Рё');
                renderOrderSearchResults(data);
              }
            } catch (e) {
              if (orderResultsBox) {
                orderResultsBox.classList.remove('hidden');
                orderResultsBox.innerHTML = `<div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${e.message}</div>`;
              }
            } finally {
              textSearchBtn.innerText = original;
              textSearchBtn.disabled = false;
            }
          };
          textSearchBtn.addEventListener('click', runTextSearch);
          textInput.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); runTextSearch(); }
          });
        }

        const manualPhotoZone = document.getElementById('orderManualPhotoUploadZone');
        const manualPhotoInput = document.getElementById('orderManualPhotoInput');
        const manualPhotoPreview = document.getElementById('orderManualPhotoPreview');
        const manualPhotoFiles = [];
        function renderManualPhotoPreviews() {
          if (!manualPhotoPreview) return;
          if (manualPhotoFiles.length === 0) {
            manualPhotoPreview.classList.add('hidden');
            manualPhotoPreview.innerHTML = '';
            return;
          }
          manualPhotoPreview.classList.remove('hidden');
          manualPhotoPreview.innerHTML = manualPhotoFiles.map((f, i) =>
            `<div class="relative">
              <img src="${trackBlobUrl('order:manualphoto:' + i, f)}" class="rounded-xl w-full h-24 object-cover">
              <button type="button" data-rm-manual-photo="${i}" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">Г—</button>
            </div>`).join('');
          manualPhotoPreview.querySelectorAll('[data-rm-manual-photo]').forEach(btn => {
            btn.addEventListener('click', () => {
              const i = parseInt(btn.dataset.rmManualPhoto, 10);
              manualPhotoFiles.splice(i, 1);
              renderManualPhotoPreviews();
            });
          });
        }

        if (manualPhotoZone && manualPhotoInput) {
          manualPhotoZone.addEventListener('click', () => manualPhotoInput.click());
          manualPhotoInput.addEventListener('change', () => {
            const files = manualPhotoInput.files;
            if (files) {
              for (const f of files) {
                if (!f.type.startsWith('image/')) continue;
                if (f.size > 10 * 1024 * 1024) { tgUtil.alert(`${f.name}: Р±РѕР»СЊС€Рµ 10 РњР‘`); continue; }
                if (manualPhotoFiles.length >= 5) { tgUtil.alert('РњРѕР¶РЅРѕ Р·Р°РіСЂСѓР·РёС‚СЊ РјР°РєСЃРёРјСѓРј 5 С„РѕС‚Рѕ'); break; }
                manualPhotoFiles.push(f);
              }
              renderManualPhotoPreviews();
            }
          });
        }



        const saveBtn = document.getElementById('orderSaveItemBtn');
        if (saveBtn) {
          saveBtn.onclick = async () => {
            tgUtil.haptic('medium');
            const brand = document.getElementById('orderBrand')?.value.trim() || '';
            const model = document.getElementById('orderModel')?.value.trim() || '';
            const features = document.getElementById('orderFeatures')?.value.trim() || '';
            const gender = document.getElementById('orderGender')?.value || '';
            const category = document.getElementById('orderCategory')?.value || '';
            const color = document.getElementById('orderColor')?.value.trim() || '';
            const size = document.getElementById('orderSize')?.value.trim() || '';
            const height = document.getElementById('orderHeight')?.value.trim() || '';
            const weightKg = document.getElementById('orderWeightKg')?.value.trim() || '';
            const measure = document.getElementById('orderMeasure')?.value.trim() || '';
            const price = parseFloat(document.getElementById('orderPrice')?.value) || 0;
            const currency = document.getElementById('orderCurrency')?.value || 'CNY';
            const url = document.getElementById('orderUrlManual')?.value.trim() || document.getElementById('orderUrl')?.value.trim() || '';

            if (price <= 0) {
              tgUtil.alert('РЈРєР°Р¶РёС‚Рµ С†РµРЅСѓ С‚РѕРІР°СЂР° (> 0)');
              return;
            }
            if (!category) {
              tgUtil.alert('Р’С‹Р±РµСЂРёС‚Рµ РєР°С‚РµРіРѕСЂРёСЋ С‚РѕРІР°СЂР°');
              return;
            }

            const originalText = saveBtn.innerText;
            saveBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РЎРѕС…СЂР°РЅСЏРµРј С‚РѕРІР°СЂвЂ¦';
            saveBtn.disabled = true;

            try {
              const photoPaths = [];
              if (manualPhotoFiles.length > 0 && supabaseClient) {
                let sessionId = localStorage.getItem('icelogix_session_id');
                if (!sessionId) {
                  sessionId = crypto.randomUUID();
                  localStorage.setItem('icelogix_session_id', sessionId);
                }
                for (const f of manualPhotoFiles) {
                  const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
                  const path = `${sessionId}/${Date.now()}_item_${safeName}`;
                  const { error: upErr } = await supabaseClient.storage
                    .from('product-screenshots')
                    .upload(path, f, { contentType: f.type, upsert: false });
                  if (upErr) throw new Error('Р—Р°РіСЂСѓР·РєР° С„РѕС‚Рѕ: ' + upErr.message);
                  photoPaths.push(path);
                }
              }

              let weight = 0.5;
              const dw = getCategoryDefaultWeight(category);
              if (dw) weight = dw;

              const res = await window.iceLogixPricing.calculatePrice({
                product_price: price,
                product_currency: currency,
                source_country: window.orderCountry,
                weight_kg: weight,
                category: category,
                insurance: false,
                legit_check: false
              });

              const item = {
                title: `${brand} ${model}`.trim() || 'РўРѕРІР°СЂ',
                brand,
                model,
                features,
                gender,
                category,
                color,
                size,
                height,
                weightKg,
                measure,
                price,
                currency,
                weight,
                url,
                total_byn: res.total_byn,
                quantity: 1,
                photo_urls: photoPaths
              };

              if (!window.tempOrder) {
                window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: window.orderCountry };
              }
              window.tempOrder.items = window.tempOrder.items || [];
              window.tempOrder.items.push(item);
              
              let total = 0;
              window.tempOrder.items.forEach(it => {
                total += it.total_byn * it.quantity;
              });
              window.tempOrder.total = total;

              window.orderAddMode = false;
              renderCurrentScreen();
              tgUtil.toast('РўРѕРІР°СЂ СѓСЃРїРµС€РЅРѕ РґРѕР±Р°РІР»РµРЅ!');
            } catch (e) {
              tgUtil.alert('РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ С‚РѕРІР°СЂР°: ' + e.message);
            } finally {
              saveBtn.innerText = originalText;
              saveBtn.disabled = false;
            }
          };
        }
      }
    }
    // ==================== Р Р•РќР”Р•Р  РњРћРРҐ Р—РђРљРђР—РћР’ (Р”Р›РЇ РџР РћР¤РР›РЇ) ====================
function getStatusSteps(status) {
  const steps = [
    { label: 'Р’ РѕР±СЂР°Р±РѕС‚РєРµ', active: ['pending', 'paid', 'bought', 'on_sklad_cn', 'in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'Р’С‹РєСѓРїР»РµРЅ', active: ['bought', 'on_sklad_cn', 'in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'РќР° СЃРєР»Р°РґРµ РІ РљРёС‚Р°Рµ', active: ['on_sklad_cn', 'in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'Р’ РїСѓС‚Рё РІ РњРёРЅСЃРє', active: ['in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'РћР¶РёРґР°РµС‚ РѕРїР»Р°С‚С‹ 2-Р№ С‡Р°СЃС‚Рё', active: ['awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'РћРїР»Р°С‡РµРЅ', active: ['paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'РЈ РЅР°СЃ', active: ['in_belarus', 'dispatched', 'delivered'] },
    { label: 'РћС‚РїСЂР°РІР»РµРЅ', active: ['dispatched', 'delivered'] },
    { label: 'Р“РѕС‚РѕРІ Рє РІС‹РґР°С‡Рµ', active: ['delivered'] }
  ];
  return steps;
}

function getDeliveryCountdownText(order) {
  if (order.status === 'delivered') {
    return '<span class="text-green-400 font-bold">рџЋ‰ Р”РѕСЃС‚Р°РІР»РµРЅ!</span>';
  }
  if (order.status === 'cancelled') {
    return '<span class="text-red-400">вќЊ РћС‚РјРµРЅРµРЅ</span>';
  }
  
  const createdDate = new Date(order.created_at);
  let daysMin = 10;
  let daysMax = 15;
  if (order.source_country === 'PL') {
    daysMin = 14;
    daysMax = 20;
  } else if (order.source_country === 'RU') {
    daysMin = 3;
    daysMax = 5;
  }
  
  if (window.buyerVacation && window.buyerVacation.active) {
    const vDays = window.buyerVacation.days || 0;
    daysMin += vDays;
    daysMax += vDays;
  }
  
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  const minEstDate = addDays(createdDate, daysMin);
  const maxEstDate = addDays(createdDate, daysMax);
  
  const now = new Date();
  const diffTime = maxEstDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formattedRange = `${minEstDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} вЂ” ${maxEstDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  
  if (diffDays <= 0) {
    return `<span class="text-cyan-400">вЏі РћР¶РёРґР°РµС‚СЃСЏ СЃРѕ РґРЅСЏ РЅР° РґРµРЅСЊ (${formattedRange})</span>`;
  }
  
  return `<span class="text-cyan-400">вЏі РћР¶РёРґР°РµС‚СЃСЏ: ~${diffDays} РґРЅ. (${formattedRange})</span>`;
}

async function renderMyOrders() {
  if (!userId) return '<p class="text-center mt-10 text-white/70">РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ</p>';
  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    if (!data || data.length === 0) {
      return '<p class="text-center mt-10 text-white/70">РЈ РІР°СЃ РїРѕРєР° РЅРµС‚ Р·Р°РєР°Р·РѕРІ</p>';
    }

    const { data: claims } = await supabaseClient.from('insurance_claims').select('*').eq('user_id', userId);
    const claimsMap = {};
    (claims || []).forEach(c => {
      claimsMap[c.order_id] = c;
    });
    
    return `
      <button id="backToProfileBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
      <div class="space-y-3">
        ${data.map(order => `
          <div class="glass-card">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-white font-bold">Р—Р°РєР°Р· #${order.id.slice(0,8)}</p>
                <p class="text-white/70 text-xs">${new Date(new Date(order.created_at).getTime() + 3*60*60*1000).toLocaleString('ru-RU')}</p>
                ${(() => {
                  const est = parseFloat(order.weight_estimated) || 0;
                  const act = parseFloat(order.weight_actual);
                  if (!isNaN(act) && Math.abs(act - est) >= 0.001) { // 1 gram
                    const isHeavier = act > est;
                    const colorClass = isHeavier ? 'amber' : 'green';
                    const icon = isHeavier 
                      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
                    const title = isHeavier ? 'Р’РЅРёРјР°РЅРёРµ: РїРµСЂРµРІРµСЃ' : 'Р’РµСЃ РјРµРЅСЊС€Рµ РѕР¶РёРґР°РµРјРѕРіРѕ!';
                    const suffix = isHeavier ? 'РћР¶РёРґР°РµС‚СЃСЏ РґРѕРїР»Р°С‚Р° Р·Р° СЂР°Р·РЅРёС†Сѓ РІРµСЃР°.' : 'РС‚РѕРіРѕРІР°СЏ СЃС‚РѕРёРјРѕСЃС‚СЊ РґРѕСЃС‚Р°РІРєРё Р±СѓРґРµС‚ РїРµСЂРµСЃС‡РёС‚Р°РЅР° РІ РјРµРЅСЊС€СѓСЋ СЃС‚РѕСЂРѕРЅСѓ.';
                    const diffStr = (act - est > 0 ? '+' : '') + (act - est).toFixed(3);
                    return `
                      <div class="mt-2 p-2 rounded-xl border border-${colorClass}-500/30 bg-${colorClass}-500/10 text-xs mb-2">
                        <p class="text-${colorClass}-400 font-bold mb-1 flex items-center gap-1">
                          <span class="ix">${icon}</span> ${title}
                        </p>
                        <p class="text-${colorClass}-100/70">РћР¶РёРґР°Р»РѕСЃСЊ: ${est.toFixed(3)} РєРі<br>РќР° СЃРєР»Р°РґРµ: ${act.toFixed(3)} РєРі</p>
                        <p class="text-${colorClass}-300 font-bold mt-1">Р Р°Р·РЅРёС†Р°: ${diffStr} РєРі. ${suffix}</p>
                      </div>
                    `;
                  }
                  return `<p class="text-white/70 text-xs mt-1">Р’РµСЃ: ${est} РєРі</p>`;
                })()}
                ${order.extra_services?.is_gift ? `
                  <div class="mt-2 bg-pink-500/10 p-3 rounded-lg border border-pink-500/20 text-center cursor-pointer hover:bg-pink-500/20 transition-colors" onclick="this.innerHTML='<div class=\\'text-left text-xs space-y-1\\'><div class=\\'flex justify-between text-white/70\\'><span>РЎСѓРјРјР° Р·Р°РєР°Р·Р°:</span><span>${Number(order.total_byn || 0).toFixed(2)} BYN</span></div><div class=\\'flex justify-between text-cyan-400 font-bold\\'><span>Р’РЅРµСЃРµРЅРѕ (70%):</span><span>${Number(order.prepayment_amount || 0).toFixed(2)} BYN</span></div><div class=\\'flex justify-between text-amber-400 font-bold border-t border-white/10 pt-1 mt-1\\'><span>РћСЃС‚Р°С‚РѕРє:</span><span>${(Number(order.total_byn || 0) - Number(order.prepayment_amount || 0)).toFixed(2)} BYN</span></div></div>'">
                    <p class="text-pink-400 font-bold text-xs">рџЋЃ РЎСЋСЂРїСЂРёР· (РќР°Р¶РјРёС‚Рµ, С‡С‚РѕР±С‹ РїРѕРєР°Р·Р°С‚СЊ С†РµРЅСѓ)</p>
                  </div>
                ` : `
                  <div class="mt-2 bg-white/5 p-2 rounded-lg text-xs space-y-1 border border-white/10">
                    <div class="flex justify-between text-white/70">
                      <span>РЎСѓРјРјР° Р·Р°РєР°Р·Р°:</span>
                      <span>${Number(order.total_byn || 0).toFixed(2)} BYN</span>
                    </div>
                    <div class="flex justify-between text-cyan-400 font-bold">
                      <span>Р’РЅРµСЃРµРЅРѕ (70%):</span>
                      <span>${Number(order.prepayment_amount || 0).toFixed(2)} BYN</span>
                    </div>
                    <div class="flex justify-between text-amber-400 font-bold border-t border-white/10 pt-1 mt-1">
                      <span>РћСЃС‚Р°С‚РѕРє Рє РѕРїР»Р°С‚Рµ:</span>
                      <span>${(Number(order.total_byn || 0) - Number(order.prepayment_amount || 0)).toFixed(2)} BYN</span>
                    </div>
                  </div>
                `}
                ${order.tracking_number_cn ? `<p class="text-white/70 text-xs mt-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Р’РЅСѓС‚СЂРµРЅРЅРёР№ С‚СЂРµРє: ${order.tracking_number_cn}</p>` : ''}
                ${order.sbs_tracking_id ? `<p class="text-cyan-400 text-xs mt-1 font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> SBS РўСЂРµРє: ${order.sbs_tracking_id}</p>` : ''}
              </div>
              <span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
            </div>
            ${order.photo_reports && order.photo_reports.length > 0 ? `
              <div class="mt-3">
                <p class="text-white/70 text-xs mb-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> Р¤РѕС‚Рѕ СЃРѕ СЃРєР»Р°РґР°:</p>
                <div class="flex gap-2 overflow-x-auto pb-2">
                  ${order.photo_reports.map(url => `
                    <img src="${url}" class="w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0" onclick="window.open('${url}', '_blank')">
                  `).join('')}
                </div>
              </div>
            ` : ''}
            ${order.requires_video_check ? `
              <div class="mt-3 bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl">
                <p class="text-cyan-400 text-xs font-bold mb-1 flex items-center gap-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span> РћРїР»Р°С‡РµРЅР° Р’РёРґРµРѕ-РїСЂРѕРІРµСЂРєР° (10 BYN)</p>
                ${order.video_url ? `
                  <a href="${order.video_url}" target="_blank" class="mt-2 btn-primary w-full py-2 text-xs flex justify-center items-center gap-2">
                    РџРѕСЃРјРѕС‚СЂРµС‚СЊ РІРёРґРµРѕ
                  </a>
                ` : `
                  <p class="text-white/60 text-[10px] mt-1">Р’РёРґРµРѕ Р±СѓРґРµС‚ РґРѕСЃС‚СѓРїРЅРѕ, РєРѕРіРґР° С‚РѕРІР°СЂ РїРѕСЃС‚СѓРїРёС‚ РЅР° СЃРєР»Р°Рґ РІ РљРёС‚Р°Рµ.</p>
                `}
              </div>
            ` : ''}
            
            <!-- Modern Premium Timeline Widget (Vertical) -->
            <div class="mt-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <p class="text-white/60 text-xs font-semibold mb-3">РЎС‚Р°С‚СѓСЃ РґРѕСЃС‚Р°РІРєРё:</p>
              <div class="relative pl-3 space-y-4">
                <div class="absolute left-[15px] top-2 bottom-2 w-[2px] bg-white/10"></div>
                ${getStatusSteps(order.status).map((step, sIdx) => {
                  const isPassed = step.active.includes(order.status);
                  const isCurrent = isPassed && (sIdx === getStatusSteps(order.status).length - 1 || !getStatusSteps(order.status)[sIdx+1].active.includes(order.status));
                  return `
                    <div class="relative flex items-center gap-3">
                      <div class="w-3 h-3 rounded-full z-10 transition-all duration-500 ${isCurrent ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] scale-125' : isPassed ? 'bg-cyan-500/50' : 'bg-white/20'}" style="margin-left: -4px;"></div>
                      <span class="text-xs ${isCurrent ? 'text-cyan-400 font-bold' : isPassed ? 'text-white/80' : 'text-white/30'}">${step.label}</span>
                    </div>
                  `;
                }).join('')}
              </div>
              
              <div class="text-xs text-white/70 border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
                <span>РћС†РµРЅРєР° РґРѕСЃС‚Р°РІРєРё:</span>
                <span class="font-semibold">${getDeliveryCountdownText(order)}</span>
              </div>
              ${order.tracking_number_by ? `
                <div class="text-[10px] text-white/60 mt-1.5 flex justify-between items-center border-t border-white/5 pt-1.5">
                  <span>Р”РѕСЃС‚Р°РІРєР° РїРѕ Р Р‘:</span>
                  <span class="font-semibold text-white/80">${order.tracking_number_by}</span>
                </div>
              ` : ''}
              ${(() => {
                const claim = claimsMap[order.id];
                if (!claim) return '';
                const statusText = claim.status === 'pending' ? 'рџ”Ќ РџСЂРµС‚РµРЅР·РёСЏ РЅР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРё' : claim.status === 'approved' ? 'рџџў Р’С‹РїР»Р°С‚Р° РѕРґРѕР±СЂРµРЅР°' : 'рџ”ґ РџСЂРµС‚РµРЅР·РёСЏ РѕС‚РєР»РѕРЅРµРЅР°';
                return `
                  <div class="mt-2.5 p-2 rounded-xl border ${claim.status === 'pending' ? 'border-amber-500/25 bg-amber-500/5 text-amber-300' : claim.status === 'approved' ? 'border-green-500/25 bg-green-500/5 text-green-400' : 'border-red-500/25 bg-red-500/5 text-red-400'} text-[10px] text-center font-bold">
                    ${statusText}
                    ${claim.rejection_reason ? '<p class="text-white/50 font-normal mt-0.5 font-sans">РџСЂРёС‡РёРЅР°: ' + claim.rejection_reason + '</p>' : ''}
                  </div>
                `;
              })()}
            </div>

            <button class="btn-secondary w-full text-white text-xs mt-2 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-white/5 bg-white/5 hover:bg-white/10 transition-colors" onclick="window.showLogisticsHistory('${order.id}')">
              <span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
              РџРѕРґСЂРѕР±РЅР°СЏ РёСЃС‚РѕСЂРёСЏ С‚СЂРµРєРёРЅРіР°
            </button>

            <div class="flex gap-2 mt-3">
              <button class="btn-secondary flex-1 text-white text-xs border border-cyan-500/30" onclick="window.openInvoiceModal('${order.id}', ${Number(order.total_byn).toFixed(2)})"><span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span> РРЅРІРѕР№СЃ</button>
              <button class="btn-secondary flex-1 text-white text-xs" onclick="window.openSupportChat('${order.id}')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span> рџ’¬ Р§Р°С‚</button>
              <button class="btn-secondary flex-1 text-white text-xs border border-blue-500/30" onclick="window.Telegram.WebApp.openTelegramLink('https://t.me/icelogix_bot?start=order_${order.id}')"><span class="ix text-blue-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></span> Р’ Р±РѕС‚Рµ</button>
              ${Number(order.insurance_byn || 0) > 0 && !['pending', 'cancelled'].includes(order.status) && !claimsMap[order.id] ? `
                <button class="btn-secondary flex-1 text-amber-400 border border-amber-500/20 text-xs" onclick="window.openInsuranceClaimModal('${order.id}', ${order.total_byn})">
                  рџ›ЎпёЏ РЎС‚СЂР°С…РѕРІРєР°
                </button>
              ` : ''}
            </div>
            ${order.status === 'delivered' ? `
            <div class="mt-2">
              <button class="btn-primary w-full text-white text-xs bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors" onclick="publishToResale('${order.id}', '${(order.description || '').replace(/'/g, "\\'")}')">
                <span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></span> Р’С‹СЃС‚Р°РІРёС‚СЊ РІ РџСЂРёСЃС‚СЂРѕР№
              </button>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ${renderFooter()}
    `;
  } catch (err) {
    console.error('РћС€РёР±РєР° РІ renderMyOrders:', err);
    return '<p class="text-center mt-10 text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё Р·Р°РєР°Р·РѕРІ</p>';
  }
}

window.openInvoiceModal = (orderId, originalPrice) => {
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'invoiceTypeModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-6 space-y-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] transform transition-all duration-300 scale-95 opacity-0" id="invModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span class="text-cyan-400 text-xl">рџ“„</span> 
          <span>РЎРѕР·РґР°РЅРёРµ РёРЅРІРѕР№СЃР°</span>
        </h3>
        <button id="closeInvModalBtn" class="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      
      <div class="space-y-3">
        <button id="btnStdInv" class="w-full btn-secondary text-left flex items-start gap-3 p-3 border border-cyan-500/30 hover:bg-cyan-500/10">
          <span class="text-2xl">рџЏў</span>
          <div>
            <p class="text-white font-bold text-sm">РЎС‚Р°РЅРґР°СЂС‚РЅС‹Р№ (ICE LOGIX)</p>
            <p class="text-white/50 text-[10px] mt-0.5">РћС„РёС†РёР°Р»СЊРЅС‹Р№ РёРЅРІРѕР№СЃ СЃРѕ С€С‚Р°РјРїРѕРј Рё Р»РѕРіРѕС‚РёРїРѕРј СЃРµСЂРІРёСЃР°.</p>
          </div>
        </button>

        <button id="btnB2bInv" class="w-full btn-secondary text-left flex items-start gap-3 p-3 border border-fuchsia-500/30 hover:bg-fuchsia-500/10">
          <span class="text-2xl">рџҐ·</span>
          <div>
            <p class="text-fuchsia-400 font-bold text-sm">Р”СЂРѕРїС€РёРїРїРёРЅРі (White-Label)</p>
            <p class="text-white/50 text-[10px] mt-0.5">Р‘РµР· Р»РѕРіРѕС‚РёРїРѕРІ ICE LOGIX. РЎ РІРѕР·РјРѕР¶РЅРѕСЃС‚СЊСЋ СѓРєР°Р·Р°С‚СЊ РІР°С€Сѓ С†РµРЅСѓ РїРµСЂРµРїСЂРѕРґР°Р¶Рё.</p>
          </div>
        </button>
      </div>
      
      <div id="b2bPriceBlock" class="hidden mt-4 pt-4 border-t border-white/10 space-y-3">
        <label class="text-white/70 text-xs block">РЈРєР°Р¶РёС‚Рµ С†РµРЅСѓ РґР»СЏ РєР»РёРµРЅС‚Р° (BYN):</label>
        <input type="number" id="b2bPriceInput" class="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white text-sm" value="${originalPrice}">
        <button id="btnGenerateB2b" class="btn-primary w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white">РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  requestAnimationFrame(() => {
    document.getElementById('invModalContent').classList.remove('scale-95', 'opacity-0');
    document.getElementById('invModalContent').classList.add('scale-100', 'opacity-100');
  });

  const close = () => {
    document.getElementById('invModalContent').classList.remove('scale-100', 'opacity-100');
    document.getElementById('invModalContent').classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.remove(), 300);
  };
  
  document.getElementById('closeInvModalBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  document.getElementById('btnStdInv').onclick = () => {
    close();
    window.generatePdfInvoice(orderId, false, null);
  };

  document.getElementById('btnB2bInv').onclick = () => {
    document.getElementById('b2bPriceBlock').classList.remove('hidden');
    document.getElementById('b2bPriceInput').focus();
  };

  document.getElementById('btnGenerateB2b').onclick = () => {
    const customPrice = parseFloat(document.getElementById('b2bPriceInput').value);
    if (!customPrice || customPrice <= 0) {
      tgUtil.alert('Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅСѓСЋ С†РµРЅСѓ');
      return;
    }
    close();
    window.generatePdfInvoice(orderId, true, customPrice);
  };
};

window.openYandexMapStub = () => {
  tgUtil.haptic('medium');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'yandexMapModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-lg w-full mx-4 p-6 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] transform transition-all duration-300 scale-95 opacity-0 flex flex-col" style="height: 70vh;" id="yMapModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span class="text-cyan-400 text-xl">рџ“Ќ</span> 
          <span>Р’С‹Р±РѕСЂ РЅР° РєР°СЂС‚Рµ</span>
        </h3>
        <button id="closeYMapModalBtn" class="text-white/50 hover:text-white transition-colors">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
        </button>
      </div>
      
      <!-- РљРѕРЅС‚РµР№РЅРµСЂ РґР»СЏ РЇРЅРґРµРєСЃ.РљР°СЂС‚ -->
      <div id="yandexMapContainer" class="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-white/10 relative flex items-center justify-center">
        <div class="text-center p-6">
          <p class="text-cyan-400 font-bold mb-2">РРЅС‚РµРіСЂР°С†РёСЏ СЃ РЇРЅРґРµРєСЃ РљР°СЂС‚Р°РјРё</p>
          <p class="text-white/60 text-xs">Р”Р»СЏ РїРѕР»РЅРѕС†РµРЅРЅРѕР№ СЂР°Р±РѕС‚С‹ РЅСѓР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ API РєР»СЋС‡ РЇРЅРґРµРєСЃР°.</p>
          <p class="text-white/60 text-xs mt-2">Р—РґРµСЃСЊ РїРѕСЏРІРёС‚СЃСЏ РёРЅС‚РµСЂР°РєС‚РёРІРЅР°СЏ РєР°СЂС‚Р° РґР»СЏ РІС‹Р±РѕСЂР° Р°РґСЂРµСЃР° / РѕС‚РґРµР»РµРЅРёСЏ.</p>
        </div>
      </div>
      
      <button id="btnConfirmMapStub" class="btn-primary w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2">
        РЎРѕС…СЂР°РЅРёС‚СЊ С‚РµСЃС‚РѕРІС‹Р№ Р°РґСЂРµСЃ
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  requestAnimationFrame(() => {
    document.getElementById('yMapModalContent').classList.remove('scale-95', 'opacity-0');
    document.getElementById('yMapModalContent').classList.add('scale-100', 'opacity-100');
  });

  const close = () => {
    document.getElementById('yMapModalContent').classList.remove('scale-100', 'opacity-100');
    document.getElementById('yMapModalContent').classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.remove(), 300);
  };
  
  document.getElementById('closeYMapModalBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  document.getElementById('btnConfirmMapStub').onclick = () => {
    close();
    // Simulate address selection for demo purposes
    if (window.tempOrder && window.tempOrder.pvs) {
      window.tempOrder.pvs.city = 'РњРёРЅСЃРє';
      window.tempOrder.pvs.point = 'РўРµСЃС‚РѕРІС‹Р№ Р°РґСЂРµСЃ СЃ РєР°СЂС‚С‹, Рґ. 1';
      document.getElementById('pvsCitySelect').value = 'РњРёРЅСЃРє';
      
      // Update DOM to show the fake selected point
      const pvsPointSelect = document.getElementById('pvsPointSelect');
      pvsPointSelect.innerHTML = `<option value="РўРµСЃС‚РѕРІС‹Р№ Р°РґСЂРµСЃ СЃ РєР°СЂС‚С‹, Рґ. 1" selected>РњРёРЅСЃРє, РўРµСЃС‚РѕРІС‹Р№ Р°РґСЂРµСЃ СЃ РєР°СЂС‚С‹, Рґ. 1</option>`;
      glassToast('РђРґСЂРµСЃ СЃ РєР°СЂС‚С‹ СЃРѕС…СЂР°РЅРµРЅ', { kind: 'success' });
    }
  };
};

window.generatePdfInvoice = async (orderId, isB2b = false, customPrice = null) => {
  tgUtil.haptic('medium');
  glassToast('Р“РµРЅРµСЂР°С†РёСЏ PDF-РёРЅРІРѕР№СЃР°...', { kind: 'info' });
  
  try {
    const { data: order, error } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
    if (error) throw error;
    
    if (!window.html2pdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ PDF Р±РёР±Р»РёРѕС‚РµРєСѓ'));
        document.head.appendChild(script);
      });
    }

    const invoiceEl = document.createElement('div');
    invoiceEl.style.width = '800px';
    invoiceEl.style.padding = '40px';
    invoiceEl.style.backgroundColor = '#ffffff';
    invoiceEl.style.color = '#000000';
    invoiceEl.style.fontFamily = 'Arial, sans-serif';
    invoiceEl.style.position = 'absolute';
    invoiceEl.style.left = '-9999px';
    invoiceEl.style.top = '-9999px';
    
    // РњРѕРєСЂР°СЏ РїРµС‡Р°С‚СЊ (СЃРёРЅСЏСЏ)
    const stampHtml = isB2b ? '' : `
      <div style="position: absolute; right: 80px; bottom: 80px; width: 150px; height: 150px; border: 4px solid rgba(29, 78, 216, 0.7); border-radius: 50%; opacity: 0.8; transform: rotate(-15deg); display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; color: rgba(29, 78, 216, 0.9);">
        <div style="border: 2px dashed rgba(29, 78, 216, 0.5); border-radius: 50%; width: 135px; height: 135px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <span style="font-size: 16px; text-transform: uppercase; margin-bottom: 4px;">ICE LOGIX</span>
          <span style="font-size: 11px; background-color: rgba(29, 78, 216, 0.1); padding: 2px 6px; border-radius: 4px;">APPROVED</span>
          <span style="font-size: 9px; margin-top: 4px;">${new Date().toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
    `;

    const totalByn = isB2b && customPrice ? parseFloat(customPrice) : order.total_byn;
    const goodsByn = isB2b ? totalByn : (order.total_byn - (order.commission_byn||0));
    
    invoiceEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #111827;">INVOICE</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">#${order.id.toUpperCase()}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #0284c7;">${isB2b ? 'DELIVERY SERVICE' : 'ICE LOGIX'}</h2>
          <p style="color: #6b7280; font-size: 12px; margin-top: 5px;">Global Buying Service</p>
          <p style="color: #6b7280; font-size: 12px;">${isB2b ? 'Logistics Partner' : 'Nesvizh, Belarus'}</p>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div>
          <h3 style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Billed To:</h3>
          <p style="font-weight: 600; font-size: 14px; margin: 0;">User ID: ${order.user_id.slice(0,18)}...</p>
          <p style="font-size: 14px; margin: 5px 0 0 0;">Telegram Delivery</p>
        </div>
        <div style="text-align: right;">
          <h3 style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Date:</h3>
          <p style="font-weight: 600; font-size: 14px; margin: 0;">${new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-size: 12px; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Description</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 15px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
              <strong>Goods/Service:</strong> ${order.items_title || 'Р—Р°РєР°Р· С‚РѕРІР°СЂРѕРІ РёР·-Р·Р° СЂСѓР±РµР¶Р°'}<br>
              <span style="color: #6b7280; font-size: 12px;">Weight: ~${order.weight_estimated} kg</span>
            </td>
            <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600;">
              ${Number(goodsByn).toFixed(2)} BYN
            </td>
          </tr>
          ${!isB2b ? `
          <tr>
            <td style="padding: 15px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
              <strong>Service Fee (Commission)</strong>
            </td>
            <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600;">
              ${Number(order.commission_byn||0).toFixed(2)} BYN
            </td>
          </tr>
          ` : ''}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 14px; color: #4b5563;">Subtotal:</span>
            <span style="font-weight: 600;">${Number(totalByn).toFixed(2)} BYN</span>
          </div>
          ${!isB2b ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #111827;">
            <span style="font-size: 14px; color: #4b5563;">Paid (Prepayment):</span>
            <span style="font-weight: 600;">${Number(order.prepayment_amount||0).toFixed(2)} BYN</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 15px 0;">
            <span style="font-size: 18px; font-weight: 800; color: #111827;">TOTAL DUE:</span>
            <span style="font-size: 18px; font-weight: 800; color: #0284c7;">${Number(isB2b ? totalByn : (totalByn - (order.prepayment_amount||0))).toFixed(2)} BYN</span>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: auto; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>This is an electronically generated invoice.</p>
        <p>Status: ${order.status.toUpperCase()}</p>
      </div>
      
      ${stampHtml}
    `;

    document.body.appendChild(invoiceEl);
    
    const opt = {
      margin:       10,
      filename:     'ice_logix_invoice_' + order.id.slice(0,8) + '.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(invoiceEl).save();
    document.body.removeChild(invoiceEl);
    glassToast('РРЅРІРѕР№СЃ СѓСЃРїРµС€РЅРѕ СЃРєР°С‡Р°РЅ!', { kind: 'success' });
    
  } catch (err) {
    console.error('РћС€РёР±РєР° РіРµРЅРµСЂР°С†РёРё PDF:', err);
    glassToast('РћС€РёР±РєР° РіРµРЅРµСЂР°С†РёРё РёРЅРІРѕР№СЃР°', { kind: 'error' });
  }
};

window.generateShippingManifest = async (orderId) => {
  tgUtil.haptic('medium');
  glassToast('Р“РµРЅРµСЂР°С†РёСЏ РЅР°РєР»Р°РґРЅРѕР№ (Рђ6)...', { kind: 'info' });
  
  try {
    const { data: order, error } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
    if (error) throw error;
    
    const { data: user } = await supabaseClient.from('users').select('*').eq('user_id', order.user_id).single();
    const fullName = user?.full_name || 'Р‘РµР· РёРјРµРЅРё';
    const phone = user?.phone || 'РќРµ СѓРєР°Р·Р°РЅ';
    
    if (!window.html2pdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ PDF Р±РёР±Р»РёРѕС‚РµРєСѓ'));
        document.head.appendChild(script);
      });
    }

    const manifestEl = document.createElement('div');
    manifestEl.style.width = '396px';
    manifestEl.style.minHeight = '559px';
    manifestEl.style.padding = '20px';
    manifestEl.style.backgroundColor = '#ffffff';
    manifestEl.style.color = '#000000';
    manifestEl.style.fontFamily = 'Arial, sans-serif';
    manifestEl.style.position = 'absolute';
    manifestEl.style.left = '-9999px';
    manifestEl.style.top = '-9999px';
    
    const address = order.tracking_number_by || 'РЎР°РјРѕРІС‹РІРѕР· / РќРµ СѓРєР°Р·Р°РЅ';
    
    manifestEl.innerHTML = `
      <div style="border: 2px solid #000; padding: 15px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase;">ICE LOGIX</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold;">Р”РћРЎРўРђР’РљРђ РџРћ Р Р‘</p>
        </div>
        
        <div style="flex: 1;">
          <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">РџРѕР»СѓС‡Р°С‚РµР»СЊ:</p>
            <p style="margin: 2px 0 0 0; font-size: 18px; font-weight: bold;">\${fullName}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">РўРµР»РµС„РѕРЅ:</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold;">\${phone}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">РђРґСЂРµСЃ РґРѕСЃС‚Р°РІРєРё / РџР’Р—:</p>
            <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; line-height: 1.4;">\${address.replace(/\\|/g, '<br>')}</p>
          </div>
          
          <div style="margin-bottom: 20px; border-top: 1px dashed #000; padding-top: 15px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">Р—Р°РєР°Р·:</p>
            <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold;">#\${order.id.slice(0,8).toUpperCase()}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Р’РµСЃ: \${order.weight_actual || order.weight_estimated || '?'} РєРі</p>
          </div>
        </div>
        
        <div style="text-align: center; border-top: 2px solid #000; padding-top: 10px; margin-top: auto;">
          <div style="height: 60px; width: 80%; margin: 0 auto; background-image: repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 10px);"></div>
          <p style="margin: 5px 0 0 0; font-size: 10px; letter-spacing: 2px;">\${order.id.slice(0,12).toUpperCase()}</p>
        </div>
      </div>
    `;

    document.body.appendChild(manifestEl);
    
    const opt = {
      margin:       2,
      filename:     'ice_logix_label_' + order.id.slice(0,8) + '.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: [105, 148], orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(manifestEl).save();
    document.body.removeChild(manifestEl);
    glassToast('РќР°РєР»Р°РґРЅР°СЏ Рђ6 СѓСЃРїРµС€РЅРѕ СЃРєР°С‡Р°РЅР°!', { kind: 'success' });
    
  } catch (err) {
    console.error('РћС€РёР±РєР° РіРµРЅРµСЂР°С†РёРё РЅР°РєР»Р°РґРЅРѕР№:', err);
    glassToast('РћС€РёР±РєР° РіРµРЅРµСЂР°С†РёРё РЅР°РєР»Р°РґРЅРѕР№', { kind: 'error' });
  }
};

window.openInsuranceClaimModal = (orderId, orderTotal) => {
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'insuranceClaimModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-6 space-y-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] transform transition-all duration-300 scale-95 opacity-0" id="claimModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span class="text-amber-400 text-xl">рџ›ЎпёЏ</span> 
          <span class="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">РЎС‚СЂР°С…РѕРІРѕР№ СЃР»СѓС‡Р°Р№</span>
        </h3>
        <button id="closeClaimModalBtn" class="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      
      <div class="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-4 rounded-xl text-xs text-white/80 leading-relaxed relative overflow-hidden">
        <div class="absolute -right-4 -top-4 text-amber-500/10 text-6xl">рџ›ЎпёЏ</div>
        <p class="font-bold text-amber-300 mb-2 text-sm flex items-center gap-1.5"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span> РЈСЃР»РѕРІРёСЏ РІРѕР·РјРµС‰РµРЅРёСЏ:</p>
        <ul class="space-y-1.5 pl-1 relative z-10">
          <li class="flex items-start gap-1.5">
            <span class="text-amber-400 mt-0.5">вЂў</span>
            <span>РџРѕР»РЅС‹Р№ РІРѕР·РІСЂР°С‚ СЃС‚РѕРёРјРѕСЃС‚Рё (<strong>${orderTotal.toFixed(2)} BYN</strong>) РЅР°С‡РёСЃР»СЏРµС‚СЃСЏ РЅР° РІР°С€ Р±Р°Р»Р°РЅСЃ РїРѕСЃР»Рµ РїСЂРѕРІРµСЂРєРё.</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="text-amber-400 mt-0.5">вЂў</span>
            <span>РЎСЂРѕРє СЂР°СЃСЃРјРѕС‚СЂРµРЅРёСЏ Р°РґРјРёРЅРёСЃС‚СЂР°С†РёРµР№ ICE LOGIX вЂ” <strong>РґРѕ 24 С‡Р°СЃРѕРІ</strong>.</span>
          </li>
        </ul>
      </div>
      
      <div class="space-y-2">
        <label class="text-white/70 text-xs font-semibold block ml-1">Р”РµС‚Р°Р»Рё РїСЂРѕРёСЃС€РµСЃС‚РІРёСЏ *</label>
        <textarea id="claimReason" class="w-full p-4 rounded-xl border border-white/20 bg-slate-900/50 focus:bg-slate-900/80 focus:border-amber-500/50 text-sm text-white transition-all placeholder:text-white/30 resize-none outline-none" placeholder="РћРїРёС€РёС‚Рµ, С‡С‚Рѕ СЃР»СѓС‡РёР»РѕСЃСЊ (РЅР°РїСЂ. РїРѕСЃС‹Р»РєР° СѓС‚РµСЂСЏРЅР°, РїРѕРІСЂРµР¶РґРµРЅР° Рё С‚.Рґ.)..." rows="4"></textarea>
      </div>
      
      <button id="submitClaimBtn" class="w-full py-3.5 rounded-xl transition-all text-xs tracking-wider uppercase font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-[0.98]">
        РћС‚РїСЂР°РІРёС‚СЊ РїСЂРµС‚РµРЅР·РёСЋ
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  
  // РђРЅРёРјР°С†РёСЏ РїРѕСЏРІР»РµРЅРёСЏ
  requestAnimationFrame(() => {
    const content = document.getElementById('claimModalContent');
    if (content) {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }
  });
  
  document.getElementById('closeClaimModalBtn').onclick = () => modal.remove();
  
  document.getElementById('submitClaimBtn').onclick = async () => {
    const reason = document.getElementById('claimReason')?.value.trim();
    if (!reason) {
      glassToast('РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РѕРїРёС€РёС‚Рµ РїСЂРёС‡РёРЅСѓ СЃС‚СЂР°С…РѕРІРѕРіРѕ СЃР»СѓС‡Р°СЏ!', { kind: 'error' });
      return;
    }
    
    const submitBtn = document.getElementById('submitClaimBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = 'РћС‚РїСЂР°РІРєР°...';
    
    try {
      const { error } = await supabaseClient.from('insurance_claims').insert({
        order_id: orderId,
        user_id: userId,
        description: reason,
        status: 'pending'
      });
      
      if (error) throw error;
      
      glassToast('РџСЂРµС‚РµРЅР·РёСЏ СѓСЃРїРµС€РЅРѕ РѕС‚РїСЂР°РІР»РµРЅР° РЅР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРµ!', { kind: 'success' });
      modal.remove();
      renderCurrentScreen();
    } catch(e) {
      console.error(e);
      glassToast('РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё: ' + e.message, { kind: 'error' });
      submitBtn.disabled = false;
      submitBtn.innerText = 'РћС‚РїСЂР°РІРёС‚СЊ РїСЂРµС‚РµРЅР·РёСЋ';
    }
  };
};

        // ==================== Р Р•РќР”Р•Р  РџР РћР¤РР›РЇ (РЎ Р Р•Р¤Р•Р РђР›РљРђРњР) ====================
        async function renderProfile() {
      let referralStats = { count: 0, bonus: 0 };
      if (userId) {
        try {
          const { data, error } = await supabaseClient.from('users').select('referral_count, referral_bonus').eq('user_id', userId).single();
          if (!error && data) {
            referralStats.count = data.referral_count || 0;
            referralStats.bonus = data.referral_bonus || 0;
          }
        } catch(e) { console.log(e); }
      }
      
      let isDropshipper = false;
      if (userId) {
        try {
          const { data, error } = await supabaseClient.from('dropshipper_settings').select('user_id').eq('user_id', userId).single();
          if (!error && data) isDropshipper = true;
        } catch(e) {}
      }
      
      const shareLink = userReferralCode ? `https://t.me/${tg.initDataUnsafe?.user?.username ? tg.initDataUnsafe.user.username : 'icelogix_bot'}?startapp=ref_${userReferralCode}` : '';
      
      let displayedBalance = balance;
      const fam = window.userSettings?.family || {};
      let familyBalance = null;
      let familyBalanceLabel = null;
      let isFamilyEnabled = false;

      if (fam.role === 'member' && fam.head_id) {
        isFamilyEnabled = true;
        try {
          const { data: headUser } = await supabaseClient.from('users').select('ices_balance').eq('user_id', fam.head_id).single();
          if (headUser) {
            familyBalance = headUser.ices_balance || 0;
            familyBalanceLabel = 'РЎРµРјРµР№РЅС‹Р№ Р±Р°Р»Р°РЅСЃ (Р“Р»Р°РІР° СЃРµРјСЊРё)';
          }
        } catch(e) {}
      } else if (fam.role === 'head') {
        isFamilyEnabled = true;
        familyBalance = balance;
        familyBalanceLabel = 'РЎРµРјРµР№РЅС‹Р№ Р±Р°Р»Р°РЅСЃ (Р’С‹ вЂ” РіР»Р°РІР°)';
      }

      const trustedBadge = userLimits.isTrusted ? `<span class="ix text-cyan-400" title="РџСЂРѕРІРµСЂРµРЅРЅС‹Р№ РїР°СЂС‚РЅРµСЂ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>` : '';

      return `
  <!-- Profile Header Card -->
  <div class="glass-card text-center mb-5 page-enter">
    <div class="relative mx-auto w-28 h-28 mb-4">
      <div class="w-28 h-28 rounded-full overflow-hidden" style="background: linear-gradient(135deg, var(--ice-primary), var(--ice-arctic)); padding: 3px;">
        <div class="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-4xl font-bold" style="background: var(--bg-gradient-mid);" id="profileAvatar">
          ${userAvatarUrl ? '<img src="' + userAvatarUrl + '" class="w-full h-full object-cover">' : (userName || 'Р“РѕСЃС‚СЊ').charAt(0).toUpperCase()}
        </div>
      </div>
      <button id="changeAvatarBtn" class="absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2" style="background: linear-gradient(135deg, var(--ice-primary), var(--ice-deep)); border-color: var(--bg-gradient-mid); box-shadow: 0 2px 10px rgba(91,191,235,0.4);">
        <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
      </button>
    </div>
    <div class="flex items-center justify-center gap-2 mb-2">
      <h2 class="text-xl font-bold flex items-center gap-1" id="profileNameDisplay">${userName}${trustedBadge}</h2>
      <button id="editNameBtn" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
    
    <!-- Balance Display -->
    ${isFamilyEnabled ? `
    <div class="flex gap-3 justify-center mb-4 flex-wrap">
      <div class="flex items-center gap-3 px-4 py-3 rounded-2xl" style="background: linear-gradient(135deg, rgba(91,191,235,0.2), rgba(46,158,212,0.1)); border: 1px solid rgba(91,191,235,0.3);">
        <span class="text-xl animate-float"><span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></span>
        <div class="text-left">
          <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">РњРѕР№ Р±Р°Р»Р°РЅСЃ</p>
          <p class="text-lg font-bold" style="color: var(--ice-primary);">${balance} ICE</p>
        </div>
      </div>
      ${familyBalance !== null ? `
      <div class="flex items-center gap-3 px-4 py-3 rounded-2xl" style="background: linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1)); border: 1px solid rgba(52,211,153,0.3);">
        <span class="text-xl">рџ‘ЁвЂЌрџ‘©вЂЌрџ‘§</span>
        <div class="text-left">
          <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">${familyBalanceLabel}</p>
          <p class="text-lg font-bold" style="color: var(--status-success);">${familyBalance} ICE</p>
        </div>
      </div>
      ` : ''}
    </div>
    ` : `
    <div class="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-4" style="background: linear-gradient(135deg, rgba(91,191,235,0.2), rgba(46,158,212,0.1)); border: 1px solid rgba(91,191,235,0.3);">
      <span class="text-2xl animate-float"><span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></span>
      <div class="text-left">
        <p class="text-xs" style="color: var(--text-secondary);">Р‘Р°Р»Р°РЅСЃ</p>
        <p class="text-xl font-bold" style="color: var(--ice-primary);">${displayedBalance} ICE</p>
      </div>
    </div>
    `}
    
    <!-- РСЃС‚РѕСЂРёСЏ (РІРјРµСЃС‚Рѕ С‚СЂР°РЅР·Р°РєС†РёР№ вЂ” СЃСЃС‹Р»РєР° РЅР° СЂР°Р·РґРµР») -->
    <div class="p-4 rounded-2xl mb-4 cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98]" id="historyProfileBtn" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
      <div class="flex justify-between items-center">
        <p class="font-semibold flex items-center gap-2" style="color: var(--text-secondary);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          РСЃС‚РѕСЂРёСЏ
        </p>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--ice-primary);"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <p class="text-xs mt-1 text-left" style="color: var(--text-muted);">РўСЂР°РЅР·Р°РєС†РёРё Рё Р°СЂС…РёРІ Р·Р°РєР°Р·РѕРІ</p>
    </div>
    
    <!-- Referral Program -->
    <div class="p-4 rounded-2xl mb-4" style="background: linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08)); border: 1px solid rgba(52,211,153,0.25);">
      <div class="flex items-center justify-between mb-3">
        <p class="font-bold flex items-center gap-2 text-white">
          <span class="text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></span>
          РџСЂРёРІРµРґРё РґСЂСѓРіР°
        </p>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">1% РџРћР–РР—РќР•РќРќРћ</span>
      </div>
      <p class="text-white/60 text-xs mb-3 text-left">Р”РµР»РёС‚РµСЃСЊ СЃСЃС‹Р»РєРѕР№ Рё РїРѕР»СѓС‡Р°Р№С‚Рµ 1% РѕС‚ РєРѕРјРёСЃСЃРёРё СЃ РєР°Р¶РґРѕРіРѕ Р·Р°РєР°Р·Р° РІР°С€РµРіРѕ РґСЂСѓРіР° РїСЂСЏРјРѕ РЅР° Р±Р°Р»Р°РЅСЃ ICE!</p>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="p-3 rounded-xl text-center" style="background: var(--glass-bg);">
          <p class="text-2xl font-bold" style="color: var(--ice-primary);">${referralStats.count}</p>
          <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">РџСЂРёРіР»Р°С€РµРЅРѕ</p>
        </div>
        <div class="p-3 rounded-xl text-center" style="background: var(--glass-bg);">
          <p class="text-2xl font-bold" style="color: var(--status-success);">${referralStats.bonus}</p>
          <p class="text-[10px] uppercase tracking-wider flex items-center justify-center gap-1" style="color: var(--text-muted);">Р‘РѕРЅСѓСЃС‹ <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></p>
        </div>
      </div>
      ${userReferralCode ? `
        <div class="flex items-center justify-between bg-black/20 rounded-lg p-2 mb-2 border border-white/5">
          <span class="text-[10px] font-mono text-cyan-400 truncate flex-1">${shareLink}</span>
        </div>
        <button id="copyReferralLinkBtn" class="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/10 active:scale-95" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          РЎРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ
        </button>
      ` : ''}
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button onclick="switchTab('reftree')" class="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all hover:bg-white/10 active:scale-95" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border);">рџЊі<span>РњРѕСЏ СЃРµС‚СЊ</span></button>
        <button onclick="switchTab('ugc')" class="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all hover:bg-white/10 active:scale-95" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border);">рџЋ¬<span>Р Р°СЃРїР°РєРѕРІРєР°</span></button>
      </div>
    </div>
  </div>

  <!-- РљРѕР»РµСЃРѕ Р¤РѕСЂС‚СѓРЅС‹ РїРµСЂРµРЅРµСЃРµРЅРѕ РІ СЂР°Р·РґРµР» "РђРєС†РёРё" РіР»Р°РІРЅРѕРіРѕ РјРµРЅСЋ -->
  
  <!-- Quick Actions Grid -->
  <div class="mb-5 page-enter" style="animation-delay: 0.1s;">
    <h3 class="text-white font-bold mb-4 flex items-center gap-2">
      <span><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span></span> Р‘С‹СЃС‚СЂС‹Рµ РґРµР№СЃС‚РІРёСЏ
    </h3>
    <div class="grid grid-cols-2 gap-3">
      <button id="myOrdersBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(96,165,250,0.2), rgba(59,130,246,0.1));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">РњРѕРё Р·Р°РєР°Р·С‹</p>
          <p class="text-xs" style="color: var(--text-muted);">РСЃС‚РѕСЂРёСЏ РїРѕРєСѓРїРѕРє</p>
        </div>
      </button>
      <button id="wishlistBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1));"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">РР·Р±СЂР°РЅРЅРѕРµ</p>
          <p class="text-xs" style="color: var(--text-muted);">РЎРѕС…СЂР°РЅС‘РЅРЅРѕРµ</p>
        </div>
      </button>
      <button id="cartBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] relative">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">РљРѕСЂР·РёРЅР°</p>
          <p class="text-xs" style="color: var(--text-muted);">РўРѕРІР°СЂС‹ Рє Р·Р°РєР°Р·Сѓ</p>
        </div>
        <span id="cartBadge" class="absolute top-2 right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center hidden" style="background: var(--status-error);">0</span>
      </button>
      <button id="historyQuickBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">РСЃС‚РѕСЂРёСЏ</p>
          <p class="text-xs" style="color: var(--text-muted);">РўСЂР°РЅР·Р°РєС†РёРё Рё Р·Р°РєР°Р·С‹</p>
        </div>
      </button>
    </div>
  </div>


  
  <!-- Р”СЂСѓРіРѕРµ Grid -->
  <div class="mb-5 page-enter" style="animation-delay: 0.15s;">
    <h3 class="text-white font-bold mb-4 flex items-center gap-2">
      <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></span> Р”СЂСѓРіРѕРµ
    </h3>
    <div class="glass-card p-2">
      <button id="myPersonalDataBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 transition">
        <span class="text-xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span></span>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">РњРѕРё РґР°РЅРЅС‹Рµ</p>
          <p class="text-xs" style="color: var(--text-muted);">Р¤РРћ, С‚РµР»РµС„РѕРЅ, РїР°СЃРїРѕСЂС‚ Рё Р·Р°РјРµСЂС‹</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button id="dropshipperProfileBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 transition border-t border-white/5">
        <span class="text-xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span></span>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">${isDropshipper ? 'РљР°Р±РёРЅРµС‚ РґСЂРѕРїС€РёРїРїРµСЂР°' : 'Р—Р°СЂР°Р±Р°С‚С‹РІР°Р№ СЃ РЅР°РјРё'}</p>
          <p class="text-xs" style="color: var(--text-muted);">${isDropshipper ? 'РЈРїСЂР°РІР»РµРЅРёРµ РјР°РіР°Р·РёРЅРѕРј' : 'РЎС‚Р°РЅСЊ РїР°СЂС‚РЅС‘СЂРѕРј ICE LOGIX'}</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="w-full p-3 rounded-xl flex items-center justify-between border-t border-white/5">
        <div class="flex items-center gap-3">
          <span class="text-xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></span></span>
          <div>
            <p class="font-semibold text-white text-sm">РЎРІРµС‚Р»Р°СЏ С‚РµРјР°</p>
            <p class="text-xs" style="color: var(--text-muted);">Р’РЅРµС€РЅРёР№ РІРёРґ</p>
          </div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="themeToggleCheckbox" class="sr-only peer">
          <div class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>
      ${isOwner ? `
      <button id="adminPanelBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 transition" style="border-top: 1px solid var(--glass-border);">
        <span class="text-xl"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14"/></svg></span></span>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">РђРґРјРёРЅ-РїР°РЅРµР»СЊ</p>
          <p class="text-xs" style="color: var(--text-muted);">РЈРїСЂР°РІР»РµРЅРёРµ СЃРёСЃС‚РµРјРѕР№</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      ` : ''}
    </div>
  </div>
  
  <!-- Logout Button -->
  <button id="logoutBtn" class="w-full p-4 rounded-2xl font-semibold flex items-center justify-center gap-2 page-enter" style="animation-delay: 0.2s; background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.3); color: #F87171;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
    Р’С‹Р№С‚Рё РёР· Р°РєРєР°СѓРЅС‚Р°
  </button>
  
  ${renderFooter()}
`;
    }

    function attachProfileHandlers() {
  console.log('attachProfileHandlers called');
  
  const myOrdersBtn = document.getElementById('myOrdersBtn');
  if (myOrdersBtn) {
    console.log('myOrdersBtn found');
    myOrdersBtn.onclick = () => { currentSubScreen = 'myOrders'; renderCurrentScreen(); };
  } else {
    console.error('myOrdersBtn NOT found');
  }

  const spinFortuneBtn = document.getElementById('spinFortuneWheelBtn');
  if (spinFortuneBtn) {
    spinFortuneBtn.onclick = () => showWheelOfFortuneModal();
  }

  const wishlistBtn = document.getElementById('wishlistBtn');
  if (wishlistBtn) {
    wishlistBtn.onclick = () => switchTab('wishlist');
  }

  const dropshipperBtn = document.getElementById('dropshipperBtn');
  if (dropshipperBtn) {
    dropshipperBtn.onclick = () => switchTab('dropshipper');
  }

  const historyQuickBtn = document.getElementById('historyQuickBtn');
  if (historyQuickBtn) {
    historyQuickBtn.onclick = () => switchTab('history');
  }

  const dropshipperProfileBtn = document.getElementById('dropshipperProfileBtn');
  if (dropshipperProfileBtn) {
    dropshipperProfileBtn.onclick = () => switchTab('dropshipper');
  }

  const academyBtn = document.getElementById('academyBtn');
  if (academyBtn) {
    academyBtn.onclick = () => switchTab('academy');
  }

  const adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) {
    adminBtn.onclick = () => switchTab('admin');
  }

  const themeToggle = document.getElementById('themeToggleCheckbox');
  if (themeToggle) {
    const isLight = localStorage.getItem('theme') === 'light';
    themeToggle.checked = isLight;
    themeToggle.onchange = (e) => {
      const light = e.target.checked;
      if (light) {
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }
    };
  }



  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => tg.close();
  }

  const copyBtn = document.getElementById('copyReferralLinkBtn');
  if (copyBtn) {
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      const link = userReferralCode ? `https://t.me/icelogix_bot?startapp=ref_${userReferralCode}` : '';
      if (link) {
        navigator.clipboard.writeText(link).then(() => {
          tgUtil.alert('РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°! РћС‚РїСЂР°РІСЊС‚Рµ РµС‘ РґСЂСѓРіСѓ.');
        }).catch(err => {
          tgUtil.alert('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ. РЎРєРѕРїРёСЂСѓР№С‚Рµ СЃСЃС‹Р»РєСѓ РІСЂСѓС‡РЅСѓСЋ.');
        });
        tgUtil.haptic('success');
      }
    };
  }
  // РњРѕРё РґР°РЅРЅС‹Рµ (РµРґРёРЅС‹Р№ РїСЂРѕС„РёР»СЊ)
  const myPersonalDataBtn = document.getElementById('myPersonalDataBtn');
  if (myPersonalDataBtn) myPersonalDataBtn.onclick = () => showPersonalDataForm();

  const recoverySecurityBtn = document.getElementById('recoverySecurityBtn');
  if (recoverySecurityBtn) recoverySecurityBtn.onclick = () => showRecoveryCodeModal();

  const marketplaceWhitelistBtn = document.getElementById('marketplaceWhitelistBtn');
  if (marketplaceWhitelistBtn) marketplaceWhitelistBtn.onclick = () => showMarketplaceWhitelistModal();

  // РЎРєР°С‡Р°С‚СЊ РґРѕРіРѕРІРѕСЂ
  const downloadAgreementBtn = document.getElementById('downloadAgreementBtn');
  if (downloadAgreementBtn) downloadAgreementBtn.onclick = () => downloadAgreement();

  // РЎРјРµРЅР° Р°РІР°С‚Р°СЂР°
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  if (changeAvatarBtn) changeAvatarBtn.onclick = () => showAvatarUploader();

  // Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РёРјРµРЅРё РѕС‚РєСЂС‹РІР°РµС‚ РєРѕРјРїР°РєС‚РЅС‹Р№ prompt
  const editNameBtn = document.getElementById('editNameBtn');
  if (editNameBtn) editNameBtn.onclick = () => showEditNameForm();

  // Р’СЃРµ С‚СЂР°РЅР·Р°РєС†РёРё
  const allTransactionsBtn = document.getElementById('showAllTransactionsBtn');
  if (allTransactionsBtn) allTransactionsBtn.onclick = () => switchTab('history');

  const historyProfileBtn = document.getElementById('historyProfileBtn');
  if (historyProfileBtn) historyProfileBtn.onclick = () => switchTab('history');

  // РќР°СЃС‚СЂРѕР№РєРё СѓРІРµРґРѕРјР»РµРЅРёР№
  const notifSettingsBtn = document.getElementById('notificationsSettingsBtn');
  if (notifSettingsBtn) notifSettingsBtn.onclick = () => showAppSettings('notifications');
  const accountRecoveryBtn = document.getElementById('accountRecoveryBtn');
  if (accountRecoveryBtn) accountRecoveryBtn.onclick = () => showAccountRecovery();

  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) cartBtn.onclick = () => switchTab('cart');

}

window.getFortuneSpinCooldown = () => {
  const lastSpin = localStorage.getItem('last_fortune_spin');
  if (!lastSpin) return 0;
  const elapsed = Date.now() - parseInt(lastSpin);
  const cooldown = 24 * 60 * 60 * 1000;
  return Math.max(0, cooldown - elapsed);
};

window.showFortuneWheel = () => {
  if (getFortuneSpinCooldown() > 0) {
    tgUtil.haptic('error');
    glassToast('РљРѕР»РµСЃРѕ Р¤РѕСЂС‚СѓРЅС‹ РґРѕСЃС‚СѓРїРЅРѕ 1 СЂР°Р· РІ 24 С‡Р°СЃР°!', { kind: 'error' });
    return;
  }
  
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'fortuneWheelModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-6 shadow-[0_15px_40px_-10px_rgba(139,92,246,0.5)] transform transition-all duration-300 scale-95 opacity-0 text-center" style="background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98)); border: 1px solid rgba(139,92,246,0.3);" id="fortuneModalContent">
      <h3 class="text-white font-bold text-xl mb-2 flex items-center justify-center gap-2">
        <span>рџ”®</span> РљРѕР»РµСЃРѕ Р¤РѕСЂС‚СѓРЅС‹
      </h3>
      <p class="text-white/60 text-xs mb-6">РСЃРїС‹С‚Р°Р№С‚Рµ СѓРґР°С‡Сѓ! Р’С‹ РјРѕР¶РµС‚Рµ РІС‹РёРіСЂР°С‚СЊ РґРѕ 10 ICE РЅР° Р±Р°Р»Р°РЅСЃ.</p>
      
      <div class="relative w-48 h-48 mx-auto mb-8">
        <!-- РЈРєР°Р·Р°С‚РµР»СЊ -->
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-3xl" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">рџ“Ќ</div>
        <!-- РљРѕР»РµСЃРѕ -->
        <div id="wheelElement" class="w-full h-full rounded-full border-4 border-white/10 relative overflow-hidden transition-transform" style="background: conic-gradient(
          #3b82f6 0deg 60deg, 
          #8b5cf6 60deg 120deg, 
          #10b981 120deg 180deg, 
          #f59e0b 180deg 240deg, 
          #ef4444 240deg 300deg, 
          #ec4899 300deg 360deg
        ); box-shadow: 0 0 20px rgba(139,92,246,0.4);">
          <!-- Р Р°Р·РґРµР»РёС‚РµР»Рё -->
          <div class="absolute inset-0 rounded-full" style="background-image: repeating-conic-gradient(from 0deg, transparent 0deg 59.5deg, rgba(255,255,255,0.5) 59.5deg 60.5deg);"></div>
        </div>
      </div>
      
      <button id="spinBtnReal" class="w-full py-3 rounded-xl text-lg font-bold shadow-[0_0_15px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2 text-white" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none;">
        РљР РЈРўРРўР¬!
      </button>
      <button class="w-full py-2 mt-3 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 transition-colors" onclick="document.getElementById('fortuneModalContent').classList.remove('scale-100','opacity-100'); setTimeout(()=>document.getElementById('fortuneWheelModal').remove(),300);">РћС‚РјРµРЅР°</button>
    </div>
  `;
  document.body.appendChild(modal);
  
  setTimeout(() => {
    document.getElementById('fortuneModalContent').classList.remove('scale-95', 'opacity-0');
    document.getElementById('fortuneModalContent').classList.add('scale-100', 'opacity-100');
  }, 10);
  
  const spinBtn = document.getElementById('spinBtnReal');
  const wheel = document.getElementById('wheelElement');
  
  spinBtn.onclick = async () => {
    if (getFortuneSpinCooldown() > 0) return;
    
    tgUtil.haptic('medium');
    spinBtn.disabled = true;
    spinBtn.innerHTML = 'Р’СЂР°С‰Р°РµРј... рџЊЂ';
    spinBtn.style.opacity = '0.5';
    
    // РћРїСЂРµРґРµР»СЏРµРј РІС‹РёРіСЂС‹С€ (РѕС‚ 1 РґРѕ 5 ICE, СЃ РјР°Р»РµРЅСЊРєРёРј С€Р°РЅСЃРѕРј РЅР° 10)
    const rand = Math.random();
    let winAmount = 1;
    if (rand > 0.95) winAmount = 10;
    else if (rand > 0.8) winAmount = 5;
    else if (rand > 0.5) winAmount = 2;
    
    // РђРЅРёРјР°С†РёСЏ РІСЂР°С‰РµРЅРёСЏ
    const extraSpins = 5; // 5 РїРѕР»РЅС‹С… РѕР±РѕСЂРѕС‚РѕРІ
    const stopAngle = (extraSpins * 360) + Math.floor(Math.random() * 360);
    
    wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.15, 1)';
    wheel.style.transform = `rotate(${stopAngle}deg)`;
    
    setTimeout(async () => {
      tgUtil.haptic('success');
      localStorage.setItem('last_fortune_spin', Date.now().toString());
      
      try {
        const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', userId).single();
        const newBal = (u?.ices_balance || 0) + winAmount;
        await supabaseClient.from('users').update({ ices_balance: newBal }).eq('user_id', userId);
        
        balance = newBal; // Р»РѕРєР°Р»СЊРЅРѕ
        glassToast(`РџРѕР·РґСЂР°РІР»СЏРµРј! Р’С‹ РІС‹РёРіСЂР°Р»Рё ${winAmount} ICE! рџЋЃ`, { kind: 'success' });
      } catch (err) {
        glassToast('РћС€РёР±РєР° РЅР°С‡РёСЃР»РµРЅРёСЏ Р±РѕРЅСѓСЃР°', { kind: 'error' });
      }
      
      setTimeout(() => {
        document.getElementById('fortuneModalContent').classList.remove('scale-100','opacity-100'); 
        setTimeout(() => {
          modal.remove();
          renderCurrentScreen();
        }, 300);
      }, 2000);
    }, 4100);
  };
};

    // ==================== Р Р•РќР”Р•Р  РљРђР‘РРќР•РўРђ Р”Р РћРџРЁРРџРџР•Р Рђ ====================
    async function renderDropshipper() {
      if (!userId) return '<p class="text-center mt-10 text-red-400">РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ</p>';
      
      let settings = { margin_type: 'fixed', margin_value: 0, payout_threshold: 50 };
      try {
        const { data, error } = await supabaseClient.from('dropshipper_settings').select('*').eq('user_id', userId).single();
        if (!error && data) settings = data;
      } catch(e) {}

      let maskedCard = null;
      try {
        const { data: udata } = await supabaseClient.from('users').select('encrypted_card').eq('user_id', userId).single();
        if (udata?.encrypted_card) {
          const dec = decryptData(udata.encrypted_card);
          maskedCard = dec?.cardNumber ? maskCard(dec.cardNumber) : '****';
        }
      } catch(e) {}

      let referrals = [];
      try {
        const { data, error } = await supabaseClient.from('referrals').select('referred_id, created_at').eq('referrer_id', userId);
        if (!error && data) referrals = data;
      } catch(e) {}
      
      let referralOrders = [];
      if (referrals.length > 0) {
        const referredIds = referrals.map(r => r.referred_id);
        try {
          const { data, error } = await supabaseClient.from('orders').select('*').in('user_id', referredIds).order('created_at', { ascending: false });
          if (!error && data) referralOrders = data;
        } catch(e) {}
      }
      
      let payoutRequests = [];
      try {
        const { data, error } = await supabaseClient.from('payout_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (!error && data) payoutRequests = data;
      } catch(e) {}
      
      const totalEarned = referralOrders.reduce((sum, order) => sum + (order.drop_margin || 0), 0);
      const availableForPayout = totalEarned - payoutRequests.filter(r => r.status === 'approved' || r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);

      const totalTurnover = referralOrders.reduce((sum, order) => sum + (Number(order.total_byn) || Number(order.total) || 0), 0);
      const referralOrdersCount = referralOrders.length;
      const averageCheck = referralOrdersCount > 0 ? (totalTurnover / referralOrdersCount).toFixed(2) : 0;

      const referralLink = userReferralCode ? `https://t.me/icelogix_bot?start=ref_${userReferralCode}` : null;

      const contentHubItems = [
        { title: 'Р‘Р°РЅРЅРµСЂ 1200x628', image: 'https://via.placeholder.com/300x200?text=Banner', text: 'Р›СѓС‡С€РёРµ РєСЂРѕСЃСЃРѕРІРєРё РёР· РљРёС‚Р°СЏ! РЎРєРёРґРєР° 10% РїРѕ РєРѕРґСѓ DROP10' },
        { title: 'РўРµРєСЃС‚ РґР»СЏ РїРѕСЃС‚Р°', image: null, text: 'РџСЂРёРІРµРґРё РґСЂСѓРіР° Рё РїРѕР»СѓС‡Рё 50 BYN РЅР° Р±Р°Р»Р°РЅСЃ!' }
      ];
      const contentHubHtml = contentHubItems.map(item => {
        const imgBlock = item.image
          ? `<img src="${item.image}" class="w-full h-32 object-cover rounded-lg mb-2">`
          : '<div class="w-full h-20 bg-white/10 rounded-lg mb-2 flex items-center justify-center text-4xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span></div>';
        const dlBtn = item.image
          ? `<button class="btn-primary content-download-btn flex-1 bg-cyan-500/30 hover:bg-cyan-500/50 py-2 rounded-lg text-xs" data-url="${item.image}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></span> РЎРєР°С‡Р°С‚СЊ</button>`
          : '';
        const preview = item.text.slice(0, 100) + (item.text.length > 100 ? '...' : '');
        const safeText = item.text.replace(/"/g, '&quot;');
        return `<div class="bg-white/5 rounded-xl p-3 mb-3">${imgBlock}<p class="text-white font-bold text-sm mb-1">${item.title}</p><p class="text-white/70 text-xs mb-3">${preview}</p><div class="flex gap-2"><button class="btn-secondary content-copy-btn flex-1" data-text="${safeText}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> РљРѕРїРёСЂРѕРІР°С‚СЊ С‚РµРєСЃС‚</button>${dlBtn}</div></div>`;
      }).join('');

      const payoutHistoryHtml = payoutRequests.length === 0
        ? '<p class="text-white/70 text-sm">РќРµС‚ Р·Р°СЏРІРѕРє РЅР° РІС‹РІРѕРґ</p>'
        : payoutRequests.map(req => {
            const sc = req.status === 'pending' ? 'text-yellow-400' : req.status === 'approved' ? 'text-green-400' : req.status === 'completed' ? 'text-blue-400' : 'text-red-400';
            const st = req.status === 'pending' ? 'Р’ РѕР±СЂР°Р±РѕС‚РєРµ' : req.status === 'approved' ? 'РћРґРѕР±СЂРµРЅ' : req.status === 'completed' ? 'Р’С‹РїР»Р°С‡РµРЅ' : 'РћС‚РєР»РѕРЅС‘РЅ';
            return `<div class="p-2 border-b border-white/10 last:border-0"><div class="flex justify-between items-center"><span class="text-white/80 text-sm font-bold">${req.amount} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></span><span class="text-xs ${sc}">${st}</span></div><p class="text-white/50 text-xs mt-0.5">${new Date(req.created_at).toLocaleDateString('ru-RU')}</p></div>`;
          }).join('');

      return `
        <button id="backToProfileBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
        <div class="space-y-4">
          <div class="glass-card">
            <h3 class="text-white font-bold text-lg mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> Р’Р°С€Р° СЂРµС„РµСЂР°Р»СЊРЅР°СЏ СЃСЃС‹Р»РєР°</h3>
            ${referralLink
              ? `<div class="flex items-center gap-2"><p class="text-cyan-400 text-sm truncate flex-1">${referralLink}</p><button id="copyReferralLinkBtn" data-link="${referralLink}" class="btn-secondary flex-shrink-0 text-white"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> РЎРєРѕРїРёСЂРѕРІР°С‚СЊ</button></div>`
              : '<p class="text-white/50 text-sm">РљРѕРґ РЅРµ СЃРіРµРЅРµСЂРёСЂРѕРІР°РЅ</p>'}
          </div>
          <div class="flex gap-2">
            <button id="showStatsTab" class="filter-chip active flex-1 text-center"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> РЎС‚Р°С‚РёСЃС‚РёРєР°</button>
            <button id="showContentHubTab" class="filter-chip flex-1 text-center"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/></svg></span> РљРѕРЅС‚РµРЅС‚-С…Р°Р±</button>
          </div>
          <div id="statsContainer">
            <div class="space-y-4">
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> РЎС‚Р°С‚РёСЃС‚РёРєР° РїСЂРѕРґР°Р¶</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">РћР±РѕСЂРѕС‚</p><p class="text-cyan-400 text-lg font-bold">${totalTurnover.toFixed(2)} BYN</p></div>
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Р’СЃРµРіРѕ Р·Р°РєР°Р·РѕРІ</p><p class="text-white text-lg font-bold">${referralOrdersCount}</p></div>
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">РЎСЂРµРґРЅРёР№ С‡РµРє</p><p class="text-white text-lg font-bold">${averageCheck} BYN</p></div>
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">РљР»РёРµРЅС‚РѕРІ</p><p class="text-white text-lg font-bold">${referrals.length}</p></div>
                </div>
              </div>
              
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Р¤РёРЅР°РЅСЃС‹</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-[var(--ice-primary)]/10 border border-[var(--ice-primary)]/20 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Р—Р°СЂР°Р±РѕС‚Р°РЅРѕ</p><p class="text-green-400 text-xl font-bold">${totalEarned} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></p></div>
                  <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Р”РѕСЃС‚СѓРїРЅРѕ Рє РІС‹РІРѕРґСѓ</p><p class="text-cyan-400 text-xl font-bold">${availableForPayout} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></p></div>
                  <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-center col-span-2"><p class="text-white/70 text-[10px] uppercase tracking-wider">РџРѕСЂРѕРі РІС‹РІРѕРґР°</p><p class="text-white text-lg font-bold">${settings.payout_threshold} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></p></div>
                </div>
              </div>
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3 flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> РќР°СЃС‚СЂРѕР№РєРё РЅР°С†РµРЅРєРё</h3>
                <div class="flex flex-col sm:flex-row gap-3 mb-3">
                  <select id="marginType" class="btn-secondary flex-1 p-2 rounded-lg border border-white/30">
                    <option value="fixed" ${settings.margin_type === 'fixed' ? 'selected' : ''}>Р¤РёРєСЃ (BYN)</option>
                    <option value="percent" ${settings.margin_type === 'percent' ? 'selected' : ''}>РџСЂРѕС†РµРЅС‚ (%)</option>
                  </select>
                  <input type="number" id="marginValue" class="btn-secondary flex-1 p-2 rounded-lg border border-white/30 min-w-0" value="${settings.margin_value}" step="1" placeholder="Р—РЅР°С‡РµРЅРёРµ">
                </div>
                <input type="number" id="payoutThreshold" class="btn-secondary w-full p-2 rounded-lg border border-white/30 mb-3" value="${settings.payout_threshold}" placeholder="РџРѕСЂРѕРі РІС‹РІРѕРґР° (BYN)">
                <div class="mt-3 mb-3">
                  <label class="text-white/60 text-sm"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span> РљР°СЂС‚Р° РґР»СЏ РІС‹РїР»Р°С‚</label>
                  ${maskedCard
                    ? `<div class="flex items-center gap-2 mt-1">
                         <p class="flex-1 p-2 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm font-mono">${maskedCard}</p>
                         <button id="editCardBtn" class="btn-secondary"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
                         <button id="deleteCardBtn" class="bg-red-600/60 px-3 py-2 rounded-lg text-xs"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
                       </div>
                       <div id="cardInputWrap" class="hidden mt-2">
                         <input type="text" id="cardNumberInput" class="btn-secondary w-full p-2 rounded-lg border border-white/30 text-sm font-mono" placeholder="0000 0000 0000 0000" maxlength="19">
                       </div>`
                    : `<input type="text" id="cardNumberInput" class="btn-secondary w-full mt-1 p-2 rounded-lg border border-white/30 text-sm font-mono" placeholder="0000 0000 0000 0000" maxlength="19">`
                  }
                  <p class="text-white/40 text-xs mt-1">Р”Р°РЅРЅС‹Рµ С€РёС„СЂСѓСЋС‚СЃСЏ РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј</p>
                </div>
                <button id="saveDropshipperSettings" class="btn-primary w-full">РЎРѕС…СЂР°РЅРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё</button>
              </div>
              ${availableForPayout >= settings.payout_threshold ? `<div class="glass-card"><button id="requestPayoutBtn" class="w-full bg-green-600 py-2 rounded-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/></svg></span> Р—Р°РїСЂРѕСЃРёС‚СЊ РІС‹РїР»Р°С‚Сѓ (${availableForPayout} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span>)</button></div>` : ''}
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> РСЃС‚РѕСЂРёСЏ РІС‹РїР»Р°С‚</h3>
                ${payoutHistoryHtml}
              </div>
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> РџСЂРёРІРµРґС‘РЅРЅС‹Рµ РєР»РёРµРЅС‚С‹</h3>
                ${referrals.length === 0 ? '<p class="text-white/70 text-sm">РџРѕРєР° РЅРµС‚ РїСЂРёРІРµРґС‘РЅРЅС‹С… РєР»РёРµРЅС‚РѕРІ</p>' : referrals.map(ref => `<div class="flex justify-between items-center p-2 border-b border-white/10"><span class="text-white/80 text-sm">ID: ${ref.referred_id}</span><span class="text-white/50 text-xs">${new Date(ref.created_at).toLocaleDateString()}</span></div>`).join('')}
              </div>
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Р—Р°РєР°Р·С‹ РєР»РёРµРЅС‚РѕРІ</h3>
                ${referralOrders.length === 0 ? '<p class="text-white/70 text-sm">РќРµС‚ Р·Р°РєР°Р·РѕРІ РѕС‚ РїСЂРёРІРµРґС‘РЅРЅС‹С… РєР»РёРµРЅС‚РѕРІ</p>' : referralOrders.map(order => `<div class="flex justify-between items-center p-2 border-b border-white/10"><span class="text-white/80 text-sm">Р—Р°РєР°Р· #${order.id.slice(0,8)}</span><span class="text-green-400 text-sm">+${order.drop_margin || 0} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></span><span class="text-white/50 text-xs">${new Date(order.created_at).toLocaleDateString()}</span></div>`).join('')}
              </div>
            </div>
          </div>
          <div id="contentHubContainer" class="hidden">
            <div class="glass-card">
              <h3 class="text-white font-bold text-lg mb-3"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/></svg></span> РљРѕРЅС‚РµРЅС‚-С…Р°Р±</h3>
              ${contentHubHtml}
            </div>
          </div>
        </div>
        ${renderFooter()}
      `;
    }

    function attachDropshipperHandlers() {
      const backBtn = document.getElementById('backToProfileBtn');
      if (backBtn) backBtn.addEventListener('click', () => switchTab('profile'));
      const saveBtn = document.getElementById('saveDropshipperSettings');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const marginType = document.getElementById('marginType').value;
          const marginValue = parseFloat(document.getElementById('marginValue').value);
          const payoutThreshold = parseFloat(document.getElementById('payoutThreshold').value);
          if (isNaN(marginValue) || isNaN(payoutThreshold)) { tgUtil.alert('Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ'); return; }
          try {
            const { error } = await supabaseClient.from('dropshipper_settings').upsert({
              user_id: userId, margin_type: marginType, margin_value: marginValue, payout_threshold: payoutThreshold, payout_method: 'card'
            });
            if (error) throw error;
            // Save encrypted card if provided
            const cardInput = document.getElementById('cardNumberInput');
            const cardWrap = document.getElementById('cardInputWrap');
            const cardVisible = cardInput && (!cardWrap || !cardWrap.classList.contains('hidden'));
            if (cardInput && cardVisible && cardInput.value.trim()) {
              const raw = cardInput.value.replace(/\s/g, '');
              const encrypted = encryptData({ cardNumber: raw });
              await supabaseClient.from('users').update({ encrypted_card: encrypted }).eq('user_id', userId);
            }
            tgUtil.alert('РќР°СЃС‚СЂРѕР№РєРё СЃРѕС…СЂР°РЅРµРЅС‹');
            renderCurrentScreen();
          } catch (err) { tgUtil.alert('РћС€РёР±РєР°: ' + err.message); }
        };
        // Card edit/delete handlers
        document.getElementById('editCardBtn')?.addEventListener('click', () => {
          document.getElementById('cardInputWrap')?.classList.remove('hidden');
        });
        document.getElementById('deleteCardBtn')?.addEventListener('click', async () => {
          if (!(await tgUtil.confirm('РЈРґР°Р»РёС‚СЊ СЃРѕС…СЂР°РЅС‘РЅРЅСѓСЋ РєР°СЂС‚Сѓ?'))) return;
          tgUtil.haptic('warning');
          await supabaseClient.from('users').update({ encrypted_card: null }).eq('user_id', userId);
          renderCurrentScreen();
        });
      }
      const payoutBtn = document.getElementById('requestPayoutBtn');
      if (payoutBtn) {
        payoutBtn.onclick = async () => {
          const amount = parseFloat(payoutBtn.innerText.match(/\d+/)?.[0] || 0);
          if (amount <= 0) { tgUtil.alert('РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ СЃСЂРµРґСЃС‚РІ'); return; }
          try {
            const { error } = await supabaseClient.from('payout_requests').insert({ user_id: userId, amount: amount, status: 'pending' });
            if (error) throw error;
            tgUtil.alert('Р—Р°СЏРІРєР° РЅР° РІС‹РІРѕРґ РѕС‚РїСЂР°РІР»РµРЅР°');
            renderCurrentScreen();
          } catch (err) { tgUtil.alert('РћС€РёР±РєР°: ' + err.message); }
        };
      }

      const copyRefBtn = document.getElementById('copyReferralLinkBtn');
      if (copyRefBtn) {
        copyRefBtn.onclick = () => {
          navigator.clipboard.writeText(copyRefBtn.dataset.link).then(() => tgUtil.alert('РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°'));
        };
      }

      const showStatsTab = document.getElementById('showStatsTab');
      const showContentHubTab = document.getElementById('showContentHubTab');
      const statsContainer = document.getElementById('statsContainer');
      const contentHubContainer = document.getElementById('contentHubContainer');
      if (showStatsTab && showContentHubTab) {
        showStatsTab.onclick = () => {
          statsContainer.classList.remove('hidden');
          contentHubContainer.classList.add('hidden');
          showStatsTab.classList.add('active');
          showContentHubTab.classList.remove('active');
        };
        showContentHubTab.onclick = () => {
          contentHubContainer.classList.remove('hidden');
          statsContainer.classList.add('hidden');
          showContentHubTab.classList.add('active');
          showStatsTab.classList.remove('active');
        };
      }

      document.querySelectorAll('.content-copy-btn').forEach(btn => {
        btn.onclick = () => {
          navigator.clipboard.writeText(btn.dataset.text).then(() => tgUtil.alert('РўРµРєСЃС‚ СЃРєРѕРїРёСЂРѕРІР°РЅ'));
        };
      });
      document.querySelectorAll('.content-download-btn').forEach(btn => {
        btn.onclick = () => { window.open(btn.dataset.url, '_blank'); };
      });
    }

    // ==================== Р Р•РќР”Р•Р  РђРљРђР”Р•РњРР ====================
async function renderAcademy() {
  try {
    const { data: courses, error } = await supabaseClient.from('courses').select('*').eq('is_active', true).order('created_at', { ascending: true });
    if (error) throw error;
    if (!courses || courses.length === 0) {
      return `
        <button id="backFromAcademyBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
        <div class="text-center py-10">
          <p class="text-white/70">РљСѓСЂСЃС‹ РїРѕРєР° РЅРµ РґРѕР±Р°РІР»РµРЅС‹</p>
          ${isOwner ? '<button id="addCourseBtn" class="btn-primary mt-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ РєСѓСЂСЃ</button>' : ''}
        </div>
        ${renderFooter()}
      `;
    }

    let userProgress = {};
    let userCourseIds = new Set();
    let userCoursePurchases = {};
    if (userId) {
      try {
        const { data } = await supabaseClient.from('user_lessons_progress').select('lesson_id, is_completed').eq('user_id', userId);
        if (data) data.forEach(p => { if (p.is_completed) userProgress[p.lesson_id] = true; });
      } catch(e) {}
      try {
        const { data } = await supabaseClient.from('user_courses').select('course_id, purchased_at').eq('user_id', userId);
        if (data) data.forEach(uc => { userCourseIds.add(uc.course_id); userCoursePurchases[uc.course_id] = uc.purchased_at; });
      } catch(e) {}
    }

    // Single batch query for all lessons (avoids N+1)
    const courseIds = courses.map(c => c.id);
    const { data: allLessonsData } = await supabaseClient
      .from('lessons').select('*').in('course_id', courseIds).order('order_index', { ascending: true });
    const lessonsByCourse = {};
    (allLessonsData || []).forEach(l => {
      if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
      lessonsByCourse[l.course_id].push(l);
    });

    const coursesWithLessons = courses.map(course => {
      const ls = lessonsByCourse[course.id] || [];
      const completedCount = ls.filter(l => userProgress[l.id]).length;
      const totalCount = ls.length;
      const progress = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
      const isPurchased = course.price_ice === 0 || userCourseIds.has(course.id);
      const allCompleted = totalCount > 0 && completedCount === totalCount;
      return { ...course, lessons: ls, progress, isPurchased, allCompleted, purchasedAt: userCoursePurchases[course.id] || null };
    });

    const ctIcon = t => ({ video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' }[t] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>');

    const lessonStatus = (lesson, course) => {
      if (userProgress[lesson.id]) return '<span class="text-green-400 text-xs"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РџСЂРѕР№РґРµРЅРѕ</span>';
      if (!course.isPurchased && course.price_ice > 0) return '<span class="text-white/30 text-xs"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> РўСЂРµР±СѓРµС‚ РїРѕРєСѓРїРєРё</span>';
      if (lesson.is_locked) return '<span class="text-yellow-400 text-xs"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРѕ</span>';
      if (lesson.unlock_delay_hours > 0 && course.purchasedAt) {
        const unlock = new Date(course.purchasedAt).getTime() + lesson.unlock_delay_hours * 3600000;
        if (Date.now() < unlock) {
          const h = Math.ceil((unlock - Date.now()) / 3600000);
          return `<span class="text-orange-400 text-xs"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р§РµСЂРµР· ${h}С‡</span>`;
        }
      }
      return '<span class="text-cyan-400 text-xs">в–¶ РќР°С‡Р°С‚СЊ</span>';
    };

    const lessonAccessible = (lesson, course) => {
      if (!course.isPurchased && course.price_ice > 0) return false;
      if (lesson.is_locked) return false;
      if (lesson.unlock_delay_hours > 0 && course.purchasedAt) {
        const unlock = new Date(course.purchasedAt).getTime() + lesson.unlock_delay_hours * 3600000;
        if (Date.now() < unlock) return false;
      }
      return true;
    };

    return `
      <div class="space-y-4">
        <button id="backFromAcademyBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
        ${isOwner ? '<button id="addCourseBtn" class="global-back-btn mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ РєСѓСЂСЃ</button>' : ''}
        ${coursesWithLessons.map(course => `
          <div class="course-card glass-card" data-course-id="${course.id}" data-is-purchased="${course.isPurchased}" data-price-ice="${course.price_ice}">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-white font-bold text-lg">${course.title}</h3>
                <p class="text-white/60 text-sm mt-0.5">${course.description || ''}</p>
                <div class="mt-2 flex items-center gap-2">
                  <div class="btn-secondary flex-1 h-1.5 overflow-hidden">
                    <div class="h-full bg-cyan-400 rounded-full" style="width:${course.progress}%"></div>
                  </div>
                  <span class="text-white/50 text-xs flex-shrink-0">${course.progress}% В· ${course.lessons.filter(l => userProgress[l.id]).length}/${course.lessons.length}</span>
                </div>
              </div>
              <div class="ml-3 text-right flex-shrink-0">
                <span class="text-cyan-400 font-bold text-sm">${course.price_ice > 0 ? course.price_ice + ' <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span>' : 'Р‘РµСЃРїР»Р°С‚РЅРѕ'}</span>
                ${course.isPurchased && course.price_ice > 0 ? '<p class="text-green-400 text-xs mt-1"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РљСѓРїР»РµРЅРѕ</p>' : ''}
              </div>
            </div>
            ${!course.isPurchased && course.price_ice > 0 ? `<button class="buyCourseBtn mt-3 w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 rounded-xl font-bold text-sm" data-course-id="${course.id}" data-price="${course.price_ice}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span> РљСѓРїРёС‚СЊ Р·Р° ${course.price_ice} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></button>` : ''}
            ${course.allCompleted && course.lessons.length > 0 ? `<button class="getCertBtn mt-2 w-full bg-gradient-to-r from-yellow-400 to-orange-500 py-2.5 rounded-xl font-bold text-sm text-slate-900" data-course-id="${course.id}" data-title="${course.title.replace(/"/g,'&quot;')}"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16M10 14.66V17c0 .55-.47 1-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47 1 .97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></span> РџРѕР»СѓС‡РёС‚СЊ СЃРµСЂС‚РёС„РёРєР°С‚</button>` : ''}
            <div class="lessons-container hidden mt-3 space-y-1.5" data-course="${course.id}" data-loaded="true">
              ${course.lessons.length === 0
                ? '<p class="text-white/40 text-sm text-center py-3">Р’ СЌС‚РѕРј РєСѓСЂСЃРµ РїРѕРєР° РЅРµС‚ СѓСЂРѕРєРѕРІ</p>'
                : course.lessons.map(lesson => {
                    const accessible = lessonAccessible(lesson, course);
                    const typeLabel = { video: 'Р’РёРґРµРѕ', quiz: 'РўРµСЃС‚', file: 'Р¤Р°Р№Р»', text: 'РўРµРєСЃС‚' }[lesson.content_type] || 'РўРµРєСЃС‚';
                    return `<div class="lesson-item bg-white/5 rounded-xl p-3 transition ${accessible ? 'cursor-pointer hover:bg-white/10' : 'opacity-50'}" data-lesson-id="${lesson.id}" data-course-id="${course.id}" data-accessible="${accessible}">
                      <div class="flex justify-between items-center gap-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <span class="text-lg flex-shrink-0">${ctIcon(lesson.content_type || 'text')}</span>
                          <div class="min-w-0">
                            <p class="text-white text-sm font-medium truncate">${lesson.title || 'Р‘РµР· РЅР°Р·РІР°РЅРёСЏ'}</p>
                            <p class="text-white/40 text-xs">${typeLabel}</p>
                          </div>
                        </div>
                        ${lessonStatus(lesson, course)}
                      </div>
                    </div>`;
                  }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      ${renderFooter()}
    `;
  } catch (err) {
    console.error('renderAcademy:', err);
    return '<p class="text-center mt-10 text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РєСѓСЂСЃРѕРІ</p>';
  }
}

    function attachAcademyHandlers() {
      const backBtn = document.getElementById('backFromAcademyBtn');
      if (backBtn) backBtn.addEventListener('click', () => switchTab('profile'));

      // в”Ђв”Ђ completeLesson в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      async function completeLesson(lessonId, courseId) {
        if (!userId) return;
        try {
          await supabaseClient.from('user_lessons_progress').upsert(
            { user_id: userId, lesson_id: lessonId, is_completed: true, completed_at: new Date().toISOString() },
            { onConflict: 'user_id,lesson_id' }
          );
          // Update badge in DOM
          const lessonEl = document.querySelector(`.lesson-item[data-lesson-id="${lessonId}"]`);
          if (lessonEl) {
            const badge = lessonEl.querySelector('span:last-child');
            if (badge) { badge.innerHTML = '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РџСЂРѕР№РґРµРЅРѕ'; badge.className = 'text-green-400 text-xs'; }
          }
          // Recalculate course progress
          const { data: ls } = await supabaseClient.from('lessons').select('id').eq('course_id', courseId);
          const { data: pr } = await supabaseClient.from('user_lessons_progress').select('lesson_id').eq('user_id', userId).eq('is_completed', true);
          const doneIds = new Set(pr?.map(p => p.lesson_id) || []);
          const total = ls?.length || 0;
          const done = ls?.filter(l => doneIds.has(l.id)).length || 0;
          const pct = total > 0 ? Math.round(done / total * 100) : 0;
          const card = document.querySelector(`[data-course-id="${courseId}"]`);
          if (card) {
            const bar = card.querySelector('.h-full.bg-cyan-400');
            if (bar) bar.style.width = pct + '%';
            const pctTxt = card.querySelector('.text-white\\/50.text-xs.flex-shrink-0');
            if (pctTxt) pctTxt.textContent = `${pct}% В· ${done}/${total}`;
            if (done === total && total > 0 && !card.querySelector('.getCertBtn')) {
              const title = card.querySelector('h3')?.textContent || '';
              const certBtn = document.createElement('button');
              certBtn.className = 'getCertBtn mt-2 w-full bg-gradient-to-r from-yellow-400 to-orange-500 py-2.5 rounded-xl font-bold text-sm text-slate-900';
              certBtn.dataset.courseId = courseId;
              certBtn.dataset.title = title;
              certBtn.innerHTML = '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РџРѕР»СѓС‡РёС‚СЊ СЃС‚Р°С‚СѓСЃ "РџСЂРѕРІРµСЂРµРЅРЅС‹Р№ РїР°СЂС‚РЅРµСЂ"';
              certBtn.onclick = () => handleGetCert(courseId, title);
              card.querySelector('.lessons-container')?.before(certBtn);
            }
          }
        } catch(e) { console.error('completeLesson:', e); }
      }

      // в”Ђв”Ђ showLessonModal в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      function showLessonModal(data, courseId) {
        let contentHtml = '';
        if (data.content_type === 'text') {
          contentHtml = `
            <div class="text-white/90 leading-relaxed text-sm space-y-3" style="user-select:none;-webkit-user-select:none">${data.content}</div>
            <p class="text-white/10 text-xs text-right mt-3">В© ICE LOGIX В· ${userId}</p>
            <button class="markDoneBtn mt-4 w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold" data-lid="${data.id}" data-cid="${courseId}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РћС‚РјРµС‚РёС‚СЊ РєР°Рє РїСЂРѕР№РґРµРЅРЅРѕРµ</button>`;
        } else if (data.content_type === 'video') {
          contentHtml = `
            <div class="relative">
              <video id="lessonVideo" src="${data.content}" class="w-full rounded-xl" controls controlsList="nodownload" oncontextmenu="return false"></video>
              <div class="absolute bottom-10 right-2 text-white/20 text-xs pointer-events-none select-none">ID:${userId}</div>
            </div>
            <p class="text-white/40 text-xs mt-1 text-center"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> РўРѕР»СЊРєРѕ РґР»СЏ Р»РёС‡РЅРѕРіРѕ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ В· ID: ${userId}</p>
            <button class="markDoneBtn mt-4 w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold" data-lid="${data.id}" data-cid="${courseId}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РћС‚РјРµС‚РёС‚СЊ РєР°Рє РїСЂРѕР№РґРµРЅРЅРѕРµ</button>`;
        } else if (data.content_type === 'quiz') {
          try {
            const quiz = JSON.parse(data.content);
            const threshold = quiz.pass_threshold || 70;
            contentHtml = `
              <div id="quizForm" class="space-y-4">
                ${quiz.questions.map((q, qi) => `
                  <div class="bg-white/5 rounded-xl p-3">
                    <p class="text-white text-sm font-medium mb-2">${qi + 1}. ${q.text}</p>
                    ${q.options.map((opt, oi) => `
                      <label class="flex items-center gap-2 mb-1.5 cursor-pointer">
                        <input type="radio" name="q${qi}" value="${oi}" class="accent-cyan-400">
                        <span class="text-white/80 text-sm">${opt}</span>
                      </label>`).join('')}
                  </div>`).join('')}
              </div>
              <div id="quizResult" class="hidden mt-3 p-3 rounded-xl text-center"></div>
              <button id="checkQuizBtn" class="btn-primary mt-4 w-full"
                data-questions='${JSON.stringify(quiz.questions).replace(/'/g,"&#39;")}'
                data-threshold="${threshold}" data-lid="${data.id}" data-cid="${courseId}">РџСЂРѕРІРµСЂРёС‚СЊ РѕС‚РІРµС‚С‹</button>`;
          } catch { contentHtml = '<p class="text-red-400">РћС€РёР±РєР° С„РѕСЂРјР°С‚Р° С‚РµСЃС‚Р°</p>'; }
        } else {
          contentHtml = `
            <div class="text-center py-6">
              <p class="text-5xl mb-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span></p>
              <p class="text-white font-bold mb-4">${data.title}</p>
              <button id="openFileBtn" class="btn-primary" data-url="${data.content}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></span> РћС‚РєСЂС‹С‚СЊ РјР°С‚РµСЂРёР°Р»</button>
            </div>
            <button class="markDoneBtn mt-4 w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold" data-lid="${data.id}" data-cid="${courseId}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РћС‚РјРµС‚РёС‚СЊ РєР°Рє РїСЂРѕР№РґРµРЅРЅРѕРµ</button>`;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
          <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-white font-bold text-lg flex-1 mr-3">${data.title}</h3>
              <button class="closeLessonModal text-white/50 hover:text-white text-2xl flex-shrink-0 leading-none">&times;</button>
            </div>
            ${contentHtml}
          </div>`;
        document.body.appendChild(modal);
        modal.querySelector('.closeLessonModal').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        // video ended в†’ auto-complete
        const vid = modal.querySelector('#lessonVideo');
        if (vid) vid.addEventListener('ended', async () => { await completeLesson(data.id, courseId); tgUtil.alert('вњ… РЈСЂРѕРє РїСЂРѕР№РґРµРЅ!'); });

        // mark done
        modal.querySelectorAll('.markDoneBtn').forEach(btn => {
          btn.onclick = async () => {
            await completeLesson(btn.dataset.lid, btn.dataset.cid);
            btn.innerHTML = '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РџСЂРѕР№РґРµРЅРѕ!'; btn.disabled = true;
            btn.className = btn.className.replace('bg-green-600', 'bg-green-900') + ' cursor-not-allowed opacity-60';
          };
        });

        // file open
        const fileBtn = modal.querySelector('#openFileBtn');
        if (fileBtn) fileBtn.onclick = () => { tgUtil.alert('Р”РѕРєСѓРјРµРЅС‚ Р·Р°С‰РёС‰С‘РЅ РІРѕРґСЏРЅС‹Рј Р·РЅР°РєРѕРј. РќРµ СЂР°СЃРїСЂРѕСЃС‚СЂР°РЅСЏР№С‚Рµ.'); window.open(fileBtn.dataset.url, '_blank'); };

        // quiz check
        const checkBtn = modal.querySelector('#checkQuizBtn');
        if (checkBtn) {
          checkBtn.onclick = async () => {
            const questions = JSON.parse(checkBtn.dataset.questions);
            const threshold = parseInt(checkBtn.dataset.threshold);
            
            // Check all questions answered
            let allAnswered = true;
            questions.forEach((q, qi) => {
              const sel = modal.querySelector(`input[name="q${qi}"]:checked`);
              const qBlock = modal.querySelectorAll('#quizForm > div')[qi];
              if (!sel) {
                allAnswered = false;
                if (qBlock) { qBlock.classList.add('border', 'border-red-500/50'); qBlock.style.animation = 'shake 0.3s'; }
              } else {
                if (qBlock) qBlock.classList.remove('border', 'border-red-500/50');
              }
            });
            if (!allAnswered) {
              glassToast('РћС‚РІРµС‚СЊС‚Рµ РЅР° РІСЃРµ РІРѕРїСЂРѕСЃС‹', { kind: 'warning' });
              return;
            }

            let correct = 0;
            questions.forEach((q, qi) => {
              const sel = modal.querySelector(`input[name="q${qi}"]:checked`);
              const qBlock = modal.querySelectorAll('#quizForm > div')[qi];
              const isCorrect = sel && parseInt(sel.value) === q.correct;
              if (isCorrect) {
                correct++;
                if (qBlock) { qBlock.classList.remove('border-red-500/50'); qBlock.classList.add('border', 'border-green-500/50'); }
              } else {
                if (qBlock) { qBlock.classList.remove('border-green-500/50'); qBlock.classList.add('border', 'border-red-500/50'); }
              }
            });
            const score = Math.round(correct / questions.length * 100);
            const resultDiv = modal.querySelector('#quizResult');
            resultDiv.classList.remove('hidden');
            if (score >= threshold) {
              resultDiv.className = 'mt-3 p-3 rounded-xl text-center bg-green-500/20 border border-green-500/50';
              resultDiv.innerHTML = `<p class="text-green-400 font-bold"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.8 11.3 2.9 7.1L21 8M9 16l-3 3-3-3M9 8l3-3 3 3"/><circle cx="12" cy="12" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/></svg></span> РўРµСЃС‚ РїСЂРѕР№РґРµРЅ! ${correct}/${questions.length} (${score}%)</p>`;
              await completeLesson(checkBtn.dataset.lid, checkBtn.dataset.cid);
              checkBtn.remove();
            } else {
              resultDiv.className = 'mt-3 p-3 rounded-xl text-center bg-red-500/20 border border-red-500/50';
              resultDiv.innerHTML = `<p class="text-red-400 font-bold"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${correct}/${questions.length} (${score}%). РќСѓР¶РЅРѕ ${threshold}%+</p><p class="text-white/50 text-xs mt-1">РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·</p>`;
            }
          };
        }
      }



      // в”Ђв”Ђ handleGetCert в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      async function handleGetCert(courseId, courseTitle) {
        try {
          tgUtil.alert('РџРѕРґС‚РІРµСЂР¶РґР°РµРј СЃС‚Р°С‚СѓСЃ...');
          await supabaseClient.from('users').update({ is_trusted: true }).eq('user_id', userId);
          userLimits.isTrusted = true;
          tgUtil.alert(`РџРѕР·РґСЂР°РІР»СЏРµРј! РЎС‚Р°С‚СѓСЃ "РџСЂРѕРІРµСЂРµРЅРЅС‹Р№ РїР°СЂС‚РЅРµСЂ" СѓСЃРїРµС€РЅРѕ РїРѕР»СѓС‡РµРЅ! рџЋ‰`);
          renderCurrentScreen();
        } catch(e) { tgUtil.alert('РћС€РёР±РєР°: ' + e.message); }
      }

      // в”Ђв”Ђ addCourse (owner) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      const addBtn = document.getElementById('addCourseBtn');
      if (addBtn && isOwner) addBtn.onclick = () => openCourseForm(null);

      // в”Ђв”Ђ buyCourseBtn в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      document.querySelectorAll('.buyCourseBtn').forEach(btn => {
        btn.onclick = async () => {
          const courseId = btn.dataset.courseId;
          const price = parseInt(btn.dataset.price);
          if (!userId) { tgUtil.alert('РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ'); return; }
          if (balance < price) { tgUtil.alert('РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ СЃСЂРµРґСЃС‚РІ'); return; }
          try {
            const { error: e1 } = await supabaseClient.from('users').update({ ices_balance: balance - price }).eq('user_id', userId);
            if (e1) throw e1;
            await supabaseClient.from('user_courses').upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id' });
            balance -= price;
            document.getElementById('headerBalance').innerText = balance;
            tgUtil.alert('вњ… РљСѓСЂСЃ РєСѓРїР»РµРЅ! РџСЂРёСЏС‚РЅРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ!');
            renderCurrentScreen();
          } catch (err) { tgUtil.alert('РћС€РёР±РєР°: ' + err.message); }
        };
      });


      // в”Ђв”Ђ getCertBtn в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      document.querySelectorAll('.getCertBtn').forEach(btn => {
        btn.onclick = () => handleGetCert(btn.dataset.courseId, btn.dataset.title);
      });

      // в”Ђв”Ђ helpers for lesson items в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      const lessonItemHtml = (lesson, courseId, isPurchased, priceIce) => {
        const accessible = (isPurchased || priceIce === 0) && !lesson.is_locked;
        const ctIcon = { video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' }[lesson.content_type] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>';
        const ctLabel = { video: 'Р’РёРґРµРѕ', quiz: 'РўРµСЃС‚', file: 'Р¤Р°Р№Р»' }[lesson.content_type] || 'РўРµРєСЃС‚';
        return `<div class="lesson-item bg-white/5 rounded-xl p-3 transition ${accessible ? 'cursor-pointer hover:bg-white/10' : 'opacity-50'}"
          data-lesson-id="${lesson.id}" data-course-id="${courseId}" data-accessible="${accessible}">
          <div class="flex justify-between items-center gap-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="text-lg flex-shrink-0">${ctIcon}</span>
              <div class="min-w-0">
                <p class="text-white text-sm font-medium truncate">${lesson.title || 'Р‘РµР· РЅР°Р·РІР°РЅРёСЏ'}</p>
                <p class="text-white/40 text-xs">${ctLabel}</p>
              </div>
            </div>
            <span class="text-cyan-400 text-xs">в–¶ РќР°С‡Р°С‚СЊ</span>
          </div>
        </div>`;
      };

      const attachLessonItemHandlers = (container) => {
        container.querySelectorAll('.lesson-item').forEach(item => {
          item.onclick = async (e) => {
            e.stopPropagation(); // prevent card click from toggling the container
            if (item.dataset.accessible === 'false') return;
            try {
              const { data, error } = await supabaseClient.from('lessons').select('*').eq('id', item.dataset.lessonId).single();
              if (error) throw error;
              showLessonModal(data, item.dataset.courseId);
            } catch(e) { tgUtil.alert('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СѓСЂРѕРєР°: ' + e.message); }
          };
        });
      };

      // Attach handlers to pre-rendered lesson items
      document.querySelectorAll('.lessons-container').forEach(container => {
        attachLessonItemHandlers(container);
      });

      // в”Ђв”Ђ toggle lessons list (with lazy reload) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      document.querySelectorAll('.course-card').forEach(card => {
        card.onclick = async (e) => {
          if (e.target.closest('button')) return;
          if (e.target.closest('.lesson-item')) return; // handled by lesson item handler
          const container = card.querySelector('.lessons-container');
          if (!container) return;

          // If lessons are not yet loaded (or reload forced), fetch them
          if (!container.dataset.loaded) {
            container.innerHTML = '<p class="text-white/40 text-xs text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р—Р°РіСЂСѓР·РєР° СѓСЂРѕРєРѕРІ...</p>';
            container.classList.remove('hidden');
            const courseId = card.dataset.courseId;
            const isPurchased = card.dataset.isPurchased === 'true';
            const priceIce = parseInt(card.dataset.priceIce) || 0;
            try {
              const { data: lessons, error } = await supabaseClient
                .from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
              if (error) throw error;
              if (!lessons || lessons.length === 0) {
                container.innerHTML = '<p class="text-white/40 text-sm text-center py-3">Р’ СЌС‚РѕРј РєСѓСЂСЃРµ РїРѕРєР° РЅРµС‚ СѓСЂРѕРєРѕРІ</p>';
              } else {
                container.innerHTML = lessons.map(l => lessonItemHtml(l, courseId, isPurchased, priceIce)).join('');
                attachLessonItemHandlers(container);
              }
              container.dataset.loaded = 'true';
            } catch(err) {
              container.innerHTML = '<p class="text-red-400 text-xs text-center py-3">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СѓСЂРѕРєРѕРІ</p>';
            }
            return;
          }
          container.classList.toggle('hidden');
        };
      });
    }


    // ==================== Р“Р›РћР‘РђР›Р¬РќР«Р• РњРћР”РђР›Р« РљРЈР РЎРћР’ ====================
    function openCourseForm(course = null) {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
          <h3 class="text-white font-bold text-lg mb-4">${course ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ РєСѓСЂСЃ' : '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> РќРѕРІС‹Р№ РєСѓСЂСЃ'}</h3>
          <label class="text-white/60 text-xs">РќР°Р·РІР°РЅРёРµ</label>
          <input id="mCourseTitle" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="РќР°Р·РІР°РЅРёРµ РєСѓСЂСЃР°" value="${course?.title || ''}">
          <label class="text-white/60 text-xs">РћРїРёСЃР°РЅРёРµ</label>
          <textarea id="mCourseDesc" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" rows="2" placeholder="РћРїРёСЃР°РЅРёРµ">${course?.description || ''}</textarea>
          <label class="text-white/60 text-xs">Р¦РµРЅР° (Р°Р№СЃС‹, 0 = Р±РµСЃРїР»Р°С‚РЅРѕ)</label>
          <input type="number" id="mCoursePrice" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" value="${course?.price_ice ?? 0}">
          <label class="text-white/60 text-xs">Р”РѕСЃС‚СѓРї РґР»СЏ</label>
          <select id="mCourseAccess" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3">
            <option value="all" ${course?.role_access === 'all' || !course ? 'selected' : ''}>Р’СЃРµ</option>
            <option value="client" ${course?.role_access === 'client' ? 'selected' : ''}>РљР»РёРµРЅС‚С‹</option>
            <option value="dropshipper" ${course?.role_access === 'dropshipper' ? 'selected' : ''}>Р”СЂРѕРїС€РёРїРїРµСЂС‹</option>
          </select>
          <div class="flex items-center gap-2 mb-4">
            <input type="checkbox" id="mCourseActive" ${course?.is_active !== false ? 'checked' : ''}>
            <label for="mCourseActive" class="text-white/70 text-sm">РђРєС‚РёРІРµРЅ</label>
          </div>
          <div class="flex gap-3">
            <button id="mCourseSave" class="btn-primary flex-1">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
            <button id="mCourseCancel" class="btn-secondary flex-1">РћС‚РјРµРЅР°</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#mCourseCancel').onclick = () => modal.remove();
      modal.querySelector('#mCourseSave').onclick = async () => {
        const title = modal.querySelector('#mCourseTitle').value.trim();
        const description = modal.querySelector('#mCourseDesc').value.trim();
        const price_ice = parseInt(modal.querySelector('#mCoursePrice').value) || 0;
        const role_access = modal.querySelector('#mCourseAccess').value;
        const is_active = modal.querySelector('#mCourseActive').checked;
        if (!title) { tgUtil.alert('Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ'); return; }
        try {
          if (course) {
            await supabaseClient.from('courses').update({ title, description, price_ice, role_access, is_active }).eq('id', course.id);
          } else {
            await supabaseClient.from('courses').insert({ title, description, price_ice, role_access, is_active });
          }
          modal.remove();
          renderCurrentScreen();
        } catch(e) { tgUtil.alert('РћС€РёР±РєР°: ' + e.message); }
      };
    }

    async function manageLessonsModal(courseId) {
      const ctIcon  = t => ({ video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' }[t] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>');
      const ctLabel = t => ({ video: 'Р’РёРґРµРѕ', quiz: 'РўРµСЃС‚', file: 'Р¤Р°Р№Р»' }[t] || 'РўРµРєСЃС‚');

      const { data: course } = await supabaseClient.from('courses').select('title').eq('id', courseId).single();

      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-1">
            <div>
              <h3 class="text-white font-bold text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span> РЈСЂРѕРєРё РєСѓСЂСЃР°</h3>
              <p class="text-cyan-400 text-sm">${course?.title || ''}</p>
            </div>
            <button class="closeMgr text-white/50 hover:text-white text-2xl flex-shrink-0 ml-3">&times;</button>
          </div>
          <div class="flex gap-2 my-4">
            <button id="addLessonBtn" class="btn-primary flex-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ СѓСЂРѕРє</button>
            <button id="refreshLessonsBtn" class="btn-secondary" title="РћР±РЅРѕРІРёС‚СЊ СЃРїРёСЃРѕРє"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></span></button>
          </div>
          <div class="space-y-2" id="lessonsMgrList">
            <p class="text-white/40 text-xs text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р—Р°РіСЂСѓР·РєР°...</p>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('.closeMgr').onclick = () => modal.remove();

      const listEl = modal.querySelector('#lessonsMgrList');

      // в”Ђв”Ђ render one lesson row в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      const lessonRowHtml = l => `
        <div class="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl">
          <span class="text-xl flex-shrink-0">${ctIcon(l.content_type)}</span>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">${l.title}</p>
            <p class="text-white/40 text-xs">#${l.order_index} В· ${ctLabel(l.content_type)} В· ${l.is_locked ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРѕ' : '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РћС‚РєСЂС‹С‚Рѕ'}${l.unlock_delay_hours > 0 ? ' В· <span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> ' + l.unlock_delay_hours + 'С‡' : ''}</p>
          </div>
          <button class="btn-secondary previewLessonBtn bg-white/10 hover:" data-lid="${l.id}" title="РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span></button>
          <button class="btn-secondary editLessonBtn" data-lid="${l.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="deleteLessonBtn bg-red-600/60 hover:bg-red-600/80 px-2 py-1 rounded text-xs" data-lid="${l.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
        </div>`;

      // в”Ђв”Ђ attach handlers to current list items в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      const attachListHandlers = () => {
        listEl.querySelectorAll('.previewLessonBtn').forEach(btn => {
          btn.onclick = async () => {
            const { data: l } = await supabaseClient.from('lessons').select('*').eq('id', btn.dataset.lid).single();
            if (l) previewLessonAdmin(l);
          };
        });
        listEl.querySelectorAll('.editLessonBtn').forEach(btn => {
          btn.onclick = async () => {
            const { data: l } = await supabaseClient.from('lessons').select('*').eq('id', btn.dataset.lid).single();
            // Open lesson form ON TOP of this modal (z-[70] > z-[60]); modal stays open
            if (l) openLessonForm(courseId, l, l.order_index, refreshList);
          };
        });
        listEl.querySelectorAll('.deleteLessonBtn').forEach(btn => {
          btn.onclick = async () => {
            if (!(await tgUtil.confirm('РЈРґР°Р»РёС‚СЊ СѓСЂРѕРє? РџСЂРѕРіСЂРµСЃСЃ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ С‚РѕР¶Рµ Р±СѓРґРµС‚ СѓРґР°Р»С‘РЅ.'))) return;
            tgUtil.haptic('warning');
            const { error } = await supabaseClient.from('lessons').delete().eq('id', btn.dataset.lid);
            if (error) { tgUtil.alert('РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ: ' + error.message); return; }
            await refreshList();
          };
        });
      };

      // в”Ђв”Ђ re-fetch and re-render the lessons list in place в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
      const refreshList = async () => {
        listEl.innerHTML = '<p class="text-white/40 text-xs text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Р—Р°РіСЂСѓР·РєР°...</p>';
        const { data: freshLessons, error } = await supabaseClient
          .from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
        if (error) { listEl.innerHTML = `<p class="text-red-400 text-xs text-center py-3">РћС€РёР±РєР°: ${error.message}</p>`; return; }
        const freshLs = freshLessons || [];
        const nextIdx = freshLs.length > 0 ? Math.max(...freshLs.map(l => l.order_index ?? 0)) + 1 : 1;
        // Keep the add button's nextIdx up to date
        modal.querySelector('#addLessonBtn').onclick = () => openLessonForm(courseId, null, nextIdx, refreshList);
        if (freshLs.length === 0) {
          listEl.innerHTML = '<p class="text-white/40 text-sm text-center py-4">Р’ СЌС‚РѕРј РєСѓСЂСЃРµ РїРѕРєР° РЅРµС‚ СѓСЂРѕРєРѕРІ. Р”РѕР±Р°РІСЊС‚Рµ РїРµСЂРІС‹Р№!</p>';
        } else {
          listEl.innerHTML = freshLs.map(lessonRowHtml).join('');
          attachListHandlers();
        }
      };

      // Initial load
      await refreshList();
      modal.querySelector('#refreshLessonsBtn').onclick = refreshList;
    }

    function openLessonForm(courseId, lesson = null, defaultOrderIndex = 0, onSave = null) {
      const contentPlaceholders = {
        text: 'Р’РІРµРґРёС‚Рµ С‚РµРєСЃС‚ СѓСЂРѕРєР° (РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ HTML)',
        video: 'https://example.com/video.mp4',
        quiz: '{"questions":[{"text":"Р’РѕРїСЂРѕСЃ?","options":["A","B","C"],"correct":0}],"pass_threshold":70}',
        file: 'https://example.com/document.pdf'
      };
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
          <h3 class="text-white font-bold text-lg mb-1">${lesson ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СѓСЂРѕРє' : '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> РќРѕРІС‹Р№ СѓСЂРѕРє'}</h3>
          <p class="text-white/40 text-xs mb-4">course_id: ${courseId}</p>

          <label class="text-white/60 text-xs">РќР°Р·РІР°РЅРёРµ <span class="text-red-400">*</span></label>
          <input id="mLessonTitle" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="РќР°Р·РІР°РЅРёРµ СѓСЂРѕРєР°" value="${lesson?.title || ''}">

          <label class="text-white/60 text-xs">РўРёРї РєРѕРЅС‚РµРЅС‚Р°</label>
          <select id="mLessonType" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3">
            <option value="text" ${!lesson || lesson.content_type === 'text' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span> РўРµРєСЃС‚ / HTML</option>
            <option value="video" ${lesson?.content_type === 'video' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span> Р’РёРґРµРѕ (URL)</option>
            <option value="quiz" ${lesson?.content_type === 'quiz' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span> РўРµСЃС‚ (JSON)</option>
            <option value="file" ${lesson?.content_type === 'file' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span> Р¤Р°Р№Р» (URL)</option>
          </select>

          <label class="text-white/60 text-xs">РљРѕРЅС‚РµРЅС‚ <span class="text-red-400">*</span></label>
          <p id="mContentHint" class="text-white/30 text-xs mt-0.5 mb-1"></p>
          <textarea id="mLessonContent" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3 font-mono text-sm" rows="5"
            placeholder="${contentPlaceholders[lesson?.content_type || 'text']}">${lesson?.content || ''}</textarea>

          <div class="flex gap-3 mb-3">
            <div class="flex-1">
              <label class="text-white/60 text-xs">РџРѕСЂСЏРґРѕРє (#)</label>
              <input type="number" id="mLessonOrder" class="btn-secondary w-full mt-1 p-2 rounded-xl border border-white/30" value="${lesson?.order_index ?? defaultOrderIndex}" min="0">
            </div>
            <div class="flex-1" id="mDelayRow" style="${lesson?.is_locked || lesson?.unlock_delay_hours > 0 ? '' : 'opacity:0.4'}">
              <label class="text-white/60 text-xs">Р—Р°РґРµСЂР¶РєР° (С‡Р°СЃС‹)</label>
              <input type="number" id="mLessonDelay" class="btn-secondary w-full mt-1 p-2 rounded-xl border border-white/30" value="${lesson?.unlock_delay_hours ?? 0}" min="0">
            </div>
          </div>

          <div class="flex items-center gap-2 mb-4">
            <input type="checkbox" id="mLessonLocked" ${lesson?.is_locked ? 'checked' : ''}>
            <label for="mLessonLocked" class="text-white/70 text-sm">Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ РІСЂСѓС‡РЅСѓСЋ (РёР»Рё РґСЂРёРї-РєРѕРЅС‚РµРЅС‚)</label>
          </div>

          <div class="flex gap-3">
            <button id="mLessonSave" class="btn-primary flex-1">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
            <button id="mLessonCancel" class="btn-secondary flex-1">РћС‚РјРµРЅР°</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      // Dynamic content placeholder based on type
      const typeSelect = modal.querySelector('#mLessonType');
      const contentArea = modal.querySelector('#mLessonContent');
      const hintEl = modal.querySelector('#mContentHint');
      const hints = {
        text: 'HTML-РєРѕРЅС‚РµРЅС‚ СѓСЂРѕРєР°',
        video: 'РџСЂСЏРјР°СЏ СЃСЃС‹Р»РєР° РЅР° РІРёРґРµРѕ (.mp4) РёР»Рё YouTube',
        quiz: 'JSON: { questions:[{text,options:[],correct:0}], pass_threshold:70 }',
        file: 'РџСЂСЏРјР°СЏ СЃСЃС‹Р»РєР° РЅР° С„Р°Р№Р» (PDF, ZIPвЂ¦)'
      };
      const updateHint = () => {
        hintEl.textContent = hints[typeSelect.value] || '';
        contentArea.placeholder = contentPlaceholders[typeSelect.value] || '';
      };
      updateHint();
      typeSelect.addEventListener('change', updateHint);

      // Toggle delay row visibility with is_locked
      const lockedCheck = modal.querySelector('#mLessonLocked');
      const delayRow = modal.querySelector('#mDelayRow');
      lockedCheck.addEventListener('change', () => {
        delayRow.style.opacity = lockedCheck.checked ? '1' : '0.4';
      });

      modal.querySelector('#mLessonCancel').onclick = () => modal.remove();
      modal.querySelector('#mLessonSave').onclick = async () => {
        const title = modal.querySelector('#mLessonTitle').value.trim();
        const content_type = typeSelect.value;
        const content = contentArea.value.trim();
        const order_index = parseInt(modal.querySelector('#mLessonOrder').value) || 0;
        const unlock_delay_hours = lockedCheck.checked ? (parseInt(modal.querySelector('#mLessonDelay').value) || 0) : 0;
        const is_locked = lockedCheck.checked;
        if (!title) { tgUtil.alert('Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ СѓСЂРѕРєР°'); return; }
        if (!content) { tgUtil.alert('Р—Р°РїРѕР»РЅРёС‚Рµ РїРѕР»Рµ В«РљРѕРЅС‚РµРЅС‚В»'); return; }
        const saveBtn = modal.querySelector('#mLessonSave');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> РЎРѕС…СЂР°РЅРµРЅРёРµ...';
        try {
          const payload = {
            course_id: courseId,
            title,
            content_type,
            content,
            order_index,
            is_locked,
            unlock_delay_hours
          };
          let error;
          if (lesson) {
            ({ error } = await supabaseClient.from('lessons').update(payload).eq('id', lesson.id));
          } else {
            ({ error } = await supabaseClient.from('lessons').insert(payload));
          }
          if (error) throw new Error(error.message);
          tgUtil.alert('вњ… РЈСЂРѕРє СЃРѕС…СЂР°РЅС‘РЅ');
          modal.remove();
          if (onSave) await onSave(); else renderCurrentScreen();
        } catch(e) {
          tgUtil.alert('<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ: ' + e.message);
          saveBtn.disabled = false;
          saveBtn.textContent = 'РЎРѕС…СЂР°РЅРёС‚СЊ';
        }
      };
    }

    function previewLessonAdmin(lesson) {
      const ctLabels = { video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span> Р’РёРґРµРѕ', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span> РўРµСЃС‚', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span> Р¤Р°Р№Р»', text: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span> РўРµРєСЃС‚' };
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4';
      let contentHtml = '';
      if (lesson.content_type === 'video') {
        contentHtml = `<video src="${lesson.content}" class="w-full rounded-xl" controls></video>`;
      } else if (lesson.content_type === 'file') {
        contentHtml = `<div class="text-center py-4"><p class="text-4xl mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span></p><a href="${lesson.content}" target="_blank" class="text-cyan-400 underline break-all">${lesson.content}</a></div>`;
      } else if (lesson.content_type === 'quiz') {
        try {
          const quiz = JSON.parse(lesson.content);
          contentHtml = `<div class="space-y-3">${quiz.questions.map((q, i) => `
            <div class="bg-white/5 rounded-xl p-3">
              <p class="text-white text-sm font-medium mb-2">${i + 1}. ${q.text}</p>
              ${q.options.map((o, oi) => `<p class="text-sm ${oi === q.correct ? 'text-green-400 font-bold' : 'text-white/60'}">  ${oi === q.correct ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span>' : 'в—‹'} ${o}</p>`).join('')}
            </div>`).join('')}<p class="text-white/40 text-xs">РџРѕСЂРѕРі: ${quiz.pass_threshold || 70}%</p></div>`;
        } catch { contentHtml = `<pre class="text-white/70 text-xs whitespace-pre-wrap break-all">${lesson.content}</pre>`; }
      } else {
        contentHtml = `<div class="text-white/90 text-sm leading-relaxed">${lesson.content}</div>`;
      }
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-white/40 text-xs">${ctLabels[lesson.content_type] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>'} В· РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ</p>
              <h3 class="text-white font-bold text-lg">${lesson.title}</h3>
            </div>
            <button class="closePreview text-white/50 hover:text-white text-2xl flex-shrink-0 ml-3">&times;</button>
          </div>
          <div class="border-t border-white/10 pt-4">${contentHtml}</div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('.closePreview').onclick = () => modal.remove();
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }

    async function renderWishlist() {
  if (!userId) return '<p class="text-center mt-10 text-white/70">РђРІС‚РѕСЂРёР·СѓР№С‚РµСЃСЊ</p>';
  try {
    const { data: wishlistItems, error } = await supabaseClient.from('wishlist').select('product_id, products(*)').eq('user_id', userId);
    if (error) throw error;
    if (!wishlistItems || wishlistItems.length === 0) {
      return `
        <button id="backFromWishlistBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
        <div class="flex-1"><p class="text-center mt-10 text-white/70">РЈ РІР°СЃ РїРѕРєР° РЅРµС‚ РёР·Р±СЂР°РЅРЅС‹С… С‚РѕРІР°СЂРѕРІ</p></div>
        ${renderFooter()}
      `;
    }
    return `
      <button id="backFromWishlistBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
      <div class="grid grid-cols-2 gap-4">
        ${wishlistItems.map(item => {
          const p = item.products;
          if (!p) return '';
          return `
            <div class="product-card" data-product-id="${p.id}">
              <div class="aspect-square bg-white/10 flex items-center justify-center relative">
                <img src="${p.image_url || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover">
                <span class="absolute top-2 right-2 wishlist-heart text-xl text-red-500 cursor-pointer" data-product-id="${p.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span></span>
              </div>
              <div class="p-2">
                <p class="text-white font-bold text-sm truncate">${p.title}</p>
                <p class="text-cyan-400 text-xs">${p.price} ${p.currency}</p>
                <div class="flex gap-1 mt-2">
                  <button class="btn-primary addToCartBtn flex-1 bg-cyan-500/70 hover:" data-product-id="${p.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span></button>
                  <button class="buyNowBtn flex-1 bg-green-500/70 hover:bg-green-500 py-1 rounded text-xs" data-url="${p.url}" data-price="${p.price}"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span></button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${renderFooter()}
    `;
  } catch (err) { return '<p class="text-center mt-10 text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РёР·Р±СЂР°РЅРЅРѕРіРѕ</p>'; }
}

function attachWishlistHandlers() {
  const backBtn = document.getElementById('backFromWishlistBtn');
  if (backBtn) backBtn.addEventListener('click', () => switchTab('profile'));

  document.querySelectorAll('.wishlist-heart').forEach(heart => {
    heart.addEventListener('click', async (e) => {
      e.stopPropagation();
      const productId = heart.dataset.productId;
      await supabaseClient.from('wishlist').delete().eq('user_id', userId).eq('product_id', productId);
      wishlist.delete(productId);
      renderCurrentScreen();
    });
  });

  // Р’РЅСѓС‚СЂРё loadHomeProducts, РїРѕСЃР»Рµ grid.innerHTML = ...
document.querySelectorAll('.addToCartBtn').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const productId = btn.dataset.productId;
    if (productId) addToCart(productId);
  };
});

document.querySelectorAll('.buyNowBtn').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const url = btn.dataset.url;
    const price = parseFloat(btn.dataset.price);
    if (url && !isNaN(price)) {
      window.tempOrder = {
        url: url,
        price: price,
        weight: 1,
        total: window.iceLogixPricing.quickEstimate(price, 1),
        discountAmount: 0,
        appliedPromo: null
      };
      switchTab('neworder');
    }
  };
});



}

    // ==================== Р Р•РќР”Р•Р  РћРўР§РЃРўРћР’ ====================
    async function renderReports() {
      try {
        const { data, error } = await supabaseClient.from('public_reports').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (error) throw error;
        
        let statsHtml = '';
        try {
          const { count } = await supabaseClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered');
          statsHtml = `<div class="glass-card mb-4 p-3 flex justify-around items-center text-center"><div class="flex-1 border-r border-white/10"><p class="text-white/50 text-[10px] uppercase">Р’С‹РєСѓРїР»РµРЅРѕ</p><p class="text-white font-bold text-lg">${data ? data.length : 0}</p></div><div class="flex-1"><p class="text-white/50 text-[10px] uppercase">Р”РѕСЃС‚Р°РІР»РµРЅРѕ</p><p class="text-cyan-400 font-bold text-lg">${count || '120+'}</p></div></div>`;
        } catch(e) {}
        
        if (!data || data.length === 0) {
          return `${statsHtml}<div class="text-center py-10"><p class="text-white/70">РџРѕРєР° РЅРµС‚ РїСѓР±Р»РёС‡РЅС‹С… РѕС‚С‡С‘С‚РѕРІ</p>${isOwner ? '<button id="addReportBtn" class="btn-primary mt-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ РїРµСЂРІС‹Р№ РѕС‚С‡С‘С‚</button>' : ''}</div>${renderFooter()}`;
        }
        return `
          <div class="space-y-4">
            ${statsHtml}
            ${isOwner ? '<button id="addReportBtn" class="global-back-btn mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ РѕС‚С‡С‘С‚</button>' : ''}
            ${data.map(report => {
              let mediaUrls = [];
              try { mediaUrls = JSON.parse(report.image_url); } catch(e) { mediaUrls = [report.image_url]; }
              if (!Array.isArray(mediaUrls)) mediaUrls = [report.image_url];
              
              const carouselHtml = mediaUrls.map((url, idx) => `
                <div class="w-full flex-shrink-0 relative h-72">
                  ${report.type === 'video' ? `<video src="${url}" class="w-full h-full object-cover" controls></video>` : `<img src="${url}" class="w-full h-full object-cover" alt="${report.title}" onclick="tgUtil.popup('${url}', 'Р¤РѕС‚Рѕ РѕС‚С‡РµС‚Р°')">`}
                  ${mediaUrls.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-full text-white text-[10px]">${idx + 1} / ${mediaUrls.length}</div>` : ''}
                </div>
              `).join('');

              return `
              <div class="glass-card overflow-hidden !p-0 border border-white/5 shadow-xl">
                <div class="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                  ${mediaUrls.map((url, idx) => `
                    <div class="w-full flex-shrink-0 snap-start relative h-[320px]">
                      ${report.type === 'video' ? `<video src="${url}" class="w-full h-full object-cover" controls></video>` : `<img src="${url}" class="w-full h-full object-cover" alt="${report.title}" onclick="tgUtil.popup('${url}', 'Р¤РѕС‚Рѕ РѕС‚С‡РµС‚Р°')">`}
                      ${mediaUrls.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-full text-white text-[10px]">${idx + 1} / ${mediaUrls.length}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
                <div class="p-4">
                  <h3 class="text-white font-bold text-lg leading-tight">${report.title}</h3>
                  <p class="text-white/70 text-sm mt-2 whitespace-pre-wrap">${report.description || ''}</p>
                  <div class="flex justify-between items-center mt-4">
                    <span class="text-white/40 text-[10px] uppercase font-bold tracking-wider">${new Date(report.created_at).toLocaleDateString('ru-RU')}</span>
                    ${report.product_url ? `<button class="btn-primary orderFromReportBtn transition !py-1.5 !px-3 !text-xs" data-url="${report.product_url}"><span class="ix text-[12px]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span> РҐРѕС‡Сѓ С‚Р°РєРѕР№ Р¶Рµ</button>` : ''}
                  </div>
                </div>
              </div>
            `}).join('')}
          </div>
          ${renderFooter()}
        `;
      } catch (err) { return '<p class="text-center mt-10 text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РѕС‚С‡С‘С‚РѕРІ</p>'; }
    }

    function attachReportsHandlers() {
      const addBtn = document.getElementById('addReportBtn');
      if (addBtn) {
        addBtn.onclick = () => {
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
          modal.innerHTML = `
            <div class="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 class="text-white font-bold text-lg mb-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> РќРѕРІС‹Р№ РѕС‚С‡С‘С‚</h3>
              <input type="text" id="reportTitle" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3" placeholder="Р—Р°РіРѕР»РѕРІРѕРє">
              <textarea id="reportDesc" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3" placeholder="РћРїРёСЃР°РЅРёРµ" rows="3"></textarea>
              <select id="reportType" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3">
                <option value="photo">Р¤РѕС‚Рѕ</option>
                <option value="video">Р’РёРґРµРѕ</option>
              </select>
              
              <div id="mediaUrlsContainer" class="space-y-2 mb-2">
                <input type="url" class="reportUrlInput btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="РЎСЃС‹Р»РєР° РЅР° С„РѕС‚Рѕ/РІРёРґРµРѕ (Р РµР°Р»СЊРЅРѕСЃС‚СЊ)">
              </div>
              <button id="addMediaUrlBtn" class="text-cyan-400 text-xs mb-4 font-bold flex items-center gap-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ РµС‰Рµ С„РѕС‚Рѕ (РЅР°РїСЂРёРјРµСЂ, С‡РµРє)</button>

              <input type="url" id="reportProductUrl" class="btn-secondary w-full p-3 rounded-xl border border-cyan-500/30 mb-3" placeholder="РЎСЃС‹Р»РєР° РЅР° РѕСЂРёРіРёРЅР°Р»СЊРЅС‹Р№ С‚РѕРІР°СЂ (РґР»СЏ 'РҐРѕС‡Сѓ С‚Р°РєРѕР№ Р¶Рµ')">
              <div class="flex gap-3 mt-4">
                <button id="saveReportBtn" class="btn-primary flex-1">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
                <button id="cancelReportBtn" class="btn-secondary flex-1">РћС‚РјРµРЅР°</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          
          modal.querySelector('#addMediaUrlBtn').onclick = () => {
            const input = document.createElement('input');
            input.type = 'url';
            input.className = 'reportUrlInput btn-secondary w-full p-3 rounded-xl border border-white/30';
            input.placeholder = 'Р•С‰Рµ СЃСЃС‹Р»РєР° РЅР° С„РѕС‚Рѕ/РІРёРґРµРѕ';
            modal.querySelector('#mediaUrlsContainer').appendChild(input);
          };

          modal.querySelector('#cancelReportBtn').onclick = () => modal.remove();
          modal.querySelector('#saveReportBtn').onclick = async () => {
            const title = modal.querySelector('#reportTitle').value.trim();
            const description = modal.querySelector('#reportDesc').value.trim();
            const type = modal.querySelector('#reportType').value;
            const product_url = modal.querySelector('#reportProductUrl').value.trim();
            
            const urlInputs = Array.from(modal.querySelectorAll('.reportUrlInput')).map(i => i.value.trim()).filter(v => v !== '');
            if (!title || urlInputs.length === 0) { tgUtil.alert('Р—Р°РїРѕР»РЅРёС‚Рµ Р·Р°РіРѕР»РѕРІРѕРє Рё С…РѕС‚СЏ Р±С‹ РѕРґРЅСѓ СЃСЃС‹Р»РєСѓ РЅР° С„РѕС‚Рѕ/РІРёРґРµРѕ'); return; }
            
            let finalImageUrl = urlInputs.length > 1 ? JSON.stringify(urlInputs) : urlInputs[0];

            try {
              await supabaseClient.from('public_reports').insert({ title, description, type, image_url: finalImageUrl, product_url, is_active: true, created_at: new Date().toISOString() });
              tgUtil.alert('РћС‚С‡С‘С‚ РґРѕР±Р°РІР»РµРЅ'); modal.remove(); renderCurrentScreen();
            } catch (err) { tgUtil.alert('РћС€РёР±РєР°: ' + err.message); }
          };
        };
      }
      document.querySelectorAll('.orderFromReportBtn').forEach(btn => {
        btn.onclick = () => {
          const url = btn.getAttribute('data-url');
          window.tempOrder = { url: url, price: 520, weight: 1, total: 0, discountAmount: 0, appliedPromo: null };
          switchTab('neworder');
        };
      });
    }

        // ==================== Р Р•РќР”Р•Р  РћРўР—Р«Р’РћР’ ====================
        window.currentReviewsRegion = window.currentReviewsRegion || 'all';
        async function renderReviews() {
      try {
        let query = supabaseClient.from('reviews').select('*, orders(items)', { count: 'exact' }).eq('is_published', true).order('created_at', { ascending: false });
        
        // РџРѕРїС‹С‚РєР° С„РёР»СЊС‚СЂР°С†РёРё РїРѕ СЂРµРіРёРѕРЅСѓ (РµСЃР»Рё СЃС‚РѕР»Р±РµС† СЃСѓС‰РµСЃС‚РІСѓРµС‚)
        if (window.currentReviewsRegion !== 'all') {
            query = query.eq('region', window.currentReviewsRegion);
        }

        const { data, count, error } = await query.range((reviewsPage - 1) * 10, reviewsPage * 10 - 1);
        
        // Р•СЃР»Рё РѕС€РёР±РєР° СЃРІСЏР·Р°РЅР° СЃ РѕС‚СЃСѓС‚СЃС‚РІРёРµРј СЃС‚РѕР»Р±С†Р° region, fallback РЅР° РІСЃРµ РѕС‚Р·С‹РІС‹
        let finalData = data;
        let finalCount = count;
        if (error && error.message.includes('region')) {
            console.warn('Column region does not exist yet. Showing all.');
            const fallbackQuery = await supabaseClient.from('reviews').select('*, orders(items)', { count: 'exact' }).eq('is_published', true).order('created_at', { ascending: false }).range((reviewsPage - 1) * 10, reviewsPage * 10 - 1);
            finalData = fallbackQuery.data;
            finalCount = fallbackQuery.count;
        } else if (error) throw error;

        reviewsTotalPages = Math.ceil((finalCount || 0) / 10);
        
        const canReview = userId ? await canUserReview() : false;
        
        const regions = [
          { id: 'all', label: 'Р’СЃРµ' },
          { id: 'china', label: 'РљРёС‚Р°Р№ рџ‡Ёрџ‡і' },
          { id: 'europe', label: 'Р•РІСЂРѕРїР° рџ‡Єрџ‡є' },
          { id: 'russia', label: 'Р РѕСЃСЃРёСЏ рџ‡·рџ‡є' },
          { id: 'usa', label: 'РЎРЁРђ рџ‡єрџ‡ё', disabled: true },
          { id: 'uae', label: 'РћРђР­ рџ‡¦рџ‡Є', disabled: true }
        ];

        return `
          <div class="space-y-4 page-enter">
            <h2 class="text-white text-xl font-bold mb-2"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span> РћС‚Р·С‹РІС‹ РЅР°С€РёС… РєР»РёРµРЅС‚РѕРІ</h2>
            
            <div class="flex gap-2 overflow-x-auto pb-2 hide-scrollbar" id="reviewsRegionTabs">
              ${regions.map(r => `
                <button class="filter-chip ${window.currentReviewsRegion === r.id ? 'active' : ''} ${r.disabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                        data-region="${r.id}" ${r.disabled ? 'disabled title="РЎРєРѕСЂРѕ"' : ''}>
                  ${r.label}
                  ${r.disabled ? '<span class="ix text-white text-[10px] ml-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>' : ''}
                </button>
              `).join('')}
            </div>

            ${!finalData || finalData.length === 0 ? '<p class="text-white/70">РџРѕРєР° РЅРµС‚ РѕС‚Р·С‹РІРѕРІ РІ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё</p>' : finalData.map(review => {
              const siteImg = review.orders && Array.isArray(review.orders.items) && review.orders.items[0] ? (review.orders.items[0].image || review.orders.items[0].img) : null;
              const hasClientPhotos = review.photo_urls && review.photo_urls.length > 0;
              
              const regionLabel = regions.find(r => r.id === review.region)?.label || 'РќРµ СѓРєР°Р·Р°РЅ';
              
              return `
              <div class="review-card glass-card p-4 rounded-2xl mb-4">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <p class="text-white font-bold flex items-center gap-2">${review.user_name || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'} ${review.is_verified ? '<span class="ix ix-success text-sm" title="Р—Р°РєР°Р· РїРѕРґС‚РІРµСЂР¶РґРµРЅ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' : ''}</p>
                    ${review.region ? `<span class="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">${regionLabel}</span>` : ''}
                  </div>
                  <div class="stars flex">${'<span class="ix ix-fill ix-warning w-4 h-4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(review.rating)}${'<span class="ix ix-mute w-4 h-4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(5 - review.rating)}</div>
                </div>
                
                ${(siteImg || hasClientPhotos) ? `
                <div class="flex gap-2 mt-3 mb-3">
                  ${siteImg ? `
                  <div class="flex-1 relative rounded-xl overflow-hidden border border-white/10" style="aspect-ratio: 1/1;">
                    <span class="absolute top-1 left-1 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-white/90 z-10">РЎР°Р№С‚</span>
                    <img src="${siteImg}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition" onclick="tgUtil.popup('${siteImg}', 'Р¤РѕС‚Рѕ СЃ СЃР°Р№С‚Р°')">
                  </div>
                  ` : ''}
                  ${hasClientPhotos ? `
                  <div class="flex-1 relative rounded-xl overflow-hidden border border-cyan-500/30" style="aspect-ratio: 1/1;">
                    <span class="absolute top-1 left-1 bg-cyan-500/80 text-[10px] px-1.5 py-0.5 rounded text-white z-10">Р РµР°Р»СЊРЅРѕСЃС‚СЊ</span>
                    <img src="${review.photo_urls[0]}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition" onclick="tgUtil.popup('${review.photo_urls[0]}', 'Р¤РѕС‚Рѕ РєР»РёРµРЅС‚Р°')">
                    ${review.photo_urls.length > 1 ? `<span class="absolute bottom-1 right-1 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-white z-10">+${review.photo_urls.length - 1}</span>` : ''}
                  </div>
                  ` : ''}
                </div>
                ` : ''}
                
                <p class="text-white/90 text-sm italic mt-2 text-left bg-white/5 p-3 rounded-xl border-l-2 border-cyan-500/50">"${review.text}"</p>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-white/50 text-xs">${new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                  <span class="text-green-400 text-xs">${review.is_verified ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РџРѕРґС‚РІРµСЂР¶РґС‘РЅРЅС‹Р№ Р·Р°РєР°Р·' : ''}</span>
                </div>
              </div>
            `}).join('')}
            <div class="flex justify-center gap-2 mt-4"><button id="prevReviewPage" class="btn-secondary" ${reviewsPage <= 1 ? 'disabled' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button><span class="text-white/70 py-2">РЎС‚СЂР°РЅРёС†Р° ${reviewsPage} РёР· ${reviewsTotalPages}</span><button id="nextReviewPage" class="btn-secondary" ${reviewsPage >= reviewsTotalPages ? 'disabled' : ''}>Р’РїРµСЂС‘Рґ <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></button></div>
            ${canReview ? '<button id="leaveReviewBtn" class="btn-primary w-full transition mt-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> РћСЃС‚Р°РІРёС‚СЊ РѕС‚Р·С‹РІ</button>' : '<p class="text-center text-white/70 mt-4">РћСЃС‚Р°РІРёС‚СЊ РѕС‚Р·С‹РІ РјРѕРіСѓС‚ С‚РѕР»СЊРєРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё, СЃРѕРІРµСЂС€РёРІС€РёРµ РїРѕРєСѓРїРєСѓ</p>'}
          </div>
          ${renderFooter()}
        `;
      } catch (err) { return '<p class="text-center mt-10 text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РѕС‚Р·С‹РІРѕРІ</p>'; }
    }

    // ==================== Р Р•РќР”Р•Р  РќРћР’РћР“Рћ Р—РђРљРђР—Рђ (РЎ РџР РћРњРћРљРћР”РђРњР) ====================
    async function canUserReview() {
      if (!userId) return false;
      const { data, error } = await supabaseClient.from('orders').select('id').eq('user_id', userId).eq('status', 'delivered').limit(1);
      return !error && data && data.length > 0;
    }

    function attachReviewsHandlers() {
      const prevBtn = document.getElementById('prevReviewPage');
      const nextBtn = document.getElementById('nextReviewPage');
      if (prevBtn) prevBtn.onclick = () => { if (reviewsPage > 1) { reviewsPage--; renderCurrentScreen(); } };
      if (nextBtn) nextBtn.onclick = () => { if (reviewsPage < reviewsTotalPages) { reviewsPage++; renderCurrentScreen(); } };
      
      const update = async () => {
        let price = parseFloat(priceInp?.value);
        if (isNaN(price)) price = 520;
        let weight = parseFloat(weightInp?.value);
        if (isNaN(weight)) weight = 1;

        const vacuumChk = document.getElementById('orderVacuum');
        const bubbleChk = document.getElementById('orderBubbleWrap');
        let extraCost = 0;
        if (vacuumChk?.checked) extraCost += 3.3; 
        if (bubbleChk?.checked) extraCost += 6.6;

        let total = (price * 0.45 * 1.20) + (weight * 12) + extraCost;
        let discount = window.tempOrder?.discountAmount || 0;
        if (totalSpan) totalSpan.innerText = (total - discount).toFixed(2);
        if (prepaymentSpan) prepaymentSpan.innerText = ((total - discount) * 0.70).toFixed(2);
        window.tempOrder = { ...window.tempOrder, url: urlInp?.value || '', price: price, weight: weight, total: total, discountAmount: discount, cny_rate: 0.45 };
        
        const warnDiv = document.getElementById('customsWarning');
        try {
           const { data } = await supabaseClient.from('settings').select('value').eq('key', 'customs_limits').single();
           const limitEur = data?.value?.limit || 200;
           const orderEur = price / 7.8;
           if (orderEur > limitEur) {
             if (warnDiv) warnDiv.classList.remove('hidden');
           } else {
             if (warnDiv) warnDiv.classList.add('hidden');
           }
        } catch(e){}
      };
      
      const splitOrderBtn = document.getElementById('splitOrderBtn');
      if (splitOrderBtn) {
        splitOrderBtn.onclick = () => {
          alert('Р¤СѓРЅРєС†РёСЏ СЂР°Р·РґРµР»РµРЅРёСЏ РїРѕСЃС‹Р»РєРё С„РѕСЂРјРёСЂСѓРµС‚ РґРІР° Р·Р°РєР°Р·Р° СЃ СЂР°Р·РЅС‹РјРё С‚СЂРµРє-РЅРѕРјРµСЂР°РјРё. Р’С‹ СЃРјРѕР¶РµС‚Рµ СѓРєР°Р·Р°С‚СЊ РІС‚РѕСЂРѕРіРѕ РїРѕР»СѓС‡Р°С‚РµР»СЏ РЅР° СЃР»РµРґСѓСЋС‰РµРј СЌС‚Р°РїРµ!');
        }
      }
      
      if (priceInp) priceInp.addEventListener('input', update);
      if (weightInp) weightInp.addEventListener('input', update);
      const vacuumChk = document.getElementById('orderVacuum');
      if (vacuumChk) vacuumChk.addEventListener('change', update);
      const bubbleChk = document.getElementById('orderBubbleWrap');
      if (bubbleChk) bubbleChk.addEventListener('change', update);

      // РЈРјРЅС‹Р№ РїРѕРґР±РѕСЂ РІРµСЃР° РїРѕ РєР°С‚РµРіРѕСЂРёРё Рё СЂР°Р·РјРµСЂСѓ
      const orderCategory = document.getElementById('orderCategory');
      const orderSize = document.getElementById('orderSize');
      const orderKeepBox = document.getElementById('orderKeepBox');
      const regionTabs = document.querySelectorAll('#reviewsRegionTabs button');
      regionTabs.forEach(tab => {
          tab.onclick = () => {
              if (tab.disabled) return;
              window.currentReviewsRegion = tab.getAttribute('data-region');
              reviewsPage = 1;
              renderCurrentScreen();
          };
      });
      
      const leaveBtn = document.getElementById('leaveReviewBtn');
      if (leaveBtn) {
        leaveBtn.onclick = async () => {
          const { data: orders } = await supabaseClient.from('orders').select('id').eq('user_id', userId).eq('status', 'delivered');
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
          modal.innerHTML = `
            <div class="glass-card max-w-md w-full">
              <h3 class="text-white font-bold text-lg mb-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> РћСЃС‚Р°РІРёС‚СЊ РѕС‚Р·С‹РІ</h3>
              <select id="reviewOrder" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3"><option value="">Р’С‹Р±РµСЂРёС‚Рµ Р·Р°РєР°Р·</option>${orders.map(o => `<option value="${o.id}">Р—Р°РєР°Р· #${o.id.slice(0,8)}</option>`).join('')}</select>
              
              <select id="reviewRegion" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3">
                <option value="">РЈРєР°Р¶РёС‚Рµ СЂРµРіРёРѕРЅ РїР»РѕС‰Р°РґРєРё</option>
                <option value="china">РљРёС‚Р°Р№ (Poizon, 1688...)</option>
                <option value="europe">Р•РІСЂРѕРїР° (ASOS, Zalando...)</option>
                <option value="russia">Р РѕСЃСЃРёСЏ (Wildberries, Ozon...)</option>
              </select>

              <select id="reviewRating" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3"><option value="5"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span> (5)</option><option value="4"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span> (4)</option><option value="3"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span> (3)</option><option value="2"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span> (2)</option><option value="1"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span> (1)</option></select>
              <textarea id="reviewText" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3" placeholder="Р’Р°С€ РѕС‚Р·С‹РІ" rows="4"></textarea>
              <div class="mb-3">
                <label class="block text-white/70 text-sm mb-1">Р’Р°С€Рµ С„РѕС‚Рѕ "Р’Р¶РёРІСѓСЋ" (Р‘РѕРЅСѓСЃ 5 BYN РїРѕСЃР»Рµ РїСЂРѕРІРµСЂРєРё)</label>
                <input type="file" id="reviewPhotos" multiple accept="image/*" class="w-full text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30">
              </div>
              <div class="flex gap-3 mt-4"><button id="submitReviewBtn" class="btn-primary flex-1">РћС‚РїСЂР°РІРёС‚СЊ</button><button id="cancelReviewBtn" class="btn-secondary flex-1">РћС‚РјРµРЅР°</button></div>
            </div>
          `;
          document.body.appendChild(modal);
          modal.querySelector('#cancelReviewBtn').onclick = () => modal.remove();
          modal.querySelector('#submitReviewBtn').onclick = async () => {
            const submitBtn = modal.querySelector('#submitReviewBtn');
            const orderId = modal.querySelector('#reviewOrder').value;
            const rating = parseInt(modal.querySelector('#reviewRating').value);
            const text = modal.querySelector('#reviewText').value.trim();
            const photoInput = modal.querySelector('#reviewPhotos');
            
            if (!orderId || !text) { tgUtil.alert('Р’С‹Р±РµСЂРёС‚Рµ Р·Р°РєР°Р· Рё РІРІРµРґРёС‚Рµ С‚РµРєСЃС‚ РѕС‚Р·С‹РІР°'); return; }
            submitBtn.disabled = true;
            submitBtn.innerText = 'РћС‚РїСЂР°РІРєР°...';
            try {
              let photoUrls = [];
              if (photoInput.files && photoInput.files.length > 0) {
                for (let i = 0; i < photoInput.files.length; i++) {
                  if (i >= 3) break;
                  const file = photoInput.files[i];
                  const ext = file.name.split('.').pop() || 'jpg';
                  const filename = `review_${userId}_${Date.now()}_${i}.${ext}`;
                  const { data, error } = await supabaseClient.storage.from('review-photos').upload(filename, file);
                  if (error) throw error;
                  const { data: publicData } = supabaseClient.storage.from('review-photos').getPublicUrl(filename);
                  if (publicData) photoUrls.push(publicData.publicUrl);
                }
              }
              await supabaseClient.from('reviews').insert({ user_id: userId, order_id: orderId, rating: rating, text: text, user_name: userName, is_verified: true, photo_urls: photoUrls });
              tgUtil.alert('РЎРїР°СЃРёР±Рѕ Р·Р° РѕС‚Р·С‹РІ! РћРЅ РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ РјРѕРґРµСЂР°С†РёРё.');
              modal.remove();
            } catch (err) { tgUtil.alert('РћС€РёР±РєР°: ' + err.message); submitBtn.disabled = false; submitBtn.innerText = 'РћС‚РїСЂР°РІРёС‚СЊ'; }
          };
        };
      }
    }



let adminUsersSearch = '';

window.changeUserBalance = async (userId, currentBalance) => {
  const amountStr = prompt(`РўРµРєСѓС‰РёР№ Р±Р°Р»Р°РЅСЃ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ: ${currentBalance} ICE\n\nР’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ (СЃ РјРёРЅСѓСЃРѕРј РґР»СЏ СЃРїРёСЃР°РЅРёСЏ):`);
  if (!amountStr) return;
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount === 0) return;
  
  try {
    const newBalance = Number(currentBalance) + amount;
    
    const { error } = await supabaseClient.from('users').update({ ices_balance: newBalance }).eq('user_id', userId);
    if (error) throw error;
    
    const { error: txErr } = await supabaseClient.from('transactions').insert({
      user_id: userId,
      type: amount > 0 ? 'admin_bonus' : 'admin_correction',
      amount_ices: amount,
      status: 'completed',
      metadata: { note: 'РР·РјРµРЅРµРЅРёРµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј' }
    });
    if (txErr) console.warn('РћС€РёР±РєР° Р·Р°РїРёСЃРё С‚СЂР°РЅР·Р°РєС†РёРё', txErr);
    
    if (amount > 0) {
      supabaseClient.functions.invoke('send-notification', { body: { user_id: userId, message: `рџ’Ћ *РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°!*\n\nРђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РЅР°С‡РёСЃР»РёР» РІР°Рј **${amount} ICE**.` } }).catch(console.error);
    }
    
    glassToast('Р‘Р°Р»Р°РЅСЃ СѓСЃРїРµС€РЅРѕ РѕР±РЅРѕРІР»РµРЅ!', { kind: 'success' });
    renderCurrentScreen();
  } catch (err) {
    console.error('РћС€РёР±РєР° РёР·РјРµРЅРµРЅРёСЏ Р±Р°Р»Р°РЅСЃР°:', err);
    glassToast('РћС€РёР±РєР°: ' + err.message, { kind: 'error' });
  }
};

window.adminUpdateTracking = async (orderId) => {
  const trackCN = prompt('Р’РІРµРґРёС‚Рµ С‚СЂРµРє-РЅРѕРјРµСЂ РґР»СЏ РљРёС‚Р°СЏ (РѕСЃС‚Р°РІСЊС‚Рµ РїСѓСЃС‚С‹Рј, РµСЃР»Рё РЅРµС‚):');
  if (trackCN === null) return;
  const trackBY = prompt('Р’РІРµРґРёС‚Рµ С‚СЂРµРє-РЅРѕРјРµСЂ РґР»СЏ Р Р‘ (РѕСЃС‚Р°РІСЊС‚Рµ РїСѓСЃС‚С‹Рј, РµСЃР»Рё РЅРµС‚):');
  if (trackBY === null) return;
  
  try {
    const updateData = {};
    if (trackCN) updateData.tracking_number_cn = trackCN;
    if (trackBY) updateData.tracking_number_by = trackBY;
    
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseClient.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      
      glassToast('РўСЂРµРє-РЅРѕРјРµСЂР° СЃРѕС…СЂР°РЅРµРЅС‹!', { kind: 'success' });
      renderCurrentScreen();
    }
  } catch (err) {
    console.error('РћС€РёР±РєР° РґРѕР±Р°РІР»РµРЅРёСЏ С‚СЂРµРєР°:', err);
    glassToast('РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ', { kind: 'error' });
  }
};

async function renderAdminUsersList() {
  try {
    let query = supabaseClient.from('users').select('*').order('created_at', { ascending: false });
    const { data: users, error } = await query;
    if (error) throw error;
    
    let filtered = users;
    if (adminUsersSearch) {
      const lowerSearch = adminUsersSearch.toLowerCase();
      filtered = users.filter(u => 
        (u.username && u.username.toLowerCase().includes(lowerSearch)) || 
        (u.full_name && u.full_name.toLowerCase().includes(lowerSearch)) ||
        (String(u.user_id).includes(lowerSearch))
      );
    }
    
    if (!filtered || filtered.length === 0) return '<p class="text-white/70 text-center py-4">РќРµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№</p>';
    
    return filtered.slice(0, 50).map(u => `
      <div class="bg-white/5 rounded-lg p-3">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-white font-bold text-sm">${u.full_name || 'Р‘РµР· РёРјРµРЅРё'} ${u.username ? '(@' + u.username + ')' : ''}</p>
            <p class="text-white/50 text-[10px]">ID: ${u.user_id} | Р РµРі: ${new Date(u.created_at).toLocaleDateString('ru-RU')}</p>
            <p class="text-cyan-400 font-bold mt-1 text-sm">${Number(u.ices_balance || 0).toFixed(2)} ICE</p>
          </div>
          <div class="flex flex-col gap-2">
            <button class="btn-primary px-3 py-1.5 text-xs rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.3)]" onclick="window.changeUserBalance('${u.user_id}', ${u.ices_balance || 0})">
              рџ’ё РР·РјРµРЅРёС‚СЊ
            </button>
            <button class="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs rounded-lg transition" onclick="window.enterShadowMode('${u.user_id}')">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span> Р’РѕР№С‚Рё РєР°Рє
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('РћС€РёР±РєР° РІ renderAdminUsersList:', err);
    return '<p class="text-xs text-red-400 text-center">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё</p>';
  }
}

async function renderMarketplacesAdminList() {
  try {
    const { data, error } = await supabaseClient.from('marketplaces').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return '<p class="text-white/70 text-center py-2">РќРµС‚ РїР»РѕС‰Р°РґРѕРє</p>';
    return data.map(mp => `
      <div class="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <div class="flex items-center gap-2">
          ${mp.logo_url ? `<img src="${mp.logo_url}" class="w-8 h-8 object-contain rounded">` : '<span class="btn-secondary w-8 h-8 flex items-center justify-center"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span></span>'}
          <div>
            <span class="text-white">${mp.name}</span>
            <span class="text-white/50 text-xs block">${mp.country}</span>
          </div>
        </div>
        <div>
          <button class="editMarketplaceBtn text-cyan-400 mr-2" data-id="${mp.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="deleteMarketplaceBtn text-red-400" data-id="${mp.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    return '<p class="text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё</p>';
  }
}

async function renderPromotionsAdminList() {
  try {
    const { data, error } = await supabaseClient.from('promotions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return '<p class="text-white/70 text-center py-2">РќРµС‚ Р°РєС†РёР№</p>';
    
    return data.map(p => `
      <div class="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <div>
          <span class="text-white">${p.title}</span>
          <span class="text-cyan-400 text-xs ml-2">${p.discount_type === 'percent' ? p.discount_value + '%' : p.discount_value + ' BYN'}</span>
          <span class="text-white/50 text-xs block">${p.is_active ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РђРєС‚РёРІРЅР°' : '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> РќРµР°РєС‚РёРІРЅР°'}</span>
        </div>
        <div>
          <button class="editPromotionBtn text-cyan-400 mr-2" data-id="${p.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="deletePromotionBtn text-red-400" data-id="${p.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    return '<p class="text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё</p>';
  }
}

// ==================== ADMIN LOGGING + CSV HELPERS ====================
async function logAdminAction(action, details = {}) {
  if (!userId) return;
  try {
    await supabaseClient.from('admin_logs').insert({
      admin_id: userId,
      action,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      created_at: new Date().toISOString()
    });
  } catch(e) { /* silent вЂ” never interrupt admin workflow */ }
}

function downloadCSV(csvContent, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM so Excel opens correctly
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function renderAdminClaimsList() {
  try {
    const { data: claims, error } = await supabaseClient
      .from('insurance_claims')
      .select('*, orders(total_byn, status)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!claims || claims.length === 0) {
      return '<p class="text-xs text-white/40 text-center py-4">РќРµС‚ Р°РєС‚РёРІРЅС‹С… СЃС‚СЂР°С…РѕРІС‹С… РїСЂРµС‚РµРЅР·РёР№</p>';
    }

    return claims.map(c => {
      const orderTotal = c.orders ? Number(c.orders.total_byn || 0) : 0;
      const isPending = c.status === 'pending';
      const isApproved = c.status === 'approved';
      const isRejected = c.status === 'rejected';

      return `
        <div class="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 mb-2 text-left page-enter font-sans">
          <div class="flex justify-between items-center text-[10px] text-white/50">
            <span>РџСЂРµС‚РµРЅР·РёСЏ РѕС‚: ${new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
            <span class="font-mono text-white/70">Р®Р·РµСЂ: ${c.user_id}</span>
          </div>
          <div class="text-xs text-white leading-normal">
            <p><strong>Р—Р°РєР°Р·:</strong> <span class="font-mono text-cyan-400 font-semibold">#${c.order_id.slice(0, 8)}</span></p>
            <p class="mt-1"><strong>РЎСѓРјРјР° РІРѕР·РјРµС‰РµРЅРёСЏ:</strong> <span class="text-green-400 font-mono font-bold">${orderTotal.toFixed(2)} BYN</span></p>
            <p class="mt-1.5 p-2 bg-slate-950/60 rounded-lg text-white/70 border border-white/5 font-sans">
              <strong>РћРїРёСЃР°РЅРёРµ:</strong> ${c.description}
            </p>
          </div>
          ${isPending ? `
            <div class="flex gap-2 pt-1.5">
              <button class="approveClaimBtn bg-green-600 hover:bg-green-700 text-slate-900 font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}" data-user-id="${c.user_id}" data-amount="${orderTotal}" data-order-id="${c.order_id}">
                РћРґРѕР±СЂРёС‚СЊ РІС‹РїР»Р°С‚Сѓ
              </button>
              <button class="rejectClaimBtn bg-red-600 hover:bg-red-700 text-white font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}">
                РћС‚РєР»РѕРЅРёС‚СЊ
              </button>
            </div>
          ` : isApproved ? `
            <div class="p-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] text-center font-bold rounded-lg font-sans">
              рџџў Р’Р«РџР›РђРўРђ РћР”РћР‘Р Р•РќРђ Р Р—РђР§РРЎР›Р•РќРђ РќРђ Р‘РђР›РђРќРЎ
            </div>
          ` : `
            <div class="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold rounded-lg font-sans">
              рџ”ґ РџР Р•РўР•РќР—РРЇ РћРўРљР›РћРќР•РќРђ
              ${c.rejection_reason ? '<p class="font-normal text-[9px] text-white/50 mt-0.5 font-sans">РџСЂРёС‡РёРЅР°: ' + c.rejection_reason + '</p>' : ''}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch(e) {
    return '<p class="text-xs text-red-400 text-center py-4">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїСЂРµС‚РµРЅР·РёР№</p>';
  }
}

async function renderAdminLegitChecksList() {
  try {
    const { data: checks, error } = await supabaseClient
      .from('legit_check_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!checks || checks.length === 0) {
      return '<p class="text-xs text-white/40 text-center py-4">РќРµС‚ Р·Р°СЏРІРѕРє РЅР° Legit-Check</p>';
    }

    return checks.map(c => {
      const imageUrls = (c.photos || []).map(p => {
        if (p.startsWith('http')) return p;
        return supabaseClient.storage.from('product-screenshots').getPublicUrl(p).data.publicUrl;
      });

      const isPending = c.status === 'pending';
      const isOriginal = c.status === 'original';
      const isFake = c.status === 'fake';

      return `
        <div class="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 mb-2 text-left page-enter font-sans">
          <div class="flex justify-between items-center text-[10px] text-white/50">
            <span>Р—Р°СЏРІРєР° РѕС‚: ${new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
            <span class="font-mono text-white/70">Р®Р·РµСЂ: ${c.user_id}</span>
          </div>
          <div class="text-xs text-white leading-normal">
            <p><strong>РўРѕРІР°СЂ:</strong> <span class="text-cyan-400 font-bold">${c.brand} ${c.model}</span></p>
            <p class="text-white/40 text-[9px] mt-0.5">РљР»РёРєРЅРёС‚Рµ РїРѕ С„РѕС‚Рѕ РґР»СЏ СѓРІРµР»РёС‡РµРЅРёСЏ РІРѕ РІРµСЃСЊ СЌРєСЂР°РЅ</p>
            <div class="grid grid-cols-4 gap-1.5 mt-1.5 mb-2">
              ${imageUrls.map((url, i) => `
                <div class="aspect-square rounded-lg bg-white/15 overflow-hidden cursor-pointer border border-white/5 hover:border-cyan-500/50 transition" onclick="window.open('${url}', '_blank')">
                  <img src="${url}" class="w-full h-full object-cover">
                </div>
              `).join('')}
            </div>
            <div class="mt-3 flex gap-2">
              <button class="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm text-white" onclick="window.open('https://t.me/icelogix_bot?text=Р’РѕРїСЂРѕСЃ РїРѕ Р·Р°РєР°Р·Сѓ ${order.id.slice(0,8)}', '_blank')">рџ’¬ РџРѕРґРґРµСЂР¶РєР°</button>
              <button class="flex-1 bg-blue-500/50 hover:bg-blue-500/70 py-2 rounded-lg text-sm text-white" onclick="downloadCustomsInvoice('${order.id}')">рџ“„ PDF РРЅРІРѕР№СЃ</button>
            </div>
          </div>
          ${isPending ? `
            <div class="flex gap-2 pt-1">
              <button class="approveLegitBtn bg-green-600 hover:bg-green-700 text-slate-900 font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}">
                РћСЂРёРіРёРЅР°Р»
              </button>
              <button class="rejectLegitBtn bg-red-600 hover:bg-red-700 text-white font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}">
                РџРѕРґРґРµР»РєР°
              </button>
            </div>
          ` : isOriginal ? `
            <div class="p-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] text-center font-bold rounded-lg flex items-center justify-center gap-1.5 font-sans">
              <span>рџџў Р’Р•Р Р”РРљРў: РћР РР“РРќРђР› (РЎРµСЂС‚РёС„РёРєР°С‚ РІС‹РґР°РЅ)</span>
            </div>
          ` : `
            <div class="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold rounded-lg font-sans">
              рџ”ґ Р’Р•Р Р”РРљРў: РџРћР”Р”Р•Р›РљРђ
              ${c.comments ? '<p class="font-normal text-[9px] text-white/50 mt-0.5 font-sans">РљРѕРјРјРµРЅС‚Р°СЂРёР№ СЌРєСЃРїРµСЂС‚Р°: ' + c.comments + '</p>' : ''}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch(e) {
    return '<p class="text-xs text-red-400 text-center py-4">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё Р»РµРіРёС‚-С‡РµРєРѕРІ</p>';
  }
}

// ==================== 2FA РђР”РњРРќРљР ====================
async function renderAdmin2FA() {
  return `
    <button id="cancelAdmin2FA" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> РќР°Р·Р°Рґ</button>
    <div class="glass-card page-enter text-center mt-10 max-w-sm mx-auto">
      <h2 class="text-white font-bold text-xl mb-4">Р’С…РѕРґ РІ РђРґРјРёРЅ-РїР°РЅРµР»СЊ</h2>
      <p class="text-white/70 text-sm mb-6">Р”Р»СЏ РґРѕСЃС‚СѓРїР° Рє СЂР°СЃС€РёСЂРµРЅРЅС‹Рј С„СѓРЅРєС†РёСЏРј РІРІРµРґРёС‚Рµ 4-Р·РЅР°С‡РЅС‹Р№ РџРРќ-РєРѕРґ</p>
      
      <div class="flex justify-center gap-3 mb-6" id="pinDots">
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
      </div>
      
      <div class="grid grid-cols-3 gap-3 mb-4" id="pinKeyboard">
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="1">1</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="2">2</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="3">3</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="4">4</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="5">5</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="6">6</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="7">7</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="8">8</button>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="9">9</button>
        <div></div>
        <button class="bg-white/5 hover:bg-white/10 text-white font-bold text-xl py-4 rounded-xl border border-white/10" data-digit="0">0</button>
        <button class="bg-white/5 hover:bg-white/10 text-red-400 font-bold text-xl py-4 rounded-xl border border-white/10" id="pinDeleteBtn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg></span></button>
      </div>
      <div id="recentTransactions" class="mt-2 text-left"></div>
    </div>
    
    ${renderFooter()}
  `;
}



let currentPin = '';
function attachAdmin2FAHandlers() {
  document.getElementById('cancelAdmin2FA').onclick = () => switchTab('home');
  const dots = document.querySelectorAll('#pinDots div');
  
  async function checkPin() {
    try {
      const { data } = await supabaseClient.from('users').select('pin_code').eq('user_id', userId).single();
      if (!data || !data.pin_code) {
        if (currentPin === '0000') {
          adminAuthenticated = true;
          renderCurrentScreen();
        } else {
          tgUtil.alert('РџРРќ-РєРѕРґ РЅРµ СѓСЃС‚Р°РЅРѕРІР»РµРЅ. РЈСЃС‚Р°РЅРѕРІР»РµРЅ РІСЂРµРјРµРЅРЅС‹Р№ РєРѕРґ 0000.');
          currentPin = ''; updateDots();
        }
        return;
      }
      if (data.pin_code === currentPin) {
        adminAuthenticated = true;
        renderCurrentScreen();
      } else {
        tgUtil.haptic('error');
        tgUtil.alert('вќЊ РќРµРІРµСЂРЅС‹Р№ РџРРќ-РєРѕРґ');
        currentPin = ''; updateDots();
      }
    } catch(e) { tgUtil.alert('РћС€РёР±РєР° ' + e.message); currentPin = ''; updateDots(); }
  }

  function updateDots() {
    dots.forEach((dot, i) => {
      if (i < currentPin.length) {
        dot.classList.remove('bg-white/20');
        dot.classList.add('bg-cyan-400');
      } else {
        dot.classList.add('bg-white/20');
        dot.classList.remove('bg-cyan-400');
      }
    });
    if (currentPin.length === 4) {
      checkPin();
    }
  }

  document.querySelectorAll('#pinKeyboard button[data-digit]').forEach(btn => {
    btn.onclick = () => {
      if (currentPin.length < 4) {
        tgUtil.haptic('light');
        currentPin += btn.dataset.digit;
        updateDots();
      }
    };
  });
  
  document.getElementById('pinDeleteBtn').onclick = () => {
    if (currentPin.length > 0) {
      tgUtil.haptic('light');
      currentPin = currentPin.slice(0, -1);
      updateDots();
    }
  };
}



async function renderAdmin() {
  if (!isOwner) return '<p class="text-center mt-10 text-red-400">Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰С‘РЅ</p>';
  try {
    let promoCodes = [];
    let payoutRequests = [];
    let reviews = [];
    let products = [];
    
    try { const { data } = await supabaseClient.from('promocodes').select('*').order('created_at', { ascending: false }); if (data) promoCodes = data; } catch(e) {}
    try { const { data } = await supabaseClient.from('payout_requests').select('*').eq('status', 'pending'); if (data) payoutRequests = data; } catch(e) {}
    try { const { data } = await supabaseClient.from('reviews').select('*').eq('is_published', false).order('created_at', { ascending: false }); if (data) reviews = data; } catch(e) {}
    try { const { data } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false }); if (data) products = data; } catch(e) {}
    let courses = [];
    try { const { data } = await supabaseClient.from('courses').select('*').order('created_at', { ascending: true }); if (data) courses = data; } catch(e) {}

    return `
      <div class="space-y-4">
        <!-- <span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span> РђРєС†РёРё -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ Р°РєС†РёСЏРјРё</h3>
          <button id="addPromotionBtn" class="btn-primary w-full mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> РЎРѕР·РґР°С‚СЊ Р°РєС†РёСЋ</button>
          <div class="space-y-2 max-h-60 overflow-y-auto" id="promotionsList">
            ${await renderPromotionsAdminList()}
          </div>
        </div>

        <!-- РџСЂРѕРјРѕРєРѕРґС‹ -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> РЎРѕР·РґР°С‚СЊ РїСЂРѕРјРѕРєРѕРґ</h3>
          <input type="text" id="newPromoCode" class="btn-secondary w-full p-2 rounded-lg mb-2" placeholder="РљРѕРґ">
          <select id="promoType" class="btn-secondary w-full p-2 rounded-lg mb-2"><option value="percent">РџСЂРѕС†РµРЅС‚ (%)</option><option value="fixed">Р¤РёРєСЃ (BYN)</option></select>
          <input type="number" id="promoValue" class="btn-secondary w-full p-2 rounded-lg mb-2" placeholder="Р—РЅР°С‡РµРЅРёРµ">
          <button id="createPromoBtn" class="btn-primary w-full">РЎРѕР·РґР°С‚СЊ</button>
        </div>
        
        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_resale')">
          <span class="flex items-center gap-2"><span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span> РњРѕРґРµСЂР°С†РёСЏ РџСЂРёСЃС‚СЂРѕСЏ</span>
          <span class="ix text-white/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_analytics')" style="background: linear-gradient(135deg, rgba(34,211,238,0.1), rgba(14,165,233,0.05)); border-color: rgba(34,211,238,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span> РђРЅР°Р»РёС‚РёРєР° Рё Р¤РёРЅР°РЅСЃС‹</span>
          <span class="ix text-cyan-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_crm')" style="background: linear-gradient(135deg, rgba(244,114,182,0.1), rgba(219,39,119,0.05)); border-color: rgba(244,114,182,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> CRM Рё РЎРµРіРјРµРЅС‚С‹</span>
          <span class="ix text-pink-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_suppliers')" style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05)); border-color: rgba(16,185,129,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-emerald-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Р‘Р°Р·Р° РїРѕСЃС‚Р°РІС‰РёРєРѕРІ</span>
          <span class="ix text-emerald-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_marketing')" style="background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.06)); border-color: rgba(168,85,247,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-purple-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg></span> РњР°СЂРєРµС‚РёРЅРі: UGC Рё Р”СЂРѕРїС‹</span>
          <span class="ix text-purple-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_texts')" style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06)); border-color: rgba(245,158,11,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-amber-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ С‚РµРєСЃС‚Р°РјРё</span>
          <span class="ix text-amber-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_faq')" style="background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06)); border-color: rgba(34,197,94,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-green-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ FAQ</span>
          <span class="ix text-green-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="showCurrencyAlertsModal()" style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06)); border-color: rgba(245,158,11,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-amber-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> РўСЂРµРєРµСЂ РєСѓСЂСЃРѕРІ & РђР»РµСЂС‚С‹</span>
          <span class="ix text-amber-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="downloadTaxInvoicePDF()" style="background: linear-gradient(135deg, rgba(96,165,250,0.12), rgba(59,130,246,0.06)); border-color: rgba(96,165,250,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-blue-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg></span> РЎРєР°С‡Р°С‚СЊ РІС‹РїРёСЃРєСѓ Р·Р° РіРѕРґ (PDF)</span>
          <span class="ix text-blue-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <!-- РЎРїРёСЃРѕРє РїСЂРѕРјРѕРєРѕРґРѕРІ -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> РџСЂРѕРјРѕРєРѕРґС‹</h3>
          ${promoCodes.length === 0 ? '<p class="text-white/70">РќРµС‚ РїСЂРѕРјРѕРєРѕРґРѕРІ</p>' : `<div class="space-y-2">${promoCodes.map(p => `<div class="flex justify-between items-center p-2 bg-white/5 rounded-lg"><div><span class="font-bold text-cyan-400">${p.code}</span><span class="text-white/70 text-sm ml-2">${p.discount_type === 'percent' ? p.discount_value + '%' : p.discount_value + ' BYN'}</span><span class="text-white/50 text-xs ml-2">${p.is_active ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РђРєС‚РёРІРµРЅ' : '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> РќРµР°РєС‚РёРІРµРЅ'}</span></div><button class="togglePromoBtn text-cyan-400 text-sm" data-id="${p.id}" data-active="${p.is_active}">${p.is_active ? 'Р”РµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊ' : 'РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ'}</button></div>`).join('')}</div>`}
        </div>
        
        <!-- РћС‚Р·С‹РІС‹ РЅР° РјРѕРґРµСЂР°С†РёРё -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span> РћС‚Р·С‹РІС‹ РЅР° РјРѕРґРµСЂР°С†РёРё</h3>
          ${reviews.length === 0 ? '<p class="text-white/70">РќРµС‚ РѕС‚Р·С‹РІРѕРІ</p>' : reviews.map(r => `<div class="p-2 bg-white/5 rounded-lg mb-2"><div class="stars">${'<span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(r.rating)}${'<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(5-r.rating)}</div><p class="text-white/80 text-sm">${r.text}</p>${r.photo_urls && r.photo_urls.length > 0 ? `<div class="flex gap-2 mt-2 overflow-x-auto pb-1">${r.photo_urls.map(url => `<img src="${url}" class="h-16 w-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" onclick="tgUtil.popup('${url}', 'Р¤РѕС‚Рѕ РѕС‚Р·С‹РІР°')">`).join('')}</div>` : ''}<p class="text-white/50 text-xs">${r.user_name||'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'} | ${new Date(r.created_at).toLocaleDateString()}</p><div class="flex gap-2 mt-2"><button class="approveReviewBtn bg-green-600 px-3 py-1 rounded text-sm" data-id="${r.id}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РћРґРѕР±СЂРёС‚СЊ</button><button class="rejectReviewBtn bg-red-600 px-3 py-1 rounded text-sm" data-id="${r.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> РћС‚РєР»РѕРЅРёС‚СЊ</button></div></div>`).join('')}
        </div>
        
        <!-- Р’СЃС‚СЂРѕРµРЅРЅС‹Р№ С‡Р°С‚ (РўРёРєРµС‚С‹ РїРѕРґРґРµСЂР¶РєРё) -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span> Р§Р°С‚ РїРѕРґРґРµСЂР¶РєРё & РўРёРєРµС‚С‹</h3>
          <div class="space-y-2 max-h-60 overflow-y-auto" id="adminTicketsList">
            ${await renderAdminTicketsList()}
          </div>
        </div>
        
        <!-- РЈРїСЂР°РІР»РµРЅРёРµ С‚РѕРІР°СЂР°РјРё -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ С‚РѕРІР°СЂР°РјРё</h3>
          <button id="addProductBtn" class="btn-primary w-full mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂ</button>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${products.map(p => `<div class="flex justify-between items-center p-2 bg-white/5 rounded-lg"><div><span class="text-white">${p.title}</span><span class="text-cyan-400 ml-2">${p.price} ${p.currency}</span></div><button class="deleteProductBtn bg-red-600 px-2 py-1 rounded text-xs" data-id="${p.id}">РЈРґР°Р»РёС‚СЊ</button></div>`).join('')}
          </div>
        </div>
        
        <!-- <span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span> РљСѓСЂСЃС‹ -->
        <div class="glass-card">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-white font-bold"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span> РљСѓСЂСЃС‹ (РђРєР°РґРµРјРёСЏ)</h3>
            <button id="adminAddCourseBtn" class="btn-primary"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ</button>
          </div>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            ${courses.length === 0 ? '<p class="text-white/50 text-sm">РљСѓСЂСЃРѕРІ РЅРµС‚</p>' : courses.map(c => `
              <div class="flex items-center gap-2 p-2 bg-white/5 rounded-xl">
                <div class="flex-1 min-w-0">
                  <p class="text-white text-sm truncate">${c.title}</p>
                  <p class="text-white/40 text-xs">${c.price_ice > 0 ? c.price_ice + ' <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span>' : 'Р‘РµСЃРїР»Р°С‚РЅРѕ'} В· ${c.role_access} В· ${c.is_active ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> РђРєС‚РёРІРµРЅ' : '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> РЎРєСЂС‹С‚'}</p>
                </div>
                <button class="btn-secondary adminEditCourseBtn" data-course-id="${c.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
                <button class="adminManageLessonsBtn bg-blue-600/60 px-2 py-1 rounded text-xs" data-course-id="${c.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span></button>
                <button class="adminDeleteCourseBtn bg-red-600/60 px-2 py-1 rounded text-xs" data-course-id="${c.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
              </div>`).join('')}
          </div>
        </div>

        <!-- РЈРїСЂР°РІР»РµРЅРёРµ РїР»РѕС‰Р°РґРєР°РјРё -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ РїР»РѕС‰Р°РґРєР°РјРё</h3>
          <button id="addMarketplaceBtn" class="btn-primary w-full mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Р”РѕР±Р°РІРёС‚СЊ РїР»РѕС‰Р°РґРєСѓ</button>
          <div class="space-y-2 max-h-80 overflow-y-auto" id="marketplacesList">
            ${await renderMarketplacesAdminList()}
          </div>
        </div>
        
        <!-- Р—Р°СЏРІРєРё РЅР° РІС‹РІРѕРґ -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/></svg></span> Р—Р°СЏРІРєРё РЅР° РІС‹РІРѕРґ</h3>
          ${payoutRequests.length === 0 ? '<p class="text-white/70">РќРµС‚ Р·Р°СЏРІРѕРє</p>' : payoutRequests.map(req => `<div class="flex justify-between items-center p-2 bg-white/5 rounded-lg mb-2"><div><span class="text-white">${req.user_id}</span><span class="text-cyan-400 ml-2">${req.amount} <span class="brand-flake" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polyline points="8 5 12 2 16 5"/><polyline points="8 19 12 22 16 19"/><polyline points="5 8 2 12 5 16"/><polyline points="19 8 22 12 19 16"/></svg></span></span></div><div><button class="approvePayoutBtn bg-green-600 px-3 py-1 rounded text-sm mr-2" data-id="${req.id}">РћРґРѕР±СЂРёС‚СЊ</button><button class="rejectPayoutBtn bg-red-600 px-3 py-1 rounded text-sm" data-id="${req.id}">РћС‚РєР»РѕРЅРёС‚СЊ</button></div></div>`).join('')}
        </div>
        
        <!-- AI РђРЅР°Р»РёС‚РёРєР° -->
        <div class="glass-card mt-4" id="aiPredictionCard">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-white font-bold">рџ¤– AI РђРЅР°Р»РёС‚РёРєР°</h3>
            <button onclick="window._refreshAiPrediction && window._refreshAiPrediction()" class="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded-lg hover:bg-purple-500/20 transition">в†» РћР±РЅРѕРІРёС‚СЊ</button>
          </div>
          <div id="aiPredictionContent" class="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">Р—Р°РіСЂСѓР·РєР° РїСЂРѕРіРЅРѕР·Р°...</div>
        </div>

        <!-- РЈРїСЂР°РІР»РµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё</h3>
          <div class="relative mb-3">
            <input type="text" id="adminUsersSearchInput" class="btn-secondary w-full p-2 pl-8 rounded-lg border border-white/30 text-xs" placeholder="РџРѕРёСЃРє РїРѕ @username, РёРјРµРЅРё РёР»Рё ID..." oninput="window.adminUsersSearch = this.value; document.getElementById('adminUsersList').innerHTML = '<p class=\\'text-white/50 text-xs text-center py-2\\'>Р—Р°РіСЂСѓР·РєР°...</p>'; renderAdminUsersList().then(html => document.getElementById('adminUsersList').innerHTML = html)">
            <span class="absolute left-2.5 top-2 text-white/40 pointer-events-none"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></span>
          </div>
          <div id="adminUsersList" class="space-y-2 max-h-80 overflow-y-auto">
            ${await renderAdminUsersList()}
          </div>
        </div>
        
                <!-- РЈРїСЂР°РІР»РµРЅРёРµ Р·Р°РєР°Р·Р°РјРё -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ Р·Р°РєР°Р·Р°РјРё</h3>
          
          <!-- РџРµСЂРµРєР»СЋС‡Р°С‚РµР»Рё РђРєС‚РёРІРЅС‹Рµ / РђСЂС…РёРІ -->
          <div class="flex gap-2 mb-3">
            <button id="showActiveOrdersBtn" class="btn-secondary btn-primary px-4 py-2 rounded-lg text-sm font-medium ${adminOrdersMode === 'active' ? '' : ''}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> РђРєС‚РёРІРЅС‹Рµ</button>
            <button id="showArchivedOrdersBtn" class="btn-secondary btn-primary px-4 py-2 rounded-lg text-sm font-medium ${adminOrdersMode === 'archived' ? '' : ''}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span> РљРѕСЂР·РёРЅР° (РЈРґР°Р»РµРЅРЅС‹Рµ)</button>
          </div>
          
          <!-- Р¤РёР»СЊС‚СЂ РїРѕ СЃС‚Р°С‚СѓСЃСѓ (С‡РёРїСЃС‹) -->
          <div class="mb-3">
            <div class="flex flex-wrap gap-1.5" id="adminOrdersFilterChips">
              <button class="filter-chip text-xs px-3 py-1.5" data-status="all">Р’СЃРµ</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="paid">РћРїР»Р°С‡РµРЅ</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="bought">Р’С‹РєСѓРїР»РµРЅ</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="on_sklad_cn">РЎРєР»Р°Рґ РљРќ</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="in_transit">Р’ РїСѓС‚Рё</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="in_belarus">Р’ Р Р‘</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="delivered">Р”РѕСЃС‚Р°РІР»РµРЅ</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="cancelled">РћС‚РјРµРЅС‘РЅ</button>
            </div>
          </div>
          
          <!-- РЎРїРёСЃРѕРє Р·Р°РєР°Р·РѕРІ -->
          <div id="adminOrdersList" class="space-y-2 max-h-96 overflow-y-auto">
            ${await renderAdminOrdersList()}
          </div>

          <!-- РџР°РіРёРЅР°С†РёСЏ -->
          <div class="flex justify-center gap-2 mt-3">
            <button id="adminOrdersPrev" class="btn-secondary" ${adminOrdersPage <= 1 ? 'disabled' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span></button>
            <span class="text-white/70 py-2 text-sm">РЎС‚СЂ. ${adminOrdersPage} РёР· ${adminOrdersTotalPages}</span>
            <button id="adminOrdersNext" class="btn-secondary" ${adminOrdersPage >= adminOrdersTotalPages ? 'disabled' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></button>
          </div>
          </div>

        <!-- Р¤РёРЅР°РЅСЃРѕРІС‹Р№ СѓС‡С‘С‚ Рё РќР°Р»РѕРіРё (Р‘РµР»РіР°Р·РїСЂРѕРјР±Р°РЅРє & РќР°Р»РѕРіРѕРІС‹Р№ РѕС‚С‡С‘С‚ Р Р‘) -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Р¤РёРЅР°РЅСЃРѕРІС‹Р№ СѓС‡С‘С‚ Рё РќР°Р»РѕРіРё Р Р‘</h3>
          <p class="text-white/50 text-xs mb-3">РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРёР№ СЂР°СЃС‡С‘С‚ РЅР°Р»РѕРіРѕРІ РїРѕ СЃС‚Р°РІРєР°Рј Р Р‘ (20% РЅР°Р»РѕРіР° СЃ С‡РёСЃС‚РѕР№ РєРѕРјРёСЃСЃРёРё Р±Р°Р№РµСЂР°) Рё СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ С‡РёСЃС‚РѕР№ РїСЂРёР±С‹Р»Рё РјРµР¶РґСѓ РїР°СЂС‚РЅРµСЂСЃРєРёРјРё РРџ.</p>
          <div class="bg-white/5 p-3 rounded-xl space-y-2 mb-4 text-xs">
            <p class="font-bold text-white uppercase text-[10px] tracking-wider mb-1 text-cyan-400">Р РµРєРІРёР·РёС‚С‹ РРџ (РћРђРћ В«Р‘РµР»РіР°Р·РїСЂРѕРјР±Р°РЅРєВ»):</p>
            <div class="grid grid-cols-1 gap-2 text-white/70">
              <div>вЂў <strong>РРџ РљРёСЂРёР»Р» (Р /РЎ 1):</strong> BY54BGPB3012000000001000 (Р§РёСЃС‚Р°СЏ РїСЂРёР±С‹Р»СЊ: 50%)</div>
              <div>вЂў <strong>РРџ РџР°СЂС‚РЅС‘СЂ (Р /РЎ 2):</strong> BY12BGPB3012000000002000 (Р§РёСЃС‚Р°СЏ РїСЂРёР±С‹Р»СЊ: 50%)</div>
            </div>
          </div>
          <button id="generateTaxesReportBtn" class="btn-primary w-full flex items-center justify-center gap-2">
            ${ix('file-text')} РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ РЅР°Р»РѕРіРѕРІС‹Р№ РѕС‚С‡С‘С‚ Р Р‘
          </button>
        </div>

        <!-- Р‘СЌРєР°Рї Рё СЃРёСЃС‚РµРјРЅС‹Рµ СѓС‚РёР»РёС‚С‹ -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Р—РµСЂРєР°Р»Рѕ Р±Р°Р·С‹ (Auto-Backup)</h3>
          <p class="text-white/50 text-xs mb-3">РњРіРЅРѕРІРµРЅРЅР°СЏ РїРѕР»РЅР°СЏ РІС‹РіСЂСѓР·РєР° Р±Р°Р·С‹ РґР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ Рё Р·Р°РєР°Р·РѕРІ РІ С„Р°Р№Р» СЂРµР·РµСЂРІРЅРѕР№ РєРѕРїРёРё.</p>
          <button id="downloadBackupBtn" class="btn-primary w-full flex items-center justify-center gap-2">
            ${ix('download')} Р’С‹РіСЂСѓР·РёС‚СЊ РїРѕР»РЅСѓСЋ СЂРµР·РµСЂРІРЅСѓСЋ РєРѕРїРёСЋ
          </button>
        </div>

        <!-- РЎС‚СЂР°С…РѕРІС‹Рµ РїСЂРµС‚РµРЅР·РёРё (Loss & Damage Moderation) -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> РЈРїСЂР°РІР»РµРЅРёРµ СЃС‚СЂР°С…РѕРІРєР°РјРё & РџСЂРµС‚РµРЅР·РёСЏРјРё</h3>
          <p class="text-white/50 text-xs mb-3">РћРґРѕР±СЂРµРЅРёРµ РёР»Рё РѕС‚РєР»РѕРЅРµРЅРёРµ СЃС‚СЂР°С…РѕРІС‹С… РїСЂРµС‚РµРЅР·РёР№ РєР»РёРµРЅС‚РѕРІ. РџСЂРё РѕРґРѕР±СЂРµРЅРёРё СЃСѓРјРјР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РІРѕР·РІСЂР°С‰Р°РµС‚СЃСЏ РЅР° Р±Р°Р»Р°РЅСЃ.</p>
          <div class="space-y-2 max-h-64 overflow-y-auto font-sans" id="adminClaimsList">
            ${await renderAdminClaimsList()}
          </div>
        </div>

        <!-- Р—Р°СЏРІРєРё РЅР° Legit-Check (Manual Paid Legit Check Moderation) -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg></span> Р—Р°СЏРІРєРё РЅР° Legit-Check</h3>
          <p class="text-white/50 text-xs mb-3">Р Р°СЃСЃРјРѕС‚СЂРµРЅРёРµ Р·Р°СЏРІРѕРє РЅР° Р»РµРіРёС‚-С‡РµРє РѕС‚ СЌРєСЃРїРµСЂС‚РѕРІ ShopbyShop. Р—Р°РґР°Р№С‚Рµ РІРµСЂРґРёРєС‚ (РћСЂРёРіРёРЅР°Р»/РџРѕРґРґРµР»РєР°) СЃ РєРѕРјРјРµРЅС‚Р°СЂРёСЏРјРё.</p>
          <div class="space-y-2 max-h-64 overflow-y-auto font-sans" id="adminLegitChecksList">
            ${await renderAdminLegitChecksList()}
          </div>
        </div>

        <!-- РЎРёСЃС‚РµРјРЅС‹Рµ РЅР°СЃС‚СЂРѕР№РєРё Рё Р‘СЌРєР°Рї -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> РЎРёСЃС‚РµРјРЅС‹Рµ РЅР°СЃС‚СЂРѕР№РєРё Рё Р‘СЌРєР°Рї</h3>
          
          <div class="bg-white/5 p-3 rounded-xl mb-3">
            <div class="flex justify-between items-center mb-2">
              <span class="text-white text-sm font-bold">рџЊґ Р РµР¶РёРј РћС‚РїСѓСЃРєР° Р‘Р°Р№РµСЂР°</span>
              <button id="toggleVacationBtn" class="px-3 py-1 rounded text-xs font-bold ${window.buyerVacation?.active ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}">
                ${window.buyerVacation?.active ? 'Р’РљР›Р®Р§Р•Рќ' : 'Р’Р«РљР›'}
              </button>
            </div>
            <p class="text-white/50 text-[10px] mb-2">Р•СЃР»Рё РІС‹РєР»СЋС‡РёС‚СЊ вЂ” СЃСЂРѕРєРё РІРµСЂРЅСѓС‚СЃСЏ РІ РЅРѕСЂРјСѓ. Р•СЃР»Рё РІРєР»СЋС‡РёС‚СЊ вЂ” РєРѕ РІСЃРµРј СЃСЂРѕРєР°Рј РґРѕСЃС‚Р°РІРєРё РґРѕР±Р°РІРёС‚СЃСЏ СѓРєР°Р·Р°РЅРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ РґРЅРµР№, Рё РєР»РёРµРЅС‚С‹ СѓРІРёРґСЏС‚ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ РІ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂРµ.</p>
            <div class="flex gap-2 items-center">
              <input type="number" id="vacationDaysInput" value="${window.buyerVacation?.days || 10}" class="btn-secondary w-20 p-2 rounded-lg text-sm text-center" placeholder="Р”РЅРµР№">
              <span class="text-white/70 text-xs">РґРЅРµР№ Р·Р°РґРµСЂР¶РєРё</span>
              <button id="saveVacationBtn" class="btn-primary px-3 py-1 text-xs ml-auto">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
            </div>
          </div>

          <div class="bg-white/5 p-3 rounded-xl">
            <div class="flex justify-between items-center mb-2">
              <span class="text-white text-sm font-bold">рџ’ѕ Р РµР·РµСЂРІРЅР°СЏ РєРѕРїРёСЏ Р±Р°Р·С‹</span>
            </div>
            <p class="text-white/50 text-[10px] mb-3">РЎРєР°С‡Р°С‚СЊ РїРѕР»РЅС‹Р№ РґР°РјРї РІСЃРµС… Р·Р°РєР°Р·РѕРІ Рё РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РІ С„РѕСЂРјР°С‚Рµ CSV. Р РµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ РґРµР»Р°С‚СЊ СЂР°Р· РІ РЅРµРґРµР»СЋ.</p>
            <button id="exportDatabaseBtn" class="w-full bg-blue-600/80 hover:bg-blue-600 transition p-2 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> РЎРєР°С‡Р°С‚СЊ CSV (Excel) РђСЂС…РёРІ
            </button>
          </div>
        </div>
      </div>
    ` + renderFooter();
  } catch (err) { return '<p class="text-center mt-10 text-red-400">РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё Р°РґРјРёРЅ-РїР°РЅРµР»Рё</p>'; }
}

window.enterShadowMode = function(targetUserId) {
  const isConfirmed = confirm(`Р’РѕР№С‚Рё РІ Р°РєРєР°СѓРЅС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ ${targetUserId}? Р РµР¶РёРј "РўРѕР»СЊРєРѕ С‡С‚РµРЅРёРµ" (Р±РµР· РѕРїР»Р°С‚С‹).`);
  if (isConfirmed) {
    originalAdminId = userId;
    userId = targetUserId;
    isShadowMode = true;
    currentSubScreen = null;
    tgUtil.haptic('success');
    tgUtil.alert('РўРµРЅРµРІРѕР№ СЂРµР¶РёРј Р°РєС‚РёРІРёСЂРѕРІР°РЅ');
    switchTab('home');
  }
};

function attachAdminHandlers() {

  // ================== РЎРРЎРўР•РњРќР«Р• РќРђРЎРўР РћР™РљР (РћРўРџРЈРЎРљ Р Р‘Р­РљРђРџ) ==================
  const toggleVacBtn = document.getElementById('toggleVacationBtn');
  const saveVacBtn = document.getElementById('saveVacationBtn');
  const expDbBtn = document.getElementById('exportDatabaseBtn');

  if (toggleVacBtn) {
    toggleVacBtn.onclick = async () => {
      tgUtil.haptic('light');
      window.buyerVacation = window.buyerVacation || { active: false, days: 10 };
      window.buyerVacation.active = !window.buyerVacation.active;
      
      try {
        const { error } = await supabaseClient
          .from('admin_settings')
          .update({ buyer_vacation: window.buyerVacation })
          .eq('owner_id', userId);
        if (error) throw error;
        
        glassToast('Р РµР¶РёРј РѕС‚РїСѓСЃРєР° ' + (window.buyerVacation.active ? 'Р’РљР›Р®Р§Р•Рќ' : 'Р’Р«РљР›Р®Р§Р•Рќ'), { kind: 'success' });
        renderCurrentScreen();
      } catch (err) {
        glassToast('РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ: ' + err.message, { kind: 'error' });
      }
    };
  }

  if (saveVacBtn) {
    saveVacBtn.onclick = async () => {
      tgUtil.haptic('medium');
      const dInput = document.getElementById('vacationDaysInput');
      const days = parseInt(dInput.value) || 0;
      window.buyerVacation = window.buyerVacation || { active: false, days: 10 };
      window.buyerVacation.days = days;
      
      try {
        const { error } = await supabaseClient
          .from('admin_settings')
          .update({ buyer_vacation: window.buyerVacation })
          .eq('owner_id', userId);
        if (error) throw error;
        glassToast('РљРѕР»РёС‡РµСЃС‚РІРѕ РґРЅРµР№ СЃРѕС…СЂР°РЅРµРЅРѕ', { kind: 'success' });
      } catch (err) {
        glassToast('РћС€РёР±РєР°: ' + err.message, { kind: 'error' });
      }
    };
  }

  if (expDbBtn) {
    expDbBtn.onclick = async () => {
      tgUtil.haptic('medium');
      glassToast('РЎР±РѕСЂ РґР°РЅРЅС‹С… РґР»СЏ Р±СЌРєР°РїР°...', { kind: 'info' });
      try {
        const [ordersRes, usersRes] = await Promise.all([
          supabaseClient.from('orders').select('*'),
          supabaseClient.from('users').select('*')
        ]);
        if (ordersRes.error) throw ordersRes.error;
        if (usersRes.error) throw usersRes.error;
        
        // РЎРѕР·РґР°РµРј CSV
        let csvContent = "data:text/csv;charset=utf-8,\\uFEFF";
        csvContent += "=== USERS ===\\n";
        if (usersRes.data && usersRes.data.length > 0) {
          const uKeys = Object.keys(usersRes.data[0]);
          csvContent += uKeys.join(",") + "\\n";
          usersRes.data.forEach(u => {
            csvContent += uKeys.map(k => '"' + String(u[k] || '').replace(/"/g, '""') + '"').join(",") + "\\n";
          });
        }
        
        csvContent += "\\n=== ORDERS ===\\n";
        if (ordersRes.data && ordersRes.data.length > 0) {
          const oKeys = Object.keys(ordersRes.data[0]);
          csvContent += oKeys.join(",") + "\\n";
          ordersRes.data.forEach(o => {
            csvContent += oKeys.map(k => '"' + String(o[k] || '').replace(/"/g, '""') + '"').join(",") + "\\n";
          });
        }
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ice_logix_backup_" + new Date().toISOString().slice(0,10) + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        glassToast('Р‘СЌРєР°Рї СѓСЃРїРµС€РЅРѕ СЃРєР°С‡Р°РЅ!', { kind: 'success' });
      } catch (err) {
        glassToast('РћС€РёР±РєР° РїСЂРё Р±СЌРєР°РїРµ: ' + err.message, { kind: 'error' });
      }
    };
  }

  // ================== РќРђР›РћР“РћР’Р«Р™ РћРўР§Р•Рў Р Р‘ ==================
  const generateTaxesReportBtn = document.getElementById('generateTaxesReportBtn');
  if (generateTaxesReportBtn) {
    generateTaxesReportBtn.onclick = async () => {
      tgUtil.haptic('medium');
      glassToast('РЎР±РѕСЂ С„РёРЅР°РЅСЃРѕРІС‹С… РґР°РЅРЅС‹С…...', { kind: 'success' });
      
      try {
        const { data: orders, error } = await supabaseClient
          .from('orders')
          .select('id, total_byn, commission_byn, status, created_at');
          
        if (error) throw error;
        
        let totalRevenue = 0;
        let totalCommission = 0;
        let activeOrdersCount = 0;
        let completedOrdersCount = 0;
        
        (orders || []).forEach(o => {
          const totalVal = o.total_byn || 0;
          const commVal = o.commission_byn || 0;
          totalRevenue += totalVal;
          totalCommission += commVal;
          if (o.status === 'delivered') {
            completedOrdersCount++;
          } else {
            activeOrdersCount++;
          }
        });
        
        const taxPercent = 20;
        const totalTax = totalCommission * (taxPercent / 100);
        const netProfit = totalCommission - totalTax;
        const splitProfit = netProfit / 2;
        
        const reportModal = document.createElement('div');
        reportModal.className = 'fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[99999] p-4 overflow-y-auto pt-10 pb-10';
        reportModal.id = 'taxesReportModal';
        
        const dateStr = new Date().toLocaleDateString('ru-RU');
        
        reportModal.innerHTML = `
          <div class="bg-slate-900/95 border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden page-enter">
            <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 flex-shrink-0">
              <div>
                <h3 class="text-white font-bold text-base flex items-center gap-2">
                  ${ix('file-text', { cls: 'text-cyan-400' })}
                  <span>РќР°Р»РѕРіРѕРІС‹Р№ РѕС‚С‡С‘С‚ Р Р‘ & РЈС‡С‘С‚</span>
                </h3>
                <p class="text-white/50 text-[10px] mt-0.5">Р Р°СЃС‡РµС‚ РЅР°Р»РѕРіР° 20% СЃ РєРѕРјРёСЃСЃРёРё Р±Р°Р№РµСЂР° Рё РїСЂРёР±С‹Р»Рё РїРѕ РРџ</p>
              </div>
              <button id="closeTaxesModalBtn" class="text-white/50 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div class="p-5 overflow-y-auto flex-1 text-xs text-white/80 space-y-4 leading-relaxed bg-slate-950/20 max-h-[60vh] select-text">
              <div class="text-center font-bold text-sm text-white uppercase mb-2">РќР°Р»РѕРіРѕРІР°СЏ РґРµРєР»Р°СЂР°С†РёСЏ Рё РѕС‚С‡РµС‚ РїРѕ РєРѕРјРёСЃСЃРёРё</div>
              <div class="flex justify-between text-[11px] text-white/50">
                <span>Рі. РќРµСЃРІРёР¶, Р‘РµР»Р°СЂСѓСЃСЊ</span>
                <span>РЎС„РѕСЂРјРёСЂРѕРІР°РЅ: ${dateStr} Рі.</span>
              </div>
              
              <div class="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                <div class="flex justify-between">
                  <span class="text-white/50">Р’СЃРµРіРѕ Р·Р°РєР°Р·РѕРІ РІ СЃРёСЃС‚РµРјРµ:</span>
                  <span class="text-white font-bold font-mono">${(orders || []).length} С€С‚.</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Р—Р°РІРµСЂС€РµРЅРЅС‹С… Р·Р°РєР°Р·РѕРІ:</span>
                  <span class="text-green-400 font-bold font-mono">${completedOrdersCount} С€С‚.</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">РђРєС‚РёРІРЅС‹С… Р·Р°РєР°Р·РѕРІ:</span>
                  <span class="text-cyan-400 font-bold font-mono">${activeOrdersCount} С€С‚.</span>
                </div>
                <div class="flex justify-between border-t border-white/10 pt-2 mt-2">
                  <span class="text-white/50">РћР±С‰РёР№ РѕР±РѕСЂРѕС‚ Р·Р°РєР°Р·РѕРІ (BYN):</span>
                  <span class="text-white font-extrabold font-mono">${totalRevenue.toFixed(2)} BYN</span>
                </div>
              </div>

              <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">1. Р Р°СЃС‡РµС‚ РЅР°Р»РѕРіР° (20% РѕС‚ РєРѕРјРёСЃСЃРёРё СѓСЃР»СѓРіРё)</p>
              <div class="bg-yellow-500/10 p-3.5 rounded-xl border border-yellow-500/20 space-y-2">
                <div class="flex justify-between">
                  <span class="text-white/60">Р’Р°Р»РѕРІР°СЏ РєРѕРјРёСЃСЃРёСЏ Р±Р°Р№РµСЂРѕРІ (РґРѕС…РѕРґ СѓСЃР»СѓРіРё):</span>
                  <span class="text-white font-bold font-mono">${totalCommission.toFixed(2)} BYN</span>
                </div>
                <div class="flex justify-between text-yellow-400">
                  <span>РџРѕРґРѕС…РѕРґРЅС‹Р№ РЅР°Р»РѕРі РІ Р Р‘ (20%):</span>
                  <span class="font-extrabold font-mono">${totalTax.toFixed(2)} BYN</span>
                </div>
                <div class="flex justify-between text-green-400 border-t border-white/10 pt-2 mt-2">
                  <span>Р§РёСЃС‚Р°СЏ РїСЂРёР±С‹Р»СЊ РїРѕСЃР»Рµ РЅР°Р»РѕРіРѕРІ:</span>
                  <span class="font-extrabold font-mono">${netProfit.toFixed(2)} BYN</span>
                </div>
              </div>
              <p class="text-[10px] text-white/50 italic leading-snug">
                *РџСЂРёРјРµС‡Р°РЅРёРµ: РЎРѕРіР»Р°СЃРЅРѕ Р·Р°РєРѕРЅРѕРґР°С‚РµР»СЊСЃС‚РІСѓ Р РµСЃРїСѓР±Р»РёРєРё Р‘РµР»Р°СЂСѓСЃСЊ, РЅР°Р»РѕРі РёСЃС‡РёСЃР»СЏРµС‚СЃСЏ РёСЃРєР»СЋС‡РёС‚РµР»СЊРЅРѕ СЃ РєРѕРјРёСЃСЃРёРѕРЅРЅРѕРіРѕ РІРѕР·РЅР°РіСЂР°Р¶РґРµРЅРёСЏ Р±Р°Р№РµСЂР° (20%), Р° РЅРµ СЃ РѕР±С‰РµРіРѕ РѕР±РѕСЂРѕС‚Р° РїРѕСЃС‹Р»РєРё.
              </p>

              <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">2. Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ С‡РёСЃС‚РѕР№ РїСЂРёР±С‹Р»Рё РјРµР¶РґСѓ РРџ (50/50)</p>
              <div class="bg-cyan-500/10 p-3.5 rounded-xl border border-cyan-500/20 grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <p class="font-bold text-cyan-400 uppercase">РРџ РљРёСЂРёР»Р» (50%):</p>
                  <p class="mt-1 font-extrabold text-sm text-white font-mono">${splitProfit.toFixed(2)} BYN</p>
                  <p class="text-white/40 mt-1">РћРђРћ В«Р‘РµР»РіР°Р·РїСЂРѕРјР±Р°РЅРєВ»</p>
                  <p class="text-white/40 truncate text-[9px]">BY54BGPB3012000000001000</p>
                </div>
                <div>
                  <p class="font-bold text-cyan-400 uppercase">РРџ РџР°СЂС‚РЅС‘СЂ (50%):</p>
                  <p class="mt-1 font-extrabold text-sm text-white font-mono">${splitProfit.toFixed(2)} BYN</p>
                  <p class="text-white/40 mt-1">РћРђРћ В«Р‘РµР»РіР°Р·РїСЂРѕРјР±Р°РЅРєВ»</p>
                  <p class="text-white/40 truncate text-[9px]">BY12BGPB3012000000002000</p>
                </div>
              </div>
              
              <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">3. Р›СЊРіРѕС‚С‹ Рё РІР·РЅРѕСЃС‹</p>
              <p>
                Р¤РЎР—Рќ РЅРµ СѓРїР»Р°С‡РёРІР°РµС‚СЃСЏ РІ СЃРІСЏР·Рё СЃ РЅРµСЃРѕРІРµСЂС€РµРЅРЅРѕР»РµС‚РёРµРј СѓС‡СЂРµРґРёС‚РµР»РµР№ РРџ (РІРѕР·СЂР°СЃС‚ 16 Р»РµС‚, РЅР° РѕСЃРЅРѕРІР°РЅРёРё РѕС„РёС†РёР°Р»СЊРЅРѕРіРѕ СЂР°Р·СЉСЏСЃРЅРµРЅРёСЏ РњРёРЅРёСЃС‚РµСЂСЃС‚РІР° РїРѕ РЅР°Р»РѕРіР°Рј Рё СЃР±РѕСЂР°Рј Р РµСЃРїСѓР±Р»РёРєРё Р‘РµР»Р°СЂСѓСЃСЊ).
              </p>
            </div>
            
            <div class="p-5 border-t border-white/10 bg-white/5 flex gap-3 flex-shrink-0">
              <button id="printTaxesBtn" class="btn-primary flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                ${ix('download')} РџРµС‡Р°С‚СЊ / PDF
              </button>
              <button id="closeTaxesModalBtn2" class="btn-secondary flex-1 py-3 rounded-xl font-bold transition">
                Р—Р°РєСЂС‹С‚СЊ
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(reportModal);
        
        reportModal.querySelector('#closeTaxesModalBtn').onclick = () => reportModal.remove();
        reportModal.querySelector('#closeTaxesModalBtn2').onclick = () => reportModal.remove();
        
        // Print taxes window
        reportModal.querySelector('#printTaxesBtn').onclick = () => {
          tgUtil.haptic('medium');
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            tgUtil.alert('РџРѕР¶Р°Р»СѓР№СЃС‚Р°, СЂР°Р·СЂРµС€РёС‚Рµ РѕС‚РєСЂС‹С‚РёРµ РІСЃРїР»С‹РІР°СЋС‰РёС… РѕРєРѕРЅ РІ Р±СЂР°СѓР·РµСЂРµ РґР»СЏ РіРµРЅРµСЂР°С†РёРё PDF.');
            return;
          }
          
          const printHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>РќР°Р»РѕРіРѕРІС‹Р№ РѕС‚С‡С‘С‚ Р Р‘ - ICE LOGIX</title>
              <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
                .header { text-align: center; margin-bottom: 30px; }
                .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .subtitle { font-size: 11px; color: #64748b; }
                .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background-color: #f1f5f9; font-weight: bold; }
                h3 { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
                .card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-top: 10px; font-size: 11px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">РќР°Р»РѕРіРѕРІС‹Р№ РѕС‚С‡РµС‚ РїРѕ РєРѕРјРёСЃСЃРёРѕРЅРЅРѕРјСѓ РІРѕР·РЅР°РіСЂР°Р¶РґРµРЅРёСЋ</div>
                <div class="subtitle">РЎРµСЂРІРёСЃ РґРѕСЃС‚Р°РІРєРё ICE LOGIX В· РќРµСЃРІРёР¶, Р РµСЃРїСѓР±Р»РёРєР° Р‘РµР»Р°СЂСѓСЃСЊ</div>
              </div>
              <div class="meta">
                <span>Р”Р°С‚Р° СЃРѕСЃС‚Р°РІР»РµРЅРёСЏ: ${dateStr} Рі.</span>
                <span>РўРёРї РЅР°Р»РѕРіР°: РЈРЎРќ / РџРѕРґРѕС…РѕРґРЅС‹Р№ (20%)</span>
              </div>
              
              <h3>1. РЎРІРѕРґРЅС‹Рµ РїРѕРєР°Р·Р°С‚РµР»Рё РїРѕ Р·Р°РєР°Р·Р°Рј</h3>
              <table>
                <thead>
                  <tr>
                    <th>РџРѕРєР°Р·Р°С‚РµР»СЊ</th>
                    <th>Р—РЅР°С‡РµРЅРёРµ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>РћР±С‰РµРµ РєРѕР»РёС‡РµСЃС‚РІРѕ РѕС„РѕСЂРјР»РµРЅРЅС‹С… Р·Р°РєР°Р·РѕРІ</td>
                    <td>${(orders || []).length} С€С‚.</td>
                  </tr>
                  <tr>
                    <td>Р—Р°РІРµСЂС€РµРЅРЅС‹Рµ Р·Р°РєР°Р·С‹ (СЃС‚Р°С‚СѓСЃ Р”РѕСЃС‚Р°РІР»РµРЅ)</td>
                    <td>${completedOrdersCount} С€С‚.</td>
                  </tr>
                  <tr>
                    <td>РђРєС‚РёРІРЅС‹Рµ Р·Р°РєР°Р·С‹ РІ СЂР°Р±РѕС‚Рµ</td>
                    <td>${activeOrdersCount} С€С‚.</td>
                  </tr>
                  <tr>
                    <td><strong>Р’Р°Р»РѕРІС‹Р№ РѕР±РѕСЂРѕС‚ Р·Р°РєР°Р·РѕРІ (BYN)</strong></td>
                    <td><strong>${totalRevenue.toFixed(2)} BYN</strong></td>
                  </tr>
                </tbody>
              </table>

              <h3>2. Р Р°СЃС‡РµС‚ РЅР°Р»РѕРіРѕРІРѕР№ Р±Р°Р·С‹ Рё РїРѕРґРѕС…РѕРґРЅРѕРіРѕ РЅР°Р»РѕРіР°</h3>
              <table>
                <thead>
                  <tr>
                    <th>РџРѕРєР°Р·Р°С‚РµР»СЊ</th>
                    <th>Р‘Р°Р·Р°</th>
                    <th>РЎС‚Р°РІРєР°</th>
                    <th>РЎСѓРјРјР° РЅР°Р»РѕРіР°</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>РљРѕРјРёСЃСЃРёРѕРЅРЅС‹Р№ РґРѕС…РѕРґ Р±Р°Р№РµСЂР° (20% СѓСЃР»СѓРіРё)</td>
                    <td>${totalCommission.toFixed(2)} BYN</td>
                    <td>20%</td>
                    <td><strong>${totalTax.toFixed(2)} BYN</strong></td>
                  </tr>
                </tbody>
              </table>
              <p style="font-size: 11px; color: #64748b; font-style: italic;">
                *Р’ СЃРѕРѕС‚РІРµС‚СЃС‚РІРёРё СЃ РќР°Р»РѕРіРѕРІС‹Рј РєРѕРґРµРєСЃРѕРј Р Р‘, РѕР±СЉРµРєС‚РѕРј РЅР°Р»РѕРіРѕРѕР±Р»РѕР¶РµРЅРёСЏ РґР»СЏ Р±Р°Р№РµСЂР°-РїРѕСЃСЂРµРґРЅРёРєР° РїСЂРёР·РЅР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РµРіРѕ РєРѕРјРёСЃСЃРёРѕРЅРЅРѕРµ РІРѕР·РЅР°РіСЂР°Р¶РґРµРЅРёРµ (РґРѕС…РѕРґ РѕС‚ РѕРєР°Р·Р°РЅРёСЏ СѓСЃР»СѓРі), Р° РЅРµ РІСЃСЏ СЃСѓРјРјР°, РїРµСЂРµРґР°РЅРЅР°СЏ РґР»СЏ РІС‹РєСѓРїР° С‚РѕРІР°СЂРѕРІ.
              </p>

              <h3>3. Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ РїСЂРёР±С‹Р»Рё РїРѕ РРџ (50 / 50)</h3>
              <div class="grid">
                <div class="card">
                  <strong>РРџ РљРёСЂРёР»Р» (РЎРѕСѓС‡СЂРµРґРёС‚РµР»СЊ 1):</strong><br>
                  Р”РѕР»СЏ РїСЂРёР±С‹Р»Рё: 50%<br>
                  РЎСѓРјРјР° Рє Р·Р°С‡РёСЃР»РµРЅРёСЋ: <strong>${splitProfit.toFixed(2)} BYN</strong><br>
                  Р‘Р°РЅРє: РћРђРћ В«Р‘РµР»РіР°Р·РїСЂРѕРјР±Р°РЅРєВ»<br>
                  Р /РЎ: BY54BGPB3012000000001000
                </div>
                <div class="card">
                  <strong>РРџ РџР°СЂС‚РЅС‘СЂ (РЎРѕСѓС‡СЂРµРґРёС‚РµР»СЊ 2):</strong><br>
                  Р”РѕР»СЏ РїСЂРёР±С‹Р»Рё: 50%<br>
                  РЎСѓРјРјР° Рє Р·Р°С‡РёСЃР»РµРЅРёСЋ: <strong>${splitProfit.toFixed(2)} BYN</strong><br>
                  Р‘Р°РЅРє: РћРђРћ В«Р‘РµР»РіР°Р·РїСЂРѕРјР±Р°РЅРєВ»<br>
                  Р /РЎ: BY12BGPB3012000000002000
                </div>
              </div>

              <h3>4. РџРѕРґРїРёСЃРё СЃС‚РѕСЂРѕРЅ Рё РїРµС‡Р°С‚СЊ РІРµРґРѕРјСЃС‚РІР°</h3>
              <div class="grid" style="margin-top: 30px; font-size: 11px;">
                <div>
                  <strong>РРџ РљРёСЂРёР»Р»:</strong><br>
                  РџРѕРґРїРёСЃСЊ: ______________________
                </div>
                <div>
                  <strong>РРџ РџР°СЂС‚РЅС‘СЂ:</strong><br>
                  РџРѕРґРїРёСЃСЊ: ______________________
                </div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                };
              </sc` + `ript>
   
