# TJMuse 0.2.1 验证记录

日期：2026-10-30。版本 0.2.1，Android versionCode 与 iOS buildNumber 为 11。

## 本版功能

- 好课官方网页登录、token／ticket 维护，以及课程任务、作业与测验读取；复用待办显示、勾选、AI、提醒及三天回收站。
- 作业页顶部“一键同步所有平台作业”，Canvas 位于好课上方，各平台同步结果独立。
- Canvas 官方登录、专用令牌选择和隐藏 WebView 自动更换；新值先安全保存再验证，候选可恢复，账户／权限异常停止激活。
- 底部导航为 To-do、课程表、AI、作业、我的；课程表保持空白。
- 演示使用独立示例存储，不请求学校平台，不读写正常模式的用户资料。移动端正常启动不进入演示。

## 代码与界面验证

- 72 项核心测试通过，包括原有任务、跨天、完成状态、回收站、同步时点，以及好课分页、账户与平台隔离、候选恢复和权限变化处理。
- TypeScript 检查与 iOS／Android／Web 资源导出通过，包含 13 条 Web 路由。
- `scripts/qa-v021.cjs` 通过：五栏顺序、空白课程表、一键同步、好课连接、自动更换设置、勾选与恢复、重启保留、320／393／768 宽度及示例数据隔离；无页面 JavaScript 异常，学校请求数为 0。
- `scripts/qa-v020-build10.cjs` 在 0.2.1 上回归通过：原有 Canvas 连接、手动勾选／反选、删除恢复、清空确认、72 小时边界及重启补清理。
- 本机 Android 构建为 WebView 的 Kotlin 编译依赖补充官方 Maven Central，避免经 Plugin Portal 下载时的 TLS 连接失败；没有关闭证书验证或更改发行签名。

## 安装包与源码

- Android Release：`TJMuse-0.2.1-arm64-v8a.apk`，36,013,981 字节，ARM64；包名 `com.tjmuse.app`，版本 `0.2.1`／versionCode `11`，最低 API 24、target API 36、compile API 37。ZIP CRC、Release JS 和 WebView 原生组件检查通过。
- APK v2 签名校验通过，沿用原有发行证书，SHA-256：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- iOS 未签名 IPA：`TJMuse-0.2.1-unsigned.ipa`，11,289,176 字节；版本 `0.2.1`／build `11`，最低 iOS 16.4。ZIP、Info.plist、iPhoneOS ARM64 Mach-O、WebView 原生组件与嵌入 JS 检查通过；无加密、代码签名或预置描述文件，需要自签后安装。
- [iOS 云构建记录](https://expo.dev/accounts/qwertymi/projects/tjmuse/builds/deb21a94-d734-4bd6-83e7-4394bc8c5a7b)完成，本机 IPA SHA-256 与云端打包日志一致。
- APK SHA-256：`acd934fced9ee3cc9dddb8e96a9b8dbf0c9c6eb377b4e85d41e3dfd5344d6902`。
- IPA SHA-256：`cd105698088f40d933e089dfc7f214a0e9305b0e8efacfefaa512135229f71f4`。
- 源码 ZIP 使用 `scripts/package-source.py` 校验 CRC 并逐文件比对，排除真实凭据、工具链、缓存和安装包；包含 WebView 适配、第三方许可及本机 Android 仓库修复脚本。
- 0.2.0 文件继续保留。当前元数据为 `releases/build-info-0.2.1-build11.json`。

## 验证边界

本次没有使用真实好课账户或生成实际 Canvas 令牌。学校 SSO、持久 Cookie、隐藏 WebView 轮换和系统提醒仍需在移动端安装后联调；核心测试、浏览器模拟和文件校验不等同于实机验证。

Canvas 作业自动同步保持本地 00:00／12:00 的前台规则。令牌维护在 App 可运行时按 12 小时／临近到期条件检查；关闭或挂起后无法保证准点执行。iOS IPA 为未签名真机包，需要自签后安装。

参考源码及许可证见 [功能说明](PREVIEW-0.2.1.md)和[第三方声明](THIRD_PARTY_NOTICES.md)。
