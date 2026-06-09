type Chain = 'bsc' | 'solana';

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
.tk-window { position: fixed; right: 24px; bottom: 24px; width: 360px; max-width: calc(100vw - 32px); color: #eff6ff; background: rgba(8, 13, 26, 0.96); border: 1px solid rgba(96, 165, 250, 0.35); border-radius: 18px; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45); overflow: hidden; backdrop-filter: blur(18px); z-index: 2147483647; }
.tk-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; cursor: grab; background: linear-gradient(135deg, rgba(37, 99, 235, 0.42), rgba(14, 165, 233, 0.16)); user-select: none; }
.tk-title { display: flex; flex-direction: column; gap: 2px; font-weight: 800; }
.tk-subtitle { color: #bfdbfe; font-size: 11px; font-weight: 500; }
.tk-icon-button, .tk-primary-button { border: 0; border-radius: 10px; color: #eff6ff; background: rgba(59, 130, 246, 0.35); cursor: pointer; }
.tk-icon-button { width: 32px; height: 32px; }
.tk-body { display: grid; gap: 12px; padding: 14px; }
.tk-row { display: grid; gap: 6px; }
.tk-label { color: #93c5fd; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.tk-input, .tk-select { width: 100%; border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 12px; color: #eff6ff; background: rgba(15, 23, 42, 0.82); padding: 10px; outline: none; }
.tk-primary-button { padding: 10px 12px; font-weight: 800; background: linear-gradient(135deg, #2563eb, #0891b2); }
.tk-card { border: 1px solid rgba(148, 163, 184, 0.22); border-radius: 14px; padding: 10px; background: rgba(15, 23, 42, 0.6); }
.tk-muted { color: #cbd5e1; font-size: 12px; line-height: 1.45; }
.tk-warning { color: #fde68a; }
.tk-collapsed { width: auto; }
.tk-collapsed .tk-body { display: none; }
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

async function requestQuote(chain: Chain, tokenAddress: string, amount: string): Promise<QuoteResult> {
  const response = await chrome.runtime.sendMessage({
    type: 'QUOTE',
    payload: { chain, tokenAddress, side: 'buy', amount, slippageBps: 500, source: location.hostname.toLowerCase().includes('debot') ? 'debot-page-detector' : 'floating-window' },
  }) as { ok: boolean; data?: QuoteResult; error?: string };
  if (!response.ok || !response.data) {
    throw new Error(response.error ?? 'Background request failed');
  }
  return response.data;
}

function boot(): void {
  const shadow = ensureTradingKingHost();
  const initialAsset = detectCurrentAsset();
  const style = document.createElement('style');
  style.textContent = STYLES;
  const app = document.createElement('section');
  app.className = 'tk-window';
  app.setAttribute('aria-label', 'TradingKing floating trader');
  app.innerHTML = `
    <header class="tk-header">
      <div class="tk-title">
        <span>TradingKing</span>
        <span class="tk-subtitle">BSC · Solana · Four.meme OpenFour ready</span>
      </div>
      <button class="tk-icon-button" type="button" data-collapse aria-label="Toggle TradingKing">—</button>
    </header>
    <div class="tk-body">
      <div class="tk-card tk-muted" data-detected></div>
      <label class="tk-row"><span class="tk-label">Chain</span><select class="tk-select" data-chain><option value="bsc">BSC</option><option value="solana">Solana</option></select></label>
      <label class="tk-row"><span class="tk-label">Token / Mint</span><input class="tk-input" data-address placeholder="Contract address or mint" /></label>
      <label class="tk-row"><span class="tk-label">Buy Amount</span><input class="tk-input" data-amount value="0.01" /></label>
      <button class="tk-primary-button" type="button" data-quote>Simulate Route</button>
      <div class="tk-card tk-muted" data-status>Ready. Live trading is disabled until adapters are verified.</div>
    </div>`;

  shadow.append(style, app);
  restorePosition(app);

  const header = app.querySelector<HTMLElement>('.tk-header');
  if (header) {
    enableDragging(app, header);
  }

  const detected = app.querySelector('[data-detected]');
  const chainInput = app.querySelector<HTMLSelectElement>('[data-chain]');
  const addressInput = app.querySelector<HTMLInputElement>('[data-address]');
  const amountInput = app.querySelector<HTMLInputElement>('[data-amount]');
  const status = app.querySelector('[data-status]');
  const collapseButton = app.querySelector<HTMLButtonElement>('[data-collapse]');
  const quoteButton = app.querySelector<HTMLButtonElement>('[data-quote]');

  if (detected) {
    detected.textContent = initialAsset
      ? `${initialAsset.chain.toUpperCase()} token from ${initialAsset.source} (${Math.round(initialAsset.confidence * 100)}% confidence)`
      : 'No page token detected yet. Paste a BSC contract or Solana mint.';
  }
  if (initialAsset && chainInput && addressInput) {
    chainInput.value = initialAsset.chain;
    addressInput.value = initialAsset.address;
  }

  collapseButton?.addEventListener('click', () => {
    app.classList.toggle('tk-collapsed');
    collapseButton.textContent = app.classList.contains('tk-collapsed') ? '↗' : '—';
  });

  window.addEventListener('keydown', (event) => {
    if (event.altKey && event.code === 'KeyT') {
      collapseButton?.click();
    }
  });

  quoteButton?.addEventListener('click', () => {
    void (async () => {
      if (!chainInput || !addressInput || !amountInput || !status) {
        return;
      }
      status.textContent = 'Requesting simulation quote...';
      try {
        const quote = await requestQuote(chainInput.value as Chain, addressInput.value.trim(), amountInput.value);
        status.innerHTML = `<strong>Status:</strong> Simulation quote ready.<div>Protocol: ${quote.protocol}</div><div>Phase: ${quote.phase}</div>${quote.tradePath ? `<div>Router: ${quote.tradePath.router}</div><div>Method: ${quote.tradePath.method}</div><div>Calldata: ${quote.tradePath.calldata.slice(0, 18)}…</div>` : ''}${renderWarnings(quote.warnings)}`;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Quote failed';
      }
    })();
  });
}

boot();
