/* ============================================================================
   IAC ADMIN v2 — caixa.js
   Resumo + lancamentos com filtro tipo/categoria + adicionar/editar/excluir +
   secao QuickBooks (qbo_snapshot).
   Categoria: a tabela caixa nao tem coluna propria — usamos a convencao
   "[categoria] descricao" no campo descricao (parse/strip na exibicao) +
   auto-categorizacao por palavra-chave pros lancamentos antigos.
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  var fF = { tipo: '', cat: '', busca: '' };

  function catDe(row) {
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

  A.pages.caixa = {
    render: function (root) {
      return Promise.all([
        A.sb.from('caixa').select('*').order('data', { ascending: false, nullsFirst: false }),
        A.sb.from('jobs').select('id,cliente').order('created_at', { ascending: false }),
        A.sb.from('qbo_snapshot').select('*').order('id', { ascending: false }).limit(1)
      ]).then(function (rs) {
        rs.forEach(function (r) { if (r.error) throw r.error; });
        desenhar(root, rs[0].data || [], rs[1].data || [], (rs[2].data && rs[2].data[0]) || null);
      });
    }
  };

  function desenhar(root, rows, jobs, qbo) {
    root.innerHTML =
      '<div class="h-page">' + A.icon('caixa', 22) + ' Caixa <span class="grow"></span>' +
      '<button class="btn sm" id="cx-novo-btn">+ Lancamento</button></div>' +
      '<div class="stat-grid" id="cx-stats"></div>' +
      '<div class="card" id="cx-form-card" style="display:none"></div>' +
      '<div class="filters">' +
      '<input type="search" id="cxf-busca" placeholder="Buscar cliente, descricao…" />' +
      '<select id="cxf-tipo"><option value="">Todos os tipos</option>' +
      A.CAIXA_TIPOS.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select>' +
      '<select id="cxf-cat"><option value="">Todas categorias</option>' +
      A.CAIXA_CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select>' +
      '</div>' +
      '<div class="card" id="cx-lista"></div>' +
      '<div class="card" id="cx-qbo"></div>';

    var jobById = {};
    jobs.forEach(function (j) { jobById[j.id] = j; });

    /* ---------------- resumo + lista ---------------- */
    function aplicar() {
      var b = fF.busca.toLowerCase();
      var vis = rows.filter(function (r) {
        if (fF.tipo && r.tipo !== fF.tipo) return false;
        if (fF.cat && catDe(r) !== fF.cat) return false;
        if (b && [r.cliente, r.descricao, r.pago_para].join(' ').toLowerCase().indexOf(b) < 0) return false;
        return true;
      });

      var ent = 0, rep = 0, desp = 0, pend = 0;
      vis.forEach(function (r) {
        var v = Number(r.valor || 0);
        if (r.status === 'pendente') { pend += v; return; }
        if (r.tipo === 'entrada') ent += v;
        else if (r.tipo === 'repasse') rep += v;
        else desp += v;
      });
      document.getElementById('cx-stats').innerHTML =
        stat('Entradas (pagas)', A.money(ent), 'green') +
        stat('Repasses (pagos)', A.money(rep), 'red') +
        stat('Despesas', A.money(desp), 'red') +
        stat('Saldo / pendente', A.money(ent - rep - desp), (ent - rep - desp) >= 0 ? 'green' : 'red', 'pendentes: ' + A.money(pend));

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

    function stat(lbl, val, cls, sub) {
      return '<div class="stat"><div class="lbl">' + A.esc(lbl) + '</div><div class="val ' + (cls || '') + '">' + A.esc(val) + '</div>' +
        (sub ? '<div class="sub">' + A.esc(sub) + '</div>' : '') + '</div>';
    }

    /* ---------------- form add/edit ---------------- */
    function abrirForm(edit) {
      var card = document.getElementById('cx-form-card');
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
          cliente: document.getElementById('c-cliente').value.trim() || null,
          pago_para: document.getElementById('c-pra').value.trim() || null,
          job_id: document.getElementById('c-job').value || null
        };
        if (row.descricao === '') row.descricao = null;
        var q;
        if (edit) {
          q = A.sb.from('caixa').update(row).eq('id', edit.id).select().single();
        } else {
          row.id = 'cx-' + Date.now().toString(36) + '-' + A.token32().slice(0, 4);
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

    document.getElementById('cx-novo-btn').addEventListener('click', function () { abrirForm(null); });
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
        '<h3>' + A.icon('caixa', 18) + ' QuickBooks (P&amp;L ' + A.esc(((dados.periodo || {}).inicio || '').slice(0, 4)) + ')</h3>' +
        '<div class="stat-grid">' +
        stat('Receita', A.money(res.receita_total), 'green') +
        stat('Lucro bruto', A.money(res.lucro_bruto), 'green') +
        stat('Despesas', A.money(res.despesas_totais), 'red') +
        stat('Resultado', A.money(res.resultado_liquido), Number(res.resultado_liquido || 0) >= 0 ? 'green' : 'red') +
        '</div>' +
        ((dados.mensal || []).length ? A.chartBarras(labels, [
          { label: 'Receita', cor: '#3f8f5b', valores: dados.mensal.map(function (m) { return Number(m.receita || 0); }) },
          { label: 'Despesas', cor: '#c1432f', valores: dados.mensal.map(function (m) { return Number(m.despesas || 0) + Number(m.materiais || 0); }) },
          { label: 'Repasses', cor: '#D4722A', valores: dados.mensal.map(function (m) { return Number(m.repasses || 0); }) }
        ]) : '') +
        '<div class="muted" style="margin-top:8px">Ultimo update do snapshot: <b>' + A.esc(qbo.atualizado || '—') + '</b>' +
        (dados._nota || qbo.nota ? ' · ' + A.esc(dados._nota || qbo.nota) : '') + '</div>';
    }

    aplicar();
  }
})();
