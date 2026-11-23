# 0.5.0 build 30 验证记录

- 207 项自动化测试及 TypeScript 检查通过；两种平台设置、Canvas 令牌入口、课程编辑删除，以及课程与作业临时编辑／禁用／恢复的浏览器操作通过。
- 真实网站三次独立测试进程重启均从无效会话自动登录，读取好课 23 份、智学盟 8 份，智学盟四页内容完整且无章节内部元数据。使用 App 的登录和失效恢复代码，传输为 Windows 无 Cookie HTTPS；不是手机运行环境的证明。
- 本轮临时加密测试凭据、捕获进程与隔离浏览器配置已清理。
- Android 完整编译，发行签名一致，arm64-v8a，targetSdk 36，ZIP 及功能标记校验通过。
- iOS 为未签名 iPhoneOS arm64 包，最低 iOS 16.4，含 WidgetKit 扩展。复用 build 29 原生程序并更新 Hermes 资源及主应用／扩展版本元数据；28 项原生输入与云构建指纹匹配，29 个资源及原生程序字节保持一致。BottomSheetView／RNHostView 原生实现存在。
- iPhone 键盘、实际系统安全存储和手机杀进程恢复仍待真机复测。不得把浏览器或 Windows 协议测试当成真机测试。

详见 [修订说明](REPAIR-0.5.0-build30.md)和 [真机复测步骤](RETEST-0.5.0-build30.md)。产物记录：`releases/build-info-0.5.0-build30.json`。
