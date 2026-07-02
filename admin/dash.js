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
      return Promise.all([
        sb.from('jobs').select('id,cliente,status,valor_total,pago,pagamento'),
        sb.from('work_orders').select('id,cliente,sub_id,data,hora,servico,status,valor_repasse,pago_ao_sub'),
        sb.from('caixa').select('tipo,valor,status'),
        sb.from('qbo_snapshot').select('*').order('id', { ascending: false }).limit(1)
      ]).then(function (rs) {
        rs.forEach(function (r) { if (r.error) throw r.error; });
        var jobs = rs[0].data || [];
        var wos = rs[1].data || [];
        var caixa = rs[2].data || [];
        var qbo = (rs[3].data && rs[3].data[0]) || null;
        desenhar(root, jobs, wos, caixa, qbo);
      });
    }
  };

  function desenhar(root, jobs, wos, caixa, qbo) {
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
      '<div class="stat-grid">' +
      stat('A receber (confirmado)', A.money(aReceber), 'orange', 'jobs confirmados: total − pago') +
      stat('Recebido (caixa)', A.money(recebido), 'green', 'entradas pagas registradas') +
      stat('Repasses pendentes', A.money(repPend), 'red', repPendN + ' work order' + (repPendN === 1 ? '' : 's')) +
      stat('Jobs ativos', String(ativos), '', A.JOB_ATIVOS.join(' · ')) +
      '</div>';

    // ---- grafico mensal (qbo) ----
    var dados = qbo && qbo.dados ? qbo.dados : null;
    if (dados && dados.mensal && dados.mensal.length) {
      var labels = dados.mensal.map(function (m) {
        var mm = String(m.mes || '').slice(5);
        return ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Number(mm)] || m.mes;
      });
      html += '<div class="card"><h3>' + A.icon('caixa', 18) + ' Receita vs Despesas (QuickBooks ' + A.esc((dados.periodo && dados.periodo.inicio || '').slice(0, 4)) + ')</h3>' +
        A.chartBarras(labels, [
          { label: 'Receita', cor: '#3f8f5b', valores: dados.mensal.map(function (m) { return Number(m.receita || 0); }) },
          { label: 'Despesas', cor: '#c1432f', valores: dados.mensal.map(function (m) { return Number(m.despesas || 0) + Number(m.materiais || 0); }) }
        ]) +
        '<div class="muted" style="margin-top:6px">Despesas = despesas operacionais + materiais (COGS). Snapshot: ' + A.esc(qbo.atualizado || '—') + '</div>' +
        '</div>';
    } else {
      html += '<div class="card"><h3>' + A.icon('caixa', 18) + ' Receita vs Despesas</h3>' +
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
      html += '<div class="card"><h3>' + A.icon('precos', 18) + ' Despesas por categoria (ano)</h3>' + A.chartHBar(items) + '</div>';
    }

    // ---- esta semana ----
    var wr = A.weekRange(0);
    var semana = wos.filter(function (w) {
      var d = A.parseISO(w.data);
      return d && d >= wr[0] && d <= wr[1];
    }).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });

    html += '<div class="card"><h3>' + A.icon('schedule', 18) + ' Esta semana</h3>';
    if (!semana.length) {
      html += A.empty('Nada agendado esta semana', 'Work orders com data nesta semana aparecem aqui.', 'schedule');
    } else {
      html += semana.map(function (w) {
        return '<a class="li-row" href="#/wo/' + A.esc(w.id) + '" style="color:inherit">' +
          '<div class="main"><div class="t1">' + A.esc(w.cliente || '—') + ' <span class="muted">(' + A.esc(A.subNome(w.sub_id)) + ')</span></div>' +
          '<div class="t2">' + A.esc(A.fmtDataDia(w.data)) + (w.hora ? ' · ' + A.esc(w.hora) : '') + ' · ' + A.esc(w.servico || '') + '</div></div>' +
          '<span class="badge ' + woBadge(w.status) + '">' + A.esc(w.status || '') + '</span>' +
          '</a>';
      }).join('');
    }
    html += '</div>';

    root.innerHTML = html;
  }

  function woBadge(st) {
    if (st === 'Concluido') return 'green';
    if (st === 'Em andamento') return 'orange';
    if (st === 'A enviar') return 'red';
    return '';
  }
  function stat(lbl, val, cls, sub) {
    return '<div class="stat"><div class="lbl">' + A.esc(lbl) + '</div>' +
      '<div class="val ' + (cls || '') + '">' + A.esc(val) + '</div>' +
      (sub ? '<div class="sub">' + A.esc(sub) + '</div>' : '') + '</div>';
  }
})();
