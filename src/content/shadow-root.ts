export function ensureTradingKingHost(): ShadowRoot {
  const existing = document.getElementById('tradingking-floating-host');
  if (existing?.shadowRoot) {
    return existing.shadowRoot;
  }

  const host = existing ?? document.createElement('div');
  host.id = 'tradingking-floating-host';
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  document.documentElement.append(host);

  return host.attachShadow({ mode: 'open' });
}
