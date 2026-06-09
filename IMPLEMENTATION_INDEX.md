# TradingKing Implementation Index

If the PR diff is hard to find, the implementation is committed on the current branch and starts from these files.

## Browser extension entry points

- `public/manifest.json` declares the Manifest V3 extension, background service worker, and content script.
- `src/background/index.ts` registers the Chrome background listeners.
- `src/background/message-router.ts` handles requests from the floating UI.
- `src/content/index.ts` injects the Shadow DOM floating trading window.

## Trading modules

- `src/chains/common/types.ts` defines chain, quote, prepared trade, wallet, and adapter contracts.
- `src/chains/bsc/adapter.ts` validates BSC tokens and prepares Four.meme/OpenFour quote results.
- `src/chains/bsc/fourmeme-openfour.ts` detects DeBot/Four.meme/OpenFour style routes and builds TokenManager2 trading paths.
- `src/chains/bsc/abi.ts` encodes `buyTokenAMAP(address,uint256,uint256)` and `sellToken(address,uint256,uint256)` calldata.
- `src/chains/solana/adapter.ts` reserves the Solana adapter path for Pump.fun/PumpSwap/Token-2022/Jito milestones.

## Wallet and security modules

- `src/background/vault.ts` stores encrypted wallet records in `chrome.storage.local`.
- `src/crypto/pbkdf2.ts` derives AES-GCM keys with PBKDF2.
- `src/crypto/aes-gcm.ts` encrypts and decrypts vault payloads.

## Build and verification

- `scripts/build-extension.mjs` compiles the TypeScript extension into `dist/`.
- `scripts/source.test.mjs` verifies manifest wiring, dual-chain/DeBot detection, and Four.meme calldata path coverage.
- `scripts/lint.mjs` enforces the no-import-try/catch project rule.

## How to load locally

```bash
npm install
npm run build
```

Then open Chrome `chrome://extensions`, enable Developer Mode, click **Load unpacked**, and select the generated `dist/` folder.
