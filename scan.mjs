// Radar crypto — scan quotidien.
// 1) Signaux « Cassure journalière » (Donchian 20/10, filtre BTC > MM100) sur les cryptos liquides (≥ 5 M$/jour).
// 2) Vue d'ensemble de tout le marché Binance en USDT (≥ 0,5 M$/jour) : tendance, santé du marché, plus fortes hausses.
// Lancé chaque nuit par GitHub Actions. Écrit site/data/signals.json. Aucune dépendance.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];
const CFG = { entry: 20, exit: 10, atrN: 20, atrM: 2, btcMA: 100, minVol: 5e6, minDays: 60, near: 5, keepDays: 70, mktVol: 5e5 };

const STABLE = new Set('USDC FDUSD TUSD USDP DAI EUR USD1 BFUSD XUSD RLUSD USDE AEUR EURI PAXG XAUT WBTC WBETH BNSOL U EURC USDS'.split(' '));
const MEME = new Set('DOGE SHIB PEPE BONK FLOKI WIF TRUMP SPX PENGU FARTCOIN BRETT MOG POPCAT PUMP BOME NEIRO TURBO MEW PNUT GIGA APU 1000SATS ORDI MUBARAK BROCCOLI TST CHEEMS 1MBABYDOGE DOGS NOT MEME BANANAS31 1000CHEEMS PEOPLE BABYDOGE ACT GOAT MOODENG'.split(' '));
const ETHIC = new Set('AAVE ENA ONDO HYPE ASTER MORPHO COMP CRV EIGEN GNS JST SYRUP PENDLE LDO ETHFI SKY MKR DYDX GMX DRV KMNO USUAL FXS JTO RPL XVS CAKE AERO RAY JUP OSMO WLFI LISTA BNT VENUS ALPACA PERP INJ SNX'.split(' '));

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, hosts = HOSTS) {
  let last;
  for (const h of hosts) for (let a = 0; a < 2; a++) {
    try {
      const r = await fetch(h + url, { headers: { accept: 'application/json' } });
      if (r.ok) return await r.json();
      last = new Error(`${h}${url} → HTTP ${r.status}`);
      if (r.status === 429 || r.status === 418) await sleep(5000); else break;
    } catch (e) { last = e; await sleep(1000); }
  }
  throw last;
}

const ema = (a, n) => { const k = 2 / (n + 1); let e = a[0]; return a.map((x, i) => (e = i ? x * k + e * (1 - k) : x)); };
const sma = (a, n) => { let s = 0; return a.map((x, i) => { s += x; if (i >= n) s -= a[i - n]; return i < n - 1 ? null : s / n; }); };
const maxPrev = (a, i, k) => Math.max(...a.slice(Math.max(0, i - k), i));
const minPrev = (a, i, k) => Math.min(...a.slice(Math.max(0, i - k), i));
const sig4 = v => +(+v).toPrecision(5);

function analyse(k) {
  const now = Date.now();
  k = k.filter(x => +x[6] < now);
  const t = k.map(x => +x[0]), o = k.map(x => +x[1]), h = k.map(x => +x[2]), l = k.map(x => +x[3]), c = k.map(x => +x[4]);
  const n = c.length, i = n - 1;
  const tr = c.map((_, j) => j ? Math.max(h[j] - l[j], Math.abs(h[j] - c[j - 1]), Math.abs(l[j] - c[j - 1])) : h[j] - l[j]);
  const atr = ema(tr, CFG.atrN)[i];
  const hi20 = maxPrev(h, i, CFG.entry), hi20prev = maxPrev(h, i - 1, CFG.entry);
  const brk = n > CFG.entry + 1 && c[i] > hi20 && c[i - 1] <= hi20prev;
  const hiNext = Math.max(...h.slice(Math.max(0, i - CFG.entry + 1), i + 1));
  const loNext = Math.min(...l.slice(Math.max(0, i - CFG.exit + 1), i + 1));
  const ma50 = sma(c, 50);
  const ret = d => (n > d ? c[i] / c[i - d] - 1 : null);
  const keep = Math.min(CFG.keepDays, n);
  // part des jours où le prix était au-dessus de sa MM50 (pour la santé du marché)
  const above = c.map((x, j) => (ma50[j] == null ? null : x > ma50[j]));
  return {
    day: new Date(t[i]).toISOString().slice(0, 10), days: n, p: c[i], atr, hiNext, loNext, brk,
    stop: c[i] - CFG.atrM * atr, r1: ret(1), r7: ret(7), r30: ret(30), ma50: ma50[i],
    dist: (hiNext / c[i] - 1) * 100,
    above: above.slice(-60), aboveT: t.slice(-60),
    spark: c.slice(-30).map(sig4),
    hist: t.slice(-keep).map((tt, j) => [new Date(tt).toISOString().slice(0, 10), sig4(h[n - keep + j]), sig4(l[n - keep + j]), sig4(c[n - keep + j])])
  };
}

async function okxList() {
  try {
    const r = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
    if (!r.ok) return null;
    const j = await r.json();
    return new Set((j.data || []).filter(x => x.quoteCcy === 'USDT' && x.state === 'live').map(x => x.baseCcy));
  } catch (e) { return null; }
}


// ---------- Actions halal : momentum mensuel (top 10 du SPUS sur 12 mois, hors dernier mois) ----------
const SPUS_FALLBACK = 'NVDA AAPL MSFT GOOGL AVGO TSLA MU LLY AMD XOM JNJ ABBV CSCO PG MRK LRCX AMAT HD PANW TMO TXN LIN CRWD IBM ORCL KLAC MRVL CRM GILD ADI ANET PEP QCOM ABT COP UNP TJX ISRG NOW ACN DHR STX UBER VRTX NEM BKNG MCK MDT LOW FTNT GLW SYK FCX TT ADBE CSX EMR JCI CDNS PWR SNPS MMM WM EOG MDLZ ROST CL VRT SHW SLB ORLY CTAS UPS REGN ITW NSC ECL BSX TGT CMI APD MNST URI CAH TEL NUE FAST NXPI MPWR BDX TER A ADSK EW GWW AZO ROK WAB RSG GRMN CARR IDXX FIX OXY EBAY NKE WDAY NTAP MCHP ROP DHI FANG WAT ADM STLD ODFL VMC EXPE BIIB KMB RMD CTSH DXCM ON JBL MTD WSM HAL EXPD MLM DOV OTIS XYL CHD FFIV LH IR HSY CPRT PHM HUBB ULTA PTC VRSN TPR PPG WST CDW STE EFX DD INCY NDSN GPC PKG FSLR TSCO CF JBHT CHRW IEX GDDY MAS IT RVTY ZBRA AVY TRMB BBY RL FICO GNRC COO ALB TECH LII TYL ALLE DECK CSGP MKC SWKS LULU AOS PNR PODD ROL ALGN';
const YH = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
async function yahoo(sym, range = '2y') {
  const y = /\.(AS|PA|DE|CO|MI|SW|L)$/.test(sym) ? sym : sym.replace(/\./g, '-');
  for (const h of YH) {
    try {
      const r = await fetch(`${h}/v8/finance/chart/${y}?${range === 'max' ? `period1=946684800&period2=${Math.floor(Date.now() / 1000)}` : 'range=' + range}&interval=1d`, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
      if (!r.ok) continue;
      const j = await r.json(); const res = j.chart?.result?.[0]; if (!res) continue;
      const t = res.timestamp, a = res.indicators.adjclose?.[0]?.adjclose || res.indicators.quote[0].close;
      const q = res.indicators.quote[0];
      const out = []; for (let i = 0; i < t.length; i++) if (a[i] != null) { const f = q.close[i] ? a[i] / q.close[i] : 1; out.push([new Date(t[i] * 1000).toISOString().slice(0, 10), a[i], (q.open?.[i] ?? q.close[i]) * f, (q.high?.[i] ?? q.close[i]) * f, (q.low?.[i] ?? q.close[i]) * f, q.volume?.[i] || 0]); }
      return out;
    } catch (e) { /* hôte suivant */ }
  }
  return null;
}
async function spusHoldings() {
  try {
    const r = await fetch('https://www.sp-funds.com/wp-content/uploads/data/TidalFG_Holdings_SPUS.csv', { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (r.ok) {
      const rows = (await r.text()).trim().split('\n').slice(1).map(l => l.split(','));
      const list = rows.filter(x => x[2] && /^[A-Z.]+$/.test(x[2])).map(x => ({ s: x[2], name: x[4] }));
      if (list.length > 100) return { list, src: 'SP Funds (SPUS)' };
    }
  } catch (e) { /* liste de secours */ }
  return { list: SPUS_FALLBACK.split(' ').map(s => ({ s, name: s })), src: 'liste de secours' };
}

// ---------- Swing actions : cassure 20 séances ou repli confirmé (méthode « Swing actions ») ----------
const EU_SWING = [['ASML.AS', 'ASML'], ['SU.PA', 'Schneider Electric'], ['AI.PA', 'Air Liquide'], ['SAP.DE', 'SAP'], ['NOVO-B.CO', 'Novo Nordisk'], ['OR.PA', "L'Oréal"], ['RMS.PA', 'Hermès'], ['DSY.PA', 'Dassault Systèmes'], ['STMPA.PA', 'STMicroelectronics'], ['TTE.PA', 'TotalEnergies'], ['IFX.DE', 'Infineon']];
function wilder(k) {
  const c = k.map(x => x[1]), h = k.map(x => x[3]), l = k.map(x => x[4]), v = k.map(x => x[5]); const n = c.length, i = n - 1;
  let g = 0, lo = 0; const rs = []; for (let j = 1; j <= 14; j++) { const d = c[j] - c[j - 1]; d > 0 ? g += d : lo -= d; } g /= 14; lo /= 14;
  for (let j = 15; j < n; j++) { const d = c[j] - c[j - 1]; g = (g * 13 + Math.max(d, 0)) / 14; lo = (lo * 13 + Math.max(-d, 0)) / 14; rs.push(100 - 100 / (1 + g / (lo || 1e-12))); }
  let atr = h[0] - l[0]; for (let j = 1; j < n; j++) { const tr = Math.max(h[j] - l[j], Math.abs(h[j] - c[j - 1]), Math.abs(l[j] - c[j - 1])); atr = (atr * 13 + tr) / 14; }
  const s50 = sma(c, 50)[i], s200 = sma(c, 200)[i];
  const hi = Math.max(...h.slice(i - 20, i)), hiNext = Math.max(...h.slice(i - 19, i + 1));
  const v20 = v.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20;
  const rsiMin5 = Math.min(...rs.slice(-6));
  return { p: c[i], d1: c[i] / c[i - 1] - 1, s50, s200, rsi: rs.at(-1), atr, hi, hiNext, brk: c[i] > hi && c[i - 1] <= hi, vr: v20 ? v[i] / v20 : null,
    dip: rsiMin5 < 40, rev: c[i] > h[i - 1], hLast: h[i], low10: Math.min(...l.slice(-10)), trend: c[i] > s50 && s50 > s200, up: c[i] > s200 && s50 > s200,
    turnover: v.slice(-20).reduce((a, b) => a + b, 0) / 20 * c[i], hi52: Math.max(...h.slice(-252)), lo52: Math.min(...l.slice(-252)), spark: c.slice(-60).map(x => +x.toPrecision(5)), day: k[i][0] };
}
function swingSetup(A, mkOn) {
  if (!A) return null;
  if (mkOn && A.trend && A.brk && (A.vr ?? 0) >= 1.5 && A.rsi < 75) { const st = A.p - 2 * A.atr; return { set: 'bo', now: true, entry: A.p, stop: st, tgt: A.p + 3 * (A.p - st) }; }
  if (mkOn && A.up && A.dip && A.rev) { const st = Math.min(A.low10 - 0.5 * A.atr, A.p - 1.2 * A.atr); const d = (A.p - st) / A.p; if (d >= 0.015 && d <= 0.15) return { set: 'pb', now: true, entry: A.p, stop: st, tgt: null }; }
  if (A.up && A.dip) return { set: 'pb', now: false, entry: Math.max(A.p, A.hLast), stop: Math.min(A.low10, A.p - 1.5 * A.atr) - 0.5 * A.atr, tgt: null, dist: Math.max(0, (A.hLast / A.p - 1) * 100) };
  if (A.trend) { const dist = (A.hiNext / A.p - 1) * 100; const e = Math.max(A.p, A.hiNext); return { set: 'bo', now: false, entry: e, stop: e - 2 * A.atr, tgt: e + 6 * A.atr, dist }; }
  return null;
}

// ETF halal : tendance 200 jours, décision en fin de semaine, test sur tout l'historique Yahoo (dividendes inclus, liquidités à 0 %)
const ETF = [['SPUS', 'SP Funds S&P 500 Sharia', 'US'], ['HLAL', 'Wahed FTSE USA Shariah', 'US'], ['ISWD.L', 'iShares MSCI World Islamic', 'UCITS'], ['ISUS.L', 'iShares MSCI USA Islamic', 'UCITS'], ['ISDE.L', 'iShares MSCI EM Islamic', 'UCITS']];
const ALT = { 'ISWD.L': ['ISDW.L'] }, ETF_ERR = [];
const wk = d => Math.floor((Date.parse(d) / 864e5 + 3) / 7);
function etfTest(d, c, m, cost) {
  const i0 = 199, n = c.length - 1; let v = 1, b = 1, pv = 1, pb = 1, dv = 0, db = 0, pos = c[i0] > m[i0] ? 1 : 0, sw = 0, inn = 0;
  for (let j = i0 + 1; j <= n; j++) {
    const r = c[j] / c[j - 1] - 1; if (pos) { v *= 1 + r; inn++; } b *= 1 + r;
    pv = Math.max(pv, v); pb = Math.max(pb, b); dv = Math.min(dv, v / pv - 1); db = Math.min(db, b / pb - 1);
    if (j === n || wk(d[j + 1]) !== wk(d[j])) { const np = c[j] > m[j] ? 1 : 0; if (np !== pos) { v *= 1 - cost; pos = np; sw++; } }
  }
  const yrs = (Date.parse(d[n]) - Date.parse(d[i0])) / (365.25 * 864e5); const cg = x => +((Math.pow(x, 1 / yrs) - 1) * 100).toFixed(1);
  return { from: d[i0], yrs: +yrs.toFixed(1), cagr: cg(v), dd: +(dv * 100).toFixed(1), bh: cg(b), bhDd: +(db * 100).toFixed(1), swY: +(sw / yrs).toFixed(1), expo: Math.round(inn / (n - i0) * 100) };
}
async function etfTrend() {
  const list = [];
  for (const [s, n, z] of ETF) {
    let k = null; for (const y of [s, ...(ALT[s] || [])]) { for (let t = 0; t < 2 && !k; t++) { try { k = await yahoo(y, 'max'); } catch (e) { } if (!k) await sleep(1500); } if (k) break; }
    await sleep(150); if (!k || k.length < 320) { ETF_ERR.push(`${s} : ${k ? k.length + ' séances' : 'pas de données'}`); continue; }
    k = k.filter((x, j) => { if (j === 0 || j === k.length - 1) return true; const r1 = x[1] / k[j - 1][1], r2 = k[j + 1][1] / k[j - 1][1]; return !((r1 > 1.15 || r1 < 0.87) && r2 > 0.95 && r2 < 1.05); }); // cotations aberrantes isolées
    const d = k.map(x => x[0]), c = k.map(x => x[1]), m = sma(c, 200), i = c.length - 1;
    const lastW = d.slice(0, i).reverse().findIndex(x => wk(x) !== wk(d[i])); const jw = lastW < 0 ? i : i - 1 - lastW;
    list.push({ s, n, z, day: d[i], p: sig4(c[i]), ma: sig4(m[i]), in: c[i] > m[i], dist: +((c[i] / m[i] - 1) * 100).toFixed(2), held: c[jw] > m[jw], r1y: c.length > 253 ? +((c[i] / c[i - 252] - 1) * 100).toFixed(1) : null,
      spark: c.slice(-160).map(sig4), maSpark: m.slice(-160).map(v => v && sig4(v)), bt: etfTest(d, c, m, 0.002) });
  }
  return list.length ? { list, rule: { ma: 200, cost: 0.2 } } : null;
}

async function stocks() {
  const { list, src } = await spusHoldings();
  const spy = await yahoo('SPY'); if (!spy || spy.length < 300) throw new Error('SPY indisponible');
  const days = spy.map(x => x[0]); const di = new Map(days.map((d, i) => [d, i]));
  const spyC = spy.map(x => x[1]); const spyM = sma(spyC, 200);
  const S = {};
  for (const x of list) {
    const k = await yahoo(x.s); await sleep(60);
    if (!k || k.length < 260) continue;
    const c = Array(days.length).fill(null); for (const [d, v] of k) { const i = di.get(d); if (i != null) c[i] = v; }
    for (let i = 1; i < c.length; i++) if (c[i] == null && c[i - 1] != null) c[i] = c[i - 1];
    S[x.s] = { name: x.name, c, m200: sma(c.map(v => v ?? 0), 200), k };
  }
  const spyM50 = sma(spyC, 50); const usOn = spyC.at(-1) > spyM.at(-1) && spyM50.at(-1) > spyM.at(-1);
  let euOn = null; try { const sx = await yahoo('^STOXX'); if (sx && sx.length > 210) { const xc = sx.map(x => x[1]); euOn = xc.at(-1) > sma(xc, 200).at(-1) && sma(xc, 50).at(-1) > sma(xc, 200).at(-1); } } catch (e) { /* Europe inconnue */ }
  const EUK = {}; for (const [s, name] of EU_SWING) { const k = await yahoo(s); await sleep(60); if (k && k.length > 260) EUK[s] = { name, k }; }
  const all = {}; const swSig = [], swNear = [];
  for (const [s, v] of [...Object.entries(S), ...Object.entries(EUK)]) {
    const eu = !S[s]; const A = wilder(v.k); const mk = eu ? euOn : usOn; const st = swingSetup(A, mk !== false);
    const o = { n: v.name, eu, halal: eu ? null : true, p: A.p, d1: A.d1, s50: A.s50, s200: A.s200, rsi: A.rsi, atr: A.atr, trend: A.trend, up: A.up, hi52: A.hi52, lo52: A.lo52, liq: A.turnover, spark: A.spark, sw: st, day: A.day };
    all[s] = o;
    if (st?.now && A.turnover > 1e7) swSig.push({ s, set: st.set, entry: st.entry, stop: st.stop, tgt: st.tgt });
    else if (st && !st.now && st.dist != null && st.dist <= 3 && A.turnover > 1e7) swNear.push({ s, set: st.set, dist: st.dist, entry: st.entry });
  }
  swNear.sort((a, b) => a.dist - b.dist);
  const monthStart = d => { const m = d.slice(0, 7); return days.findIndex(x => x.slice(0, 7) === m); };
  const pick = i => {
    const on = spyC[i] > spyM[i];
    const rank = Object.entries(S).filter(([, v]) => i >= 252 && v.c[i - 252] && v.c[i]).map(([s, v]) => ({ s, name: v.name, mom: v.c[i - 21] / v.c[i - 252] - 1, up: v.c[i] > v.m200[i], p: v.c[i] })).sort((a, b) => b.mom - a.mom);
    return { on, rank, list: on ? rank.filter(r => r.up).slice(0, 10) : [] };
  };
  const last = days.length - 1;
  const iCur = monthStart(days[last]);
  const prevMonth = (() => { const d = new Date(days[iCur] + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); })();
  const iPrev = days.findIndex(x => x.slice(0, 7) === prevMonth);
  const cur = pick(iCur), prev = iPrev >= 0 ? pick(iPrev) : { list: [] }, now = pick(last);
  const curSet = new Set(cur.list.map(x => x.s)), prevSet = new Set(prev.list.map(x => x.s));
  now.rank.forEach((r, i) => { if (all[r.s]) { all[r.s].mom = r.mom; all[r.s].rank = i + 1; all[r.s].inList = curSet.has(r.s); } });
  // suivi en direct du portefeuille modèle depuis le 1er novembre 2026 (aucune optimisation après cette date)
  const LIVE = '2026-11-01'; const live = [];
  let eq = 100, held = [];
  for (let i = days.findIndex(d => d >= LIVE); i >= 0 && i <= last; i++) {
    if (held.length) { const r = held.reduce((a, s) => a + S[s].c[i] / S[s].c[i - 1], 0) / held.length; eq *= r; }
    if (i === monthStart(days[i])) held = pick(i).list.map(x => x.s);
    live.push([days[i], +eq.toFixed(2), +(spyC[i] / spyC[days.findIndex(d => d >= LIVE)] * 100).toFixed(2)]);
  }
  const nm = new Date(days[last] + 'T00:00:00Z'); nm.setUTCMonth(nm.getUTCMonth() + 1, 1);
  return {
    src, count: Object.keys(S).length, asOf: days[last], listDay: days[iCur], nextRebal: nm.toISOString().slice(0, 10),
    market: { p: spyC[last], ma200: spyM[last], on: spyC[last] > spyM[last], onAtList: cur.on },
    list: cur.list.map(x => ({ ...x, p: S[x.s].c[last], since: S[x.s].c[last] / S[x.s].c[iCur] - 1, spark: S[x.s].c.slice(-60).map(v => +(+v).toPrecision(5)) })),
    adds: cur.list.filter(x => !prevSet.has(x.s)).map(x => x.s), drops: prev.list.filter(x => !curSet.has(x.s)).map(x => x.s),
    ranking: now.rank.slice(0, 30).map(x => ({ s: x.s, name: x.name, mom: x.mom, up: x.up, p: x.p, inList: curSet.has(x.s) })),
    live,
    swing: { us: usOn, eu: euOn, sig: swSig, near: swNear.slice(0, 15) },
    all
  };
}

// ---------- Icônes de l'App (dessinées ici, aucune image à stocker) ----------
function pngIcon(n) {
  const crcT = Array.from({ length: 256 }, (_, k) => { let c = k; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const BG = [79, 70, 229], FG = [247, 247, 251], BL = [52, 211, 153]; const ss = 3; const raw = Buffer.alloc(n * (n * 3 + 1));
  const inside = (x, y) => { // coordonnées normalisées -0.5..0.5
    const r = Math.hypot(x, y), w = 0.025;
    if (Math.hypot(x - 0.17, y + 0.05) < 0.04) return BL;
    if (r < 0.045) return FG;
    for (const R of [0.34, 0.24, 0.14]) if (Math.abs(r - R) < w) return FG;
    if (x > 0 && y < 0 && r < 0.34 && Math.abs(x + y) / Math.SQRT2 < w) return FG;
    return BG;
  };
  for (let py = 0; py < n; py++) {
    raw[py * (n * 3 + 1)] = 0;
    for (let px = 0; px < n; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) { const c = inside((px + (sx + 0.5) / ss) / n - 0.5, (py + (sy + 0.5) / ss) / n - 0.5); acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; }
      const o = py * (n * 3 + 1) + 1 + px * 3; for (let k = 0; k < 3; k++) raw[o + k] = Math.round(acc[k] / (ss * ss));
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Portefeuille témoin : la méthode appliquée seule, chaque nuit, depuis son lancement ----------
// L'état est relu sur le site publié (data/track.json), mis à jour avec les nouvelles bougies, puis republié.
const TRACK = { url: 'https://fertri2.github.io/Radar-crypto/data/track.json', cap0: 10000, risk: 0.01, unitCap: 0.10, maxPos: 3, adds: 2, step: 2, fee: 0.001, maxDays: 60 };
async function loadTrack() {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`${TRACK.url}?t=${Date.now()}`, { headers: { 'cache-control': 'no-cache' } });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch (e) { /* nouvel essai */ }
    await sleep(3000);
  }
  throw new Error('track.json illisible : on ne publie pas pour ne pas effacer l’historique');
}
async function runTrack(out, KL) {
  const day = out.day; let st = await loadTrack();
  if (!st) st = { start: day, cap0: TRACK.cap0, cash: TRACK.cap0, btc0: out.btc.p, pos: [], closed: [], curve: [], lastDay: null, events: [] };
  if (st.lastDay && st.lastDay >= day) return { st, fresh: false };
  const ev = []; const candles = {};
  for (const p of st.pos) {
    let k = KL.get(p.s);
    if (!k) { try { k = (await get(`/api/v3/klines?symbol=${p.s}USDT&interval=1d&limit=120`)).filter(x => +x[6] < Date.now()); } catch (e) { k = null; } }
    candles[p.s] = k ? k.map(x => ({ d: new Date(+x[0]).toISOString().slice(0, 10), o: +x[1], h: +x[2], l: +x[3], c: +x[4] })) : [];
  }
  const lastClose = s => { const c = candles[s]; return c && c.length ? c.at(-1).c : null; };
  const equity = () => st.cash + st.pos.reduce((t, p) => t + p.q * (lastClose(p.s) ?? p.last), 0);
  const sell = (p, px, d, why) => {
    const gross = p.q * px; st.cash += gross - gross * TRACK.fee;
    const pnl = gross - gross * TRACK.fee - p.cost; const pct = pnl / p.cost * 100;
    st.closed.unshift({ s: p.s, d0: p.d0, d1: d, e: p.e, x: px, units: p.units.length, pnl: +pnl.toFixed(2), pct: +pct.toFixed(2), why });
    ev.push(`Vente ${p.s} à ${String(sig4(px)).replace('.', ',')} $ (${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1).replace('.', ',')} %) : ${why}`);
  };
  const buy = (s, px, stop, atr, d, eq) => {
    let q = (eq * TRACK.risk) / (TRACK.step * atr); q = Math.min(q, eq * TRACK.unitCap / px); const cost = q * px * (1 + TRACK.fee);
    if (!(q > 0) || cost > st.cash) return null; st.cash -= cost; return { q, cost };
  };
  // 1. positions ouvertes : stop, TP suiveur, durée, renforts, bougie par bougie
  for (const p of [...st.pos]) {
    const C = candles[p.s]; if (!C.length) continue;
    for (let j = 0; j < C.length; j++) {
      const k = C[j]; if (k.d <= p.seen || k.d > day) continue; p.seen = k.d;
      const lo10 = Math.min(...C.slice(Math.max(0, j - 10), j).map(x => x.l)); p.held++;
      if (k.l <= p.stop) { sell(p, Math.min(k.o, p.stop), k.d, p.units.length > 1 ? 'stop remonté touché' : 'stop de sécurité touché'); st.pos = st.pos.filter(x => x !== p); break; }
      if (k.c < lo10) { sell(p, k.c, k.d, 'TP suiveur (clôture sous le plus bas 10 jours)'); st.pos = st.pos.filter(x => x !== p); break; }
      if (p.held >= TRACK.maxDays) { sell(p, k.c, k.d, '60 jours écoulés'); st.pos = st.pos.filter(x => x !== p); break; }
      p.last = k.c;
      if (p.units.length < 1 + TRACK.adds && k.c >= p.lastE + TRACK.step * p.atr0) {
        const nst = Math.max(p.stop, k.c - TRACK.step * p.atr0); const b = buy(p.s, k.c, nst, p.atr0, k.d, equity());
        if (b) { p.q += b.q; p.cost += b.cost; p.units.push({ d: k.d, px: k.c }); p.lastE = k.c; p.stop = nst; ev.push(`Renfort ${p.s} à ${String(sig4(k.c)).replace('.', ',')} $, stop remonté à ${String(sig4(nst)).replace('.', ',')} $`); }
      }
    }
  }
  // 2. nouvelles entrées du jour
  if (out.tradeable) for (const s of out.signals) {
    if (st.pos.length >= TRACK.maxPos) break; if (st.pos.some(p => p.s === s.s)) continue;
    const b = buy(s.s, s.p, s.stop, s.atr, day, equity()); if (!b) continue;
    st.pos.push({ s: s.s, d0: day, e: s.p, q: b.q, cost: b.cost, stop: s.stop, atr0: s.atr, lastE: s.p, last: s.p, units: [{ d: day, px: s.p }], seen: day, held: 0 });
    candles[s.s] = candles[s.s] || []; ev.push(`Achat ${s.s} à ${String(sig4(s.p)).replace('.', ',')} $, stop ${String(sig4(s.stop)).replace('.', ',')} $`);
  }
  const eq = equity();
  st.curve.push([day, +eq.toFixed(2), +(st.cap0 * out.btc.p / st.btc0).toFixed(2)]);
  st.closed = st.closed.slice(0, 200); st.lastDay = day; st.events = ev; st.updated = new Date().toISOString();
  st.pos.forEach(p => { p.value = +(p.q * (lastClose(p.s) ?? p.last)).toFixed(2); });
  return { st, fresh: true };
}

// ---------- Alerte Telegram du matin (secrets TG_TOKEN et TG_CHAT du dépôt) ----------
// ---------- Méthode principale : tendance BTC + ETH (moyenne 100 jours, volatilité visée 40 %, ajustement le lundi) ----------
const TREND = { assets: ['BTC', 'ETH'], ma: 100, tv: 0.40, volN: 30, url: 'https://fertri2.github.io/Radar-crypto/data/trend.json', cap0: 10000, fee: 0.001, slip: 0.001, minTrade: 0.005 };
function trendSignal(K) {
  const out = {};
  for (const a of TREND.assets) {
    const k = K[a]; const c = k.map(x => +x[4]); const i = c.length - 1;
    const ma = c.slice(-TREND.ma).reduce((s, x) => s + x, 0) / TREND.ma;
    const r = []; for (let j = i - TREND.volN + 1; j <= i; j++) r.push(Math.log(c[j] / c[j - 1]));
    const m = r.reduce((s, x) => s + x, 0) / r.length; const vol = Math.sqrt(r.reduce((s, x) => s + (x - m) ** 2, 0) / (r.length - 1)) * Math.sqrt(365);
    const inn = c[i] > ma; const w = inn ? Math.min(1, TREND.tv / vol) / TREND.assets.length : 0;
    out[a] = { p: c[i], ma, in: inn, vol, w, dist: (c[i] / ma - 1) * 100, spark: c.slice(-120).map(sig4), maSpark: c.map((_, j) => j >= TREND.ma - 1 ? c.slice(j - TREND.ma + 1, j + 1).reduce((s, x) => s + x, 0) / TREND.ma : null).slice(-120).map(v => v && sig4(v)) };
  }
  const wsum = TREND.assets.reduce((s, a) => s + out[a].w, 0);
  return { assets: out, cash: 1 - wsum, rule: { ma: TREND.ma, tv: TREND.tv } };
}
async function loadJson(url) {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(`${url}?t=${Date.now()}`, { headers: { 'cache-control': 'no-cache' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); } catch (e) { /* nouvel essai */ }
    await sleep(3000);
  }
  throw new Error('trend.json illisible : on ne publie pas pour ne pas effacer l’historique');
}
async function runTrend(out, K) {
  const day = out.day; let st = await loadJson(TREND.url); const sig = out.trend; const px = a => sig.assets[a].p;
  if (!st) st = { start: day, cap0: TREND.cap0, cash: TREND.cap0, q: { BTC: 0, ETH: 0 }, btc0: px('BTC'), curve: [], lastDay: null, lastRebal: null, events: [], trades: [] };
  if (st.lastDay && st.lastDay >= day) return { st, fresh: false };
  const eqv = () => st.cash + TREND.assets.reduce((s, a) => s + st.q[a] * px(a), 0);
  const ev = []; const sunday = new Date(day + 'T00:00:00Z').getUTCDay() === 0;
  if (sunday || !st.lastRebal) {
    const E = eqv();
    const plan = TREND.assets.map(a => [a, E * sig.assets[a].w - st.q[a] * px(a)]).sort((x, y) => x[1] - y[1]); // ventes d'abord
    for (const [a, d0] of plan) {
      const target = E * sig.assets[a].w; const cur = st.q[a] * px(a); const diff = d0 > 0 ? Math.min(d0, st.cash / (1 + TREND.fee)) : d0;
      if (Math.abs(diff) < E * TREND.minTrade && !(target === 0 && cur > 0)) continue;
      if (diff > 0) { const e = px(a) * (1 + TREND.slip); const q = diff / e; st.q[a] += q; st.cash -= diff * (1 + TREND.fee); ev.push(`Achat ${a} : ${Math.round(diff).toLocaleString('fr-FR')} $`); }
      else { const x = px(a) * (1 - TREND.slip); const q = Math.min(st.q[a], -diff / px(a)); st.q[a] -= q; st.cash += q * x * (1 - TREND.fee); ev.push(`Vente ${a} : ${Math.round(q * x).toLocaleString('fr-FR')} $`); }
      st.trades.unshift({ d: day, a, side: diff > 0 ? 'achat' : 'vente', usd: Math.round(Math.abs(diff)) });
    }
    st.lastRebal = day;
  }
  const E = eqv(); st.curve.push([day, +E.toFixed(2), +(st.cap0 * px('BTC') / st.btc0).toFixed(2)]);
  st.alloc = Object.fromEntries(TREND.assets.map(a => [a, +(st.q[a] * px(a) / E).toFixed(4)])); st.alloc.cash = +(st.cash / E).toFixed(4);
  st.trades = st.trades.slice(0, 100); st.lastDay = day; st.events = ev; st.rebal = sunday; st.updated = new Date().toISOString();
  return { st, fresh: true };
}

async function telegram(out, T, TR) {
  const tok = process.env.TG_TOKEN, chat = process.env.TG_CHAT; if (!tok || !chat) return 'non configurée';
  const f = v => (+v).toLocaleString('fr-FR', { maximumSignificantDigits: 5 }); const pc = v => (v >= 0 ? '+' : '−') + Math.abs(v).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  const L = [`<b>Radar · ${new Date(out.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</b>`];
  const tg = out.trend; if (tg) {
    const monday = TR?.rebal; L.push('', monday ? '<b>Tendance BTC + ETH · ajustement du lundi</b>' : '<b>Tendance BTC + ETH</b> (ajustement lundi)');
    for (const a of ['BTC', 'ETH']) { const x = tg.assets[a]; L.push(`• ${a} : ${x.in ? 'DEDANS' : 'DEHORS'} (${pc(x.dist)} vs moyenne 100 j) · cible ${Math.round(x.w * 100)} % du capital tendance${Math.abs(x.dist) < 3 ? ' · proche de la bascule' : ''}`);
      const held = (TR?.alloc?.[a] || 0) > 0; if (TR && !monday && held !== x.in) L.push(`  ⚠ ${a} ${x.in ? 'repasse au-dessus' : 'passe sous'} sa moyenne depuis lundi : ${x.in ? 'achat' : 'vente'} lundi seulement si c’est encore vrai dimanche soir.`); }
    L.push(`• Stablecoin : ${Math.round(tg.cash * 100)} %`);
    if (TR) { const c = TR.curve.at(-1); L.push(`Témoin tendance depuis le ${new Date(TR.start).toLocaleDateString('fr-FR')} : ${pc((c[1] / TR.cap0 - 1) * 100)} (BTC ${pc((c[2] / TR.cap0 - 1) * 100)})`); TR.events.forEach(e => L.push('• ' + e)); }
  }
  L.push('', '<b>Cassure altcoins (expérimental, en papier)</b>');
  L.push(out.tradeable ? 'Marché ouvert (BTC au-dessus de sa moyenne 100 jours)' : `Marché fermé (BTC à ${pc(out.btc.dist)} de sa moyenne 100 jours), aucun achat`);
  if (out.tradeable && out.signals.length) { L.push('Cassures de la nuit :'); out.signals.slice(0, 5).forEach(s => L.push(`• ${s.s} : entrée ${f(s.p)} $ (jusqu’à +3 %), SL ${f(s.stop)} $`)); }
  else if (out.tradeable) L.push('Aucune cassure cette nuit.');
  if (out.near.length) L.push('Proches : ' + out.near.slice(0, 4).map(n => `${n.s} à ${pc(n.dist)}`).join(' · '));
  const sw = out.stocks?.swing; if (sw?.sig?.length) L.push('', '<b>Swing actions</b>', sw.sig.slice(0, 4).map(x => `${x.s} (${x.set === 'bo' ? 'cassure' : 'repli + rebond'})`).join(' · '));
  if (out.etf?.list?.length) L.push('', '<b>ETF halal · tendance 200 j</b> (décision vendredi soir)', out.etf.list.map(e => `${e.s.replace('.L', '')} ${e.in ? 'DEDANS' : 'DEHORS'} ${pc(e.dist)}`).join(' · '));
  if (T) { const c = T.curve.at(-1); const perf = (c[1] / T.cap0 - 1) * 100, bp = (c[2] / T.cap0 - 1) * 100;
    L.push(`Témoin cassure depuis le ${new Date(T.start).toLocaleDateString('fr-FR')} : ${pc(perf)} (BTC ${pc(bp)})`);
    T.events.forEach(e => L.push('• ' + e)); }
  L.push('', 'Tes propres positions : vérifie l’onglet Trades.', 'https://fertri2.github.io/Radar-crypto/', '<i>Outil d’aide à la décision, pas un conseil en investissement.</i>');
  const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: L.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }) });
  return r.ok ? 'envoyée' : 'échec HTTP ' + r.status;
}

async function main() {
  const errors = [];
  const tick = await get('/api/v3/ticker/24hr');
  const all = tick
    .filter(x => x.symbol.endsWith('USDT') && +x.quoteVolume >= CFG.mktVol && +x.count > 0)
    .map(x => ({ s: x.symbol.slice(0, -4), vol: +x.quoteVolume }))
    .filter(x => /^[A-Z0-9]+$/.test(x.s) && !STABLE.has(x.s) && !/(UP|DOWN|BULL|BEAR)$/.test(x.s) && !(x.s.length >= 5 && x.s.endsWith('B')))
    .sort((a, b) => b.vol - a.vol);
  const okx = await okxList();

  const coins = []; const KL = new Map();
  for (const u of all) {
    try {
      const k = await get(`/api/v3/klines?symbol=${u.s}USDT&interval=1d&limit=120`);
      if (!Array.isArray(k) || k.length < 25) continue;
      KL.set(u.s, k.filter(x => +x[6] < Date.now()));
      const a = analyse(k);
      const tag = MEME.has(u.s) ? 'meme' : ETHIC.has(u.s) ? 'ethique' : null;
      const elig = !tag && u.vol >= CFG.minVol && a.days >= CFG.minDays;
      coins.push({ s: u.s, vol: Math.round(u.vol), tag, elig, okx: okx ? okx.has(u.s) : null, ...a });
    } catch (e) { errors.push(`${u.s}: ${e.message}`); }
    await sleep(80);
  }

  const btcK = await get(`/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${CFG.btcMA + 40}`);
  const bk = btcK.filter(x => +x[6] < Date.now());
  const bc = bk.map(x => +x[4]);
  const bma = sma(bc, CFG.btcMA);
  const btc = { p: bc.at(-1), ma100: bma.at(-1), on: bc.at(-1) > bma.at(-1), dist: (bc.at(-1) / bma.at(-1) - 1) * 100,
    spark: bc.slice(-90).map(sig4), maSpark: bma.slice(-90).map(v => v && sig4(v)) };
  let fx = null; try { fx = +(await get('/api/v3/ticker/price?symbol=EURUSDT')).price || null; } catch (e) { errors.push('EURUSDT: ' + e.message); }

  // santé du marché : % des cryptos au-dessus de leur MM50, sur 60 jours
  const byT = new Map();
  for (const c of coins) c.above.forEach((v, j) => { if (v == null) return; const t = c.aboveT[j]; const o = byT.get(t) || [0, 0]; o[0] += v ? 1 : 0; o[1]++; byT.set(t, o); });
  const breadth = [...byT.entries()].sort((a, b) => a[0] - b[0]).filter(([, o]) => o[1] >= 20).map(([t, o]) => [new Date(t).toISOString().slice(5, 10), Math.round(o[0] / o[1] * 100)]);

  const tradable = coins.filter(c => c.elig);
  const sig = tradable.filter(c => c.brk).sort((a, b) => b.r30 - a.r30)
    .map(c => ({ s: c.s, p: c.p, stop: c.stop, lo10: c.loNext, atr: c.atr, r30: c.r30, vol: c.vol, okx: c.okx, stopPct: (c.stop / c.p - 1) * 100 }));
  const near = tradable.filter(c => !c.brk && c.dist >= 0 && c.dist <= CFG.near).sort((a, b) => a.dist - b.dist)
    .map(c => ({ s: c.s, p: c.p, trigger: c.hiNext, dist: c.dist, r30: c.r30, okx: c.okx }));

  let stk = null; try { stk = await stocks(); } catch (e) { errors.push('Actions : ' + e.message); }
  let etf = null; try { etf = await etfTrend(); } catch (e) { errors.push('ETF : ' + e.message); }
  ETF_ERR.forEach(x => errors.push('ETF ' + x));

  const out = {
    at: new Date().toISOString(), day: coins.find(c => c.s === 'BTC')?.day, cfg: CFG, btc, fx, okxChecked: !!okx,
    tradeable: btc.on, signals: sig, near, universe: tradable.length, marketSize: coins.length, breadth,
    market: coins.map(c => ({ s: c.s, p: c.p, vol: c.vol, r1: c.r1, r7: c.r7, r30: c.r30, up: c.ma50 != null ? c.p > c.ma50 : null, brk: c.brk, dist: c.dist, tag: c.tag, elig: c.elig, okx: c.okx, spark: c.spark })),
    levels: Object.fromEntries(tradable.map(c => [c.s, { p: c.p, lo10: c.loNext, hi20: c.hiNext, atr: c.atr, r30: c.r30, hist: c.hist }])),
    stocks: stk, etf,
    errors: errors.slice(0, 20)
  };
  mkdirSync('site/data', { recursive: true });
  try { writeFileSync('site/icon-192.png', pngIcon(192)); writeFileSync('site/icon-512.png', pngIcon(512)); } catch (e) { errors.push('Icônes : ' + e.message); }
  let tg = 'non envoyée', TR = null, trFresh = false;
  try {
    const ethK = (await get(`/api/v3/klines?symbol=ETHUSDT&interval=1d&limit=${CFG.btcMA + 40}`)).filter(x => +x[6] < Date.now());
    out.trend = trendSignal({ BTC: bk, ETH: ethK });
    const r = await runTrend(out); TR = r.st; trFresh = r.fresh;
    writeFileSync('site/data/trend.json', JSON.stringify(TR));
  } catch (e) {
    if (/illisible/.test(e.message)) { console.error(e.message); process.exit(1); }
    errors.push('Tendance : ' + e.message); out.errors = errors.slice(0, 20);
  }
  try {
    const { st: T, fresh } = await runTrack(out, KL);
    writeFileSync('site/data/track.json', JSON.stringify(T));
    if (fresh || trFresh || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') { try { tg = await telegram(out, T, TR); } catch (e) { tg = 'erreur : ' + e.message; } }
  } catch (e) {
    if (/illisible/.test(e.message)) { console.error(e.message); process.exit(1); }
    errors.push('Portefeuille témoin : ' + e.message); out.errors = errors.slice(0, 20);
  }
  writeFileSync('site/data/signals.json', JSON.stringify(out));
  console.log('Alerte Telegram : ' + tg);
  console.log(`OK · marché ${coins.length} · éligibles ${tradable.length} · BTC ${btc.on ? 'au-dessus' : 'sous'} MM100 · ${sig.length} signal(s) · ${near.length} proche(s) · OKX ${okx ? 'vérifié' : 'non vérifié'} · actions ${stk ? stk.count + ' lues, ' + stk.list.length + ' retenues' : 'indisponibles'} · ${errors.length} erreur(s)`);
  if (tradable.length < 10) { console.error('Trop peu de cryptos lues : source de données indisponible ?'); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
