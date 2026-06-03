# XDeck DIY

自己搓的多列 X (Twitter) 信息流客户端 —— TweetDeck / X Pro 的平替。
**Windows / macOS 通用**（基于 Electron）。

## 原理

一个窗口里横排多个 `<webview>`，每个加载一个真实的 x.com 页面（主页 / 列表 / 搜索 / 通知 / 书签）。
所有列**共享同一登录态**——登录一次，全部生效。

- ❌ 不调 X API，不爬虫 —— 就是渲染真实 X 网页
- ✅ 用你自己的浏览器登录态，封号风险最低
- ✅ Win + Mac 通用

## 功能

- ➕ **自由增删列**：「+ 添加列」选预设或填任意 x.com URL；列头 `✕` 删除
- 🗂️ **X 列表 (List)**：「+ 列表 List」贴列表链接或 ID 即可加成一列；不知道 ID 可一键打开「我的列表」去复制
- ↔️ **列宽可拖拽**：拖列右边缘调宽窄，自动记忆（240–900px）
- 🌙 **深色 / 浅色切换**：右上角一键切换，自动记忆
- 移动列 `‹ ›`、单列刷新 `↻`、全部刷新、恢复默认
- 所有布局（列、顺序、宽度、主题）自动存本地，下次打开还在

## 运行

```bash
npm install
npm start
```

首次在任意一列登录 x.com，登录后所有列都登录好。

### Windows 上跑
完全一样：装好 [Node.js](https://nodejs.org)，然后在项目目录里
```bash
npm install
npm start
```

## 常用 URL 模板
- 主页：`https://x.com/home`
- 列表：`https://x.com/i/lists/列表ID`（或直接用「+ 列表 List」按钮）
- 实时搜索：`https://x.com/search?q=关键词&f=live`（`f=live` = 最新）
- 某博主：`https://x.com/用户名`
- 书签：`https://x.com/i/bookmarks`

## 打包成安装包

```bash
npm run dist:mac    # 在 Mac 上跑 → dist/ 出 .dmg
npm run dist:win    # 在 Windows 上跑 → dist/ 出 .exe 安装包
```

> Mac 包要在 Mac 上打、Windows 包在 Windows 上打（跨系统交叉打包容易出问题）。
> 不想打包也行，两台机器都直接 `npm start` 即可。
