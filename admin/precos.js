/* ============================================================================
   IAC ADMIN v2.2 — precos.js (VIVO, design system .ds-*)
   Price book (tabela precos_v2): chips de trade COLORIDOS (uma cor fixa por
   trade, paleta warm das WOs), linhas com hover, busca com foco vivo.
   Tabela densa; toca na linha pra expandir (material / obs / fontes).
   IAC, minimo e obs continuam editaveis inline.
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  var busca = '';
  var tradeSel = '';

  // paleta warm por trade (mesma familia dos chips de dia das WOs)
  var CORES = ['#C97B2E', '#B8912F', '#7F9C4F', '#3F8F5B', '#B85C38', '#6B7FB3', '#8E5B8A'];
  function tradeCor(t) {
    var s = String(t || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return CORES[h % CORES.length];
  }

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

  function chipStyle(cor, on) {
    return 'background:' + cor + ';color:#fff;border-color:transparent;' +
      (on ? 'opacity:1;box-shadow:0 0 0 2px #fff,0 0 0 4px ' + cor + ';' : 'opacity:.55;');
  }

  function desenhar(root, precos) {
    var trades = [];
    precos.forEach(function (p) { if (p.trade && trades.indexOf(p.trade) < 0) trades.push(p.trade); });

    root.innerHTML =
      // CSS vivo local (hover de linha + foco da busca) — respeita reduced-motion
      '<style>' +
      '.ptable tr.prow td{transition:background 120ms ease}' +
      '.ptable tr.prow:hover td{background:var(--light)}' +
      '#pf-busca{transition:box-shadow 160ms ease,border-color 160ms ease}' +
      '#pf-busca:focus{outline:none;border-color:var(--orange);box-shadow:0 0 0 3px rgba(212,114,42,.22)}' +
      '#p-chips .chip{transition:opacity 140ms ease,box-shadow 140ms ease}' +
      '@media (prefers-reduced-motion: reduce){.ptable tr.prow td,#pf-busca,#p-chips .chip{transition:none}}' +
      '</style>' +
      '<div class="ds-section-h">' + A.icon('precos', 20) + ' Precos <span class="ds-n">' + precos.length + '</span>' +
      '<span class="grow"></span></div>' +
      '<div class="filters" style="margin-bottom:8px"><input type="search" id="pf-busca" placeholder="Buscar servico… (vinyl, tile, epoxy…)" value="' + A.esc(busca) + '" /></div>' +
      '<div class="chips" id="p-chips">' +
      '<button class="chip ds-chip" data-tr="" style="' + chipStyle('var(--warm)', tradeSel === '') + '">Todos</button>' +
      trades.map(function (t) {
        return '<button class="chip ds-chip" data-tr="' + A.esc(t) + '" style="' + chipStyle(tradeCor(t), tradeSel === t) + '">' + A.esc(t) + '</button>';
      }).join('') +
      '</div>' +
      '<div id="p-lista"></div>';

    function aplicar() {
      var b = busca.toLowerCase();
      var vis = precos.filter(function (p) {
        if (tradeSel && p.trade !== tradeSel) return false;
        if (!b) return true;
        return [p.trade, p.servico, p.obs].join(' ').toLowerCase().indexOf(b) >= 0;
      });
      var box = document.getElementById('p-lista');
      if (!vis.length) { box.innerHTML = A.empty('Nada encontrado', 'Tenta outro termo ou trade.', 'search'); return; }

      var rows = '';
      var tradeAtual = null;
      vis.forEach(function (p) {
        if (p.trade !== tradeAtual && !tradeSel) {
          tradeAtual = p.trade;
          rows += '<tr class="tr-trade"><td colspan="6">' +
            '<span class="ds-chip" style="background:' + tradeCor(p.trade) + ';color:#fff">' + A.esc(p.trade || 'Outros') + '</span>' +
            '</td></tr>';
        }
        rows +=
          '<tr class="prow" data-pid="' + p.id + '">' +
          '<td class="psv">' + A.esc(p.servico) +
          (p.origem === 'iac' ? ' <span class="pdot green" title="IAC oficial"></span>' : ' <span class="pdot orange" title="mercado-NJ"></span>') + '</td>' +
          '<td class="pun">' + A.esc(p.unidade || '—') + '</td>' +
          '<td><span class="ed" data-edit="preco_iac">' + (p.preco_iac === null ? '<span class="empty-v">—</span>' : A.esc(A.money(p.preco_iac))) + '</span></td>' +
          '<td class="pmut">' + A.esc(faixa(p.preco_gc_min, p.preco_gc_max, '')) + '</td>' +
          '<td class="pmut">' + A.esc(faixa(p.repasse_sub_min, p.repasse_sub_max, '')) + '</td>' +
          '<td><span class="ed" data-edit="minimo_job">' + (p.minimo_job === null ? '<span class="empty-v">—</span>' : A.esc(A.money(p.minimo_job))) + '</span></td>' +
          '</tr>' +
          '<tr class="pexp" data-exp="' + p.id + '" style="display:none"><td colspan="6">' +
          '<div class="row" style="margin-bottom:4px">' +
          (p.origem === 'iac' ? '<span class="badge green">IAC oficial</span>' : '<span class="badge orange">mercado-NJ</span>') +
          (p.unidade ? '<span class="badge">por ' + A.esc(p.unidade) + '</span>' : '') +
          '</div>' +
          (p.custo_material_tipico ? '<div class="pexp-b"><b>Material:</b> ' + A.esc(p.custo_material_tipico) + '</div>' : '') +
          '<div class="pexp-b"><b>Obs (toca pra editar):</b> <span class="ed" data-edit="obs">' + (p.obs ? A.esc(p.obs) : '<span class="empty-v">—</span>') + '</span></div>' +
          (Array.isArray(p.fontes) && p.fontes.length
            ? '<div class="pexp-b"><b>Fontes:</b> ' + p.fontes.map(function (f, i) {
              return '<a href="' + A.esc(f) + '" target="_blank" rel="noopener">[' + (i + 1) + ']</a>';
            }).join(' ') + '</div>'
            : '') +
          '</td></tr>';
      });

      box.innerHTML =
        '<div class="ptable-wrap"><table class="ptable">' +
        '<thead><tr><th>Servico</th><th>Un</th><th>IAC</th><th>GC NJ</th><th>Repasse</th><th>Min</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
        '<div class="muted" style="margin-top:6px">Toca na linha pra ver material, obs e fontes. IAC / Min / Obs sao editaveis.</div>';

      // expandir/recolher
      box.querySelectorAll('.prow').forEach(function (tr) {
        tr.addEventListener('click', function (ev) {
          if (ev.target.closest('[data-edit]') || ev.target.closest('a')) return;
          var exp = box.querySelector('[data-exp="' + tr.getAttribute('data-pid') + '"]');
          if (!exp) return;
          var aberto = exp.style.display !== 'none';
          exp.style.display = aberto ? 'none' : '';
          tr.classList.toggle('open', !aberto);
        });
      });

      // inline edit (linha + linha expandida compartilham o mesmo registro)
      vis.forEach(function (p) {
        var els = box.querySelectorAll('[data-pid="' + p.id + '"], [data-exp="' + p.id + '"]');
        els.forEach(function (scope) {
          A.bindInlineEdits(scope, function (field) {
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
                if (field === 'preco_iac' || field === 'minimo_job') return A.esc(v === null ? '—' : A.money(v));
              });
            };
            return spec;
          });
        });
      });
    }

    document.getElementById('pf-busca').addEventListener('input', A.debounce(function (ev) {
      busca = ev.target.value; aplicar();
    }, 250));
    document.getElementById('p-chips').addEventListener('click', function (ev) {
      var chip = ev.target.closest('.chip');
      if (!chip) return;
      tradeSel = chip.getAttribute('data-tr') || '';
      document.querySelectorAll('#p-chips .chip').forEach(function (c) {
        var t = c.getAttribute('data-tr') || '';
        var on = (t === tradeSel);
        c.classList.toggle('on', on);
        c.setAttribute('style', chipStyle(t === '' ? 'var(--warm)' : tradeCor(t), on));
      });
      aplicar();
    });
    aplicar();
  }
})();
