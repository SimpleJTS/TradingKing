export function applySlippage(amount: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) {
    throw new RangeError('slippageBps must be an integer between 0 and 10000');
  }

  return (amount * BigInt(10_000 - slippageBps)) / 10_000n;
}
