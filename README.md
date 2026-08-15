# POW SaveTool

Pawns of War 存档解包 / 回包工具，支持直接读取、修改和重新加密游戏存档，不依赖游戏本体运行。

## 版本结构

| 目录 | 版本 | 说明 |
|---|---|---|
| `windows/` | Windows WPF 可视版 | 当前推荐版本，见 [windows/README.md](windows/README.md) |
| `web/` | 离线 HTML 版 | 浏览器直接打开，跨平台，见 [web/README.md](web/README.md) |
| `archive/legacy-windows-v1.0.0/` | 旧 CLI 版 | 已归档的无界面控制台版，见 [ARCHIVE_NOTES.md](archive/legacy-windows-v1.0.0/ARCHIVE_NOTES.md) |

## Windows 可视版

源码在 [windows/](windows/)，项目文件为 `PowSaveEditor.csproj`，详细说明见 [windows/README.md](windows/README.md)。

```powershell
dotnet build windows/PowSaveEditor.csproj -c Release
```

## 离线 HTML 版  

见 [web/README.md](web/README.md)。  

## 存档格式

```text
POWSAVE1 | 01 10 | 密文长度(4字节LE) | IV(16字节) | AES-256-CBC密文 | HMAC-SHA256(32字节)
```

- 存档魔数：`POWSAVE1`
- 迁移文件魔数：`POWMIGR1`
- 加密：AES-256-CBC，PKCS7 填充
- 校验：对整个文件去掉末尾 32 字节后的内容计算 HMAC-SHA256

密钥派生：

```text
MasterKey = 71A42C19D3588EB14FC625906D33FA07C25BE841169D74AB38F063CE8512D74A

AES key  = HMAC-SHA256(MasterKey, "POW_SAVE_AES_KEY")
HMAC key = HMAC-SHA256(MasterKey, "POW_SAVE_HMAC_KEY")

迁移文件：
AES key  = HMAC-SHA256(MasterKey, "POW_MIGRATION_AES_KEY")
HMAC key = HMAC-SHA256(MasterKey, "POW_MIGRATION_HMAC_KEY")
```

## 许可

MIT License，见 [LICENSE](LICENSE)。

本工具仅用于本地存档分析、备份与恢复，请遵守游戏自身的使用条款。  
