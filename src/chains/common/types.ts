export type Chain = 'bsc' | 'solana';

export type TradeSide = 'buy' | 'sell';

export interface TokenInfo {
  chain: Chain;
  address: string;
  symbol?: string;
  decimals?: number;
  source?: string;
}

export interface DetectedAsset extends TokenInfo {
  confidence: number;
}

export interface WalletRecord {
  id: string;
  chain: Chain;
  address: string;
  alias?: string;
  encryptedPrivateKey: string;
  createdAt: number;
  updatedAt: number;
  enabled: boolean;
}

export interface QuoteInput {
  chain: Chain;
  tokenAddress: string;
  side: TradeSide;
  amount: string;
  slippageBps: number;
  minimumReceived?: string;
  source?: string;
}


export interface QuoteResult {
  protocol: string;
  phase: string;
  amountIn: string;
  minimumReceived: string;
  warnings: string[];
  tradePath?: {
    protocol: string;
    router: string;
    method: string;
    calldata: string;
    value: string;
    approvalTarget?: string;
    requiresApproval: boolean;
    notes: string[];
  };
}

export interface PreparedTrade {
  chain: Chain;
  route: string;
  unsignedPayload: string;
  warnings: string[];
  tradePath?: {
    protocol: string;
    router: string;
    method: string;
    calldata: string;
    value: string;
    approvalTarget?: string;
    requiresApproval: boolean;
    notes: string[];
  };
}

export interface ChainAdapter {
  chain: Chain;
  detectToken(address: string): Promise<TokenInfo>;
  quote(input: QuoteInput): Promise<QuoteResult>;
  prepareTrade(input: QuoteInput): Promise<PreparedTrade>;
}
