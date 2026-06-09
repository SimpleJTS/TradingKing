import type { ChainAdapter, PreparedTrade, QuoteInput, QuoteResult, TokenInfo } from '../common/types';

const SOLANA_MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class SolanaAdapter implements ChainAdapter {
  readonly chain = 'solana' as const;

  async detectToken(address: string): Promise<TokenInfo> {
    if (!SOLANA_MINT_RE.test(address)) {
      throw new Error('Invalid Solana mint address');
    }

    return {
      chain: this.chain,
      address,
      source: 'manual-or-page-detection',
    };
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    return {
      protocol: 'pending-solana-router',
      phase: 'unknown',
      amountIn: input.amount,
      minimumReceived: '0',
      warnings: ['Live Solana trading is not enabled in this scaffold. Pump.fun, PumpSwap, Token-2022, and Jito adapters are reserved.'],
    };
  }

  async prepareTrade(input: QuoteInput): Promise<PreparedTrade> {
    const quote = await this.quote(input);

    return {
      chain: this.chain,
      route: quote.protocol,
      unsignedPayload: JSON.stringify({ input, quote }),
      warnings: ['Prepared Solana payload is simulation-only in the initial milestone.', ...quote.warnings],
    };
  }
}
