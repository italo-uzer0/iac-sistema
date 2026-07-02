/* ============================================================================
   IAC ADMIN v2 — subs.js
   Cards dos subcontractors: rates, telefone/WhatsApp e total pago no ano
   (wo_payments via work_orders.sub_id + caixa tipo repasse por pago_para).
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  A.pages.subs = {
    render: function (root) {
      var ano = new Date().getFullYear();
      return Promise.all([
        A.sb.from('subs').select('*').order('nome'),
        A.sb.from('work_orders').select('id,sub_id'),
        A.sb.from('wo_payments').select('wo_id,valor,data'),
        A.sb.from('caixa').select('tipo,valor,data,status,pago_para')
      ]).then(function (rs) {
        rs.forEach(function (r) { if (r.error) throw r.error; });
        desenhar(root, rs[0].data || [], rs[1].data || [], rs[2].data || [], rs[3].data || [], ano);
      });
    }
  };

  function anoDe(d) {
    var m = String(d || '').match(/^(\d{4})/);
    return m ? Number(m[1]) : null;
  }

  function desenhar(root, subs, wos, pays, caixa, ano) {
    // wo_id -> sub_id
    var woSub = {};
    wos.forEach(function (w) { woSub[w.id] = w.sub_id; });

    function totalAno(sub) {
      var t = 0;
      pays.forEach(function (p) {
        if (woSub[p.wo_id] !== sub.id) return;
        var a = anoDe(p.data);
        if (a === null || a === ano) t += Number(p.valor || 0);
      });
      var nome = (sub.nome || '').toLowerCase();
      caixa.forEach(function (c) {
        if (c.tipo !== 'repasse' || c.status !== 'pago') return;
        var pra = (c.pago_para || '').toLowerCase();
        if (!pra) return;
        if (pra.indexOf(nome) < 0 && pra.indexOf(sub.id) < 0) return;
        var a = anoDe(c.data);
        if (a === null || a === ano) t += Number(c.valor || 0);
      });
      return t;
    }

    root.innerHTML =
      '<div class="h-page">' + A.icon('subs', 22) + ' Subs <span class="grow"></span>' +
      '<span class="badge">' + subs.length + '</span></div>' +
      (subs.length ? subs.map(function (s) { return cardHtml(s, totalAno(s)); }).join('')
        : A.empty('Nenhum sub cadastrado', 'Cadastra os subs na tabela subs do Supabase.', 'subs'));

    root.querySelectorAll('[data-copy-tel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        A.copiar(btn.getAttribute('data-copy-tel'), 'Telefone copiado!');
      });
    });
  }

  function waLink(tel) {
    var dig = String(tel || '').replace(/\D/g, '');
    if (!dig) return null;
    if (dig.length === 10) dig = '1' + dig;
    return 'https://wa.me/' + dig;
  }

  function cardHtml(s, total) {
    var wa = waLink(s.telefone);
    var rates = Array.isArray(s.rates) ? s.rates : [];
    var regras = s.regras_especiais;
    var ref = s.rates_referencia && typeof s.rates_referencia === 'object' ? s.rates_referencia : null;
    var refItens = ref && Array.isArray(ref.itens) ? ref.itens : [];

    return '<div class="card">' +
      '<div class="row" style="margin-bottom:4px">' +
      '<b style="font-size:17px;color:var(--warm)">' + A.esc(s.nome) + '</b>' +
      (s.preco_fixo === false ? '<span class="badge orange">orcamento caso a caso</span>' : '<span class="badge green">preco fixo</span>') +
      '<span class="grow"></span>' +
      '<span class="badge warm">pago ' + new Date().getFullYear() + ': ' + A.money(total) + '</span>' +
      '</div>' +
      (s.w9 === false || s.seguro === false
        ? '<div class="row" style="margin-bottom:6px">' +
        (s.w9 === false ? '<span class="badge red badge-doc">⚠ SEM W9</span>' : '') +
        (s.seguro === false ? '<span class="badge orange badge-doc">sem seguro</span>' : '') +
        '</div>'
        : '') +
      '<div class="muted" style="margin-bottom:8px">' + A.esc(s.especialidade || '') +
      (s.minimo_job ? ' · minimo ' + A.money(s.minimo_job) : '') +
      (s.minimo_job_muito_pequeno ? ' (mini-jobs ' + A.money(s.minimo_job_muito_pequeno) + ')' : '') +
      '</div>' +
      (s.telefone
        ? '<div class="row" style="margin-bottom:10px">' +
        '<a class="btn sec sm" href="tel:' + A.esc(String(s.telefone).replace(/\s/g, '')) + '">' + A.icon('phone', 15) + ' ' + A.esc(s.telefone) + '</a>' +
        (wa ? '<a class="btn green sm" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        '<button class="icon-btn" data-copy-tel="' + A.esc(s.telefone) + '" title="copiar">' + A.icon('copy', 16) + '</button>' +
        '</div>'
        : '<div class="muted" style="margin-bottom:10px">sem telefone cadastrado</div>') +
      (rates.length
        ? '<div style="overflow-x:auto"><table class="tb"><thead><tr><th>Servico</th><th>Repasse</th><th>Cliente</th><th>Margem</th></tr></thead><tbody>' +
        rates.map(function (r) {
          var un = r.unidade ? '/' + r.unidade : '';
          return '<tr><td>' + A.esc(r.servico || '') + '</td>' +
            '<td><b>' + (r.rate !== undefined && r.rate !== null ? A.esc(A.money(r.rate) + un) : '—') + '</b></td>' +
            '<td>' + (r.client !== undefined && r.client !== null ? A.esc(A.money(r.client) + un) : '—') + '</td>' +
            '<td style="color:var(--green);font-weight:700">' + (r.margem !== undefined && r.margem !== null ? A.esc(A.money(r.margem) + un) : '—') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>'
        : '<div class="muted">Sem tabela de rates — pedir orcamento por video/descricao.</div>') +
      (refItens.length
        ? '<div style="margin-top:10px"><div class="row" style="margin-bottom:4px">' +
        '<b style="font-size:13px;color:var(--warm)">Rates de referencia</b>' +
        '<span class="badge orange">referencia' + (ref.estimativa ? ' (estimado)' : '') + '</span></div>' +
        '<div style="overflow-x:auto"><table class="tb"><thead><tr><th>Servico</th><th>Faixa repasse</th><th>Obs</th></tr></thead><tbody>' +
        refItens.map(function (it) {
          var un = it.unidade ? '/' + it.unidade : '';
          var fx = (it.rate_min !== undefined && it.rate_min !== null && it.rate_max !== undefined && it.rate_max !== null)
            ? A.money(it.rate_min) + '–' + A.money(it.rate_max) + un
            : (it.rate_min !== undefined && it.rate_min !== null) ? A.money(it.rate_min) + un
              : (it.rate_max !== undefined && it.rate_max !== null) ? A.money(it.rate_max) + un : '—';
          return '<tr><td>' + A.esc(it.servico || '') + '</td><td><b>' + A.esc(fx) + '</b></td><td class="muted">' + A.esc(it.obs || '') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        (ref.base ? '<div class="muted" style="margin-top:2px">Base: ' + A.esc(ref.base) + '</div>' : '') +
        '</div>'
        : '') +
      (regras ? '<div class="muted" style="margin-top:8px"><b>Regras:</b> ' + A.esc(typeof regras === 'string' ? regras : JSON.stringify(regras)) + '</div>' : '') +
      (s.notas ? '<div class="muted" style="margin-top:4px"><b>Notas:</b> ' + A.esc(s.notas) + '</div>' : '') +
      '</div>';
  }
})();
