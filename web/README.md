# Pawns of War 存档工具（离线 HTML 版）

一个网页文件，不联网、不安装、不上传，Win / Android / iOS 的现代浏览器都能用。

## 文件

- `SaveTool.html` - 主程序，用浏览器打开即可
- `README.md` - 本说明

## 使用步骤

1. 打开 `SaveTool.html`（建议 Chrome / Edge / Safari）。
2. 选择存档文件：
   - Windows：直接选 `save_file` 或 `render_cache.dat`。
   - Android / iOS：先把游戏存档复制到 `Download` 或“文件”App 里能访问的位置。
3. 点“解包为 JSON”。
4. 在文本框里修改 JSON。
5. 点“回包并下载”，默认输出：
   - 普通存档：`save_file`
   - 迁移文件：`render_cache.dat`
6. 把下载的文件放回游戏存档位置。

## 支持的格式

- `POWSAVE1`：普通加密存档
- `POWMIGR1`：迁移文件（`render_cache.dat`）

加密方式：AES-256-CBC + HMAC-SHA256，算法与 Windows 版 SaveTool 完全一致。

## 注意事项

- 浏览器不能直接读写手机 App 沙盒，Android / iOS 需要手动复制文件进出。
- 回包会生成新的随机 IV，每次结果不同，但游戏可以正常读取。
- 覆盖原存档前请先备份。
