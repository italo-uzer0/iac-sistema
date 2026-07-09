/* ============================================================================
   IAC ADMIN v2 — core.js
   Client Supabase + login + router por hash + helpers + shell + toast.
   Sem framework. Depende de: supabase-js v2 (CDN), logo.js, icons.js.
   ============================================================================ */
(function () {
  'use strict';

  var SUPA_URL = 'https://riceqxgudaziragogfxm.supabase.co';
  var SUPA_KEY = 'sb_publishable_cHJJEI3rzVQmMM8j5I3WDg_N4yf6Irq';
  var PAGES = 'https://italo-uzer0.github.io/iac-sistema/';

  var sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  // -------------------------------------------------------------- constantes
  var JOB_STATUSES = ['Lead', 'Visita agendada', 'Visita feita', 'Estimate Enviado',
    'Schedule', 'Prep', 'In progress', 'Blocker', 'review', 'Done', 'Perdidos'];
  var JOB_ATIVOS = ['Schedule', 'Prep', 'In progress', 'Blocker'];
  var WO_STATUSES = ['A enviar', 'Enviado ao sub', 'Em andamento', 'Concluido'];
  var PAGAMENTOS = ['Not Paid', 'Partial Paid', 'Fully Paid'];
  var REPASSE_STATUS = ['pendente', 'parcial', 'pago'];
  var CAIXA_TIPOS = ['entrada', 'repasse', 'despesa'];
  var CAIXA_CATS = ['ads', 'material', 'veiculo', 'seguro', 'office', 'repasses', 'outro'];

  // -------------------------------------------------------------- helpers
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '—';
    var v = Number(n);
    var cents = Math.round(Math.abs(v) * 100) % 100 !== 0;
    var s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
    return (v < 0 ? '-$' : '$') + s;
  }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(String(v).replace(/[$,\s]/g, ''));
    return isNaN(n) ? null : n;
  }
  var DIAS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
  function parseISO(d) {
    if (!d) return null;
    var m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  function fmtData(d) {
    var dt = parseISO(d);
    if (!dt) return '—';
    return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear();
  }
  function fmtDataDia(d) {
    var dt = parseISO(d);
    if (!dt) return '—';
    return DIAS[dt.getDay()] + ' ' + String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
  }
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function weekRange(offset) {
    // semana comecando na segunda. offset 0 = esta semana, 1 = proxima
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var dow = (now.getDay() + 6) % 7; // 0 = segunda
    var mon = new Date(now); mon.setDate(now.getDate() - dow + (offset || 0) * 7);
    var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return [mon, sun];
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 700);
    };
  }
  function token32() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
    return s;
  }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'x';
  }
  function icon(name, size) { return window.IAC_ICONS.icon(name, size || 20); }

  // -------------------------------------------------------------- toast
  function toast(msg, tipo) {
    var box = document.getElementById('toasts');
    var t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s'; t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 320);
    }, tipo === 'err' ? 4200 : 2000);
  }
  function toastErr(e) {
    var m = (e && (e.message || e.error_description || e.msg)) || String(e || 'Erro');
    toast('Erro: ' + m, 'err');
  }

  // -------------------------------------------------------------- bottom sheet
  function sheet(title, itemsHtml, onClick) {
    var root = document.getElementById('sheet-root');
    root.innerHTML = '<div class="sheet-bg"><div class="sheet"><h3>' + esc(title) + '</h3>' + itemsHtml + '</div></div>';
    var bg = root.firstChild;
    bg.addEventListener('click', function (ev) {
      if (ev.target === bg) { root.innerHTML = ''; return; }
      var opt = ev.target.closest('[data-opt]');
      if (opt) {
        root.innerHTML = '';
        if (onClick) onClick(opt.getAttribute('data-opt'), opt);
      }
    });
    return { close: function () { root.innerHTML = ''; } };
  }
  function sheetOptions(title, options, onPick) {
    // options: [{value,label,icon,badge}]
    var html = options.map(function (o) {
      return '<button class="opt" data-opt="' + esc(o.value) + '">' +
        (o.icon ? icon(o.icon, 20) : '') +
        '<span class="grow">' + esc(o.label) + '</span>' +
        (o.badge ? '<span class="badge">' + esc(o.badge) + '</span>' : '') +
        '</button>';
    }).join('');
    return sheet(title, html, onPick);
  }

  // -------------------------------------------------------------- confirmacao
  function confirmar(msg) { return window.confirm(msg); }
  function confirmarDuplo(msg1, msg2) {
    if (!window.confirm(msg1)) return false;
    return window.confirm(msg2 || 'Tem CERTEZA? Essa acao nao tem volta.');
  }

  // -------------------------------------------------------------- clipboard
  function copiar(texto, okMsg) {
    function done() { toast(okMsg || 'Copiado!', 'ok'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(done).catch(function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Nao consegui copiar', 'err'); }
      ta.remove();
    }
  }

  // -------------------------------------------------------------- inline edit
  // Liga edicao inline em todos os [data-edit] dentro de container.
  // spec por campo vem de getSpec(field) -> {value,type,options,onSave}
  function bindInlineEdits(container, getSpec) {
    container.querySelectorAll('[data-edit]').forEach(function (elm) {
      elm.addEventListener('click', function () {
        if (elm.getAttribute('data-editing')) return;
        var field = elm.getAttribute('data-edit');
        var spec = getSpec(field);
        if (!spec) return;
        elm.setAttribute('data-editing', '1');
        var inp;
        if (spec.type === 'select') {
          inp = document.createElement('select');
          (spec.options || []).forEach(function (o) {
            var opt = document.createElement('option');
            opt.value = (o.value !== undefined ? o.value : o);
            opt.textContent = (o.label !== undefined ? o.label : o);
            inp.appendChild(opt);
          });
          if (spec.allowEmpty) {
            var eo = document.createElement('option'); eo.value = ''; eo.textContent = '—';
            inp.insertBefore(eo, inp.firstChild);
          }
          inp.value = spec.value === null || spec.value === undefined ? '' : spec.value;
        } else {
          inp = document.createElement('input');
          inp.type = spec.type || 'text';
          inp.value = spec.value === null || spec.value === undefined ? '' : spec.value;
          if (spec.type === 'number') inp.step = 'any';
        }
        var old = elm.innerHTML;
        elm.innerHTML = '';
        elm.appendChild(inp);
        inp.focus();
        if (inp.select) try { inp.select(); } catch (e) { }
        var saved = false;
        function finish(save) {
          if (saved) return; saved = true;
          elm.removeAttribute('data-editing');
          if (!save) { elm.innerHTML = old; return; }
          var v = inp.value;
          if (spec.type === 'number') v = num(v);
          if (v === '') v = null;
          Promise.resolve(spec.onSave(v)).then(function (display) {
            elm.innerHTML = display !== undefined ? display : (v === null ? '<span class="empty-v">—</span>' : esc(v));
            elm.classList.toggle('empty-v', v === null);
            toast('Salvo', 'ok');
          }).catch(function (e) { elm.innerHTML = old; toastErr(e); });
        }
        inp.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
          if (ev.key === 'Escape') { finish(false); }
        });
        inp.addEventListener('blur', function () { finish(true); });
        if (spec.type === 'select') inp.addEventListener('change', function () { inp.blur(); });
      });
    });
  }
  function fld(label, field, value, opts) {
    opts = opts || {};
    var display = (value === null || value === undefined || value === '')
      ? '<span class="empty-v">—</span>'
      : (opts.html ? value : esc(value));
    return '<div class="fld"><div class="lbl">' + esc(label) + '</div>' +
      '<div class="ed" data-edit="' + esc(field) + '">' + display + '</div></div>';
  }

  // -------------------------------------------------------------- UI blocks
  function loading() { return '<div class="loading-box"><div class="spinner"></div>Carregando…</div>'; }
  function empty(titulo, sub, ic) {
    return '<div class="empty">' + icon(ic || 'box', 34) + '<b>' + esc(titulo) + '</b>' + esc(sub || '') + '</div>';
  }
  function badgePagamento(p) {
    if (p === 'Fully Paid') return '<span class="badge green">Fully Paid</span>';
    if (p === 'Partial Paid') return '<span class="badge orange">Partial</span>';
    return '<span class="badge red">Not Paid</span>';
  }

  // -------------------------------------------------------------- charts (SVG puro)
  // Barras agrupadas: series = [{label,cor,valores:[..]}], labels = [..]
  function chartBarras(labels, series, opts) {
    opts = opts || {};
    var W = Math.max(320, labels.length * (series.length * 22 + 26));
    var H = opts.h || 190, padB = 24, padT = 12, padL = 6, padR = 6;
    var max = 0;
    series.forEach(function (s) { s.valores.forEach(function (v) { if (v > max) max = v; }); });
    if (max <= 0) max = 1;
    var innerH = H - padB - padT;
    var groupW = (W - padL - padR) / labels.length;
    var barW = Math.min(20, (groupW - 10) / series.length);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">';
    // linhas de grade
    for (var g = 1; g <= 3; g++) {
      var gy = padT + innerH - innerH * g / 3;
      svg += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '" stroke="#e8ddd0" stroke-width="1"/>' +
        '<text x="' + padL + '" y="' + (gy - 3) + '" font-size="9" fill="#8a7a6c">' + Math.round(max * g / 3 / 1000) + 'k</text>';
    }
    labels.forEach(function (lb, i) {
      var gx = padL + groupW * i + (groupW - barW * series.length) / 2;
      series.forEach(function (s, j) {
        var v = s.valores[i] || 0;
        var bh = Math.max(1.5, innerH * v / max);
        svg += '<rect x="' + (gx + j * barW + 1) + '" y="' + (padT + innerH - bh) + '" width="' + (barW - 2) +
          '" height="' + bh + '" rx="3" fill="' + s.cor + '"><title>' + esc(s.label + ' ' + lb + ': ' + money(v)) + '</title></rect>';
      });
      svg += '<text x="' + (padL + groupW * i + groupW / 2) + '" y="' + (H - 8) + '" font-size="10" fill="#8a7a6c" text-anchor="middle">' + esc(lb) + '</text>';
    });
    svg += '</svg>';
    var legend = '<div class="legend">' + series.map(function (s) {
      return '<span><i style="background:' + s.cor + '"></i>' + esc(s.label) + '</span>';
    }).join('') + '</div>';
    return '<div class="chart-wrap">' + svg + '</div>' + legend;
  }
  // Barras horizontais: items = [{label, valor, cor?}]
  function chartHBar(items) {
    var max = 0;
    items.forEach(function (it) { if (it.valor > max) max = it.valor; });
    if (max <= 0) max = 1;
    var rowH = 28, W = 560, H = items.length * rowH + 4, lblW = 150;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:560px" xmlns="http://www.w3.org/2000/svg">';
    items.forEach(function (it, i) {
      var y = i * rowH;
      var bw = Math.max(2, (W - lblW - 74) * it.valor / max);
      svg += '<text x="' + (lblW - 8) + '" y="' + (y + 18) + '" font-size="11" fill="#3D2B1F" text-anchor="end">' + esc(it.label) + '</text>' +
        '<rect x="' + lblW + '" y="' + (y + 6) + '" width="' + bw + '" height="15" rx="4" fill="' + (it.cor || '#D4722A') + '"/>' +
        '<text x="' + (lblW + bw + 6) + '" y="' + (y + 18) + '" font-size="11" fill="#8a7a6c">' + esc(money(it.valor)) + '</text>';
    });
    svg += '</svg>';
    return '<div class="chart-wrap">' + svg + '</div>';
  }

  // -------------------------------------------------------------- cache (subs/contractors)
  var cache = { subs: [], contractors: [], subById: {}, ctById: {} };
  function carregarCache() {
    return Promise.all([
      sb.from('subs').select('*').order('nome'),
      sb.from('contractors').select('*').order('nome')
    ]).then(function (rs) {
      if (rs[0].error) throw rs[0].error;
      if (rs[1].error) throw rs[1].error;
      cache.subs = rs[0].data || [];
      cache.contractors = rs[1].data || [];
      cache.subById = {}; cache.ctById = {};
      cache.subs.forEach(function (s) { cache.subById[s.id] = s; });
      cache.contractors.forEach(function (c) { cache.ctById[c.id] = c; });
    });
  }
  function subNome(id) { return (cache.subById[id] && cache.subById[id].nome) || id || '—'; }

  // -------------------------------------------------------------- finalizacao WO -> job Done
  // Avalia se o job pode fechar (mover pra 'Done'). Regra: so fecha se o job tiver
  // pelo menos UMA work order 'Concluido' E todos os valores necessarios preenchidos
  // (jobs.valor_total != null E valor_repasse != null de cada WO concluida).
  // Se faltar valor, NAO move e devolve as pendencias (pra mostrar badge/aviso).
  // Move sozinho (e escreve nota no job) so quando tudo esta completo.
  // Usado por: botao "Finalizar" (wo.js), edicao inline de valor_repasse (wo.js) e
  // valor_total (jobs.js), e pela badge de pendencia do kanban.
  function avaliarJobDone(jobId) {
    var vazio = { done: false, temWoConcluida: false, pendencias: [] };
    if (!jobId) return Promise.resolve(vazio);
    return Promise.all([
      sb.from('jobs').select('id,cliente,valor_total,status').eq('id', jobId).maybeSingle(),
      sb.from('work_orders').select('id,valor_repasse,status').eq('job_id', jobId)
    ]).then(function (rs) {
      if (rs[0].error) throw rs[0].error;
      if (rs[1].error) throw rs[1].error;
      var job = rs[0].data;
      if (!job) return vazio;
      var concluidas = (rs[1].data || []).filter(function (w) { return String(w.status || '') === 'Concluido'; });
      if (!concluidas.length) return { done: false, temWoConcluida: false, pendencias: [], job: job };
      var pendencias = [];
      if (job.valor_total === null || job.valor_total === undefined) pendencias.push('valor total do job');
      var faltaRepasse = concluidas.some(function (w) { return w.valor_repasse === null || w.valor_repasse === undefined; });
      if (faltaRepasse) pendencias.push('valor do repasse do sub');
      if (pendencias.length) return { done: false, temWoConcluida: true, pendencias: pendencias, job: job };
      if (String(job.status || '') === 'Done') return { done: false, already: true, temWoConcluida: true, pendencias: [], job: job };
      return sb.from('jobs').update({ status: 'Done' }).eq('id', jobId).then(function (r) {
        if (r.error) throw r.error;
        return sb.from('job_notes').insert({
          job_id: jobId, data: hoje(), titulo: 'Concluído',
          texto: 'Trabalho finalizado — work order concluída e valores preenchidos. Job movido automaticamente pra Done.'
        }).then(function () {
          return { done: true, temWoConcluida: true, pendencias: [], job: job };
        });
      });
    });
  }
  // helper puro (sincrono) pra badge do kanban: recebe o job e um resumo das WOs
  // concluidas dele -> true se a WO ja foi finalizada mas falta valor pra fechar o job.
  function jobPendenteValor(job, resumoWo) {
    if (!resumoWo || !resumoWo.temConcluida) return false;
    if (String(job.status || '') === 'Done') return false;
    return resumoWo.repasseFalta || job.valor_total === null || job.valor_total === undefined;
  }

  // -------------------------------------------------------------- router / shell
  var pages = {}; // nome -> { title, render(root, args) }
  function route(hash) {
    var h = (hash || location.hash || '#/dia').replace(/^#\/?/, '');
    var qs = '';
    var qi = h.indexOf('?');
    if (qi >= 0) { qs = h.slice(qi + 1); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    return { page: parts[0] || 'dia', args: parts.slice(1), query: parseQS(qs) };
  }
  function parseQS(qs) {
    var o = {};
    (qs || '').split('&').forEach(function (p) {
      if (!p) return;
      var kv = p.split('=');
      o[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return o;
  }

  var NAV = [
    { id: 'dia', label: 'Dia', icon: 'schedule' },
    { id: 'dash', label: 'Inicio', icon: 'dashboard' },
    { id: 'jobs', label: 'Jobs', icon: 'jobs' },
    { id: 'wo', label: 'WOs', icon: 'workorders' },
    { id: 'caixa', label: 'Caixa', icon: 'caixa' },
    { id: 'precos', label: 'Precos', icon: 'precos' },
    { id: 'subs', label: 'Subs', icon: 'subs' }
  ];

  function renderShell() {
    var app = document.getElementById('app');
    app.innerHTML =
      '<header class="app-header">' +
      '<img class="logo" src="' + window.IAC_LOGO + '" alt="IAC" />' +
      '<div class="ttl">IAC Admin<small>Home Improvement — sistema</small></div>' +
      '<button class="btn-ghost" id="btn-logout">Sair</button>' +
      '</header>' +
      '<main class="page" id="page"></main>' +
      '<nav class="bottom-nav" id="nav">' +
      NAV.map(function (n) {
        return '<a href="#/' + n.id + '" data-nav="' + n.id + '">' + icon(n.icon, 22) + '<span>' + n.label + '</span></a>';
      }).join('') +
      '</nav>';
    document.getElementById('btn-logout').addEventListener('click', function () {
      sb.auth.signOut().then(function () { location.hash = '#/dia'; });
    });
  }

  var shellPronto = false;
  function renderRoute() {
    var r = route();
    if (!shellPronto) { renderShell(); shellPronto = true; }
    document.querySelectorAll('#nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === r.page);
    });
    var pg = pages[r.page] || pages.dia || pages.dash;
    var root = document.getElementById('page');
    root.innerHTML = loading();
    window.scrollTo(0, 0);
    Promise.resolve(pg.render(root, r.args, r.query)).catch(function (e) {
      root.innerHTML = '<div class="empty">' + icon('blocker', 34) + '<b>Deu erro ao carregar</b>' + esc((e && e.message) || String(e)) + '</div>';
      console.error(e);
    });
  }

  // -------------------------------------------------------------- login
  function renderLogin(errMsg) {
    shellPronto = false;
    var app = document.getElementById('app');
    app.innerHTML =
      '<div class="login-wrap"><div class="login-card">' +
      '<img class="logo" src="' + window.IAC_LOGO + '" alt="IAC" />' +
      '<h1>IAC Admin</h1>' +
      '<div class="sub">Sistema de gestao — IAC Home Improvement</div>' +
      '<form id="f-login">' +
      (errMsg ? '<div class="login-err">' + esc(errMsg) + '</div>' : '') +
      '<div><label>Email</label><input type="email" id="l-email" autocomplete="username" required placeholder="email@..." /></div>' +
      '<div><label>Senha</label><input type="password" id="l-pass" autocomplete="current-password" required placeholder="••••••••" /></div>' +
      '<button class="btn block" id="l-btn" type="submit">Entrar</button>' +
      '</form></div></div>';
    document.getElementById('f-login').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = document.getElementById('l-btn');
      btn.disabled = true; btn.textContent = 'Entrando…';
      sb.auth.signInWithPassword({
        email: document.getElementById('l-email').value.trim(),
        password: document.getElementById('l-pass').value
      }).then(function (res) {
        if (res.error) {
          var m = /invalid/i.test(res.error.message || '')
            ? 'Email ou senha incorretos. Confere e tenta de novo.'
            : (res.error.message || 'Falha no login.');
          renderLogin(m);
          return;
        }
        iniciar();
      }).catch(function (e) {
        renderLogin('Sem conexao com o servidor. Verifica a internet. (' + ((e && e.message) || e) + ')');
      });
    });
  }

  // -------------------------------------------------------------- boot
  var iniciado = false;
  function iniciar() {
    if (iniciado) { renderRoute(); return; }
    iniciado = true;
    carregarCache().then(function () {
      renderRoute();
    }).catch(function (e) {
      iniciado = false;
      renderLogin('Logou, mas nao consegui carregar os dados: ' + ((e && e.message) || e));
    });
  }

  function boot() {
    window.addEventListener('hashchange', function () {
      if (iniciado) renderRoute();
    });
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') { iniciado = false; shellPronto = false; renderLogin(); }
    });
    sb.auth.getSession().then(function (res) {
      if (res.data && res.data.session) iniciar();
      else renderLogin();
    }).catch(function () { renderLogin(); });
  }

  // -------------------------------------------------------------- exports
  window.ADM = {
    sb: sb,
    PAGES: PAGES,
    JOB_STATUSES: JOB_STATUSES,
    JOB_ATIVOS: JOB_ATIVOS,
    WO_STATUSES: WO_STATUSES,
    PAGAMENTOS: PAGAMENTOS,
    REPASSE_STATUS: REPASSE_STATUS,
    CAIXA_TIPOS: CAIXA_TIPOS,
    CAIXA_CATS: CAIXA_CATS,
    pages: pages,
    cache: cache,
    subNome: subNome,
    avaliarJobDone: avaliarJobDone, jobPendenteValor: jobPendenteValor,
    esc: esc, money: money, num: num, hoje: hoje,
    fmtData: fmtData, fmtDataDia: fmtDataDia, parseISO: parseISO, weekRange: weekRange,
    debounce: debounce, token32: token32, slug: slug,
    icon: icon, toast: toast, toastErr: toastErr,
    sheet: sheet, sheetOptions: sheetOptions,
    confirmar: confirmar, confirmarDuplo: confirmarDuplo,
    copiar: copiar,
    bindInlineEdits: bindInlineEdits, fld: fld,
    loading: loading, empty: empty, badgePagamento: badgePagamento,
    chartBarras: chartBarras, chartHBar: chartHBar,
    boot: boot
  };
})();
