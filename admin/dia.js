/* ============================================================================
   IAC ADMIN v2 — dia.js  ("Meu Dia" ☀️)
   ESQUEMINHA PESSOAL do Italo (dono) — a HOME do app. Tudo editavel/acionavel
   no toque, salvando no Supabase na hora (A.sb autenticado = acesso total).
   Ordem:
     0) ✅ Checklist do dia  (auto: enviar proposal + follow-up | manuais: dia_tarefas)
     1) 🔍 Orcamentos a fazer (visitas) + guia por servico + acoes de status
     2) 📋 Subs na rua (WOs) + WhatsApp + marcar enviado/concluido
     3) 💰 A pagar (repasses) — Paguei / editar valor / remover  ← queixa do Italo
     4) 💵 A receber (entradas) — Recebi / editar valor
     5) 🔔 Follow-up (Estimate Enviado) — Fechou / Perdido / liguei hoje
   Toda acao: UPDATE/INSERT/DELETE via A.sb, try/catch(.then/.catch)+toast, e
   re-render (update otimista quando cabe). Confirmar antes de DELETE.
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  /* ================================================ status canonicos ======= */
  // Os dados reais usam "Visita Feita" (F maiusculo). Comparo case-insensitive
  // pra LER e gravo o valor canonico que o pipeline espera.
  var ST = {
    LEAD: 'Lead',
    VISITA_AGENDADA: 'Visita agendada',
    VISITA_FEITA: 'Visita Feita',
    ESTIMATE: 'Estimate Enviado',
    SCHEDULE: 'Schedule',
    PERDIDO: 'Perdidos'
  };
  function eqStatus(a, b) {
    return String(a || '').toLowerCase().trim() === String(b || '').toLowerCase().trim();
  }
  // orcamentos = Lead / Visita agendada / Visita Feita
  var ORC_STATUSES = ['lead', 'visita agendada', 'visita feita'];
  function ehOrcamento(job) {
    return ORC_STATUSES.indexOf(String(job.status || '').toLowerCase().trim()) >= 0;
  }
  function ehEstimate(job) { return eqStatus(job.status, ST.ESTIMATE); }

  /* ================================================ helpers de link ======== */
  function telDigitos(tel) {
    var dig = String(tel || '').replace(/\D/g, '');
    if (!dig) return null;
    if (dig.length === 10) dig = '1' + dig;
    return dig;
  }
  function btnLigar(tel, label) {
    var dig = telDigitos(tel);
    if (!dig) return '';
    return '<a class="btn green sm dia-act" href="tel:' + A.esc(dig) + '">' +
      A.icon('phone', 15) + ' ' + (label || 'Ligar') + '</a>';
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

  /* ================================================ datas ================== */
  function ehHojeOuPassado(iso) {
    var d = A.parseISO(iso); if (!d) return false;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return d <= h;
  }
  function ehHojeOuFuturo(iso) {
    var d = A.parseISO(iso); if (!d) return false;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return d >= h;
  }
  function ehHoje(iso) {
    var d = A.parseISO(iso); if (!d) return false;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return d.getTime() === h.getTime();
  }
  // dias desde uma data ISO (created_at) ate hoje
  function diasDesde(iso) {
    var d = A.parseISO(iso); if (!d) return null;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return Math.round((h - d) / 86400000);
  }

  /* ================================================ GUIA DE VISITA ========= */
  // checklist guia por tipo de servico (so leitura, na visita)
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
    if (/framing|carpentry|masonry|mason|trim|drywall/.test(t)) {
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

  /* ================================================ estado das secoes ====== */
  var aberto = { roteiro: true, chk: true, orc: true, rua: true, pagar: true, receber: true, followup: true };
  var verTodosEstimates = false;
  var conferido = false; // "conferi tudo" na secao A pagar — so visual

  // guardo os dados carregados pra re-render sem refetch pesado
  var DADOS = { jobs: [], wos: [], caixa: [], tarefas: [], agenda: [] };
  var roteiroAberto = true;
  var chkStopAberto = {}; // id da parada -> checklist expandido?

  A.pages.dia = {
    render: function (root) {
      return Promise.all([
        A.sb.from('jobs').select('id,cliente,telefone,endereco,cidade_st,tipo_servico,status,data_visita,created_at').order('created_at', { ascending: false }),
        A.sb.from('work_orders').select('id,job_id,sub_id,cliente,data,hora,status,endereco,cidade_st,servico,valor_repasse,pendencia,token,obs').order('data', { ascending: true, nullsFirst: false }),
        A.sb.from('caixa').select('id,data,tipo,cliente,job_id,descricao,valor,status,pago_para').order('valor', { ascending: false }),
        A.sb.from('dia_tarefas').select('*').order('ordem', { ascending: true }).order('created_at', { ascending: true }),
        A.sb.from('agenda').select('*').eq('data', A.hoje()).order('hora_inicio', { ascending: true, nullsFirst: false })
      ]).then(function (rs) {
        rs.forEach(function (r) { if (r.error) throw r.error; });
        DADOS.jobs = rs[0].data || [];
        DADOS.wos = rs[1].data || [];
        DADOS.caixa = rs[2].data || [];
        DADOS.tarefas = rs[3].data || [];
        DADOS.agenda = rs[4].data || [];
        desenhar(root);
      });
    }
  };

  // re-render leve (usa DADOS ja em memoria, sem refetch)
  function rerender() {
    var root = document.getElementById('page');
    if (root) desenhar(root);
  }

  /* ================================================ DESENHO ================ */
  function desenhar(root) {
    var jobs = DADOS.jobs, wos = DADOS.wos, caixa = DADOS.caixa, tarefas = DADOS.tarefas;
    var hojeISO = A.hoje();

    /* --- 1) ORCAMENTOS A FAZER --- */
    var orcamentos = jobs.filter(ehOrcamento).sort(function (a, b) {
      var da = a.data_visita, db = b.data_visita;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : da > db ? 1 : 0;
    });

    /* --- 2) SUBS NA RUA --- */
    var naRua = wos.filter(function (w) {
      var st = String(w.status || '');
      if (st !== 'A enviar' && st !== 'Em andamento') return false;
      return ehHojeOuFuturo(w.data);
    });

    /* --- 3) A PAGAR (repasses) --- */
    var aPagar = caixa.filter(function (c) {
      return c.tipo === 'repasse' && (c.status === 'pendente' || c.status === 'parcial');
    }).sort(function (a, b) { return Number(b.valor || 0) - Number(a.valor || 0); });
    var totalPagar = aPagar.reduce(function (s, c) { return s + Number(c.valor || 0); }, 0);

    /* --- 4) A RECEBER --- */
    var aReceber = caixa.filter(function (c) {
      return c.tipo === 'entrada' && (c.status === 'pendente' || c.status === 'parcial');
    }).sort(function (a, b) { return Number(b.valor || 0) - Number(a.valor || 0); });
    var totalReceber = aReceber.reduce(function (s, c) { return s + Number(c.valor || 0); }, 0);

    /* --- 5) FOLLOW-UP (estimates) --- */
    var estimates = jobs.filter(ehEstimate).sort(function (a, b) {
      var ca = a.created_at || '', cb = b.created_at || '';
      return ca < cb ? -1 : ca > cb ? 1 : 0; // mais antigos primeiro
    });

    /* --- 0) CHECKLIST DO DIA --- */
    // (a) enviar proposal: Visita Feita
    var autoProposal = jobs.filter(function (j) { return eqStatus(j.status, ST.VISITA_FEITA); });
    // (b) follow-up: Estimate Enviado ha 3+ dias, mais antigo primeiro, top 8
    var autoFollow = estimates.filter(function (j) {
      var d = diasDesde(j.created_at);
      return d !== null && d >= 3;
    }).slice(0, 8);
    // (c) manuais: dia_tarefas (todas done=false + as done=true de hoje)
    var manuais = tarefas.filter(function (t) {
      if (!t.done) return true;
      return t.data === hojeISO; // done=true so aparece se for de hoje
    });
    var chkPendentes = autoProposal.length + autoFollow.length +
      manuais.filter(function (t) { return !t.done; }).length;

    /* --- topo / saudacao --- */
    var h = new Date(), hora = h.getHours();
    var saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    var resumo = chkPendentes + ' na lista de hoje' +
      ' · ' + orcamentos.length + ' visita' + (orcamentos.length === 1 ? '' : 's') +
      ' · ' + naRua.length + ' sub' + (naRua.length === 1 ? '' : 's') + ' na rua' +
      ' · ' + A.money(totalPagar) + ' a pagar';

    var html =
      '<div class="dia-hero">' +
      '<div class="dia-hi">☀️ ' + A.esc(saud) + ', Italo</div>' +
      '<div class="dia-date">' + A.esc(A.fmtDataDia(hojeISO)) + '</div>' +
      '<div class="dia-sum">' + A.esc(resumo) + '</div>' +
      '</div>';

    // === ROTEIRO DE HOJE (timeline no topo) ===
    var paradas = montarParadas(jobs, wos, DADOS.agenda, hojeISO);
    html += secaoHead('roteiro', '🗓️ Roteiro de hoje', paradas.length, 'sua rota do dia');
    html += '<div class="dia-sec" data-sec="roteiro"' + (aberto.roteiro ? '' : ' style="display:none"') + '>';
    html += '<div class="dia-addtask">' +
      '<input id="rt-hora" placeholder="hora (ex 8:00 AM)" style="max-width:120px" />' +
      '<input id="rt-tit" placeholder="➕ nova parada (o que / quem)" />' +
      '<button class="btn sm" id="rt-add">Add</button>' +
      '</div>' +
      '<input id="rt-end" placeholder="endereco da parada (opcional)" style="width:100%;margin-bottom:8px" />';
    if (!paradas.length) {
      html += A.empty('Nenhuma parada hoje', 'Eventos da agenda, visitas e WOs de hoje aparecem aqui em ordem de horario.', 'schedule');
    } else {
      html += paradas.map(cardParada).join('');
    }
    html += '</div>';

    // === SECAO 0: CHECKLIST DO DIA ===
    html += secaoHead('chk', '✅ Checklist do dia', chkPendentes, 'o esqueminha de hoje');
    html += '<div class="dia-sec" data-sec="chk"' + (aberto.chk ? '' : ' style="display:none"') + '>';
    // input de tarefa manual
    html += '<div class="dia-addtask">' +
      '<input id="dt-novo" placeholder="➕ adicionar tarefa pra hoje…" />' +
      '<button class="btn sm" id="dt-add">Add</button>' +
      '</div>';
    if (!chkPendentes && !manuais.length) {
      html += A.empty('Tudo limpo por hoje', 'Tarefas suas + proposals a enviar + follow-ups caem aqui.', 'done');
    } else {
      // auto: enviar proposal
      autoProposal.forEach(function (j) { html += chkAutoProposal(j); });
      // auto: follow-up
      autoFollow.forEach(function (j) { html += chkAutoFollow(j); });
      // manuais
      manuais.forEach(function (t) { html += chkManual(t); });
    }
    html += '</div>';

    // === SECAO 1: ORCAMENTOS A FAZER ===
    html += secaoHead('orc', '🔍 Orcamentos a fazer', orcamentos.length, 'visitas pra fechar');
    html += '<div class="dia-sec" data-sec="orc"' + (aberto.orc ? '' : ' style="display:none"') + '>';
    if (!orcamentos.length) html += A.empty('Nenhum orcamento na fila', 'Leads e visitas agendadas aparecem aqui.', 'visita');
    else html += orcamentos.map(cardOrcamento).join('');
    html += '</div>';

    // === SECAO 2: SUBS NA RUA ===
    html += secaoHead('rua', '📋 Subs na rua', naRua.length, 'WOs de hoje pra frente');
    html += '<div class="dia-sec" data-sec="rua"' + (aberto.rua ? '' : ' style="display:none"') + '>';
    if (!naRua.length) html += A.empty('Ninguem na rua', 'WOs A enviar / Em andamento de hoje pra frente.', 'workorders');
    else html += naRua.map(cardRua).join('');
    html += '</div>';

    // === SECAO 3: A PAGAR ===
    html += secaoHead('pagar', '💰 A pagar (repasses)', aPagar.length, 'total: ' + A.money(totalPagar));
    html += '<div class="dia-sec" data-sec="pagar"' + (aberto.pagar ? '' : ' style="display:none"') + '>';
    if (!aPagar.length) {
      html += A.empty('Nada a pagar', 'Repasses pendentes/parciais aparecem aqui.', 'money');
    } else {
      html += '<div class="dia-tot red" id="dia-tot-pagar">Total a pagar: ' + A.money(totalPagar) + '</div>';
      html += '<div class="dia-note" style="color:var(--muted);font-weight:500">Ja pagou alguem que ainda aparece? Marca ✔ Paguei ou 🗑 remove.</div>';
      html += aPagar.map(linhaPagar).join('');
      html += '<button class="btn ' + (conferido ? 'green' : 'sec') + ' sm block dia-conferi" style="margin-top:8px">' +
        (conferido ? '✓ Conferido' : 'Conferi tudo, esta certo') + '</button>';
    }
    html += '</div>';

    // === SECAO 4: A RECEBER ===
    html += secaoHead('receber', '💵 A receber', aReceber.length, 'total: ' + A.money(totalReceber));
    html += '<div class="dia-sec" data-sec="receber"' + (aberto.receber ? '' : ' style="display:none"') + '>';
    if (!aReceber.length) {
      html += A.empty('Nada a receber pendente', 'Entradas pendentes/parciais aparecem aqui.', 'money');
    } else {
      html += '<div class="dia-tot green" id="dia-tot-receber">Total a receber: ' + A.money(totalReceber) + '</div>';
      html += aReceber.map(linhaReceber).join('');
    }
    html += '</div>';

    // === SECAO 5: FOLLOW-UP ===
    var estVis = verTodosEstimates ? estimates : estimates.slice(0, 12);
    html += secaoHead('followup', '🔔 Follow-up (estimates)', estimates.length, 'mais antigos primeiro');
    html += '<div class="dia-sec" data-sec="followup"' + (aberto.followup ? '' : ' style="display:none"') + '>';
    if (!estimates.length) {
      html += A.empty('Sem estimates parados', 'Jobs em "Estimate Enviado" aparecem aqui.', 'estimate');
    } else {
      html += '<div class="dia-note">Dinheiro na mesa — cada follow-up vira job.</div>';
      html += estVis.map(cardEstimate).join('');
      if (!verTodosEstimates && estimates.length > 12) {
        html += '<button class="btn sec sm block dia-vertodos" style="margin-top:8px">ver todos (' + estimates.length + ')</button>';
      }
    }
    html += '</div>';

    root.innerHTML = html;
    ligarEventos(root);
  }

  /* ================================================ EVENTOS ================ */
  function ligarEventos(root) {
    // secoes recolhiveis
    root.querySelectorAll('.grp-h[data-toggle]').forEach(function (hEl) {
      hEl.addEventListener('click', function (ev) {
        if (ev.target.closest('.dia-act, button:not(.grp-h), a, input')) return;
        var k = hEl.getAttribute('data-toggle');
        aberto[k] = !aberto[k];
        var sec = root.querySelector('.dia-sec[data-sec="' + k + '"]');
        if (sec) sec.style.display = aberto[k] ? '' : 'none';
        var arr = hEl.querySelector('.arr');
        if (arr) arr.textContent = aberto[k] ? '▲ recolher' : '▼ abrir';
      });
    });

    // guia de visita (toggle)
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

    // abrir job
    root.querySelectorAll('[data-abrir-job]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        location.hash = '#/jobs/' + btn.getAttribute('data-abrir-job');
      });
    });

    // WhatsApp (subs)
    root.querySelectorAll('[data-wa]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var w = DADOS.wos.filter(function (x) { return x.id === btn.getAttribute('data-wa'); })[0];
        var url = w && waUrlSub(w);
        if (url) window.open(url, '_blank');
        else A.toast('Sub sem telefone cadastrado', 'err');
      });
    });

    // ver todos estimates
    var vtBtn = root.querySelector('.dia-vertodos');
    if (vtBtn) vtBtn.addEventListener('click', function () { verTodosEstimates = true; rerender(); });

    // impede clique de acao borbulhar pro card
    root.querySelectorAll('.dia-act').forEach(function (a) {
      a.addEventListener('click', function (ev) { ev.stopPropagation(); });
    });

    /* ---------- ROTEIRO: toggle checklist da parada ---------- */
    root.querySelectorAll('[data-rt-chk]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-rt-chk');
        chkStopAberto[id] = !chkStopAberto[id];
        rerender();
      });
    });
    /* ---------- ROTEIRO: marcar parada feita (agenda.done) ---------- */
    root.querySelectorAll('[data-rt-done]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-rt-done');
        var a = DADOS.agenda.filter(function (x) { return x.id === id; })[0];
        if (!a) return;
        var novo = !a.done;
        btn.disabled = true;
        A.sb.from('agenda').update({ done: novo }).eq('id', id).then(function (r) {
          btn.disabled = false;
          if (r.error) return A.toastErr(r.error);
          a.done = novo;
          A.toast(novo ? 'Parada feita ✓' : 'Reaberta', 'ok');
          rerender();
        }).catch(function (e) { btn.disabled = false; A.toastErr(e); });
      });
    });
    /* ---------- ROTEIRO: adicionar parada manual ---------- */
    var rtAdd = root.querySelector('#rt-add');
    if (rtAdd) {
      rtAdd.addEventListener('click', function () {
        var tit = (root.querySelector('#rt-tit') || {}).value;
        tit = (tit || '').trim();
        if (!tit) return A.toast('Escreve o que e a parada', 'err');
        var hora = ((root.querySelector('#rt-hora') || {}).value || '').trim() || null;
        var end = ((root.querySelector('#rt-end') || {}).value || '').trim() || null;
        rtAdd.disabled = true;
        A.sb.from('agenda').insert({
          data: A.hoje(), hora_inicio: hora, titulo: tit, endereco: end,
          tipo: 'outro', origem: 'manual', checklist: [], done: false
        }).select().single().then(function (r) {
          rtAdd.disabled = false;
          if (r.error) return A.toastErr(r.error);
          DADOS.agenda.push(r.data);
          A.toast('Parada adicionada', 'ok');
          rerender();
        }).catch(function (e) { rtAdd.disabled = false; A.toastErr(e); });
      });
    }

    /* ---------- SECAO 0: tarefas manuais ---------- */
    var dtAdd = root.querySelector('#dt-add');
    var dtInp = root.querySelector('#dt-novo');
    if (dtAdd && dtInp) {
      function addTarefa() {
        var txt = dtInp.value.trim();
        if (!txt) return;
        dtAdd.disabled = true;
        A.sb.from('dia_tarefas').insert({ texto: txt, done: false, data: A.hoje() }).select().single().then(function (r) {
          dtAdd.disabled = false;
          if (r.error) return A.toastErr(r.error);
          DADOS.tarefas.push(r.data);
          dtInp.value = '';
          A.toast('Tarefa adicionada', 'ok');
          rerender();
        }).catch(function (e) { dtAdd.disabled = false; A.toastErr(e); });
      }
      dtAdd.addEventListener('click', addTarefa);
      dtInp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); addTarefa(); } });
    }
    // toggle done da tarefa manual
    root.querySelectorAll('[data-dt-toggle]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-dt-del]')) return;
        var id = el.getAttribute('data-dt-toggle');
        var t = DADOS.tarefas.filter(function (x) { return x.id === id; })[0];
        if (!t) return;
        var novo = !t.done;
        A.sb.from('dia_tarefas').update({ done: novo, data: novo ? A.hoje() : t.data }).eq('id', id).then(function (r) {
          if (r.error) return A.toastErr(r.error);
          t.done = novo; if (novo) t.data = A.hoje();
          A.toast(novo ? 'Feito ✓' : 'Reaberta', 'ok');
          rerender();
        });
      });
    });
    // deletar tarefa manual
    root.querySelectorAll('[data-dt-del]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-dt-del');
        var t = DADOS.tarefas.filter(function (x) { return x.id === id; })[0];
        if (!t) return;
        if (!A.confirmar('Excluir a tarefa "' + (t.texto || '') + '"?')) return;
        A.sb.from('dia_tarefas').delete().eq('id', id).then(function (r) {
          if (r.error) return A.toastErr(r.error);
          DADOS.tarefas = DADOS.tarefas.filter(function (x) { return x.id !== id; });
          A.toast('Tarefa removida', 'ok');
          rerender();
        });
      });
    });

    /* ---------- SECAO 0/5: "liguei/contatei hoje" (grava nota, nao muda status) ---------- */
    root.querySelectorAll('[data-nota-followup]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var jobId = btn.getAttribute('data-nota-followup');
        btn.disabled = true;
        A.sb.from('job_notes').insert({ job_id: jobId, data: A.hoje(), titulo: 'Follow-up', texto: 'Follow-up feito' }).then(function (r) {
          btn.disabled = false;
          if (r.error) return A.toastErr(r.error);
          A.toast('Anotado: contatei hoje ✓', 'ok');
          btn.textContent = '✓ contatei hoje';
          btn.classList.remove('sec'); btn.classList.add('green');
        }).catch(function (e) { btn.disabled = false; A.toastErr(e); });
      });
    });

    /* ---------- SECAO 1/5: mudar status do job na hora ---------- */
    root.querySelectorAll('[data-job-status]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var jobId = btn.getAttribute('data-job-status');
        var novo = btn.getAttribute('data-status-novo');
        var job = DADOS.jobs.filter(function (x) { return x.id === jobId; })[0];
        if (!job) return;
        btn.disabled = true;
        A.sb.from('jobs').update({ status: novo }).eq('id', jobId).then(function (r) {
          if (r.error) { btn.disabled = false; return A.toastErr(r.error); }
          job.status = novo;
          A.toast('Movido pra ' + novo, 'ok');
          rerender();
        }).catch(function (e) { btn.disabled = false; A.toastErr(e); });
      });
    });

    /* ---------- SECAO 2: WO status (enviado/concluido) ---------- */
    root.querySelectorAll('[data-wo-status]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var woId = btn.getAttribute('data-wo-status');
        var novo = btn.getAttribute('data-status-novo');
        var wo = DADOS.wos.filter(function (x) { return x.id === woId; })[0];
        if (!wo) return;
        btn.disabled = true;
        A.sb.from('work_orders').update({ status: novo }).eq('id', woId).then(function (r) {
          if (r.error) { btn.disabled = false; return A.toastErr(r.error); }
          wo.status = novo;
          A.toast('WO -> ' + novo, 'ok');
          rerender();
        }).catch(function (e) { btn.disabled = false; A.toastErr(e); });
      });
    });

    /* ---------- SECAO 3: A pagar (Paguei / editar / remover) ---------- */
    root.querySelectorAll('[data-pagar-pago]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-pagar-pago');
        var c = DADOS.caixa.filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        btn.disabled = true;
        A.sb.from('caixa').update({ status: 'pago', data: A.hoje() }).eq('id', id).then(function (r) {
          if (r.error) { btn.disabled = false; return A.toastErr(r.error); }
          c.status = 'pago'; c.data = A.hoje();
          A.toast('Pago pro ' + nomePagar(c), 'ok');
          rerender();
        }).catch(function (e) { btn.disabled = false; A.toastErr(e); });
      });
    });
    root.querySelectorAll('[data-pagar-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-pagar-edit');
        var c = DADOS.caixa.filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        var atual = c.valor === null || c.valor === undefined ? '' : String(c.valor);
        var v = window.prompt('Corrigir valor do repasse pro ' + nomePagar(c) + ':', atual);
        if (v === null) return;
        var novo = A.num(v);
        if (novo === null) return A.toast('Valor invalido', 'err');
        A.sb.from('caixa').update({ valor: novo }).eq('id', id).then(function (r) {
          if (r.error) return A.toastErr(r.error);
          c.valor = novo;
          A.toast('Valor atualizado', 'ok');
          rerender();
        });
      });
    });
    root.querySelectorAll('[data-pagar-del]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-pagar-del');
        var c = DADOS.caixa.filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        if (!A.confirmar('Remover esse repasse (' + A.money(c.valor) + ' pro ' + nomePagar(c) + ')? So faca isso se o lancamento nao existe de verdade.')) return;
        A.sb.from('caixa').delete().eq('id', id).then(function (r) {
          if (r.error) return A.toastErr(r.error);
          DADOS.caixa = DADOS.caixa.filter(function (x) { return x.id !== id; });
          A.toast('Repasse removido', 'ok');
          rerender();
        });
      });
    });
    var conferiBtn = root.querySelector('.dia-conferi');
    if (conferiBtn) conferiBtn.addEventListener('click', function () {
      conferido = !conferido;
      this.textContent = conferido ? '✓ Conferido' : 'Conferi tudo, esta certo';
      this.classList.toggle('green', conferido);
      this.classList.toggle('sec', !conferido);
      if (conferido) A.toast('Marcado como conferido', 'ok');
    });

    /* ---------- SECAO 4: A receber (Recebi / editar) ---------- */
    root.querySelectorAll('[data-receber-pago]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-receber-pago');
        var c = DADOS.caixa.filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        btn.disabled = true;
        A.sb.from('caixa').update({ status: 'pago', data: A.hoje() }).eq('id', id).then(function (r) {
          if (r.error) { btn.disabled = false; return A.toastErr(r.error); }
          c.status = 'pago'; c.data = A.hoje();
          A.toast('Recebido de ' + (c.cliente || 'cliente') + ' ✓', 'ok');
          rerender();
        }).catch(function (e) { btn.disabled = false; A.toastErr(e); });
      });
    });
    root.querySelectorAll('[data-receber-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-receber-edit');
        var c = DADOS.caixa.filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        var atual = c.valor === null || c.valor === undefined ? '' : String(c.valor);
        var v = window.prompt('Corrigir valor a receber de ' + (c.cliente || 'cliente') + ':', atual);
        if (v === null) return;
        var novo = A.num(v);
        if (novo === null) return A.toast('Valor invalido', 'err');
        A.sb.from('caixa').update({ valor: novo }).eq('id', id).then(function (r) {
          if (r.error) return A.toastErr(r.error);
          c.valor = novo;
          A.toast('Valor atualizado', 'ok');
          rerender();
        });
      });
    });
  }

  /* ================================================ BLOCOS DE UI =========== */
  function secaoHead(key, titulo, count, sub) {
    return '<div class="grp-h" data-toggle="' + key + '">' +
      A.esc(titulo) + ' <span class="count">' + count + '</span>' +
      (sub ? '<span class="dia-sec-sub">' + A.esc(sub) + '</span>' : '') +
      '<span class="arr">' + (aberto[key] ? '▲ recolher' : '▼ abrir') + '</span></div>';
  }

  /* ---- SECAO 0: itens do checklist ---- */
  function chkAutoProposal(j) {
    return '<div class="dia-chk auto">' +
      '<span class="dia-chk-box auto" title="some sozinho quando o status virar Estimate Enviado">📄</span>' +
      '<div class="dia-chk-main">' +
      '<div class="dia-chk-tx">Enviar proposal pro <b>' + A.esc(j.cliente || '(sem nome)') + '</b>' +
      (j.tipo_servico ? ' <span class="muted">(' + A.esc(j.tipo_servico) + ')</span>' : '') + '</div>' +
      '<div class="dia-chk-acts">' +
      '<button class="btn sec sm dia-act" data-abrir-job="' + A.esc(j.id) + '">' + A.icon('open', 14) + ' abrir job</button>' +
      '</div></div></div>';
  }
  function chkAutoFollow(j) {
    var dias = diasDesde(j.created_at);
    return '<div class="dia-chk auto">' +
      '<span class="dia-chk-box auto">📞</span>' +
      '<div class="dia-chk-main">' +
      '<div class="dia-chk-tx">Follow-up <b>' + A.esc(j.cliente || '(sem nome)') + '</b>' +
      (j.cidade_st ? ' <span class="muted">(' + A.esc(j.cidade_st) + ')</span>' : '') +
      ' — estimate ha <b>' + dias + '</b> dia' + (dias === 1 ? '' : 's') + '</div>' +
      '<div class="dia-chk-acts">' +
      btnLigar(j.telefone) +
      '<button class="btn sec sm dia-act" data-abrir-job="' + A.esc(j.id) + '">' + A.icon('open', 14) + ' abrir job</button>' +
      '<button class="btn sec sm dia-act" data-nota-followup="' + A.esc(j.id) + '">✔ contatei hoje</button>' +
      '</div></div></div>';
  }
  function chkManual(t) {
    return '<div class="dia-chk manual' + (t.done ? ' done' : '') + '">' +
      '<span class="dia-chk-box' + (t.done ? ' on' : '') + '" data-dt-toggle="' + A.esc(t.id) + '">' + (t.done ? '✓' : '') + '</span>' +
      '<div class="dia-chk-main" data-dt-toggle="' + A.esc(t.id) + '" style="cursor:pointer">' +
      '<div class="dia-chk-tx">' + A.esc(t.texto || '') + '</div>' +
      '</div>' +
      '<button class="icon-btn red dia-act" data-dt-del="' + A.esc(t.id) + '" title="excluir">✕</button>' +
      '</div>';
  }

  /* ================================================ ROTEIRO DO DIA ========= */
  // hora ("8:00 AM" | "17:00" | "8am") -> minutos desde 0h (pra ordenar). null = fim.
  function horaMin(h) {
    if (!h) return 100000;
    var s = String(h).trim().toLowerCase();
    var m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!m) return 100000;
    var hh = parseInt(m[1], 10), mm = m[2] ? parseInt(m[2], 10) : 0;
    if (m[3] === 'pm' && hh < 12) hh += 12;
    if (m[3] === 'am' && hh === 12) hh = 0;
    return hh * 60 + mm;
  }
  function horaLabel(h) {
    if (!h) return '—';
    var s = String(h).trim();
    if (/am|pm/i.test(s)) return s.toUpperCase().replace(/\s+/g, ' ');
    var m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return s;
    var hh = parseInt(m[1], 10), mm = m[2];
    var ap = hh >= 12 ? 'PM' : 'AM';
    var h12 = hh % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + mm + ' ' + ap;
  }
  function normEnd(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18);
  }
  // junta agenda + WOs de hoje + visitas de hoje numa timeline unica
  function montarParadas(jobs, wos, agenda, hojeISO) {
    var stops = [];
    var vistos = {}; // normEnd -> true (dedup entre fontes)

    (agenda || []).forEach(function (a) {
      var chk = Array.isArray(a.checklist) ? a.checklist : [];
      var oquefazer = a.notas || '';
      if (!chk.length && a.tipo === 'visita') chk = guiaVisita(a.titulo);
      stops.push({
        id: 'a-' + a.id, source: 'agenda', agendaId: a.id,
        hora: a.hora_inicio, horaFim: a.hora_fim, titulo: a.titulo || '(sem titulo)',
        endereco: a.endereco, cidade: '', tel: a.contato_tel, tipo: a.tipo || 'outro',
        oquefazer: oquefazer, checklist: chk, done: !!a.done, jobId: a.job_id
      });
      if (a.endereco) vistos[normEnd(a.endereco)] = true;
    });

    (wos || []).forEach(function (w) {
      if (!ehHoje(w.data)) return;
      var st = String(w.status || '');
      if (st !== 'A enviar' && st !== 'Em andamento' && st !== 'Enviado ao sub') return;
      if (w.endereco && vistos[normEnd(w.endereco)]) return; // ja coberto pela agenda
      stops.push({
        id: 'w-' + w.id, source: 'wo', woId: w.id,
        hora: w.hora, horaFim: null,
        titulo: (w.cliente || '—') + ' · ' + A.subNome(w.sub_id),
        endereco: w.endereco, cidade: w.cidade_st, tel: null, tipo: 'servico',
        oquefazer: w.servico || '', checklist: [], done: st === 'Concluido',
        token: w.token, jobId: w.job_id
      });
      if (w.endereco) vistos[normEnd(w.endereco)] = true;
    });

    (jobs || []).forEach(function (j) {
      if (!ehHoje(j.data_visita)) return;
      if (!ehOrcamento(j)) return;
      if (j.endereco && vistos[normEnd(j.endereco)]) return;
      stops.push({
        id: 'j-' + j.id, source: 'visita', jobId: j.id,
        hora: null, horaFim: null,
        titulo: (j.cliente || '(sem nome)') + ' · visita',
        endereco: j.endereco, cidade: j.cidade_st, tel: j.telefone, tipo: 'visita',
        oquefazer: j.tipo_servico || 'orcamento', checklist: guiaVisita(j.tipo_servico), done: false
      });
    });

    stops.sort(function (a, b) { return horaMin(a.hora) - horaMin(b.hora); });
    return stops;
  }

  function cardParada(p) {
    var mapsUrl = p.endereco
      ? 'https://maps.google.com/?q=' + encodeURIComponent([p.endereco, p.cidade].filter(Boolean).join(', '))
      : null;
    var tipoBadge = { visita: '<span class="badge warm">visita</span>',
      servico: '<span class="badge orange">servico</span>',
      pessoal: '<span class="badge">pessoal</span>',
      outro: '<span class="badge">agenda</span>' }[p.tipo] || '';
    var chkAberto = !!chkStopAberto[p.id];
    var html = '<div class="card dia-card' + (p.done ? ' done' : '') + '">' +
      '<div class="dia-card-top">' +
      '<div class="dia-nm"><span class="dia-rt-hora">' + A.esc(horaLabel(p.hora)) +
      (p.horaFim ? '<span class="dia-rt-fim"> – ' + A.esc(horaLabel(p.horaFim)) + '</span>' : '') + '</span></div>' +
      tipoBadge +
      '</div>' +
      '<div class="dia-sv" style="font-weight:600">' + (p.done ? '✅ ' : '') + A.esc(p.titulo) + '</div>' +
      (p.oquefazer ? '<div class="dia-meta muted">' + A.esc(p.oquefazer) + '</div>' : '') +
      (p.endereco ? '<div class="dia-addr muted">' + A.icon('map', 13) + ' ' +
        A.esc([p.endereco, p.cidade].filter(Boolean).join(', ')) + '</div>' : '');
    // acoes
    html += '<div class="dia-actions">';
    if (mapsUrl) html += '<a class="btn sec sm dia-act" href="' + A.esc(mapsUrl) + '" target="_blank" rel="noopener">' + A.icon('map', 15) + ' Mapa</a>';
    if (p.tel) html += btnLigar(p.tel);
    if (p.woId) html += '<a class="btn sec sm dia-act" href="#/wo/' + A.esc(p.woId) + '">Abrir WO</a>';
    if (p.jobId && p.source !== 'wo') html += '<button class="btn sec sm dia-act" data-abrir-job="' + A.esc(p.jobId) + '">' + A.icon('open', 15) + ' Job</button>';
    if (p.checklist && p.checklist.length)
      html += '<button class="btn sec sm dia-act" data-rt-chk="' + A.esc(p.id) + '">' + (chkAberto ? '🔽 esconder checklist' : '✅ checklist') + '</button>';
    if (p.source === 'agenda')
      html += '<button class="btn ' + (p.done ? 'green' : 'sec') + ' sm dia-act" data-rt-done="' + A.esc(p.agendaId) + '">' + (p.done ? '✓ feita' : '✔ parada feita') + '</button>';
    html += '</div>';
    // checklist expansivel
    if (p.checklist && p.checklist.length) {
      html += '<div class="dia-guia dia-rt-chk"' + (chkAberto ? '' : ' style="display:none"') + '>' +
        '<ul class="dia-guia-list">' +
        p.checklist.map(function (item) {
          var t = (item && typeof item === 'object') ? (item.item || item.texto || '') : item;
          return '<li>' + A.esc(t) + '</li>';
        }).join('') +
        '</ul></div>';
    }
    html += '</div>';
    return html;
  }

  /* ---- SECAO 1: card de orcamento ---- */
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
      '<button class="btn sec sm dia-act" data-abrir-job="' + A.esc(j.id) + '">' + A.icon('open', 15) + ' Abrir job</button>' +
      '</div>' +
      // acoes de status (mudam jobs.status na hora)
      '<div class="dia-actions dia-statusrow">' +
      '<button class="btn green sm dia-act" data-job-status="' + A.esc(j.id) + '" data-status-novo="' + ST.VISITA_FEITA + '">✔ Visita feita</button>' +
      '<button class="btn green sm dia-act" data-job-status="' + A.esc(j.id) + '" data-status-novo="' + ST.ESTIMATE + '">📄 Estimate enviado</button>' +
      '<button class="btn danger sm dia-act" data-job-status="' + A.esc(j.id) + '" data-status-novo="' + ST.PERDIDO + '">✖ Perdido</button>' +
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

  /* ---- SECAO 2: card sub na rua ---- */
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
        ? '<button class="btn green sm dia-act" data-wa="' + A.esc(w.id) + '">' + A.icon('phone', 15) + ' WhatsApp</button>'
        : '') +
      '<a class="btn sec sm dia-act" href="#/wo/' + A.esc(w.id) + '">Abrir WO</a>' +
      '</div>' +
      '<div class="dia-actions dia-statusrow">' +
      '<button class="btn sec sm dia-act" data-wo-status="' + A.esc(w.id) + '" data-status-novo="Enviado ao sub">✔ Enviado</button>' +
      '<button class="btn green sm dia-act" data-wo-status="' + A.esc(w.id) + '" data-status-novo="Concluido">✔ Concluido</button>' +
      '</div>' +
      '</div>';
  }

  /* ---- SECAO 3: linha a pagar ---- */
  function subDePagar(c) {
    var alvo = String(c.pago_para || '').toLowerCase().trim();
    if (!alvo) return null;
    var subs = A.cache.subs || [];
    for (var i = 0; i < subs.length; i++) {
      if (String(subs[i].nome || '').toLowerCase().trim() === alvo) return subs[i];
      if (String(subs[i].id || '').toLowerCase().trim() === alvo) return subs[i];
    }
    return null;
  }
  function nomePagar(c) {
    var s = subDePagar(c);
    return c.pago_para || (s && s.nome) || 'sub';
  }
  function descCurta(c) {
    var d = String(c.descricao || '').replace(/^\[(\w+)\]\s*/, '').trim();
    if (d.length > 60) d = d.slice(0, 57) + '…';
    return d;
  }
  function linhaPagar(c) {
    var sub = subDePagar(c);
    var semW9 = sub && sub.w9 === false;
    var quem = c.pago_para || (sub && sub.nome) || '—';
    return '<div class="dia-fin">' +
      '<div class="dia-fin-main">' +
      '<div class="t1">' + A.esc(quem) +
      (semW9 ? ' <span class="badge red">⚠ SEM W9</span>' : '') + '</div>' +
      '<div class="t2">' + A.esc(c.cliente || descCurta(c) || '—') +
      (c.status === 'parcial' ? ' · <b style="color:var(--orange)">parcial</b>' : ' · pendente') +
      '</div>' +
      '<div class="dia-fin-acts">' +
      '<button class="btn green sm dia-act" data-pagar-pago="' + A.esc(c.id) + '">✔ Paguei</button>' +
      '<button class="btn sec sm dia-act" data-pagar-edit="' + A.esc(c.id) + '">✎ valor</button>' +
      '<button class="btn danger sm dia-act" data-pagar-del="' + A.esc(c.id) + '">🗑 remover</button>' +
      '</div>' +
      '</div>' +
      '<b class="dia-fin-vl red">' + A.money(c.valor) + '</b>' +
      '</div>';
  }

  /* ---- SECAO 4: linha a receber ---- */
  function linhaReceber(c) {
    return '<div class="dia-fin">' +
      '<div class="dia-fin-main">' +
      '<div class="t1">' + A.esc(c.cliente || descCurta(c) || '—') + '</div>' +
      '<div class="t2">' + A.esc(descCurta(c) || 'entrada') +
      (c.status === 'parcial' ? ' · <b style="color:var(--orange)">parcial</b>' : ' · pendente') +
      (c.data ? ' · ' + A.esc(A.fmtData(c.data)) : '') +
      '</div>' +
      '<div class="dia-fin-acts">' +
      '<button class="btn green sm dia-act" data-receber-pago="' + A.esc(c.id) + '">✔ Recebi</button>' +
      '<button class="btn sec sm dia-act" data-receber-edit="' + A.esc(c.id) + '">✎ valor</button>' +
      '</div>' +
      '</div>' +
      '<b class="dia-fin-vl green">' + A.money(c.valor) + '</b>' +
      '</div>';
  }

  /* ---- SECAO 5: card follow-up (estimate) ---- */
  function cardEstimate(j) {
    var dias = diasDesde(j.created_at);
    return '<div class="card dia-card dia-card-sm">' +
      '<div class="dia-card-top">' +
      '<div class="dia-nm" style="font-size:14.5px">' + A.esc(j.cliente || '(sem nome)') + '</div>' +
      (dias !== null ? '<span class="muted" style="font-size:12px;white-space:nowrap">ha ' + dias + 'd</span>' : '') +
      '</div>' +
      '<div class="dia-sv" style="margin:2px 0">' + A.icon(window.IAC_ICONS.forService(j.tipo_servico), 14) + ' ' +
      A.esc(j.tipo_servico || 'servico?') + (j.cidade_st ? ' · ' + A.esc(j.cidade_st) : '') +
      (j.created_at ? ' · enviado ' + A.esc(A.fmtData(j.created_at)) : '') + '</div>' +
      '<div class="dia-actions">' +
      btnLigar(j.telefone) +
      '<button class="btn sec sm dia-act" data-abrir-job="' + A.esc(j.id) + '">' + A.icon('open', 15) + ' Abrir job</button>' +
      '<button class="btn green sm dia-act" data-job-status="' + A.esc(j.id) + '" data-status-novo="' + ST.SCHEDULE + '">✔ Fechou</button>' +
      '<button class="btn danger sm dia-act" data-job-status="' + A.esc(j.id) + '" data-status-novo="' + ST.PERDIDO + '">✖ Perdido</button>' +
      '<button class="btn sec sm dia-act" data-nota-followup="' + A.esc(j.id) + '">📞 liguei hoje</button>' +
      '</div>' +
      '</div>';
  }
})();
