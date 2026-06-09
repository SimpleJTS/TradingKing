import type { Chain, WalletRecord } from '../chains/common/types';
import { encryptText, type EncryptedPayload } from '../crypto/aes-gcm';
import { deriveVaultKey } from '../crypto/pbkdf2';

interface VaultState {
  salt?: string;
  wallets: WalletRecord[];
}

const STORAGE_KEY = 'tradingking:vault:v1';

async function readVault(): Promise<VaultState> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return (data[STORAGE_KEY] as VaultState | undefined) ?? { wallets: [] };
}

async function writeVault(state: VaultState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function makeWalletId(chain: Chain, address: string): string {
  return `${chain}:${address.toLowerCase()}`;
}

export async function listWallets(): Promise<Omit<WalletRecord, 'encryptedPrivateKey'>[]> {
  const state = await readVault();
  return state.wallets.map(({ encryptedPrivateKey: _encryptedPrivateKey, ...safeWallet }) => safeWallet);
}

export async function importWallet(input: {
  chain: Chain;
  address: string;
  alias?: string;
  privateKey: string;
  password: string;
}): Promise<Omit<WalletRecord, 'encryptedPrivateKey'>> {
  const state = await readVault();
  const derived = await deriveVaultKey(input.password, state.salt);
  const encrypted: EncryptedPayload = await encryptText(input.privateKey, derived.key);
  const now = Date.now();
  const wallet: WalletRecord = {
    id: makeWalletId(input.chain, input.address),
    chain: input.chain,
    address: input.address,
    alias: input.alias,
    encryptedPrivateKey: JSON.stringify(encrypted),
    createdAt: now,
    updatedAt: now,
    enabled: true,
  };
  const withoutDuplicate = state.wallets.filter((record) => record.id !== wallet.id);

  await writeVault({
    salt: derived.salt,
    wallets: [...withoutDuplicate, wallet],
  });

  const { encryptedPrivateKey: _encryptedPrivateKey, ...safeWallet } = wallet;
  return safeWallet;
}
