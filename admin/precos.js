/* ============================================================================
   IAC ADMIN v2 — precos.js
   Price book (tabela precos_v2): busca por trade/servico, preco IAC editavel,
   faixas de mercado GC-NJ e repasse de sub, minimo, custo material e badge
   de origem (IAC oficial vs mercado-NJ).
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  var busca = '';

  A.pages.precos = {
    render: function (root) {
      return A.sb.from('precos_v2').select('*').order('trade').order('id').then(function (r) {
        if (r.error) throw r.error;
        desenhar(root, r.data || []);
      });
    }
  };

  function faixa(min, max, un) {
    if (min === null && max === null) return '—';
    var u = un ? '/' + un : '';
    if (min !== null && max !== null) return A.money(min) + '–' + A.money(max) + u;
    return A.money(min !== null ? min : max) + u;
  }

  function desenhar(root, precos) {
    root.innerHTML =
      '<div class="h-page">' + A.icon('precos', 22) + ' Precos <span class="grow"></span>' +
      '<span class="badge">' + precos.length + ' servicos</span></div>' +
      '<div class="filters"><input type="search" id="pf-busca" placeholder="Buscar trade ou servico… (vinyl, tile, epoxy…)" value="' + A.esc(busca) + '" /></div>' +
      '<div id="p-lista"></div>';

    function aplicar() {
      var b = busca.toLowerCase();
      var vis = precos.filter(function (p) {
        if (!b) return true;
        return [p.trade, p.servico, p.obs].join(' ').toLowerCase().indexOf(b) >= 0;
      });
      var box = document.getElementById('p-lista');
      if (!vis.length) { box.innerHTML = A.empty('Nada encontrado', 'Tenta outro termo.', 'search'); return; }

      var trades = [];
      vis.forEach(function (p) { if (trades.indexOf(p.trade) < 0) trades.push(p.trade); });

      box.innerHTML = trades.map(function (tr) {
        var list = vis.filter(function (p) { return p.trade === tr; });
        return '<div class="card"><h3>' + A.icon(window.IAC_ICONS.forService(tr), 18) + ' ' + A.esc(tr || 'Outros') +
          ' <span class="grow"></span><span class="badge">' + list.length + '</span></h3>' +
          list.map(function (p) { return itemHtml(p); }).join('') +
          '</div>';
      }).join('');

      box.querySelectorAll('[data-preco-id]').forEach(function (el) {
        var p = precos.filter(function (x) { return String(x.id) === el.getAttribute('data-preco-id'); })[0];
        A.bindInlineEdits(el, function (field) {
          var specs = {
            preco_iac: { value: p.preco_iac, type: 'number' },
            minimo_job: { value: p.minimo_job, type: 'number' },
            obs: { value: p.obs }
          };
          var spec = specs[field];
          if (!spec) return null;
          spec.onSave = function (v) {
            var patch = {}; patch[field] = v;
            return A.sb.from('precos_v2').update(patch).eq('id', p.id).then(function (r) {
              if (r.error) throw r.error;
              p[field] = v;
              if (field === 'preco_iac') return A.esc(v === null ? '—' : A.money(v) + (p.unidade ? '/' + p.unidade : ''));
              if (field === 'minimo_job') return A.esc(v === null ? '—' : A.money(v));
            });
          };
          return spec;
        });
      });
    }

    function itemHtml(p) {
      var badge = (p.origem === 'iac')
        ? '<span class="badge green">IAC oficial</span>'
        : '<span class="badge orange">mercado-NJ</span>';
      return '<div data-preco-id="' + p.id + '" style="border-bottom:1px solid var(--line);padding:10px 0">' +
        '<div class="row" style="margin-bottom:6px"><b style="color:var(--warm)">' + A.esc(p.servico) + '</b><span class="grow"></span>' + badge + '</div>' +
        '<div class="fields" style="grid-template-columns:repeat(2,1fr)">' +
        '<div class="fld"><div class="lbl">Preco IAC (editavel)</div><div class="ed" data-edit="preco_iac">' +
        (p.preco_iac === null ? '<span class="empty-v">—</span>' : A.esc(A.money(p.preco_iac) + (p.unidade ? '/' + p.unidade : ''))) + '</div></div>' +
        '<div class="fld"><div class="lbl">Minimo (editavel)</div><div class="ed" data-edit="minimo_job">' +
        (p.minimo_job === null ? '<span class="empty-v">—</span>' : A.esc(A.money(p.minimo_job))) + '</div></div>' +
        '<div class="fld"><div class="lbl">Faixa GC — NJ</div><div class="ed" style="cursor:default;border:none;background:none">' + A.esc(faixa(p.preco_gc_min, p.preco_gc_max, p.unidade)) + '</div></div>' +
        '<div class="fld"><div class="lbl">Faixa repasse sub</div><div class="ed" style="cursor:default;border:none;background:none">' + A.esc(faixa(p.repasse_sub_min, p.repasse_sub_max, p.unidade)) + '</div></div>' +
        '</div>' +
        (p.custo_material_tipico ? '<div class="muted" style="margin-top:4px"><b>Material:</b> ' + A.esc(p.custo_material_tipico) + '</div>' : '') +
        '<div class="fld" style="margin-top:4px"><div class="lbl">Obs (editavel)</div><div class="ed" data-edit="obs" style="font-size:12.5px;color:var(--muted)">' +
        (p.obs ? A.esc(p.obs) : '<span class="empty-v">—</span>') + '</div></div>' +
        '</div>';
    }

    document.getElementById('pf-busca').addEventListener('input', A.debounce(function (ev) {
      busca = ev.target.value; aplicar();
    }, 250));
    aplicar();
  }
})();
