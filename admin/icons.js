// ICONS IAC — SVGs inline monocromaticos (sem imagens externas, sem CDN).
// Usam currentColor pra herdar a cor warm/laranja do contexto.
// Uso: IAC_ICONS.icon('vinyl', 24)  ou  IAC_ICONS.forService('Vinyl install')
(function () {
  var STROKE =
    'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';

  var SVG = {
    // ---- Tipos de servico ----
    vinyl:
      '<rect x="3" y="4" width="18" height="16" rx="1.5" ' + STROKE + '/>' +
      '<path d="M3 9h18M3 14h18M9 4v5M15 9v5M9 14v6M15 14v6" ' + STROKE + '/>',
    hardwood:
      '<rect x="3" y="5" width="18" height="14" rx="1.5" ' + STROKE + '/>' +
      '<path d="M3 9.7h18M3 14.3h18M11 5v4.7M16 9.7v4.6M7 14.3V19" ' + STROKE + '/>',
    tile:
      '<rect x="3" y="3" width="18" height="18" rx="1.5" ' + STROKE + '/>' +
      '<path d="M12 3v18M3 12h18" ' + STROKE + '/>' +
      '<circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>' +
      '<circle cx="16.5" cy="16.5" r="1" fill="currentColor"/>',
    sandrefinish:
      '<rect x="3" y="13" width="18" height="6" rx="1" ' + STROKE + '/>' +
      '<path d="M5 13l2-3h10l2 3" ' + STROKE + '/>' +
      '<path d="M8 7l1.5-1.5M12 6.5l1.5-1.5M16 7l1.5-1.5" ' + STROKE + '/>',
    epoxy:
      '<path d="M12 3c3 4 5 6.5 5 9.5A5 5 0 0 1 7 12.5C7 9.5 9 7 12 3Z" ' + STROKE + '/>' +
      '<path d="M14.5 13a2.5 2.5 0 0 1-2.5 2.5" ' + STROKE + '/>' +
      '<path d="M5 20h14" ' + STROKE + '/>',
    stairs:
      '<path d="M4 20v-3h4v-3h4v-3h4V8h3" ' + STROKE + '/>' +
      '<path d="M4 20h16" ' + STROKE + '/>',
    demo:
      '<path d="M14 3l5 5-3 3-5-5z" ' + STROKE + '/>' +
      '<path d="M11 6L4 13a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l7-7" ' + STROKE + '/>',
    handyman:
      '<path d="M14.5 6.5a3.5 3.5 0 0 0-4.7 4.2l-5 5a1.8 1.8 0 1 0 2.5 2.5l5-5a3.5 3.5 0 0 0 4.2-4.7l-2.1 2.1-1.8-.3-.3-1.8z" ' + STROKE + '/>',
    bath:
      '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" ' + STROKE + '/>' +
      '<path d="M6 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2" ' + STROKE + '/>' +
      '<path d="M9 6.5h2" ' + STROKE + '/>' +
      '<path d="M7 19l-1 2M17 19l1 2" ' + STROKE + '/>',
    kitchen:
      '<rect x="4" y="3" width="16" height="18" rx="1.5" ' + STROKE + '/>' +
      '<path d="M4 9h16" ' + STROKE + '/>' +
      '<path d="M8 5.5v1.5M12 5.5v1.5" ' + STROKE + '/>' +
      '<path d="M8 12v3M12 12v3M16 12v3" ' + STROKE + '/>',
    masonry:
      '<rect x="3" y="5" width="18" height="14" rx="1" ' + STROKE + '/>' +
      '<path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" ' + STROKE + '/>',
    carpentry:
      '<path d="M4 7l4-2 12 7-1.5 2.6z" ' + STROKE + '/>' +
      '<path d="M8 5l-1.5 2.6" ' + STROKE + '/>' +
      '<path d="M5 18h9" ' + STROKE + '/>',
    pavers:
      '<rect x="3" y="3" width="18" height="18" rx="1.5" ' + STROKE + '/>' +
      '<path d="M3 9h7v6H3M10 3v6h11M10 15v6M14 9v6h7" ' + STROKE + '/>',
    carpet:
      '<path d="M5 5h11a3 3 0 0 1 3 3v11" ' + STROKE + '/>' +
      '<path d="M5 5v11a3 3 0 0 0 3 3h11" ' + STROKE + '/>' +
      '<path d="M8 8h8v8" ' + STROKE + '/>',
    remodel:
      '<path d="M3 11l9-7 9 7" ' + STROKE + '/>' +
      '<path d="M5 9.5V20h14V9.5" ' + STROKE + '/>' +
      '<path d="M10 20v-5h4v5" ' + STROKE + '/>',
    flooring:
      '<rect x="3" y="4" width="18" height="16" rx="1.5" ' + STROKE + '/>' +
      '<path d="M3 12h18M9 4v8M15 12v8" ' + STROKE + '/>',
    generic:
      '<rect x="3" y="4" width="18" height="16" rx="2" ' + STROKE + '/>' +
      '<path d="M8 9h8M8 13h5" ' + STROKE + '/>',

    // ---- Etapas do pipeline ----
    lead:
      '<circle cx="12" cy="8" r="3.5" ' + STROKE + '/>' +
      '<path d="M5 20a7 7 0 0 1 14 0" ' + STROKE + '/>',
    visita:
      '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" ' + STROKE + '/>' +
      '<circle cx="12" cy="10" r="2.3" ' + STROKE + '/>',
    estimate:
      '<rect x="5" y="3" width="14" height="18" rx="1.5" ' + STROKE + '/>' +
      '<path d="M9 8h6M9 12h6M9 16h3" ' + STROKE + '/>',
    schedule:
      '<rect x="4" y="5" width="16" height="15" rx="1.5" ' + STROKE + '/>' +
      '<path d="M4 9h16M8 3v4M16 3v4" ' + STROKE + '/>' +
      '<circle cx="12" cy="14" r="1.3" fill="currentColor"/>',
    prep:
      '<path d="M11 4l1.6 3.7L16.5 9l-2.9 2.6.7 3.9L11 13.7 7.7 15.5l.7-3.9L5.5 9l3.9-1.3z" ' + STROKE + '/>',
    progress:
      '<circle cx="12" cy="12" r="9" ' + STROKE + '/>' +
      '<path d="M12 7v5l3.5 2" ' + STROKE + '/>',
    blocker:
      '<circle cx="12" cy="12" r="9" ' + STROKE + '/>' +
      '<path d="M5.5 5.5l13 13" ' + STROKE + '/>',
    review:
      '<path d="M12 4l2.3 4.7 5.2.8-3.7 3.6.9 5.1L12 15.8 7 18.2l.9-5.1-3.7-3.6 5.2-.8z" ' + STROKE + '/>',
    done:
      '<circle cx="12" cy="12" r="9" ' + STROKE + '/>' +
      '<path d="M8 12.5l2.5 2.5L16 9" ' + STROKE + '/>',
    perdido:
      '<circle cx="12" cy="12" r="9" ' + STROKE + '/>' +
      '<path d="M9 9l6 6M15 9l-6 6" ' + STROKE + '/>',

    // ---- UI ----
    dashboard:
      '<rect x="3" y="3" width="8" height="8" rx="1.5" ' + STROKE + '/>' +
      '<rect x="13" y="3" width="8" height="5" rx="1.5" ' + STROKE + '/>' +
      '<rect x="13" y="11" width="8" height="10" rx="1.5" ' + STROKE + '/>' +
      '<rect x="3" y="14" width="8" height="7" rx="1.5" ' + STROKE + '/>',
    jobs:
      '<rect x="3" y="7" width="18" height="13" rx="2" ' + STROKE + '/>' +
      '<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" ' + STROKE + '/>',
    subs:
      '<circle cx="9" cy="8" r="3" ' + STROKE + '/>' +
      '<path d="M3.5 19a5.5 5.5 0 0 1 11 0" ' + STROKE + '/>' +
      '<path d="M16 8.5a2.6 2.6 0 0 1 0 5M17 19a5 5 0 0 0-2-4" ' + STROKE + '/>',
    precos:
      '<path d="M12 3v18" ' + STROKE + '/>' +
      '<path d="M16 7.5C16 5.6 14.2 5 12 5s-4 .8-4 2.7c0 3.8 8 2.5 8 6.3 0 1.9-1.8 2.7-4 2.7s-4-.8-4-2.7" ' + STROKE + '/>',
    workorders:
      '<rect x="4" y="3" width="16" height="18" rx="2" ' + STROKE + '/>' +
      '<path d="M8 8h8M8 12h8M8 16h5" ' + STROKE + '/>',
    caixa:
      '<rect x="3" y="6" width="18" height="12" rx="2" ' + STROKE + '/>' +
      '<circle cx="12" cy="12" r="2.3" ' + STROKE + '/>' +
      '<path d="M6 6V9M18 6v3" ' + STROKE + '/>',
    search:
      '<circle cx="11" cy="11" r="6" ' + STROKE + '/>' +
      '<path d="M20 20l-4-4" ' + STROKE + '/>',
    map:
      '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" ' + STROKE + '/>' +
      '<circle cx="12" cy="10" r="2.3" ' + STROKE + '/>',
    clock:
      '<circle cx="12" cy="12" r="9" ' + STROKE + '/>' +
      '<path d="M12 7v5l3.5 2" ' + STROKE + '/>',
    copy:
      '<rect x="9" y="9" width="11" height="11" rx="2" ' + STROKE + '/>' +
      '<path d="M5 15V5a2 2 0 0 1 2-2h8" ' + STROKE + '/>',
    open:
      '<path d="M14 4h6v6" ' + STROKE + '/>' +
      '<path d="M20 4l-9 9" ' + STROKE + '/>' +
      '<path d="M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" ' + STROKE + '/>',
    camera:
      '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" ' + STROKE + '/>' +
      '<circle cx="12" cy="13" r="3.2" ' + STROKE + '/>',
    receipt:
      '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" ' + STROKE + '/>' +
      '<path d="M9 8h6M9 12h6" ' + STROKE + '/>',
    check:
      '<path d="M5 12.5l4.5 4.5L19 7" ' + STROKE + '/>',
    back:
      '<path d="M15 5l-7 7 7 7" ' + STROKE + '/>',
    phone:
      '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L17 14l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4 5.2 2 2 0 0 1 6 3z" ' + STROKE + '/>',
    money:
      '<rect x="3" y="6" width="18" height="12" rx="2" ' + STROKE + '/>' +
      '<circle cx="12" cy="12" r="2.5" ' + STROKE + '/>',
    plus:
      '<path d="M12 5v14M5 12h14" ' + STROKE + '/>',
    box:
      '<path d="M3 7l9-4 9 4v10l-9 4-9-4z" ' + STROKE + '/>' +
      '<path d="M3 7l9 4 9-4M12 11v10" ' + STROKE + '/>'
  };

  function icon(name, size) {
    var body = SVG[name] || SVG.generic;
    var s = size || 24;
    return (
      '<svg class="iac-icon" viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>'
    );
  }

  // Mapeia o texto livre de tipo_servico -> chave de icone
  function forService(text) {
    var t = (text || '').toLowerCase();
    if (/herringbone|chevron|hardwood|engineered|wood install/.test(t)) return 'hardwood';
    if (/vinyl|lvp|laminate/.test(t)) return 'vinyl';
    if (/tile|ceramic/.test(t)) return 'tile';
    if (/epoxy/.test(t)) return 'epoxy';
    if (/sand|refinish|s&r/.test(t)) return 'sandrefinish';
    if (/stair/.test(t)) return 'stairs';
    if (/demo|rip ?off|ram board/.test(t)) return 'demo';
    if (/bath/.test(t)) return 'bath';
    if (/kitchen/.test(t)) return 'kitchen';
    if (/remodel/.test(t)) return 'remodel';
    if (/mason|cmu|brick|block/.test(t)) return 'masonry';
    if (/paver/.test(t)) return 'pavers';
    if (/carpentry|trim|cabinet|finish|truss/.test(t)) return 'carpentry';
    if (/carpet/.test(t)) return 'carpet';
    if (/handyman/.test(t)) return 'handyman';
    if (/floor/.test(t)) return 'flooring';
    return 'generic';
  }

  // Mapeia status do pipeline -> chave de icone
  function forStatus(status) {
    var t = (status || '').toLowerCase();
    if (/lead/.test(t)) return 'lead';
    if (/visita/.test(t)) return 'visita';
    if (/estimate/.test(t)) return 'estimate';
    if (/schedule/.test(t)) return 'schedule';
    if (/prep/.test(t)) return 'prep';
    if (/progress/.test(t)) return 'progress';
    if (/blocker/.test(t)) return 'blocker';
    if (/review/.test(t)) return 'review';
    if (/done|conclu/.test(t)) return 'done';
    if (/perdid|lost/.test(t)) return 'perdido';
    return 'progress';
  }

  window.IAC_ICONS = {
    svg: SVG,
    icon: icon,
    forService: forService,
    forStatus: forStatus
  };
})();
