# TJMuse 0.2.1 build 13 验证记录

2026-10-30。版本 0.2.1，Android versionCode 与 iOS buildNumber 均为 13。

## 本轮变更与验证

- 修复课表 HTTP 回跳在导航回调之前被依赖库交给默认浏览器的问题。同济课表 HTTP 地址在当前 WebView 内升级至 HTTPS；其他不支持链接拦截，正常 HTTPS 登录和表单请求保留原生处理。
- 新窗口继续使用当前内置网页，沿用 iOS 原始请求加载，保留 POST 数据和 Cookie；关闭链接预览。
- 关于我们改为居中纯文字 Contributor qp338113，不含链接；版本与 OrstaLogic 版权保留。
- TypeScript 检查、84 项测试和三平台资源导出（13 条 Web 路由）通过。新增回归执行已安装 WebView 的真实导航包装器，复现旧配置外跳并确认修复；覆盖 HTTPS 表单、回跳编码和其他 URL 协议处理。
- 浏览器验证大写署名、居中、无链接和无页面异常。课表、折叠、主题及原有平台演示的完整回归记录保留于 [build 12 验证](VERIFICATION-0.2.1-build12.md)。
- 两平台内嵌 Release JS 均检查到 Contributor 大写及新的同页跳转脚本；WebView 原生组件存在。

## 产物

- Android：`TJMuse-0.2.1-arm64-v8a.apk`，36,067,617 字节，ARM64；版本 0.2.1／13，最低 API 24，target 36，compile 37。ZIP CRC、Release JS、v2 签名校验通过，沿用原发行证书。
- APK SHA-256：`79887c39c52b0722980958ebc9fadba8a25e43ee42cc6b1eda94c741cd7efddf`。
- 发行证书 SHA-256：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- iOS：`TJMuse-0.2.1-unsigned.ipa`，11,319,941 字节，iPhoneOS ARM64，最低 iOS 16.4，版本 0.2.1／13。ZIP、Info.plist、Mach-O 和 Release JS 校验通过，无加密、代码签名或预置描述文件，需用户自签。
- IPA SHA-256：`cb8b1c942d789ec5477cb2d4976ba6d4cc09efad02e814e77928a660ec96a095`，与云端打包日志一致。
- [iOS 云构建](https://expo.dev/accounts/qwertymi/projects/tjmuse/builds/71cc0919-007f-4085-91ee-13469ebd4579)完成于 2026-10-30T10:21:09.771Z。先前尚未交付、署名未改大写的构建已取消，未作为本次产物。
- 源码 ZIP 通过 CRC 和逐文件比对，排除真实凭据、工具链、缓存和安装包；包含修复说明与回归测试。大小和摘要见 releases/build-info-0.2.1-build13.json。
- 上一轮 build 12 原产物和记录已校验备份到 releases/archive/0.2.1-build12/。

## 实机复测

本轮在 Windows 上完成代码、依赖导航路径和构建验证，尚未在 iOS／Android 真机重跑学校登录。安装修复包后，从“课程表 → 加号 → 从同济1系统导入”重新登录，确认停留在 TJMuse 并读取、保存课表。浏览器回归和文件校验不替代实机验证。

详细原因、策略和验证边界见 [登录修复说明](FIX-0.2.1-ios-login.md)。
