/* ============================================================================
   IAC ADMIN v2 — dia.js  ("Meu Dia")
   Roteiro pessoal do Italo (dono) — a HOME do app. Diferente das work orders
   dos subs: aqui e a lista do que ELE tem que fazer hoje.
   Secoes recolhiveis com contador, na ordem:
     1) Orcamentos a fazer (Lead / Visita agendada / Visita Feita) + guia de visita
     2) Hoje na rua (WOs A enviar / Em andamento — hoje ou futuro)
     3) A pagar agora (repasses pendentes/parciais) + alerta W9
     4) A receber (entradas pendentes/parciais)
     5) Follow-up (Estimate Enviado, mais antigos primeiro)
   So-leitura de dados operacionais + atalhos (ligar, mapa, WhatsApp, abrir job).
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  /* ------------------------------------------------ status dos orcamentos -- */
  // match case-insensitive pros dados reais ("Visita Feita" vs "Visita feita")
  var ORC_STATUSES = ['lead', 'visita agendada', 'visita feita'];
  function ehOrcamento(job) {
    return ORC_STATUSES.indexOf(String(job.status || '').toLowerCase()) >= 0;
  }

  /* ------------------------------------------------ links / helpers -------- */
  function telDigitos(tel) {
    var dig = String(tel || '').replace(/\D/g, '');
    if (!dig) return null;
    if (dig.length === 10) dig = '1' + dig;
    return dig;
  }
  function btnLigar(tel, extraCls) {
    var dig = telDigitos(tel);
    if (!dig) return '';
    return '<a class="btn green sm dia-act" href="tel:' + A.esc(dig) + '"' +
      (extraCls ? ' style="' + extraCls + '"' : '') + '>' + A.icon('phone', 15) + ' Ligar</a>';
  }
  function btnMapa(endereco, cidade) {
    var full = [endereco, cidade].filter(Boolean).join(', ');
    if (!full) return '';
    var url = 'https://maps.google.com/?q=' + encodeURIComponent(full);
    return '<a class="btn sec sm dia-act" href="' + A.esc(url) + '" target="_blank" rel="noopener">' +
      A.icon('map', 15) + ' Mapa</a>';
  }
  // WhatsApp do sub + link do portal do guy (mesma logica do wo.js)
  function telSubDigitos(subId) {
    var s = A.cache.subById && A.cache.subById[subId];
    return telDigitos((s && s.telefone) || '');
  }
  function montarEsqueminha(wo) {
    var guyLink = A.PAGES + 'guy.html?t=' + wo.token;
    var linhas = [
      A.subNome(wo.sub_id) + ' - ' + A.fmtDataDia(wo.data),
      '',
      '⏰ ' + (wo.hora || 'combinar'),
      '📍 ' + [wo.endereco, wo.cidade_st].filter(Boolean).join(', '),
      '🔧 ' + (wo.servico || ''),
      '💰 Repasse: ' + (wo.valor_repasse ? A.money(wo.valor_repasse) + ' (total)' : 'a combinar'),
      '',
      '✅ Checklist + fotos aqui:',
      guyLink
    ];
    if (wo.obs) linhas.push('', '📝 Obs: ' + wo.obs);
    return linhas.join('\n');
  }
  function waUrlSub(wo) {
    var dig = telSubDigitos(wo.sub_id);
    if (!dig) return null;
    return 'https://wa.me/' + dig + '?text=' + encodeURIComponent(montarEsqueminha(wo));
  }

  // datas: hoje / atrasada
  function ehHojeOuPassado(iso) {
    var d = A.parseISO(iso);
    if (!d) return false;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return d <= h;
  }
  function ehHojeOuFuturo(iso) {
    var d = A.parseISO(iso);
    if (!d) return false;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return d >= h;
  }
  function ehHoje(iso) {
    var d = A.parseISO(iso);
    if (!d) return false;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return d.getTime() === h.getTime();
  }

  /* ------------------------------------------------ GUIA DE VISITA --------- */
  // mapeia palavras-chave de tipo_servico -> checklist guia (so leitura)
  function guiaVisita(tipo) {
    var t = String(tipo || '').toLowerCase();
    if (/sand|refinish|s&r|lixa/.test(t)) {
      return [
        'Medir sqft de cada comodo (usar laser/trena)',
        'Tipo de madeira e estado (riscos, gaps, manchas de agua, pet stains)',
        'Ja tem acabamento? Quantas demaos vao precisar',
        'Escadas? Contar steps + risers + corrimao + posts',
        'Moveis: quem move? cobrar move fee',
        'Fotografar tudo',
        'Timeline do cliente',
        'How did you hear about us?'
      ];
    }
    if (/vinyl|lvp|lvt|laminate/.test(t)) {
      return [
        'Medir sqft + ~10% sobra',
        'Subfloor: nivelado? seco? precisa self-leveling?',
        'Remover carpet/piso velho? demo?',
        'Transicoes e thresholds (quantas portas)',
        'Baseboard/shoe: instalar ou reusar',
        'Cliente fornece ou IAC fornece material?',
        'Fotografar',
        'Timeline',
        'How did you hear about us?'
      ];
    }
    if (/tile|bathroom|kitchen|remodel/.test(t)) {
      return [
        'Medir area (piso + paredes se shower)',
        'Escopo: demo? plumbing? electric? drywall?',
        'Loucas/vanity/fixtures: cliente compra ou IAC?',
        'Waterproofing/backer board',
        'Padrao do tile (reto/herringbone) muda o preco',
        'Permit necessario?',
        'Fotografar + video',
        'Filmar pro Lucas orcar',
        'Timeline',
        'How did you hear about us?'
      ];
    }
    if (/epoxy|garage|floor coating|coating/.test(t)) {
      return [
        'Medir sqft',
        'Estado do concreto (rachaduras, oleo, epoxy velho a remover)',
        'Flake, metallic ou solido? (muda MUITO o preco)',
        'Umidade do concreto',
        'Driveway? camada extra de urethane + regra do sal',
        'Fotografar',
        'Timeline',
        'How did you hear about us?'
      ];
    }
    if (/framing|carpentry|masonry|mason|trim|drywall|framing/.test(t)) {
      return [
        'Medir/contar (LFT trim, SF drywall, n aberturas)',
        'Ler as plantas se houver',
        'Estrutural? precisa engenheiro/permit?',
        'Material: quem fornece',
        'Coordenar com outros trades',
        'Fotografar',
        'Timeline',
        'How did you hear about us?'
      ];
    }
    return [
      'Confirmar o escopo exato com o cliente',
      'Medir a area',
      'Fotografar tudo',
      'Perguntar timeline',
      'How did you hear about us?',
      'Anotar tudo nas notas do job'
    ];
  }

  /* ------------------------------------------------ estado das secoes ------ */
  var aberto = { orc: true, rua: true, pagar: true, receber: true, followup: true };
  var verTodosEstimates = false;

  A.pages.dia = {
    render: function (root) {
      return Promise.all([
        A.sb.from('jobs').select('id,cliente,telefone,endereco,cidade_st,tipo_servico,status,data_visita,created_at').order('created_at', { ascending: false }),
        A.sb.from('work_orders').select('id,job_id,sub_id,cliente,data,hora,status,endereco,cidade_st,servico,valor_repasse,pendencia,token,obs').order('data', { ascending: true, nullsFirst: false }),
        A.sb.from('caixa').select('id,data,tipo,cliente,job_id,descricao,valor,status,pago_para').order('valor', { ascending: false })
      ]).then(function (rs) {
        rs.forEach(function (r) { if (r.error) throw r.error; });
        desenhar(root, rs[0].data || [], rs[1].data || [], rs[2].data || []);
      });
    }
  };

  function desenhar(root, jobs, wos, caixa) {
    /* ----------------------- 1) ORCAMENTOS A FAZER ----------------------- */
    var orcamentos = jobs.filter(ehOrcamento).sort(function (a, b) {
      var da = a.data_visita, db = b.data_visita;
      if (!da && !db) return 0;
      if (!da) return 1;            // sem data por ultimo
      if (!db) return -1;
      return da < db ? -1 : da > db ? 1 : 0;  // data_visita asc
    });

    /* ----------------------- 2) HOJE NA RUA (subs) ----------------------- */
    var naRua = wos.filter(function (w) {
      var st = String(w.status || '');
      if (st !== 'A enviar' && st !== 'Em andamento') return false;
      return ehHojeOuFuturo(w.data);
    });

    /* ----------------------- 3) A PAGAR (repasses) ----------------------- */
    var aPagar = caixa.filter(function (c) {
      return c.tipo === 'repasse' && (c.status === 'pendente' || c.status === 'parcial');
    }).sort(function (a, b) { return Number(b.valor || 0) - Number(a.valor || 0); });
    var totalPagar = aPagar.reduce(function (s, c) { return s + Number(c.valor || 0); }, 0);

    /* ----------------------- 4) A RECEBER -------------------------------- */
    var aReceber = caixa.filter(function (c) {
      return c.tipo === 'entrada' && (c.status === 'pendente' || c.status === 'parcial');
    }).sort(function (a, b) { return Number(b.valor || 0) - Number(a.valor || 0); });
    var totalReceber = aReceber.reduce(function (s, c) { return s + Number(c.valor || 0); }, 0);

    /* ----------------------- 5) FOLLOW-UP -------------------------------- */
    var estimates = jobs.filter(function (j) {
      return String(j.status || '') === 'Estimate Enviado';
    }).sort(function (a, b) {
      var ca = a.created_at || '', cb = b.created_at || '';
      return ca < cb ? -1 : ca > cb ? 1 : 0;   // mais antigos primeiro
    });

    /* ----------------------- topo / saudacao ----------------------------- */
    var h = new Date();
    var hora = h.getHours();
    var saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    var hojeFmt = A.fmtDataDia(A.hoje());
    var resumo = orcamentos.length + ' visita' + (orcamentos.length === 1 ? '' : 's') +
      ' · ' + naRua.length + ' sub' + (naRua.length === 1 ? '' : 's') + ' na rua' +
      ' · ' + A.money(totalPagar) + ' a pagar' +
      ' · ' + A.money(totalReceber) + ' a receber';

    var html =
      '<div class="dia-hero">' +
      '<div class="dia-hi">☀️ ' + A.esc(saud) + ', Italo</div>' +
      '<div class="dia-date">' + A.esc(hojeFmt) + '</div>' +
      '<div class="dia-sum">' + A.esc(resumo) + '</div>' +
      '</div>';

    // === SECAO 1: ORCAMENTOS A FAZER ===
    html += secaoHead('orc', '🔍 Orcamentos a fazer', orcamentos.length,
      'o mais importante — visitas pra fechar');
    html += '<div class="dia-sec" data-sec="orc"' + (aberto.orc ? '' : ' style="display:none"') + '>';
    if (!orcamentos.length) {
      html += A.empty('Nenhum orcamento na fila', 'Leads e visitas agendadas aparecem aqui.', 'visita');
    } else {
      html += orcamentos.map(cardOrcamento).join('');
    }
    html += '</div>';

    // === SECAO 2: HOJE NA RUA ===
    html += secaoHead('rua', '📋 Hoje na rua (subs)', naRua.length,
      'work orders de hoje pra frente');
    html += '<div class="dia-sec" data-sec="rua"' + (aberto.rua ? '' : ' style="display:none"') + '>';
    if (!naRua.length) {
      html += A.empty('Ninguem na rua', 'WOs A enviar / Em andamento com data de hoje pra frente.', 'workorders');
    } else {
      html += naRua.map(cardRua).join('');
    }
    html += '</div>';

    // === SECAO 3: A PAGAR AGORA ===
    html += secaoHead('pagar', '💰 A pagar agora (repasses)', aPagar.length,
      'total: ' + A.money(totalPagar));
    html += '<div class="dia-sec" data-sec="pagar"' + (aberto.pagar ? '' : ' style="display:none"') + '>';
    if (!aPagar.length) {
      html += A.empty('Nada a pagar', 'Repasses pendentes/parciais aparecem aqui.', 'money');
    } else {
      html += '<div class="dia-tot red">Total a pagar: ' + A.money(totalPagar) + '</div>';
      html += aPagar.map(linhaPagar).join('');
    }
    html += '</div>';

    // === SECAO 4: A RECEBER ===
    html += secaoHead('receber', '💵 A receber', aReceber.length,
      'total: ' + A.money(totalReceber));
    html += '<div class="dia-sec" data-sec="receber"' + (aberto.receber ? '' : ' style="display:none"') + '>';
    if (!aReceber.length) {
      html += A.empty('Nada a receber pendente', 'Entradas pendentes/parciais aparecem aqui.', 'money');
    } else {
      html += '<div class="dia-tot green">Total a receber: ' + A.money(totalReceber) + '</div>';
      html += aReceber.map(linhaReceber).join('');
    }
    html += '</div>';

    // === SECAO 5: FOLLOW-UP ===
    var estVis = verTodosEstimates ? estimates : estimates.slice(0, 12);
    html += secaoHead('followup', '🔔 Follow-up (estimates parados)', estimates.length,
      'mais antigos primeiro');
    html += '<div class="dia-sec" data-sec="followup"' + (aberto.followup ? '' : ' style="display:none"') + '>';
    if (!estimates.length) {
      html += A.empty('Sem estimates parados', 'Jobs em "Estimate Enviado" aparecem aqui.', 'estimate');
    } else {
      html += '<div class="dia-note">Dinheiro na mesa — cada follow-up vira job.</div>';
      html += estVis.map(linhaEstimate).join('');
      if (!verTodosEstimates && estimates.length > 12) {
        html += '<button class="btn sec sm block dia-vertodos" style="margin-top:8px">ver todos (' + estimates.length + ')</button>';
      }
    }
    html += '</div>';

    root.innerHTML = html;

    /* ----------------------- ligar secoes recolhiveis -------------------- */
    root.querySelectorAll('.grp-h[data-toggle]').forEach(function (hEl) {
      hEl.addEventListener('click', function () {
        var k = hEl.getAttribute('data-toggle');
        aberto[k] = !aberto[k];
        var sec = root.querySelector('.dia-sec[data-sec="' + k + '"]');
        if (sec) sec.style.display = aberto[k] ? '' : 'none';
        var arr = hEl.querySelector('.arr');
        if (arr) arr.textContent = aberto[k] ? '▲ recolher' : '▼ abrir';
      });
    });

    /* ----------------------- guia de visita (toggle) --------------------- */
    root.querySelectorAll('[data-guia]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var wrap = btn.closest('.dia-card').querySelector('.dia-guia');
        if (!wrap) return;
        var mostrar = wrap.style.display === 'none' || !wrap.style.display;
        wrap.style.display = mostrar ? 'block' : 'none';
        btn.textContent = mostrar ? '🔎 Esconder guia da visita' : '🔎 O que olhar na visita';
      });
    });

    /* ----------------------- abrir job ----------------------------------- */
    root.querySelectorAll('[data-abrir-job]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        location.hash = '#/jobs/' + btn.getAttribute('data-abrir-job');
      });
    });

    /* ----------------------- WhatsApp (subs) ----------------------------- */
    root.querySelectorAll('[data-wa]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var w = wos.filter(function (x) { return x.id === btn.getAttribute('data-wa'); })[0];
        var url = w && waUrlSub(w);
        if (url) window.open(url, '_blank');
        else A.toast('Sub sem telefone cadastrado', 'err');
      });
    });

    /* ----------------------- ver todos estimates ------------------------- */
    var vtBtn = root.querySelector('.dia-vertodos');
    if (vtBtn) vtBtn.addEventListener('click', function () {
      verTodosEstimates = true;
      A.pages.dia.render(root);
    });

    // impede que o clique nos botoes de acao (ligar/mapa) borbulhe pro card
    root.querySelectorAll('.dia-act').forEach(function (a) {
      a.addEventListener('click', function (ev) { ev.stopPropagation(); });
    });
  }

  /* ------------------------------------------------ blocos de UI ----------- */
  function secaoHead(key, titulo, count, sub) {
    return '<div class="grp-h" data-toggle="' + key + '">' +
      A.esc(titulo) + ' <span class="count">' + count + '</span>' +
      (sub ? '<span class="dia-sec-sub">' + A.esc(sub) + '</span>' : '') +
      '<span class="arr">' + (aberto[key] ? '▲ recolher' : '▼ abrir') + '</span></div>';
  }

  // --- card de orcamento (o mais rico) ---
  function cardOrcamento(j) {
    var atrasada = j.data_visita && ehHojeOuPassado(j.data_visita);
    var dataTxt = j.data_visita
      ? '<span class="dia-visita' + (atrasada ? ' atrasada' : '') + '">' +
        A.icon('schedule', 14) + ' Visita: ' + A.esc(A.fmtDataDia(j.data_visita)) +
        (ehHoje(j.data_visita) ? ' · HOJE' : atrasada ? ' · atrasada' : '') + '</span>'
      : '<span class="dia-visita sem">sem data de visita</span>';
    var guia = guiaVisita(j.tipo_servico);
    return '<div class="card dia-card">' +
      '<div class="dia-card-top">' +
      '<div class="dia-nm">' + A.esc(j.cliente || '(sem nome)') +
      ' <span class="badge warm">' + A.esc(j.status || '') + '</span></div>' +
      '</div>' +
      '<div class="dia-sv">' + A.icon(window.IAC_ICONS.forService(j.tipo_servico), 15) + ' ' +
      A.esc(j.tipo_servico || 'servico?') + (j.cidade_st ? ' · ' + A.esc(j.cidade_st) : '') + '</div>' +
      '<div class="dia-meta">' + dataTxt + '</div>' +
      (j.endereco ? '<div class="dia-addr muted">' + A.icon('map', 13) + ' ' + A.esc(j.endereco) + '</div>' : '') +
      '<div class="dia-actions">' +
      btnLigar(j.telefone) +
      btnMapa(j.endereco, j.cidade_st) +
      '<button class="btn sec sm" data-abrir-job="' + A.esc(j.id) + '">' + A.icon('open', 15) + ' Abrir job</button>' +
      '</div>' +
      '<button class="dia-guia-btn" data-guia="1">🔎 O que olhar na visita</button>' +
      '<div class="dia-guia" style="display:none">' +
      '<div class="dia-guia-ttl">Checklist guia — ' + A.esc(j.tipo_servico || 'servico') + '</div>' +
      '<ul class="dia-guia-list">' +
      guia.map(function (item) { return '<li>' + A.esc(item) + '</li>'; }).join('') +
      '</ul>' +
      '<div class="muted" style="font-size:11px">Guia so pra lembrar na visita — nao marca nada.</div>' +
      '</div>' +
      '</div>';
  }

  // --- card "hoje na rua" (WO do sub) ---
  function cardRua(w) {
    var hojeTag = ehHoje(w.data) ? '<span class="badge orange">HOJE</span> ' : '';
    return '<div class="card dia-card">' +
      '<div class="dia-card-top">' +
      '<div class="dia-nm">' + A.esc(w.cliente || '—') +
      ' <span class="muted" style="font-weight:500">· ' + A.esc(A.subNome(w.sub_id)) + '</span></div>' +
      '<span class="badge ' + (w.status === 'Em andamento' ? 'orange' : 'red') + '">' + A.esc(w.status || '') + '</span>' +
      '</div>' +
      '<div class="dia-sv">' + A.icon('workorders', 15) + ' ' + A.esc(w.servico || '') + '</div>' +
      '<div class="dia-meta">' + hojeTag +
      '<span class="dia-visita">' + A.icon('schedule', 14) + ' ' + A.esc(A.fmtDataDia(w.data)) +
      (w.hora ? ' · ' + A.esc(w.hora) : '') + '</span>' +
      ' <span class="dia-rep">Repasse: ' + A.money(w.valor_repasse) + '</span>' +
      (w.pendencia ? ' <span class="badge yellow">⚠ pendência</span>' : '') +
      '</div>' +
      (w.endereco ? '<div class="dia-addr muted">' + A.icon('map', 13) + ' ' +
        A.esc([w.endereco, w.cidade_st].filter(Boolean).join(', ')) + '</div>' : '') +
      '<div class="dia-actions">' +
      btnMapa(w.endereco, w.cidade_st) +
      (telSubDigitos(w.sub_id)
        ? '<button class="btn green sm dia-act" data-wa="' + A.esc(w.id) + '">' + A.icon('phone', 15) + ' WhatsApp sub</button>'
        : '') +
      '<a class="btn sec sm dia-act" href="#/wo/' + A.esc(w.id) + '">Abrir WO</a>' +
      '</div>' +
      '</div>';
  }

  // --- linha "a pagar" (repasse) ---
  function linhaPagar(c) {
    var sub = A.cache.subById && A.cache.subById[subIdDePagar(c)];
    var semW9 = sub && sub.w9 === false;
    var quem = c.pago_para || (sub && sub.nome) || '—';
    return '<div class="li-row">' +
      '<div class="main"><div class="t1">' + A.esc(quem) +
      (semW9 ? ' <span class="badge red">⚠ SEM W9 - cobrar antes de pagar</span>' : '') + '</div>' +
      '<div class="t2">' + A.esc(c.cliente || descCurta(c) || '—') +
      (c.status === 'parcial' ? ' · <b style="color:var(--orange)">parcial</b>' : ' · pendente') +
      '</div></div>' +
      '<b style="color:var(--red);white-space:nowrap">' + A.money(c.valor) + '</b>' +
      '</div>';
  }
  // acha o sub a partir do lancamento de repasse (pago_para casa com nome do sub)
  function subIdDePagar(c) {
    var alvo = String(c.pago_para || '').toLowerCase().trim();
    if (!alvo) return null;
    var subs = A.cache.subs || [];
    for (var i = 0; i < subs.length; i++) {
      if (String(subs[i].nome || '').toLowerCase().trim() === alvo) return subs[i].id;
      if (String(subs[i].id || '').toLowerCase().trim() === alvo) return subs[i].id;
    }
    return null;
  }

  // --- linha "a receber" (entrada) ---
  function linhaReceber(c) {
    return '<div class="li-row">' +
      '<div class="main"><div class="t1">' + A.esc(c.cliente || descCurta(c) || '—') + '</div>' +
      '<div class="t2">' + A.esc(descCurta(c) || 'entrada') +
      (c.status === 'parcial' ? ' · <b style="color:var(--orange)">parcial</b>' : ' · pendente') +
      (c.data ? ' · ' + A.esc(A.fmtData(c.data)) : '') +
      '</div></div>' +
      '<b style="color:var(--green);white-space:nowrap">' + A.money(c.valor) + '</b>' +
      '</div>';
  }
  function descCurta(c) {
    var d = String(c.descricao || '').replace(/^\[(\w+)\]\s*/, '').trim();
    if (d.length > 60) d = d.slice(0, 57) + '…';
    return d;
  }

  // --- linha follow-up (estimate) ---
  function linhaEstimate(j) {
    return '<div class="li-row dia-est" data-abrir-job="' + A.esc(j.id) + '" style="cursor:pointer">' +
      '<div class="main"><div class="t1">' + A.esc(j.cliente || '(sem nome)') + '</div>' +
      '<div class="t2">' + A.esc(j.tipo_servico || 'servico?') +
      (j.cidade_st ? ' · ' + A.esc(j.cidade_st) : '') +
      (j.created_at ? ' · enviado ' + A.esc(A.fmtData(j.created_at)) : '') +
      '</div></div>' +
      btnLigar(j.telefone) +
      '</div>';
  }
})();
