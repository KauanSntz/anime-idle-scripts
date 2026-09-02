/*
 * AUTO-INVOCAR v8 — cole no F12 do anime-idle e de Enter.
 * Auto abrir baus (x10/50/100) OU auto invocar personagens (x10 por ouro).
 * Modosmutuamente exclusivos: ativa um desativa o outro.
 * Le o Registro de invocacoes (#battle-log) e pausa quando sair QUALQUER
 * raridade da lista 'parar quando' (padrao Lendario + Mitico) ou quando
 * achar QUALQUER boneco da lista de alvos configurada.
 * 100% local, nada de rede, nao precisa de registro.
 *
 * Pausa v8: o timer NUNCA e reiniciado por linhas que o proprio script
 * causou (lote antigo chegando). A pausa so:
 *   - REINICIA se VOCE clicar num botao de invocar durante ela e o seu
 *     lote trouxer outro L/M/alvo; e
 *   - ENCERRA NA HORA se o SEU clique veio limpo (volta o timing normal).
 * Se voce nao clicar, ela so acaba no fim do countdown (como sempre).
 *
 * Chega PARADO (padrao). Liga clicando no botao ou __sm.start().
 * Botao ON/OFF + engrenagem de configuracao (painel so abre com o botao
 * PARADO). Segure e arraste o botao pra mover (posicao e configs salvas).
 * F5 desliga tudo; recolar o script restaura as configs salvas.
 * TODAS as configs de tempo sao em SEGUNDOS.
 *
 * API no console:
 *   __sm.start()        liga
 *   __sm.stop()         desliga
 *   __sm.status()       estado + contadores + posicao dos botoes do jogo
 *   __sm.retomar()      encerra a pausa na hora
 *   __sm.intervalo(s)   tempo minimo entre cliques, em segundos (padrao 1)
 *   __sm.pausaSec(n)    duracao da pausa ao achar L/M ou alvo (padrao 5)
 *   __sm.extraClicks(n) cliques no botao Continuar pra sair da tela (padrao 2)
 *   __sm.modo()         retorna modo atual ('bau' ou 'invoc')
 *   __sm.modo('bau')    troca pra modo baú
 *   __sm.modo('invoc')  troca pra modo invocação
 */
(function () {
  'use strict';
  if (window.__sm) { console.warn('[auto-invocar] ja esta ativo nesta aba. Troque as opcoes via __sm.status().'); return window.__sm; }

  var SEL_LOG = '#battle-log';
  var SEL_BAU_10 = '.bau-abrir[data-n="10"]';
  var SEL_BAU_50 = '.bau-abrir[data-n="50"]';
  var SEL_BAU_100 = '.bau-abrir[data-n="100"]';
  var SEL_SM_GOLD_10 = '#sm-gold-10';
  var SEL_NEXT = '#reveal-continue';
  var TIPO_BAU = 10;
  var MODO_PADRAO = 'bau';
  var modoAtual = MODO_PADRAO;
  var LS_POS = 'auto-invocar-pos';
  var LS_CFG = 'auto-invocar-config';

  var LOOP_MS = 200;
  var BATCH_MS = 2500;
  var EXTRA_CLICKS = 2;
  var EXTRA_GAP_MS = 200;
  var PAUSE_MS = 5000;
  var MAX_NEXT_HITS = 8;
  var DRAG_LIMIT = 6;
  var MAX_ALVOS = 10;

  var RAR_N = { 'comum': 'Comum', 'incomum': 'Incomum', 'raro': 'Raro', 'epico': 'Épico', 'lendario': 'Lendário', 'mitico': 'Mítico' };
  var RAR_CLS = { 'rg-r1': 'Comum', 'rg-r2': 'Incomum', 'rg-r3': 'Raro', 'rg-r4': 'Épico', 'rg-r5': 'Lendário', 'rg-r6': 'Mítico' };
  var RAR_LIST = ['Qualquer', 'Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];
  var RAR_PARAR = ['Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];
  var ALCARAVEL = { 'Mítico': 'MITICO', 'Lendário': 'LENDARIO' };

  function alvoLimpo() { return { nome: '', rar: 'Qualquer' }; }

  var CFG_DEFAULT = { intervalo: 1, pausa: 5, extra: EXTRA_CLICKS, mostraNome: true, alvos: [alvoLimpo()], pararRares: ['Lendário', 'Mítico'], tipoBaum: 10, modo: MODO_PADRAO };
  var cfg = CFG_DEFAULT;

  try {
    var salvoCfg = JSON.parse(localStorage.getItem(LS_CFG) || 'null');
    if (salvoCfg && typeof salvoCfg === 'object') {
      var novoCfg = { intervalo: 1, pausa: 5, extra: EXTRA_CLICKS, mostraNome: true, alvos: [alvoLimpo()], pararRares: ['Lendário', 'Mítico'], tipoBaum: 10, modo: MODO_PADRAO };
      if (isFinite(salvoCfg.intervalo) && salvoCfg.intervalo > 0) {
        novoCfg.intervalo = salvoCfg.intervalo >= 200 ? salvoCfg.intervalo / 1000 : salvoCfg.intervalo;
        if (novoCfg.intervalo < 0.2) novoCfg.intervalo = 0.2;
      }
      if (isFinite(salvoCfg.pausa) && salvoCfg.pausa > 0) novoCfg.pausa = salvoCfg.pausa;
      if (isFinite(salvoCfg.extra) && salvoCfg.extra >= 0 && salvoCfg.extra <= 10) novoCfg.extra = salvoCfg.extra;
      if (typeof salvoCfg.mostraNome === 'boolean') novoCfg.mostraNome = salvoCfg.mostraNome;
      if (salvoCfg.tipoBaum && [10, 50, 100].indexOf(salvoCfg.tipoBaum) !== -1) novoCfg.tipoBaum = salvoCfg.tipoBaum;
      if (typeof salvoCfg.modo === 'string' && (salvoCfg.modo === 'bau' || salvoCfg.modo === 'invoc')) novoCfg.modo = salvoCfg.modo;
      if (Array.isArray(salvoCfg.alvos) && salvoCfg.alvos.length) {
        var alvosOk = [];
        for (var ai = 0; ai < salvoCfg.alvos.length && alvosOk.length < MAX_ALVOS; ai++) {
          var a = salvoCfg.alvos[ai];
          if (a && typeof a === 'object') {
            alvosOk.push({
              nome: (typeof a.nome === 'string' ? a.nome : '').trim().slice(0, 60),
              rar: RAR_LIST.indexOf(a.rar) !== -1 ? a.rar : 'Qualquer'
            });
          }
        }
        novoCfg.alvos = alvosOk.length ? alvosOk : [alvoLimpo()];
      } else if (typeof salvoCfg.alvoNome === 'string' || typeof salvoCfg.alvoRar === 'string') {
        novoCfg.alvos = [{
          nome: typeof salvoCfg.alvoNome === 'string' ? salvoCfg.alvoNome : '',
          rar: RAR_LIST.indexOf(salvoCfg.alvoRar) !== -1 ? salvoCfg.alvoRar : 'Qualquer'
        }];
      }
      if (Array.isArray(salvoCfg.pararRares)) {
        var raresOk = [];
        for (var rp = 0; rp < salvoCfg.pararRares.length; rp++) {
          var rv = salvoCfg.pararRares[rp];
          if (RAR_PARAR.indexOf(rv) !== -1 && raresOk.indexOf(rv) === -1) raresOk.push(rv);
        }
        novoCfg.pararRares = raresOk;
      }
      cfg = novoCfg;
    }
  } catch (e) {}

  var ativo = false;
  var pausado = false;
  var pausaEm = { rar: null, nome: null, tipo: 'ml', ate: 0, inicio: 0 };
  var clicouEm = 0;
  var clickGap = Math.round(cfg.intervalo * 1000);
  var extra = cfg.extra;
  var pauseMs = cfg.pausa * 1000;
  var mostrarNome = cfg.mostraNome;
  var alvos = cfg.alvos;
  var pararRares = cfg.pararRares;
  var tipoBaum = cfg.tipoBaum || 10;
  var modoAtual = cfg.modo || MODO_PADRAO;

  var counts = { 'Mítico': 0, 'Lendário': 0, 'Épico': 0, 'Raro': 0, 'Incomum': 0, 'Comum': 0 };
  var novos = 0, copias = 0, totalClicks = 0, ultimo = null;
  var seqClick = 0, bufferNovas = [];

  var processados = new Set();
  var lastSumClick = 0, nextHits = 0, nextCooldownUntil = 0, fechando = false, lastLogBusca = 0;
  var timer = null, banner = null, wrap = null, btn = null, gear = null, panel = null, f = null;
  var iIntervalo = null, iPausa = null, iExtra = null, btnNome = null, alvoLista = null, pararLista = null;
  var tabBau = null, tabInvoc = null, modoPainel = null, modoTabs = null;
  var rTipoBaum = null, btnTipo10 = null, btnTipo50 = null, btnTipo100 = null;
  var renderPainelConteudo = null;

  function q(s) { try { return document.querySelector(s); } catch (e) { return null; } }
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i').replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u').replace(/ç/g, 'c');
  }
  function visivel(el) {
    if (!el) return false;
    try { return el.getClientRects().length > 0; } catch (e) { return false; }
  }
  function apto(el) {
    if (!el) return false;
    if (el.disabled) return false;
    var c = (typeof el.className === 'string') ? el.className : '';
    return c.indexOf('disabled') === -1 && c.indexOf('lock') === -1;
  }
  function clicar(el) {
    try { el.click(); totalClicks++; } catch (e) {}
  }

  function lerLinha(el) {
    var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    var m = /^Voc(e|ê) invocou\s+(.+?)\s+\(([^)]+)\)(?:\s*·\s*(.*))?$/i.exec(txt);
    if (!m) return;
    var nome = m[2].trim(), rarTx = m[3].trim(), tag = (m[4] || '').trim();
    var rar = RAR_N[norm(rarTx)];
    if (!rar) {
      var c = (typeof el.className === 'string') ? el.className : '';
      for (var k in RAR_CLS) { if (c.indexOf(k) !== -1) { rar = RAR_CLS[k]; break; } }
    }
    if (!rar) return;
    var t = Date.now();
    var ehNovo = norm(tag).indexOf('nova') !== -1;
    counts[rar]++;
    if (ehNovo) novos++; else copias++;
    ultimo = { nome: nome, rar: rar, novo: ehNovo, t: t };
    bufferNovas.push({ t: t, txt: txt });
    if (bufferNovas.length > 40) bufferNovas.shift();
    console.log('[auto-invocar] ' + (ehNovo ? 'NOVA: ' : 'copia: ') + nome + ' (' + rar + ')');
    for (var ti = 0; ti < alvos.length; ti++) {
      var al = alvos[ti];
      if (!al) continue;
      if (!al.nome && al.rar === 'Qualquer') continue;
      var bate = true;
      if (al.nome && norm(nome).indexOf(norm(al.nome)) === -1) bate = false;
      if (bate && al.rar !== 'Qualquer' && rar !== al.rar) bate = false;
      if (bate) { disparaPausa(nome, rar, 'alvo', t); break; }
    }
    if (pararRares.indexOf(rar) !== -1) disparaPausa(nome, rar, 'ml', t);
  }

  function escanear() {
    var log = q(SEL_LOG);
    if (!log) return;
    var kids = log.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (processados.has(el)) continue;
      processados.add(el);
      var c = (typeof el.className === 'string') ? el.className : '';
      if (c.indexOf('rg-r') === -1) continue;
      lerLinha(el);
    }
  }

  function disparaPausa(nome, rar, tipo, tLinha) {
    var alvo = tipo === 'alvo';
    var rotulo = alvo ? 'ALVO' : (ALCARAVEL[rar] || String(rar || '').toUpperCase());
    var t = typeof tLinha === 'number' ? tLinha : Date.now();
    if (pausado) {
      var doSeuClique = clicouEm > 0 && clicouEm >= pausaEm.inicio
        && t >= clicouEm - 400 && t <= clicouEm + BATCH_MS;
      if (!doSeuClique) {
        pausaEm.rar = rar;
        pausaEm.nome = nome;
        pausaEm.tipo = alvo ? 'alvo' : 'ml';
        console.log('[auto-invocar] notado ' + rotulo + ': ' + nome + (rar ? ' (' + rar + ')' : '') + ' — lote do script/imagem antiga, pausa NAO reiniciada (sem clique seu).');
        bannerAtualiza();
        btnEstado();
        return;
      }
      console.log('[auto-invocar] >>> ' + rotulo + ': ' + nome + ' (veio do SEU clique) — pausa reiniciada.');
    } else {
      console.log('[auto-invocar] >>> ' + rotulo + ': ' + nome + (rar ? ' (' + rar + ')' : '') + ' — pausado ' + (pauseMs / 1000) + 's (clique manual ou espere o countdown).');
    }
    pausado = true;
    pausaEm = { rar: rar, nome: nome, tipo: alvo ? 'alvo' : 'ml', ate: Date.now() + pauseMs, inicio: Date.now() };
    bannerAtualiza();
    btnEstado();
  }

  function fecharTela() {
    if (fechando) return;
    var el0 = q(SEL_NEXT);
    if (!visivel(el0)) return;
    fechando = true;
    var n = 1 + extra;
    (function passo(i) {
      var el = q(SEL_NEXT);
      if (!visivel(el)) { fechando = false; return; }
      clicar(el);
      console.log('[auto-invocar] fechando tela (Continuar) ' + i + '/' + n + '...');
      if (i < n) { setTimeout(function () { passo(i + 1); }, EXTRA_GAP_MS); }
      else fechando = false;
    })(1);
  }

  function conferirClick(antes, seqn, t0) {
    var log = q(SEL_LOG);
    var agora = log ? log.children.length : -1;
    var delta = (agora >= 0 && antes >= 0) ? (agora - antes) : null;
    var rec = [];
    for (var i = 0; i < bufferNovas.length; i++) if (bufferNovas[i].t >= t0) rec.push(bufferNovas[i].txt);
    console.log('[auto-invocar] conferencia do click #' + seqn + ': linhas ' + antes + ' -> ' + agora + (delta != null ? ' (' + (delta >= 0 ? '+' : '') + delta + ')' : '') + ' | "Voce invocou" novas: ' + rec.length);
    if (rec.length) console.log('[auto-invocar]   ' + rec.join('\n[auto-invocar]   '));
    if (delta != null && delta <= 0) {
      console.warn('[auto-invocar] o registro nao ganhou linhas apos o clique — sem ouro/tela travada? (aqui o jogo mostra +10)');
    }
  }

  function tick() {
    if (!ativo) return;
    escanear();
    if (pausado) {
      bannerAtualiza();
      if (clicouEm >= pausaEm.inicio && Date.now() - clicouEm >= BATCH_MS) {
        pausado = false;
        clicouEm = 0;
        bannerEsconde();
        btnEstado();
        console.log('[auto-invocar] seu clique veio limpo — pausa encerrada, invocacao automatica retomada.');
      } else if (Date.now() >= pausaEm.ate) {
        pausado = false;
        bannerEsconde();
        btnEstado();
        console.log('[auto-invocar] pausa encerrada — voltando a invocar sozinho.');
      }
      return;
    }
    // Fechar tela de resultado se visivel (prioridade em qualquer modo)
    var continuar = q(SEL_NEXT);
    if (visivel(continuar)) {
      fecharTela();
      return;
    }
    // Selecionar botão baseado no modo atual
    var btnAlvo = null;
    var tipoTxt = '';
    if (modoAtual === 'bau') {
      if (TIPO_BAU === 100) { btnAlvo = q(SEL_BAU_100); tipoTxt = 'x100'; }
      else if (TIPO_BAU === 50) { btnAlvo = q(SEL_BAU_50); tipoTxt = 'x50'; }
      else { btnAlvo = q(SEL_BAU_10); tipoTxt = 'x10'; }
    } else {
      btnAlvo = q(SEL_SM_GOLD_10);
      tipoTxt = 'invoc x10';
    }
    if (visivel(btnAlvo) && apto(btnAlvo) && Date.now() - lastSumClick >= clickGap) {
      lastSumClick = Date.now();
      var antes = q(SEL_LOG) ? q(SEL_LOG).children.length : -1;
      seqClick++;
      clicar(btnAlvo);
      console.log('[auto-invocar] clicando em ' + tipoTxt + ' (linhas no registro: ' + antes + ') — conferindo em 2.5s...');
      setTimeout(function () { conferirClick(antes, seqClick, lastSumClick); }, BATCH_MS);
    } else if (!visivel(btnAlvo)) {
      if (Date.now() - lastLogBusca > 30000) {
        lastLogBusca = Date.now();
        console.warn('[auto-invocar] botao de ' + tipoTxt + ' nao encontrado — a tela correta esta aberta no jogo?');
      }
    }
  }

  function bannerEl() {
    if (banner && document.body && document.body.contains(banner)) return banner;
    banner = document.createElement('div');
    banner.id = 'auto-invocar-banner';
    banner.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;font:bold 14px/1.4 sans-serif;background:rgba(10,10,20,.93);color:#ffd75e;padding:8px 14px;border:2px solid #ffd75e;border-radius:8px;pointer-events:none;text-align:center;box-shadow:0 0 14px rgba(255,215,94,.45);white-space:nowrap';
    (document.body || document.documentElement).appendChild(banner);
    return banner;
  }
  function bannerAtualiza() {
    var el = bannerEl();
    if (!pausado || (!pausaEm.rar && pausaEm.tipo !== 'alvo')) { el.style.display = 'none'; return; }
    var rest = Math.max(0, Math.ceil((pausaEm.ate - Date.now()) / 1000));
    var txt = '';
    if (pausaEm.tipo === 'alvo') {
      txt = mostrarNome ? ('ALVO: ' + pausaEm.nome + (pausaEm.rar ? ' (' + pausaEm.rar + ')' : '')) : 'ALVO';
    } else {
      var rot = ALCARAVEL[pausaEm.rar] || String(pausaEm.rar || '').toUpperCase();
      txt = rot + (mostrarNome ? (': ' + pausaEm.nome + ' (' + pausaEm.rar + ')') : '');
    }
    el.textContent = '\u2605 ' + (txt ? txt + ' — ' : '') + 'clique para invocar, ou auto volta em ' + rest + 's';
    el.style.display = 'block';
  }
  function bannerEsconde() {
    if (banner) banner.style.display = 'none';
  }

  function diagBtn(sel) {
    var el = q(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      achado: true,
      visivel: visivel(el),
      disabled: !!el.disabled,
      pos: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      texto: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)
    };
  }

  function status() {
    var st = {
      ativo: ativo,
      modo: modoAtual,
      pausado: pausado,
      pausa: pausado ? { rar: pausaEm.rar, nome: pausaEm.nome, tipo: pausaEm.tipo, voltaEm: Math.max(0, Math.ceil((pausaEm.ate - Date.now()) / 1000)) } : null,
      contagem: counts,
      novos: novos,
      copias: copias,
      cliquesTotais: totalClicks,
      ultimo: ultimo,
      intervalo: clickGap / 1000,
      extraClicks: extra,
      pausaSec: pauseMs / 1000,
      mostrarNome: mostrarNome,
      pararRares: pararRares.slice(),
      alvos: alvos.map(function (a) { return { nome: a.nome, rar: a.rar }; }),
      registroPresente: !!q(SEL_LOG),
      botaoBauVisivel: visivel(q(SEL_BAU_100)) || visivel(q(SEL_BAU_50)) || visivel(q(SEL_BAU_10)),
      botaoInvocVisivel: visivel(q(SEL_SM_GOLD_10)),
      botaoContinuarVisivel: visivel(q(SEL_NEXT)),
      tipoBaum: TIPO_BAU,
      botaoBau: diagBtn(TIPO_BAU === 10 ? SEL_BAU_10 : TIPO_BAU === 50 ? SEL_BAU_50 : SEL_BAU_100),
      botaoInvoc: diagBtn(SEL_SM_GOLD_10),
      botaoContinuar: diagBtn(SEL_NEXT)
    };
    console.log('[auto-invocar] status:', JSON.stringify(st, null, 2));
    return st;
  }

  /* ---------- UI: botao ON/OFF + engrenagem + painel ---------- */

  function saveCfg() {
    try {
      localStorage.setItem(LS_CFG, JSON.stringify({
        intervalo: clickGap / 1000,
        pausa: pauseMs / 1000,
        extra: extra,
        mostraNome: mostrarNome,
        alvos: alvos.map(function (a) { return { nome: a.nome, rar: a.rar }; }),
        pararRares: pararRares.slice(),
        tipoBaum: TIPO_BAU,
        modo: modoAtual
      }));
    } catch (e) {}
  }

  function montarUI() {
    if (wrap && document.body && document.body.contains(wrap)) return;
    wrap = document.createElement('div');
    wrap.id = 'auto-invocar-wrap';
    wrap.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483646;display:flex;align-items:center;gap:6px;pointer-events:auto';

    gear = document.createElement('div');
    gear.id = 'auto-invocar-gear';
    gear.textContent = '\u2699';
    gear.title = 'Configuracoes';
    gear.style.cssText = 'font:700 16px/1 sans-serif;padding:8px 9px;border-radius:50%;border:2px solid #fff;color:#fff;cursor:pointer;user-select:none;-webkit-user-select:none;background:rgba(40,42,52,.95);text-align:center;line-height:1';

    btn = document.createElement('div');
    btn.id = 'auto-invocar-btn';
    btn.title = 'Auto-invocar ON/OFF (segure e arraste pra mover)';
    btn.style.cssText = 'font:bold 13px/1 sans-serif;padding:10px 14px;border-radius:22px;border:2px solid #fff;color:#fff;cursor:pointer;user-select:none;-webkit-user-select:none;text-align:center;background:rgba(40,42,52,.95);white-space:nowrap';

    panel = document.createElement('div');
    panel.id = 'auto-invocar-panel';
    panel.style.cssText = 'position:absolute;right:0;bottom:calc(100% + 8px);display:none;flex-direction:column;background:rgba(15,17,24,.95);border:1px solid rgba(120,130,150,.4);border-radius:8px;padding:10px 12px;font:11px/1 sans-serif;color:#c9d1d9;min-width:220px;box-shadow:0 4px 16px rgba(0,0,0,.5)';

    modoTabs = document.createElement('div');
    modoTabs.style.cssText = 'display:flex;gap:4px;margin-bottom:8px';
    tabBau = document.createElement('div');
    tabBau.textContent = 'Baú';
    tabBau.style.cssText = 'flex:1;text-align:center;font:bold 11px/1 sans-serif;padding:6px 4px;border-radius:6px;cursor:pointer;background:#21262d;color:#8b949e;border:1px solid #30363d';
    tabBau.addEventListener('click', function() { trocarModo('bau'); });
    modoTabs.appendChild(tabBau);
    tabInvoc = document.createElement('div');
    tabInvoc.textContent = 'Invocação';
    tabInvoc.style.cssText = 'flex:1;text-align:center;font:bold 11px/1 sans-serif;padding:6px 4px;border-radius:6px;cursor:pointer;background:#21262d;color:#8b949e;border:1px solid #30363d';
    tabInvoc.addEventListener('click', function() { trocarModo('invoc'); });
    modoTabs.appendChild(tabInvoc);
    panel.appendChild(modoTabs);
    modoPainel = document.createElement('div');
    modoPainel.id = 'auto-invocar-modo-painel';
    panel.appendChild(modoPainel);

    renderPainelConteudo = function() {
      modoPainel.innerHTML = '';
      if (modoAtual === 'bau') {
        iIntervalo = inp(clickGap / 1000, 0.2, 60, 0.1);
        iIntervalo.addEventListener('change', function () { intervalo(parseFloat(this.value)); });
        iIntervalo.addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
        modoPainel.appendChild(row('atraso entre cliques (s)', iIntervalo));
        rTipoBaum = document.createElement('div');
        rTipoBaum.id = 'auto-invocar-tipo-bau';
        rTipoBaum.appendChild(lbl('tipo de baú'));
        btnTipo10 = document.createElement('div');
        btnTipo10.textContent = '×10 baús';
        btnTipo10.style.cssText = 'width:32%;text-align:center;font:bold 11px/1 sans-serif;color:#7ee787;background:#0d1117;border:1px dashed #2ea043;border-radius:5px;padding:5px 0;cursor:pointer;box-sizing:border-box';
        btnTipo10.addEventListener('click', function() { TIPO_BAU = 10; saveCfg(); renderTipoBaum(); });
        rTipoBaum.appendChild(btnTipo10);
        btnTipo50 = document.createElement('div');
        btnTipo50.textContent = '×50 baús';
        btnTipo50.style.cssText = 'width:32%;text-align:center;font:bold 11px/1 sans-serif;color:#7ee787;background:#0d1117;border:1px dashed #2ea043;border-radius:5px;padding:5px 0;cursor:pointer;box-sizing:border-box';
        btnTipo50.addEventListener('click', function() { TIPO_BAU = 50; saveCfg(); renderTipoBaum(); });
        rTipoBaum.appendChild(btnTipo50);
        btnTipo100 = document.createElement('div');
        btnTipo100.textContent = '×100 baús';
        btnTipo100.style.cssText = 'width:32%;text-align:center;font:bold 11px/1 sans-serif;color:#7ee787;background:#0d1117;border:1px dashed #2ea043;border-radius:5px;padding:5px 0;cursor:pointer;box-sizing:border-box';
        btnTipo100.addEventListener('click', function() { TIPO_BAU = 100; saveCfg(); renderTipoBaum(); });
        rTipoBaum.appendChild(btnTipo100);
        modoPainel.appendChild(rTipoBaum);
        renderTipoBaum();
      } else {
        iIntervalo = inp(clickGap / 1000, 0.2, 60, 0.1);
        iIntervalo.addEventListener('change', function () { intervalo(parseFloat(this.value)); });
        iIntervalo.addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
        modoPainel.appendChild(row('atraso entre cliques (s)', iIntervalo));
        iPausa = inp(Math.round(pauseMs / 1000), 1, 300, 1);
        iPausa.addEventListener('change', function () { pausaSec(parseFloat(this.value)); });
        iPausa.addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
        modoPainel.appendChild(row('pausa ao achar L/M (s)', iPausa));
        iExtra = inp(extra, 0, 10, 1);
        iExtra.addEventListener('change', function () { extraClicks(parseInt(this.value, 10)); });
        iExtra.addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
        modoPainel.appendChild(row('cliques no continuar', iExtra));
        var rAlvo = document.createElement('div');
        rAlvo.appendChild(lbl('parar ao encontrar (bonecos)'));
        alvoLista = document.createElement('div');
        alvoLista.style.cssText = 'display:flex;flex-direction:column;gap:4px';
        rAlvo.appendChild(alvoLista);
        var btnAddAlvo = document.createElement('div');
        btnAddAlvo.textContent = '+ Adicionar boneco';
        btnAddAlvo.title = 'Adicionar mais um boneco a busca';
        btnAddAlvo.style.cssText = 'width:100%;text-align:center;font:bold 11px/1 sans-serif;color:#7ee787;background:#0d1117;border:1px dashed #2ea043;border-radius:5px;padding:5px 6px;cursor:pointer;box-sizing:border-box';
        btnAddAlvo.addEventListener('click', function () {
          if (alvos.length >= MAX_ALVOS) { console.warn('[auto-invocar] limite de ' + MAX_ALVOS + ' bonecos atingido.'); return; }
          alvos.push(alvoLimpo());
          saveCfg();
          renderAlvos();
        });
        rAlvo.appendChild(btnAddAlvo);
        modoPainel.appendChild(rAlvo);
        var rParar = document.createElement('div');
        rParar.appendChild(lbl('parar quando (raridades)'));
        pararLista = document.createElement('div');
        pararLista.style.cssText = 'display:flex;flex-direction:column;gap:4px';
        rParar.appendChild(pararLista);
        var btnAddParar = document.createElement('div');
        btnAddParar.textContent = '+ Adicionar raridade';
        btnAddParar.title = 'Adicionar mais uma raridade que dispara a pausa';
        btnAddParar.style.cssText = 'width:100%;text-align:center;font:bold 11px/1 sans-serif;color:#7ee787;background:#0d1117;border:1px dashed #2ea043;border-radius:5px;padding:5px 6px;cursor:pointer;box-sizing:border-box';
        btnAddParar.addEventListener('click', function () {
          if (pararRares.length >= RAR_PARAR.length) { console.warn('[auto-invocar] todas as ' + RAR_PARAR.length + ' raridades ja estao na lista.'); return; }
          var falta = null;
          for (var rp = 0; rp < RAR_PARAR.length; rp++) if (pararRares.indexOf(RAR_PARAR[rp]) === -1) { falta = RAR_PARAR[rp]; break; }
          pararRares.push(falta);
          saveCfg();
          renderParar();
        });
        rParar.appendChild(btnAddParar);
        modoPainel.appendChild(rParar);
        var rNome = document.createElement('div');
        rNome.appendChild(lbl('mostrar nome do boneco'));
        btnNome = document.createElement('div');
        btnNome.style.cssText = 'width:100%;text-align:center;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:5px;padding:4px 6px;font:bold 12px/1 monospace;cursor:pointer;box-sizing:border-box';
        btnNome.addEventListener('click', function () {
          mostrarNome = !mostrarNome;
          btnNome.textContent = mostrarNome ? 'ON' : 'OFF';
          btnNome.style.color = mostrarNome ? '#7ee787' : '#d29922';
          bannerAtualiza();
          saveCfg();
        });
        rNome.appendChild(btnNome);
        modoPainel.appendChild(rNome);
        renderAlvos();
        renderParar();
        btnNome.textContent = mostrarNome ? 'ON' : 'OFF';
        btnNome.style.color = mostrarNome ? '#7ee787' : '#d29922';
      }
    }

    renderPainelConteudo();
    f = document.createElement('div');
    f.textContent = 'Recolher (\u2715)';
    f.style.cssText = 'text-align:center;font:bold 11px/1 sans-serif;color:#fff;background:#b42318;border:1px solid #f85149;border-radius:6px;padding:6px 8px;cursor:pointer;margin-top:2px';
    f.addEventListener('click', fecharPainel);
    panel.appendChild(f);

    wrap.appendChild(gear);
    wrap.appendChild(btn);
    wrap.appendChild(panel);
    (document.body || document.documentElement).appendChild(wrap);

    var pos = null;
    try { pos = JSON.parse(localStorage.getItem(LS_POS) || 'null'); } catch (e) { pos = null; }
    if (pos && typeof pos.left === 'number') {
      wrap.style.right = 'auto';
      wrap.style.bottom = 'auto';
      wrap.style.left = pos.left + 'px';
      wrap.style.top = pos.top + 'px';
    }

    var arrastando = false, moved = false, dx0 = 0, dy0 = 0, downUI = false;
    wrap.addEventListener('pointerdown', function (e) {
      if (panel && panel.style.display !== 'none' && panel.contains(e.target)) { downUI = true; return; }
      if (e.target === gear) { downUI = true; return; }
      downUI = false;
      arrastando = true; moved = false; dx0 = e.clientX; dy0 = e.clientY;
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!arrastando) return;
      if (!moved && Math.abs(e.clientX - dx0) + Math.abs(e.clientY - dy0) > DRAG_LIMIT) {
        moved = true;
        wrap.style.right = 'auto';
        wrap.style.bottom = 'auto';
        wrap.style.cursor = 'grabbing';
      }
      if (!moved) return;
      var l = e.clientX - Math.round(wrap.offsetWidth / 2);
      var t = e.clientY - Math.round(wrap.offsetHeight / 2);
      l = Math.max(4, Math.min(l, window.innerWidth - wrap.offsetWidth - 4));
      t = Math.max(4, Math.min(t, window.innerHeight - wrap.offsetHeight - 4));
      wrap.style.left = l + 'px';
      wrap.style.top = t + 'px';
    });
    wrap.addEventListener('pointerup', function () {
      if (!arrastando) return;
      arrastando = false;
      wrap.style.cursor = '';
      if (moved) {
        try {
          localStorage.setItem(LS_POS, JSON.stringify({
            left: parseInt(wrap.style.left, 10),
            top: parseInt(wrap.style.top, 10)
          }));
        } catch (err) {}
        console.log('[auto-invocar] botao movido pra [' + wrap.style.left + ',' + wrap.style.top + '] (salvo).');
      } else if (!downUI) {
        toggle();
      }
    });
    wrap.addEventListener('pointercancel', function () { arrastando = false; wrap.style.cursor = ''; });

    gear.addEventListener('click', function (e) {
      e.stopPropagation();
      if (ativo) {
        fecharPainel();
        console.warn('[auto-invocar] configuracao so com o botao PARADO — desligue primeiro (clique no botao ou __sm.stop()).');
        return;
      }
      if (panel.style.display === 'none' || !panel.style.display) { abrirPainel(); } else { fecharPainel(); }
    });

    document.addEventListener('pointerdown', function (e) {
      if (!panel || panel.style.display === 'none') return;
      if (e.target === wrap || wrap.contains(e.target)) return;
      fecharPainel();
    });

    btnEstado();
  }

  function lbl(t) {
    var l = document.createElement('div');
    l.textContent = t;
    l.style.cssText = 'color:#8b949e;font-size:10px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px';
    return l;
  }
  function inp(v, min, max, step) {
    var i = document.createElement('input');
    i.type = 'number';
    i.value = v;
    i.min = min;
    i.max = max;
    i.step = step;
    i.style.cssText = 'width:100%;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:5px;padding:4px 6px;font:12px/1 monospace;box-sizing:border-box';
    return i;
  }
  function row(rotulo, campo) {
    var r = document.createElement('div');
    r.appendChild(lbl(rotulo));
    r.appendChild(campo);
    return r;
  }

  function renderAlvos() {
    if (!alvoLista) return;
    alvoLista.innerHTML = '';
    for (var i = 0; i < alvos.length; i++) {
      (function (idx) {
        var linha = document.createElement('div');
        linha.style.cssText = 'display:flex;gap:4px;align-items:center';
        var txt = document.createElement('input');
        txt.type = 'text';
        txt.placeholder = 'ex: saori';
        txt.value = alvos[idx].nome;
        txt.style.cssText = 'flex:1;min-width:0;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:5px;padding:4px 6px;font:12px/1 monospace;box-sizing:border-box';
        txt.addEventListener('change', function () { alvos[idx].nome = this.value.trim(); saveCfg(); });
        txt.addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
        var sel = document.createElement('select');
        for (var ri = 0; ri < RAR_LIST.length; ri++) {
          var op = document.createElement('option');
          op.value = RAR_LIST[ri];
          op.textContent = RAR_LIST[ri];
          sel.appendChild(op);
        }
        sel.value = alvos[idx].rar;
        sel.style.cssText = 'background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:5px;padding:4px 4px;font:12px/1 monospace';
        sel.addEventListener('change', function () { alvos[idx].rar = this.value; saveCfg(); });
        var x = document.createElement('div');
        x.textContent = '\u2715';
        x.title = 'Remover boneco';
        x.style.cssText = 'font:bold 12px/1 sans-serif;color:#fff;background:#b42318;border:1px solid #f85149;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0';
        x.addEventListener('click', function () {
          alvos.splice(idx, 1);
          if (!alvos.length) alvos.push(alvoLimpo());
          saveCfg();
          renderAlvos();
        });
        linha.appendChild(txt);
        linha.appendChild(sel);
        linha.appendChild(x);
        alvoLista.appendChild(linha);
      })(i);
    }
  }

  function renderParar() {
    if (!pararLista) return;
    pararLista.innerHTML = '';
    if (!pararRares.length) {
      var vazio = document.createElement('div');
      vazio.textContent = '(nenhuma — pausa so por alvos)';
      vazio.style.cssText = 'color:#8b949e;font-size:10px;font-style:italic;text-align:center';
      pararLista.appendChild(vazio);
      return;
    }
    for (var i = 0; i < pararRares.length; i++) {
      (function (idx) {
        var linha = document.createElement('div');
        linha.style.cssText = 'display:flex;gap:4px;align-items:center';
        var sel = document.createElement('select');
        for (var rp = 0; rp < RAR_PARAR.length; rp++) {
          var op = document.createElement('option');
          op.value = RAR_PARAR[rp];
          op.textContent = RAR_PARAR[rp];
          sel.appendChild(op);
        }
        sel.value = pararRares[idx];
        sel.style.cssText = 'flex:1;min-width:0;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:5px;padding:4px 4px;font:12px/1 monospace;box-sizing:border-box';
        sel.addEventListener('change', function () {
          pararRares[idx] = this.value;
          saveCfg();
        });
        var x = document.createElement('div');
        x.textContent = '\u2715';
        x.title = 'Remover raridade';
        x.style.cssText = 'font:bold 12px/1 sans-serif;color:#fff;background:#b42318;border:1px solid #f85149;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0';
        x.addEventListener('click', function () {
          pararRares.splice(idx, 1);
          saveCfg();
          renderParar();
        });
        linha.appendChild(sel);
        linha.appendChild(x);
        pararLista.appendChild(linha);
      })(i);
    }
  }

  function renderTipoBaum() {
    if (!rTipoBaum) return;
    btnTipo10.style.background = TIPO_BAU === 10 ? '#2ea043' : '#0d1117';
    btnTipo10.style.color = TIPO_BAU === 10 ? '#fff' : '#7ee787';
    btnTipo50.style.background = TIPO_BAU === 50 ? '#2ea043' : '#0d1117';
    btnTipo50.style.color = TIPO_BAU === 50 ? '#fff' : '#7ee787';
    btnTipo100.style.background = TIPO_BAU === 100 ? '#2ea043' : '#0d1117';
    btnTipo100.style.color = TIPO_BAU === 100 ? '#fff' : '#7ee787';
  }

  function renderModo() {
    if (!tabBau || !tabInvoc || !rTipoBaum) return;
    tabBau.style.background = modoAtual === 'bau' ? '#2ea043' : '#21262d';
    tabBau.style.color = modoAtual === 'bau' ? '#fff' : '#8b949e';
    tabBau.style.borderColor = modoAtual === 'bau' ? '#2ea043' : '#30363d';
    tabInvoc.style.background = modoAtual === 'invoc' ? '#2ea043' : '#21262d';
    tabInvoc.style.color = modoAtual === 'invoc' ? '#fff' : '#8b949e';
    tabInvoc.style.borderColor = modoAtual === 'invoc' ? '#2ea043' : '#30363d';
  }

  function trocarModo(novoModo) {
    if (novoModo !== 'bau' && novoModo !== 'invoc') return;
    if (novoModo === modoAtual) return;
    if (ativo) {
      stop();
      console.log('[auto-invocar] modo alterado: ' + modoAtual + ' -> ' + novoModo + ' (desligado antes de trocar).');
    }
    modoAtual = novoModo;
    saveCfg();
    renderModo();
    renderPainelConteudo();
    btnEstado();
  }

  function abrirPainel() {
    if (!panel) return;
    panel.style.display = 'flex';
    renderPainelConteudo();
    renderModo();
  }
  function fecharPainel() {
    if (!panel) return;
    panel.style.display = 'none';
  }

  function btnEstado() {
    if (!btn) return;
    var modoLabel = modoAtual === 'bau' ? 'BAU' : 'INVOC';
    btn.textContent = !ativo ? '\u23F8 PARADO' : (pausado ? '\u23F8 PAUSA' : '\u25B6 ' + modoLabel);
    if (!ativo) btn.style.background = 'rgba(40,42,52,.95)';
    else if (pausado) btn.style.background = 'rgba(120,90,20,.95)';
    else btn.style.background = 'rgba(13,110,50,.95)';
  }

  function toggle() {
    if (ativo) { stop(); } else { start(); }
  }

  function start() {
    if (ativo) { console.warn('[auto-invocar] ja esta rodando.'); return status(); }
    fecharPainel();
    ativo = true;
    pausado = false;
    clicouEm = 0;
    escanear();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, LOOP_MS);
    btnEstado();
    var modoLabel = modoAtual === 'bau' ? 'baus ' + (TIPO_BAU === 10 ? 'x10' : TIPO_BAU === 50 ? 'x50' : 'x100') : 'invoc x10';
    console.log('[auto-invocar] LIGADO — ' + modoLabel + ' sozinho. Para desligar: __sm.stop() ou clica no botao.');
    return status();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    ativo = false;
    pausado = false;
    bannerEsconde();
    btnEstado();
    console.log('[auto-invocar] DESLIGADO. Resumo:', JSON.stringify({ contagem: counts, novos: novos, copias: copias, cliques: totalClicks, modo: modoAtual, tipoBaum: TIPO_BAU }));
  }

  function retomar() {
    if (!pausado) { console.warn('[auto-invocar] sem pausa ativa.'); return status(); }
    pausado = false;
    bannerEsconde();
    btnEstado();
    console.log('[auto-invocar] pausa encerrada manualmente — voltando a invocar.');
  }

  function intervalo(s) {
    var v = parseFloat(s);
    if (!isFinite(v) || v < 0.2) { console.warn('[auto-invocar] intervalo minimo: 0.2s.'); v = 0.2; }
    clickGap = Math.round(v * 1000);
    if (iIntervalo) iIntervalo.value = clickGap / 1000;
    saveCfg();
    console.log('[auto-invocar] intervalo entre invocacoes: ' + (clickGap / 1000) + 's.');
    return clickGap / 1000;
  }

  function pausaSec(n) {
    var v = parseFloat(n);
    if (!isFinite(v) || v <= 0) { console.warn('[auto-invocar] pausa precisa ser > 0s.'); return pauseMs / 1000; }
    pauseMs = Math.round(v * 1000);
    if (iPausa) iPausa.value = Math.round(pauseMs / 1000);
    saveCfg();
    console.log('[auto-invocar] pausa ao sair Lendario/Mitico: ' + (pauseMs / 1000) + 's.');
    return pauseMs / 1000;
  }

  function extraClicks(n) {
    var v = parseInt(n, 10);
    if (!isFinite(v) || v < 0) { console.warn('[auto-invocar] extraClicks precisa ser >= 0.'); return extra; }
    extra = v;
    if (iExtra) iExtra.value = extra;
    saveCfg();
    console.log('[auto-invocar] cliques no Continuar pra sair da tela: ' + extra + ' (alem do primeiro).');
    return extra;
  }

  /* ---------- clique manual do usuario (so vale durante a pausa) ---------- */

  function marcarCliqueManual(el) {
    clicouEm = Date.now();
    var onde = el.id ? ('#' + el.id) : ((typeof el.className === 'string' && el.className) ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase());
    console.log('[auto-invocar] clique manual detectado em ' + onde + ' — conferindo o lote (2.5s)...');
  }

  function detectarCliqueManual(e) {
    if (!ativo || !pausado) return;
    var el = e.target;
    if (!el || el.nodeType !== 1 || !document.body.contains(el)) return;
    var id = el.id || '';
    var cl = (typeof el.className === 'string') ? el.className : '';
    if (/sm-gold/i.test(id) || /sm-gold|summon/i.test(cl)) { marcarCliqueManual(el); return; }
    var tx = norm(el.textContent || '').trim();
    if (/^x\s*\d+/i.test(tx) || tx.indexOf('invoca') !== -1) marcarCliqueManual(el);
  }

  window.__sm = {
    start: start, stop: stop, status: status, retomar: retomar,
    intervalo: intervalo, pausaSec: pausaSec, extraClicks: extraClicks,
    tipoBaum: function(n) { if (n !== undefined) { TIPO_BAU = n; saveCfg(); renderTipoBaum(); } return TIPO_BAU; },
    modo: function(n) { if (n !== undefined) { trocarModo(n); } return modoAtual; }
  };

  montarUI();
  btnEstado();
  document.addEventListener('click', detectarCliqueManual, true);
  console.log('[auto-invocar] v8 pronto — modo ' + modoAtual + ', botao PARADO. Pra ligar: clique no botao ou __sm.start(). Abas: Baú / Invocação.');
})();