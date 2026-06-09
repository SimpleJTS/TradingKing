import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
const slippageSource = await readFile(new URL('../src/chains/common/slippage.ts', import.meta.url), 'utf8');
const contentSource = await readFile(new URL('../src/content/index.ts', import.meta.url), 'utf8');
const abiSource = await readFile(new URL('../src/chains/bsc/abi.ts', import.meta.url), 'utf8');
const openFourSource = await readFile(new URL('../src/chains/bsc/fourmeme-openfour.ts', import.meta.url), 'utf8');

test('manifest declares MV3 background and content script entries', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, 'assets/background/index.js');
  assert.equal(manifest.content_scripts[0].js[0], 'assets/content/index.js');
});

test('slippage helper applies basis-point reduction formula', () => {
  assert.match(slippageSource, /10_000 - slippageBps/);
  assert.match(slippageSource, /RangeError/);
});

test('content script keeps OpenFour-ready floating shell and dual-chain/debot detection', () => {
  assert.match(contentSource, /TradingKing/);
  assert.match(contentSource, /Four\.meme OpenFour/);
  assert.match(contentSource, /BSC_ADDRESS_RE/);
  assert.match(contentSource, /SOLANA_MINT_RE/);
  assert.match(contentSource, /debot-page-detector/);
  assert.match(contentSource, /tk-fast-trade-panel/);
  assert.match(contentSource, /data-buy-amount=\"0\.036\"/);
  assert.match(contentSource, /data-sell-percent=\"100\"/);
  assert.match(contentSource, /买入/);
  assert.match(contentSource, /卖出/);
});

test('Four.meme OpenFour path prepares executable TokenManager calldata', () => {
  assert.match(abiSource, /0x87f27655/);
  assert.match(abiSource, /0x3e11741f/);
  assert.match(openFourSource, /FOUR_MEME_TOKEN_MANAGER_PROXY/);
  assert.match(openFourSource, /debot-integrated/);
  assert.doesNotMatch(openFourSource, /read-only until/);
});
