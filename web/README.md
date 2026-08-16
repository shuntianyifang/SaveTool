# Pawns of War 存档工具（离线 Web 版）

一个单文件 HTML 工具：双击打开即用，不联网、不安装、不上传，支持现代浏览器。**不含游戏美术资产**，只内置文字与数值数据字典。

返回 [总 README](../README.md)。

## 功能

- 打开 / 回包 `POWSAVE1` 与 `POWMIGR1`，AES-256-CBC + HMAC-SHA256，算法与 Windows 版一致；也支持直接打开明文 JSON。
- 结构化编辑：
  - 角色：ID、名称、兵种、等级、经验、HP、主武器、编队、锁定、各装备槽等。
  - 武器：ID、装备角色、等级、经验、攻击卡、13 个配件槽，可恢复默认配件。
  - 模块：可选 / 隐藏 / 全部三种查看模式，按模块 ID 编辑数量，支持批量设置，隐藏视图与 Windows 版一致。
  - 概览：玩家名、语言、音量、战斗设置等常用字段。
- 原始 JSON 页：结构化内容与 JSON 文本双向同步。
- 校验：回包前检查数组长度、ID 范围、配件 ID 范围、装备关系；错误可确认后强制回包。
- 安全：原始文件保留在内存，可下载 `.bak`；可恢复原始内容；支持 `Ctrl+Z` / `Ctrl+Y` 撤销重做。
- 列表：搜索名称 / ID / 槽位，按语言切换名称（en / ru / zh / ko），分页浏览 1000 长度数组。

## 文件

- `SaveTool.html`：最终产物，直接双击打开。
- `src/template.html`、`src/styles.css`、`src/app.js`：源码。
- `tools/build_web.py`：数据字典构建脚本。
- `web_data.json`：构建中间产物。

## 构建

```powershell
python tools/build_web.py
```

默认读取 `D:\POW\assets`；可用 `--assets` 指定其他目录，`--no-data-file` 不输出 `web_data.json`。

脚本只读取 `item_names.json` / `WpnData.json` / `CharData.json` / `ModulData.json`（存在时优先用 `ModulData_resolved.json` 判断模块可用性），不读取任何图片、音频、动画资源。

## 使用

1. 打开 `SaveTool.html`。
2. 打开存档，或直接把存档拖入窗口。
3. 在角色 / 武器 / 模块页编辑，或切换到原始 JSON 手动修改。
4. 点击“回包并下载”，把文件放回游戏存档位置。

覆盖原存档前请先备份。

## 注意事项

- WebCrypto 需要安全上下文：`file://`、`localhost` 或 HTTPS。
- 浏览器不能直接写手机 App 沙盒，Android / iOS 需要手动复制文件进出。
- 回包会生成新的随机 IV，每次结果不同，但游戏可以正常读取。
