/* Radar · onglet « BTC & ETH » : plan de la semaine (poche Tendance + poche Accumulation), carte d'identité, niveaux clés, cycles, actualité. */
(function () {
  const ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/></svg>';
  VIEWS.splice(1, 0, ['btc', 'BTC·ETH', ICON]);
  const main = document.querySelector('main.wrap') || document.querySelector('main');
  const sec = document.createElement('section'); sec.className = 'view'; sec.id = 'v-btc'; sec.hidden = true;
  main.insertBefore(sec, document.getElementById('v-mkt') || null);
  sec.innerHTML = '<div class="card" id="beWeek"></div><div class="card" id="beId"></div><div class="card" id="beCyc"></div><div class="card" id="beNews"></div>';
  const st = document.createElement('style');
  st.textContent = `.be-step{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)}.be-step:last-child{border-bottom:0}
  .be-n{flex:none;width:28px;height:28px;border-radius:50%;background:var(--accbg);color:var(--acc);font-weight:800;display:grid;place-items:center;font-size:14px}
  .be-act{display:flex;justify-content:space-between;gap:8px;align-items:baseline;padding:6px 10px;border-radius:10px;margin-top:6px;font-size:14px}
  .be-buy{background:var(--upbg);color:var(--up)}.be-sell{background:var(--downbg);color:var(--down)}.be-hold{background:var(--surf2);color:var(--ink2)}
  .be-zone{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}.be-zone div{border-radius:8px;padding:6px 4px;text-align:center;font-size:11px;background:var(--surf2);color:var(--mute)}
  .be-zone div.on{background:var(--acc);color:#fff;font-weight:700}
  .be-lv{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px}.be-lv:last-child{border-bottom:0}
  .be-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px}.be-grid>div{background:var(--surf2);border-radius:12px;padding:8px 10px}
  .be-grid span{display:block;font-size:11.5px;color:var(--mute)}.be-grid b{font-size:16px}`;
  document.head.appendChild(st);

  const F = () => S.data?.fx || 1.16;
  const asset = () => LS.get('beAsset', 'BTC');
  const plan = () => Object.assign({ wk: 200, tr: 50 }, LS.get('bePlan', {}));
  const accJ = () => Object.assign({ cap: 0, moves: [] }, LS.get('accJ', {}));

  /* ---------- données : 2 000 bougies journalières Binance, calculées dans le navigateur ---------- */
  const K = {}; let asked = false;
  async function kl(sym) {
    const base = `https://data-api.binance.vision/api/v3/klines?symbol=${sym}USDT&interval=1d&limit=1000`;
    const a = await fetch(base).then(r => r.json()); const b = await fetch(`${base}&endTime=${a[0][0] - 1}`).then(r => r.json());
    return [...b, ...a].filter(x => +x[6] < Date.now()).map(x => [+x[0], +x[2], +x[3], +x[4]]);
  }
  async function load() { if (asked) return; asked = true; try { const [b, e] = await Promise.all([kl('BTC'), kl('ETH')]); K.BTC = analyse(b); K.ETH = analyse(e); } catch (err) { K.err = String(err); } render(); }
  let NEWS = null, newsAsked = false;
  async function loadNews() { if (newsAsked) return; newsAsked = true; try { const r = await fetch('data/news.json?t=' + Date.now()); if (r.ok) { NEWS = await r.json(); render(); } } catch (e) { } }

  const ZONES = [
    { m: 0.5, t: 'Haut de cycle', d: 'à moins de 20 % du record : on achète la moitié, le reste part en réserve' },
    { m: 1, t: 'Correction', d: '20 à 40 % sous le record : achat normal' },
    { m: 2, t: 'Soldes', d: '40 à 60 % sous le record : achat doublé, la réserve complète' },
    { m: 4, t: 'Capitulation', d: 'plus de 60 % sous le record : achat ×4 avec la réserve' }];
  const zoneOf = dd => dd > -0.2 ? 0 : dd > -0.4 ? 1 : dd > -0.6 ? 2 : 3;

  function analyse(A) {
    const c = A.map(x => x[3]), n = c.length, i = n - 1, p = c[i];
    const sma = (k, at = i) => at < k - 1 ? null : c.slice(at - k + 1, at + 1).reduce((s, v) => s + v, 0) / k;
    let ath = 0, athT = 0; for (const x of A) if (x[1] > ath) { ath = x[1]; athT = x[0]; }
    const wk = A.filter(x => new Date(x[0]).getUTCDay() === 0).map(x => x[3]);
    const ma200w = wk.length >= 200 ? wk.slice(-200).reduce((s, v) => s + v, 0) / 200 : null;
    let g = 0, l = 0; for (let j = i - 13; j <= i; j++) { const d = c[j] - c[j - 1]; if (d > 0) g += d; else l -= d; }
    const rsi = 100 - 100 / (1 + g / (l || 1e-9));
    const r = []; for (let j = i - 29; j <= i; j++) r.push(Math.log(c[j] / c[j - 1])); const mr = r.reduce((s, v) => s + v, 0) / 30;
    const vol = Math.sqrt(r.reduce((s, v) => s + (v - mr) ** 2, 0) / 29) * Math.sqrt(365);
    // niveaux : sommets et creux marquants des 2 dernières années, regroupés par zones de 3 %
    const from = Math.max(8, n - 730), piv = [], w = 10;
    for (let j = from; j < n - 3; j++) { let hi = true, lo = true;
      for (let k = Math.max(0, j - w); k <= Math.min(n - 1, j + w); k++) { if (k === j) continue; if (A[k][1] > A[j][1]) hi = false; if (A[k][2] < A[j][2]) lo = false; }
      if (hi) piv.push({ v: A[j][1], t: A[j][0] }); if (lo) piv.push({ v: A[j][2], t: A[j][0] }); }
    piv.sort((a, b) => a.v - b.v); const cl = [];
    for (const q of piv) { const z = cl.at(-1); if (z && q.v / z.lo - 1 < 0.035) { z.n++; z.sum += q.v; z.t = Math.max(z.t, q.t); } else cl.push({ lo: q.v, n: 1, sum: q.v, t: q.t }); }
    let lv = cl.map(z => ({ v: z.sum / z.n, n: z.n, t: z.t }));
    const low2 = Math.min(...A.slice(-730).map(x => x[2]));
    lv.push({ v: low2, n: 3, t: 0, tag: 'plus bas 2 ans' }); if (ath > p) lv.push({ v: ath, n: 3, t: athT, tag: 'record' });
    const pick = (arr) => { const out = []; for (const z of arr) { if (z.n < 2 && !z.tag) continue; if (out.some(o => Math.abs(o.v / z.v - 1) < 0.04)) continue; out.push(z); if (out.length === 4) break; } return out; };
    const sup = pick(lv.filter(z => z.v < p * 0.995).sort((a, b) => b.v - a.v));
    const res = pick(lv.filter(z => z.v > p * 1.005).sort((a, b) => a.v - b.v));
    const dd = p / ath - 1;
    return { A, p, ath, athT, dd, zone: zoneOf(dd), ma50: sma(50), ma200: sma(200), ma200w, rsi, vol, sup, res, r7: p / c[i - 7] - 1, r30: p / c[i - 30] - 1, day: A[i][0] };
  }

  /* ---------- poche Tendance : reprise du carnet tendance ---------- */
  function trendState() {
    const T = S.data?.trend; if (!T) return null; const A = T.assets, f = F();
    const J = Object.assign({ cap: 0, moves: [] }, LS.get('trJ', {})); const H = { BTC: 0, ETH: 0, st: +J.cap || 0 };
    for (const m of [...(J.moves || [])].sort((x, y) => x.d < y.d ? -1 : 1)) { if (m.side === 'achat') { H[m.a] += m.q; H.st -= m.eur; } else { H[m.a] = Math.max(0, H[m.a] - m.q); H.st += m.eur; } }
    const val = a => H[a] * A[a].p / f; const tot = val('BTC') + val('ETH') + H.st;
    return { T, A, H, val, tot, J };
  }
  /* ---------- poche Accumulation : achats saisis, réserve = versé − achats ---------- */
  function accState() {
    const J = accJ(); const H = { BTC: 0, ETH: 0 }, cost = { BTC: 0, ETH: 0 }; let spent = 0;
    for (const m of J.moves || []) { H[m.a] += m.q; cost[m.a] += m.eur; spent += m.eur; }
    return { J, H, cost, res: (+J.cap || 0) - spent };
  }

  function weekView() {
    const box = document.getElementById('beWeek'); const P = plan(); const f = F();
    const trW = P.wk * P.tr / 100, acW = P.wk - trW; const TS = trendState(); const AS = accState();
    const head = `<div class="ctitle"><h2>Ma semaine</h2><span class="sub">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>`;
    const set = `<div class="btns" style="gap:10px;align-items:flex-end"><label class="f" style="flex:1 1 140px">Budget par semaine (€)<input id="beWk" type="number" min="0" step="10" value="${P.wk}"></label>
      <label class="f" style="flex:1 1 140px">Part Tendance (%)<input id="beTr" type="number" min="0" max="100" step="5" value="${P.tr}"></label></div>
      <p class="note" style="margin-top:4px">${fe(P.wk)} par semaine ≈ ${fe(P.wk * 52 / 12)} par mois · ${fe(trW)} pour la poche Tendance, ${fe(acW)} pour la poche Accumulation.</p>`;
    // poche tendance
    let trH = '<p class="note">Signal tendance disponible après le scan de la nuit.</p>';
    if (TS) { const { A, val, tot } = TS; const tot2 = tot + trW;
      const acts = ['BTC', 'ETH'].map(a => { const tgt = tot2 * A[a].w, cur = val(a), d = tgt - cur; const feux = `${A[a].up ?? (A[a].in ? 1 : 0)}/${A[a].nMa || 1} feux`;
        if (Math.abs(d) < Math.max(10, tot2 * 0.01)) return `<div class="be-act be-hold"><span>${a} · ${feux}</span><b>rien à faire</b></div>`;
        return `<div class="be-act ${d > 0 ? 'be-buy' : 'be-sell'}"><span>${d > 0 ? 'Acheter' : 'Vendre'} ${a} · ${feux}</span><b>${fe(Math.abs(d))} ≈ ${fq(Math.abs(d) * f / A[a].p)} ${a}</b></div>`; }).join('');
      trH = `${acts}<div class="be-act be-hold"><span>Stablecoin de la poche après ordres</span><b>${fe(tot2 * TS.T.cash)}</b></div>
        <p class="note" style="margin-top:6px">Calculé sur ton carnet tendance (${fe(tot)} aujourd’hui) + ${fe(trW)} versés cette semaine. La poche vend quand les feux s’éteignent : c’est voulu.</p>`; }
    // poche accumulation
    let acH = '<p class="note">Chargement des prix…</p>';
    if (K.BTC && K.ETH) { const avail = Math.max(0, AS.res + acW);
      const rows = ['BTC', 'ETH'].map(a => { const X = K[a], z = ZONES[X.zone]; return { a, X, z, want: acW / 2 * z.m }; });
      const need = rows.reduce((s, r) => s + r.want, 0), k = need > avail ? avail / need : 1; rows.forEach(r => r.amt = r.want * k); let left = avail - rows.reduce((s, r) => s + r.amt, 0);
      acH = rows.map(r => `<div class="be-act ${r.amt > 0 ? 'be-buy' : 'be-hold'}"><span>Acheter ${r.a} · ${r.z.t} (×${String(r.z.m).replace('.', ',')})</span><b>${fe(r.amt)} ≈ ${fq(r.amt * f / r.X.p)} ${r.a}</b></div>`).join('') +
        `<div class="be-act be-hold"><span>Réserve en stablecoin après achats</span><b>${fe(left)}</b></div>
        <p class="note" style="margin-top:6px">${rows.map(r => `${r.a} : ${fpc(r.X.dd * 100, 0)} sous son record, zone « ${r.z.t} ».`).join(' ')}${k < 1 ? ` La réserve ne couvre pas tout le multiplicateur : les achats sont réduits à ce qu’elle permet (${Math.round(k * 100)} %). Elle se reconstitue quand les prix remontent.` : ''} Cette poche ne vend jamais.</p>`;
      box._acc = rows; }
    box.innerHTML = head + set + `<div style="margin-top:6px">
      <div class="be-step"><span class="be-n">1</span><div style="flex:1;min-width:0"><b>Verser ${fe(P.wk)} sur OKX</b><div class="mute" style="font-size:13px">En euros, puis conversion en stablecoin (USDC), sans « Earn ».</div></div></div>
      <div class="be-step"><span class="be-n">2</span><div style="flex:1;min-width:0"><b>Poche Tendance · ${fe(trW)}</b><div class="mute" style="font-size:13px">Suit les 4 feux : achète en tendance haussière, vend quand elle se retourne.</div>${trH}</div></div>
      <div class="be-step"><span class="be-n">3</span><div style="flex:1;min-width:0"><b>Poche Accumulation · ${fe(acW)}</b><div class="mute" style="font-size:13px">Long terme : achète chaque semaine, plus fort quand le prix est loin de son record.</div>${acH}</div></div>
      <div class="be-step"><span class="be-n">4</span><div style="flex:1;min-width:0"><b>Enregistrer</b><div class="mute" style="font-size:13px">Un clic note le versement et les achats Accumulation proposés. Les ordres Tendance se notent dans « Mon carnet tendance » (onglet Aujourd’hui).</div>
        <div class="btns" style="margin-top:8px"><button class="pri" id="beSave">J’ai versé et acheté comme proposé</button></div><p class="note" id="beMsg"></p></div></div></div>
      ${accSummary(AS)}`;
    const save = () => { const p = plan(); p.wk = Math.max(0, +$('#beWk').value || 0); p.tr = Math.min(100, Math.max(0, +$('#beTr').value || 0)); LS.set('bePlan', p); render(); };
    $('#beWk').onchange = save; $('#beTr').onchange = save;
    $('#beSave').onclick = () => { if (!box._acc) return; const d = new Date().toISOString().slice(0, 10); const J = accJ(); J.cap = (+J.cap || 0) + acW;
      for (const r of box._acc) if (r.amt > 0) J.moves.push({ id: Date.now().toString(36) + r.a, d, a: r.a, eur: +r.amt.toFixed(2), q: +(r.amt * F() / r.X.p).toPrecision(8) });
      LS.set('accJ', J); const T = Object.assign({ cap: 0, moves: [] }, LS.get('trJ', {})); T.cap = (+T.cap || 0) + trW; LS.set('trJ', T);
      render(); setTimeout(() => { const m = $('#beMsg'); if (m) m.textContent = `Noté : ${fe(trW)} ajoutés à la poche Tendance, ${fe(acW)} à la poche Accumulation.`; }, 50); };
    document.querySelectorAll('[data-accdel]').forEach(b => b.onclick = () => { const J = accJ(); J.moves = J.moves.filter(m => m.id !== b.dataset.accdel); LS.set('accJ', J); render(); });
    if ($('#accCap')) $('#accCap').onchange = e => { const J = accJ(); J.cap = Math.max(0, +e.target.value || 0); LS.set('accJ', J); render(); };
  }
  function accSummary(AS) {
    if (!K.BTC) return '';
    const f = F(); const v = a => AS.H[a] * K[a].p / f; const tot = v('BTC') + v('ETH') + AS.res; const inv = +AS.J.cap || 0;
    const row = a => { const q = AS.H[a], pl = AS.cost[a] > 0 ? (v(a) / AS.cost[a] - 1) * 100 : null;
      return `<div class="li">${logo(a, 28)}<div class="mid"><b>${a}</b><div class="mute" style="font-size:12px">${q > 0 ? `${fq(q)} ${a} · prix moyen ${fe(AS.cost[a] / q)}` : 'aucun achat noté'}</div></div><div class="right"><b class="num">${fe(v(a))}</b>${pl != null ? `<span class="${pl >= 0 ? 'up' : 'down'}">${fpc(pl)}</span>` : ''}</div></div>`; };
    const mv = [...(AS.J.moves || [])].sort((x, y) => x.d < y.d ? 1 : -1).slice(0, 12);
    return `<details style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><summary style="cursor:pointer;font-weight:700;font-size:14px">Mon carnet Accumulation · ${fe(tot)}${inv ? ` <span class="${tot >= inv ? 'up' : 'down'}">${fpc((tot / inv - 1) * 100)}</span>` : ''}</summary>
      <p class="mute" style="font-size:12.5px;margin:6px 0 0">Séparé de ton portefeuille et de la poche Tendance. Rien ne quitte ton appareil.</p>
      <div class="btns" style="margin-top:8px"><label class="f" style="flex:1 1 180px">Total versé dans cette poche (€)<input id="accCap" type="number" min="0" step="10" value="${inv || ''}" placeholder="0"></label></div>
      <div class="list" style="margin-top:6px">${row('BTC')}${row('ETH')}<div class="li"><div class="mid"><b>Réserve (stablecoin)</b><div class="mute" style="font-size:12px">versé − achats, pour acheter plus fort dans les baisses</div></div><div class="right"><b class="num">${fe(AS.res)}</b></div></div></div>
      ${mv.length ? `<div class="list" style="margin-top:6px">${mv.map(m => `<div class="li"><div class="mid"><b class="up">▲ ${m.a}</b><div class="mute" style="font-size:12px">${new Date(m.d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · ${fq(m.q)} ${m.a} à ${fe(m.eur / m.q)}</div></div><div class="right" style="flex-direction:row;align-items:center;gap:8px"><b class="num">${fe(m.eur)}</b><button class="ghost" data-accdel="${m.id}" aria-label="Supprimer cette ligne" style="padding:4px 10px">×</button></div></div>`).join('')}</div>` : ''}</details>`;
  }

  /* ---------- carte d'identité : graphique, niveaux, zone ---------- */
  function chart(X) {
    const A = X.A.slice(-730), W = 680, H = 300, L = 8, R = 64, T = 12, B = 22; const c = A.map(x => x[3]);
    const ma = k => X.A.map((_, j) => j < k - 1 ? null : X.A.slice(j - k + 1, j + 1).reduce((s, x) => s + x[3], 0) / k).slice(-730);
    const m200 = ma(200), m50 = ma(50);
    const lv = [...X.sup, ...X.res].map(z => z.v); let lo = Math.min(...A.map(x => x[2]), ...lv), hi = Math.max(...A.map(x => x[1]), ...lv);
    lo *= 0.95; hi *= 1.03; const y = v => T + (1 - (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * (H - T - B); const x = j => L + j * (W - L - R) / (A.length - 1);
    let g = '';
    for (const z of X.sup) g += `<rect x="${L}" y="${y(z.v * 1.012)}" width="${W - L - R}" height="${Math.max(2, y(z.v * 0.988) - y(z.v * 1.012))}" fill="var(--up)" opacity=".12"/><line x1="${L}" x2="${W - R}" y1="${y(z.v)}" y2="${y(z.v)}" stroke="var(--up)" stroke-dasharray="4 4"/><text x="${W - R + 4}" y="${y(z.v) + 4}" font-size="11" fill="var(--up)" font-weight="700">${fp(z.v).replace(' $', '')}</text>`;
    for (const z of X.res) g += `<rect x="${L}" y="${y(z.v * 1.012)}" width="${W - L - R}" height="${Math.max(2, y(z.v * 0.988) - y(z.v * 1.012))}" fill="var(--down)" opacity=".12"/><line x1="${L}" x2="${W - R}" y1="${y(z.v)}" y2="${y(z.v)}" stroke="var(--down)" stroke-dasharray="4 4"/><text x="${W - R + 4}" y="${y(z.v) + 4}" font-size="11" fill="var(--down)" font-weight="700">${fp(z.v).replace(' $', '')}</text>`;
    let yr = null; A.forEach((b, j) => { const k = new Date(b[0]).toISOString().slice(0, 7); const mo = k.slice(5); if ((mo === '01' || mo === '07') && k !== yr) { yr = k; g += `<text x="${x(j)}" y="${H - 6}" font-size="11" fill="var(--mute)">${mo === '01' ? k.slice(0, 4) : 'juil.'}</text>`; } });
    const path = (arr) => arr.map((v, j) => v == null ? '' : `${j && arr[j - 1] != null ? 'L' : 'M'}${x(j).toFixed(1)},${y(v).toFixed(1)}`).join('');
    g += `<path d="${path(m200)}" fill="none" stroke="var(--warn)" stroke-width="1.6"/><path d="${path(m50)}" fill="none" stroke="var(--acc2)" stroke-width="1.2" opacity=".8"/><path d="${path(c)}" fill="none" stroke="var(--ink)" stroke-width="1.6"/>`;
    if (X.ma200w) g += `<line x1="${L}" x2="${W - R}" y1="${y(X.ma200w)}" y2="${y(X.ma200w)}" stroke="var(--grey)" stroke-width="1.4"/><text x="${L + 4}" y="${y(X.ma200w) - 4}" font-size="10.5" fill="var(--mute)">moyenne 200 semaines</text>`;
    g += `<circle cx="${x(A.length - 1)}" cy="${y(X.p)}" r="4" fill="var(--acc)"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Prix sur 2 ans avec supports, résistances et moyennes">${g}</svg>`;
  }
  function idView() {
    const box = document.getElementById('beId'); const a = asset(); const X = K[a];
    const seg = `<div class="seg" role="group" aria-label="Choisir la crypto"><button data-bea="BTC" aria-pressed="${a === 'BTC'}">Bitcoin</button><button data-bea="ETH" aria-pressed="${a === 'ETH'}">Ether</button></div>`;
    if (!X) { box.innerHTML = `<div class="ctitle"><h2>Carte d’identité</h2>${seg}</div><p class="note">${K.err ? 'Prix indisponibles pour le moment : réessaie plus tard.' : 'Chargement de 5 ans d’historique…'}</p>`; bindSeg(); return; }
    const z = X.zone, f = F(); const dist = v => fpc((X.p / v - 1) * 100);
    const lvRow = (zz, cls) => `<div class="be-lv"><span><b class="${cls}">${fp(zz.v)}</b> <span class="mute">${zz.tag || (zz.n >= 3 ? 'niveau fort' : 'niveau testé ' + zz.n + ' fois')}</span></span><span class="mute">${fpc((zz.v / X.p - 1) * 100)}</span></div>`;
    const trend = S.data?.trend?.assets?.[a];
    box.innerHTML = `<div class="ctitle"><h2>Carte d’identité</h2>${seg}</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><b style="font-size:26px" class="num">${fp(X.p)}</b><span class="mute">${fe(X.p / f)} · 7 j ${fpc(X.r7 * 100)} · 30 j ${fpc(X.r30 * 100)}</span></div>
      <div class="be-zone">${ZONES.map((zz, k) => `<div class="${k === z ? 'on' : ''}">${zz.t}<br>×${String(zz.m).replace('.', ',')}</div>`).join('')}</div>
      <p class="note" style="margin-top:6px">À ${fpc(X.dd * 100, 0)} de son record de ${fp(X.ath)} (${new Date(X.athT).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}). Zone « ${ZONES[z].t} » : ${ZONES[z].d}.</p>
      <div style="margin-top:8px;overflow-x:auto">${chart(X)}</div>
      <div class="legend mute" style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;margin-top:4px"><span style="color:var(--up)">▬ supports</span><span style="color:var(--down)">▬ résistances</span><span style="color:var(--warn)">▬ moyenne 200 j</span><span style="color:var(--acc2)">▬ moyenne 50 j</span><span>▬ moyenne 200 semaines</span></div>
      <div class="be-grid">
        <div><span>Moyenne 50 j</span><b>${fp(X.ma50)}</b><span>${dist(X.ma50)}</span></div>
        <div><span>Moyenne 200 j</span><b>${fp(X.ma200)}</b><span>${dist(X.ma200)}</span></div>
        <div><span>Moyenne 200 sem.</span><b>${X.ma200w ? fp(X.ma200w) : '–'}</b><span>${X.ma200w ? dist(X.ma200w) + ' · plancher des cycles' : ''}</span></div>
        <div><span>RSI 14 j</span><b>${Math.round(X.rsi)}</b><span>${X.rsi < 30 ? 'survendu' : X.rsi > 70 ? 'suracheté' : 'neutre'}</span></div>
        <div><span>Agitation</span><b>${Math.round(X.vol * 100)} %/an</b><span>${X.vol > 0.6 ? 'forte' : 'normale'}</span></div>
        <div><span>Méthode tendance</span><b>${trend ? `${trend.up ?? '?'}/${trend.nMa || 4} feux` : '–'}</b><span>${trend ? Math.round(trend.w * 100) + ' % de la poche' : ''}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px">
        <div><b style="font-size:14px" class="down">Résistances (au-dessus)</b>${X.res.length ? X.res.map(r => lvRow(r, 'down')).join('') : '<p class="note">Aucune : le prix est au plus haut.</p>'}</div>
        <div><b style="font-size:14px" class="up">Supports (en dessous)</b>${X.sup.map(s => lvRow(s, 'up')).join('')}</div>
      </div>
      <p class="note" style="margin-top:8px">Niveaux calculés automatiquement sur 2 ans : prix où le marché s’est retourné plusieurs fois. Un support cassé devient souvent une résistance. Données Binance, mises à jour à chaque visite.</p>`;
    bindSeg();
  }
  function bindSeg() { document.querySelectorAll('[data-bea]').forEach(b => b.onclick = () => { LS.set('beAsset', b.dataset.bea); render(); }); }

  /* ---------- cycles passés : combien ça a baissé, combien de temps ---------- */
  const CYC = { BTC: [['déc. 2017 → déc. 2018', 19799, 3156, -84, 363], ['nov. 2021 → nov. 2022', 69000, 15480, -78, 376], ['oct. 2025 → juil. 2026 (plus bas à ce jour)', 126200, 57800, -54, 268]],
    ETH: [['janv. 2018 → déc. 2018', 1440, 82, -94, 339], ['nov. 2021 → juin 2022', 4868, 882, -82, 220], ['août 2025 → juin 2026 (plus bas à ce jour)', 4957, 1506, -70, 286]] };
  function cycView() {
    const box = document.getElementById('beCyc'); const a = asset(); const X = K[a];
    const mx = 100; const bar = v => `<div style="height:8px;border-radius:4px;background:var(--line);margin-top:4px"><div style="height:100%;width:${Math.abs(v)}%;background:var(--down);border-radius:4px"></div></div>`;
    box.innerHTML = `<div class="ctitle"><h2>Les cycles de ${a === 'BTC' ? 'Bitcoin' : 'Ether'}</h2><span class="sub">du record au plus bas</span></div>
      <div class="list">${CYC[a].map(([p, top, low, dd, d]) => `<div class="li" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:13.5px">${p}</b><b class="down num">${dd} %</b></div><div class="mute" style="font-size:12px">${fp(top)} → ${fp(low)} · ${d} jours</div>${bar(dd)}</div>`).join('')}
      ${X ? `<div class="li" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:13.5px">Aujourd’hui</b><b class="down num">${Math.round(X.dd * 100)} %</b></div><div class="mute" style="font-size:12px">${fp(X.ath)} → ${fp(X.p)}</div>${bar(X.dd * 100)}</div>` : ''}</div>
      <p class="note" style="margin-top:8px">Les deux derniers grands marchés baissiers ont touché leur fond environ un an après le record. ${a === 'BTC' ? 'Prochain « halving » de Bitcoin : vers avril 2028 ; les cycles passés ont souvent démarré autour de cet événement.' : 'Ether baisse en général plus fort que Bitcoin dans les marchés baissiers, et remonte plus vite dans les reprises.'} Le passé ne garantit rien.</p>`;
  }

  /* ---------- contexte et agenda (analyse du 9 novembre 2026) + titres de la nuit ---------- */
  const CTX = { date: '9 novembre 2026', items: [
    ['down', 'Sorties des ETF Bitcoin', 'Environ 1,3 Md$ retirés des ETF Bitcoin au comptant sur une semaine début novembre : les investisseurs institutionnels réduisent.'],
    ['down', 'La Fed pourrait remonter ses taux', 'Les marchés à terme donnaient environ 77 % de chances d’une hausse de taux le 9 décembre : mauvais pour les actifs risqués comme la crypto.'],
    ['down', 'Ether : la mise à jour Glamsterdam retardée', 'Des développeurs alertent sur environ 200 000 anciens contrats qui pourraient casser ; le test prévu fin octobre a été reporté.'],
    ['warn', 'Piratage de Binance en octobre', 'Des retraits de plusieurs cryptos sont encore suspendus. Ton compte est sur OKX, pas concerné directement, mais la confiance du marché en pâtit.'],
    ['up', 'Fond de cycle déjà touché ?', 'Bitcoin a remonté de 30 % depuis son plus bas de juillet (57 800 $) et Ether de 40 % depuis juin (1 506 $). Les deux restent loin de leurs records.']],
    agenda: [['10 nov.', 'Inflation américaine (CPI) d’octobre'], ['18 nov.', 'Compte rendu de la réunion de la Fed d’octobre'], ['16–20 nov.', 'Nouveau test de Glamsterdam (Ether), au plus tôt'], ['25 nov.', 'Inflation PCE et PIB américain'], ['9 déc.', 'Décision de taux de la Fed']] };
  function newsView() {
    loadNews(); const box = document.getElementById('beNews'); const col = { up: 'var(--up)', down: 'var(--down)', warn: 'var(--warn)' };
    const items = (NEWS?.items || []).slice(0, 8);
    box.innerHTML = `<div class="ctitle"><h2>Ce qui fait bouger les prix</h2><span class="sub">analyse du ${CTX.date}</span></div>
      <div class="list">${CTX.items.map(([k, t, d]) => `<div class="li" style="align-items:flex-start"><span style="flex:none;width:10px;height:10px;border-radius:50%;background:${col[k]};margin-top:6px"></span><div class="mid"><b style="font-size:14px">${t}</b><div class="mute" style="font-size:12.5px">${d}</div></div></div>`).join('')}</div>
      <b style="font-size:14px;display:block;margin-top:12px">Agenda</b>
      <div class="list">${CTX.agenda.map(([d, t]) => `<div class="be-lv"><b>${d}</b><span class="mute" style="text-align:right">${t}</span></div>`).join('')}</div>
      ${items.length ? `<b style="font-size:14px;display:block;margin-top:12px">Titres de la nuit</b><div class="list">${items.map(n => `<div class="be-lv"><a href="${esc(n.link)}" target="_blank" rel="noopener" style="color:var(--ink);text-decoration:none">${esc(n.title)}</a><span class="mute" style="flex:none">${esc(n.src)}</span></div>`).join('')}</div>` : ''}
      <p class="note" style="margin-top:8px">Vert : favorable aux prix · rouge : défavorable · orange : à surveiller. Pas un conseil en investissement.</p>`;
  }

  function view() { load(); weekView(); idView(); cycView(); newsView(); }
  const prev = render;
  render = function () { prev(); if (S.view === 'btc' && S.data) view(); };
  if (S.view === 'btc' && S.data) view();
})();
