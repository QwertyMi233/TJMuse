# TJMuse 0.2.1 预览

> 本文记录 build 11 的平台接入与打包验证。当前为 build 15，新增[好课和 Canvas 本机学号自动登录](LOCAL-LOGIN-0.2.1.md)，并保留[课表与外观](PREVIEW-0.2.1-schedule.md)等功能。下文“不保存学校密码”描述的是 build 11 行为；当前仅在用户明确开启后保存至系统安全存储。

日期：2026-10-30。版本 0.2.1，内部构建号 11。演示已由用户确认，开始生成 APK／IPA；构建校验结果见 [build 11 验证记录](VERIFICATION-0.2.1-build11.md)。

## 检查演示

运行 `node scripts/serve-preview.mjs` 后，在本机打开 [0.2.1 演示](http://127.0.0.1:8081/?demo=021)。演示使用独立数据和存储，不读取或覆盖正常模式的本地资料，不请求学校平台。

- 作业页最上方为“一键同步所有平台作业”。
- Canvas 位于好课上方，各自保留同步和连接设置；一键同步分别报告各平台结果，单个平台失败不阻止其他平台。
- 点击“连接好课平台”，连接示例账户后，可以检查好课作业进入 To-do、勾选／反选、隐藏和三天回收站。
- Canvas 自动更换设置中，读取并选择示例专用令牌、同意更换，然后启用；可检查维护状态和停止入口。
- 底部顺序为 To-do、课程表、AI、作业、我的，课程表页保持空白。
- 顶部“重置演示”重置示例；“退出”返回正常模式。

## 正式移动端连接实现

好课默认网址为 `https://tongji.aihaoke.net/student/course`，在官方 WebView 中登录，再读取 token。通过官方账户接口获取 token／ticket，安全保存后读取课程、任务和测验。同步前使用票据维护登录；新候选先安全落盘，核验账户后启用。没有保存学校密码。

Canvas 保留手动令牌连接，另提供官方 WebView 登录、读取可选令牌和开启自动更换。用户选择专用令牌并同意后，隐藏 WebView 使用同一网页会话调用所选令牌的重新生成接口。旧值随即失效，不能选择其他软件共用的令牌。

App 可运行时每分钟检查是否需要维护：距上次更换满 12 小时，或临近到期 25 分钟时更新；失败有 30 分钟重试间隔。登录失效、账户／权限改变或达到学校设置的永久期限时停止自动维护并提示用户。关闭或挂起 App 后不保证准点执行。

令牌轮换的新值先保存到系统安全存储，再以 Bearer 方式核验账户；网络失败时保留候选，下次恢复时先验证候选，避免重复生成。权限或账户不符的候选隔离，不自动激活。完整令牌、票据与 Cookie 不写入普通本地数据或日志。

作业自动读取仍保持设备本地 00:00／12:00 的前台规则，保留手动同步。登录维护与作业读取分别调度；Canvas 不会因维护登录而在其他时段自动拉取作业。

## 源码参考

参考 [qp338113/TJ-Class-Schedule](https://github.com/qp338113/TJ-Class-Schedule) 的以下实现，按其 MIT 许可证保留 Algernon 的版权和许可：

- [好课接口与任务字段](https://github.com/qp338113/TJ-Class-Schedule/blob/main/lib/data/platform_task_client.dart)
- [官方网页登录与好课票据读取](https://github.com/qp338113/TJ-Class-Schedule/blob/main/lib/presentation/platform_login_page.dart)
- [Canvas 轮换脚本](https://github.com/qp338113/TJ-Class-Schedule/blob/main/packages/canvas_session_bridge/android/src/main/assets/canvas_rotation.js)
- [Canvas 隐藏 WebView 与安全保存顺序](https://github.com/qp338113/TJ-Class-Schedule/blob/main/packages/canvas_session_bridge/android/src/main/kotlin/icu/tjschedule/canvas_session/CanvasWebSession.kt)

原项目的桥接实现面向 Android；TJMuse 采用 `react-native-webview` 适配 iOS 与 Android。依赖版本为当前 Expo SDK 58 推荐的 14.0.1。许可全文见 [第三方声明](THIRD_PARTY_NOTICES.md)。

## 验证范围

已通过 TypeScript 检查、72 项核心测试、iOS／Android／Web 资源导出（13 条 Web 路由），以及 `scripts/qa-v021.cjs` 的五栏导航、空白课程表、多平台同步、好课连接、手动勾选与恢复、令牌维护设置和演示数据隔离检查。演示回归未请求学校平台，无页面 JavaScript 异常。预览截图总览位于 `artifacts/TJMuse-0.2.1-preview.html`。

本轮的核心测试、浏览器模拟与资源导出用于检查协议处理、状态兼容和演示交互。浏览器不具备移动端原生 WebView，本轮未在 iOS／Android 真机完成学校 SSO、持久 Cookie、隐藏页面执行及令牌轮换联调，也未生成真实令牌或读取真实好课作业。演示结果不代表这些环节已实测通过。

好课接口来自参考项目，尚无本轮实际账户响应；若学校版本或字段不同，正式联调需据实际结果调整。任何同步失败均保留已存作业。
