# TradingKing

TradingKing is a Chrome Manifest V3 browser extension scaffold for a BSC and Solana floating-window trading assistant.

## Current milestone

- Injects a Shadow DOM isolated floating window into supported pages.
- Detects BSC contracts and Solana mints from URLs and page text, including DeBot/Four.meme pages.
- Uses a GMGN/DeBot-style dark fast-trade panel with top tool tabs, wallet selector, P1/P2/P3 buy/sell presets, green buy amount buttons, pink sell percentage buttons, advanced toggles, and bottom PnL summary slots.
- Provides a simulation-first quote path through background adapters.
- Prepares executable Four.meme TokenManager2 calldata for OpenFour/X Mode/Agentic/DeBot-integrated BSC flows while still requiring pre-broadcast chain simulation.
- Includes an encrypted local wallet vault foundation using PBKDF2 and AES-GCM.

## Four.meme path

The BSC adapter now routes Four.meme-style tokens through TokenManager2:

- Buy: `buyTokenAMAP(address,uint256,uint256)`.
- Sell: `sellToken(address,uint256,uint256)`.
- Default proxy: `0x5c952063c7fc8610FFDB798152D69F0B9550762b`.

The extension prepares calldata but does not sign or broadcast yet. The next milestone should add TokenManagerHelper3 `tryBuy` / `trySell` validation and graduation checks before enabling live execution.

## Commands

```bash
npm install
npm run build
npm run typecheck
npm test
npm run lint
```
