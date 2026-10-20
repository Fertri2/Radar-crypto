// Radar crypto — scan quotidien.
// 1) Signaux « Cassure journalière » (Donchian 20/10, filtre BTC > MM100) sur les cryptos liquides (≥ 5 M$/jour).
// 2) Vue d'ensemble de tout le marché Binance en USDT (≥ 0,5 M$/jour) : tendance, santé du marché, plus fortes hausses.
// Lancé chaque nuit par GitHub Actions. Écrit site/data/signals.json. Aucune dépendance.
import { mkdirSync, writeFileSync } from 'node:fs';

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

async function main() {
  const errors = [];
  const tick = await get('/api/v3/ticker/24hr');
  const all = tick
    .filter(x => x.symbol.endsWith('USDT') && +x.quoteVolume >= CFG.mktVol && +x.count > 0)
    .map(x => ({ s: x.symbol.slice(0, -4), vol: +x.quoteVolume }))
    .filter(x => /^[A-Z0-9]+$/.test(x.s) && !STABLE.has(x.s) && !/(UP|DOWN|BULL|BEAR)$/.test(x.s) && !(x.s.length >= 5 && x.s.endsWith('B')))
    .sort((a, b) => b.vol - a.vol);
  const okx = await okxList();

  const coins = [];
  for (const u of all) {
    try {
      const k = await get(`/api/v3/klines?symbol=${u.s}USDT&interval=1d&limit=120`);
      if (!Array.isArray(k) || k.length < 25) continue;
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

  const out = {
    at: new Date().toISOString(), day: coins.find(c => c.s === 'BTC')?.day, cfg: CFG, btc, fx, okxChecked: !!okx,
    tradeable: btc.on, signals: sig, near, universe: tradable.length, marketSize: coins.length, breadth,
    market: coins.map(c => ({ s: c.s, p: c.p, vol: c.vol, r1: c.r1, r7: c.r7, r30: c.r30, up: c.ma50 != null ? c.p > c.ma50 : null, brk: c.brk, dist: c.dist, tag: c.tag, elig: c.elig, okx: c.okx, spark: c.spark })),
    levels: Object.fromEntries(tradable.map(c => [c.s, { p: c.p, lo10: c.loNext, hi20: c.hiNext, atr: c.atr, r30: c.r30, hist: c.hist }])),
    errors: errors.slice(0, 20)
  };
  mkdirSync('site/data', { recursive: true });
  writeFileSync('site/data/signals.json', JSON.stringify(out));
  console.log(`OK · marché ${coins.length} · éligibles ${tradable.length} · BTC ${btc.on ? 'au-dessus' : 'sous'} MM100 · ${sig.length} signal(s) · ${near.length} proche(s) · OKX ${okx ? 'vérifié' : 'non vérifié'} · ${errors.length} erreur(s)`);
  if (tradable.length < 10) { console.error('Trop peu de cryptos lues : source de données indisponible ?'); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
