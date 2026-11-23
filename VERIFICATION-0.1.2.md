# 0.1.2 验证记录

日期：2026-10-28。环境：Windows、Node.js 24.22.1、Expo SDK 58。

## 已通过

- TypeScript 类型检查；iOS／Android Hermes 与 Web 三平台资源导出。
- 24 项自动测试全部通过，新增跨天分段、多日任务、零点结束、跨年与闰日、续程排序、主任务／子任务完成联动、循环实例隔离、月末循环续程、提醒去重与 AI 跨天上下文。
- 夏令时测试在 America/New_York 时区验证：跨越 23 小时／25 小时的日期时，实际分钟时长、结束时间和续程日期仍一致。
- 跨天浏览器回归：在当天列表创建昨天开始的任务，立即显示续程；结束早于开始时阻止保存，修正后自动计算 90 分钟。
- 从第二天完成任务与子任务，返回开始日确认状态共享；修改时长为 1530 分钟后，结束日期自动延长到第三天，第四天不显示。
- 每天循环的跨天任务在同一天显示前次续程和当次开始，勾选前次不会完成当次；刷新后状态保留。多日显示没有复制底层任务记录。
- 从中间日删除任务，所有覆盖日期都不再显示；循环系列仍保留。
- 原有完整浏览器回归通过：任务、循环、自由事项、学期设置、主题、Markdown、旧版迁移与个人资料等。两个回归脚本均无 JavaScript 页面异常。
- 320／393／768 像素宽度未发现横向溢出。跨天截图：`artifacts/cross-day.png`（不纳入版本库）。

命令：`pnpm check`、`node scripts/qa.cjs`、`node scripts/qa-cross-day.cjs`。浏览器脚本依赖 Playwright 和 Edge，可通过 `PLAYWRIGHT_MODULE` 指定已有模块，使用本机 8081 预览服务。

## 安装包

- Android Release 构建成功，输出 `releases/TJMuse-0.1.2-arm64-v8a.apk`，35,645,692 字节。APK v2 签名验证通过，证书 SHA-256 与之前版本相同：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- APK 元数据确认：`com.tjmuse.app`、versionName `0.1.2`、versionCode 3、最低 API 24、目标 API 36、ARM64，无 debuggable 标记。
- APK SHA-256：`97ff8d1f5afc1153f0a34c86310ba24566513e3777c0006eaecf9be9c36f3d66`。
- iOS 在原 Expo 项目完成 Release 真机归档，构建 ID `72e9b26e-9fd8-4c9c-8e57-27a0fe3e6402`，状态 FINISHED。
- IPA 输出 `releases/TJMuse-0.1.2-unsigned.ipa`，11,135,593 字节。ZIP CRC 校验通过，Bundle ID `com.tjmuse.app`、版本 `0.1.2`、build 3、最低 iOS 16.4。真实 iPhoneOS ARM64 Mach-O，无加密、无签名载入命令、无 provisioning profile，包含 3,353,939 字节的 Release JS bundle。
- IPA SHA-256：`1b87ed1c50e9c8e79b65c9c25d443a66b636f028d6a7cadc7037071a1cff197c`，与云端归档脚本记录一致。
- 两个安装包均保存在本机并附带 SHA-256 文件，原 0.1.0／0.1.1 产物保留。文件校验不代表已完成本版实机运行验证。

## 待实机验证

本版仍需在 Android 覆盖升级、iOS 自签安装后，验证系统起止日期选取器、跨天显示与共享勾选、真实通知送达、设备时区变化及真实 AI 服务。浏览器与文件校验不能代替实机验证。
