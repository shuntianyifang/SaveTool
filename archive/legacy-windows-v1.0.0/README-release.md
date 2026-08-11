# SaveTool 1.0.0

Pawns of War 存档解包 / 回包独立工具。

本文件夹内是 Windows x64 单文件可执行程序，不依赖游戏本体，也不依赖 .NET 运行时。

## 文件

- `SaveTool.exe` - 主程序
- `README.md` - 本说明

## 用法

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

示例：

```powershell
# 解包主存档
SaveTool.exe unpack save_file

# 回包（默认生成 save_file）
SaveTool.exe pack save_unpack.json

# 回包到指定文件
SaveTool.exe pack save_unpack.json save_file.new

# 迁移文件
SaveTool.exe pack migration.json render_cache.dat --migration

# 校验 HMAC 与文件头
SaveTool.exe verify save_file
```

## 文件格式

加密容器结构：

```text
POWSAVE1  | 01 10 | 密文长度(4字节LE) | IV(16字节) | AES-256-CBC密文 | HMAC-SHA256(32字节)
```

- 存档魔数：`POWSAVE1`
- 迁移文件魔数：`POWMIGR1`
- 加密：AES-256-CBC，PKCS7 填充
- 校验：对整个文件去掉末尾 32 字节后的内容计算 HMAC-SHA256

## 密钥

工具内置游戏使用的 MasterKey，并按其用途派生 AES / HMAC 密钥：

```text
MasterKey = 71A42C19D3588EB14FC625906D33FA07C25BE841169D74AB38F063CE8512D74A

AES key  = HMAC-SHA256(MasterKey, "POW_SAVE_AES_KEY")
HMAC key = HMAC-SHA256(MasterKey, "POW_SAVE_HMAC_KEY")

迁移文件使用：
AES key  = HMAC-SHA256(MasterKey, "POW_MIGRATION_AES_KEY")
HMAC key = HMAC-SHA256(MasterKey, "POW_MIGRATION_HMAC_KEY")
```

## 注意

- 回包会重新生成随机 IV，因此每次加密结果不同，但游戏可以正常读取。
- 用 `pack` 覆盖 `save_file` 前请先备份原文件。
- 该工具仅用于本地存档分析、备份与恢复。
