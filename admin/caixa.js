/* ============================================================================
   IAC ADMIN v2 — caixa.js (v3: 3 visoes)
   Sub-abas: [💰 Real] [⏳ Em Hold] [🏦 Contas Fixas]
   - Real: so dinheiro de jobs FECHADOS (Schedule/Prep/In progress/Blocker/
     review/Done) + lancamentos manuais sem job. Lancamentos de conta fixa
     (categoria conta_fixa) NAO entram aqui. Graficos QBO continuam aqui.
   - Em Hold: jobs em Lead/Visita/Estimate Enviado — quanto $ esta parado.
   - Contas Fixas: tabelas contas_fixas / contas_pagamentos / cartao_credito.
   Categoria: a tabela caixa tem coluna `categoria` (nova) + convencao legada
   "[categoria] descricao" no campo descricao (parse/strip na exibicao) +
   auto-categorizacao por palavra-chave pros lancamentos antigos.
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  var fF = { tipo: '', cat: '', busca: '' };
  var cxTab = 'real';

  // jobs "fechados" = dinheiro real; resto e hold/perdido
  var FECHADOS = ['Schedule', 'Prep', 'In progress', 'Blocker', 'review', 'Done'];
  var HOLD = ['Lead', 'Visita agendada', 'Visita feita', 'Estimate Enviado'];
  var CARTAO_DIVIDA_INICIAL = 18000; // referencia pra barra de progresso da divida

  function catDe(row) {
    if (String(row.categoria || '') === 'conta_fixa') return 'conta_fixa';
    var m = String(row.descricao || '').match(/^\[(\w+)\]\s*/);
    if (m) return m[1].toLowerCase();
    if (row.tipo === 'repasse') return 'repasses';
    var t = ((row.descricao || '') + ' ' + (row.pago_para || '')).toLowerCase();
    if (/google|ads|angi|thumbtack|marketing|yelp/.test(t)) return 'ads';
    if (/material|home depot|lumber|floor ?decor|supply/.test(t)) return 'material';
    if (/gas|combust|pedagio|toll|parking|veiculo|carro|van|mecanic/.test(t)) return 'veiculo';
    if (/seguro|insurance/.test(t)) return 'seguro';
    if (/office|escritorio|quickbooks|software|telefone|internet/.test(t)) return 'office';
    if (row.tipo === 'entrada') return '';
    return 'outro';
  }
  function descLimpa(row) {
    return String(row.descricao || '').replace(/^\[(\w+)\]\s*/, '');
  }
  function novoIdCaixa() {
    return 'cx-' + Date.now().toString(36) + '-' + A.token32().slice(0, 4);
  }
  function mesAtual() { return A.hoje().slice(0, 7); }
  function nomeMes(ym) {
    var mm = Number(String(ym || '').slice(5, 7));
    return (['', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho',
      'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mm] || ym) + ' ' + String(ym || '').slice(0, 4);
  }
  function mensalEsperado(c) {
    var v = Number(c.valor || 0);
    return c.frequencia === 'semanal' ? Math.round(v * 4.33) : v;
  }
  function diasDesde(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  }

  /* ---------- helpers do design system vivo (.ds-*) ---------- */
  function dsBar(pct, cls) {
    var p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    return '<div class="ds-bar' + (cls ? ' ' + cls : '') + '"><i data-dsw="' + p + '"></i></div>';
  }
  function animarBarras(scope) {
    if (!scope) return;
    var els = scope.querySelectorAll('[data-dsw]');
    if (!els.length) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.forEach(function (i) { i.style.width = i.getAttribute('data-dsw') + '%'; });
      });
    });
  }
  function cuAll(scope) {
    if (!scope) return;
    scope.querySelectorAll('[data-cu]').forEach(function (el) {
      var v = Number(el.getAttribute('data-cu') || 0);
      if (v < 0) A.countUp(el, Math.abs(v), '−$');
      else A.countUp(el, v, '$');
    });
  }

  A.pages.caixa = {
    render: function (root) {
      var ano = A.hoje().slice(0, 4);
      return Promise.all([
        A.sb.from('caixa').select('*').order('data', { ascending: false, nullsFirst: false }),
        A.sb.from('jobs').select('id,cliente,status,valor_total,created_at,tipo_servico').order('created_at', { ascending: false }),
        A.sb.from('qbo_snapshot').select('*').order('id', { ascending: false }).limit(1),
        A.sb.from('contas_fixas').select('*').eq('ativo', true).order('ordem'),
        A.sb.from('contas_pagamentos').select('*').gte('mes', ano + '-01').order('data', { ascending: false }),
        A.sb.from('cartao_credito').select('*').limit(1)
      ]).then(function (rs) {
        rs.forEach(function (r) { if (r.error) throw r.error; });
        desenhar(root, rs[0].data || [], rs[1].data || [], (rs[2].data && rs[2].data[0]) || null,
          rs[3].data || [], rs[4].data || [], (rs[5].data && rs[5].data[0]) || null);
      });
    }
  };

  function desenhar(root, rows, jobs, qbo, contas, pagamentos, cartao) {
    root.innerHTML =
      '<div class="h-page">' + A.icon('caixa', 22) + ' Caixa <span class="grow"></span>' +
      '<button class="btn sm" id="cx-novo-btn">+ Lancamento</button></div>' +
      '<div class="cx3-tabs">' +
      '<button class="cx3-tab" data-cx3tab="real">💰 Real</button>' +
      '<button class="cx3-tab" data-cx3tab="hold">⏳ Em Hold</button>' +
      '<button class="cx3-tab" data-cx3tab="fixas">🏦 Contas Fixas</button>' +
      '</div>' +
      '<div id="cx3-body"></div>';

    var jobById = {};
    jobs.forEach(function (j) { jobById[j.id] = j; });

    var abrirFormRef = null; // setado pelo renderReal

    function jobFechado(id) {
      var j = jobById[id];
      if (!j) return true; // job arquivado/desconhecido: dinheiro historico = real
      return FECHADOS.indexOf(String(j.status || '')) >= 0;
    }
    // linha do caixa que pertence a visao Real
    function ehRealRow(r) {
      if (catDe(r) === 'conta_fixa') return false;
      if (r.job_id && !jobFechado(r.job_id)) return false;
      return true;
    }

    function stat(lbl, val, cls, sub, cu) {
      return '<div class="stat"><div class="lbl">' + A.esc(lbl) + '</div><div class="val ' + (cls || '') + '"' +
        (cu !== undefined && cu !== null ? ' data-cu="' + Number(cu) + '"' : '') + '>' + A.esc(val) + '</div>' +
        (sub ? '<div class="sub">' + A.esc(sub) + '</div>' : '') + '</div>';
    }

    /* ==================================================================== */
    /* TABS                                                                 */
    /* ==================================================================== */
    function renderTab() {
      root.querySelectorAll('[data-cx3tab]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-cx3tab') === cxTab);
      });
      var body = document.getElementById('cx3-body');
      body.classList.remove('page-enter');
      void body.offsetWidth; // reflow pra retrigar a animacao
      body.innerHTML = '';
      if (cxTab === 'hold') renderHold(body);
      else if (cxTab === 'fixas') renderFixas(body);
      else renderReal(body);
      body.classList.add('page-enter');
    }
    root.querySelectorAll('[data-cx3tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        cxTab = b.getAttribute('data-cx3tab');
        renderTab();
      });
    });
    document.getElementById('cx-novo-btn').addEventListener('click', function () {
      if (cxTab !== 'real') { cxTab = 'real'; renderTab(); }
      if (abrirFormRef) abrirFormRef(null);
    });

    /* ==================================================================== */
    /* 💰 REAL — jobs fechados + lancamentos manuais (sem contas fixas)     */
    /* ==================================================================== */
    function renderReal(body) {
      body.innerHTML =
        '<div class="stat-grid" id="cx-stats"></div>' +
        '<div class="card ds-card" id="cx-be" style="display:none">' +
        '<div class="ds-section-h" style="margin-bottom:8px">🎯 Break-even do mes <span class="ds-n" id="cx-be-pct"></span></div>' +
        '<div class="ds-bar" id="cx-be-bar"><i></i></div>' +
        '<div class="muted" id="cx-be-txt" style="font-size:11px;margin-top:6px"></div>' +
        '</div>' +
        '<div class="card" id="cx-form-card" style="display:none"></div>' +
        '<div class="filters">' +
        '<input type="search" id="cxf-busca" placeholder="Buscar cliente, descricao…" value="' + A.esc(fF.busca) + '" />' +
        '<select id="cxf-tipo"><option value="">Todos os tipos</option>' +
        A.CAIXA_TIPOS.map(function (t) { return '<option' + (fF.tipo === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
        '<select id="cxf-cat"><option value="">Todas categorias</option>' +
        A.CAIXA_CATS.map(function (c) { return '<option' + (fF.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' +
        '</div>' +
        '<div class="card" id="cx-lista"></div>' +
        '<div class="card" id="cx-qbo"></div>';

      var realRows = rows.filter(ehRealRow);

      function aplicar() {
        realRows = rows.filter(ehRealRow);
        var b = fF.busca.toLowerCase();
        var vis = realRows.filter(function (r) {
          if (fF.tipo && r.tipo !== fF.tipo) return false;
          if (fF.cat && catDe(r) !== fF.cat) return false;
          if (b && [r.cliente, r.descricao, r.pago_para].join(' ').toLowerCase().indexOf(b) < 0) return false;
          return true;
        });

        var receb = 0, aReceber = 0, repPago = 0, repDevido = 0, desp = 0;
        vis.forEach(function (r) {
          var v = Number(r.valor || 0);
          if (r.tipo === 'entrada') {
            if (r.status === 'pendente') aReceber += v; else receb += v;
          } else if (r.tipo === 'repasse') {
            if (r.status === 'pendente' || r.status === 'parcial') repDevido += v; else repPago += v;
          } else {
            if (r.status !== 'pendente') desp += v;
          }
        });
        var saldo = receb - repPago - desp;
        document.getElementById('cx-stats').innerHTML =
          stat('Recebido', A.money(receb), 'green', 'so jobs fechados', receb) +
          stat('A receber', A.money(aReceber), 'orange', 'pendente de fechados', aReceber) +
          stat('A pagar subs', A.money(repDevido), 'red', 'repasses pagos: ' + A.money(repPago), repDevido) +
          stat('Saldo real', A.money(saldo), saldo >= 0 ? 'green' : 'red', 'despesas pagas: ' + A.money(desp), saldo);
        cuAll(document.getElementById('cx-stats'));
        atualizarBreakEven();

        var box = document.getElementById('cx-lista');
        if (!vis.length) {
          box.innerHTML = A.empty('Nenhum lancamento', 'Ajusta os filtros ou adiciona um novo.', 'caixa');
          return;
        }
        box.innerHTML = vis.map(function (r, i) {
          var cat = catDe(r);
          var cor = r.tipo === 'entrada' ? 'var(--green)' : 'var(--red)';
          var sinal = r.tipo === 'entrada' ? '+' : '−';
          return '<div class="li-row">' +
            '<div class="main"><div class="t1">' + A.esc(descLimpa(r) || r.tipo) +
            (r.cliente ? ' <span class="muted">· ' + A.esc(r.cliente) + '</span>' : '') + '</div>' +
            '<div class="t2">' + A.esc(A.fmtData(r.data)) + ' · ' + A.esc(r.tipo) +
            (cat ? ' · <span class="badge" style="font-size:10px;padding:1px 7px">' + A.esc(cat) + '</span>' : '') +
            (r.pago_para ? ' · pra ' + A.esc(r.pago_para) : '') +
            (r.status === 'pendente' ? ' · <b style="color:var(--red)">PENDENTE</b>' : '') +
            '</div></div>' +
            '<b style="color:' + cor + ';white-space:nowrap">' + sinal + A.money(r.valor).replace('-', '') + '</b>' +
            '<button class="icon-btn" data-cx-ed="' + i + '" title="editar">✎</button>' +
            '<button class="icon-btn red" data-cx-del="' + i + '">✕</button>' +
            '</div>';
        }).join('');

        box.querySelectorAll('[data-cx-del]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var r = vis[Number(btn.getAttribute('data-cx-del'))];
            if (!A.confirmar('Excluir o lancamento "' + (descLimpa(r) || r.tipo) + '" (' + A.money(r.valor) + ')?')) return;
            A.sb.from('caixa').delete().eq('id', r.id).then(function (res) {
              if (res.error) return A.toastErr(res.error);
              rows.splice(rows.indexOf(r), 1);
              A.toast('Excluido', 'ok'); aplicar();
            });
          });
        });
        box.querySelectorAll('[data-cx-ed]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            abrirForm(vis[Number(btn.getAttribute('data-cx-ed'))]);
          });
        });
      }

      /* ---------------- break-even do mes (recebido vs contas fixas) ---------------- */
      function atualizarBreakEven() {
        var card = document.getElementById('cx-be');
        if (!card) return;
        var fixoMes = 0;
        contas.forEach(function (c) { fixoMes += mensalEsperado(c); });
        if (!(fixoMes > 0)) { card.style.display = 'none'; return; }
        var mes = mesAtual(), recMes = 0;
        rows.forEach(function (r) {
          if (r.tipo === 'entrada' && r.status !== 'pendente' &&
            String(r.data || '').slice(0, 7) === mes && ehRealRow(r)) recMes += Number(r.valor || 0);
        });
        var pct = Math.min(100, Math.round(recMes / fixoMes * 100));
        card.style.display = '';
        document.getElementById('cx-be-pct').textContent = pct + '%';
        var bar = document.getElementById('cx-be-bar');
        bar.className = 'ds-bar' + (pct >= 100 ? ' green' : (pct < 50 ? ' red' : ''));
        requestAnimationFrame(function () {
          if (bar.firstElementChild) bar.firstElementChild.style.width = pct + '%';
        });
        document.getElementById('cx-be-txt').textContent =
          'Recebido ' + A.money(recMes) + ' em ' + nomeMes(mes) + ' · contas fixas ' + A.money(fixoMes) + '/mes' +
          (pct >= 100 ? ' · break-even BATIDO' : ' · falta ' + A.money(Math.max(0, fixoMes - recMes)));
      }

      /* ---------------- form add/edit ---------------- */
      function abrirForm(edit) {
        var card = document.getElementById('cx-form-card');
        if (!card) return;
        card.style.display = '';
        var cat = edit ? catDe(edit) : '';
        card.innerHTML =
          '<h3>' + A.icon(edit ? 'estimate' : 'plus', 18) + ' ' + (edit ? 'Editar lancamento' : 'Novo lancamento') + '</h3>' +
          '<div style="display:grid;gap:10px">' +
          '<div class="row">' +
          '<div class="grow"><label>Tipo</label><select id="c-tipo">' +
          A.CAIXA_TIPOS.map(function (t) { return '<option' + (edit && edit.tipo === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
          '<div class="grow"><label>Categoria</label><select id="c-cat">' +
          '<option value="">—</option>' +
          A.CAIXA_CATS.map(function (c) { return '<option' + (cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
          '</div>' +
          '<div class="row">' +
          '<div style="width:130px"><label>Valor $</label><input id="c-valor" type="number" step="any" value="' + (edit ? A.esc(edit.valor) : '') + '" /></div>' +
          '<div class="grow"><label>Data</label><input id="c-data" type="date" value="' + A.esc((edit && edit.data) || A.hoje()) + '" /></div>' +
          '<div class="grow"><label>Status</label><select id="c-status">' +
          ['pago', 'pendente', 'parcial'].map(function (s) { return '<option' + (edit && edit.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
          '</div>' +
          '<div><label>Descricao</label><input id="c-desc" value="' + A.esc(edit ? descLimpa(edit) : '') + '" placeholder="ex: gasolina van / deposito cliente…" /></div>' +
          '<div class="row">' +
          '<div class="grow"><label>Cliente (texto livre)</label><input id="c-cliente" value="' + A.esc((edit && edit.cliente) || '') + '" /></div>' +
          '<div class="grow"><label>Pago para</label><input id="c-pra" value="' + A.esc((edit && edit.pago_para) || '') + '" placeholder="Bruno, Home Depot…" /></div>' +
          '</div>' +
          '<div><label>Job (opcional)</label><select id="c-job"><option value="">—</option>' +
          jobs.map(function (j) {
            return '<option value="' + A.esc(j.id) + '"' + (edit && edit.job_id === j.id ? ' selected' : '') + '>' + A.esc(j.cliente || j.id) + '</option>';
          }).join('') + '</select></div>' +
          '<div class="row"><button class="btn grow" id="c-salvar">' + (edit ? 'Salvar' : 'Adicionar') + '</button>' +
          '<button class="btn sec" id="c-cancelar">Cancelar</button></div>' +
          '</div>';
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });

        document.getElementById('c-cancelar').addEventListener('click', function () {
          card.style.display = 'none'; card.innerHTML = '';
        });
        document.getElementById('c-salvar').addEventListener('click', function () {
          var valor = A.num(document.getElementById('c-valor').value);
          if (!valor) return A.toast('Coloca o valor', 'err');
          var catSel = document.getElementById('c-cat').value;
          var desc = document.getElementById('c-desc').value.trim();
          var row = {
            tipo: document.getElementById('c-tipo').value,
            valor: valor,
            data: document.getElementById('c-data').value || null,
            status: document.getElementById('c-status').value,
            descricao: (catSel ? '[' + catSel + '] ' : '') + desc || null,
            categoria: catSel || null,
            cliente: document.getElementById('c-cliente').value.trim() || null,
            pago_para: document.getElementById('c-pra').value.trim() || null,
            job_id: document.getElementById('c-job').value || null
          };
          if (row.descricao === '') row.descricao = null;
          var q;
          if (edit) {
            q = A.sb.from('caixa').update(row).eq('id', edit.id).select().single();
          } else {
            row.id = novoIdCaixa();
            q = A.sb.from('caixa').insert(row).select().single();
          }
          q.then(function (res) {
            if (res.error) return A.toastErr(res.error);
            if (edit) rows[rows.indexOf(edit)] = res.data;
            else rows.unshift(res.data);
            card.style.display = 'none'; card.innerHTML = '';
            A.toast('Salvo', 'ok');
            aplicar();
          });
        });
      }
      abrirFormRef = abrirForm;

      document.getElementById('cxf-busca').addEventListener('input', A.debounce(function (ev) { fF.busca = ev.target.value; aplicar(); }, 250));
      document.getElementById('cxf-tipo').addEventListener('change', function (ev) { fF.tipo = ev.target.value; aplicar(); });
      document.getElementById('cxf-cat').addEventListener('change', function (ev) { fF.cat = ev.target.value; aplicar(); });

      /* ---------------- QuickBooks ---------------- */
      var qboBox = document.getElementById('cx-qbo');
      var dados = qbo && qbo.dados;
      if (!dados) {
        qboBox.innerHTML = '<h3>' + A.icon('caixa', 18) + ' QuickBooks</h3>' + A.empty('Sem snapshot do QuickBooks', 'Preenche a tabela qbo_snapshot pra ver o P&L aqui.');
      } else {
        var res = dados.resumo || {};
        var labels = (dados.mensal || []).map(function (m) {
          var mm = Number(String(m.mes || '').slice(5));
          return ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][mm] || m.mes;
        });
        qboBox.innerHTML =
          '<div class="ds-section-h">' + A.icon('caixa', 18) + ' QuickBooks <span class="ds-n">P&amp;L ' + A.esc(((dados.periodo || {}).inicio || '').slice(0, 4)) + '</span></div>' +
          '<div class="stat-grid">' +
          stat('Receita', A.money(res.receita_total), 'green', null, Number(res.receita_total || 0)) +
          stat('Lucro bruto', A.money(res.lucro_bruto), 'green', null, Number(res.lucro_bruto || 0)) +
          stat('Despesas', A.money(res.despesas_totais), 'red', null, Number(res.despesas_totais || 0)) +
          stat('Resultado', A.money(res.resultado_liquido), Number(res.resultado_liquido || 0) >= 0 ? 'green' : 'red', null, Number(res.resultado_liquido || 0)) +
          '</div>' +
          ((dados.mensal || []).length ? A.chartBarras(labels, [
            { label: 'Receita', cor: '#3f8f5b', valores: dados.mensal.map(function (m) { return Number(m.receita || 0); }) },
            { label: 'Despesas', cor: '#c1432f', valores: dados.mensal.map(function (m) { return Number(m.despesas || 0) + Number(m.materiais || 0); }) },
            { label: 'Repasses', cor: '#D4722A', valores: dados.mensal.map(function (m) { return Number(m.repasses || 0); }) }
          ]) : '') +
          '<div class="muted" style="margin-top:8px">Ultimo update do snapshot: <b>' + A.esc(qbo.atualizado || '—') + '</b>' +
          (dados._nota || qbo.nota ? ' · ' + A.esc(dados._nota || qbo.nota) : '') + '</div>';
        cuAll(qboBox);
      }

      aplicar();
    }

    /* ==================================================================== */
    /* ⏳ EM HOLD — orcamentos parados (Lead/Visita/Estimate Enviado)        */
    /* ==================================================================== */
    function renderHold(body) {
      var hold = jobs.filter(function (j) { return HOLD.indexOf(String(j.status || '')) >= 0; });
      var total = 0, semValor = 0;
      hold.forEach(function (j) {
        if (j.valor_total === null || j.valor_total === undefined) semValor++;
        else total += Number(j.valor_total || 0);
      });
      hold.sort(function (a, b) { return Number(b.valor_total || 0) - Number(a.valor_total || 0); });

      var html =
        '<div class="card ds-hero cx3-hero">' +
        '<div class="lbl">⏳ Dinheiro em hold (nao fechou ainda)</div>' +
        '<div class="big"><span data-cu="' + Number(total) + '">' + A.esc(A.money(total)) + '</span> em ' + hold.length + ' orcamento' + (hold.length === 1 ? '' : 's') + '</div>' +
        '<div class="sub">Jobs em Lead / Visita / Estimate Enviado. NAO mistura com o caixa Real.' +
        (semValor ? ' · <b>' + semValor + ' sem valor definido</b>' : '') + '</div>' +
        '</div>';

      if (!hold.length) {
        html += '<div class="card">' + A.empty('Nada em hold', 'Nenhum orcamento parado no funil agora.', 'jobs') + '</div>';
      } else {
        html += '<div class="ds-section-h">📋 Orcamentos parados <span class="ds-n">' + hold.length + '</span></div>';
        html += '<div class="card">' + hold.map(function (j) {
          var dias = diasDesde(j.created_at);
          var chip = j.status === 'Estimate Enviado' ? 'orange' : (j.status === 'Lead' ? 'red' : 'warm');
          var frio = dias !== null && dias >= 21;
          return '<a class="li-row ds-card cx3-link" href="#/jobs/' + A.esc(j.id) + '">' +
            '<div class="main"><div class="t1">' + A.esc(j.cliente || j.id) +
            (frio ? ' <span class="ds-pulse red" style="font-size:10px;padding:2px 9px">PARADO ' + dias + 'D</span>' : '') +
            '</div>' +
            '<div class="t2"><span class="ds-chip ' + chip + '" style="font-size:10.5px;padding:2px 9px">' + A.esc(j.status) + '</span>' +
            (j.tipo_servico ? ' · ' + A.esc(j.tipo_servico) : '') +
            (dias !== null ? ' · parado ha ' + dias + ' dia' + (dias === 1 ? '' : 's') : '') +
            '</div></div>' +
            '<b class="cx3-val" style="color:var(--orange)">' +
            (j.valor_total === null || j.valor_total === undefined ? '—' : A.esc(A.money(j.valor_total))) + '</b>' +
            '</a>';
        }).join('') + '</div>';
      }
      body.innerHTML = html;
      cuAll(body);
    }

    /* ==================================================================== */
    /* 🏦 CONTAS FIXAS — mes corrente + cartao + reserva tax                */
    /* ==================================================================== */
    function renderFixas(body) {
      var mes = mesAtual();
      var ano = mes.slice(0, 4);
      var pagosMes = pagamentos.filter(function (p) { return p.mes === mes; });
      var pagoPorConta = {};
      pagosMes.forEach(function (p) {
        pagoPorConta[p.conta_id] = (pagoPorConta[p.conta_id] || 0) + Number(p.valor || 0);
      });

      var totalEsperado = 0, totalReembolso = 0, totalPago = 0;
      contas.forEach(function (c) {
        totalEsperado += mensalEsperado(c);
        totalReembolso += Number(c.reembolso_esperado || 0);
      });
      pagosMes.forEach(function (p) { totalPago += Number(p.valor || 0); });
      var pct = totalEsperado > 0 ? Math.min(100, Math.round(totalPago / totalEsperado * 100)) : 0;

      // reserva tax: separado no ano
      var reserva = null;
      contas.forEach(function (c) { if (c.id === 'reserva-tax') reserva = c; });
      var reservaAno = 0;
      pagamentos.forEach(function (p) {
        if (p.conta_id === 'reserva-tax' && String(p.mes || '').slice(0, 4) === ano) reservaAno += Number(p.valor || 0);
      });
      var reservaMeta = reserva ? mensalEsperado(reserva) * 12 : 0;

      var html =
        '<div class="stat-grid">' +
        stat('Total fixo — ' + nomeMes(mes), A.money(totalEsperado), '', totalReembolso ? 'reembolsos esperados: ' + A.money(totalReembolso) : '', totalEsperado) +
        stat('Ja pago no mes', A.money(totalPago), 'green', pct + '% do total', totalPago) +
        stat('Falta pagar', A.money(Math.max(0, totalEsperado - totalPago)), (totalEsperado - totalPago) > 0 ? 'red' : 'green', null, Math.max(0, totalEsperado - totalPago)) +
        '</div>' +
        '<div class="card ds-card">' + dsBar(pct, pct >= 100 ? 'green' : '') +
        '<div class="muted" style="font-size:11px;margin-top:6px">' + pct + '% das contas fixas de ' + A.esc(nomeMes(mes)) + ' pagas</div></div>';

      /* -------- cartao de credito -------- */
      if (cartao) {
        var saldo = Number(cartao.saldo_devedor || 0);
        var abatido = Math.max(0, CARTAO_DIVIDA_INICIAL - saldo);
        var pctCard = Math.min(100, Math.max(0, Math.round(abatido / CARTAO_DIVIDA_INICIAL * 100)));
        html +=
          '<div class="card ds-card cx3-cartao">' +
          '<div class="ds-section-h">💳 Cartao de credito <span class="ds-n">' + pctCard + '% abatido</span></div>' +
          '<div class="stat-grid">' +
          stat('Saldo devedor', A.money(saldo), 'red', 'atualizado: ' + A.fmtData(cartao.atualizado), saldo) +
          stat('Alvo semanal', A.money(cartao.pagamento_semanal_alvo), 'orange', 'pagamento por semana', Number(cartao.pagamento_semanal_alvo || 0)) +
          '</div>' +
          dsBar(pctCard) +
          '<div class="muted" style="font-size:11px;margin:6px 0 10px">Ja abatido ' + A.esc(A.money(abatido)) + ' de ' + A.esc(A.money(CARTAO_DIVIDA_INICIAL)) + ' (' + pctCard + '%)</div>' +
          (cartao.obs ? '<div class="muted" style="font-size:11px;margin-bottom:10px">' + A.esc(cartao.obs) + '</div>' : '') +
          '<button class="btn sm" id="cx3-pagar-cartao">💵 Registrar pagamento</button>' +
          '</div>';
      }

      /* -------- reserva tax -------- */
      if (reserva) {
        var pctRes = reservaMeta > 0 ? Math.min(100, Math.round(reservaAno / reservaMeta * 100)) : 0;
        html +=
          '<div class="card ds-card cx3-reserva">' +
          '<div class="ds-section-h gold">🐷 Reserva TAX ' + A.esc(ano) + ' <span class="ds-n">' + pctRes + '%</span></div>' +
          '<div class="cx3-reserva-big"><span data-cu="' + Number(reservaAno) + '">' + A.esc(A.money(reservaAno)) + '</span> <span class="muted" style="font-size:13px;font-weight:600">separado no ano' +
          (reservaMeta ? ' · meta ' + A.esc(A.money(reservaMeta)) : '') + '</span></div>' +
          '<div style="margin-top:8px">' + dsBar(pctRes, 'green') + '</div>' +
          (reserva.obs ? '<div class="muted" style="font-size:11px;margin-top:6px">' + A.esc(reserva.obs) + '</div>' : '') +
          '</div>';
      }

      /* -------- lista de contas do mes -------- */
      html += '<div class="card"><div class="ds-section-h">🏦 Contas de ' + A.esc(nomeMes(mes)) + ' <span class="ds-n">' + contas.length + '</span></div>' +
        (contas.length ? contas.map(function (c, i) {
          var esperado = mensalEsperado(c);
          var pago = pagoPorConta[c.id] || 0;
          var ok = pago >= esperado && esperado > 0;
          var faixa = (c.valor_min !== null && c.valor_min !== undefined && c.valor_max !== null && c.valor_max !== undefined)
            ? A.money(c.valor_min) + '–' + A.money(c.valor_max) : '';
          return '<div class="li-row">' +
            '<div class="main"><div class="t1">' + A.esc(c.nome) +
            (ok ? ' <span class="badge green" style="font-size:10px;padding:1px 7px">✔ pago</span>' :
              (pago > 0 ? ' <span class="badge orange" style="font-size:10px;padding:1px 7px">parcial ' + A.esc(A.money(pago)) + '</span>' : '')) +
            '</div>' +
            '<div class="t2">' +
            (faixa ? '<span class="cx3-faixa">faixa ' + A.esc(faixa) + ' · </span>' : '') +
            (c.frequencia === 'semanal' ? A.esc(A.money(c.valor)) + '/sem (≈' + A.esc(A.money(esperado)) + '/mes)' : A.esc(A.money(esperado)) + '/mes') +
            (Number(c.reembolso_esperado || 0) > 0 ? ' · <span style="color:var(--green)">reembolso ' + A.esc(A.money(c.reembolso_esperado)) + '</span>' : '') +
            (c.obs ? ' · ' + A.esc(c.obs) : '') +
            '</div></div>' +
            '<div class="cx3-conta-acts">' +
            '<button class="icon-btn" data-cx3-edval="' + i + '" title="editar valor esperado">✎</button>' +
            '<button class="btn sm' + (ok ? ' sec' : '') + '" data-cx3-pagar="' + i + '">✔ paguei</button>' +
            '</div></div>';
        }).join('') : A.empty('Nenhuma conta fixa', 'Cadastra na tabela contas_fixas.', 'caixa')) +
        '</div>';

      /* -------- pagamentos ja feitos no mes -------- */
      if (pagosMes.length) {
        var contaById = {};
        contas.forEach(function (c) { contaById[c.id] = c; });
        html += '<div class="card"><div class="ds-section-h">🧾 Pagamentos do mes <span class="ds-n">' + pagosMes.length + '</span></div>' +
          pagosMes.map(function (p) {
            var c = contaById[p.conta_id];
            return '<div class="li-row">' +
              '<div class="main"><div class="t1">' + A.esc((c && c.nome) || p.conta_id) + '</div>' +
              '<div class="t2">' + A.esc(A.fmtData(p.data)) + (p.obs ? ' · ' + A.esc(p.obs) : '') + '</div></div>' +
              '<b class="cx3-val" style="color:var(--red)">−' + A.esc(A.money(p.valor)) + '</b>' +
              '</div>';
          }).join('') + '</div>';
      }

      body.innerHTML = html;
      animarBarras(body);
      cuAll(body);

      /* -------- acoes -------- */
      body.querySelectorAll('[data-cx3-pagar]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var c = contas[Number(btn.getAttribute('data-cx3-pagar'))];
          if (!c) return;
          var sugestao = c.frequencia === 'semanal' ? Number(c.valor || 0) : Math.max(0, mensalEsperado(c) - (pagoPorConta[c.id] || 0)) || Number(c.valor || 0);
          var vs = window.prompt('Quanto pagou de "' + c.nome + '"?', String(sugestao));
          if (vs === null) return;
          var v = A.num(vs);
          if (!v || v <= 0) return A.toast('Valor invalido', 'err');
          btn.disabled = true;
          A.sb.from('contas_pagamentos').insert({ conta_id: c.id, mes: mes, valor: v, data: A.hoje() })
            .select().single().then(function (res) {
              if (res.error) { btn.disabled = false; throw res.error; }
              pagamentos.unshift(res.data);
              var cx = {
                id: novoIdCaixa(), tipo: 'despesa', categoria: 'conta_fixa',
                descricao: '[conta_fixa] ' + c.nome, valor: v, data: A.hoje(),
                status: 'pago', pago_para: c.nome, cliente: null, job_id: null
              };
              return A.sb.from('caixa').insert(cx).select().single().then(function (r2) {
                if (r2.error) throw r2.error;
                rows.unshift(r2.data);
                A.toast('Pagamento registrado', 'ok');
                if (totalEsperado > 0 && totalPago < totalEsperado && totalPago + v >= totalEsperado) A.celebrate();
                renderTab();
              });
            }).catch(function (e) { btn.disabled = false; A.toastErr(e); });
        });
      });

      body.querySelectorAll('[data-cx3-edval]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var c = contas[Number(btn.getAttribute('data-cx3-edval'))];
          if (!c) return;
          var vs = window.prompt('Novo valor esperado de "' + c.nome + '"' +
            (c.frequencia === 'semanal' ? ' (por SEMANA)' : ' (por mes)') + ':', String(c.valor || ''));
          if (vs === null) return;
          var v = A.num(vs);
          if (v === null || v < 0) return A.toast('Valor invalido', 'err');
          A.sb.from('contas_fixas').update({ valor: v }).eq('id', c.id).then(function (res) {
            if (res.error) return A.toastErr(res.error);
            c.valor = v;
            A.toast('Valor atualizado', 'ok');
            renderTab();
          });
        });
      });

      var btnCartao = document.getElementById('cx3-pagar-cartao');
      if (btnCartao && cartao) {
        btnCartao.addEventListener('click', function () {
          var vs = window.prompt('Quanto pagou do cartao?', String(Number(cartao.pagamento_semanal_alvo || 0) || ''));
          if (vs === null) return;
          var v = A.num(vs);
          if (!v || v <= 0) return A.toast('Valor invalido', 'err');
          var novoSaldo = Math.max(0, Number(cartao.saldo_devedor || 0) - v);
          btnCartao.disabled = true;
          A.sb.from('cartao_credito').update({ saldo_devedor: novoSaldo, atualizado: A.hoje() })
            .eq('id', cartao.id).then(function (res) {
              if (res.error) { btnCartao.disabled = false; throw res.error; }
              cartao.saldo_devedor = novoSaldo;
              cartao.atualizado = A.hoje();
              var cx = {
                id: novoIdCaixa(), tipo: 'despesa', categoria: 'conta_fixa',
                descricao: '[conta_fixa] Pagamento cartao de credito', valor: v, data: A.hoje(),
                status: 'pago', pago_para: 'Cartao de credito', cliente: null, job_id: null
              };
              return A.sb.from('caixa').insert(cx).select().single().then(function (r2) {
                if (r2.error) throw r2.error;
                rows.unshift(r2.data);
                A.toast('Pagamento do cartao registrado — saldo ' + A.money(novoSaldo), 'ok');
                if (novoSaldo <= 0) A.celebrate();
                renderTab();
              });
            }).catch(function (e) { btnCartao.disabled = false; A.toastErr(e); });
        });
      }
    }

    renderTab();
  }
})();
