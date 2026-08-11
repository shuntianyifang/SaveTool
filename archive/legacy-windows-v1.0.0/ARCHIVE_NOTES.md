# Legacy Windows CLI - SaveTool 1.0.0

此目录归档了旧版 Windows 无界面控制台版 SaveTool。

## 归档内容

- `Program.cs`：旧 CLI 源码
- `SaveTool.csproj`：旧 .NET 8 控制台工程
- `README-release.md`：旧发布说明
- `old-build-outputs/`：旧的本地构建产物与测试输出（不纳入 git）

## 替代版本

该版本已被 `D:\POW\SaveTool\windows` 下的 WPF 可视版替代。

旧版命令行用法（仅作历史参考）：

```text
SaveTool unpack <加密存档> [输出.json]
SaveTool pack <明文json> [输出文件] [--migration]
SaveTool verify <加密存档>
```

Git 历史通过 tag `legacy-windows-v1.0.0` 保留。
