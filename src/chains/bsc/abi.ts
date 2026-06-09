const HEX_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function stripHexPrefix(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

export function encodeAddress(value: string): string {
  if (!HEX_ADDRESS_RE.test(value)) {
    throw new Error(`Invalid EVM address: ${value}`);
  }
  return stripHexPrefix(value).toLowerCase().padStart(64, '0');
}

export function encodeUint256(value: bigint | string): string {
  const parsed = typeof value === 'bigint' ? value : BigInt(value);
  if (parsed < 0n) {
    throw new Error('uint256 cannot be negative');
  }
  return parsed.toString(16).padStart(64, '0');
}

export function encodeCall(methodId: string, params: string[]): string {
  return `0x${stripHexPrefix(methodId)}${params.join('')}`;
}

export function encodeBuyTokenAMAP(token: string, funds: bigint | string, minAmount: bigint | string): string {
  return encodeCall('0x87f27655', [encodeAddress(token), encodeUint256(funds), encodeUint256(minAmount)]);
}

export function encodeSellToken(token: string, amount: bigint | string, bonusAmount: bigint | string): string {
  return encodeCall('0x3e11741f', [encodeAddress(token), encodeUint256(amount), encodeUint256(bonusAmount)]);
}
