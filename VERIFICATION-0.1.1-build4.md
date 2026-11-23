# 0.1.1 修订验证记录（build 4）

日期：2026-10-28。显示版本为 0.1.1，Android versionCode 与 iOS buildNumber 均为 4。

## 已通过

- TypeScript 类型检查，24 项自动测试全部通过，iOS／Android Hermes 和 Web 三平台资源导出。
- 新建任务直接设置 09:00 开始、10:15 结束，时长自动变为 75 分钟；输入 90 分钟，结束时间变为 10:30；再次选择 11:00 结束，时长变为 120 分钟。
- 保存后重新编辑，结束时间和时长均恢复；再次修改为 45 分钟，结束时间更新为 09:45，保存后仍一致。
- 原有跨天／多日任务、结束早于开始的校验、主任务与子任务联动、循环实例隔离、修改与删除回归通过。
- 完整浏览器回归通过，包括任务、自由事项、学期设置、主题、Markdown、个人资料与旧版迁移；无 JavaScript 页面异常。
- 任务编辑界面和跨天清单在 320／393／768 像素宽度均未出现页面横向溢出。结束时间控件位于任务名称下方，时长输入完整保留。
- 原 0.1.1 build 2 的 9 个产物与校验文件已逐个比对 SHA-256 后备份到 `releases/archive/0.1.1-build2/`。

浏览器脚本：`scripts/qa.cjs` 与 `scripts/qa-cross-day.cjs`。新截图：`artifacts/task-time-editor.png`（不纳入版本库）。

## 安装包

- Android Release 构建成功：`releases/TJMuse-0.1.1-arm64-v8a.apk`，35,645,948 字节。显示版本 `0.1.1`、versionCode 4、最低 API 24、目标 API 36、ARM64，无 debuggable 标记。
- APK v2 签名通过，证书 SHA-256 与之前版本相同：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。APK SHA-256：`ed7f88a624a87df7c51abec25d13abd1db8d4f28407faeace923e8c252c29101`。
- iOS 通过原 Expo 项目完成 Release 真机归档，构建 ID `b508d722-ed5c-4fcc-abaf-93212ea6c18c`，状态 FINISHED。
- IPA 为 `releases/TJMuse-0.1.1-unsigned.ipa`，11,135,632 字节。ZIP CRC、`com.tjmuse.app`、显示版本 `0.1.1`、build 4、最低 iOS 16.4、真实 iPhoneOS ARM64 均已核对；无加密、无签名载入命令、无 provisioning profile，包含 3,354,209 字节的 Release JS bundle。
- IPA SHA-256：`16f20434ab87b400f21ae233505f81d18ccc8d02f41ea8fe213c0ea95bcfc7ca`，与云端归档脚本记录一致。
- 当前标准文件名已更新为本次修订产物；原 0.1.1 build 2 文件保存在上述备份目录，0.1.0／历史开发构建 0.1.2 的其他文件保留。

## 待实机验证

仍需安装后检查 iOS／Android 原生开始和结束日期选取器、时长联动、覆盖安装后的旧记录、通知和真实 AI 服务。iOS IPA 需要自行签名。
