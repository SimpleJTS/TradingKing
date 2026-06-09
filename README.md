# TradingKing

TradingKing 是一个 Chrome Manifest V3 浏览器插件脚手架，用于构建支持 BSC 与 Solana 的浏览器悬浮窗交易助手。

## 当前里程碑

- 向支持的网站注入使用 Shadow DOM 隔离的悬浮交易窗口。
- 可从 URL 与页面文本中识别 BSC 合约地址、Solana mint，并覆盖 DeBot / Four.meme 页面场景。
- 使用更小的 286px GMGN / DeBot 风格深色快买快卖面板，并限制最大高度避免遮挡网页：顶部工具栏、钱包选择、P1/P2/P3 买卖档位、绿色买入金额按钮、粉色卖出比例按钮、高级选项与底部盈亏统计占位。
- 支持在悬浮窗内自定义滑点、Gas/Fee、Priority/Tip、MEV 保护、买入按钮、卖出比例，并查看/选择/导入本地加密钱包。
- 通过 background adapter 提供“先模拟/报价，再执行”的 quote 路径。
- 为 Four.meme TokenManager2 准备 OpenFour / X Mode / Agentic / DeBot 集成场景的可执行 calldata，但在真正广播前仍要求链上模拟与毕业状态检查。
- 提供基于 PBKDF2 与 AES-GCM 的本地加密钱包 vault 基础能力。

## Four.meme 交易路径

BSC adapter 目前会把 Four.meme 风格 token 路由到 TokenManager2：

- 买入：`buyTokenAMAP(address,uint256,uint256)`。
- 卖出：`sellToken(address,uint256,uint256)`。
- 默认 proxy：`0x5c952063c7fc8610FFDB798152D69F0B9550762b`。

插件当前会准备 calldata，但还不会签名或广播。下一阶段需要补充 TokenManagerHelper3 `tryBuy` / `trySell` 校验、`eth_call` 模拟以及 token 是否已经毕业到 PancakeSwap 的检查，再开放真实执行。

## 本地运行命令

```bash
npm install
npm run build
npm run typecheck
npm test
npm run lint
```

构建完成后，打开 Chrome 的 `chrome://extensions`，启用开发者模式，选择 **加载已解压的扩展程序**，并选择生成的 `dist/` 目录。
