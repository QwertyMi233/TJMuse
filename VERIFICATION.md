# 0.1.0 验证记录

日期：2026-10-27。环境：Windows、Node.js 24.22.1、Expo SDK 58。

## 已通过

- `tsc --noEmit`：应用、Web 平台文件和测试类型检查通过。
- `expo install --check`：依赖与当前 Expo SDK 匹配。
- 11 项自动测试：本地日期与夏令时边界、跨年周视图、一次性任务排序、按日与周间隔循环、月末与闰日、完成状态隔离、提醒筛选与数量上限、调休日期、AI 上下文、接口地址规范化、API 成功/认证失败/空输出。
- `expo export --platform all`：iOS / Android Hermes JavaScript 资源和 Web 静态路由均打包成功。
- `expo prebuild --no-install --platform android`：原生配置生成成功；已确认 AppTheme 继承 Material 3，应用图标与安全存储、通知、照片、日期选择器插件已应用。
- Android Release 安装包已成功编译：`releases/TJMuse-0.1.0-arm64-v8a.apk`，35,402,020 字节。`apksigner verify --verbose --print-certs` 校验通过，使用独立 RSA-2048 发行签名和 APK v2 签名。
- `aapt dump badging` 已确认：包名 `com.tjmuse.app`、版本 `0.1.0` / versionCode 1、最低 API 24、目标 API 36、ARM64 架构、入口 `MainActivity`，未发现 debuggable 标记。
- APK SHA-256：`f6d5e3c1f224780e81dbbe2985b8e6a407580c9d125097abf89074bcfda3c359`。
- 已修复 Windows 原生打包兼容性：项目内工具链、SDK 安装登记、hoisted 依赖布局、CMake 生成对象的短路径与独立发行签名。构建步骤见 `BUILDING.md`。
- iOS 未签名 IPA 已在 EAS macOS 云端完成 Release 真机归档，构建 ID `a8bc2567-08e5-4e2e-ab17-ddf2754e304c`，产物 `releases/TJMuse-0.1.0-unsigned.ipa`，11,019,702 字节。
- IPA 校验通过：ZIP CRC 完整性、`com.tjmuse.app` / `0.1.0` / build 1、最低 iOS 16.4、真实 iPhoneOS ARM64 Mach-O（非模拟器）、无加密、无签名载入命令、无 Apple provisioning profile，包含 3,075,942 字节的 Release JS bundle。
- IPA SHA-256 为 `88904713c04334e0a0faefa12ad62d8593a811efc56bd16e2619e35fa084cb4d`，本地下载文件与云端归档脚本记录一致。校验脚本为 `scripts/verify-ipa.py`。
- Microsoft Edge + Playwright 手机尺寸回归：新建 8 项任务、子任务完成、主任务完成、编辑边框、刷新后恢复、周切换、回到今天、添加自由事项、配置自定义 API、自动生成规划与追问、修改周起始日和昵称、作业占位页、每两天循环与完成状态隔离。
- 320 / 393 / 768 像素宽度无页面横向溢出；浏览器回归无 JavaScript 页面异常。

浏览器回归脚本：`scripts/qa.cjs`。需要 Playwright 与 Microsoft Edge；可通过 `PLAYWRIGHT_MODULE` 指定已有模块路径，`PLAYWRIGHT_CHANNEL` 指定浏览器渠道。截图输出到忽略提交的 `artifacts/`。测试使用独立临时浏览器上下文与模拟 API，测试任务不会写入新用户的 App。

## 待真实设备验证

- Android APK 与 iOS 未签名 IPA 均已实际生成并校验。Windows 本机完成 Android 构建，iOS 通过用户授权的 Expo 项目在 macOS 云端完成。安装后运行、通知、相册与玻璃视觉仍需真机验证。
- 真机的系统 Liquid Glass、Material 选取器、相册访问、Keychain / Keystore、安全区、键盘与本地提醒送达仍需安装构建后检查。
- 用户没有提供真实 API Key，网络模型请求采用自动化模拟响应，真实模型可用性和计费账户状态未验证。
- 调休网络更新保留缓存和失败提示；内置 2026 日期经过公告核对，其他年份取决于对应数据是否已经发布及网络可达性。
