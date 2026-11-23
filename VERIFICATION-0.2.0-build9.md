# 0.2.0 修订验证（build 9）

日期：2026-10-29。显示版本保持 0.2.0，Android versionCode 和 iOS buildNumber 为 9。

## 修复

- 二级菜单共用遮罩由半透明蓝色改为轻度中性黑色，取消整层从底部滑入，改为淡入／淡出。避免进场时出现半屏蓝色块及背景偏色。
- 设置改为明确的“隐藏无时间限制的作业”开关。底层“无截止默认显示”为 false 时，隐藏开关显示开启；首次使用或缺失旧设置时默认开启。保存过的用户选择及单项显示／隐藏选择保留。
- 面板继续按实际内容高度展示，长内容可滚动；显示版本与 OrstaLogic 版权信息保持。

## 验证

- TypeScript 检查及 iOS／Android／Web 资源导出通过。
- 47 项核心自动测试通过。
- `scripts/qa-v020.cjs` 通过：首次打开隐藏开关为开启，关闭后可按默认规则显示无截止作业；单项／全局规则、删除恢复、通知时长、内容尺寸、版权版本、同步时点和重启防重复仍工作。
- 浏览器截图人工检查：弹窗后方为中性浅灰色，面板紧贴内容，无蓝色遮罩；320／393／768 宽度无横向溢出，无页面 JavaScript 异常。

## 构建产物

- Android Release：`TJMuse-0.2.0-arm64-v8a.apk`，35,699,708 字节，ARM64；包名 `com.tjmuse.app`，versionName `0.2.0`、versionCode `9`，最低 API 24、target API 36、compile API 37。
- APK 签名验证通过（v2），沿用原有发行证书，证书 SHA-256：`76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- iOS 未签名 IPA：`TJMuse-0.2.0-unsigned.ipa`，11,166,511 字节；版本 `0.2.0`、build `9`，最低 iOS 16.4。ZIP、Info.plist、iPhoneOS ARM64 Mach-O 与嵌入 JS 均通过检查；无加密、代码签名或预置描述文件，需用户自签后安装。
- [iOS 云构建记录](https://expo.dev/accounts/qwertymi/projects/tjmuse/builds/92c3d79b-796a-41b3-b56c-4a14b37192e0)已完成；本地 IPA 校验值与云端打包日志一致。
- APK SHA-256：`6189d3eb72bfd7c35069affaa650cfdc1151b055ba7447ead01332d55c870295`。
- IPA SHA-256：`26db052787a2e5804524cb9fe040c9915d565f9b7eb959ce2b8c8f5a0f7f1210`。
- 0.2.0 build 8 文件保留在 `releases/archive/0.2.0-build8/`，当前完整元数据为 `releases/build-info-0.2.0-build9.json`。
- 源码 ZIP 使用 `scripts/package-source.py` 逐文件比对并校验 CRC，包含代码、资源、文档与锁文件，排除密钥、工具链、依赖和安装包。

## 待实机复测

iOS／Android 原生淡入动画、键盘与安全区域仍需安装复测。截图由浏览器生成，不能代替手机上的动画检查。同步保持前台 00:00／12:00 规则，挂起或关闭 App 后不保证执行；其他功能边界见 [build 8 验证记录](VERIFICATION-0.2.0-build8.md)。
