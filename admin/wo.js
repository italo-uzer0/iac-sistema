/* ============================================================================
   IAC ADMIN v2 — wo.js (Work Orders)
   Lista agrupada por status (sem scroll infinito) + filtros sub/semana,
   detalhe com checklist clicavel, pagamentos ao sub, copiar link do guy e
   esqueminha WhatsApp, e criacao de nova WO com template de checklist.
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  /* ------------------------------------------------ templates de checklist */
  var TEMPLATES = {
    vinyl: {
      label: 'Vinyl / LVP install',
      checklist: [
        'ANTES DE SAIR: confirmar com o Italo se o vinyl ja esta no local. Se faltar algo (underlayment, transicoes, shoe mold), COMPRAR ANTES de ir e fotografar o recibo',
        'ANTES DE SAIR: conferir ferramentas - serra/jigsaw, estilete + laminas, trena, regua/nivel 6ft, tapping block, puxador, spacers 1/4", martelo de borracha, aspirador',
        'CHEGADA: falar com o cliente, confirmar acesso e quais ambientes entram no escopo',
        'Tirar FOTOS DE ANTES de todos os ambientes (piso atual, cantos, portas)',
        'Abrir as caixas de vinyl e deixar aclimatando no ambiente enquanto prepara o resto',
        'Preparo: remover shoe mold/baseboard se precisar, raspar restos, varrer e aspirar o subfloor inteiro',
        'Conferir subfloor com regua 6ft: nivelado, limpo e seco. Ponto alto = lixar; ponto baixo = self leveling. Avisar o Italo se precisar de self leveling',
        'Instalar underlayment (so se o vinyl NAO tiver manta acoplada)',
        'Instalar comecando pela parede mais longa e reta, gap de expansao 1/4"-3/8" nas paredes, juntas escalonadas min. 6", misturar pranchas de caixas diferentes',
        'Recortes: portas e batentes (cortar batente por baixo/undercut), tubos e cantos - encaixe justo, sem fresta',
        'Instalar transicoes/thresholds entre ambientes e recolocar/instalar baseboard e shoe mold (se estiver no escopo)',
        'Tirar FOTOS DE DEPOIS de todos os ambientes + foto dos recibos de qualquer compra',
        'Limpeza final, levar TODO o entulho embora, mostrar pro cliente e confirmar que aprovou',
        'Avisar o Italo que finalizou (mandar fotos + recibos no grupo)'
      ],
      materiais: [
        'Vinyl (conferir se cobre a metragem + ~10% de sobra)',
        'Underlayment (so se o vinyl nao tiver manta acoplada)',
        'Transicoes/thresholds e shoe mold (se no escopo)',
        'Comprou algo? Guarda o recibo e sobe a foto'
      ]
    },
    sr: {
      label: 'Sand & Refinish',
      checklist: [
        'ANTES DE SAIR: confirmar com o Italo a cor do stain / acabamento (natural, stain, water-based ou oil) e quantas demaos',
        'ANTES DE SAIR: conferir material - lixas (36/60/80/100), edger, buffer, stain, poly/finish, brochas/aplicadores, plastico pra vedar portas',
        'CHEGADA: falar com o cliente, confirmar ambientes do escopo e onde ligar as maquinas (voltagem)',
        'Tirar FOTOS DE ANTES de todos os ambientes',
        'Proteger: vedar portas/armarios com plastico, cobrir o que ficou no ambiente',
        'Preparo do piso: pregos/grampos rebaixados, tabuas soltas fixadas, remover shoe mold se precisar',
        'Lixar sequencia de grao (grosso -> fino) com a big machine + edger nas bordas e cantos',
        'Buffer/screen final e aspirar TUDO (piso, rodape, peitoril) - zero poeira antes do finish',
        'Aplicar stain (se tiver) uniforme e deixar secar o tempo certo',
        'Aplicar as demaos de finish combinadas, lixando leve entre demaos (respeitar tempo de secagem)',
        'Tirar FOTOS DE DEPOIS de todos os ambientes + recibos de compras',
        'Limpeza final, levar o entulho, orientar o cliente: sem pisar ~24h, moveis so depois de 48-72h, tapetes 2 semanas',
        'Avisar o Italo que finalizou (fotos + recibos no grupo)'
      ],
      materiais: [
        'Lixas 36/60/80/100 (big machine + edger)',
        'Stain (cor confirmada com o Italo/cliente)',
        'Poly/finish + aplicadores',
        'Plastico e fita pra vedar',
        'Comprou algo? Guarda o recibo e sobe a foto'
      ]
    },
    tile: {
      label: 'Tile / Ceramic',
      checklist: [
        'ANTES DE SAIR: confirmar com o Italo se o tile, thinset, grout e niveladores ja estao no local. Comprar o que faltar e fotografar o recibo',
        'ANTES DE SAIR: conferir ferramentas - cortadora/wet saw, desempenadeira dentada, nivel, espacadores, misturador, esponjas, joelheiras',
        'CHEGADA: falar com o cliente, confirmar layout/padrao (reto, diagonal, offset) e ponto de partida',
        'Tirar FOTOS DE ANTES da area',
        'Preparo: superficie limpa, firme e nivelada. Cement board / waterproofing se for area molhada (banheiro)',
        'Marcar linhas de referencia e fazer dry layout de uma fileira pra conferir cortes das pontas',
        'Assentar com thinset correto, espacadores e niveladores - juntas uniformes, pecas no nivel',
        'Cortes limpos em cantos, tubos e batentes - sem lascas a vista',
        'Respeitar cura do thinset antes de pisar/rejuntar (min. 24h)',
        'Rejuntar (grout), limpar excesso com esponja, e caulk nos encontros com parede/banheira',
        'Tirar FOTOS DE DEPOIS + recibos de compras',
        'Limpeza final, levar TODO o entulho, mostrar pro cliente e confirmar que aprovou',
        'Avisar o Italo que finalizou (fotos + recibos no grupo)'
      ],
      materiais: [
        'Tile (conferir metragem + ~10% de sobra)',
        'Thinset + grout (cor confirmada) + caulk',
        'Espacadores / niveladores',
        'Cement board / waterproofing (se area molhada)',
        'Comprou algo? Guarda o recibo e sobe a foto'
      ]
    },
    epoxy: {
      label: 'Epoxy (garagem)',
      checklist: [
        'ANTES DE SAIR: conferir material - epoxy base coat, flakes (cor escolhida pelo cliente), top coat clear, crack filler, discos de desbaste. Comprar o que faltar e guardar recibo',
        'ANTES DE SAIR: conferir ferramentas - grinder de piso + discos diamantados, shop vac, furadeira + misturador, rolos + rodo, spiked shoes, fita',
        'CHEGADA: falar com o cliente, pedir pra tirar carros e tudo do chao, confirmar a cor dos flakes',
        'Tirar FOTOS DE ANTES do piso inteiro (incluindo trincas e manchas)',
        'Preparo: desbastar (grind) o piso inteiro pra abrir o concreto e aspirar toda a poeira',
        'Reparar trincas/buracos com filler, deixar curar e re-desbastar os reparos no nivel',
        'Limpeza final: aspirar + pano - piso 100% sem poeira e SECO antes de qualquer demao. Fita nas bordas',
        'Misturar e aplicar o base coat (respeitar proporcao e pot life), rolar uniforme parede a parede',
        'Jogar os flakes no base coat AINDA MOLHADO, na cor e cobertura escolhidas',
        'Depois de curar: raspar e aspirar os flakes soltos',
        'Aplicar o top coat clear uniforme no piso inteiro',
        'Tirar FOTOS DE DEPOIS + recibos',
        'Limpeza, levar o entulho, e avisar o cliente dos tempos de cura: pedestre ~24h, carro so depois de curar total (3-7 dias)',
        'Avisar o Italo que finalizou (fotos + recibos no grupo)'
      ],
      materiais: [
        'Epoxy base coat (metragem conferida)',
        'Flakes na cor escolhida pelo cliente',
        'Top coat clear',
        'Crack filler / patch de concreto',
        'Discos de grinder, rolos, rodo, spiked shoes, fita',
        'Comprou algo? Guarda o recibo e sobe a foto'
      ]
    },
    handyman: {
      label: 'Handyman / geral',
      checklist: [
        'ANTES DE SAIR: confirmar com o Italo o escopo exato (o que vai ser feito e o acabamento esperado)',
        'ANTES DE SAIR: comprar o que faltar - caulk, massa/spackle, lixa (120/220), parafusos, pregos de acabamento - e fotografar os recibos',
        'ANTES DE SAIR: conferir ferramentas - furadeira, nivel, trena, serra, espatula, pistola de caulk, stud finder, lona de protecao',
        'CHEGADA: falar com o cliente e confirmar a area de trabalho',
        'Tirar FOTOS DE ANTES da area',
        'Proteger moveis, piso e portas com lona/plastico antes de gerar poeira',
        'Executar o servico conforme o escopo - fixar em stud/ancora, conferir nivel e alinhamento',
        'Acabamento: caulk nas emendas e frestas, touch-up onde precisar - limpo, sem excesso',
        'Revisao final: tudo firme, nivelado, sem marca na parede ou no piso',
        'Tirar FOTOS DE DEPOIS + foto dos recibos de compra',
        'Tirar a protecao, limpeza final e levar TODO o entulho embora',
        'Mostrar pro cliente, confirmar que aprovou, e avisar o Italo (fotos + recibos no grupo)'
      ],
      materiais: [
        'Caulk (branco, paintable) + pistola',
        'Massa corrida / spackle + espatula',
        'Lixa 120 e 220',
        'Parafusos + ancoras + pregos de acabamento',
        'Lona/plastico de protecao e fita',
        'Comprou? Guarda o recibo e sobe a foto'
      ]
    }
  };

  /* ------------------------------------------------ whatsapp helpers ----- */
  function telDigitos(subId) {
    var s = A.cache.subById && A.cache.subById[subId];
    var dig = String((s && s.telefone) || '').replace(/\D/g, '');
    if (!dig) return null;
    if (dig.length === 10) dig = '1' + dig;
    return dig;
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
  function waUrl(wo) {
    var dig = telDigitos(wo.sub_id);
    if (!dig) return null;
    return 'https://wa.me/' + dig + '?text=' + encodeURIComponent(montarEsqueminha(wo));
  }

  A.pages.wo = {
    render: function (root, args, query) {
      if (args && args[0] === 'nova') return renderNova(root, query || {});
      if (args && args[0]) return renderDetalhe(root, args[0]);
      return renderLista(root);
    }
  };

  /* ========================================================= LISTA ======= */
  /* WOs "VIVAS": secao do EDU (gerente) no topo, depois GUYS; dentro de cada
     secao agrupado por TEMPO (🔥 HOJE / 📅 ESTA SEMANA / ⏭️ PROXIMAS SEMANAS /
     SEM DATA) e WOs do MESMO job agrupadas num cartao-mae do cliente. */
  var fFiltro = { sub: '', semana: '' };
  var conclAberto = false;

  var DIAS3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  function renderLista(root) {
    return Promise.all([
      A.sb.from('work_orders').select('*').order('data', { ascending: false }),
      A.sb.from('wo_checklist').select('wo_id,done')
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      var wos = rs[0].data || [];
      var prog = {};
      (rs[1].data || []).forEach(function (c) {
        var p = prog[c.wo_id] || (prog[c.wo_id] = { done: 0, total: 0 });
        p.total++; if (c.done) p.done++;
      });
      desenharLista(root, wos, prog);
    });
  }

  /* ---- pecas visuais ---- */
  function chipDia(w, hoje0) {
    var d = A.parseISO(w.data);
    if (!d) return '<span class="wov-chip wov-chip-semdata">SEM DATA</span>';
    var txt = DIAS3[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0');
    var hora = w.hora ? ' · ' + A.esc(w.hora) : '';
    if (d.getTime() === hoje0.getTime())
      return '<span class="wov-chip wov-chip-hoje">HOJE' + hora + '</span>';
    if (d < hoje0)
      return '<span class="wov-chip wov-chip-atrasada">⚠ ' + txt + ' · ATRASADA</span>';
    return '<span class="wov-chip wov-d' + d.getDay() + '">' + txt + hora + '</span>';
  }
  function badgeVivo(w, hoje0) {
    if (String(w.status || '') === 'Concluido') return '';
    if (String(w.status || '') === 'Em andamento')
      return '<span class="wov-pulse wov-pulse-red">EM ANDAMENTO</span>';
    var d = A.parseISO(w.data);
    if (d && d.getTime() === hoje0.getTime())
      return '<span class="wov-pulse wov-pulse-org">HOJE</span>';
    if (d && d < hoje0)
      return '<span class="wov-pulse wov-pulse-org">ATRASADA</span>';
    return '';
  }
  function pagBadgeHtml(w) {
    if (!w.valor_repasse) return '<span class="badge">sem valor</span>';
    var pago = Number(w.pago_ao_sub || 0);
    if (pago >= Number(w.valor_repasse)) return '<span class="badge green">pago ao sub</span>';
    if (pago > 0) return '<span class="badge orange">parcial ' + A.money(pago) + '</span>';
    return '<span class="badge red">nao pago</span>';
  }
  function botoesHtml(w) {
    return (telDigitos(w.sub_id) ? '<button class="btn green sm wov-mini" data-wa="' + A.esc(w.id) + '">WhatsApp</button>' : '') +
      (w.status !== 'Concluido' ? '<button class="btn sec sm wov-mini" data-fin="' + A.esc(w.id) + '">✔ Finalizar</button>' : '');
  }

  /* ---- card de UMA wo ---- */
  function cardWo(w, p, hoje0, mods) {
    p = p || { done: 0, total: 0 };
    var pct = p.total ? Math.round(100 * p.done / p.total) : 0;
    return '<a class="card wov-card' + (mods || '') + '" href="#/wo/' + A.esc(w.id) + '">' +
      '<div class="wov-top">' + chipDia(w, hoje0) + badgeVivo(w, hoje0) +
      '<span class="grow"></span><span class="badge warm">' + A.esc(w.status || 'A enviar') + '</span></div>' +
      '<div class="wov-cli">' + A.esc(w.cliente || '—') + '</div>' +
      '<div class="wov-sv">' + A.esc(A.subNome(w.sub_id)) + ' · ' + A.esc(w.servico || '') +
      (w.pendencia ? ' <span class="badge yellow">⚠ pendência</span>' : '') + '</div>' +
      (p.total ? '<div class="row wov-prog"><div class="pbar grow"><i style="width:' + pct + '%"></i></div>' +
        '<span class="wov-ptx">' + p.done + '/' + p.total + '</span></div>' : '') +
      '<div class="row wov-foot"><span class="wov-rep">Repasse: ' + A.money(w.valor_repasse) + '</span>' +
      '<span class="grow"></span>' + botoesHtml(w) + pagBadgeHtml(w) + '</div></a>';
  }

  /* ---- cartao-mae: varias WOs do MESMO job num card so (fim do card repetido) ---- */
  function cardGrupo(g, prog, hoje0, mods) {
    if (g.wos.length === 1) return cardWo(g.wos[0], prog[g.wos[0].id], hoje0, mods);
    var totalRep = 0, temValor = false;
    g.wos.forEach(function (w) { if (w.valor_repasse) { totalRep += Number(w.valor_repasse); temValor = true; } });
    var rows = g.wos.map(function (w) {
      var p = prog[w.id] || { done: 0, total: 0 };
      return '<a class="wov-etapa" href="#/wo/' + A.esc(w.id) + '">' +
        '<div class="wov-e-top">' + chipDia(w, hoje0) + badgeVivo(w, hoje0) +
        '<span class="grow"></span><span class="badge warm">' + A.esc(w.status || 'A enviar') + '</span></div>' +
        '<div class="wov-e-sv">' + A.esc(w.servico || '—') + ' <span class="wov-e-sub">· ' + A.esc(A.subNome(w.sub_id)) + '</span>' +
        (w.pendencia ? ' <span class="badge yellow">⚠ pendência</span>' : '') + '</div>' +
        '<div class="row wov-e-foot">' +
        (p.total ? '<span class="wov-ptx">✓ ' + p.done + '/' + p.total + '</span>' : '') +
        '<span class="wov-rep">' + A.money(w.valor_repasse) + '</span>' +
        '<span class="grow"></span>' + botoesHtml(w) + pagBadgeHtml(w) + '</div></a>';
    }).join('');
    return '<div class="card wov-grupo' + (mods || '') + '">' +
      '<div class="wov-g-head"><span class="wov-cli">' + A.esc(g.cliente || '—') + '</span>' +
      '<span class="wov-etapas">' + g.wos.length + ' etapas</span>' + badgeVivo(g.wos[0], hoje0) +
      '<span class="grow"></span>' + (temValor ? '<span class="wov-rep">Total: ' + A.money(totalRep) + '</span>' : '') +
      '</div>' + rows + '</div>';
  }

  /* ---- agrupamento por job + por tempo ---- */
  function agruparPorJob(list) {
    var map = {}, ordem = [];
    list.forEach(function (w) {
      var k = w.job_id || ('solo-' + w.id);
      if (!map[k]) { map[k] = { cliente: w.cliente, wos: [] }; ordem.push(k); }
      if (!map[k].cliente && w.cliente) map[k].cliente = w.cliente;
      map[k].wos.push(w);
    });
    return ordem.map(function (k) { return map[k]; });
  }
  function ordenarWos(a, b) {
    var da = A.parseISO(a.data), db = A.parseISO(b.data);
    if (da && db && da.getTime() !== db.getTime()) return da - db;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return String(a.hora || '').localeCompare(String(b.hora || ''));
  }
  function prioData(d, hoje0, fimSem) {
    if (!d) return 3;                              // sem data
    if (d.getTime() <= hoje0.getTime()) return 0;  // hoje ou atrasada
    if (d <= fimSem) return 1;                     // esta semana
    return 2;                                      // proximas semanas
  }

  function secaoHtml(tituloHtml, cls, list, prog, hoje0, fimSem) {
    if (!list.length) return '';
    var grupos = agruparPorJob(list);
    grupos.forEach(function (g) {
      g.wos.sort(ordenarWos);
      var minP = 9, minD = null;
      g.wos.forEach(function (w) {
        var d = A.parseISO(w.data);
        var p = prioData(d, hoje0, fimSem);
        if (p < minP) minP = p;
        if (d && (!minD || d < minD)) minD = d;
      });
      g.prio = minP; g.minD = minD;
    });
    grupos.sort(function (a, b) {
      if (a.prio !== b.prio) return a.prio - b.prio;
      if (a.minD && b.minD) return a.minD - b.minD;
      return a.minD ? -1 : (b.minD ? 1 : 0);
    });
    var hoje = grupos.filter(function (g) { return g.prio === 0; });
    var sem = grupos.filter(function (g) { return g.prio === 1; });
    var prox = grupos.filter(function (g) { return g.prio === 2; });
    var semData = grupos.filter(function (g) { return g.prio === 3; });
    var inner = '';
    if (hoje.length) {
      inner += '<div class="wov-tg wov-tg-hoje">🔥 HOJE</div>' +
        hoje.map(function (g) { return cardGrupo(g, prog, hoje0, ' wov-big'); }).join('');
    }
    if (sem.length) {
      inner += '<div class="wov-tg wov-tg-sem">📅 ESTA SEMANA</div>' +
        sem.map(function (g) { return cardGrupo(g, prog, hoje0, ' wov-med'); }).join('');
    }
    if (prox.length) {
      inner += '<div class="wov-tg wov-tg-prox">⏭️ PRÓXIMAS SEMANAS</div>';
      var wkAtual = '';
      prox.forEach(function (g) {
        var seg = new Date(g.minD); seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7));
        var lbl = 'Semana de ' + String(seg.getDate()).padStart(2, '0') + '/' + String(seg.getMonth() + 1).padStart(2, '0');
        if (lbl !== wkAtual) { wkAtual = lbl; inner += '<div class="wov-wk">' + lbl + '</div>'; }
        inner += cardGrupo(g, prog, hoje0, ' wov-dim');
      });
    }
    if (semData.length) {
      inner += '<div class="wov-tg wov-tg-prox">🗓 SEM DATA</div>' +
        semData.map(function (g) { return cardGrupo(g, prog, hoje0, ' wov-dim'); }).join('');
    }
    return '<section class="wov-sec ' + cls + '">' +
      '<div class="wov-sec-h">' + tituloHtml + '<span class="wov-sec-n">' + list.length + '</span></div>' +
      inner + '</section>';
  }

  function desenharLista(root, wos, prog) {
    root.innerHTML =
      '<div class="h-page">' + A.icon('workorders', 22) + ' Work Orders <span class="grow"></span>' +
      '<a class="btn sm" href="#/wo/nova">+ Nova</a></div>' +
      '<div class="filters">' +
      '<select id="wf-sub"><option value="">Todos os subs</option>' +
      A.cache.subs.map(function (s) { return '<option value="' + A.esc(s.id) + '"' + (fFiltro.sub === s.id ? ' selected' : '') + '>' + A.esc(s.nome) + '</option>'; }).join('') +
      '</select>' +
      '<select id="wf-sem">' +
      [['', 'Todas as datas'], ['esta', 'Esta semana'], ['prox', 'Proxima semana'], ['pass', 'Passadas'], ['semdata', 'Sem data']].map(function (o) {
        return '<option value="' + o[0] + '"' + (fFiltro.semana === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') +
      '</select></div>' +
      '<div id="wo-grupos"></div>';

    function aplicar() {
      var estaR = A.weekRange(0), proxR = A.weekRange(1);
      var hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
      var vis = wos.filter(function (w) {
        if (fFiltro.sub && w.sub_id !== fFiltro.sub) return false;
        var d = A.parseISO(w.data);
        if (fFiltro.semana === 'esta') return d && d >= estaR[0] && d <= estaR[1];
        if (fFiltro.semana === 'prox') return d && d >= proxR[0] && d <= proxR[1];
        if (fFiltro.semana === 'pass') return d && d < estaR[0];
        if (fFiltro.semana === 'semdata') return !d;
        return true;
      });
      var box = document.getElementById('wo-grupos');
      var ativas = vis.filter(function (w) { return String(w.status || '') !== 'Concluido'; });
      var concl = vis.filter(function (w) { return String(w.status || '') === 'Concluido'; });
      var edu = ativas.filter(function (w) { return String(w.sub_id || '') === 'edu'; });
      var guys = ativas.filter(function (w) { return String(w.sub_id || '') !== 'edu'; });

      var html = '';
      html += secaoHtml('👔 EDU — GERENTE', 'wov-sec-edu', edu, prog, hoje0, estaR[1]);
      html += secaoHtml('👷 GUYS', 'wov-sec-guys', guys, prog, hoje0, estaR[1]);
      if (concl.length) {
        concl.sort(function (a, b) { return ordenarWos(b, a); });
        html += '<div class="grp-h" data-grp="concl">' + A.icon('done', 17) +
          ' Concluídas <span class="count">' + concl.length + '</span>' +
          '<span class="arr">' + (conclAberto ? '▲ recolher' : '▼ abrir') + '</span></div>';
        if (conclAberto) html += concl.map(function (w) { return cardWo(w, prog[w.id], hoje0, ' wov-done'); }).join('');
      }
      box.innerHTML = html || A.empty('Nenhuma work order aqui', 'Ajusta os filtros ou cria uma nova.', 'workorders');

      box.querySelectorAll('.grp-h').forEach(function (h) {
        h.addEventListener('click', function () {
          conclAberto = !conclAberto;
          aplicar();
        });
      });
      box.querySelectorAll('[data-wa]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          var w = wos.filter(function (x) { return x.id === btn.getAttribute('data-wa'); })[0];
          var url = w && waUrl(w);
          if (url) window.open(url, '_blank');
          else A.toast('Sub sem telefone cadastrado', 'err');
        });
      });
      box.querySelectorAll('[data-fin]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          var w = wos.filter(function (x) { return x.id === btn.getAttribute('data-fin'); })[0];
          if (!w) return;
          if (!A.confirmar('Finalizar o trabalho da WO de "' + (w.cliente || w.id) + '"? A WO some da tela principal e o job vai pra Done se os valores estiverem completos.')) return;
          btn.disabled = true; btn.textContent = 'Finalizando…';
          finalizarWO(w, function () { aplicar(); });
        });
      });
    }

    document.getElementById('wf-sub').addEventListener('change', function (ev) { fFiltro.sub = ev.target.value; aplicar(); });
    document.getElementById('wf-sem').addEventListener('change', function (ev) { fFiltro.semana = ev.target.value; aplicar(); });
    aplicar();
  }

  /* ======================================================= DETALHE ======= */
  function renderDetalhe(root, id) {
    return Promise.all([
      A.sb.from('work_orders').select('*').eq('id', id).maybeSingle(),
      A.sb.from('wo_checklist').select('*').eq('wo_id', id).order('pos'),
      A.sb.from('wo_materials').select('*').eq('wo_id', id).order('pos'),
      A.sb.from('wo_payments').select('*').eq('wo_id', id).order('data')
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      var wo = rs[0].data;
      if (!wo) { root.innerHTML = A.empty('Work order nao encontrada', id); return; }
      // job do cliente (admin-only): valor total / pago / saldo — NUNCA vai pro sub
      var pJob = wo.job_id
        ? A.sb.from('jobs').select('id,cliente,valor_total,pago,pagamento,status').eq('id', wo.job_id).maybeSingle()
        : Promise.resolve({ data: null, error: null });
      return Promise.resolve(pJob).then(function (rj) {
        if (rj.error) throw rj.error;
        desenharDetalhe(root, wo, rs[1].data || [], rs[2].data || [], rs[3].data || [], rj.data || null);
      });
    });
  }

  function salvarWo(id, patch) {
    return A.sb.from('work_orders').update(patch).eq('id', id).then(function (r) { if (r.error) throw r.error; });
  }

  // ---- review pos-Done (regra 23): grava nota com o SMS de review pronto ----
  function smsReview(cliente, servico) {
    var nome = String(cliente || '').trim().split(/\s+/)[0] || 'there';
    var serv = String(servico || '').trim() || 'project';
    return "Hi " + nome + ", it's Italo from IAC Home Improvement — thank you for trusting us with your " + serv + "! If you're happy with the work, a quick Google review really helps our local family business. Takes 30 seconds: [REVIEW_LINK]";
  }
  function notaReviewDone(jobId, cliente, servico) {
    if (!jobId) return;
    A.sb.from('job_notes').insert({
      job_id: jobId, data: A.hoje(), titulo: 'SMS de review (enviar pro cliente)',
      texto: smsReview(cliente, servico)
    }).then(function (r) {
      if (r.error) return A.toastErr(r.error);
      A.toast('SMS de review pronto nas notas 📋', 'ok');
    }).catch(function () { });
  }

  // Finaliza a WO: marca 'Concluido' e avalia se o job pode fechar (via core).
  // Se travar por pendencia de valor, escreve nota no job e avisa o Italo.
  function finalizarWO(wo, onDone) {
    return salvarWo(wo.id, { status: 'Concluido' }).then(function () {
      wo.status = 'Concluido';
      return A.avaliarJobDone(wo.job_id);
    }).then(function (res) {
      A.celebrate();
      if (res.done) {
        A.toast('✔ Trabalho finalizado — job movido pra Done', 'ok');
        notaReviewDone(wo.job_id, wo.cliente, wo.servico);
      } else if (res.pendencias && res.pendencias.length) {
        if (wo.job_id) {
          A.sb.from('job_notes').insert({
            job_id: wo.job_id, data: A.hoje(), titulo: 'Finalizado com pendência',
            texto: 'Trabalho finalizado (WO concluída), mas o job NÃO fechou por falta de: ' +
              res.pendencias.join(', ') + '. Preencha o(s) valor(es) pra o job ir pra Done.'
          }).then(function () { });
        }
        A.toast('WO finalizada — job em aberto: falta ' + res.pendencias.join(', '), 'err');
      } else if (res.already) {
        A.toast('✔ WO finalizada (job já estava em Done)', 'ok');
      } else {
        A.toast('✔ WO finalizada', 'ok');
      }
      if (onDone) onDone(res);
    }).catch(A.toastErr);
  }

  function desenharDetalhe(root, wo, checklist, materiais, pagamentos, job) {
    var guyLink = A.PAGES + 'guy.html?t=' + wo.token;

    // bloco Cliente (ADMIN-ONLY): dados financeiros do JOB — jamais no portal do sub
    var clienteHtml = '';
    if (job) {
      var vt = job.valor_total;
      var pg = Number(job.pago || 0);
      var saldo = (vt === null || vt === undefined) ? null : Number(vt) - pg;
      clienteHtml =
        '<div class="card"><h3>💰 Cliente (só você vê) <span class="grow"></span>' +
        '<span class="muted" style="font-weight:400">🔒 não aparece pro sub</span></h3>' +
        '<div class="row" style="margin-bottom:8px;flex-wrap:wrap">' +
        '<span class="stat" style="box-shadow:none;background:var(--light);padding:8px 12px"><span class="lbl">Valor total</span><div class="val" style="font-size:16px">' + A.money(vt) + '</div></span>' +
        '<span class="stat" style="box-shadow:none;background:var(--light);padding:8px 12px"><span class="lbl">Pago (depósito)</span><div class="val green" style="font-size:16px">' + A.money(pg) + '</div></span>' +
        (saldo !== null
          ? '<span class="stat" style="box-shadow:none;background:var(--light);padding:8px 12px"><span class="lbl">Saldo</span><div class="val ' + (saldo > 0 ? 'red' : 'green') + '" style="font-size:16px">' + A.money(saldo) + '</div></span>'
          : '') +
        '</div>' +
        '<div class="row">' + A.badgePagamento(job.pagamento) +
        '<span class="grow"></span><a class="btn sec sm" href="#/jobs/' + A.esc(job.id) + '">Ver job</a></div>' +
        '<div class="muted" style="margin-top:8px">🔒 Bloco só do admin — o portal do guy mostra apenas o repasse DELE.</div>' +
        '</div>';
    }

    root.innerHTML =
      '<div class="h-page"><button class="back-btn" onclick="location.hash=\'#/wo\'">' + A.icon('back', 20) + '</button>' +
      A.esc(wo.cliente || wo.id) + '<span class="grow"></span>' +
      (wo.pendencia ? '<span class="badge yellow">⚠ pendência</span> ' : '') +
      '<span class="badge warm">' + A.esc(wo.status || '') + '</span></div>' +

      '<div class="card"><h3>' + A.icon('workorders', 18) + ' Dados da WO <span class="grow"></span><span class="muted" style="font-weight:400">toca pra editar</span></h3>' +
      '<div class="fields" id="w-fields">' +
      A.fld('Cliente', 'cliente', wo.cliente) +
      A.fld('Sub', 'sub_id', A.subNome(wo.sub_id)) +
      A.fld('Data', 'data', A.fmtData(wo.data)) +
      A.fld('Hora', 'hora', wo.hora) +
      A.fld('Endereco', 'endereco', wo.endereco) +
      A.fld('Cidade/Estado', 'cidade_st', wo.cidade_st) +
      A.fld('Servico', 'servico', wo.servico) +
      A.fld('Status', 'status', wo.status) +
      A.fld('Valor do repasse', 'valor_repasse', wo.valor_repasse === null ? null : A.money(wo.valor_repasse)) +
      A.fld('Obs', 'obs', wo.obs) +
      '</div>' +
      '<hr class="sep"/>' +
      '<div class="row">' +
      (waUrl(wo)
        ? '<a class="btn green sm" id="w-wa" href="' + A.esc(waUrl(wo)) + '" target="_blank" rel="noopener">' +
        A.icon('phone', 16) + ' Enviar pro ' + A.esc(A.subNome(wo.sub_id)) + ' no WhatsApp</a>'
        : '<button class="btn green sm" disabled title="sub sem telefone cadastrado">' +
        A.icon('phone', 16) + ' WhatsApp — ' + A.esc(A.subNome(wo.sub_id)) + ' sem telefone</button>') +
      '<button class="btn sec sm" id="w-copy-link">' + A.icon('copy', 16) + ' Link do guy</button>' +
      '<button class="btn sm" id="w-copy-esq">' + A.icon('copy', 16) + ' Copiar esqueminha</button>' +
      (wo.job_id ? '<a class="btn sec sm" href="#/jobs/' + A.esc(wo.job_id) + '">Ver job</a>' : '') +
      '</div>' +
      '<hr class="sep"/>' +
      '<div class="row">' +
      (wo.status === 'Concluido'
        ? '<button class="btn sec block" id="w-finalizar" disabled>✔ Trabalho finalizado</button>'
        : '<button class="btn green block" id="w-finalizar">✔ Finalizar trabalho</button>') +
      '</div>' +
      '<div class="muted" style="margin-top:6px">Finaliza a WO (some da tela principal) e, se o valor do repasse e o valor total do job estiverem preenchidos, move o job pra <b>Done</b> automaticamente. Se faltar valor, o job fica em aberto com aviso ate voce completar.</div>' +
      (waUrl(wo) ? '' : '<div class="muted" style="margin-top:6px">Cadastra o telefone do sub (tabela subs) pra habilitar o envio direto no WhatsApp.</div>') +
      '</div>' +

      // ---- pendência / trabalho parcial ----
      '<div class="card"><h3>⚠️ Pendência / trabalho parcial</h3>' +
      '<div class="muted" style="margin-bottom:8px">Se preencher, o portal do sub mostra um aviso destacado e o botão vira "Concluir etapa de hoje" (em vez de fechar o job).</div>' +
      '<div><label>Pendência (vazio = sem pendência)</label>' +
      '<textarea id="w-pend" style="min-height:70px" placeholder="ex: Faltaram as escadas — 12 degraus + risers">' + A.esc(wo.pendencia || '') + '</textarea></div>' +
      '<div class="row" style="margin-top:8px;align-items:flex-end">' +
      '<div style="width:180px"><label>Data de retorno</label><input type="date" id="w-pend-data" value="' + A.esc(wo.data_retorno || '') + '" /></div>' +
      '<button class="btn sm" id="w-pend-save">Salvar pendência</button>' +
      '<button class="btn sec sm" id="w-pend-clear">Limpar</button>' +
      '</div></div>' +

      clienteHtml +

      '<div class="card"><h3>' + A.icon('check', 18) + ' Checklist <span class="grow"></span><span class="muted" id="w-prog" style="font-weight:400"></span></h3>' +
      '<div id="w-chk"></div>' +
      '<div class="row" style="margin-top:10px"><input id="w-chk-novo" class="grow" placeholder="Novo item do checklist…" />' +
      '<button class="btn sm sec" id="w-chk-add">+ Add</button></div>' +
      '</div>' +

      '<div class="card"><h3>' + A.icon('box', 18) + ' Materiais</h3><div id="w-mats"></div>' +
      '<div class="row" style="margin-top:10px"><input id="w-mat-novo" class="grow" placeholder="Novo material/lembrete…" />' +
      '<button class="btn sm sec" id="w-mat-add">+ Add</button></div>' +
      '</div>' +

      '<div class="card"><h3>' + A.icon('money', 18) + ' Pagamento ao sub</h3>' +
      '<div id="w-pags"></div>' +
      '<hr class="sep"/>' +
      '<div class="row" style="align-items:flex-end">' +
      '<div style="width:120px"><label>Valor $</label><input id="wp-valor" type="number" step="any" placeholder="0" /></div>' +
      '<div style="width:150px"><label>Data</label><input id="wp-data" type="date" value="' + A.hoje() + '" /></div>' +
      '<div class="grow" style="min-width:120px"><label>Obs</label><input id="wp-obs" placeholder="zelle, cash…" /></div>' +
      '<button class="btn sm green" id="wp-add">Registrar</button>' +
      '</div></div>' +

      '<button class="btn danger block" id="w-del">Excluir work order</button>';

    // ---------- inline edits ----------
    var subOpts = A.cache.subs.map(function (s) { return { value: s.id, label: s.nome }; });
    A.bindInlineEdits(document.getElementById('w-fields'), function (field) {
      var specs = {
        cliente: { value: wo.cliente },
        sub_id: { value: wo.sub_id, type: 'select', options: subOpts, allowEmpty: true },
        data: { value: wo.data, type: 'date' },
        hora: { value: wo.hora },
        endereco: { value: wo.endereco },
        cidade_st: { value: wo.cidade_st },
        servico: { value: wo.servico },
        status: { value: wo.status, type: 'select', options: A.WO_STATUSES },
        valor_repasse: { value: wo.valor_repasse, type: 'number' },
        obs: { value: wo.obs }
      };
      var spec = specs[field];
      if (!spec) return null;
      spec.onSave = function (v) {
        var patch = {}; patch[field] = v;
        return salvarWo(wo.id, patch).then(function () {
          wo[field] = v;
          // se a WO ja esta concluida e o valor do repasse acabou de ser preenchido,
          // ou a WO acabou de virar 'Concluido', reavalia o fechamento do job na hora.
          if ((field === 'valor_repasse' && String(wo.status || '') === 'Concluido') ||
              (field === 'status' && v === 'Concluido')) {
            A.avaliarJobDone(wo.job_id).then(function (res) {
              if (res.done) {
                A.toast('Job movido pra Done — pendência resolvida ✓', 'ok');
                notaReviewDone(wo.job_id, wo.cliente, wo.servico);
              }
              else if (res.pendencias && res.pendencias.length)
                A.toast('WO concluída — falta ' + res.pendencias.join(', ') + ' pra fechar o job', 'err');
            }).catch(function () { });
          }
          if (field === 'data') return A.esc(A.fmtData(v));
          if (field === 'valor_repasse') return A.esc(A.money(v));
          if (field === 'sub_id') return A.esc(A.subNome(v));
        });
      };
      return spec;
    });

    // ---------- checklist ----------
    function pintarChecklist() {
      var box = document.getElementById('w-chk');
      var done = checklist.filter(function (c) { return c.done; }).length;
      document.getElementById('w-prog').textContent = done + '/' + checklist.length;
      if (!checklist.length) {
        box.innerHTML = '<div class="muted">Checklist vazio — adiciona itens abaixo.</div>';
        return;
      }
      box.innerHTML = checklist.map(function (c, i) {
        return '<div class="chk' + (c.done ? ' done' : '') + '" data-i="' + i + '">' +
          '<span class="box">' + (c.done ? '✓' : '') + '</span>' +
          '<span class="tx grow">' + A.esc(c.item) + '</span>' +
          '<button class="icon-btn red" data-chk-del="' + i + '" style="min-width:32px;min-height:32px" onclick="event.stopPropagation()">✕</button>' +
          '</div>';
      }).join('');
      box.querySelectorAll('.chk').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          if (ev.target.closest('[data-chk-del]')) return;
          var c = checklist[Number(el.getAttribute('data-i'))];
          var novo = !c.done;
          A.sb.from('wo_checklist').update({ done: novo }).eq('id', c.id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            c.done = novo; pintarChecklist();
            A.toast(novo ? 'Item marcado' : 'Item desmarcado', 'ok');
          });
        });
      });
      box.querySelectorAll('[data-chk-del]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var i = Number(btn.getAttribute('data-chk-del'));
          var c = checklist[i];
          if (!A.confirmar('Excluir esse item do checklist?')) return;
          A.sb.from('wo_checklist').delete().eq('id', c.id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            checklist.splice(i, 1); pintarChecklist(); A.toast('Item excluido', 'ok');
          });
        });
      });
    }
    pintarChecklist();
    document.getElementById('w-chk-add').addEventListener('click', function () {
      var inp = document.getElementById('w-chk-novo');
      var txt = inp.value.trim();
      if (!txt) return;
      var pos = checklist.length ? Math.max.apply(null, checklist.map(function (c) { return c.pos || 0; })) + 1 : 0;
      A.sb.from('wo_checklist').insert({ wo_id: wo.id, item: txt, done: false, pos: pos }).select().single().then(function (r) {
        if (r.error) return A.toastErr(r.error);
        checklist.push(r.data); inp.value = ''; pintarChecklist(); A.toast('Item adicionado', 'ok');
      });
    });

    // ---------- materiais ----------
    function pintarMats() {
      var box = document.getElementById('w-mats');
      if (!materiais.length) { box.innerHTML = '<div class="muted">Sem materiais listados.</div>'; return; }
      box.innerHTML = materiais.map(function (m, i) {
        return '<div class="li-row"><div class="main"><div class="t1" style="font-weight:400">' + A.esc(m.descricao) + '</div></div>' +
          '<button class="icon-btn red" data-mat-del="' + i + '" style="min-width:32px;min-height:32px">✕</button></div>';
      }).join('');
      box.querySelectorAll('[data-mat-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = Number(btn.getAttribute('data-mat-del'));
          if (!A.confirmar('Excluir esse material?')) return;
          A.sb.from('wo_materials').delete().eq('id', materiais[i].id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            materiais.splice(i, 1); pintarMats(); A.toast('Material excluido', 'ok');
          });
        });
      });
    }
    pintarMats();
    document.getElementById('w-mat-add').addEventListener('click', function () {
      var inp = document.getElementById('w-mat-novo');
      var txt = inp.value.trim();
      if (!txt) return;
      var pos = materiais.length ? Math.max.apply(null, materiais.map(function (m) { return m.pos || 0; })) + 1 : 0;
      A.sb.from('wo_materials').insert({ wo_id: wo.id, descricao: txt, pos: pos }).select().single().then(function (r) {
        if (r.error) return A.toastErr(r.error);
        materiais.push(r.data); inp.value = ''; pintarMats(); A.toast('Material adicionado', 'ok');
      });
    });

    // ---------- pagamentos ----------
    function pintarPags() {
      var box = document.getElementById('w-pags');
      var total = pagamentos.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
      var falta = wo.valor_repasse ? Math.max(0, Number(wo.valor_repasse) - total) : null;
      var head = '<div class="row" style="margin-bottom:8px">' +
        '<span class="stat" style="box-shadow:none;background:var(--light);padding:8px 12px"><span class="lbl">Pago</span><div class="val green" style="font-size:16px">' + A.money(total) + '</div></span>' +
        (wo.valor_repasse ? '<span class="stat" style="box-shadow:none;background:var(--light);padding:8px 12px"><span class="lbl">Falta</span><div class="val ' + (falta > 0 ? 'red' : 'green') + '" style="font-size:16px">' + A.money(falta) + '</div></span>' : '') +
        '</div>';
      var lista = pagamentos.length ? pagamentos.map(function (p, i) {
        return '<div class="li-row"><div class="main"><div class="t1">' + A.money(p.valor) + '</div>' +
          '<div class="t2">' + A.esc(A.fmtData(p.data)) + (p.obs ? ' · ' + A.esc(p.obs) : '') + '</div></div>' +
          '<button class="icon-btn red" data-pg-del="' + i + '">✕</button></div>';
      }).join('') : '<div class="muted">Nenhum pagamento registrado.</div>';
      box.innerHTML = head + lista;
      box.querySelectorAll('[data-pg-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = Number(btn.getAttribute('data-pg-del'));
          if (!A.confirmar('Excluir esse pagamento de ' + A.money(pagamentos[i].valor) + '?')) return;
          A.sb.from('wo_payments').delete().eq('id', pagamentos[i].id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            pagamentos.splice(i, 1);
            sincronizarPago();
          });
        });
      });
    }
    function sincronizarPago() {
      var total = pagamentos.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
      salvarWo(wo.id, { pago_ao_sub: total }).then(function () {
        wo.pago_ao_sub = total;
        pintarPags();
        A.toast('Pagamento registrado — total ' + A.money(total), 'ok');
      }).catch(A.toastErr);
    }
    pintarPags();
    document.getElementById('wp-add').addEventListener('click', function () {
      var valor = A.num(document.getElementById('wp-valor').value);
      if (!valor) return A.toast('Coloca o valor do pagamento', 'err');
      var row = {
        wo_id: wo.id, valor: valor,
        data: document.getElementById('wp-data').value || A.hoje(),
        obs: document.getElementById('wp-obs').value.trim() || null
      };
      A.sb.from('wo_payments').insert(row).select().single().then(function (r) {
        if (r.error) return A.toastErr(r.error);
        pagamentos.push(r.data);
        document.getElementById('wp-valor').value = '';
        document.getElementById('wp-obs').value = '';
        sincronizarPago();
      });
    });

    // ---------- pendência (PATCH work_orders: pendencia + data_retorno) ----------
    document.getElementById('w-pend-save').addEventListener('click', function () {
      var txt = document.getElementById('w-pend').value.trim() || null;
      var dt = document.getElementById('w-pend-data').value || null;
      salvarWo(wo.id, { pendencia: txt, data_retorno: txt ? dt : null }).then(function () {
        wo.pendencia = txt; wo.data_retorno = txt ? dt : null;
        A.toast(txt ? 'Pendência salva — o sub vai ver o aviso no portal' : 'Pendência removida', 'ok');
      }).catch(A.toastErr);
    });
    document.getElementById('w-pend-clear').addEventListener('click', function () {
      document.getElementById('w-pend').value = '';
      document.getElementById('w-pend-data').value = '';
      salvarWo(wo.id, { pendencia: null, data_retorno: null }).then(function () {
        wo.pendencia = null; wo.data_retorno = null;
        A.toast('Pendência removida', 'ok');
      }).catch(A.toastErr);
    });

    // ---------- finalizar trabalho ----------
    var finBtn = document.getElementById('w-finalizar');
    if (finBtn && !finBtn.disabled) {
      finBtn.addEventListener('click', function () {
        if (!A.confirmar('Finalizar o trabalho da WO de "' + (wo.cliente || wo.id) + '"? A WO some da tela principal e o job vai pra Done se os valores estiverem completos.')) return;
        finBtn.disabled = true; finBtn.textContent = 'Finalizando…';
        finalizarWO(wo, function () {
          renderDetalhe(document.getElementById('page'), wo.id);
        });
      });
    }

    // ---------- copiar ----------
    document.getElementById('w-copy-link').addEventListener('click', function () {
      A.copiar(guyLink, 'Link do guy copiado!');
    });
    document.getElementById('w-copy-esq').addEventListener('click', function () {
      A.copiar(montarEsqueminha(wo), 'Esqueminha copiado!');
    });

    // ---------- excluir ----------
    document.getElementById('w-del').addEventListener('click', function () {
      if (!A.confirmarDuplo(
        'Excluir a work order de "' + (wo.cliente || wo.id) + '" (' + A.subNome(wo.sub_id) + ')? Apaga checklist, materiais e pagamentos.',
        'ULTIMA CONFIRMACAO: excluir a WO de vez?')) return;
      A.sb.from('work_orders').delete().eq('id', wo.id).then(function (r) {
        if (r.error) return A.toastErr(r.error);
        A.toast('WO excluida', 'ok');
        location.hash = '#/wo';
      });
    });
  }

  /* ======================================================= NOVA WO ======= */
  function renderNova(root, query) {
    return A.sb.from('jobs').select('id,cliente,endereco,cidade_st,tipo_servico,status').order('created_at', { ascending: false })
      .then(function (r) {
        if (r.error) throw r.error;
        desenharNova(root, r.data || [], query.job || '');
      });
  }

  function desenharNova(root, jobs, jobPre) {
    root.innerHTML =
      '<div class="h-page"><button class="back-btn" onclick="history.back()">' + A.icon('back', 20) + '</button> Nova Work Order</div>' +
      '<div class="card"><div style="display:grid;gap:12px">' +
      '<div><label>Job</label><select id="n-job">' +
      '<option value="">— escolher job —</option>' +
      jobs.map(function (j) {
        return '<option value="' + A.esc(j.id) + '"' + (j.id === jobPre ? ' selected' : '') + '>' +
          A.esc((j.cliente || j.id) + ' · ' + (j.tipo_servico || '') + ' (' + (j.status || '') + ')') + '</option>';
      }).join('') + '</select></div>' +
      '<div><label>Sub</label><select id="n-sub">' +
      A.cache.subs.map(function (s) { return '<option value="' + A.esc(s.id) + '">' + A.esc(s.nome) + ' — ' + A.esc(s.especialidade || '') + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="row"><div class="grow"><label>Data</label><input type="date" id="n-data" /></div>' +
      '<div class="grow"><label>Hora</label><input id="n-hora" placeholder="8:00 AM" /></div></div>' +
      '<div><label>Servico (descricao curta)</label><input id="n-servico" placeholder="ex: Vinyl install (~800 sqft)" /></div>' +
      '<div class="row"><div class="grow"><label>Valor do repasse $</label><input type="number" step="any" id="n-valor" placeholder="0" /></div>' +
      '<div class="grow"><label>Idioma do portal</label><select id="n-idioma"><option value="pt">Portugues</option><option value="en">English</option></select></div></div>' +
      '<div><label>Template de checklist</label><select id="n-tpl">' +
      '<option value="">— sem template —</option>' +
      Object.keys(TEMPLATES).map(function (k) { return '<option value="' + k + '">' + A.esc(TEMPLATES[k].label) + '</option>'; }).join('') +
      '</select></div>' +
      '<div><label>Checklist (1 item por linha)</label><textarea id="n-chk" style="min-height:140px" placeholder="Itens do checklist…"></textarea></div>' +
      '<div><label>Materiais (1 por linha)</label><textarea id="n-mats" placeholder="Materiais e lembretes…"></textarea></div>' +
      '<div><label>Obs</label><input id="n-obs" placeholder="observacoes pro sub" /></div>' +
      '<button class="btn block" id="n-criar">Criar work order</button>' +
      '</div></div>';

    document.getElementById('n-tpl').addEventListener('change', function (ev) {
      var t = TEMPLATES[ev.target.value];
      if (!t) return;
      document.getElementById('n-chk').value = t.checklist.join('\n');
      document.getElementById('n-mats').value = t.materiais.join('\n');
    });

    document.getElementById('n-criar').addEventListener('click', function () {
      var jobId = document.getElementById('n-job').value;
      if (!jobId) return A.toast('Escolhe o job', 'err');
      var job = jobs.filter(function (j) { return j.id === jobId; })[0];
      var subId = document.getElementById('n-sub').value;
      var token = A.token32();
      var id = 'wo-' + A.slug(job.cliente || jobId) + '-' + token.slice(0, 4);
      var wo = {
        id: id, job_id: jobId, sub_id: subId || null, token: token,
        cliente: job.cliente, endereco: job.endereco, cidade_st: job.cidade_st,
        data: document.getElementById('n-data').value || null,
        hora: document.getElementById('n-hora').value.trim() || null,
        servico: document.getElementById('n-servico').value.trim() || job.tipo_servico || null,
        idioma: document.getElementById('n-idioma').value,
        obs: document.getElementById('n-obs').value.trim() || null,
        status: 'A enviar',
        valor_repasse: A.num(document.getElementById('n-valor').value),
        pago_ao_sub: 0
      };
      var chkItens = document.getElementById('n-chk').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var matItens = document.getElementById('n-mats').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var btn = document.getElementById('n-criar');
      btn.disabled = true; btn.textContent = 'Criando…';

      A.sb.from('work_orders').insert(wo).then(function (r) {
        if (r.error) throw r.error;
        var ops = [];
        if (chkItens.length) ops.push(A.sb.from('wo_checklist').insert(chkItens.map(function (it, i) {
          return { wo_id: id, item: it, done: false, pos: i };
        })));
        if (matItens.length) ops.push(A.sb.from('wo_materials').insert(matItens.map(function (m, i) {
          return { wo_id: id, descricao: m, pos: i };
        })));
        return Promise.all(ops);
      }).then(function (rs) {
        (rs || []).forEach(function (r) { if (r && r.error) throw r.error; });
        A.toast('Work order criada!', 'ok');
        location.hash = '#/wo/' + id;
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Criar work order';
        A.toastErr(e);
      });
    });
  }
})();
