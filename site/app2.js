/* Radar · extensions : Portefeuille, Analyser n'importe quel actif, Swing actions. Chargé après le script principal. */
(function () {
  const ICO = {
    pf: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16v12H4z"/><path d="M16 13h2"/><path d="M4 7l12-4v4"/></svg>',
    search: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    wallet: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16v12H4z"/><path d="M16 13h2"/><path d="M4 7l12-4v4"/></svg>'
  };
  const fpx = (v, s) => { if (v == null || !isFinite(v)) return '–'; const cur = /\.CO$/.test(s) ? ' kr' : /\.[A-Z]{1,2}$/.test(s) ? ' €' : ' $'; const a = Math.abs(v); const d = a >= 1000 ? 0 : a >= 1 ? 2 : a >= .01 ? 4 : 6; return v.toLocaleString('fr-FR', { minimumFractionDigits: Math.min(d, 2), maximumFractionDigits: d }) + cur; };
  const smaA = (a, n) => { let s = 0; return a.map((x, i) => { s += x; if (i >= n) s -= a[i - n]; return i < n - 1 ? null : s / n; }); };
  const emaA = (a, n) => { const k = 2 / (n + 1); let e = a[0]; return a.map((x, i) => (e = i ? x * k + e * (1 - k) : x)); };
  const BN = ['https://data-api.binance.vision', 'https://api.binance.com'];
  async function bnKlines(sym, limit) { for (const h of BN) { try { const r = await fetch(`${h}/api/v3/klines?symbol=${sym}USDT&interval=1d&limit=${limit}`); if (r.ok) { const k = await r.json(); if (Array.isArray(k)) return k.filter(x => +x[6] < Date.now()); } } catch (e) { } } return null; }
  function ind(k) {
    const c = k.map(x => +x[4]), h = k.map(x => +x[2]), l = k.map(x => +x[3]); const n = c.length, i = n - 1; if (n < 25) return null;
    const m20 = smaA(c, 20), m50 = smaA(c, 50), m200 = smaA(c, 200);
    let g = 0, lo = 0, rsi = 50; for (let j = 1; j < n; j++) { const d = c[j] - c[j - 1]; if (j <= 14) { d > 0 ? g += d / 14 : lo -= d / 14; continue; } g = (g * 13 + Math.max(d, 0)) / 14; lo = (lo * 13 + Math.max(-d, 0)) / 14; rsi = 100 - 100 / (1 + g / (lo || 1e-12)); }
    const sd = Math.sqrt(c.slice(-20).reduce((a, x) => a + (x - m20[i]) ** 2, 0) / 20);
    const tr = c.map((_, j) => j ? Math.max(h[j] - l[j], Math.abs(h[j] - c[j - 1]), Math.abs(l[j] - c[j - 1])) : h[j] - l[j]); const atr = emaA(tr, 20)[i];
    const hi20 = Math.max(...h.slice(Math.max(0, i - 20), i)), hi20p = Math.max(...h.slice(Math.max(0, i - 21), i - 1));
    return { p: c[i], d1: c[i] / c[i - 1] - 1, c30: n > 30 ? c[i] / c[i - 30] - 1 : null, ma20: m20[i], ma50: m50[i], ma200: m200[i], rsi, bbu: m20[i] + 2 * sd, atr,
      brk: n > 22 && c[i] > hi20 && c[i - 1] <= hi20p, hiNext: Math.max(...h.slice(Math.max(0, i - 19), i + 1)), loNext: Math.min(...l.slice(Math.max(0, i - 9), i + 1)),
      spark: c.slice(-90), days: n };
  }
  const fx = () => S.data?.fx || 1.16;

  /* ---------- navigation : 5 onglets + « ? » pour la méthode ---------- */
  VIEWS.length = 0;
  VIEWS.push(['home', 'Aujourd’hui', I.home], ['pf', 'Portefeuille', ICO.pf], ['mkt', 'Analyser', ICO.search], ['stk', 'Actions', I.stk], ['trades', 'Trades', I.trades]);
  nav = function () {
    const sells = S.trades.filter(t => t.status === 'open' && !t.paper && evalPos(t).exit).length;
    $('#navBot').innerHTML = VIEWS.map(([k, l, ic]) => `<button data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${ic}${l}${k === 'trades' && sells ? `<span class="dotn">${sells}</span>` : ''}</button>`).join('');
    $('#navTop').innerHTML = [...VIEWS, ['how', 'Méthode']].map(([k, l]) => `<button data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${l}${k === 'trades' && sells ? ` · ${sells}` : ''}</button>`).join('');
    document.querySelectorAll('[data-v]').forEach(b => b.onclick = () => go(b.dataset.v));
    document.querySelectorAll('section.view').forEach(s => s.hidden = s.id !== 'v-' + S.view);
  };
  const css = document.createElement('style'); css.textContent = '.brand{white-space:nowrap}.hrow{flex-wrap:nowrap}.scan{min-width:0}@media (max-width:520px){.scan{font-size:11px}}'; document.head.appendChild(css);
  const help = document.createElement('button'); help.textContent = '?'; help.setAttribute('aria-label', 'La méthode et l’introduction');
  help.style.cssText = 'background:rgba(255,255,255,.18);color:#fff;border:none;border-radius:50%;width:32px;height:32px;padding:0;font-weight:800;margin-left:10px';
  help.onclick = () => go('how'); document.querySelector('.hrow').appendChild(help);
  if (!['home', 'pf', 'mkt', 'stk', 'trades', 'how'].includes(S.view)) S.view = 'home';

  /* ---------- sections ---------- */
  const main = document.querySelector('main');
  const pfSec = document.createElement('section'); pfSec.className = 'view'; pfSec.id = 'v-pf'; pfSec.hidden = true;
  pfSec.innerHTML = `<div class="card" id="pfHead"></div>
    <div class="card"><div class="ctitle"><h2>Ce que le radar te suggère</h2><span class="sub">règles du tableau de bord</span></div><div id="pfTodo"></div></div>
    <div class="card"><div class="ctitle"><h2>Mes cryptos</h2><span class="sub" id="pfSub"></span></div><div class="list" id="pfList"></div>
      <div class="btns" style="margin-top:12px"><button class="pri" id="pfRef">Actualiser les prix</button><button id="pfAdd">Ajouter une crypto</button></div></div>
    <div class="card"><div class="ctitle"><h2>Ma liste de surveillance</h2></div><div class="list" id="pfWatch"></div></div>
    <div class="card"><div class="ctitle"><h2>Mes données</h2></div>
      <div class="btns"><button id="pfImpB">Importer mon portefeuille</button><button id="pfExp">Exporter</button><input type="file" id="pfImp" accept="application/json" hidden></div>
      <div class="btns" style="margin-top:10px;align-items:flex-end"><label class="f">Objectif (valeur visée, €)<input id="pfGoal" type="number" min="0" step="1000"></label><label class="f">Échéance<input id="pfGoalD" type="date" style="font:500 15px var(--font);padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surf2);color:var(--ink)"></label></div>
      <p class="note" style="margin-top:8px">Ton portefeuille reste uniquement sur cet appareil : rien n'est publié sur le site. Pour l'avoir sur ton téléphone, exporte ici puis importe là-bas.</p></div>`;
  main.insertBefore(pfSec, document.getElementById('v-mkt'));
  const anaCard = document.createElement('div'); anaCard.className = 'card'; anaCard.id = 'anaCard';
  anaCard.innerHTML = `<div class="ctitle"><h2>Analyser un actif</h2><span class="sub">crypto ou action</span></div>
    <form id="anaF" class="tools" autocomplete="off" style="margin-bottom:0"><input type="search" id="anaQ" list="anaL" placeholder="ex. SOL, NEAR, NVDA, ASML.AS…" aria-label="Crypto ou action à analyser" style="flex:1 1 200px"><datalist id="anaL"></datalist><button class="pri" type="submit">Analyser</button></form>
    <div id="anaOut" style="margin-top:12px"></div>`;
  document.getElementById('v-mkt').prepend(anaCard);
  const swCard = document.createElement('div'); swCard.className = 'card'; swCard.id = 'swCard';
  swCard.innerHTML = `<div class="ctitle"><h2>Swing court terme</h2><span class="sub" id="swSub"></span></div><div id="swOut"></div>
    <p class="note" style="margin-top:10px">Méthode « Swing actions » : cassure du plus haut des 20 séances avec volume, ou repli (RSI sous 40) puis rebond, dans un marché haussier. Backtest sur 10 ans : avantage réel mais mince depuis 2021 (+0,06 R par trade), séries de pertes longues possibles. À tester en papier avant tout. Actions européennes : conformité à vérifier toi-même.</p>`;
  const stkSec = document.getElementById('v-stk'); stkSec.insertBefore(swCard, stkSec.children[2] || null);

  /* ---------- portefeuille ---------- */
  const PF = { get: () => LS.get('pf', { assets: [] }), set: v => LS.set('pf', v) };
  const Q = { d: LS.get('pfq', {}), at: LS.get('pfqAt', 0), busy: false };
  async function refreshPf(force) {
    const A = PF.get().assets; if (!A.length || Q.busy) return; if (!force && Date.now() - Q.at < 36e5) return;
    Q.busy = true; $('#pfRef') && ($('#pfRef').textContent = 'Lecture des prix…');
    for (const a of A.filter(a => a.src === 'bn' || (!a.src && !a.cg))) { const k = await bnKlines(a.sym, 210); if (k && k.length) Q.d[a.sym] = { ...ind(k), src: 'bn' }; }
    const cg = A.filter(a => a.src === 'cg' && a.cg);
    if (cg.length) { try { const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cg.map(a => a.cg).join(',')}&vs_currencies=usd&include_24hr_change=true`); const j = await r.json(); for (const a of cg) if (j[a.cg]) Q.d[a.sym] = { p: j[a.cg].usd, d1: (j[a.cg].usd_24h_change || 0) / 100, src: 'cg' }; } catch (e) { } }
    Q.at = Date.now(); LS.set('pfq', Q.d); LS.set('pfqAt', Q.at); Q.busy = false; render();
  }
  /* devise d'affichage du portefeuille : EUR, USD, BTC ou ETH */
  const CURS = { EUR: '€', USD: '$', BTC: '₿', ETH: 'Ξ' };
  const curNow = () => { const c = LS.get('pfCur', 'EUR'); return CURS[c] ? c : 'EUR'; };
  const pxOf = s => Q.d[s]?.p || (S.data?.market || []).find(m => m.s === s)?.p || null;
  function fc(usd) {
    const c = curNow(); if (usd == null || !isFinite(usd)) return '–';
    if (c === 'EUR') return fe(usd / fx());
    if (c === 'USD') return Math.round(usd).toLocaleString('fr-FR') + ' $';
    const r = pxOf(c); if (!r) return fe(usd / fx());
    const v = usd / r, a = Math.abs(v); const d = a >= 10 ? 2 : a >= 1 ? 3 : a >= .01 ? 4 : 6;
    return v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + CURS[c];
  }
  const curSeg = () => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="mute" style="font-size:13px">Afficher en</span><div class="seg" role="group" aria-label="Devise d'affichage">${Object.keys(CURS).map(k => `<button data-cur="${k}" aria-pressed="${curNow() === k}">${k}</button>`).join('')}</div></div>`;
  function price(a) { if (a.src === 'stable') return { p: 1, d1: 0 }; return Q.d[a.sym] || null; }
  function sig(a) {
    if (a.src === 'stable') return ['Réserve', 'b-grey', 'Liquidités prêtes pour renforcer.'];
    const q = price(a); if (!q) return ['Pas de prix', 'b-grey', 'Prix introuvable : vérifie la ligne.'];
    if (q.ma20 == null) return ['Prix seul', 'b-grey', 'Pas d’historique : signal indisponible.'];
    const up = q.ma200 ? q.p > q.ma200 : (q.ma50 ? q.p > q.ma50 : true);
    if (a.watch) { if (!up) return ['Éviter', 'b-down', 'Sous sa moyenne 200 jours.']; if (q.rsi >= 70 || q.p >= q.bbu || q.p > q.ma20 * 1.15) return ['Attendre un repli', 'b-warn', 'Hausse tendue, attends un retour vers sa moyenne 20 jours.']; if (q.p <= q.ma20 * 1.05) return ['Entrée possible', 'b-up', 'Tendance haussière et prix revenu près de sa moyenne 20 jours.']; return ['Attendre un repli', 'b-warn', 'Prix au-dessus de sa zone d’entrée.']; }
    if (q.ma200 && q.p < q.ma200 && (q.c30 ?? 0) < .1) return ['Sortie sur rebond', 'b-down', 'Sous sa moyenne 200 jours et en retard : profite d’un rebond pour sortir.'];
    if (q.rsi >= 72 || q.p >= q.bbu) return ['Alléger', 'b-warn', 'Surchauffe : encaisser une partie sécurise la ligne.'];
    if (up && q.p <= q.ma20 * 1.03 && q.rsi < 62) return ['Renforcer', 'b-up', 'Tendance haussière et prix dans sa zone de renfort.'];
    return ['Conserver', 'b-acc', 'Pas de signal clair.'];
  }
  function pfView() {
    const st = PF.get(); const A = st.assets; refreshPf(false);
    const held = A.filter(a => !a.watch && a.qty > 0), watch = A.filter(a => a.watch);
    if (!A.length) {
      $('#pfHead').innerHTML = `<div class="mission"><div class="ico a">${ICO.wallet}</div><div><div class="t">Ajoute ton portefeuille</div><div class="s">Importe le fichier « mon-portefeuille-crypto.json » que je t’ai préparé, ou ajoute tes cryptos une par une. Tout reste sur cet appareil.</div><div class="btns" style="margin-top:10px"><button class="pri" onclick="document.getElementById('pfImp').click()">Importer mon fichier</button></div></div></div>`;
      ['#pfTodo', '#pfList', '#pfWatch'].forEach(x => $(x).innerHTML = '<div class="empty">Rien pour l’instant.</div>'); $('#pfSub').textContent = ''; setGoalInputs(st); return;
    }
    let tot = 0, inv = 0, d24 = 0, miss = 0; const rows = held.map(a => { const q = price(a); const v = q ? q.p * a.qty : 0; if (!q) miss++; tot += v; inv += a.invested || 0; if (q && q.d1 != null) d24 += v - v / (1 + q.d1); return { a, q, v, s: sig(a) }; }).sort((x, y) => y.v - x.v);
    const F = fx(); const goal = st.goal || { target: 75000, date: '2029-10-01' }; const pct = Math.min(1, tot / F / goal.target);
    const mult = goal.target / (tot / F || 1);
    $('#pfHead').innerHTML = `${curSeg()}<div class="kpi3" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <div><span>Valeur</span><b class="num">${fc(tot)}</b><span>${curNow() === 'EUR' ? fv(tot).replace('/j', '') : fe(tot / F)}</span></div>
      <div><span>Plus ou moins-value</span><b class="num ${tot - inv >= 0 ? 'up' : 'down'}">${fc(tot - inv)}</b><span>${fpc(inv ? (tot / inv - 1) * 100 : null, 0)} sur ${fc(inv)}</span></div>
      <div><span>24 h</span><b class="num ${d24 >= 0 ? 'up' : 'down'}">${fc(d24)}</b><span>${fpc(tot ? d24 / (tot - d24) * 100 : null)}</span></div></div>
      <div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:13px"><b>Objectif ${fe(goal.target)} · ${new Date(goal.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</b><span class="mute">×${mult.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} à faire</span></div><div class="bar" style="margin-top:6px"><span style="width:${(pct * 100).toFixed(1)}%;background:var(--acc)"></span></div></div>
      ${allocBar(rows, tot)}${miss ? `<p class="note" style="margin-top:8px">${miss} ligne(s) sans prix (comptées à 0).</p>` : ''}`;
    const grp = {}; for (const r of rows) (grp[r.s[0]] = grp[r.s[0]] || []).push(r); const dust = rows.filter(r => r.q && r.v / F < 30);
    const todo = [['Alléger', 'b-warn', 'Prends une partie des gains'], ['Sortie sur rebond', 'b-down', 'Sors sur le prochain rebond'], ['Renforcer', 'b-up', 'Zone de renfort'], ['Poussières', 'b-grey', 'Lignes de moins de 30 € à regrouper']];
    $('#pfTodo').innerHTML = todo.map(([k, c, t]) => { const L = k === 'Poussières' ? dust : (grp[k] || []); if (!L.length) return ''; return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="badge ${c}">${k} · ${L.length}</span><b class="num" style="font-size:13.5px">${fc(L.reduce((s, r) => s + r.v, 0))}</b></div><div style="font-size:13.5px;margin-top:4px">${t}</div><div class="mute" style="font-size:12.5px">${L.map(r => esc(r.a.sym)).join(' · ')}</div></div>`; }).join('') || '<div class="empty">Aucune action particulière : tout est en « Conserver ».</div>';
    $('#pfSub').textContent = `${held.length} lignes · prix ${Q.at ? 'du ' + new Date(Q.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'non chargés'}`;
    $('#pfList').innerHTML = rows.map(r => rowHtml(r.a, r.q, r.v, r.s)).join('');
    $('#pfWatch').innerHTML = watch.length ? watch.map(a => rowHtml(a, price(a), null, sig(a))).join('') : '<div class="empty">Aucune crypto en surveillance.</div>';
    document.querySelectorAll('[data-pfe]').forEach(b => b.onclick = () => editAsset(b.dataset.pfe));
    $('#pfRef').textContent = 'Actualiser les prix'; setGoalInputs(st);
    document.querySelectorAll('[data-cur]').forEach(b => b.onclick = () => { LS.set('pfCur', b.dataset.cur); render(); });
  }
  function allocBar(rows, tot) { if (!tot) return ''; const cols = ['#4F46E5', '#0E9F6E', '#D97706', '#DB2777', '#0891B2', '#7C3AED']; const top = rows.slice(0, 6); const rest = tot - top.reduce((s, r) => s + r.v, 0);
    const parts = [...top.map((r, i) => [r.a.sym, r.v, cols[i]]), ['Autres', rest, 'var(--grey)']];
    return `<div style="display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px;margin-top:14px">${parts.map(p => `<span style="width:${p[1] / tot * 100}%;background:${p[2]}"></span>`).join('')}</div><div class="chips" style="margin-top:6px;font-size:12px;color:var(--ink2)">${parts.map(p => `<span style="display:flex;align-items:center;gap:4px"><span style="width:9px;height:9px;border-radius:2px;background:${p[2]}"></span>${esc(p[0])} ${Math.round(p[1] / tot * 100)} %</span>`).join('')}</div>`; }
  function rowHtml(a, q, v, s) {
    const F = fx(); const pl = v != null && a.invested ? (v / a.invested - 1) * 100 : null; const rd = (S.data?.signals || []).find(x => x.s === a.sym) ? '<span class="tag b-up">cassure</span>' : (S.data?.near || []).find(x => x.s === a.sym) ? '<span class="tag b-warn">proche cassure</span>' : '';
    return `<div class="li" style="cursor:pointer" data-pfe="${esc(a.sym)}" role="button" tabindex="0">${logo(a.sym, 34)}<div class="mid"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>${esc(a.sym)}</b><span class="badge ${s[1]}" style="padding:2px 8px;font-size:11px">${s[0]}</span>${rd}${a.flag ? `<span class="tag b-warn">${esc(a.flag)}</span>` : ''}</div>
      <div class="mute" style="font-size:12px">${v != null ? `${fq(a.qty)} · investi ${fc(a.invested)}` : esc(s[2])}</div></div>
      <div style="width:64px">${q?.spark ? spark(q.spark.slice(-30), { w: 64, h: 26 }) : ''}</div>
      <div class="right"><b class="num">${v != null ? fc(v) : fp(q?.p)}</b><span class="num ${(v != null ? pl : (q?.d1 ?? 0) * 100) >= 0 ? 'up' : 'down'}">${v != null ? fpc(pl, 0) : fpc((q?.d1 ?? 0) * 100)}</span></div></div>`;
  }
  function editAsset(sym) {
    const st = PF.get(); const a = st.assets.find(x => x.sym === sym); if (!a) return;
    const qv = prompt(`${sym} : quantité détenue (0 = supprimer, « s » = mettre en surveillance)`, String(a.qty ?? 0)); if (qv == null) return;
    if (qv.trim().toLowerCase() === 's') { a.watch = true; } else { const q = +String(qv).replace(',', '.'); if (!(q >= 0)) return;
      if (q === 0) { if (!confirm(`Supprimer ${sym} du portefeuille ?`)) return; st.assets = st.assets.filter(x => x !== a); }
      else { const iv = prompt(`${sym} : montant total investi en $`, String(a.invested ?? 0)); if (iv == null) return; a.qty = q; a.invested = +String(iv).replace(',', '.') || 0; a.watch = false; } }
    PF.set(st); render();
  }
  function setGoalInputs(st) { const g = st.goal || { target: 75000, date: '2029-10-01' }; if (document.activeElement !== $('#pfGoal')) $('#pfGoal').value = g.target; if (document.activeElement !== $('#pfGoalD')) $('#pfGoalD').value = g.date; }
  document.addEventListener('change', e => { if (e.target.id === 'pfGoal' || e.target.id === 'pfGoalD') { const st = PF.get(); st.goal = { target: +$('#pfGoal').value || 75000, date: $('#pfGoalD').value || '2029-10-01' }; PF.set(st); render(); } });
  $('#pfRef').onclick = () => refreshPf(true);
  $('#pfAdd').onclick = () => { const s = (prompt('Symbole de la crypto (ex. SOL)') || '').trim().toUpperCase(); if (!s) return; const q = +String(prompt(`Quantité de ${s} (0 = surveillance seulement)`, '0') || '0').replace(',', '.'); const iv = q ? +String(prompt(`Montant total investi en $`, '0') || '0').replace(',', '.') : 0;
    const st = PF.get(); st.assets = st.assets.filter(x => x.sym !== s); st.assets.push({ sym: s, name: s, qty: q, invested: iv, src: 'bn', watch: !q }); PF.set(st); refreshPf(true); render(); };
  $('#pfExp').onclick = () => { const b = new Blob([JSON.stringify({ v: 1, kind: 'portefeuille', ...PF.get() }, null, 1)], { type: 'application/json' }); const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'mon-portefeuille-crypto.json'; l.click(); };
  $('#pfImpB').onclick = () => $('#pfImp').click();
  $('#pfImp').onchange = async e => { try { const j = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(j.assets)) throw 0; const st = PF.get(); st.assets = j.assets; if (j.goal) st.goal = j.goal; PF.set(st); Q.at = 0; render(); refreshPf(true); alert(j.assets.length + ' lignes importées.'); } catch (err) { alert('Fichier non reconnu.'); } };

  /* ---------- analyser ---------- */
  let anaLast = null;
  function fillList() { const L = $('#anaL'); if (L.options.length) return; const cr = (S.data?.market || []).map(m => `<option value="${esc(m.s)}">crypto</option>`); const st = Object.entries(S.data?.stocks?.all || {}).map(([s, o]) => `<option value="${esc(s)}">${esc(o.n)}</option>`); L.innerHTML = cr.join('') + st.join(''); }
  $('#anaF').onsubmit = e => { e.preventDefault(); analyse($('#anaQ').value); };
  async function analyse(raw) {
    const q = String(raw || '').trim(); if (!q) return; const up = q.toUpperCase(); const all = S.data?.stocks?.all || {}; const out = $('#anaOut');
    const isC = (S.data?.market || []).some(m => m.s === up); let sk = all[up] ? up : isC ? null : Object.keys(all).find(k => k.split('.')[0] === up) || (q.length > 3 ? Object.keys(all).find(k => (all[k].n || '').toLowerCase().split(/[^a-z0-9à-ÿ]+/).some(w => w.startsWith(q.toLowerCase()))) : null);
    if (sk) { anaLast = { kind: 'stock', s: sk }; out.innerHTML = stockHtml(sk, all[sk]); return; }
    const sym = up.replace(/USDT$/, '').replace(/[^A-Z0-9]/g, ''); out.innerHTML = '<p class="note">Lecture des cours journaliers…</p>';
    const k = await bnKlines(sym, 220); if (!k || k.length < 25) { out.innerHTML = `<div class="empty">« ${esc(q)} » introuvable. Cryptos : symbole Binance (ex. SOL). Actions : uniquement les ${Object.keys(all).length} actions suivies chaque nuit (SPUS + grandes valeurs européennes).</div>`; return; }
    anaLast = { kind: 'crypto', s: sym, A: ind(k) }; out.innerHTML = cryptoHtml(sym, anaLast.A); bindAna();
  }
  function lvl(label, v, cls, sub) { return `<div><span>${label}</span><b class="num ${cls || ''}">${v}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; }
  function verdict(c, t, s) { const bg = c === 'g' ? 'var(--upbg)' : c === 'r' ? 'var(--downbg)' : 'var(--warnbg)', fg = c === 'g' ? 'var(--up)' : c === 'r' ? 'var(--down)' : 'var(--warn)'; return `<div style="background:${bg};border-radius:14px;padding:12px 14px;margin-bottom:12px"><div style="font-weight:800;font-size:17px;color:${fg}">${t}</div><div style="font-size:13.5px;margin-top:2px">${s}</div></div>`; }
  function cryptoHtml(s, A) {
    const D = S.data; const m = (D.market || []).find(x => x.s === s); const vol = m?.vol; const tag = m?.tag; const elig = !tag && vol >= 5e6 && A.days >= 60;
    const e = A.brk ? A.p : Math.max(A.p, A.hiNext); const sl = e - 2 * A.atr; const tp = Math.max(A.loNext, sl); const z = size(e, sl); const dist = (A.hiNext / A.p - 1) * 100; const trend = A.ma200 ? A.p > A.ma200 : null;
    let v;
    if (tag) v = verdict('r', 'EXCLUE', tag === 'meme' ? 'Memecoin : hors de ta contrainte éthique et sans valeur sous-jacente.' : 'Prêt, rendement ou dérivés : exclue par ta contrainte éthique.');
    else if (!D.tradeable) v = verdict('o', 'MARCHÉ FERMÉ', 'Le BTC est sous sa moyenne 100 jours : la méthode n’achète rien en ce moment.');
    else if (A.brk && elig) v = verdict('g', 'ACHAT POSSIBLE', 'Cassure du plus haut des 20 jours à la dernière clôture.');
    else if (A.brk) v = verdict('o', 'CASSURE, MAIS PRUDENCE', `Liquidité faible (${vol ? fv(vol) + '/jour' : 'inconnue'}) ou historique court : la méthode ne la suit pas.`);
    else v = verdict(trend === false ? 'r' : 'o', 'PAS ENCORE', `Achat seulement si une journée clôture au-dessus de ${fp(A.hiNext)} (${fpc(dist)}).${trend === false ? ' Tendance de fond baissière (sous la moyenne 200 jours) : prudence.' : ''}`);
    return `<div class="coin" style="margin-bottom:10px">${logo(s, 40)}<div><div class="nm">${esc(s)}</div><div class="sb">${fp(A.p)} · ${fpc(A.d1 * 100)} 24 h · ${vol ? fv(vol) + '/jour' : 'volume inconnu'}</div></div></div>${v}
      ${spark(A.spark, { w: 320, h: 90, full: true, lines: [{ v: A.hiNext, c: 'var(--warn)' }, { v: sl, c: 'var(--down)' }] })}
      <div class="nums" style="margin-top:10px">${lvl(A.brk ? 'Entrée' : 'Entrée si cassure', fp(e))}${lvl('SL', fp(sl), 'down', fpc((sl / e - 1) * 100))}${lvl('TP suiveur', fp(tp), '', 'monte avec le prix')}${lvl('Montant', fe(z.eur), '', 'perte max ' + fe(z.loss))}${lvl('Renfort 1', fp(e + 2 * A.atr), 'up')}${lvl('Renfort 2', fp(e + 4 * A.atr), 'up')}</div>
      <div class="chips" style="margin-top:10px"><span class="badge ${trend ? 'b-up' : 'b-grey'}">${trend == null ? 'historique court' : trend ? 'au-dessus MM200' : 'sous MM200'}</span><span class="badge b-grey">RSI ${Math.round(A.rsi)}</span><span class="badge b-grey">30 j ${fpc((A.c30 ?? 0) * 100, 0)}</span></div>
      ${A.brk && elig && D.tradeable ? `<div class="btns" style="margin-top:12px"><button data-anat="1">Trade papier</button><button class="pri" data-anat="0">J’ai acheté</button></div>` : `<div class="btns" style="margin-top:12px"><button data-anaw="1">Ajouter à ma surveillance</button></div>`}`;
  }
  function bindAna() {
    document.querySelectorAll('[data-anaw]').forEach(b => b.onclick = () => { const st = PF.get(); if (!st.assets.find(x => x.sym === anaLast.s)) st.assets.push({ sym: anaLast.s, name: anaLast.s, qty: 0, invested: 0, src: 'bn', watch: true }); PF.set(st); b.textContent = 'Ajoutée à ta surveillance'; b.disabled = true; });
    document.querySelectorAll('[data-anat]').forEach(b => b.onclick = () => { const A = anaLast.A, s = anaLast.s, paper = b.dataset.anat === '1'; let e = A.p; const sl = A.p - 2 * A.atr;
      if (!paper) { const v = prompt(`Prix d'achat réel de ${s} en $ ?`, String(A.p)); e = +String(v || '').replace(',', '.'); if (!(e > 0)) return; }
      let q = size(e, sl).q; if (!paper) { const v = prompt('Quantité achetée ?', String(+q.toPrecision(5))); q = +String(v || '').replace(',', '.'); if (!(q > 0)) return; }
      S.trades.push({ id: s + '-' + Date.now(), s, paper, day: S.data.day, e, stop: sl, atr0: A.atr, q, fx: fx(), status: 'open', openedAt: new Date().toISOString() }); save(); S.mode = paper ? 'paper' : 'real'; LS.set('mode', S.mode); go('trades'); });
  }
  function stockHtml(s, o) {
    const W = o.sw; const sw = S.data.stocks.swing || {}; const mk = o.eu ? sw.eu : sw.us; let v;
    if (W?.now) v = verdict('g', `SWING : ACHAT POSSIBLE (${W.set === 'bo' ? 'cassure' : 'repli + rebond'})`, 'Signal à la dernière clôture. Achat à l’ouverture suivante, stop posé tout de suite.');
    else if (W) v = verdict('o', 'PAS ENCORE', W.set === 'bo' ? `Achat si une séance clôture au-dessus de ${fpx(W.entry, s)} (${fpc(W.dist)}) avec du volume.` : `En repli : achat si une séance clôture au-dessus de ${fpx(W.entry, s)} (rebond confirmé).`);
    else v = verdict('r', 'PAS DE SETUP', o.up ? 'Tendance correcte mais ni cassure ni repli en cours.' : 'Tendance de fond pas haussière : on n’achète pas.');
    if (mk === false) v = verdict('o', 'MARCHÉ DÉFAVORABLE', `${o.eu ? 'Le STOXX 600' : 'Le S&P 500'} est sous sa tendance : la méthode swing reste à l’écart.`) + v;
    const r52 = o.hi52 > o.lo52 ? (o.p - o.lo52) / (o.hi52 - o.lo52) * 100 : 50;
    return `<div class="coin" style="margin-bottom:10px"><span class="logo" style="background:hsl(${hue(s)} 55% 48%);font-size:11px;width:40px;height:40px">${esc(s.slice(0, 4))}</span><div><div class="nm">${esc(s)} · ${esc(o.n)}</div><div class="sb">${fpx(o.p, s)} · ${fpc(o.d1 * 100)} sur la séance · ${o.halal ? '<span class="up">halal (SPUS, AAOIFI)</span>' : '<span class="down">conformité à vérifier</span>'}</div></div></div>${v}
      ${spark(o.spark, { w: 320, h: 90, full: true, lines: W ? [{ v: W.entry, c: 'var(--warn)' }, { v: W.stop, c: 'var(--down)' }] : [] })}
      ${W ? `<div class="nums" style="margin-top:10px">${lvl(W.now ? 'Entrée' : 'Entrée si signal', fpx(W.entry, s))}${lvl('SL', fpx(W.stop, s), 'down', fpc((W.stop / W.entry - 1) * 100))}${lvl('TP', W.tgt ? fpx(W.tgt, s) : 'suiveur', '', W.tgt ? '3 × le risque' : 'stop suiveur à 3 ATR')}${lvl('Tendance', o.up ? 'haussière' : 'non', o.up ? 'up' : 'down')}</div>` : ''}
      <div class="chips" style="margin-top:10px"><span class="badge b-grey">RSI ${Math.round(o.rsi)}</span>${o.rank ? `<span class="badge ${o.inList ? 'b-up' : 'b-grey'}">momentum n° ${o.rank}${o.inList ? ' · dans la liste du mois' : ''}</span>` : ''}<span class="badge b-grey">52 sem. : ${Math.round(r52)} % de la fourchette</span></div>`;
  }
  function swView() {
    const sw = S.data?.stocks?.swing; if (!sw) { $('#swOut').innerHTML = '<div class="empty">Disponible après le prochain scan.</div>'; return; }
    $('#swSub').textContent = `US ${sw.us ? 'ouvert' : 'fermé'} · Europe ${sw.eu == null ? '?' : sw.eu ? 'ouvert' : 'fermé'}`;
    const all = S.data.stocks.all; const it = (x, sub) => `<div class="li" style="cursor:pointer" data-swa="${esc(x.s)}"><span class="logo" style="background:hsl(${hue(x.s)} 55% 48%);font-size:11px">${esc(x.s.slice(0, 4))}</span><div class="mid"><b>${esc(x.s)}</b><div class="mute" style="font-size:12.5px">${esc(all[x.s]?.n || '')}</div></div><div class="right"><span class="badge ${sub[1]}" style="font-size:11px">${sub[0]}</span></div></div>`;
    $('#swOut').innerHTML = (sw.sig.length ? sw.sig.map(x => it(x, [x.set === 'bo' ? 'cassure' : 'repli + rebond', 'b-up'])).join('') : '<div class="empty">Aucun signal swing à la dernière clôture.</div>') +
      (sw.near.length ? '<div class="mute" style="font-size:12.5px;margin:10px 0 2px">Proches du déclenchement</div>' + sw.near.slice(0, 8).map(x => it(x, [`à ${fpc(x.dist).replace('+', '')}`, 'b-warn'])).join('') : '');
    document.querySelectorAll('[data-swa]').forEach(b => b.onclick = () => { go('mkt'); $('#anaQ').value = b.dataset.swa; analyse(b.dataset.swa); });
  }

  /* ---------- Méthode : un guide par usage, choisi dans un menu ---------- */
  const HOW = {
    trend: { t: 'Tendance BTC + ETH (méthode principale)', tab: 'home', tabL: 'Aujourd’hui', steps: [
      ['Chaque lundi matin', 'Ouvre l’onglet Aujourd’hui (ou lis l’alerte Telegram) : la carte « Tendance BTC + ETH » dit quoi détenir. Le reste de la semaine, on ne touche à rien.'],
      ['Dedans ou dehors', 'BTC et ETH sont jugés séparément. Prix au-dessus de sa moyenne des 100 derniers jours : DEDANS, on en détient. En dessous : DEHORS, on n’en détient pas.'],
      ['Combien', 'Chaque crypto peut prendre au plus la moitié du capital tendance. Si elle est très agitée, la part baisse pour viser 40 % de volatilité par an. Le site affiche le montant exact en € et en unités.'],
      ['Ajuster', 'Compare avec ce que tu détiens : achète ou vends la différence en spot. Le reste attend en stablecoin, sans « Earn ».'],
      ['Tenir', 'Des baisses de 35 à 50 % peuvent arriver. La méthode limite les krachs, elle ne les supprime pas. Monte le capital par paliers.']],
      note: 'Testée de 2018 à 2026 sur données réelles : environ +34 % par an, pire chute −40 %, contre +23 % et −81 % en gardant du BTC. Résultats passés, aucune garantie.' },
    crypto: { t: 'Cassure altcoins (expérimental)', tab: 'home', tabL: 'Aujourd’hui' },
    ana: { t: 'Analyser un actif', tab: 'mkt', tabL: 'Analyser', steps: [
      ['Tape le symbole', 'Dans l’onglet Analyser : un symbole crypto Binance (SOL, NEAR…) ou une action suivie (NVDA, ASML…). Les suggestions s’affichent pendant la frappe.'],
      ['Lis le verdict en couleur', 'Vert : achat possible selon la méthode. Orange : pas encore, ou marché défavorable. Rouge : exclue (memecoin, prêt, dérivés) ou tendance baissière.'],
      ['Regarde les niveaux', 'Entrée (ou « entrée si cassure »), SL, TP suiveur, montant conseillé et renforts. La ligne orange du graphique est le seuil à franchir, la rouge le stop.'],
      ['Décide', 'Achat possible : bouton « Trade papier » ou « J’ai acheté ». Sinon : « Ajouter à ma surveillance » et tu la retrouves dans l’onglet Portefeuille.']],
      note: 'L’analyse applique les mêmes règles que le scan de la nuit, sur la dernière clôture journalière. Une crypto peu liquide (moins de 5 M$ échangés par jour) n’est jamais « achat possible ».' },
    swing: { t: 'Actions : swing court terme', tab: 'stk', tabL: 'Actions', steps: [
      ['Marché favorable', 'Le S&P 500 (ou le STOXX 600 pour l’Europe) au-dessus de sa moyenne 200 jours, et sa moyenne 50 jours au-dessus de la 200. Sinon, on ne fait rien.'],
      ['Setup 1 : cassure', 'Clôture au-dessus du plus haut des 20 séances, volume au moins 1,5 fois la moyenne, RSI sous 75, action en tendance haussière.'],
      ['Setup 2 : repli puis rebond', 'Action en tendance haussière, RSI passé sous 40 dans les 5 dernières séances, puis une clôture au-dessus du plus haut de la veille.'],
      ['Achat à l’ouverture suivante', 'Stop posé tout de suite au niveau SL affiché. Cassure : objectif à 3 fois le risque. Repli : stop suiveur à 3 fois la variation moyenne.'],
      ['Taille de position', 'Risque 0,5 à 1 % du capital par trade, pas plus. Les séries de pertes peuvent être longues.']],
      note: 'Avantage mesuré réel mais mince (+0,06 R par trade depuis 2021). À tester en papier d’abord. Actions SPUS : halal (filtre AAOIFI). Actions européennes : conformité à vérifier toi-même.' },
    mom: { t: 'Actions : momentum halal mensuel', tab: 'stk', tabL: 'Actions', steps: [
      ['Une fois par mois', 'Le premier jour de bourse du mois, ouvre l’onglet Actions : la liste des 10 actions du mois est prête.'],
      ['Filtre de marché', 'Si le S&P 500 est sous sa moyenne 200 jours ce jour-là, on reste en liquidités tout le mois.'],
      ['La sélection', 'Parmi les ~215 actions du SPUS (halal) : les 10 meilleures sur 12 mois (hors dernier mois), seulement si elles sont au-dessus de leur moyenne 200 jours.'],
      ['Rééquilibre', 'Vends celles qui sortent de la liste, achète les entrées, à parts égales. Ne touche à rien entre deux rendez-vous.']],
      note: 'Backtest : 20 à 32 %/an contre 14,8 %/an pour le S&P 500, mais gonflé par le biais du survivant. Suivi réel à partir du 1er novembre 2026.' },
    pf: { t: 'Mon portefeuille', tab: 'pf', tabL: 'Portefeuille', steps: [
      ['Renforcer', 'Tendance haussière (au-dessus de la moyenne 200 jours), prix revenu près de sa moyenne 20 jours et RSI sous 62.'],
      ['Alléger', 'Surchauffe : RSI au-dessus de 72 ou prix sur la bande haute de Bollinger. Encaisse une partie.'],
      ['Sortie sur rebond', 'Sous la moyenne 200 jours et moins de +10 % sur 30 jours : profite du prochain rebond pour sortir.'],
      ['Conserver', 'Aucun des cas ci-dessus. Les lignes de moins de 30 € sont signalées comme poussières à regrouper.'],
      ['Surveillance', 'Entrée possible près de la moyenne 20 jours en tendance haussière ; attendre un repli si la hausse est tendue ; éviter sous la moyenne 200 jours.']],
      note: 'Clique sur une ligne pour changer sa quantité ou la passer en surveillance. Le bouton EUR · USD · BTC · ETH change la devise d’affichage. Tes données restent sur cet appareil.' }
  };
  const howSec = document.getElementById('v-how'); const howCards = [...howSec.children];
  const cryptoCards = howCards.slice(0, 2);
  const daily = document.createElement('div'); daily.className = 'card';
  daily.innerHTML = `<div class="ctitle"><h2>Concrètement, pour prendre un trade</h2></div><div class="how">${[
    ['Chaque matin', 'Ouvre l’onglet Aujourd’hui : le scan de la nuit liste les cryptos « prêtes maintenant » et les places libres.'],
    ['Achète en spot', 'Sur ta plateforme, au comptant uniquement, si le prix est encore sous l’entrée + 3 %. Montant : celui affiché.'],
    ['Pose le stop', 'Tout de suite, un ordre stop au niveau SL affiché.'],
    ['Enregistre', 'Bouton « J’ai acheté » avec ton prix et ta quantité réels.'],
    ['Suis dans Trades', 'Le site te dit quand vendre (TP suiveur touché) ou renforcer, et le nouveau stop à poser.']
  ].map((s, i) => `<div><span class="n">${i + 1}</span><b>${s[0]}</b><p>${s[1]}</p></div>`).join('')}</div>`;
  cryptoCards[1].after(daily); cryptoCards.push(daily);
  const howPick = document.createElement('div'); howPick.className = 'card';
  howPick.innerHTML = `<label class="f" style="width:100%"><span style="font-weight:700;font-size:15px">Quelle méthode veux-tu revoir ?</span><select id="howSel" style="width:100%;margin-top:6px">${Object.entries(HOW).map(([k, m]) => `<option value="${k}">${m.t}</option>`).join('')}</select></label>
    <div class="btns" style="margin-top:10px"><button class="ghost" id="howGo"></button></div>`;
  howSec.prepend(howPick);
  const howBox = document.createElement('div'); howBox.className = 'card'; howPick.after(howBox);
  function howShow(k) {
    if (!HOW[k]) k = 'crypto'; LS.set('howSel', k); $('#howSel').value = k; const m = HOW[k];
    cryptoCards.forEach(c => c.hidden = k !== 'crypto'); howBox.hidden = k === 'crypto';
    if (m.steps) howBox.innerHTML = `<div class="ctitle"><h2>${m.t}</h2></div><div class="how">${m.steps.map((s, i) => `<div><span class="n">${i + 1}</span><b>${s[0]}</b><p>${s[1]}</p></div>`).join('')}</div><p class="note" style="margin-top:12px">${m.note}</p>`;
    $('#howGo').textContent = 'Ouvrir l’onglet ' + m.tabL; $('#howGo').onclick = () => go(m.tab);
  }
  $('#howSel').onchange = e => howShow(e.target.value);
  howShow(LS.get('howSel', 'trend'));
  const CTX = { home: 'trend', trades: 'crypto', mkt: 'ana', stk: 'swing', pf: 'pf' };
  help.onclick = () => { if (CTX[S.view]) howShow(CTX[S.view]); go('how'); };

  /* ---------- journal des mouvements : achat, vente, dépôt, retrait, avec impact sur le stablecoin ---------- */
  const STABLES = ['USDT', 'USDC', 'FDUSD', 'EURC'];
  const MV = { buy: ['Achat', 'b-up'], sell: ['Vente', 'b-down'], in: ['Dépôt', 'b-acc'], out: ['Retrait', 'b-grey'] };
  let mvType = 'buy';
  const mvCard = document.createElement('div'); mvCard.className = 'card'; mvCard.id = 'mvCard';
  mvCard.innerHTML = `<div class="ctitle"><h2>Nouveau mouvement</h2><span class="sub">met à jour tes quantités</span></div>
    <div class="seg" role="group" aria-label="Type de mouvement" id="mvT" style="display:flex;width:100%">${Object.entries(MV).map(([k, v]) => `<button data-mvt="${k}" style="flex:1">${v[0]}</button>`).join('')}</div>
    <form id="mvF" autocomplete="off" style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;align-items:end">
      <label class="f">Crypto<input id="mvS" list="mvL" placeholder="ex. SOL" required style="text-transform:uppercase"><datalist id="mvL"></datalist></label>
      <label class="f">Quantité<input id="mvQ" type="text" inputmode="decimal" placeholder="0" required></label>
      <label class="f">Prix unitaire ($)<input id="mvP" type="text" inputmode="decimal" placeholder="prix du jour"></label>
      <label class="f" id="mvSL">Payé avec<select id="mvC">${STABLES.map(s => `<option>${s}</option>`).join('')}<option value="">Aucun (hors stablecoin)</option></select></label>
    </form>
    <div id="mvPrev" style="margin-top:12px"></div>
    <div class="btns" style="margin-top:12px"><button class="pri" id="mvOk">Enregistrer</button></div>`;
  const histCard = document.createElement('div'); histCard.className = 'card'; histCard.id = 'histCard';
  histCard.innerHTML = `<div class="ctitle"><h2>Historique des mouvements</h2><span class="sub" id="mvSub"></span></div><div class="list" id="mvList"></div>`;
  const mvCss = document.createElement('style'); mvCss.textContent = '#mvF input,#mvF select{font:500 15px var(--font);padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surf2);color:var(--ink);width:100%;min-width:0;box-sizing:border-box}'; document.head.appendChild(mvCss);
  const listCard = document.getElementById('pfList').closest('.card'); listCard.after(mvCard); mvCard.after(histCard);
  const num = v => +String(v || '').replace(/\s/g, '').replace(',', '.');
  function mvCalc() {
    const st = PF.get(); const s = $('#mvS').value.trim().toUpperCase(); const q = num($('#mvQ').value); let p = num($('#mvP').value);
    const a = st.assets.find(x => x.sym === s); if (!(p > 0)) p = price(a || { sym: s })?.p || (S.data?.market || []).find(m => m.s === s)?.p || 0;
    const cur = (mvType === 'buy' || mvType === 'sell') ? $('#mvC').value : ''; const sa = cur ? st.assets.find(x => x.sym === cur) : null;
    return { st, s, q, p, a, cur, sa, val: q * p };
  }
  function mvPreview() {
    $('#mvSL').style.display = mvType === 'buy' || mvType === 'sell' ? '' : 'none';
    document.querySelectorAll('[data-mvt]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mvt === mvType));
    const c = mvCalc(); if (!c.s || !(c.q > 0)) { $('#mvPrev').innerHTML = '<p class="note">Choisis la crypto et la quantité : je te montre l’effet avant d’enregistrer.</p>'; return; }
    const q0 = c.a?.qty || 0, sign = mvType === 'buy' || mvType === 'in' ? 1 : -1, q1 = q0 + sign * c.q;
    const rows = [[c.s, q0, q1]]; if (c.cur) { const s0 = c.sa?.qty || 0; rows.push([c.cur, s0, s0 - sign * c.val]); }
    const warn = rows.some(r => r[2] < -1e-9) ? '<p class="note down" style="margin-top:6px">Attention : une quantité deviendrait négative. Vérifie la saisie ou ajoute d’abord un dépôt.</p>' : '';
    $('#mvPrev').innerHTML = `<div style="background:var(--surf2);border-radius:14px;padding:10px 12px">${rows.map(r => `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0"><b>${esc(r[0])}</b><span class="num">${fq(Math.max(r[1], 0))} → <b class="${r[2] >= r[1] ? 'up' : 'down'}">${r[2] < 0 ? '−' + fq(-r[2]) : fq(r[2])}</b></span></div>`).join('')}
      ${c.p ? `<div class="mute" style="font-size:12.5px;margin-top:4px">Valeur du mouvement : ${fc(c.val)} (${fp(c.p)} l’unité)</div>` : '<div class="mute" style="font-size:12.5px;margin-top:4px">Prix inconnu : indique-le pour suivre le montant investi.</div>'}</div>${warn}`;
  }
  function applyMove(st, type, s, q, p, cur, auto) {
    let a = st.assets.find(x => x.sym === s); if (!a) { a = { sym: s, name: s, qty: 0, invested: 0, src: STABLES.includes(s) ? 'stable' : 'bn', watch: false }; st.assets.push(a); }
    const val = q * (p || 0); const q0 = a.qty || 0, inv0 = a.invested || 0; let dInv = 0, pnl = null;
    if (type === 'buy' || type === 'in') dInv = val;
    else { const part = q0 > 0 ? Math.min(1, q / q0) : 0; dInv = -inv0 * part; if (type === 'sell' && p) pnl = val + dInv; }
    a.qty = Math.max(0, q0 + (type === 'buy' || type === 'in' ? q : -q)); a.invested = Math.max(0, inv0 + dInv); a.watch = false;
    let dS = 0; if (cur && (type === 'buy' || type === 'sell')) { let sa = st.assets.find(x => x.sym === cur); if (!sa) { sa = { sym: cur, name: cur, qty: 0, invested: 0, src: 'stable', watch: false }; st.assets.push(sa); }
      dS = (type === 'buy' ? -1 : 1) * val; sa.qty = +(sa.qty + dS).toFixed(6); sa.invested = Math.max(0, (sa.invested || 0) + dS); }
    st.moves = st.moves || []; st.moves.unshift({ id: Date.now() + Math.random(), d: new Date().toISOString(), t: type, s, q, p: p || null, cur: cur || null, dq: a.qty - q0, dInv: a.invested - inv0, dS, pnl, auto: !!auto });
  }
  function mvSave() {
    const c = mvCalc(); if (!c.s || !(c.q > 0)) { mvPreview(); $('#mvS').focus(); return; }
    applyMove(c.st, mvType, c.s, c.q, c.p, c.cur); PF.set(c.st); $('#mvQ').value = ''; $('#mvP').value = ''; mvPreview(); render();
  }
  function mvUndo(id) {
    const st = PF.get(); const m = (st.moves || []).find(x => x.id === id); if (!m) return;
    const a = st.assets.find(x => x.sym === m.s); if (a) { a.qty = Math.max(0, a.qty - m.dq); a.invested = Math.max(0, a.invested - m.dInv); }
    if (m.cur) { const sa = st.assets.find(x => x.sym === m.cur); if (sa) { sa.qty = +(sa.qty - m.dS).toFixed(6); sa.invested = Math.max(0, (sa.invested || 0) - m.dS); } }
    st.moves = st.moves.filter(x => x !== m); PF.set(st); render();
  }
  function mvView() {
    const L = $('#mvL'); const st = PF.get(); L.innerHTML = [...new Set([...st.assets.map(a => a.sym), ...(S.data?.market || []).map(m => m.s)])].map(s => `<option value="${esc(s)}">`).join('');
    const M = st.moves || []; const pnl = M.reduce((t, m) => t + (m.pnl || 0), 0);
    $('#mvSub').textContent = M.length ? `${M.length} mouvement(s) · ventes : ${pnl >= 0 ? '+' : ''}${fc(pnl)} réalisés` : '';
    $('#mvList').innerHTML = M.length ? M.slice(0, 30).map(m => `<div class="li">${logo(m.s, 32)}<div class="mid"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="badge ${MV[m.t][1]}" style="padding:2px 8px;font-size:11px">${MV[m.t][0]}</span><b>${fq(m.q)} ${esc(m.s)}</b>${m.auto ? '<span class="tag b-acc">via Trades</span>' : ''}</div>
      <div class="mute" style="font-size:12px">${new Date(m.d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}${m.p ? ' · ' + fp(m.p) : ''}${m.cur ? ` · ${m.dS < 0 ? '−' : '+'}${fq(Math.abs(m.dS))} ${esc(m.cur)}` : ''}${m.pnl != null ? ` · <span class="${m.pnl >= 0 ? 'up' : 'down'}">${m.pnl >= 0 ? '+' : ''}${fc(m.pnl)}</span>` : ''}</div></div>
      <button class="ghost" data-mvu="${m.id}" style="padding:6px 10px;font-size:12.5px">Annuler</button></div>`).join('') : '<div class="empty">Aucun mouvement enregistré. Chaque achat, vente, dépôt ou retrait saisi ici met à jour ta quantité et ton stablecoin.</div>';
    document.querySelectorAll('[data-mvu]').forEach(b => b.onclick = () => { if (b.dataset.c) mvUndo(+b.dataset.mvu); else { b.dataset.c = 1; b.textContent = 'Confirmer'; b.classList.remove('ghost'); } });
    mvPreview();
  }
  document.querySelectorAll('[data-mvt]').forEach(b => b.onclick = () => { mvType = b.dataset.mvt; mvPreview(); });
  ['mvS', 'mvQ', 'mvP', 'mvC'].forEach(id => $('#' + id).addEventListener('input', mvPreview));
  $('#mvF').onsubmit = e => { e.preventDefault(); mvSave(); }; $('#mvOk').onclick = mvSave;

  /* ---------- trades réels → portefeuille : une seule saisie ---------- */
  function syncTrades() {
    const done = new Set(LS.get('pfSync', [])); const first = !LS.get('pfSyncInit', false); const todo = [];
    for (const t of S.trades.filter(t => !t.paper)) {
      const ev = [[t.id + ':o', 'buy', t.q, t.e]];
      const units = (t.status === 'closed' ? t.units : evalPos(t).units) || [];
      for (let k = 1; k <= (t.status === 'closed' ? units.length - 1 : (t.ack || 0)); k++) if (units[k]) ev.push([t.id + ':a' + k, 'buy', units[k].q, units[k].px]);
      if (t.status === 'closed' && t.x) ev.push([t.id + ':c', 'sell', units.reduce((a, u) => a + (u.q || 0), 0) || t.q, t.x]);
      for (const e of ev) if (!done.has(e[0])) { done.add(e[0]); if (!first) todo.push([...e, t.s]); }
    }
    LS.set('pfSync', [...done]); LS.set('pfSyncInit', true);
    if (!todo.length) return; const st = PF.get();
    for (const [, type, q, p, s] of todo) applyMove(st, type, s, q, p, 'USDT', true);
    PF.set(st);
  }

  /* ---------- portefeuille témoin : la méthode appliquée seule depuis son lancement ---------- */
  let TW = null, twAsked = false;
  const twCard = document.createElement('div'); twCard.className = 'card'; twCard.id = 'twCard';
  const homeSec = document.getElementById('v-home'); homeSec.insertBefore(twCard, homeSec.children[1] || null);
  async function twLoad() { if (twAsked) return; twAsked = true; try { const r = await fetch('data/track.json?t=' + Date.now()); if (r.ok) { TW = await r.json(); render(); } } catch (e) { } }
  function twChart(cv) {
    const W = 640, H = 170, P = 6; const all = cv.flatMap(r => [r[1], r[2]]); let lo = Math.min(...all), hi = Math.max(...all); if (hi - lo < 1) { hi += 50; lo -= 50; }
    const x = i => P + i * (W - 2 * P) / Math.max(1, cv.length - 1), y = v => P + (hi - v) * (H - 2 * P) / (hi - lo);
    const path = k => cv.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="Courbe du portefeuille témoin comparée au BTC"><line x1="0" x2="${W}" y1="${y(cv[0][1])}" y2="${y(cv[0][1])}" stroke="var(--line)" stroke-dasharray="3 4"/><path d="${path(2)}" fill="none" stroke="var(--grey)" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/><path d="${path(1)}" fill="none" stroke="var(--acc)" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function twView() {
    twLoad(); if (!TW) { twCard.innerHTML = '<div class="ctitle"><h2>Témoin cassure</h2><span class="sub">expérimental</span></div><p class="note">Le portefeuille témoin démarre au prochain scan : la méthode y est appliquée seule, chaque nuit, avec 10 000 $ fictifs.</p>'; return; }
    const c = TW.curve.at(-1), perf = (c[1] / TW.cap0 - 1) * 100, bp = (c[2] / TW.cap0 - 1) * 100; const C = TW.closed || []; const win = C.filter(t => t.pnl > 0).length;
    const since = new Date(TW.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    twCard.innerHTML = `<div class="ctitle"><h2>Témoin cassure</h2><span class="sub">expérimental · depuis le ${since}</span></div>
      <div class="kpi3" style="margin-top:0;grid-template-columns:repeat(auto-fit,minmax(110px,1fr))"><div><span>Témoin</span><b class="num ${perf >= 0 ? 'up' : 'down'}">${fpc(perf)}</b><span>${fc(c[1])}</span></div><div><span>BTC conservé</span><b class="num ${bp >= 0 ? 'up' : 'down'}">${fpc(bp)}</b><span>même départ</span></div><div><span>Trades clos</span><b class="num">${C.length}</b><span>${C.length ? Math.round(win / C.length * 100) + ' % gagnants' : 'aucun encore'}</span></div></div>
      ${TW.curve.length > 1 ? `<div style="margin-top:12px">${twChart(TW.curve)}</div><div class="chips" style="font-size:12px;color:var(--ink2)"><span>━ témoin</span><span>┅ BTC</span></div>` : '<p class="note" style="margin-top:10px">La courbe se dessine nuit après nuit.</p>'}
      ${TW.pos.length ? `<div class="mute" style="font-size:12.5px;margin:12px 0 2px">En cours</div>${TW.pos.map(p => `<div class="li">${logo(p.s, 30)}<div class="mid"><b>${esc(p.s)}</b><div class="mute" style="font-size:12px">depuis le ${new Date(p.d0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${p.units.length} entrée(s) · stop ${fp(p.stop)}</div></div><div class="right"><span class="num ${(p.value || p.cost) >= p.cost ? 'up' : 'down'}">${fpc(((p.value || p.cost) / p.cost - 1) * 100)}</span></div></div>`).join('')}` : '<p class="note" style="margin-top:10px">Aucune position ouverte.</p>'}
      ${C.length ? `<div class="mute" style="font-size:12.5px;margin:12px 0 2px">Derniers trades clos</div>${C.slice(0, 5).map(t => `<div class="li">${logo(t.s, 30)}<div class="mid"><b>${esc(t.s)}</b><div class="mute" style="font-size:12px">${new Date(t.d0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${new Date(t.d1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${esc(t.why)}</div></div><div class="right"><span class="num ${t.pct >= 0 ? 'up' : 'down'}">${fpc(t.pct)}</span></div></div>`).join('')}` : ''}
      <p class="note" style="margin-top:10px">10 000 $ fictifs, 1 % de risque par entrée, 3 positions au plus, frais 0,1 %. Calculé chaque nuit par le serveur, impossible à retoucher : c’est la preuve en réel de la méthode, au fil de l’eau.</p>`;
  }

  /* ---------- App installable (PWA) ---------- */
  (() => {
    const add = (t, a) => { const e = document.createElement(t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); document.head.appendChild(e); };
    if (!document.querySelector('link[rel=manifest]')) add('link', { rel: 'manifest', href: 'manifest.webmanifest' });
    add('meta', { name: 'theme-color', content: '#4F46E5' }); add('link', { rel: 'apple-touch-icon', href: 'icon-192.png' });
    add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }); add('meta', { name: 'mobile-web-app-capable', content: 'yes' }); add('meta', { name: 'apple-mobile-web-app-title', content: 'Radar' });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  })();
  let instEvt = null; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instEvt = e; render(); });
  window.addEventListener('appinstalled', () => { LS.set('instHide', 'installed'); render(); });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const instCard = document.createElement('div'); instCard.className = 'card'; instCard.id = 'instCard'; homeSec.insertBefore(instCard, twCard);
  const instB = document.createElement('button'); instB.className = 'ghost'; instB.textContent = 'Installer l’app sur ce téléphone'; document.getElementById('showOnb')?.after(instB);
  instB.onclick = () => { LS.set('instHide', false); go('home'); };
  function instView() {
    const hid = LS.get('instHide', false); if (standalone() || hid === 'installed' || (typeof hid === 'number' && Date.now() - hid < 7 * 864e5)) { instCard.hidden = true; return; } instCard.hidden = false;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const how = instEvt ? 'Une vraie app sur ton écran d’accueil, en plein écran, qui s’ouvre même sans réseau.' : ios ? 'Dans Safari : bouton Partager (carré avec une flèche), puis « Sur l’écran d’accueil ».' : 'Dans Chrome : menu ⋮ en haut à droite, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».';
    instCard.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><img src="icon-192.png" width="48" height="48" style="border-radius:14px;flex:none" alt=""><div style="flex:1;min-width:0"><b>Installe Radar sur ton téléphone</b><div class="mute" style="font-size:13px;margin-top:2px">${how}</div></div></div>
      <div class="btns" style="margin-top:10px">${instEvt ? '<button class="pri" id="instGo">Installer</button>' : ''}<button class="ghost" id="instNo">Plus tard</button></div>`;
    $('#instNo').onclick = () => { LS.set('instHide', Date.now()); instView(); };
    if (instEvt) $('#instGo').onclick = async () => { instEvt.prompt(); try { await instEvt.userChoice; } catch (e) { } instEvt = null; instView(); };
  }

  /* ---------- stress test du portefeuille ---------- */
  const stCard = document.createElement('div'); stCard.className = 'card'; stCard.id = 'stCard'; document.getElementById('pfHead').after(stCard);
  function betaOf(a) {
    if (a.src === 'stable') return [0, 'stable']; if (a.sym === 'BTC') return [1, 'ok'];
    const q = price(a), b = S.data?.btc?.spark; if (!q?.spark || !b) return [1.3, 'estimé'];
    const n = Math.min(q.spark.length, b.length) - 1; if (n < 30) return [1.3, 'estimé'];
    const A = q.spark.slice(-n - 1), B = b.slice(-n - 1); const ra = [], rb = [];
    for (let i = 1; i <= n; i++) { ra.push(A[i] / A[i - 1] - 1); rb.push(B[i] / B[i - 1] - 1); }
    const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n; let cv = 0, vb = 0;
    for (let i = 0; i < n; i++) { cv += (ra[i] - ma) * (rb[i] - mb); vb += (rb[i] - mb) ** 2; }
    return [Math.max(0.3, Math.min(3, vb ? cv / vb : 1.3)), 'ok'];
  }
  function stView() {
    const A = PF.get().assets.filter(a => !a.watch && a.qty > 0); if (!A.length) { stCard.hidden = true; return; } stCard.hidden = false;
    const sh = LS.get('stShock', 30) / 100; let tot = 0, loss = 0, stab = 0;
    const rows = A.map(a => { const q = price(a); const v = q ? q.p * a.qty : 0; const [b, how] = betaOf(a); const l = v * Math.min(0.95, b * sh); tot += v; loss += l; if (a.src === 'stable') stab += v; return { s: a.sym, v, b, how, l }; }).filter(r => r.v > 0);
    const risky = tot - stab; const top = rows.filter(r => r.l > 0).sort((x, y) => y.l - x.l).slice(0, 5); const maxL = top[0]?.l || 1;
    const byV = rows.filter(r => r.b > 0).sort((x, y) => y.v - x.v); const big = byV[0]; const t3 = byV.slice(0, 3).reduce((s, r) => s + r.v, 0);
    const warn = [];
    if (big && risky && big.v / risky > 0.25) warn.push(`<b>${esc(big.s)}</b> pèse ${Math.round(big.v / risky * 100)} % de tes cryptos : une seule ligne peut faire très mal.`);
    if (risky && t3 / risky > 0.6) warn.push(`Tes 3 plus grosses lignes font ${Math.round(t3 / risky * 100)} % du risque.`);
    warn.push(`Réserve en stablecoins : ${Math.round(tot ? stab / tot * 100 : 0)} % (${fc(stab)}), prête à racheter après une baisse.`);
    const btcP = S.data?.btc?.p;
    stCard.innerHTML = `<div class="ctitle"><h2>Et si le marché chute ?</h2><span class="sub">stress test</span></div>
      <div class="mute" style="font-size:13px;margin-bottom:6px">Si le BTC baisse de…</div><div class="seg" role="group" aria-label="Baisse du BTC" style="display:flex;width:100%">${[10, 20, 30, 50].map(k => `<button data-sh="${k}" aria-pressed="${Math.round(sh * 100) === k}" style="flex:1;white-space:nowrap">−${k} %</button>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:14px;flex-wrap:wrap"><div><div class="mute" style="font-size:13px">Perte estimée</div><div class="num down" style="font-size:30px;font-weight:800">−${fc(loss).replace('−', '')}</div><div class="mute" style="font-size:13px">${fpc(tot ? -loss / tot * 100 : 0)} de ton portefeuille</div></div>
      ${btcP ? `<div style="text-align:right"><div class="mute" style="font-size:13px">BTC passerait à</div><b class="num">${fp(btcP * (1 - sh))}</b></div>` : ''}</div>
      <div style="margin-top:14px">${top.map(r => `<div style="display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;padding:4px 0"><b style="font-size:13.5px">${esc(r.s)}</b><div class="bar" style="height:10px"><span style="width:${(r.l / maxL * 100).toFixed(1)}%;background:var(--down)"></span></div><span class="num" style="font-size:13px">−${fc(r.l).replace('−', '')}${r.how === 'estimé' ? '*' : ''}</span></div>`).join('')}</div>
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">${warn.map(w => `<div style="background:var(--surf2);border-radius:12px;padding:8px 12px;font-size:13.5px">${w}</div>`).join('')}</div>
      <p class="note" style="margin-top:10px">Chaque crypto est sensible au BTC selon son comportement des 90 derniers jours (une crypto à ×1,5 perd 45 % quand le BTC perd 30 %). Lors d’un vrai krach, les altcoins chutent souvent plus que prévu. * sensibilité estimée faute d’historique.</p>`;
    stCard.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { LS.set('stShock', +b.dataset.sh); stView(); });
  }

  /* ---------- méthode principale : tendance BTC + ETH ---------- */
  let TR = null, trAsked = false;
  const trCard = document.createElement('div'); trCard.className = 'card'; trCard.id = 'trCard'; homeSec.prepend(trCard);
  const expNote = document.createElement('div'); expNote.className = 'card'; expNote.id = 'expNote';
  expNote.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start"><span class="badge b-warn" style="flex:none">Expérimental</span><div style="font-size:13.5px">Ci-dessous : la méthode <b>cassure altcoins</b>. Sur les tests 2018–2026 incluant les cryptos disparues, elle n’a pas d’avantage net. Elle reste visible pour la suivre <b>en papier</b> uniquement.</div></div>`;
  trCard.after(expNote);
  async function trLoad() { if (trAsked) return; trAsked = true; try { const r = await fetch('data/trend.json?t=' + Date.now()); if (r.ok) { TR = await r.json(); render(); } } catch (e) { } }
  const nextMonday = () => { const d = new Date(); const k = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + (d.getDay() === 1 && d.getHours() < 12 ? 0 : k)); return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };
  function trView() {
    trLoad(); const T = S.data?.trend; if (!T) { trCard.innerHTML = '<div class="ctitle"><h2>Tendance BTC + ETH</h2></div><p class="note">Disponible après le prochain scan de la nuit.</p>'; return; }
    const F = fx(); const cap = +LS.get('trCap', 1000) || 0; const A = T.assets;
    const row = a => { const x = A[a]; const eur = cap * x.w; return `<div class="li">${logo(a, 36)}<div class="mid"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>${a}</b><span class="badge ${x.in ? 'b-up' : 'b-down'}" style="padding:2px 10px;font-size:11.5px">${x.in ? 'DEDANS' : 'DEHORS'}</span></div><div class="mute" style="font-size:12px">${fpc(x.dist)} vs moyenne 100 j · agitation ${Math.round(x.vol * 100)} %/an</div></div>
      <div class="right"><b class="num">${fe(eur)}</b><span class="mute">${x.w ? Math.round(x.w * 100) + ' % · ' + fq(eur * F / x.p) + ' ' + a : 'rien à détenir'}</span></div></div>`; };
    const cash = cap * T.cash;
    let tw = '';
    if (TR && TR.curve?.length) { const c = TR.curve.at(-1); const perf = (c[1] / TR.cap0 - 1) * 100, bp = (c[2] / TR.cap0 - 1) * 100;
      tw = `<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><b style="font-size:14px">Témoin tendance depuis le ${new Date(TR.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</b><span class="num"><b class="${perf >= 0 ? 'up' : 'down'}">${fpc(perf)}</b> <span class="mute">· BTC ${fpc(bp)}</span></span></div>
        ${TR.curve.length > 1 ? `<div style="margin-top:8px">${twChart(TR.curve)}</div>` : '<p class="note" style="margin-top:6px">La courbe se dessine semaine après semaine (10 000 $ fictifs, mêmes règles).</p>'}</div>`; }
    trCard.innerHTML = `<div class="ctitle"><h2>Tendance BTC + ETH</h2><span class="sub">méthode principale</span></div>
      <div style="background:var(--surf2);border-radius:14px;padding:10px 12px;font-size:13.5px">Prochain ajustement : <b>${nextMonday()}</b>. Détiens les montants ci-dessous, le reste en stablecoin.</div>
      <div class="list" style="margin-top:6px">${row('BTC')}${row('ETH')}
        <div class="li"><span class="logo" style="background:#0E9F6E;width:36px;height:36px;font-size:11px">USD</span><div class="mid"><b>Stablecoin</b><div class="mute" style="font-size:12px">réserve en attendant la tendance</div></div><div class="right"><b class="num">${fe(cash)}</b><span class="mute">${Math.round(T.cash * 100)} %</span></div></div></div>
      <div class="btns" style="margin-top:10px;align-items:flex-end"><label class="f">Capital consacré à la tendance (€)<input id="trCapI" type="number" min="0" step="100" value="${cap}"></label><button class="ghost" id="trHow">Comment ça marche ?</button></div>${tw}`;
    $('#trCapI').onchange = e => { LS.set('trCap', Math.max(0, +e.target.value || 0)); trView(); };
    $('#trHow').onclick = () => { howShow('trend'); go('how'); };
  }

  /* ---------- branchement sur le rendu principal ---------- */
  const baseRender = render;
  render = function () { baseRender(); if (!S.data) return; try { syncTrades(); } catch (e) { } if (S.view === 'home') { instView(); trView(); twView(); } if (S.view === 'pf') { pfView(); stView(); mvView(); } if (S.view === 'mkt') { fillList(); if (anaLast?.kind === 'crypto' && !$('#anaOut').innerHTML) $('#anaOut').innerHTML = cryptoHtml(anaLast.s, anaLast.A); } if (S.view === 'stk') swView(); };
  nav();
})();
