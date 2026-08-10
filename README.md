# POW SaveTool

Pawns of War 存档解包 / 回包工具。

支持直接读取、修改和重新加密游戏存档，不依赖游戏本体运行。

## 平台

| 平台 | 源码 | 使用方式 |
|---|---|---|
| Windows | [windows/](windows/) | 编译成 `SaveTool.exe` 使用 |
| Web | [web/](web/) | 浏览器直接打开 `SaveTool.html`，Win / Android / iOS 通用 |

## 目录结构

```text
SaveTool/
├── README.md
├── LICENSE
├── .gitignore
├── windows/          Windows 版 C# 源码
└── web/              离线 HTML 版
```

## 用法

Windows 版：

```text
SaveTool unpack <加密存档> [输出.json]
SaveTool pack <明文json> [输出文件] [--migration]
SaveTool verify <加密存档>
```

默认输出：

```text
unpack -> save_unpack.json
pack   -> save_file
pack --migration -> render_cache.dat
```

Web 版：

1. 用 Chrome / Edge / Safari 打开 `SaveTool.html`；
2. 选择存档文件；
3. 点“解包为 JSON”，编辑后点“回包并下载”。

## 存档格式

```text
POWSAVE1  | 01 10 | 密文长度(4字节LE) | IV(16字节) | AES-256-CBC密文 | HMAC-SHA256(32字节)
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

## 控制台权限说明

游戏控制台权限不在存档 JSON 中，而是运行时静态字段：

```text
Save.ag_dev_mode  = true -> Developer
Save.ag_test_mode = true -> Tester
否则                    -> Player
```

修改存档 JSON 无法改变权限。需要解锁控制台时，应修改游戏二进制中命令注册的 `requiredAccess`。

## 构建 Windows 版

需要 .NET 8 SDK：

```powershell
dotnet publish windows/SaveTool.csproj -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

## 许可证

MIT License，见 [LICENSE](LICENSE)。

本工具仅用于本地存档分析、备份与恢复，请遵守游戏自身的使用条款。
