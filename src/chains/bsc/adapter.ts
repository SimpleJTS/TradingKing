import type { ChainAdapter, PreparedTrade, QuoteInput, QuoteResult, TokenInfo } from '../common/types';
import { applySlippage } from '../common/slippage';
import { parseUnits } from './amounts';
import { buildOpenFourTradingPath, detectFourMemeOpenFourMode } from './fourmeme-openfour';

const BSC_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export class BscAdapter implements ChainAdapter {
  readonly chain = 'bsc' as const;

  async detectToken(address: string): Promise<TokenInfo> {
    if (!BSC_ADDRESS_RE.test(address)) {
      throw new Error('Invalid BSC token address');
    }

    return {
      chain: this.chain,
      address,
      source: 'manual-or-page-detection',
    };
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    const token = await this.detectToken(input.tokenAddress);
    const openFourMode = await detectFourMemeOpenFourMode(token.address, input.source);
    const amountInWei = parseUnits(input.amount);
    const minimumReceived = input.minimumReceived ?? applySlippage(amountInWei, input.slippageBps).toString();
    const normalizedInput = { ...input, tokenAddress: token.address, minimumReceived };
    const tradePath = openFourMode.executable ? buildOpenFourTradingPath(normalizedInput) : undefined;

    return {
      protocol: openFourMode.detected ? tradePath?.protocol ?? 'fourmeme-openfour' : 'pending-bsc-router',
      phase: openFourMode.phase,
      amountIn: amountInWei.toString(),
      minimumReceived,
      warnings: [
        openFourMode.reason,
        '交易路径已生成，但广播前仍必须用 TokenManagerHelper3.tryBuy/trySell 或 eth_call 做链上模拟。',
        '如果该币已经毕业，必须切换到 PancakeSwap 路由而不是 Four.meme 内盘。',
      ],
      tradePath,
    };
  }

  async prepareTrade(input: QuoteInput): Promise<PreparedTrade> {
    const quote = await this.quote(input);

    return {
      chain: this.chain,
      route: quote.protocol,
      unsignedPayload: JSON.stringify({ input, quote }),
      warnings: ['Prepared BSC payload contains executable calldata but is not signed or broadcast by this milestone.', ...quote.warnings],
      tradePath: quote.tradePath,
    };
  }
}
