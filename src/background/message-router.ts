import { BscAdapter } from '../chains/bsc/adapter';
import { SolanaAdapter } from '../chains/solana/adapter';
import type { Chain, DetectedAsset, QuoteInput } from '../chains/common/types';
import { importWallet, listWallets } from './vault';

export type BackgroundRequest =
  | { type: 'PING' }
  | { type: 'LIST_WALLETS' }
  | { type: 'IMPORT_WALLET'; payload: { chain: Chain; address: string; alias?: string; privateKey: string; password: string } }
  | { type: 'DETECT_TOKEN'; payload: { chain: Chain; address: string } }
  | { type: 'QUOTE'; payload: QuoteInput };

export type BackgroundResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

const adapters = {
  bsc: new BscAdapter(),
  solana: new SolanaAdapter(),
};

export async function handleMessage(request: BackgroundRequest): Promise<BackgroundResponse> {
  try {
    switch (request.type) {
      case 'PING':
        return { ok: true, data: { ready: true } };
      case 'LIST_WALLETS':
        return { ok: true, data: await listWallets() };
      case 'IMPORT_WALLET':
        return { ok: true, data: await importWallet(request.payload) };
      case 'DETECT_TOKEN': {
        const token = await adapters[request.payload.chain].detectToken(request.payload.address);
        const detected: DetectedAsset = { ...token, confidence: 1 };
        return { ok: true, data: detected };
      }
      case 'QUOTE':
        return { ok: true, data: await adapters[request.payload.chain].quote(request.payload) };
      default: {
        const exhaustive: never = request;
        return { ok: false, error: `Unsupported request: ${JSON.stringify(exhaustive)}` };
      }
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown background error' };
  }
}
