# TJMuse 0.2.1 build 12 验证记录

日期：2026-10-30。显示版本 0.2.1，Android versionCode 与 iOS buildNumber 均为 12。

## 功能

- 参照 TJ-Class-Schedule 实现同济个人课表抓取和预览，支持多份课表、独立学期／节次时间及显隐；课程加入首页、AI 固定时间和课程提醒。课程表页保留空白与右下角加号。
- “我的 → 首页排版”统一管理课程、作业和 To-do：时间混排或分类；分类及已完成任务独立折叠并持久保存，移除作业页旧位置入口。
- 默认跟随系统，支持手动浅色／深色、独立自定义配色及深色发光。默认配色与用户指定色值一致。
- 关于我们居中保留版本、OrstaLogic 版权，新增纯文字 contributor qp338113，没有主页链接。

## 代码与界面验证

- TypeScript 检查、80 项核心测试、iOS／Android／Web 资源导出通过，13 条 Web 路由。
- 课表／外观浏览器回归通过：多课表导入、显隐、编辑详情、删除与重启保留；分类及完成任务折叠；系统／手动模式和两套颜色；发光与无链接署名；320／393／768 像素布局。无页面 JavaScript 异常。
- 模拟官方 DOM 运行实际抓取与悬浮脚本，验证区域边界、节次、浮层及不连续／单／双周解析。未请求学校平台。
- 原有 Canvas、好课、一键同步、令牌维护设置、作业勾选与回收站演示回归通过。
- 两平台 Release JS 检查包含课表路径、布局字段、深色配色和贡献者署名；WebView 原生组件存在。

## 安装包与源码

- Android：`TJMuse-0.2.1-arm64-v8a.apk`，36,066,449 字节，ARM64，最低 API 24，target 36，compile 37；包名 com.tjmuse.app，版本 0.2.1／12。ZIP CRC、Release JS、v2 签名均通过，发行证书与旧版一致。
- APK SHA-256：`58615b8e27af7d7d43ad3b9b926226c67b800423ad86f5239cfadcdeb0fb8214`。
- 发行证书 SHA-256：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- iOS：`TJMuse-0.2.1-unsigned.ipa`，11,318,798 字节，iPhoneOS ARM64，最低 iOS 16.4，版本 0.2.1／12。ZIP、Info.plist、Mach-O 和 Release JS 检查通过。无加密、代码签名或预置描述文件，需要用户自行签名后安装。
- IPA SHA-256：`748526720669009cee573187ec9fe3006bb738e8719caaf2224d02197401f4ba`，与云端打包日志一致。
- [iOS 云构建记录](https://expo.dev/accounts/qwertymi/projects/tjmuse/builds/0f624d43-9b1d-434d-a9df-1943e59fb180)，完成时间 2026-10-30T09:44:00.190Z。
- 源码 ZIP 通过 CRC 和逐文件一致性检查，排除真实凭据、工具链、缓存、构建产物；保留第三方许可、完整源码与验证脚本。具体大小和摘要见 releases/build-info-0.2.1-build12.json。
- 上一轮 build 11 原文件与校验记录已按 SHA-256 比对备份至 releases/archive/0.2.1-build11/；历史记录见 [build 11 验证](VERIFICATION-0.2.1-build11.md)。

## 验证边界

本轮未在手机完成学校统一认证或实际账户课表读取，也未重测真实好课账户、Canvas 隐藏页面轮换和系统提醒。核心测试、浏览器模拟和安装包校验不能代替实机验证。作业自动同步仍限本地 00:00／12:00 的 App 可运行时段，挂起后不保证准点执行。IPA 为用户要求的未签名真机包。

操作说明见 [课表与外观预览](PREVIEW-0.2.1-schedule.md)，版权许可见 [第三方声明](THIRD_PARTY_NOTICES.md)。
