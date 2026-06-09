import type { Chain, DetectedAsset } from '../../chains/common/types';

export interface PageDetector {
  id: string;
  matches(url: URL): boolean;
  detect(documentRef: Document, url: URL): DetectedAsset | null;
}

const BSC_ADDRESS_RE = /0x[a-fA-F0-9]{40}/;
const SOLANA_MINT_RE = /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/;

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

export const genericDetector: PageDetector = {
  id: 'generic-url-dom-detector',
  matches: () => true,
  detect(documentRef, url) {
    const chain = chainFromHostAndPath(url);
    const haystack = [url.href, documentRef.title, documentRef.body?.innerText.slice(0, 10_000) ?? ''].join('\n');
    const detected = detectFromText(haystack, chain);

    if (!detected) {
      return null;
    }

    return {
      ...detected,
      source: url.hostname.toLowerCase().includes('debot') ? 'debot-page-detector' : this.id,
      confidence: chain ? 0.9 : 0.65,
    };
  },
};

export function detectCurrentAsset(documentRef: Document = document, url: URL = new URL(location.href)): DetectedAsset | null {
  const detectors = [genericDetector];
  for (const detector of detectors) {
    if (!detector.matches(url)) {
      continue;
    }
    const detected = detector.detect(documentRef, url);
    if (detected) {
      return detected;
    }
  }
  return null;
}
