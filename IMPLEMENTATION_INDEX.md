# TradingKing 实现索引

如果 PR diff 或文件入口不好找，可以从仓库根目录的这些文件开始查看。当前实现已经提交在当前分支。

## 浏览器插件入口

- `public/manifest.json`：声明 Manifest V3 插件、background service worker 与 content script。
- `src/background/index.ts`：注册 Chrome background 监听器。
- `src/background/message-router.ts`：处理悬浮窗发来的消息请求。
- `src/content/index.ts`：注入 Shadow DOM 悬浮交易窗口，是当前 UI 的主要实现文件。

## 交易模块

- `src/chains/common/types.ts`：定义 chain、quote、prepared trade、wallet 与 adapter 等核心类型。
- `src/chains/bsc/adapter.ts`：校验 BSC token，并准备 Four.meme / OpenFour quote 结果。
- `src/chains/bsc/fourmeme-openfour.ts`：识别 DeBot / Four.meme / OpenFour 风格路由，并构造 TokenManager2 交易路径。
- `src/chains/bsc/abi.ts`：编码 `buyTokenAMAP(address,uint256,uint256)` 与 `sellToken(address,uint256,uint256)` calldata。
- `src/chains/solana/adapter.ts`：预留 Solana 适配路径，用于后续接入 Pump.fun、PumpSwap、Token-2022 与 Jito。

## 钱包与安全模块

- `src/background/vault.ts`：将加密钱包记录保存到 `chrome.storage.local`。
- `src/crypto/pbkdf2.ts`：使用 PBKDF2 派生 AES-GCM key。
- `src/crypto/aes-gcm.ts`：加密与解密 vault payload。

## 构建与验证

- `scripts/build-extension.mjs`：把 TypeScript 插件源码编译到 `dist/`。
- `scripts/source.test.mjs`：验证 manifest wiring、双链/DeBot 检测、Four.meme calldata 路径与 UI 标记。
- `scripts/lint.mjs`：检查项目规则，确保没有把 import 包在 try/catch 中。

## 本地加载方式

```bash
npm install
npm run build
```

然后打开 Chrome `chrome://extensions`，启用开发者模式，点击 **加载已解压的扩展程序**，选择生成的 `dist/` 文件夹。
