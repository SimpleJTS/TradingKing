type Chain = 'bsc' | 'solana';
type TradeSide = 'buy' | 'sell';

interface DetectedAsset {
  chain: Chain;
  address: string;
  source: string;
  confidence: number;
}

interface QuoteResult {
  protocol: string;
  phase: string;
  amountIn: string;
  minimumReceived: string;
  warnings: string[];
  tradePath?: { router: string; method: string; calldata: string; value?: string; approvalTarget?: string };
}

interface WalletSummary {
  id: string;
  chain: Chain;
  address: string;
  alias?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TradeSettings {
  activeChain: Chain;
  slippageBps: number;
  gasFeeGwei: string;
  priorityFee: string;
  mevProtection: boolean;
  autoSlippage: boolean;
  selectedWalletId: string;
  buyPresets: string[];
  sellPresets: string[];
}

const BSC_ADDRESS_RE = /0x[a-fA-F0-9]{40}/;
const SOLANA_MINT_RE = /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/;
const POSITION_STORAGE_KEY = 'tradingking:floating-position:v1';
const SETTINGS_STORAGE_KEY = 'tradingking:trade-settings:v2';

const DEFAULT_SETTINGS: TradeSettings = {
  activeChain: 'bsc',
  slippageBps: 500,
  gasFeeGwei: '0.1',
  priorityFee: '0',
  mevProtection: true,
  autoSlippage: true,
  selectedWalletId: '',
  buyPresets: ['0.02', '0.036', '0.066', '0.086'],
  sellPresets: ['10', '25', '50', '100'],
};

const STYLES = `
:host { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }
button, input, select { font: inherit; }
button { border: 0; }
.tk-window { position: fixed; right: 10px; bottom: 10px; width: 286px; min-width: 286px; max-width: 286px; max-height: min(460px, calc(100vh - 20px)); color: #eef2f4; background: #15171b; border: 1px solid #252931; border-radius: 9px; box-shadow: 0 12px 32px rgba(0,0,0,.42); overflow: hidden; z-index: 2147483647; }
.tk-card { display: flex; flex-direction: column; gap: 8px; width: 100%; max-height: min(460px, calc(100vh - 20px)); padding: 10px 12px; background: #171a1f; border-radius: 12px; font-size: 11px; overflow-y: auto; scrollbar-width: thin; }
.tk-topbar { height: 38px; min-height: 38px; display: flex; align-items: center; justify-content: space-between; margin: -10px -12px 0; padding: 0 10px; border-bottom: 1px solid #252a32; cursor: grab; user-select: none; }
.tk-tools, .tk-actions { display: flex; align-items: center; gap: 9px; }
.tk-icon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; color: #88919b; background: transparent; cursor: pointer; padding: 0; }
.tk-icon-active { color: #7be59f; }
.tk-icon svg { width: 14px; height: 14px; fill: currentColor; }
.tk-wallet-pill { display: inline-flex; align-items: center; gap: 3px; min-width: 38px; height: 22px; padding: 0 5px; color: #f0f3f5; background: #23272f; border-radius: 4px; cursor: pointer; }
.tk-wallet-pill svg { width: 14px; height: 14px; fill: currentColor; }
.tk-muted { color: #7f8790; }
.tk-section { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.tk-section-head { display: flex; justify-content: space-between; align-items: center; min-height: 20px; position: relative; }
.tk-title-tabs { display: flex; align-items: center; gap: 5px; color: #f4f6f8; font-size: 12px; font-weight: 600; white-space: nowrap; }
.tk-title-tabs strong { font-size: 12px; font-weight: 600; }
.tk-gear-tabs { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border-radius: 4px; background: transparent; }
.tk-gear { display: inline-flex; align-items: center; justify-content: center; height: 18px; min-width: 18px; padding: 0 3px; border-radius: 4px; color: #78818b; background: transparent; font-size: 11px; cursor: pointer; }
.tk-gear-active { color: #7be59f; background: #20242b; }
.tk-balance { display: flex; align-items: center; gap: 3px; color: #eff3f5; font-size: 11px; white-space: nowrap; max-width: 112px; overflow: hidden; text-overflow: ellipsis; }
.tk-bnb { color: #fed15c; }
.tk-preset-grid { display: flex; flex-wrap: wrap; gap: 6px; min-height: 24px; }
.tk-preset-wrap { width: calc(25% - 5px); min-width: calc(25% - 5px); }
.tk-preset { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 24px; height: 24px; border: 1px solid currentColor; border-radius: 6px; background: transparent; font-size: 12px; font-weight: 650; cursor: pointer; user-select: none; }
.tk-buy { color: #79e59d; }
.tk-buy:hover { background: rgba(121,229,157,.12); }
.tk-sell { color: #ff638b; }
.tk-sell:hover { background: rgba(255,99,139,.12); }
.tk-options { display: flex; align-items: center; justify-content: space-between; height: 20px; color: #858d96; }
.tk-option-list { display: flex; align-items: center; gap: 5px; min-width: 0; }
.tk-option { display: inline-flex; align-items: center; gap: 2px; color: #858d96; white-space: nowrap; }
.tk-option svg { width: 12px; height: 12px; fill: currentColor; }
.tk-option-strong { color: #fed15c; }
.tk-advanced-link { display: inline-flex; align-items: center; gap: 4px; color: #858d96; text-decoration: underline; background: transparent; cursor: pointer; padding: 0; white-space: nowrap; }
.tk-checkbox { width: 14px; height: 14px; border: 1px solid #858d96; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; }
.tk-checkbox-on::after { content: ''; width: 8px; height: 8px; border-radius: 2px; background: #7be59f; }
.tk-divider { height: 1px; margin: 0 -12px; background: #252a32; }
.tk-pnl { margin: -2px -12px 0; padding: 6px 12px 0; border-top: 1px solid #252a32; }
.tk-pnl-grid { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.tk-stat { display: flex; flex-direction: column; gap: 2px; min-width: 48px; color: #858d96; white-space: nowrap; }
.tk-stat:nth-child(2), .tk-stat:nth-child(3) { align-items: center; min-width: 58px; }
.tk-stat:last-child { align-items: flex-end; min-width: 58px; }
.tk-stat-value { color: #858d96; font-weight: 600; }
.tk-detected { display: none; color: #858d96; font-size: 10px; line-height: 1.25; word-break: break-all; }
.tk-route { max-height: 120px; overflow-y: auto; padding: 6px; border: 1px solid #282d36; border-radius: 8px; color: #9aa3ad; background: #14161a; font-size: 10px; line-height: 1.45; word-break: break-all; }
.tk-route strong { color: #eff3f5; }
.tk-warning { color: #f6d365; }
.tk-settings, .tk-wallet-panel { display: none; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 8px; border: 1px solid #2b3038; border-radius: 8px; background: #14161a; }
.tk-settings-open [data-settings-panel] { display: flex; }
.tk-settings-title { display: flex; align-items: center; justify-content: space-between; color: #eff3f5; font-weight: 650; }
.tk-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.tk-field { display: flex; flex-direction: column; gap: 4px; color: #858d96; }
.tk-field-full { grid-column: 1 / -1; }
.tk-input, .tk-select { width: 100%; height: 24px; padding: 0 6px; border: 1px solid #303640; border-radius: 6px; color: #eff3f5; background: #1d2026; outline: none; }
.tk-input:focus, .tk-select:focus { border-color: #7be59f; }
.tk-small-btn { height: 24px; padding: 0 8px; border-radius: 6px; color: #101418; background: #7be59f; font-weight: 700; cursor: pointer; }
.tk-ghost-btn { height: 24px; padding: 0 8px; border: 1px solid #303640; border-radius: 6px; color: #c7cdd3; background: transparent; cursor: pointer; }
.tk-wallet-list { display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto; }
.tk-wallet-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px; border: 1px solid #282d36; border-radius: 6px; background: #191c21; color: #c7cdd3; }
.tk-wallet-main { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tk-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-hidden { display: none; }
.tk-collapsed { width: auto; min-width: auto; }
.tk-collapsed .tk-card > :not(.tk-topbar) { display: none; }
.tk-collapsed .tk-topbar { margin: 0; border-bottom: 0; }
`;

const ICONS = {
  keyboard: '<svg viewBox="0 0 16 16"><path d="M13 1.5c1.1046 0 2 .8954 2 2v9c0 1.1046-.8954 2-2 2H3c-1.1046 0-2-.8954-2-2v-9c0-1.1046.8954-2 2-2zm-9.5 8.7207v1.2998h9v-1.2998zm0-2.871v1.6005h1.5996V7.3496zm3.7002 0v1.6005h1.5996V7.3496zm3.7002 0v1.6005H12.5V7.3496zM3.5 4.4794V6.08h1.5996V4.4795zm3.7002 0V6.08h1.5996V4.4795zm3.7002 0V6.08H12.5V4.4795z"/></svg>',
  pnl: '<svg viewBox="0 0 16 16"><path d="M6.66 2.317a.8.8 0 0 1 .8-.8h1.089a.8.8 0 0 1 .8.8v11.449a.8.8 0 0 1-.8.7999l-1.089.0002c-.3775 0-.8-.3582-.8-.8zM1.2556 9.6248a.8.8 0 0 1 .8-.8h1.089a.8.8 0 0 1 .8.8v4.1412a.8.8 0 0 1-.8.7999l-1.089.0002c-.3774 0-.8-.3582-.8-.8zM11.9596 7.2626a.8.8 0 0 1 .8-.8l1.0891.0001a.8.8 0 0 1 .8.8v6.5033a.8.8 0 0 1-.8.7999l-1.0891.0002c-.3774 0-.8-.3582-.8-.8z"/></svg>',
  chart: '<svg viewBox="0 0 16 16"><path d="M.789 2.0473a.5.5 0 0 1 .5-.5h1.318a.5.5 0 0 1 .5.5v11.3338a.5.5 0 0 1-.5.5H1.289a.5.5 0 0 1-.5-.5zM.789 14.379a.5.5 0 0 0 .5.5h13.4217a.5.5 0 0 0 .5-.5v-1.2474a.5.5 0 0 0-.5-.5H1.2891a.5.5 0 0 0-.5.5zM14.8574 3.6087a.5.5 0 0 1 0 .7071L9.9042 9.269a.5.5 0 0 1-.707 0L7.7395 7.8115l-2.181 2.181a.5.5 0 0 1-.7071 0l-.9197-.9197a.5.5 0 0 1 0-.7071L7.386 4.9115a.5.5 0 0 1 .707 0l1.4576 1.4574 3.6799-3.6798a.5.5 0 0 1 .7071 0z"/></svg>',
  wave: '<svg viewBox="0 0 16 16"><path d="M.9685 12.238C.763 12.3563.5 12.2118.5 11.9747v-1.5202c0-.2652.1304-.5152.3555-.6555q.806-.5025 1.534-.7505.9254-.3022 1.7352-.3022 1.0797 0 2.0822.3777 1.0026.3778 1.928.9064.9641.491 1.8895.8687.9255.3776 1.8509.3776.8098 0 1.6967-.3021.707-.2309 1.459-.66c.2059-.1175.469.0271.469.2642v1.6792c0 .1658-.0818.3216-.2213.4111q-.8838.5673-1.7067.8359-.8869.3021-1.6967.3022-1.0797 0-2.0822-.3777a19.4 19.4 0 0 1-1.9666-.8687q-.9255-.5287-1.851-.9064t-1.8508-.3777q-.8098 0-1.7352.3022-.6769.2306-1.421.6591"/></svg>',
  wallet: '<svg viewBox="0 0 16 16"><path d="M13.7354 5.763a.3.3 0 0 0-.2999-.2997H3.0635c-.2821 0-.551-.0556-.7988-.1524v8.0264c0 .1657.134.3008.2997.3008h10.8711a.301.301 0 0 0 .2999-.3008zm-2.6397 2.832a.7003.7003 0 0 1 .7002.7003.7.7 0 0 1-.7002.6992H8.916a.7.7 0 0 1-.7002-.6992.7004.7004 0 0 1 .7002-.7002zm4.0391 4.7423c0 .9387-.7606 1.6999-1.6993 1.7002H2.5645c-.939 0-1.7002-.7613-1.7002-1.7002V3.264C.8643 1.993 1.895.9623 3.166.9623h7.9297a.7003.7003 0 0 1 .7002.7002.7003.7003 0 0 1-.7002.7002H3.166a.9013.9013 0 0 0-.9013.9013c0 .4413.3575.7988.7988.7989h10.372c.9387.0002 1.6992.7615 1.6993 1.7002z"/></svg>',
  slip: '<svg viewBox="0 0 16 16"><path d="M4.3997 2.3049c0 .9125-.7397 1.6523-1.6522 1.6523s-1.6523-.7398-1.6523-1.6523S1.835.6526 2.7475.6526s1.6522.7398 1.6522 1.6523M14.4844 14.0867a.7004.7004 0 0 1 .7002.7002.7003.7003 0 0 1-.7002.7002H1.5156a.7003.7003 0 0 1-.7002-.7002.7003.7003 0 0 1 .7002-.7002z"/></svg>',
  gas: '<svg viewBox="0 0 16 16"><path d="M2.6621 13.3623H7.129V8.7002H2.6621zm0-6.0625H7.129V2.6377H2.6621zm5.8672 0h1.2979c1.2701 0 2.2995 1.0297 2.2998 2.2998v2.8633c.0002.4969.4034.8994.9003.8994h.1641a.8996.8996 0 0 0 .8994-.8994v-7.082a.3.3 0 0 0-.0879-.212l-2.7363-2.7363a.7003.7003 0 0 1 .9902-.9902l2.7364 2.7363c.3187.3187.4979.7514.498 1.2022v7.082c-.0002 1.2699-1.0298 2.2996-2.2998 2.2998h-.1641c-1.2701 0-2.2995-1.0297-2.2998-2.2998V9.5996c-.0002-.4969-.4034-.8994-.9003-.8994H8.5293v4.6621h.419a.7003.7003 0 0 1 .7001.7002.7003.7003 0 0 1-.7002.7002H.8887a.7003.7003 0 0 1-.7002-.7002.7003.7003 0 0 1 .7002-.7002h.374V2.5371c.0002-.7178.582-1.2998 1.2998-1.2998h4.667c.7178 0 1.2996.582 1.2998 1.2998z"/></svg>',
};

function loadSettings(): TradeSettings {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<TradeSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      buyPresets: Array.isArray(parsed.buyPresets) && parsed.buyPresets.length === 4 ? parsed.buyPresets : DEFAULT_SETTINGS.buyPresets,
      sellPresets: Array.isArray(parsed.sellPresets) && parsed.sellPresets.length === 4 ? parsed.sellPresets : DEFAULT_SETTINGS.sellPresets,
    };
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: TradeSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function chainFromHostAndPath(url: URL): Chain | null {
  const value = `${url.hostname}${url.pathname}`.toLowerCase();
  if (value.includes('bsc') || value.includes('four.meme') || value.includes('pancakeswap') || value.includes('bscscan') || value.includes('debot')) {
    return 'bsc';
  }
  if (value.includes('solana') || value.includes('pump.fun') || value.includes('solscan') || value.includes('photon-sol')) {
    return 'solana';
  }
  return null;
}

function detectFromText(source: string, chain: Chain | null): Pick<DetectedAsset, 'chain' | 'address'> | null {
  if (chain === 'bsc') {
    const bscAddress = source.match(BSC_ADDRESS_RE)?.[0];
    return bscAddress ? { chain: 'bsc', address: bscAddress } : null;
  }
  if (chain === 'solana') {
    const solanaMint = source.match(SOLANA_MINT_RE)?.[0];
    return solanaMint ? { chain: 'solana', address: solanaMint } : null;
  }
  const bscAddress = source.match(BSC_ADDRESS_RE)?.[0];
  if (bscAddress) {
    return { chain: 'bsc', address: bscAddress };
  }
  const solanaMint = source.match(SOLANA_MINT_RE)?.[0];
  return solanaMint ? { chain: 'solana', address: solanaMint } : null;
}

function detectCurrentAsset(): DetectedAsset | null {
  const url = new URL(location.href);
  const chain = chainFromHostAndPath(url);
  const haystack = [url.href, document.title, document.body?.innerText.slice(0, 10_000) ?? ''].join('\n');
  const detected = detectFromText(haystack, chain);
  if (!detected) {
    return null;
  }
  return {
    ...detected,
    source: url.hostname.toLowerCase().includes('debot') ? 'debot-page-detector' : 'generic-url-dom-detector',
    confidence: chain ? 0.9 : 0.65,
  };
}

function ensureTradingKingHost(): ShadowRoot {
  const existing = document.getElementById('tradingking-floating-host');
  if (existing?.shadowRoot) {
    return existing.shadowRoot;
  }
  const host = existing ?? document.createElement('div');
  host.id = 'tradingking-floating-host';
  host.style.all = 'initial';
  document.documentElement.append(host);
  return host.attachShadow({ mode: 'open' });
}

function restorePosition(app: HTMLElement): void {
  const raw = localStorage.getItem(POSITION_STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const position = JSON.parse(raw) as { left: number; top: number };
    if (Number.isFinite(position.left) && Number.isFinite(position.top)) {
      app.style.left = `${Math.max(8, Math.min(position.left, window.innerWidth - 80))}px`;
      app.style.top = `${Math.max(8, Math.min(position.top, window.innerHeight - 48))}px`;
      app.style.right = 'auto';
      app.style.bottom = 'auto';
    }
  } catch {
    localStorage.removeItem(POSITION_STORAGE_KEY);
  }
}

function enableDragging(app: HTMLElement, handle: HTMLElement): void {
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  handle.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button,input,select')) {
      return;
    }
    const rect = app.getBoundingClientRect();
    dragging = true;
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (!dragging) {
      return;
    }
    const left = Math.max(8, Math.min(event.clientX - offsetX, window.innerWidth - app.offsetWidth - 8));
    const top = Math.max(8, Math.min(event.clientY - offsetY, window.innerHeight - app.offsetHeight - 8));
    app.style.left = `${left}px`;
    app.style.top = `${top}px`;
    app.style.right = 'auto';
    app.style.bottom = 'auto';
  });
  handle.addEventListener('pointerup', (event) => {
    if (!dragging) {
      return;
    }
    dragging = false;
    handle.releasePointerCapture(event.pointerId);
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ left: app.offsetLeft, top: app.offsetTop }));
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function shortAddress(address: string): string {
  if (address.length <= 14) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function renderWarnings(warnings: string[]): string {
  return warnings.map((warning) => `<div class="tk-warning">⚠ ${escapeHtml(warning)}</div>`).join('');
}

function renderRoute(quote: QuoteResult, settings: TradeSettings): string {
  const path = quote.tradePath;
  return `
    <strong>${escapeHtml(quote.protocol)}</strong> · ${escapeHtml(quote.phase)}<br>
    滑点：${(settings.slippageBps / 100).toFixed(2)}% · Gas/Fee：${escapeHtml(settings.gasFeeGwei)} · Priority：${escapeHtml(settings.priorityFee)} · MEV：${settings.mevProtection ? '开' : '关'}<br>
    ${path ? `Router：${escapeHtml(path.router)}<br>Method：${escapeHtml(path.method)}<br>Value：${escapeHtml(path.value ?? '0')}<br>Calldata：${escapeHtml(path.calldata)}<br>` : ''}
    ${renderWarnings(quote.warnings)}
  `;
}

async function sendMessage<T>(message: unknown): Promise<T> {
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; data?: T; error?: string };
  if (!response.ok) {
    throw new Error(response.error ?? 'Background request failed');
  }
  return response.data as T;
}

async function requestQuote(chain: Chain, tokenAddress: string, amount: string, side: TradeSide, settings: TradeSettings): Promise<QuoteResult> {
  return sendMessage<QuoteResult>({
    type: 'QUOTE',
    payload: {
      chain,
      tokenAddress,
      side,
      amount,
      slippageBps: settings.autoSlippage ? settings.slippageBps : settings.slippageBps,
      source: location.hostname.toLowerCase().includes('debot') ? 'debot-page-detector' : 'floating-window',
      gasFeeGwei: settings.gasFeeGwei,
      priorityFee: settings.priorityFee,
      mevProtection: settings.mevProtection,
      walletId: settings.selectedWalletId,
    },
  });
}

function parsePresetList(value: string, fallback: string[]): string[] {
  const parsed = value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 4);
  return parsed.length === 4 ? parsed : fallback;
}

function renderPresetButtons(values: string[], side: TradeSide): string {
  const attr = side === 'buy' ? 'data-buy-amount' : 'data-sell-percent';
  const cls = side === 'buy' ? 'tk-buy' : 'tk-sell';
  const suffix = side === 'buy' ? '' : '%';
  return values.map((value) => `
    <div class="tk-preset-wrap"><button class="tk-preset ${cls}" type="button" ${attr}="${escapeHtml(value)}">${escapeHtml(value)}${suffix}</button></div>
  `).join('');
}

function renderWalletRows(wallets: WalletSummary[], selectedWalletId: string): string {
  if (wallets.length === 0) {
    return '<div class="tk-muted">暂无钱包。可在下方导入钱包，私钥会交给 background vault 加密保存。</div>';
  }
  return wallets.map((wallet) => `
    <button class="tk-wallet-row" type="button" data-select-wallet="${escapeHtml(wallet.id)}">
      <span class="tk-wallet-main"><span>${escapeHtml(wallet.alias || wallet.chain.toUpperCase())} ${wallet.id === selectedWalletId ? '✓' : ''}</span><span class="tk-muted tk-ellipsis">${escapeHtml(wallet.address)}</span></span>
      <span class="tk-muted">${wallet.enabled ? '启用' : '停用'}</span>
    </button>
  `).join('');
}

function buildPanel(settings: TradeSettings, initialAsset: DetectedAsset | null, wallets: WalletSummary[]): string {
  const walletCount = wallets.length;
  const selectedWallet = wallets.find((wallet) => wallet.id === settings.selectedWalletId) ?? wallets[0];
  const tokenSymbol = initialAsset ? shortAddress(initialAsset.address) : "Don't pa";
  return `
    <div class="tk-card" data-route-kind="Four.meme OpenFour">
      <header class="tk-topbar">
        <div class="tk-tools">
          <button class="tk-icon tk-icon-active" type="button" title="键盘快捷交易">${ICONS.keyboard}</button>
          <button class="tk-icon tk-icon-active" type="button" title="PnL">${ICONS.pnl}</button>
          <button class="tk-icon" type="button" title="持仓">${ICONS.chart}</button>
          <button class="tk-icon tk-icon-active" type="button" title="近似路由">${ICONS.wave}</button>
          <button class="tk-icon" type="button" data-settings-toggle title="设置">✎</button>
        </div>
        <div class="tk-actions">
          <button class="tk-wallet-pill" type="button" data-wallet-toggle title="钱包信息">${ICONS.wallet}<span data-wallet-count>${walletCount}</span><span>⌄</span></button>
          <button class="tk-icon" type="button" data-settings-toggle title="设置">⚙</button>
          <button class="tk-icon" type="button" data-collapse title="收起">×</button>
        </div>
      </header>

      <div class="tk-detected" data-detected>${initialAsset ? `${initialAsset.chain.toUpperCase()} · ${escapeHtml(initialAsset.address)} · ${escapeHtml(initialAsset.source)} · ${Math.round(initialAsset.confidence * 100)}%` : '未检测到页面 Token；可在设置里手动确认链和钱包。'}</div>

      <section class="tk-section" data-testid="instant_trade_buy">
        <div class="tk-section-head">
          <div class="tk-title-tabs"><strong>买入</strong><div class="tk-gear-tabs"><button class="tk-gear tk-gear-active" type="button">P1</button><button class="tk-gear" type="button">P2</button><button class="tk-gear" type="button">P3</button></div></div>
          <div class="tk-balance"><span class="tk-bnb">⬢</span><span>${settings.activeChain === 'bsc' ? '0.0367' : 'SOL --'}</span></div>
        </div>
        <div class="tk-preset-grid">${renderPresetButtons(settings.buyPresets, 'buy')}</div>
        <div class="tk-options">
          <div class="tk-option-list">
            <span class="tk-option">${ICONS.slip}${settings.autoSlippage ? '自动' : `${(settings.slippageBps / 100).toFixed(2)}%`}</span>
            <span class="tk-option">${ICONS.gas}${escapeHtml(settings.gasFeeGwei)}</span>
            <span class="tk-option">⚡${escapeHtml(settings.priorityFee)}</span>
            <span class="tk-option ${settings.mevProtection ? '' : 'tk-option-strong'}">🍔 ${settings.mevProtection ? '开' : '关'}</span>
          </div>
          <button class="tk-advanced-link" type="button" data-settings-toggle><span class="tk-checkbox ${settings.autoSlippage ? 'tk-checkbox-on' : ''}"></span>高级</button>
        </div>
      </section>

      <div class="tk-divider"></div>

      <section class="tk-section" data-testid="instant_trade_sell">
        <div class="tk-section-head">
          <div class="tk-title-tabs"><strong>卖出</strong><div class="tk-gear-tabs"><button class="tk-gear tk-gear-active" type="button">P1</button><button class="tk-gear" type="button">P2</button><button class="tk-gear" type="button">P3</button></div></div>
          <div class="tk-balance"><span>0&nbsp;${escapeHtml(tokenSymbol)}</span><span class="tk-bnb">⬢</span><span>0</span></div>
        </div>
        <div class="tk-preset-grid">${renderPresetButtons(settings.sellPresets, 'sell')}</div>
        <div class="tk-options">
          <div class="tk-option-list">
            <span class="tk-option">${ICONS.slip}${settings.autoSlippage ? '自动' : `${(settings.slippageBps / 100).toFixed(2)}%`}</span>
            <span class="tk-option">${ICONS.gas}${escapeHtml(settings.gasFeeGwei)}</span>
            <span class="tk-option">⚡${escapeHtml(settings.priorityFee)}</span>
            <span class="tk-option ${settings.mevProtection ? 'tk-option-strong' : ''}">🍔 ${settings.mevProtection ? '开' : '关'}</span>
          </div>
          <button class="tk-advanced-link" type="button" disabled>回本</button>
        </div>
      </section>

      <section class="tk-settings" data-settings-panel>
        <div class="tk-settings-title"><span>交易设置</span><button class="tk-ghost-btn" type="button" data-settings-toggle>关闭</button></div>
        <div class="tk-form-grid">
          <label class="tk-field"><span>链</span><select class="tk-select" data-setting="activeChain"><option value="bsc" ${settings.activeChain === 'bsc' ? 'selected' : ''}>BSC</option><option value="solana" ${settings.activeChain === 'solana' ? 'selected' : ''}>Solana</option></select></label>
          <label class="tk-field"><span>滑点 %</span><input class="tk-input" data-setting="slippagePercent" value="${(settings.slippageBps / 100).toFixed(2)}"></label>
          <label class="tk-field"><span>Gas/Fee</span><input class="tk-input" data-setting="gasFeeGwei" value="${escapeHtml(settings.gasFeeGwei)}"></label>
          <label class="tk-field"><span>Priority/Tip</span><input class="tk-input" data-setting="priorityFee" value="${escapeHtml(settings.priorityFee)}"></label>
          <label class="tk-field tk-field-full"><span>买入按钮，逗号分隔 4 个</span><input class="tk-input" data-setting="buyPresets" value="${escapeHtml(settings.buyPresets.join(', '))}"></label>
          <label class="tk-field tk-field-full"><span>卖出比例，逗号分隔 4 个</span><input class="tk-input" data-setting="sellPresets" value="${escapeHtml(settings.sellPresets.join(', '))}"></label>
          <label class="tk-field"><span>自动滑点</span><select class="tk-select" data-setting="autoSlippage"><option value="true" ${settings.autoSlippage ? 'selected' : ''}>开</option><option value="false" ${!settings.autoSlippage ? 'selected' : ''}>关</option></select></label>
          <label class="tk-field"><span>MEV 保护</span><select class="tk-select" data-setting="mevProtection"><option value="true" ${settings.mevProtection ? 'selected' : ''}>开</option><option value="false" ${!settings.mevProtection ? 'selected' : ''}>关</option></select></label>
          <button class="tk-small-btn" type="button" data-save-settings>保存设置</button><button class="tk-ghost-btn" type="button" data-reset-settings>重置</button>
        </div>
      </section>

      <section class="tk-wallet-panel" data-wallet-panel>
        <div class="tk-settings-title"><span>钱包信息</span><span class="tk-muted">当前：${selectedWallet ? escapeHtml(selectedWallet.alias || shortAddress(selectedWallet.address)) : '未选择'}</span></div>
        <div class="tk-wallet-list" data-wallet-list>${renderWalletRows(wallets, settings.selectedWalletId)}</div>
        <div class="tk-form-grid">
          <label class="tk-field"><span>链</span><select class="tk-select" data-import-chain><option value="bsc">BSC</option><option value="solana">Solana</option></select></label>
          <label class="tk-field"><span>别名</span><input class="tk-input" data-import-alias placeholder="P1 钱包"></label>
          <label class="tk-field tk-field-full"><span>地址</span><input class="tk-input" data-import-address placeholder="0x... / Solana mint owner"></label>
          <label class="tk-field tk-field-full"><span>私钥</span><input class="tk-input" data-import-private type="password" placeholder="仅发送到 background 加密 vault"></label>
          <label class="tk-field tk-field-full"><span>加密密码</span><input class="tk-input" data-import-password type="password" placeholder="用于 PBKDF2/AES-GCM"></label>
          <button class="tk-small-btn" type="button" data-import-wallet>导入钱包</button><button class="tk-ghost-btn" type="button" data-refresh-wallets>刷新</button>
        </div>
      </section>

      <div class="tk-route tk-hidden" data-route></div>

      <div class="tk-pnl">
        <div class="tk-pnl-grid">
          <div class="tk-stat"><span>余额 💱</span><span class="tk-stat-value">--</span></div>
          <div class="tk-stat"><span>总买入 ↔</span><span class="tk-stat-value">--</span></div>
          <div class="tk-stat"><span>总卖出</span><span class="tk-stat-value">--</span></div>
          <div class="tk-stat"><span>总利润 ↔</span><span class="tk-stat-value">--</span></div>
        </div>
      </div>
    </div>`;
}

function collectSettings(app: HTMLElement, current: TradeSettings): TradeSettings {
  const slippageInput = app.querySelector<HTMLInputElement>('[data-setting="slippagePercent"]');
  const activeChainInput = app.querySelector<HTMLSelectElement>('[data-setting="activeChain"]');
  const gasInput = app.querySelector<HTMLInputElement>('[data-setting="gasFeeGwei"]');
  const priorityInput = app.querySelector<HTMLInputElement>('[data-setting="priorityFee"]');
  const buyInput = app.querySelector<HTMLInputElement>('[data-setting="buyPresets"]');
  const sellInput = app.querySelector<HTMLInputElement>('[data-setting="sellPresets"]');
  const autoInput = app.querySelector<HTMLSelectElement>('[data-setting="autoSlippage"]');
  const mevInput = app.querySelector<HTMLSelectElement>('[data-setting="mevProtection"]');
  const slippagePercent = Number(slippageInput?.value ?? current.slippageBps / 100);
  return {
    ...current,
    activeChain: (activeChainInput?.value as Chain | undefined) ?? current.activeChain,
    slippageBps: Number.isFinite(slippagePercent) ? Math.max(0, Math.min(10_000, Math.round(slippagePercent * 100))) : current.slippageBps,
    gasFeeGwei: gasInput?.value.trim() || current.gasFeeGwei,
    priorityFee: priorityInput?.value.trim() || current.priorityFee,
    buyPresets: parsePresetList(buyInput?.value ?? '', current.buyPresets),
    sellPresets: parsePresetList(sellInput?.value ?? '', current.sellPresets),
    autoSlippage: autoInput?.value === 'true',
    mevProtection: mevInput?.value === 'true',
  };
}

async function boot(): Promise<void> {
  const shadow = ensureTradingKingHost();
  const initialAsset = detectCurrentAsset();
  let settings = loadSettings();
  if (initialAsset) {
    settings = { ...settings, activeChain: initialAsset.chain };
  }
  let wallets: WalletSummary[] = [];
  try {
    wallets = await sendMessage<WalletSummary[]>({ type: 'LIST_WALLETS' });
    if (!settings.selectedWalletId && wallets[0]) {
      settings.selectedWalletId = wallets[0].id;
      saveSettings(settings);
    }
  } catch {
    wallets = [];
  }

  const style = document.createElement('style');
  style.textContent = STYLES;
  const app = document.createElement('section');
  app.className = 'tk-window tk-fast-trade-panel';
  app.setAttribute('aria-label', 'TradingKing 快买快卖悬浮面板');
  app.innerHTML = buildPanel(settings, initialAsset, wallets);
  shadow.append(style, app);
  restorePosition(app);

  const header = app.querySelector<HTMLElement>('.tk-topbar');
  if (header) {
    enableDragging(app, header);
  }

  const render = () => {
    app.innerHTML = buildPanel(settings, initialAsset, wallets);
    bindEvents();
  };

  const showRoute = (message: string) => {
    const route = app.querySelector<HTMLElement>('[data-route]');
    if (!route) {
      return;
    }
    route.classList.remove('tk-hidden');
    route.innerHTML = message;
  };

  const refreshWallets = async () => {
    wallets = await sendMessage<WalletSummary[]>({ type: 'LIST_WALLETS' });
    if (!settings.selectedWalletId && wallets[0]) {
      settings.selectedWalletId = wallets[0].id;
      saveSettings(settings);
    }
    render();
  };

  function bindEvents(): void {
    app.querySelectorAll<HTMLElement>('[data-settings-toggle]').forEach((button) => {
      button.addEventListener('click', () => app.classList.toggle('tk-settings-open'));
    });
    app.querySelector<HTMLButtonElement>('[data-collapse]')?.addEventListener('click', () => {
      app.classList.toggle('tk-collapsed');
    });
    app.querySelector<HTMLButtonElement>('[data-wallet-toggle]')?.addEventListener('click', () => {
      const panel = app.querySelector<HTMLElement>('[data-wallet-panel]');
      if (panel) {
        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
      }
    });
    app.querySelector<HTMLButtonElement>('[data-save-settings]')?.addEventListener('click', () => {
      settings = collectSettings(app, settings);
      saveSettings(settings);
      render();
    });
    app.querySelector<HTMLButtonElement>('[data-reset-settings]')?.addEventListener('click', () => {
      settings = { ...DEFAULT_SETTINGS, selectedWalletId: settings.selectedWalletId, activeChain: initialAsset?.chain ?? DEFAULT_SETTINGS.activeChain };
      saveSettings(settings);
      render();
    });
    app.querySelector<HTMLButtonElement>('[data-refresh-wallets]')?.addEventListener('click', () => void refreshWallets());
    app.querySelector<HTMLButtonElement>('[data-import-wallet]')?.addEventListener('click', () => {
      void (async () => {
        const chain = app.querySelector<HTMLSelectElement>('[data-import-chain]')?.value as Chain | undefined;
        const alias = app.querySelector<HTMLInputElement>('[data-import-alias]')?.value.trim();
        const address = app.querySelector<HTMLInputElement>('[data-import-address]')?.value.trim();
        const privateKey = app.querySelector<HTMLInputElement>('[data-import-private]')?.value.trim();
        const password = app.querySelector<HTMLInputElement>('[data-import-password]')?.value;
        if (!chain || !address || !privateKey || !password) {
          showRoute('导入钱包失败：链、地址、私钥、加密密码都不能为空。');
          return;
        }
        await sendMessage<WalletSummary>({ type: 'IMPORT_WALLET', payload: { chain, address, alias, privateKey, password } });
        showRoute('钱包已导入并加密保存。');
        await refreshWallets();
      })().catch((error) => showRoute(`导入钱包失败：${escapeHtml(error instanceof Error ? error.message : '未知错误')}`));
    });
    app.querySelectorAll<HTMLButtonElement>('[data-select-wallet]').forEach((button) => {
      button.addEventListener('click', () => {
        settings.selectedWalletId = button.dataset.selectWallet ?? '';
        saveSettings(settings);
        render();
      });
    });
    app.querySelectorAll<HTMLButtonElement>('[data-buy-amount]').forEach((button) => {
      button.addEventListener('click', () => {
        void executeTrade('buy', button.dataset.buyAmount ?? '0');
      });
    });
    app.querySelectorAll<HTMLButtonElement>('[data-sell-percent]').forEach((button) => {
      button.addEventListener('click', () => {
        void executeTrade('sell', '1', button.dataset.sellPercent ?? '0');
      });
    });
  }

  async function executeTrade(side: TradeSide, amount: string, percent?: string): Promise<void> {
    const tokenAddress = initialAsset?.address ?? '';
    const chain = initialAsset?.chain ?? settings.activeChain;
    if (!tokenAddress) {
      showRoute(`未检测到 token，无法生成${side === 'buy' ? '买入' : '卖出'}路径。`);
      return;
    }
    const wallet = wallets.find((item) => item.id === settings.selectedWalletId);
    showRoute(`正在生成${side === 'buy' ? '买入' : '卖出'}路径：${side === 'buy' ? amount : `${percent ?? 0}%`} · 钱包：${wallet ? escapeHtml(wallet.alias || shortAddress(wallet.address)) : '未选择'}...`);
    try {
      const quote = await requestQuote(chain, tokenAddress, amount, side, settings);
      showRoute(renderRoute(quote, settings));
    } catch (error) {
      showRoute(escapeHtml(error instanceof Error ? error.message : '路径生成失败'));
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.altKey && event.code === 'KeyT') {
      app.querySelector<HTMLButtonElement>('[data-collapse]')?.click();
    }
  });

  bindEvents();
}

void boot();
