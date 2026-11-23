# TJMuse 0.2.1 build 15 验证记录

2026-10-31。显示版本仍为 0.2.1，Android versionCode 与 iOS buildNumber 均为 15。上一轮 build 14 已按校验记录归档至 `releases/archive/0.2.1-build14/`。

## 变更与验证

- 好课和 Canvas 的学号密码自动登录分别管理，默认关闭，用户同意后使用系统安全存储。保存后清空输入，删除彼此独立；浏览器演示仅用内存数据。
- 好课真实公开前端确认学号登录、同济大学和“一周内自动登录”。使用合成测试学号密码，在本机拦截其学号登录请求，验证官方前端生成的加密字段、学校 tenantId 与 autoLogin 参数；实际认证请求转发数为 0。
- Canvas 10 个隔离 DOM 场景验证官方表单、CSRF、保持登入、输入事件、外部来源／表单地址拒绝、验证码与错误停止、手动取消选择及填写过程变化。
- TypeScript 与 100 项核心测试通过，含凭据同意、单次预留、失败重启暂停、安全删除、分平台隔离、好课过期恢复与账户拒绝。
- iOS／Android／Web 资源导出通过，13 条静态路由；本机自动登录设置及原平台演示回归通过，五页面、平台顺序、全部同步、Canvas 保活、好课连接、作业勾选／删除恢复与数据隔离正常。
- 两平台安装包包含本轮双平台凭据与表单脚本，以及旧版保活、同页跳转修复和大写纯文字 Contributor。

## Android

- 完整 Release 编译成功，APK 36,113,189 字节，ARM64，最低 API 24，target 36，compile 37。
- ZIP、包名、0.2.1／15 和 v2 签名通过；发行证书与旧版一致，WebView 原生模块存在。
- SHA-256：`b445bd5ad3481fd68d764096b36a662d74034e91ce36f438c275c0a9e0aefcca`。

## iOS：复用原生包，更新 Release 资源

本轮 EAS 免费云构建配额已耗尽，未产生 build 15 的新 Xcode 构建。基于归档中已验证的 build 14 未签名 iPhoneOS ARM64 原生包，使用 Expo `export:embed --platform ios --dev false --bytecode` 重新生成本轮发布字节码，再进行本机资源打包。

- 基包 SHA-256：`5a98a697f4a66ed96ac975610bf0609bc4e62719ca217bad55fe12991b377aed`。
- 11 份原生输入完全一致（应用配置仅允许内部构建号差异），全部 21 个嵌入资源完全一致；Hermes 字节码版本均为 99。
- 仅更新 `main.jsbundle`、Info.plist 构建号和 EXConstants 构建信息。其余 ZIP 内容、原生可执行文件与框架逐字节不变；文件权限与 ZIP 条目保留。
- IPA 11,334,675 字节，0.2.1／15，最低 iOS 16.4；ZIP、Mach-O 设备平台、ARM64、无加密／代码签名／描述文件和 Release 字节码通过。仍需用户自签。
- SHA-256：`c2f5cd48dbaf7b8c3b585cbb8226d6a77e9560decd5c824413db896197982daf`。
- 包装证明见 `releases/TJMuse-0.2.1-unsigned.ipa.resources.json`，可使用 `scripts/repack-ios-resources.py` 复核兼容前提。

## 源码与验证范围

源码 ZIP 排除本机工具、缓存、安装包、环境密钥与签名，打包时校验 CRC 并逐文件比对。产物校验值、测试结果及 iOS 包装方式记录在 `releases/build-info-0.2.1-build15.json`。

未使用真实学校账户验证此次登录或长时间续期，未在 iOS／Android 真机启动本轮安装包。表单及文件校验不能保证学校将来不改变登录页，也不能代替真机验证。验证码和二次验证仍由用户完成；App 挂起或关闭后不保证准点维护。使用步骤见[本机学号自动登录](LOCAL-LOGIN-0.2.1.md)。
