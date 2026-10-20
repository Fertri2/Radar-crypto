// Radar crypto — scan quotidien « Cassure journalière » (Donchian 20/10, filtre BTC > MM100)
// Lancé chaque nuit par GitHub Actions. Écrit site/data/signals.json. Aucune dépendance.
import { mkdirSync, writeFileSync } from 'node:fs';

const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];
const CFG = { entry: 20, exit: 10, atrN: 20, atrM: 2, btcMA: 100, minVol: 5e6, minDays: 130, near: 5, keepDays: 70 };

const EXCLUDE = new Set((
  // stablecoins, or, wrapped
  'USDC FDUSD TUSD USDP DAI EUR USD1 BFUSD XUSD RLUSD USDE AEUR EURI PAXG XAUT WBTC WBETH BNSOL U ' +
  // memecoins
  'DOGE SHIB PEPE BONK FLOKI WIF TRUMP SPX PENGU FARTCOIN BRETT MOG POPCAT PUMP BOME NEIRO TURBO MEW PNUT GIGA APU 1000SATS ORDI MUBARAK BROCCOLI TST CHEEMS 1MBABYDOGE DOGS NOT MEME BANANAS31 ' +
  // prêt, intérêts, dérivés, rendement : exclus par la contrainte éthique
  'AAVE ENA ONDO HYPE ASTER MORPHO COMP CRV EIGEN GNS JST SYRUP PENDLE LDO ETHFI SKY MKR DYDX GMX DRV KMNO USUAL FXS JTO RPL XVS CAKE AERO RAY JUP OSMO WLFI LISTA BNT'
).split(/\s+/));

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(path) {
  let last;
  for (const h of HOSTS) for (let a = 0; a < 2; a++) {
    try {
      const r = await fetch(h + path, { headers: { 'accept': 'application/json' } });
      if (r.ok) return await r.json();
      last = new Error(`${h}${path} → HTTP ${r.status}`);
      if (r.status === 429 || r.status === 418) await sleep(5000); else break;
    } catch (e) { last = e; await sleep(1000); }
  }
  throw last;
}

const ema = (a, n) => { const k = 2 / (n + 1); let e = a[0]; return a.map((x, i) => (e = i ? x * k + e * (1 - k) : x)); };
const sma = (a, n) => { let s = 0; return a.map((x, i) => { s += x; if (i >= n) s -= a[i - n]; return i < n - 1 ? null : s / n; }); };
const maxPrev = (a, i, k) => Math.max(...a.slice(i - k, i));
const minPrev = (a, i, k) => Math.min(...a.slice(i - k, i));

function analyse(k) {
  const now = Date.now();
  k = k.filter(x => +x[6] < now); // bougies journalières clôturées uniquement
  const t = k.map(x => +x[0]), o = k.map(x => +x[1]), h = k.map(x => +x[2]), l = k.map(x => +x[3]), c = k.map(x => +x[4]);
  const n = c.length, i = n - 1;
  const tr = c.map((_, j) => j ? Math.max(h[j] - l[j], Math.abs(h[j] - c[j - 1]), Math.abs(l[j] - c[j - 1])) : h[j] - l[j]);
  const atr = ema(tr, CFG.atrN)[i];
  const hi20 = maxPrev(h, i, CFG.entry), hi20prev = maxPrev(h, i - 1, CFG.entry);
  const lo10 = minPrev(l, i, CFG.exit);
  const brk = c[i] > hi20 && c[i - 1] <= hi20prev;
  // niveaux pour demain : plus haut des 20 derniers jours (aujourd'hui inclus) et plus bas des 10 derniers jours
  const hiNext = Math.max(...h.slice(i - CFG.entry + 1, i + 1));
  const loNext = Math.min(...l.slice(i - CFG.exit + 1, i + 1));
  const r30 = c[i] / c[i - 30] - 1;
  const keep = Math.min(CFG.keepDays, n);
  return {
    day: new Date(t[i]).toISOString().slice(0, 10), p: c[i], o: o[i], atr, hi20, lo10, hiNext, loNext, brk,
    stop: c[i] - CFG.atrM * atr, r30, r1: c[i] / c[i - 1] - 1,
    dist: (hiNext / c[i] - 1) * 100,
    hist: t.slice(-keep).map((tt, j) => [new Date(tt).toISOString().slice(0, 10), +h[n - keep + j].toPrecision(6), +l[n - keep + j].toPrecision(6), +c[n - keep + j].toPrecision(6)]),
    n
  };
}

async function main() {
  const tick = await get('/api/v3/ticker/24hr');
  const uni = tick
    .filter(x => x.symbol.endsWith('USDT') && +x.quoteVolume >= CFG.minVol)
    .map(x => ({ s: x.symbol.slice(0, -4), vol: +x.quoteVolume }))
    .filter(x => !EXCLUDE.has(x.s) && !/(UP|DOWN|BULL|BEAR)$/.test(x.s) && !(x.s.length >= 5 && x.s.endsWith('B')) && /^[A-Z0-9]+$/.test(x.s))
    .sort((a, b) => b.vol - a.vol);
  if (!uni.find(x => x.s === 'BTC')) uni.unshift({ s: 'BTC', vol: 0 });

  const coins = [], errors = [];
  for (const u of uni) {
    try {
      const k = await get(`/api/v3/klines?symbol=${u.s}USDT&interval=1d&limit=${CFG.minDays + 20}`);
      if (!Array.isArray(k) || k.length < CFG.minDays) continue;
      const a = analyse(k);
      coins.push({ s: u.s, vol: Math.round(u.vol), ...a });
    } catch (e) { errors.push(`${u.s}: ${e.message}`); }
    await sleep(120);
  }

  const btcK = await get(`/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${CFG.btcMA + 40}`);
  const bc = btcK.filter(x => +x[6] < Date.now()).map(x => +x[4]);
  const ma = sma(bc, CFG.btcMA).at(-1);
  const btc = { p: bc.at(-1), ma100: ma, on: bc.at(-1) > ma, dist: (bc.at(-1) / ma - 1) * 100 };
  let fx = null; try { fx = +(await get('/api/v3/ticker/price?symbol=EURUSDT')).price || null; } catch (e) { errors.push('EURUSDT: ' + e.message); }

  const sig = coins.filter(c => c.brk).sort((a, b) => b.r30 - a.r30)
    .map(c => ({ s: c.s, p: c.p, stop: c.stop, lo10: c.loNext, atr: c.atr, r30: c.r30, vol: c.vol, stopPct: (c.stop / c.p - 1) * 100 }));
  const near = coins.filter(c => !c.brk && c.dist >= 0 && c.dist <= CFG.near).sort((a, b) => a.dist - b.dist)
    .map(c => ({ s: c.s, p: c.p, trigger: c.hiNext, dist: c.dist, r30: c.r30 }));

  const out = {
    at: new Date().toISOString(), day: coins.find(c => c.s === 'BTC')?.day, cfg: CFG, btc, fx,
    tradeable: btc.on, signals: sig, near, universe: coins.length,
    levels: Object.fromEntries(coins.map(c => [c.s, { p: c.p, lo10: c.loNext, hi20: c.hiNext, atr: c.atr, r30: c.r30, hist: c.hist }])),
    errors: errors.slice(0, 20)
  };
  mkdirSync('site/data', { recursive: true });
  writeFileSync('site/data/signals.json', JSON.stringify(out));
  console.log(`OK · ${coins.length} cryptos · BTC ${btc.on ? 'au-dessus' : 'sous'} MM100 · ${sig.length} signal(s) · ${near.length} proche(s) · ${errors.length} erreur(s)`);
  if (coins.length < 10) { console.error('Trop peu de cryptos lues : source de données indisponible ?'); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
