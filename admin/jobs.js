/* ============================================================================
   IAC ADMIN v2 — jobs.js
   Kanban por status do pipeline + detalhe 100% editavel inline + extras +
   upload de invoice (bucket 'invoices') + link do portal do cliente.
   ============================================================================ */
(function () {
  'use strict';
  var A = window.ADM;

  var EXTRA_STATUS = ['proposto', 'aprovado', 'recusado', 'concluido'];

  var ORIGENS = [
    { value: 'lsa', label: 'LSA (Google Local Services)' },
    { value: 'google_search', label: 'Google Search' },
    { value: 'site_form', label: 'Formulario do site' },
    { value: 'indicacao', label: 'Indicacao' },
    { value: 'repeat', label: 'Cliente repetido' },
    { value: 'other', label: 'Outro' }
  ];
  function origemLabel(v) {
    if (!v) return null;
    var o = ORIGENS.filter(function (x) { return x.value === v; })[0];
    return o ? o.label : v;
  }

  A.pages.jobs = {
    render: function (root, args) {
      if (args && args[0]) return renderDetalhe(root, args[0]);
      return renderKanban(root);
    }
  };

  /* ======================================================== KANBAN ======= */
  var kFiltro = { busca: '', status: '' };

  function renderKanban(root) {
    return Promise.all([
      A.sb.from('jobs').select('*').order('created_at', { ascending: false }),
      A.sb.from('work_orders').select('job_id,status,valor_repasse')
    ]).then(function (rs) {
      if (rs[0].error) throw rs[0].error;
      if (rs[1].error) throw rs[1].error;
      desenharKanban(root, rs[0].data || [], rs[1].data || []);
    });
  }

  // resumo por job das WOs concluidas -> { temConcluida, repasseFalta }
  function resumoWosPorJob(wos) {
    var map = {};
    (wos || []).forEach(function (w) {
      if (String(w.status || '') !== 'Concluido') return;
      var e = map[w.job_id] || (map[w.job_id] = { temConcluida: true, repasseFalta: false });
      e.temConcluida = true;
      if (w.valor_repasse === null || w.valor_repasse === undefined) e.repasseFalta = true;
    });
    return map;
  }

  // autoscroll das colunas quando arrasta perto da borda (desktop + mobile)
  function kanbanAutoscroll(kb, x, y) {
    if (!kb) return;
    var r = kb.getBoundingClientRect();
    var M = 70, S = 24;
    if (x < r.left + M) kb.scrollLeft -= S;
    else if (x > r.right - M) kb.scrollLeft += S;
    if (y < 110) window.scrollBy(0, -S);
    else if (y > window.innerHeight - 110) window.scrollBy(0, S);
  }

  function desenharKanban(root, jobs, wos) {
    var pendMap = resumoWosPorJob(wos);
    var statuses = A.JOB_STATUSES.slice();
    jobs.forEach(function (j) {
      if (j.status && statuses.indexOf(j.status) < 0) statuses.push(j.status);
    });

    root.innerHTML =
      '<div class="h-page">' + A.icon('jobs', 22) + ' Jobs <span class="grow"></span>' +
      '<span class="badge">' + jobs.length + '</span></div>' +
      '<div class="filters">' +
      '<input type="search" id="jf-busca" placeholder="Buscar cliente, endereco, servico…" value="' + A.esc(kFiltro.busca) + '" />' +
      '<select id="jf-status"><option value="">Todas as etapas</option>' +
      statuses.map(function (s) { return '<option' + (kFiltro.status === s ? ' selected' : '') + '>' + A.esc(s) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="kanban" id="kanban"></div>';

    var dragId = null;       // id do card sendo arrastado (HTML5 DnD)
    var clickSupresso = false; // suprime o click fantasma depois de um touch-drag

    function byId(id) { return jobs.filter(function (j) { return j.id === id; })[0]; }

    function mover(job, novo) {
      if (!job || !novo || novo === job.status) return;
      A.sb.from('jobs').update({ status: novo }).eq('id', job.id).then(function (r) {
        if (r.error) return A.toastErr(r.error);
        job.status = novo;
        A.toast('Movido pra ' + novo, 'ok');
        aplicar();
      });
    }

    function limparHints() {
      document.querySelectorAll('.kcol.drop-hint').forEach(function (c) { c.classList.remove('drop-hint'); });
    }

    // long-press (400ms) inicia drag no touch, com clone seguindo o dedo
    function ligarTouchDrag(el) {
      var timer = null, clone = null, ativo = false, alvo = null, sx = 0, sy = 0;
      el.addEventListener('touchstart', function (ev) {
        if (ev.touches.length !== 1) return;
        var t = ev.touches[0];
        sx = t.clientX; sy = t.clientY; ativo = false;
        timer = setTimeout(function () { timer = null; ativo = true; iniciar(t); }, 400);
      }, { passive: true });
      el.addEventListener('touchmove', function (ev) {
        var t = ev.touches[0];
        if (!ativo) {
          // usuario esta rolando a tela -> cancela o long-press
          if (timer && (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10)) {
            clearTimeout(timer); timer = null;
          }
          return;
        }
        ev.preventDefault();
        arrastar(t);
      }, { passive: false });
      function fim() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (!ativo) return;
        ativo = false;
        if (clone) { clone.remove(); clone = null; }
        el.classList.remove('dragging');
        limparHints();
        var st = alvo ? alvo.getAttribute('data-st') : null;
        alvo = null;
        clickSupresso = true;
        setTimeout(function () { clickSupresso = false; }, 350);
        if (st) mover(byId(el.getAttribute('data-id')), st);
      }
      el.addEventListener('touchend', fim);
      el.addEventListener('touchcancel', fim);
      function iniciar(t) {
        var r = el.getBoundingClientRect();
        clone = el.cloneNode(true);
        clone.className = 'kcard drag-ghost';
        clone.style.width = r.width + 'px';
        document.body.appendChild(clone);
        el.classList.add('dragging');
        if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) { } }
        arrastar(t);
      }
      function arrastar(t) {
        if (!clone) return;
        clone.style.left = (t.clientX - clone.offsetWidth / 2) + 'px';
        clone.style.top = (t.clientY - 34) + 'px';
        kanbanAutoscroll(document.getElementById('kanban'), t.clientX, t.clientY);
        var under = document.elementFromPoint(t.clientX, t.clientY);
        var col = under && under.closest ? under.closest('.kcol') : null;
        if (col !== alvo) {
          limparHints();
          alvo = col;
          if (col) col.classList.add('drop-hint');
        }
      }
    }

    function aplicar() {
      var b = kFiltro.busca.toLowerCase();
      var vis = jobs.filter(function (j) {
        if (kFiltro.status && j.status !== kFiltro.status) return false;
        if (!b) return true;
        return [j.cliente, j.endereco, j.cidade_st, j.tipo_servico, j.notas].join(' ').toLowerCase().indexOf(b) >= 0;
      });
      var cols = kFiltro.status ? [kFiltro.status] : statuses;
      var kb = document.getElementById('kanban');
      kb.innerHTML = cols.map(function (st) {
        var list = vis.filter(function (j) { return j.status === st; });
        if (!list.length && kFiltro.busca && !kFiltro.status) return '';
        return '<div class="kcol" data-st="' + A.esc(st) + '">' +
          '<div class="kcol-h">' + A.icon(window.IAC_ICONS.forStatus(st), 16) + ' ' + A.esc(st) +
          '<span class="count">' + list.length + '</span></div>' +
          (list.length ? list.map(function (j) { return cardHtml(j, A.jobPendenteValor(j, pendMap[j.id])); }).join('') :
            '<div class="empty" style="padding:18px 10px"><span class="muted">vazio</span></div>') +
          '</div>';
      }).join('') || A.empty('Nenhum job encontrado', 'Ajusta a busca ou o filtro.', 'search');

      kb.querySelectorAll('.kcard').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          if (clickSupresso) return;
          if (ev.target.closest('.mv')) return;
          location.hash = '#/jobs/' + el.getAttribute('data-id');
        });
        // ---- drag & drop desktop (HTML5) ----
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', function (ev) {
          dragId = el.getAttribute('data-id');
          el.classList.add('dragging');
          ev.dataTransfer.effectAllowed = 'move';
          try { ev.dataTransfer.setData('text/plain', dragId); } catch (e) { }
        });
        el.addEventListener('dragend', function () {
          el.classList.remove('dragging');
          limparHints();
          dragId = null;
        });
        // ---- drag & drop mobile (long-press) ----
        ligarTouchDrag(el);
      });

      kb.querySelectorAll('.kcol').forEach(function (col) {
        col.addEventListener('dragover', function (ev) {
          if (!dragId) return;
          ev.preventDefault();
          ev.dataTransfer.dropEffect = 'move';
          col.classList.add('drop-hint');
          kanbanAutoscroll(kb, ev.clientX, ev.clientY);
        });
        col.addEventListener('dragleave', function (ev) {
          if (!col.contains(ev.relatedTarget)) col.classList.remove('drop-hint');
        });
        col.addEventListener('drop', function (ev) {
          ev.preventDefault();
          col.classList.remove('drop-hint');
          var id = dragId || (ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '');
          dragId = null;
          mover(byId(id), col.getAttribute('data-st'));
        });
      });

      kb.querySelectorAll('.mv').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var id = btn.closest('.kcard').getAttribute('data-id');
          var job = byId(id);
          A.sheetOptions('Mover "' + (job.cliente || id) + '" pra:', statuses.map(function (s) {
            return { value: s, label: s, icon: window.IAC_ICONS.forStatus(s), badge: s === job.status ? 'atual' : '' };
          }), function (novo) {
            mover(job, novo);
          });
        });
      });
    }

    document.getElementById('jf-busca').addEventListener('input', A.debounce(function (ev) {
      kFiltro.busca = ev.target.value; aplicar();
    }, 250));
    document.getElementById('jf-status').addEventListener('change', function (ev) {
      kFiltro.status = ev.target.value; aplicar();
    });
    aplicar();
  }

  function cardHtml(j, pend) {
    var ctNome = j.contractor ? ((A.cache.ctById[j.contractor] || {}).nome || j.contractor) : null;
    return '<div class="kcard" data-id="' + A.esc(j.id) + '">' +
      '<div class="nm">' + A.esc(j.cliente || '(sem nome)') + '</div>' +
      (pend ? '<div style="margin:2px 0"><span class="badge yellow" title="a work order ja foi finalizada mas falta preencher valor pra o job ir pra Done">⚠️ Falta valor — WO finalizada</span></div>' : '') +
      (ctNome ? '<div style="margin:2px 0"><span class="badge warm" title="job de contractor — quem paga e o contractor">💼 ' + A.esc(ctNome) + '</span></div>' : '') +
      '<div class="sv">' + A.icon(window.IAC_ICONS.forService(j.tipo_servico), 15) + ' ' +
      A.esc(j.tipo_servico || 'servico?') + (j.cidade_st ? ' · ' + A.esc(j.cidade_st) : '') + '</div>' +
      '<div class="ft"><span class="vl">' + A.money(j.valor_total) + '</span>' +
      A.badgePagamento(j.pagamento) +
      '<button class="mv">mover →</button></div>' +
      '</div>';
  }

  /* ====================================================== DETALHE ======== */
  function renderDetalhe(root, id) {
    return Promise.all([
      A.sb.from('jobs').select('*').eq('id', id).maybeSingle(),
      A.sb.from('job_extras').select('*').eq('job_id', id).order('created_at'),
      A.sb.from('work_orders').select('id,sub_id,data,servico,status,valor_repasse,pago_ao_sub').eq('job_id', id).order('data'),
      A.sb.from('job_notes').select('*').eq('job_id', id)
        .order('data', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true })
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      var job = rs[0].data;
      if (!job) { root.innerHTML = A.empty('Job nao encontrado', id); return; }
      desenharDetalhe(root, job, rs[1].data || [], rs[2].data || [], rs[3].data || []);
    });
  }

  function salvarJob(id, patch) {
    return A.sb.from('jobs').update(patch).eq('id', id).then(function (r) {
      if (r.error) throw r.error;
    });
  }

  function desenharDetalhe(root, job, extras, wos, notes) {
    var margem = (job.valor_total !== null && wos.some(function (w) { return w.valor_repasse; }))
      ? Number(job.valor_total) - wos.reduce(function (s, w) { return s + Number(w.valor_repasse || 0); }, 0)
      : null;

    var html =
      '<div class="h-page"><button class="back-btn" onclick="location.hash=\'#/jobs\'">' + A.icon('back', 20) + '</button>' +
      A.esc(job.cliente || job.id) + '<span class="grow"></span>' +
      '<span class="badge warm">' + A.esc(job.status || '—') + '</span></div>' +

      // ---- campos editaveis ----
      '<div class="card"><h3>' + A.icon('estimate', 18) + ' Dados do job <span class="grow"></span><span class="muted" style="font-weight:400">toca no valor pra editar</span></h3>' +
      '<div class="fields" id="j-fields">' +
      A.fld('Cliente', 'cliente', job.cliente) +
      A.fld('Telefone', 'telefone', job.telefone) +
      A.fld('Endereco', 'endereco', job.endereco) +
      A.fld('Cidade/Estado', 'cidade_st', job.cidade_st) +
      A.fld('Servico', 'tipo_servico', job.tipo_servico) +
      A.fld('Sqft', 'sqft', job.sqft) +
      A.fld('Etapa (status)', 'status', job.status) +
      A.fld('Data do projeto', 'data_projeto', A.fmtData(job.data_projeto)) +
      A.fld('Valor total', 'valor_total', job.valor_total === null ? null : A.money(job.valor_total)) +
      A.fld('Pago pelo cliente', 'pago', A.money(job.pago)) +
      A.fld('Pagamento', 'pagamento', job.pagamento) +
      A.fld('Tipo de pgto', 'tipo_pgto', job.tipo_pgto) +
      A.fld('Repasse (status)', 'repasse_status', job.repasse_status) +
      A.fld('Sub', 'sub', A.subNome(job.sub)) +
      A.fld('Contractor', 'contractor', job.contractor ? ((A.cache.ctById[job.contractor] || {}).nome || job.contractor) : null) +
      A.fld('Origem do lead', 'origem', origemLabel(job.origem)) +
      '<div id="j-ind-wrap"' + (job.origem === 'indicacao' ? '' : ' style="display:none"') + '>' +
      A.fld('Indicado por', 'indicado_por', job.indicado_por) +
      '</div>' +
      '</div>' +
      (margem !== null
        ? '<hr class="sep"/><div class="row"><span class="muted">Margem estimada (total − repasses das WOs):</span> <b style="color:' + (margem >= 0 ? 'var(--green)' : 'var(--red)') + '">' + A.money(margem) + '</b></div>'
        : '') +
      '</div>' +

      // ---- notas (timeline de blocos — tabela job_notes) ----
      '<div class="card"><h3>' + A.icon('workorders', 18) + ' Notas <span class="grow"></span>' +
      '<span class="badge" id="j-notes-count">' + notes.length + '</span></h3>' +
      '<div class="note-add">' +
      '<div class="row" style="margin-bottom:6px">' +
      '<input id="nn-titulo" class="grow" placeholder="Titulo (opcional)" />' +
      '<input id="nn-data" type="date" value="' + A.hoje() + '" style="max-width:155px" />' +
      '</div>' +
      '<textarea id="nn-texto" style="min-height:56px" placeholder="Adicionar nota… (o que rolou hoje no job)"></textarea>' +
      '<button class="btn sm" id="nn-add" style="margin-top:6px">+ Adicionar nota</button>' +
      '</div>' +
      '<div id="j-notes-tl" style="margin-top:10px"></div>' +
      '<details style="margin-top:10px"><summary class="muted" style="cursor:pointer">Notas antigas (backup, so leitura)</summary>' +
      '<div class="muted" style="white-space:pre-wrap;font-size:12.5px;margin-top:6px">' +
      A.esc(job.notas || '—') +
      (job.notas_admin ? '\n\n[admin] ' + A.esc(job.notas_admin) : '') + '</div></details>' +
      '</div>' +

      // ---- recado pro cliente ----
      '<div class="card"><h3>' + A.icon('open', 18) + ' Recado pro cliente</h3>' +
      '<label>EN — aparece no portal do cliente</label>' +
      '<textarea id="j-notas-cliente" placeholder="Message shown to the client…">' + A.esc(job.notas_cliente || '') + '</textarea>' +
      '<div class="muted" id="j-notas-st" style="margin-top:4px">Salva sozinho enquanto digita.</div>' +
      '</div>' +

      // ---- extras ----
      '<div class="card"><h3>' + A.icon('plus', 18) + ' Extras <span class="grow"></span><span class="muted" style="font-weight:400">itens extras cobrados do cliente</span></h3>' +
      '<div id="j-extras"></div>' +
      '<hr class="sep"/>' +
      '<div class="row" style="align-items:flex-end">' +
      '<div class="grow" style="min-width:140px"><label>Descricao (PT)</label><input id="ex-desc" placeholder="ex: trocar subfloor banheiro" /></div>' +
      '<div class="grow" style="min-width:140px"><label>Descricao (EN — cliente ve)</label><input id="ex-desc-en" placeholder="e.g. replace bathroom subfloor" /></div>' +
      '<div style="width:110px"><label>Valor $</label><input id="ex-valor" type="number" step="any" placeholder="0" /></div>' +
      '<button class="btn sm" id="ex-add">+ Add</button>' +
      '</div></div>' +

      // ---- invoices / PDFs ----
      '<div class="card"><h3>' + A.icon('receipt', 18) + ' Invoices / PDFs</h3>' +
      '<div id="j-files">' + A.loading() + '</div>' +
      '<label class="btn sec block" style="margin-top:8px;cursor:pointer">Enviar PDF / arquivo' +
      '<input type="file" id="j-upload" style="display:none" /></label>' +
      '</div>' +

      // ---- portal do cliente ----
      '<div class="card"><h3>' + A.icon('open', 18) + ' Portal do cliente</h3><div id="j-portal"></div></div>' +

      // ---- WOs ----
      '<div class="card"><h3>' + A.icon('workorders', 18) + ' Work orders deste job <span class="grow"></span>' +
      '<a class="btn sm" href="#/wo/nova?job=' + encodeURIComponent(job.id) + '">+ Nova WO</a></h3>' +
      (wos.length ? wos.map(function (w) {
        return '<a class="li-row" href="#/wo/' + A.esc(w.id) + '" style="color:inherit">' +
          '<div class="main"><div class="t1">' + A.esc(A.subNome(w.sub_id)) + ' · ' + A.esc(w.servico || '') + '</div>' +
          '<div class="t2">' + A.esc(A.fmtDataDia(w.data)) + ' · repasse ' + A.money(w.valor_repasse) + '</div></div>' +
          '<span class="badge">' + A.esc(w.status || '') + '</span></a>';
      }).join('') : '<div class="muted">Nenhuma work order ainda.</div>') +
      '</div>' +

      // ---- excluir ----
      '<button class="btn danger block" id="j-del">Excluir job</button>';

    root.innerHTML = html;

    // ---------- inline edits ----------
    var subOpts = A.cache.subs.map(function (s) { return { value: s.id, label: s.nome }; });
    var ctOpts = A.cache.contractors.map(function (c) { return { value: c.id, label: c.nome }; });
    A.bindInlineEdits(document.getElementById('j-fields'), function (field) {
      var specs = {
        cliente: { value: job.cliente },
        telefone: { value: job.telefone, type: 'tel' },
        endereco: { value: job.endereco },
        cidade_st: { value: job.cidade_st },
        tipo_servico: { value: job.tipo_servico },
        sqft: { value: job.sqft, type: 'number' },
        status: { value: job.status, type: 'select', options: A.JOB_STATUSES },
        data_projeto: { value: job.data_projeto, type: 'date' },
        valor_total: { value: job.valor_total, type: 'number' },
        pago: { value: job.pago, type: 'number' },
        pagamento: { value: job.pagamento, type: 'select', options: A.PAGAMENTOS },
        tipo_pgto: { value: job.tipo_pgto },
        repasse_status: { value: job.repasse_status, type: 'select', options: A.REPASSE_STATUS },
        sub: { value: job.sub, type: 'select', options: subOpts, allowEmpty: true },
        contractor: { value: job.contractor, type: 'select', options: ctOpts, allowEmpty: true },
        origem: { value: job.origem, type: 'select', options: ORIGENS, allowEmpty: true },
        indicado_por: { value: job.indicado_por }
      };
      var spec = specs[field];
      if (!spec) return null;
      spec.onSave = function (v) {
        var patch = {}; patch[field] = v;
        return salvarJob(job.id, patch).then(function () {
          job[field] = v;
          // se o valor total acabou de ser preenchido e o job tem WO concluida,
          // reavalia o fechamento automatico pra Done na hora.
          if (field === 'valor_total' && v !== null && v !== undefined) {
            A.avaliarJobDone(job.id).then(function (res) {
              if (res.done) {
                job.status = 'Done';
                var b = document.querySelector('.h-page .badge.warm');
                if (b) b.textContent = 'Done';
                A.toast('Job movido pra Done — pendência resolvida ✓', 'ok');
              }
            }).catch(function () { });
          }
          if (field === 'data_projeto') return A.esc(A.fmtData(v));
          if (field === 'valor_total' || field === 'pago') return A.esc(A.money(v));
          if (field === 'sub') return A.esc(A.subNome(v));
          if (field === 'contractor') return A.esc(v ? ((A.cache.ctById[v] || {}).nome || v) : '—');
          if (field === 'origem') {
            var w = document.getElementById('j-ind-wrap');
            if (w) w.style.display = (v === 'indicacao') ? '' : 'none';
            return v ? A.esc(origemLabel(v)) : undefined;
          }
        });
      };
      return spec;
    });

    // ---------- notas em blocos (timeline) ----------
    function ordenarNotas() {
      notes.sort(function (a, b) {
        var da = a.data || '', db = b.data || '';
        if (da !== db) return da < db ? 1 : -1; // data desc
        var ca = a.created_at || '', cb = b.created_at || '';
        return ca < cb ? -1 : ca > cb ? 1 : 0;  // dentro do dia: ordem de criacao
      });
    }
    function pintarNotas() {
      var box = document.getElementById('j-notes-tl');
      document.getElementById('j-notes-count').textContent = notes.length;
      if (!notes.length) {
        box.innerHTML = '<div class="muted">Nenhuma nota ainda. Adiciona a primeira acima.</div>';
        return;
      }
      box.innerHTML = notes.map(function (n, i) {
        return '<div class="note" data-ni="' + i + '">' +
          '<div class="note-h">' +
          '<span class="note-dt">' + A.esc(A.fmtData(n.data)) + '</span>' +
          (n.titulo ? '<b class="note-tt">' + A.esc(n.titulo) + '</b>' : '') +
          '<span class="grow"></span>' +
          '<button class="icon-btn nsm" data-n-edit="' + i + '" title="editar">✎</button>' +
          '<button class="icon-btn red nsm" data-n-del="' + i + '" title="excluir">✕</button>' +
          '</div>' +
          '<div class="note-tx">' + A.esc(n.texto || '') + '</div>' +
          '</div>';
      }).join('');
      box.querySelectorAll('[data-n-edit]').forEach(function (btn) {
        btn.addEventListener('click', function () { editarNota(Number(btn.getAttribute('data-n-edit'))); });
      });
      box.querySelectorAll('[data-n-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = Number(btn.getAttribute('data-n-del'));
          var n = notes[i];
          if (!A.confirmar('Excluir essa nota de ' + A.fmtData(n.data) + '?')) return;
          A.sb.from('job_notes').delete().eq('id', n.id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            notes.splice(i, 1); A.toast('Nota excluida', 'ok'); pintarNotas();
          });
        });
      });
    }
    function editarNota(i) {
      var n = notes[i];
      var div = document.querySelector('#j-notes-tl [data-ni="' + i + '"]');
      if (!div) return;
      div.innerHTML =
        '<div class="row" style="margin-bottom:6px">' +
        '<input class="grow" data-e-tt value="' + A.esc(n.titulo || '') + '" placeholder="Titulo (opcional)" />' +
        '<input data-e-dt type="date" value="' + A.esc(n.data || '') + '" style="max-width:155px" />' +
        '</div>' +
        '<textarea data-e-tx style="min-height:90px">' + A.esc(n.texto || '') + '</textarea>' +
        '<div class="row" style="margin-top:6px">' +
        '<button class="btn sm" data-e-save>Salvar</button>' +
        '<button class="btn sec sm" data-e-cancel>Cancelar</button>' +
        '</div>';
      div.querySelector('[data-e-cancel]').addEventListener('click', function () { pintarNotas(); });
      div.querySelector('[data-e-save]').addEventListener('click', function () {
        var patch = {
          titulo: div.querySelector('[data-e-tt]').value.trim() || null,
          data: div.querySelector('[data-e-dt]').value || null,
          texto: div.querySelector('[data-e-tx]').value.trim() || null
        };
        A.sb.from('job_notes').update(patch).eq('id', n.id).then(function (r) {
          if (r.error) return A.toastErr(r.error);
          n.titulo = patch.titulo; n.data = patch.data; n.texto = patch.texto;
          ordenarNotas(); pintarNotas(); A.toast('Nota salva', 'ok');
        });
      });
    }
    pintarNotas();
    document.getElementById('nn-add').addEventListener('click', function () {
      var texto = document.getElementById('nn-texto').value.trim();
      if (!texto) return A.toast('Escreve a nota primeiro', 'err');
      var row = {
        job_id: job.id,
        data: document.getElementById('nn-data').value || A.hoje(),
        titulo: document.getElementById('nn-titulo').value.trim() || null,
        texto: texto
      };
      A.sb.from('job_notes').insert(row).select().single().then(function (r) {
        if (r.error) return A.toastErr(r.error);
        notes.push(r.data);
        ordenarNotas();
        document.getElementById('nn-texto').value = '';
        document.getElementById('nn-titulo').value = '';
        A.toast('Nota adicionada', 'ok');
        pintarNotas();
      });
    });

    // ---------- recado pro cliente (autosave) ----------
    (function () {
      var ta = document.getElementById('j-notas-cliente');
      var st = document.getElementById('j-notas-st');
      ta.addEventListener('input', A.debounce(function () {
        st.textContent = 'Salvando…';
        salvarJob(job.id, { notas_cliente: ta.value || null }).then(function () {
          job.notas_cliente = ta.value || null;
          st.textContent = 'Salvo ✓';
          A.toast('Salvo', 'ok');
        }).catch(function (e) { st.textContent = 'Erro ao salvar'; A.toastErr(e); });
      }, 900));
    })();

    // ---------- extras ----------
    function pintarExtras() {
      var box = document.getElementById('j-extras');
      if (!extras.length) {
        box.innerHTML = '<div class="muted">Nenhum extra. Adiciona abaixo — extras marcados como visiveis aparecem no portal do cliente.</div>';
        return;
      }
      box.innerHTML = extras.map(function (ex, i) {
        return '<div class="li-row">' +
          '<div class="main"><div class="t1">' + A.esc(ex.descricao || ex.descricao_en || '—') + ' · <b style="color:var(--green)">' + A.money(ex.valor_cliente) + '</b></div>' +
          '<div class="t2">EN: ' + A.esc(ex.descricao_en || '—') + '</div></div>' +
          '<select data-ex-st="' + i + '" style="width:110px;min-height:38px;font-size:12px">' +
          EXTRA_STATUS.map(function (s) { return '<option' + (ex.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>' +
          '<button class="icon-btn" data-ex-vis="' + i + '" title="visivel pro cliente">' +
          (ex.visivel_cliente ? '<span style="color:var(--green);font-weight:800">👁</span>' : '<span style="opacity:.35">👁</span>') + '</button>' +
          '<button class="icon-btn red" data-ex-del="' + i + '">✕</button>' +
          '</div>';
      }).join('') +
        '<div class="muted" style="margin-top:4px">👁 verde = o cliente ve esse extra no portal.</div>';

      box.querySelectorAll('[data-ex-st]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var ex = extras[Number(sel.getAttribute('data-ex-st'))];
          A.sb.from('job_extras').update({ status: sel.value }).eq('id', ex.id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            ex.status = sel.value; A.toast('Salvo', 'ok');
          });
        });
      });
      box.querySelectorAll('[data-ex-vis]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var ex = extras[Number(btn.getAttribute('data-ex-vis'))];
          var novo = !ex.visivel_cliente;
          A.sb.from('job_extras').update({ visivel_cliente: novo }).eq('id', ex.id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            ex.visivel_cliente = novo;
            A.toast(novo ? 'Visivel pro cliente' : 'Escondido do cliente', 'ok');
            pintarExtras();
          });
        });
      });
      box.querySelectorAll('[data-ex-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = Number(btn.getAttribute('data-ex-del'));
          var ex = extras[i];
          if (!A.confirmar('Excluir o extra "' + (ex.descricao || '') + '"?')) return;
          A.sb.from('job_extras').delete().eq('id', ex.id).then(function (r) {
            if (r.error) return A.toastErr(r.error);
            extras.splice(i, 1); A.toast('Extra excluido', 'ok'); pintarExtras();
          });
        });
      });
    }
    pintarExtras();

    document.getElementById('ex-add').addEventListener('click', function () {
      var desc = document.getElementById('ex-desc').value.trim();
      var descEn = document.getElementById('ex-desc-en').value.trim();
      var valor = A.num(document.getElementById('ex-valor').value);
      if (!desc && !descEn) return A.toast('Preenche a descricao do extra', 'err');
      var row = {
        job_id: job.id, descricao: desc || null, descricao_en: descEn || null,
        valor_cliente: valor, status: 'proposto', visivel_cliente: true
      };
      A.sb.from('job_extras').insert(row).select().single().then(function (r) {
        if (r.error) return A.toastErr(r.error);
        extras.push(r.data);
        document.getElementById('ex-desc').value = '';
        document.getElementById('ex-desc-en').value = '';
        document.getElementById('ex-valor').value = '';
        A.toast('Extra adicionado (visivel pro cliente)', 'ok');
        pintarExtras();
      });
    });

    // ---------- invoices (storage) ----------
    var bucket = A.sb.storage.from('invoices');
    function listarArquivos() {
      var box = document.getElementById('j-files');
      bucket.list(job.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } }).then(function (r) {
        if (r.error) { box.innerHTML = '<div class="muted">Nao consegui listar: ' + A.esc(r.error.message) + '</div>'; return; }
        var files = (r.data || []).filter(function (f) { return f.id !== null || f.name.indexOf('.') >= 0; });
        if (!files.length) { box.innerHTML = '<div class="muted">Nenhum arquivo ainda. Sobe o PDF do proposal/invoice aqui.</div>'; return; }
        box.innerHTML = files.map(function (f, i) {
          return '<div class="li-row"><div class="main"><div class="t1">' + A.esc(f.name) + '</div>' +
            '<div class="t2">' + A.esc((f.created_at || '').slice(0, 10)) + '</div></div>' +
            '<button class="icon-btn" data-f-open="' + i + '" title="abrir">' + A.icon('open', 18) + '</button>' +
            '<button class="icon-btn red" data-f-del="' + i + '">✕</button></div>';
        }).join('');
        box.querySelectorAll('[data-f-open]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var f = files[Number(btn.getAttribute('data-f-open'))];
            bucket.createSignedUrl(job.id + '/' + f.name, 3600).then(function (r2) {
              if (r2.error) return A.toastErr(r2.error);
              window.open(r2.data.signedUrl, '_blank');
            });
          });
        });
        box.querySelectorAll('[data-f-del]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var f = files[Number(btn.getAttribute('data-f-del'))];
            if (!A.confirmar('Excluir o arquivo "' + f.name + '"?')) return;
            bucket.remove([job.id + '/' + f.name]).then(function (r2) {
              if (r2.error) return A.toastErr(r2.error);
              A.toast('Arquivo excluido', 'ok'); listarArquivos();
            });
          });
        });
      });
    }
    listarArquivos();

    document.getElementById('j-upload').addEventListener('change', function (ev) {
      var file = ev.target.files[0];
      if (!file) return;
      A.toast('Enviando ' + file.name + '…');
      var nome = file.name.replace(/[^\w.\-]+/g, '_');
      bucket.upload(job.id + '/' + nome, file, { upsert: true }).then(function (r) {
        ev.target.value = '';
        if (r.error) {
          if (/row-level security|Unauthorized|violates/i.test(r.error.message || '')) {
            A.toast('Upload bloqueado: falta rodar as policies do bucket invoices no Supabase (SQL em sistema/supabase/admin_v2.sql)', 'err');
          } else A.toastErr(r.error);
          return;
        }
        A.toast('Arquivo enviado', 'ok');
        listarArquivos();
      });
    });

    // ---------- portal do cliente ----------
    function pintarPortal() {
      var box = document.getElementById('j-portal');
      if (!job.client_token) {
        box.innerHTML = '<div class="muted" style="margin-bottom:8px">Esse job ainda nao tem token de portal.</div>' +
          '<button class="btn sec" id="j-gen-token">Gerar link do cliente</button>';
        document.getElementById('j-gen-token').addEventListener('click', function () {
          var t = A.token32();
          salvarJob(job.id, { client_token: t }).then(function () {
            job.client_token = t; A.toast('Token gerado', 'ok'); pintarPortal();
          }).catch(A.toastErr);
        });
        return;
      }
      var url = A.PAGES + 'client.html?t=' + job.client_token;
      box.innerHTML = '<div class="linkbox"><span class="url">' + A.esc(url) + '</span>' +
        '<button class="icon-btn" id="j-copy-portal">' + A.icon('copy', 18) + '</button></div>' +
        '<div class="muted">Manda esse link pro cliente acompanhar o job (em ingles).</div>';
      document.getElementById('j-copy-portal').addEventListener('click', function () {
        A.copiar(url, 'Link do cliente copiado!');
      });
    }
    pintarPortal();

    // ---------- excluir ----------
    document.getElementById('j-del').addEventListener('click', function () {
      if (!A.confirmarDuplo(
        'Excluir o job de "' + (job.cliente || job.id) + '"? Isso apaga tambem as work orders, checklists e extras dele.',
        'ULTIMA CONFIRMACAO: excluir "' + (job.cliente || job.id) + '" de vez?')) return;
      A.sb.from('jobs').delete().eq('id', job.id).then(function (r) {
        if (r.error) return A.toastErr(r.error);
        A.toast('Job excluido', 'ok');
        location.hash = '#/jobs';
      });
    });
  }
})();
