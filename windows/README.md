# POW SaveTool（Windows 可视版）

Pawns of War 存档的 Windows WPF 编辑器，基于 .NET 10.0-windows，带本地化物品名、图标和武器配件实时合成。

返回 [主 README](../README.md)。

## 构建与运行

已有构建产物位于 `bin/Release/net10.0-windows/PowSaveEditor.exe`，也可以在本目录自行构建：

```powershell
dotnet build PowSaveEditor.csproj -c Release
```

## 功能

- 打开并解密 `save_file` / `render_cache.dat`
- 武器 / 角色 / 模块列表，显示本地化名称与图标
- 武器图标按存档中的配件实时合成渲染（`WeaponCompositeRenderer`）
- 搜索、语言切换、ID 编辑
- 保存时重新加密并生成 HMAC，自动备份原文件

## 关键文件

- `SaveCrypto.cs`：存档加解密
- `AssetIndex.cs`：物品名 / 图标索引
- `WeaponCompositeRenderer.cs`：武器配件合成渲染
- `MainWindow.xaml` / `MainWindow.xaml.cs`：主界面

存档格式、密钥派生和许可说明见 [主 README](../README.md) 与 [LICENSE](../LICENSE)。
