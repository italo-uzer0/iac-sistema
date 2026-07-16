/* ============================================================================
   IAC ADMIN v2 — dash.js (Dashboard)
   Cards-resumo + grafico mensal (qbo_snapshot) + despesas por categoria +
   lista "esta semana" (work orders por data).
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM, sb = null;

  var CAT_LABELS = {
    ads_marketing: 'Ads / Marketing',
    contract_labor_repasses: 'Repasses (subs)',
    materiais_cogs: 'Materiais',
    payroll: 'Payroll',
    quickbooks_fees: 'QuickBooks fees',
    seguro: 'Seguro',
    veiculo_total: 'Veiculo',
    taxas_licencas: 'Taxas / Licencas',
    office: 'Office',
    supplies: 'Supplies',
    viagem: 'Viagem',
    juros: 'Juros',
    utilities: 'Utilities',
    bank_fees: 'Bank fees',
    outros: 'Outros'
  };
  // sub-itens do veiculo (ja dentro de veiculo_total) — nao duplicar
  var CAT_SKIP = { veiculo_combustivel: 1, veiculo_reparos: 1, veiculo_pedagio_estacionamento: 1 };

  A.pages.dash = {
    render: function (root) {
      sb = A.sb;
      var mes = A.hoje().slice(0, 7);
      return Promise.all([
        sb.from('jobs').select('id,cliente,status,valor_total,pago,pagamento'),
        sb.from('work_orders').select('id,cliente,sub_id,data,hora,servico,status,valor_repasse,pago_ao_sub'),
        sb.from('caixa').select('tipo,valor,status,data,categoria'),
        sb.from('qbo_snapshot').select('*').order('id', { ascending: false }).limit(1),
        sb.from('contas_fixas').select('id,nome,valor,frequencia').eq('ativo', true),
        sb.from('contas_pagamentos').select('conta_id,valor,mes').eq('mes', mes)
      ]).then(function (rs) {
        rs.forEach(function (r) { if (r.error) throw r.error; });
        var jobs = rs[0].data || [];
        var wos = rs[1].data || [];
        var caixa = rs[2].data || [];
        var qbo = (rs[3].data && rs[3].data[0]) || null;
        var contas = rs[4].data || [];
        var pagosFixas = rs[5].data || [];
        desenhar(root, jobs, wos, caixa, qbo, contas, pagosFixas);
      });
    }
  };

  var MESES_PT = ['', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var DIAS3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  // chip de dia colorido (padrao WOs) pra lista "esta semana"
  function chipDia(w) {
    var d = A.parseISO(w.data);
    if (!d) return '<span class="ds-chip-day semdata">SEM DATA</span>';
    var hoje0 = A.parseISO(A.hoje());
    var txt = DIAS3[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0');
    var hora = w.hora ? ' · ' + A.esc(w.hora) : '';
    if (hoje0 && d.getTime() === hoje0.getTime())
      return '<span class="ds-chip-day hoje">HOJE' + hora + '</span>';
    if (hoje0 && d < hoje0)
      return '<span class="ds-chip-day atrasada">⚠ ' + txt + '</span>';
    return '<span class="ds-chip-day d' + d.getDay() + '">' + txt + hora + '</span>';
  }

  // dispara countUp em todos os [data-count] e enche as barras [data-barw]
  function animar(root) {
    var els = root.querySelectorAll('[data-count]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        A.countUp(el, Number(el.getAttribute('data-count')) || 0, el.getAttribute('data-pre') || '');
      })(els[i]);
    }
    var bars = root.querySelectorAll('[data-barw]');
    if (bars.length && window.requestAnimationFrame) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          for (var k = 0; k < bars.length; k++)
            bars[k].style.width = bars[k].getAttribute('data-barw') + '%';
        });
      });
    } else {
      for (var m = 0; m < bars.length; m++)
        bars[m].style.width = bars[m].getAttribute('data-barw') + '%';
    }
  }

  function mensalEsperado(c) {
    var v = Number(c.valor || 0);
    return c.frequencia === 'semanal' ? Math.round(v * 4.33) : v;
  }

  // ---- hero "Lucro do mes" (mes corrente, so caixa status=pago) ----
  function heroLucro(caixa, contas, pagosFixas) {
    var mes = A.hoje().slice(0, 7);
    var mesLabel = (MESES_PT[Number(mes.slice(5))] || mes) + '/' + mes.slice(0, 4);

    var recebido = 0, repasses = 0, despesas = 0, fixasViaCaixa = 0;
    caixa.forEach(function (c) {
      if (c.status !== 'pago') return;
      if (String(c.data || '').slice(0, 7) !== mes) return;
      var v = Number(c.valor || 0);
      if (c.tipo === 'entrada') recebido += v;
      else if (c.tipo === 'repasse') repasses += v;
      else if (c.tipo === 'despesa') {
        despesas += v;
        if (/conta_fixa/i.test(c.categoria || '')) fixasViaCaixa += v;
      }
    });

    var fixoMensal = 0;
    contas.forEach(function (c) { fixoMensal += mensalEsperado(c); });
    var fixasPagas = 0;
    pagosFixas.forEach(function (p) { fixasPagas += Number(p.valor || 0); });
    // anti dupla-contagem: conta fixa lancada direto no caixa (categoria conta_fixa)
    // tambem abate das "fixas restantes", mesmo sem registro em contas_pagamentos
    fixasPagas = Math.max(fixasPagas, fixasViaCaixa);
    var fixasRestantes = Math.max(0, fixoMensal - fixasPagas);

    var lucro = recebido - repasses - despesas;
    var projecao = lucro - fixasRestantes;

    // break-even: cobrir o total fixo mensal com o que entra
    var meta = fixoMensal;
    var pct = meta > 0 ? Math.min(100, Math.round(recebido / meta * 100)) : 100;
    var bateu = recebido >= meta;

    function sinal(v) { return v >= 0 ? 'lc-pos' : 'lc-neg'; }

    return '<div class="card lc-hero ds-hero">' +
      '<div class="lc-title">📊 Lucro do mes — ' + A.esc(mesLabel) + '</div>' +
      '<div class="lc-lucro-lbl">Lucro liquido ate agora</div>' +
      '<div class="lc-lucro ' + sinal(lucro) + '" data-count="' + Math.abs(lucro) +
      '" data-pre="' + (lucro < 0 ? '-$' : '$') + '">' + A.esc(A.money(lucro)) + '</div>' +
      '<div class="lc-grid">' +
      lcItem('Recebido', A.money(recebido), 'lc-pos') +
      lcItem('Repasses pagos', A.money(-repasses), repasses > 0 ? 'lc-neg' : '') +
      lcItem('Despesas', A.money(-despesas), despesas > 0 ? 'lc-neg' : '') +
      lcItem('Fixas restantes', A.money(-fixasRestantes), fixasRestantes > 0 ? 'lc-warn' : 'lc-pos') +
      '</div>' +
      '<div class="lc-proj">Projecao do mes (lucro − fixas restantes): ' +
      '<b class="' + sinal(projecao) + '">' + A.esc(A.money(projecao)) + '</b></div>' +
      '<div class="lc-be-txt">Pra empatar o mes: faturar ~' + A.esc(A.money(meta)) +
      ' <span class="muted">(total das contas fixas do mes)</span></div>' +
      '<div class="ds-bar' + (bateu ? ' green' : '') + '"><i data-barw="' + pct + '"></i></div>' +
      '<div class="lc-be-sub">Recebido ' + A.esc(A.money(recebido)) + ' de ' + A.esc(A.money(meta)) +
      ' (' + pct + '%)' + (bateu ? ' — mes empatado, daqui pra frente e lucro ✔' : '') + '</div>' +
      '</div>';
  }
  function lcItem(lbl, val, cls) {
    return '<div class="lc-item"><div class="lbl">' + A.esc(lbl) + '</div>' +
      '<div class="val ' + (cls || '') + '">' + A.esc(val) + '</div></div>';
  }

  function desenhar(root, jobs, wos, caixa, qbo, contas, pagosFixas) {
    // ---- cards resumo ----
    var aReceber = 0, ativos = 0;
    jobs.forEach(function (j) {
      var conf = A.JOB_ATIVOS.indexOf(j.status) >= 0 || j.status === 'Done';
      if (conf && j.valor_total) {
        var falta = Number(j.valor_total) - Number(j.pago || 0);
        if (falta > 0) aReceber += falta;
      }
      if (A.JOB_ATIVOS.indexOf(j.status) >= 0) ativos++;
    });
    var recebido = 0;
    caixa.forEach(function (c) {
      if (c.tipo === 'entrada' && c.status === 'pago') recebido += Number(c.valor || 0);
    });
    var repPend = 0, repPendN = 0;
    wos.forEach(function (w) {
      if (w.valor_repasse) {
        var falta = Number(w.valor_repasse) - Number(w.pago_ao_sub || 0);
        if (falta > 0) { repPend += falta; repPendN++; }
      }
    });

    var html =
      '<div class="h-page">' + A.icon('dashboard', 22) + ' Dashboard</div>' +
      heroLucro(caixa, contas || [], pagosFixas || []) +
      '<div class="stat-grid">' +
      stat('A receber (confirmado)', A.money(aReceber), 'orange', 'jobs confirmados: total − pago', '#/caixa', aReceber, '$') +
      stat('Recebido (caixa)', A.money(recebido), 'green', 'entradas pagas registradas', '#/caixa', recebido, '$') +
      stat('Repasses pendentes', A.money(repPend), 'red', repPendN + ' work order' + (repPendN === 1 ? '' : 's'), '#/wo', repPend, '$') +
      stat('Jobs ativos', String(ativos), '', A.JOB_ATIVOS.join(' · '), '#/jobs', ativos, '') +
      '</div>';

    // ---- grafico mensal (qbo) ----
    var dados = qbo && qbo.dados ? qbo.dados : null;
    if (dados && dados.mensal && dados.mensal.length) {
      var labels = dados.mensal.map(function (m) {
        var mm = String(m.mes || '').slice(5);
        return ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Number(mm)] || m.mes;
      });
      html += '<div class="card"><div class="ds-section-h">' + A.icon('caixa', 18) + ' Receita vs Despesas <span class="ds-n">QuickBooks ' + A.esc((dados.periodo && dados.periodo.inicio || '').slice(0, 4)) + '</span></div>' +
        A.chartBarras(labels, [
          { label: 'Receita', cor: '#3f8f5b', valores: dados.mensal.map(function (m) { return Number(m.receita || 0); }) },
          { label: 'Despesas', cor: '#c1432f', valores: dados.mensal.map(function (m) { return Number(m.despesas || 0) + Number(m.materiais || 0); }) }
        ]) +
        '<div class="muted" style="margin-top:6px">Despesas = despesas operacionais + materiais (COGS). Snapshot: ' + A.esc(qbo.atualizado || '—') + '</div>' +
        '</div>';
    } else {
      html += '<div class="card"><div class="ds-section-h">' + A.icon('caixa', 18) + ' Receita vs Despesas</div>' +
        A.empty('Sem snapshot do QuickBooks', 'Atualize a tabela qbo_snapshot pra ver o grafico.') + '</div>';
    }

    // ---- despesas por categoria ----
    if (dados && dados.despesas_por_categoria) {
      var items = [];
      Object.keys(dados.despesas_por_categoria).forEach(function (k) {
        if (CAT_SKIP[k]) return;
        var v = Number(dados.despesas_por_categoria[k] || 0);
        if (v > 0) items.push({ label: CAT_LABELS[k] || k, valor: v });
      });
      items.sort(function (a, b) { return b.valor - a.valor; });
      items = items.slice(0, 10);
      html += '<div class="card"><div class="ds-section-h">' + A.icon('precos', 18) + ' Despesas por categoria (ano) <span class="ds-n">' + items.length + '</span></div>' + A.chartHBar(items) + '</div>';
    }

    // ---- esta semana ----
    var wr = A.weekRange(0);
    var semana = wos.filter(function (w) {
      var d = A.parseISO(w.data);
      return d && d >= wr[0] && d <= wr[1];
    }).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });

    html += '<div class="card"><div class="ds-section-h">' + A.icon('schedule', 18) + ' Esta semana <span class="ds-n">' + semana.length + '</span></div>';
    if (!semana.length) {
      html += A.empty('Nada agendado esta semana', 'Work orders com data nesta semana aparecem aqui.', 'schedule');
    } else {
      html += semana.map(function (w) {
        return '<a class="li-row ds-card" href="#/wo/' + A.esc(w.id) + '" style="color:inherit">' +
          '<div class="main"><div class="t1">' + chipDia(w) + ' ' + A.esc(w.cliente || '—') + ' <span class="muted">(' + A.esc(A.subNome(w.sub_id)) + ')</span></div>' +
          '<div class="t2">' + A.esc(w.servico || '') + '</div></div>' +
          '<span class="badge ' + woBadge(w.status) + '">' + A.esc(w.status || '') + '</span>' +
          '</a>';
      }).join('');
    }
    html += '</div>';

    root.innerHTML = html;
    animar(root);
  }

  function woBadge(st) {
    if (st === 'Concluido') return 'green';
    if (st === 'Em andamento') return 'orange';
    if (st === 'A enviar') return 'red';
    return '';
  }
  function stat(lbl, val, cls, sub, href, num, pre) {
    var anim = (typeof num === 'number' && isFinite(num))
      ? ' data-count="' + Math.abs(num) + '" data-pre="' + ((num < 0 ? '-' : '') + (pre || '')) + '"'
      : '';
    return '<a class="stat ds-card" href="' + A.esc(href || '#/dash') + '"' +
      ' style="display:block;color:inherit;text-decoration:none;cursor:pointer">' +
      '<div class="lbl">' + A.esc(lbl) + '</div>' +
      '<div class="val ' + (cls || '') + '"' + anim + '>' + A.esc(val) + '</div>' +
      (sub ? '<div class="sub">' + A.esc(sub) + '</div>' : '') + '</a>';
  }
})();
