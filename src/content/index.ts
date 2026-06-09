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
  tradePath?: { router: string; method: string; calldata: string };
}

const BSC_ADDRESS_RE = /0x[a-fA-F0-9]{40}/;
const SOLANA_MINT_RE = /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/;

const POSITION_STORAGE_KEY = 'tradingking:floating-position:v1';

const STYLES = `
:host { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }
button, input, select { font: inherit; }
.tk-window { position: fixed; right: 10px; bottom: 16px; width: 644px; max-width: calc(100vw - 16px); color: #f4f7f8; background: #181a1f; border: 1px solid #2d3138; border-radius: 0 0 18px 18px; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.58); overflow: hidden; z-index: 2147483647; }
.tk-topbar { height: 92px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px 28px 16px; border-bottom: 1px solid #2a2d33; background: #191b20; cursor: grab; user-select: none; }
.tk-drag-dots { position: absolute; left: 50%; top: 9px; transform: translateX(-50%); color: #68707a; font-size: 16px; letter-spacing: 1px; line-height: 8px; opacity: 0.7; }
.tk-toolbar-left, .tk-toolbar-right { display: flex; align-items: center; gap: 24px; }
.tk-tool { border: 0; padding: 0; color: #7be4a1; background: transparent; cursor: pointer; font-size: 30px; line-height: 1; opacity: 0.96; }
.tk-tool-muted { color: #828a93; }
.tk-wallet-pill { display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 13px; border: 0; border-radius: 8px; color: #e7ecef; background: #24272d; cursor: pointer; font-size: 24px; }
.tk-wallet-icon { font-size: 25px; }
.tk-wallet-count { font-weight: 700; }
.tk-chevron { color: #929aa3; font-size: 28px; }
.tk-icon-action { border: 0; padding: 0; color: #8a929c; background: transparent; cursor: pointer; font-size: 34px; line-height: 1; }
.tk-body { display: grid; background: #181a1f; }
.tk-panel { padding: 29px 29px 24px; border-bottom: 1px solid #2a2d33; }
.tk-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.tk-tabs { display: flex; align-items: center; gap: 24px; font-size: 24px; font-weight: 800; }
.tk-side-title { color: #f8fafc; }
.tk-tab { color: #757e87; }
.tk-tab-active { color: #83e6a5; }
.tk-balance { display: flex; align-items: center; gap: 7px; color: #f8fafc; font-size: 24px; }
.tk-coin { color: #f4c542; font-size: 23px; filter: drop-shadow(0 0 4px rgba(244, 197, 66, 0.28)); }
.tk-preset-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.tk-preset { height: 109px; border-radius: 10px; background: #1b1d22; font-size: 26px; font-weight: 850; cursor: pointer; transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease; }
.tk-preset:hover { transform: translateY(-1px); }
.tk-buy-preset { border: 2px solid #82e5a3; color: #89eaa8; }
.tk-buy-preset:hover { background: rgba(130, 229, 163, 0.08); box-shadow: 0 0 0 3px rgba(130, 229, 163, 0.08); }
.tk-sell-preset { border: 2px solid #ff5d8a; color: #ff668f; }
.tk-sell-preset:hover { background: rgba(255, 93, 138, 0.08); box-shadow: 0 0 0 3px rgba(255, 93, 138, 0.08); }
.tk-options { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 33px; margin-top: 22px; color: #858d96; font-size: 23px; font-weight: 650; }
.tk-option-left, .tk-option-right { display: flex; align-items: center; gap: 12px; min-width: 0; }
.tk-option-item { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.tk-check { width: 29px; height: 29px; border: 2px solid #8f99a4; border-radius: 9px; display: inline-block; }
.tk-options-sell .tk-burger { color: #ffcf66; }
.tk-divider { height: 1px; margin: 11px 29px 0; background: #333740; }
.tk-bottom { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; padding: 20px 29px 33px; color: #77818c; font-size: 24px; }
.tk-stat { display: grid; gap: 12px; min-width: 0; }
.tk-stat-label { display: flex; align-items: center; gap: 2px; white-space: nowrap; }
.tk-stat-value { color: #9aa3ad; }
.tk-detected { padding: 10px 29px; border-bottom: 1px solid #2a2d33; color: #7f8993; font-size: 12px; line-height: 1.35; }
.tk-route { padding: 13px 29px 18px; border-top: 1px solid #2a2d33; color: #9aa3ad; background: #17191d; font-size: 12px; line-height: 1.55; }
.tk-route strong { color: #f4f7f8; }
.tk-route-grid { display: grid; grid-template-columns: 66px minmax(0, 1fr); gap: 4px 8px; }
.tk-route-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-warning { color: #f6d365; }
.tk-hidden { display: none; }
.tk-collapsed { width: auto; border-radius: 14px; }
.tk-collapsed .tk-body, .tk-collapsed .tk-detected, .tk-collapsed .tk-route { display: none; }
.tk-collapsed .tk-topbar { height: 58px; padding: 10px 14px; border-bottom: 0; }
.tk-collapsed .tk-toolbar-left .tk-tool:not(:first-child), .tk-collapsed .tk-wallet-pill, .tk-collapsed .tk-icon-action[data-settings] { display: none; }
`;

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
    if (target?.closest('button')) {
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

function renderWarnings(warnings: string[]): string {
  return warnings.map((warning) => `<div class="tk-warning">⚠ ${warning}</div>`).join('');
}

async function requestQuote(chain: Chain, tokenAddress: string, amount: string, side: TradeSide): Promise<QuoteResult> {
  const response = await chrome.runtime.sendMessage({
    type: 'QUOTE',
    payload: {
      chain,
      tokenAddress,
      side,
      amount,
      slippageBps: 500,
      source: location.hostname.toLowerCase().includes('debot') ? 'debot-page-detector' : 'floating-window',
    },
  }) as { ok: boolean; data?: QuoteResult; error?: string };
  if (!response.ok || !response.data) {
    throw new Error(response.error ?? 'Background request failed');
  }
  return response.data;
}

function renderRoute(quote: QuoteResult): string {
  const path = quote.tradePath;
  return `
    <div class="tk-route-grid">
      <strong>Status</strong><span class="tk-route-value">${quote.protocol} · ${quote.phase}</span>
      ${path ? `<strong>Router</strong><span class="tk-route-value">${path.router}</span><strong>Method</strong><span class="tk-route-value">${path.method}</span><strong>Calldata</strong><span class="tk-route-value">${path.calldata}</span>` : ''}
    </div>
    ${renderWarnings(quote.warnings)}
  `;
}

function boot(): void {
  const shadow = ensureTradingKingHost();
  const initialAsset = detectCurrentAsset();
  const style = document.createElement('style');
  style.textContent = STYLES;
  const app = document.createElement('section');
  app.className = 'tk-window tk-fast-trade-panel';
  app.setAttribute('aria-label', 'TradingKing fast trade floating panel');
  app.innerHTML = `
    <header class="tk-topbar">
      <div class="tk-drag-dots">···<br>···</div>
      <div class="tk-toolbar-left" aria-label="TradingKing tool tabs">
        <button class="tk-tool" type="button" title="Fast trade">▦</button>
        <button class="tk-tool" type="button" title="Market stats">▮▮▮</button>
        <button class="tk-tool tk-tool-muted" type="button" title="Chart">▰</button>
        <button class="tk-tool" type="button" title="Routes">≋</button>
        <button class="tk-tool tk-tool-muted" type="button" title="Edit presets">♢</button>
      </div>
      <div class="tk-toolbar-right">
        <button class="tk-wallet-pill" type="button" title="Wallet group"><span class="tk-wallet-icon">▣</span><span class="tk-wallet-count">1</span><span class="tk-chevron">⌄</span></button>
        <button class="tk-icon-action" type="button" data-settings title="Settings">⚙</button>
        <button class="tk-icon-action" type="button" data-collapse aria-label="Close or collapse TradingKing">×</button>
      </div>
    </header>
    <div class="tk-detected" data-detected></div>
    <main class="tk-body" data-route-kind="Four.meme OpenFour">
      <section class="tk-panel tk-buy-panel" aria-label="Buy panel">
        <div class="tk-panel-header">
          <div class="tk-tabs"><span class="tk-side-title">买入</span><span class="tk-tab tk-tab-active">P1</span><span class="tk-tab">P2</span><span class="tk-tab">P3</span></div>
          <div class="tk-balance"><span class="tk-coin">⬡</span><span data-buy-balance>0.0367</span></div>
        </div>
        <div class="tk-preset-grid" data-buy-presets>
          <button class="tk-preset tk-buy-preset" type="button" data-buy-amount="0.02">0.02</button>
          <button class="tk-preset tk-buy-preset" type="button" data-buy-amount="0.036">0.036</button>
          <button class="tk-preset tk-buy-preset" type="button" data-buy-amount="0.066">0.066</button>
          <button class="tk-preset tk-buy-preset" type="button" data-buy-amount="0.086">0.086</button>
        </div>
        <div class="tk-options">
          <div class="tk-option-left"><span class="tk-option-item">🏃 自动</span><span class="tk-option-item">⛽ 0.1</span><span class="tk-option-item">🧞 0</span><span class="tk-option-item">🍔 开</span></div>
          <div class="tk-option-right"><span class="tk-check"></span><span>高级</span></div>
        </div>
      </section>
      <div class="tk-divider"></div>
      <section class="tk-panel tk-sell-panel" aria-label="Sell panel">
        <div class="tk-panel-header">
          <div class="tk-tabs"><span class="tk-side-title">卖出</span><span class="tk-tab tk-tab-active">P1</span><span class="tk-tab">P2</span><span class="tk-tab">P3</span></div>
          <div class="tk-balance"><span>0 Don't pa</span><span class="tk-coin">⬡</span><span data-sell-balance>0</span></div>
        </div>
        <div class="tk-preset-grid" data-sell-presets>
          <button class="tk-preset tk-sell-preset" type="button" data-sell-percent="10">10%</button>
          <button class="tk-preset tk-sell-preset" type="button" data-sell-percent="25">25%</button>
          <button class="tk-preset tk-sell-preset" type="button" data-sell-percent="50">50%</button>
          <button class="tk-preset tk-sell-preset" type="button" data-sell-percent="100">100%</button>
        </div>
        <div class="tk-options tk-options-sell">
          <div class="tk-option-left"><span class="tk-option-item">🏃 自动</span><span class="tk-option-item">⛽ 0.1</span><span class="tk-option-item">🧞 0</span><span class="tk-option-item tk-burger">🍔 关</span></div>
          <div class="tk-option-right"><span>回本</span></div>
        </div>
      </section>
      <footer class="tk-bottom">
        <div class="tk-stat"><span class="tk-stat-label">余额 🪙</span><span class="tk-stat-value" data-stat-balance>--</span></div>
        <div class="tk-stat"><span class="tk-stat-label">总买入 ↗</span><span class="tk-stat-value" data-stat-buy>--</span></div>
        <div class="tk-stat"><span class="tk-stat-label">总卖出</span><span class="tk-stat-value" data-stat-sell>--</span></div>
        <div class="tk-stat"><span class="tk-stat-label">总利润 ↘</span><span class="tk-stat-value" data-stat-profit>--</span></div>
      </footer>
    </main>
    <aside class="tk-route tk-hidden" data-route></aside>`;

  shadow.append(style, app);
  restorePosition(app);

  const header = app.querySelector<HTMLElement>('.tk-topbar');
  if (header) {
    enableDragging(app, header);
  }

  const detected = app.querySelector('[data-detected]');
  const route = app.querySelector<HTMLElement>('[data-route]');
  const collapseButton = app.querySelector<HTMLButtonElement>('[data-collapse]');
  const tokenAddress = initialAsset?.address ?? '';
  const chain: Chain = initialAsset?.chain ?? 'bsc';

  if (detected) {
    detected.textContent = initialAsset
      ? `${initialAsset.chain.toUpperCase()} · ${initialAsset.address} · ${initialAsset.source} · ${Math.round(initialAsset.confidence * 100)}% confidence`
      : '未检测到页面 Token；打开 Four.meme / DeBot / GMGN / DexScreener 等页面后会自动识别，或后续在高级区手动粘贴合约。';
  }

  collapseButton?.addEventListener('click', () => {
    app.classList.toggle('tk-collapsed');
  });

  window.addEventListener('keydown', (event) => {
    if (event.altKey && event.code === 'KeyT') {
      collapseButton?.click();
    }
  });

  app.querySelectorAll<HTMLButtonElement>('[data-buy-amount]').forEach((button) => {
    button.addEventListener('click', () => {
      void (async () => {
        if (!route) {
          return;
        }
        if (!tokenAddress) {
          route.classList.remove('tk-hidden');
          route.textContent = '未检测到 token，无法生成买入路径。';
          return;
        }
        route.classList.remove('tk-hidden');
        route.textContent = `正在生成买入路径：${button.dataset.buyAmount ?? '0'} ${chain.toUpperCase()}...`;
        try {
          const quote = await requestQuote(chain, tokenAddress, button.dataset.buyAmount ?? '0', 'buy');
          route.innerHTML = renderRoute(quote);
        } catch (error) {
          route.textContent = error instanceof Error ? error.message : '买入路径生成失败';
        }
      })();
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-sell-percent]').forEach((button) => {
    button.addEventListener('click', () => {
      void (async () => {
        if (!route) {
          return;
        }
        if (!tokenAddress) {
          route.classList.remove('tk-hidden');
          route.textContent = '未检测到 token，无法生成卖出路径。';
          return;
        }
        route.classList.remove('tk-hidden');
        route.textContent = `正在生成卖出路径：${button.dataset.sellPercent ?? '0'}%...`;
        try {
          const quote = await requestQuote(chain, tokenAddress, '1', 'sell');
          route.innerHTML = renderRoute(quote);
        } catch (error) {
          route.textContent = error instanceof Error ? error.message : '卖出路径生成失败';
        }
      })();
    });
  });
}

boot();
