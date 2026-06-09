import type { QuoteInput } from '../common/types';
import { encodeBuyTokenAMAP, encodeSellToken } from './abi';
import { parseUnits } from './amounts';

export const FOUR_MEME_TOKEN_MANAGER_PROXY = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';

export type OpenFourModuleId =
  | 'classic-bonding-curve'
  | 'x-mode-dynamic-fee'
  | 'agentic-mode'
  | 'goplus-creator-incentives'
  | 'goplus-skill-royalty'
  | 'likwid-dex'
  | 'cubepeg-infinity-hook'
  | 'debot-integrated'
  | 'unknown';

export interface OpenFourDetectionResult {
  detected: boolean;
  moduleId: OpenFourModuleId;
  phase:
    | 'fourmeme-bonding'
    | 'fourmeme-x-mode'
    | 'fourmeme-agentic'
    | 'openfour-goplus-creator'
    | 'openfour-skill-royalty'
    | 'openfour-likwid'
    | 'openfour-cubepeg'
    | 'pancakeswap-graduated'
    | 'unknown';
  reason: string;
  executable: boolean;
}

export interface OpenFourTradingPath {
  protocol: 'fourmeme-token-manager2' | 'debot-fourmeme-openfour';
  router: string;
  method: 'buyTokenAMAP(address,uint256,uint256)' | 'sellToken(address,uint256,uint256)';
  calldata: string;
  value: string;
  approvalTarget?: string;
  requiresApproval: boolean;
  notes: string[];
}

function looksLikeFourMemeToken(tokenAddress: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(tokenAddress) && tokenAddress.toLowerCase().endsWith('4444');
}

export async function detectFourMemeOpenFourMode(tokenAddress: string, source = ''): Promise<OpenFourDetectionResult> {
  const normalized = tokenAddress.toLowerCase();
  const sourceHint = source.toLowerCase();

  if (!normalized.startsWith('0x')) {
    return {
      detected: false,
      moduleId: 'unknown',
      phase: 'unknown',
      reason: 'Not an EVM token address.',
      executable: false,
    };
  }

  if (sourceHint.includes('debot')) {
    return {
      detected: true,
      moduleId: 'debot-integrated',
      phase: 'fourmeme-agentic',
      reason: 'Detected from a DeBot/Four.meme surface; route through the Four.meme TokenManager2 execution path already used by bot integrations.',
      executable: true,
    };
  }

  if (looksLikeFourMemeToken(tokenAddress)) {
    return {
      detected: true,
      moduleId: 'agentic-mode',
      phase: 'fourmeme-agentic',
      reason: 'Four.meme launch tokens commonly end in 4444 and can use the TokenManager2 buyTokenAMAP/sellToken execution path while they are on the internal curve.',
      executable: true,
    };
  }

  return {
    detected: true,
    moduleId: 'x-mode-dynamic-fee',
    phase: 'fourmeme-x-mode',
    reason: 'BSC OpenFour/X Mode path selected; validate token info/fee state before broadcasting.',
    executable: true,
  };
}

export function buildOpenFourTradingPath(input: QuoteInput): OpenFourTradingPath {
  const amount = parseUnits(input.amount);
  const minAmount = input.minimumReceived ? BigInt(input.minimumReceived) : 0n;

  if (input.side === 'sell') {
    return {
      protocol: 'fourmeme-token-manager2',
      router: FOUR_MEME_TOKEN_MANAGER_PROXY,
      method: 'sellToken(address,uint256,uint256)',
      calldata: encodeSellToken(input.tokenAddress, amount, minAmount),
      value: '0',
      approvalTarget: FOUR_MEME_TOKEN_MANAGER_PROXY,
      requiresApproval: true,
      notes: [
        'Sell path uses Four.meme TokenManager sellToken(address,uint256,uint256).',
        'The minimum/bonus amount slot is populated from minimumReceived; quote with TokenManagerHelper3.trySell before signing.',
      ],
    };
  }

  return {
    protocol: 'fourmeme-token-manager2',
    router: FOUR_MEME_TOKEN_MANAGER_PROXY,
    method: 'buyTokenAMAP(address,uint256,uint256)',
    calldata: encodeBuyTokenAMAP(input.tokenAddress, amount, minAmount),
    value: amount.toString(),
    requiresApproval: false,
    notes: [
      'Buy path uses Four.meme TokenManager2 buyTokenAMAP(address,uint256,uint256).',
      'For non-BNB raised tokens, approval and value handling must be switched to the raised token after token-info lookup.',
      'DeBot-integrated pages can use the same prepared route instead of blocking as read-only.',
    ],
  };
}
