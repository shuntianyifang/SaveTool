# POW SaveTool（Windows 可视版）

Pawns of War 存档的 Windows WPF 编辑器，基于 .NET 10.0-windows，带本地化物品名、图标和武器配件实时合成。

返回 [主 README](../README.md)。

## 构建与运行

已有构建产物位于 `bin/Release/net10.0-windows/PowSaveEditor.exe`，也可以在本目录自行构建：

```powershell
dotnet build PowSaveEditor.csproj -c Release
```

构建需要 .NET 10 SDK，运行需要 .NET 10 运行时。程序启动时会直接读取 `D:\POW\assets` 下的本地逆向导出数据，见下文“当前数据依赖”。

## 功能与实现

### 存档解密 / 回包（SaveCrypto.cs）

- 使用 .NET `Aes` 和 `HMACSHA256` 实现 `POWSAVE1` 容器：AES-256-CBC + PKCS7 填充 + HMAC-SHA256。
- 密钥不存储在存档内，而是由逆向得到的 `MasterKey` 通过 `HMAC-SHA256(MasterKey, "POW_SAVE_AES_KEY")` / `"POW_SAVE_HMAC_KEY"` 派生。
- 解密时用 `CryptographicOperations.FixedTimeEquals` 做常量时间 HMAC 校验，避免时序侧信道。
- 回包时 `Aes.GenerateIV()` 生成新随机 IV，重新计算 HMAC；保存前若没有 `.bak` 则先把原文件复制为备份。

### 物品名与详情（AssetIndex.cs）

- 使用 `System.Text.Json` 读取本机逆向导出的 JSON 作为索引：`item_names.json`、`icon_map.json`、`icon_map_l2d.json`、`sprites/all_index.json`。
- 武器 / 角色 / 模块显示名支持 en / ru / zh / ko 四种语言切换；详情来自 `WpnData.json`（type / damage / cost）和 `CharData.json`（class / hp / cost）。
- 找不到精确图标时，用 `all_index.json` 里的名称做模糊匹配，再退回占位图。

### 武器图标实时合成（WeaponCompositeRenderer.cs）

- 读取存档中 `ag_inv_wpn_mod_1..13` 的配件 ID，从 `WpnData.json` 的 `ag_inv_wpn_modul_pos_ui_id_*` / `ag_inv_wpn_modul_pos_item_id_*` 取 UI 挂点坐标。
- 使用 WPF `DrawingVisual` + `RenderTargetBitmap` 按逆向出的 `AG_Func.Spawn_Ico_WPN_v3` 绘制顺序叠加 base 图和配件图：槽位 6 先画，随后 base，再按 12、11、4、2、9、7、8、10、3、5、13 画配件，槽位 1（弹匣/弹药层）最后画。
- 配件坐标优先取 `ModulData_resolved.json` 里的单模块覆盖坐标；合成结果写入 `sprites/composite/wpn_<id>_<mods>.png` 并做内存缓存，避免反复渲染。
- 缺少精确模块贴图时使用 fallback 贴图，并在界面提示 `Fallback sprites`。

### 存档编辑（MainWindow.xaml.cs）

- 打开文件时先检查 `POWSAVE1` 魔数；加密存档走 `SaveCrypto.Decrypt`，明文 JSON 直接读取。
- 用 `System.Text.Json.Nodes.JsonNode` 在内存中维护 `ag_inv_wpn_id`、`ag_inv_char_id`、`ag_inv_modul_count`、`ag_inv_wpn_mod_1..13` 数组，修改后直接写回 JsonNode。
- 提供列表搜索（名称 / internal id）、ID 编辑、13 个配件槽位编辑、按 `WpnData.ag_inv_wpn_modul_id_*` 恢复武器默认配件、原始 JSON 编辑。
- 保存时把整个 JSON 重新加密写回原文件，并在首次保存前自动生成 `.bak` 备份。

## 当前数据依赖（重要）

当前版本**硬编码**读取 `D:\POW\assets`，这些文件是本机逆向工程导出的产物，没有随源码一起分发：

```text
D:\POW\assets\item_names.json
D:\POW\assets\icon_map.json
D:\POW\assets\icon_map_l2d.json
D:\POW\assets\sprites\all_index.json
D:\POW\assets\sprites\all\
D:\POW\assets\sprites\resource\
D:\POW\assets\sprites\composite\
D:\POW\assets\sprites\placeholder.png
D:\POW\assets\il2cpp_dump\WpnData.json
D:\POW\assets\il2cpp_dump\CharData.json
D:\POW\assets\il2cpp_dump_recursive\ModulData.json
D:\POW\assets\il2cpp_dump_recursive\ModulData_resolved.json
```

其中 `WpnData.json` / `ModulData.json` 提供武器属性、挂点坐标、默认配件和模块资源前缀，属于逆向工程直接产物。因此：

- 其他人拿到源码或构建产物后，**无法正常使用**名称、图标、武器合成等依赖资产数据的功能；只有解密 / 回包这类纯加密功能可以独立运行。

## 关键文件

- `SaveCrypto.cs`：存档加解密
- `AssetIndex.cs`：物品名 / 图标索引
- `WeaponCompositeRenderer.cs`：武器配件合成渲染
- `MainWindow.xaml` / `MainWindow.xaml.cs`：主界面

存档格式、密钥派生和许可说明见 [主 README](../README.md) 与 [LICENSE](../LICENSE)。
