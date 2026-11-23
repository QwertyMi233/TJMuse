# 0.1.2 验证记录（build 5）

日期：2026-10-29。版本 0.1.2，Android versionCode 和 iOS buildNumber 为 5。

## 已验证

- TypeScript 类型检查与 iOS／Android／Web 资源导出。
- 29 项自动测试通过，包含原有日期、循环、跨天、迁移和 API 测试，以及作业三种排序、截止日期、无截止时间、AI 工具参数／数量／去重／未授权操作。
- 模拟 Canvas 服务测试通过：OAuth 跳转、状态校验、一次性票据与校验值绑定、加密会话、作业分页、HTML 文本提取、跨域分页阻止；对 Canvas 数据 API 仅发出 GET。
- 浏览器模拟 OAuth 完整连接后能同步作业；本地完成状态在刷新同步后保留；同步失败不清空缓存；网页刷新后缓存与排序仍可恢复，令牌不进入本地持久数据。
- 鼠标拖动日期条可前后切周，左右箭头仍工作；日期、月份和学期周次同步更新。
- 模型工具调用能添加“阅读 10 页”，再次请求不重复创建。自动规划保持只读。
- 完整界面回归和跨天回归通过，包括任务起止时间、持续分钟数、完成状态与旧版记录。
- 320／393／768 宽度无页面横向溢出；无浏览器 JavaScript 页面异常。
- SVG 源图标和 PNG 输出已重新生成，iOS 图标为不透明 1024×1024，Android 前景保持透明背景。

脚本：`scripts/qa-v012.cjs`、`scripts/qa.cjs`、`scripts/qa-cross-day.cjs` 与 `scripts/render-icons.cjs`。

## 构建产物

- Android Release APK：`TJMuse-0.1.2-arm64-v8a.apk`，35,734,319 字节，ARM64；包名 `com.tjmuse.app`，versionName `0.1.2`、versionCode `5`，最低 API 24、target API 36、compile API 37。
- APK 签名校验通过（v2），证书与上一版相同，证书 SHA-256 为 `76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- iOS 未签名 IPA：`TJMuse-0.1.2-unsigned.ipa`，11,208,050 字节；版本 `0.1.2`、build `5`，最低 iOS 16.4；已验证 ZIP、Info.plist、iPhoneOS ARM64 Mach-O、嵌入 JS。无加密、无代码签名、无预置描述文件，仍需用户自签后安装。
- [iOS 云构建记录](https://expo.dev/accounts/qwertymi/projects/tjmuse/builds/8fbb99f6-7f82-4676-97e4-885d3a90e0ef)：`FINISHED`；本机 IPA SHA-256 与云端打包日志一致。
- APK SHA-256：`32dfc480c36612fa1ef7bd07732078f0130b8576a5d279ea5a2b117a8fdc451a`。
- IPA SHA-256：`a35fb826a35a8da7173d886d96b3954de9ab7cb36c4e9ef3e2aa7a30c6d4857f`。
- 较早的同名 0.1.2（build 3）文件已复制并核对至 `releases/archive/0.1.2-build3/`；当前完整元数据为 `releases/build-info-0.1.2-build5.json`。
- 源码 ZIP 通过 `scripts/package-source.py` 逐文件比对和 ZIP CRC 校验，包含 Canvas 服务与 `.env.example`，排除实际密钥、本机依赖与工具链。

## 待实际环境验证

- 本次没有使用真实学校密钥或课程数据；用户将在本机配置已有 OAuth 凭据和服务地址。服务端未由本次任务部署到外部环境。
- 真实学校 OAuth／SSO、令牌刷新、接口权限、实际作业和个人截止日期需要配置后联调。
- iOS／Android 实机的日期手势、原生授权浏览器、系统提醒和覆盖升级仍需复测。Web 自动化与文件校验不能代替实机验证。
