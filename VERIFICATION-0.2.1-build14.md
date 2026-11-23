# TJMuse 0.2.1 build 14 验证记录

2026-10-31。显示版本 0.2.1，Android versionCode 与 iOS buildNumber 均为 14。

## Canvas 登录保持

- 参照 TJ-Class-Schedule 的本机 Cookie 复用、隐藏网页续期及启动／回前台维护，在保留持久 WebView 存储、共享 Cookie／进程池的基础上增加只读登录检查。
- 启动与回前台检查有两分钟冷却；运行中约十分钟保活，待重新认证状态约三十分钟重试。读取本人 profile 核对账户，不额外读取作业，不导出 Cookie。
- 保活与令牌轮换独立计时，维护与同步共享执行中的维护任务；网页登录暂时失效时继续尝试已保存的有效令牌。账户、权限和安全存储异常仍会阻断。
- Canvas 设置新增登录保持状态、最后检查时间和立即检查入口。关闭自动更换同时停止保活。
- 作业同步继续仅限本地 00:00／12:00，手动同步保留。此前所有 0.2.1 功能与 Contributor 大写纯文字署名保留。

## 测试

- TypeScript、90 项核心测试、iOS／Android／Web 资源导出通过，13 条 Web 路由。
- 新增测试执行实际注入脚本，覆盖同源只读请求、账户变化、认证与网络错误、独立计时、有效令牌回退、敏感错误保护与重启恢复。
- 平台浏览器演示通过，验证保活状态和手动检查不重新生成令牌，并回归好课、作业勾选、删除恢复、重启及数据隔离；页面异常与学校请求均为 0。
- 两平台 Release JS 含 canvas-keepalive、lastSessionCheck、此前同页跳转修复和 Contributor 大写署名；WebView 原生组件存在。

## 产物

- Android：`TJMuse-0.2.1-arm64-v8a.apk`，36,073,589 字节，ARM64；0.2.1／14，最低 API 24，target 36，compile 37。ZIP CRC、Release JS、v2 签名通过，证书与旧版一致。
- APK SHA-256：`e1c4d4121617bc350f345ce7049d5ad81308c51475845f622b6cc49f60953da1`。
- 发行证书 SHA-256：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- iOS：`TJMuse-0.2.1-unsigned.ipa`，11,322,591 字节，iPhoneOS ARM64，最低 iOS 16.4，0.2.1／14。ZIP、Info.plist、Mach-O、Release JS 通过；无加密、代码签名或预置描述文件，需用户自签。
- IPA SHA-256：`5a98a697f4a66ed96ac975610bf0609bc4e62719ca217bad55fe12991b377aed`，与云端日志一致。[云构建](https://expo.dev/accounts/qwertymi/projects/tjmuse/builds/c3e33c03-7a9e-49fc-80f0-e5c31e47bccd)完成于 2026-10-31T06:12:56.337Z。
- 源码 ZIP 校验 CRC 并逐文件比对，排除真实凭据、工具链和缓存；详情见 releases/build-info-0.2.1-build14.json。
- build 13 已校验备份至 releases/archive/0.2.1-build13/；历史 [验证记录](VERIFICATION-0.2.1-build13.md)保留。

## 验证边界

本轮没有真实学校账户长时间保活或 iOS／Android 真机挂起恢复测试。浏览器模拟与文件校验不能保证学校永远不要求重新认证。首次需在 App 内官方页面登录一次；学校撤销会话、要求密码或二次验证时仍需用户操作。关闭或挂起 App 后不保证准点维护。

参考源码、使用步骤及适用范围见 [Canvas 自动保持登录](CANVAS-SESSION-0.2.1.md)。
