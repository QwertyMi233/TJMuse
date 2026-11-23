# 0.1.1 验证记录

日期：2026-10-28。环境：Windows、Node.js 24.22.1、Expo SDK 58。

## 已通过

- TypeScript 类型检查。
- 16 项自动化测试：保留原有任务、日期、循环、提醒与 API 测试，新增教学周跨月／跨年、周一／周日起始日、学期前日期、非法日期，以及 0.1.0 数据和主题迁移检查。
- iOS、Android Hermes 与 Web 三平台资源导出成功。
- Edge 手机尺寸浏览器回归：首次选择 2026-09-14 所在周，预览 09-14 至 09-20，确认后显示第 7 周；刷新不重复出现设置。修改学期与周起始日后周次更新，跨年继续计数，学期前显示提示。
- 白底主题检查、自定义背景和恢复蓝白主题操作通过。
- AI 模拟回复中的 Markdown 标题、加粗、删除线、嵌套列表、引用、链接、表格、行内代码、长代码块可正常渲染。320／393／768 像素宽度未发现页面横向溢出。
- 模拟从 0.1.0 升级：首次设置界面出现，旧任务、完成状态和对话数量保留；旧默认背景转为白色，历史 Markdown 回复正常显示。
- 原有任务添加、子任务、编辑、完成、循环、自由事项、AI 追问、个人资料、作业入口与本地恢复回归通过，无浏览器 JavaScript 页面异常。

自动测试：`pnpm check`。浏览器脚本：`scripts/qa.cjs`，使用模拟 AI 接口。截图输出到 `artifacts/`（不纳入版本库）。

## 安装包

- Android Release 构建成功，输出 `releases/TJMuse-0.1.1-arm64-v8a.apk`，35,639,272 字节。APK v2 签名验证通过，证书 SHA-256 与 0.1.0 相同：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- APK 元数据确认：`com.tjmuse.app`，versionName `0.1.1`，versionCode 2，最低 API 24、目标 API 36，ARM64 架构，无 debuggable 标记。
- APK SHA-256：`06168cfc1aeaf35a45a9ab0681e81022a80e6e9a052a4e63db570d0333af3694`。
- iOS 在原 Expo 项目完成 Release 真机归档，构建 ID 为 `c2cdae4d-b063-4dd0-a4ac-d78f95fecc4f`，状态 FINISHED。
- IPA 输出 `releases/TJMuse-0.1.1-unsigned.ipa`，11,131,393 字节。ZIP CRC 校验通过，Bundle ID `com.tjmuse.app`、版本 `0.1.1`、build 2、最低 iOS 16.4，真实 iPhoneOS ARM64 Mach-O，无加密、无签名载入命令、无 provisioning profile，包含 3,345,738 字节的 Release JS bundle。
- IPA SHA-256：`0b6f09b09ddba9d3eb0cbf57785d4ab408d94bda3a28143dd30e7d48d2bbe3c5`，与云端归档脚本记录一致。
- 两个安装包均已在本机保存，并附带 SHA-256 文件；生成和文件校验不代表已完成本版真机运行验证。原 0.1.0 安装包保留。

## 待真实设备验证

- Android 覆盖安装与 iOS 自签安装后的启动、旧记录保留、首次学期设置及后续修改。
- iOS 系统日期滚轮、Liquid Glass、Android Material 选取器，以及真实设备 Markdown 滚动与文字选择。
- 提醒送达、相册与系统安全存储、真实 AI 服务连接与账户权限。

浏览器回归与文件校验不能代替真实设备验证。
