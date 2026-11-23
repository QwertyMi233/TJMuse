# 0.1.2 验证记录（build 6）

日期：2026-10-29。显示版本保持 0.1.2，Android versionCode 和 iOS buildNumber 提升至 6。

## 真实同济 Canvas 验证

- 用户在可见的独立 Edge 窗口中完成学校统一身份认证；已确认 `/profile/settings` 的“创建新访问许可证”入口及“生成访问许可证”表单。
- 经用户明确授权生成用途为“TJMuse 0.1.2 连接测试”的临时令牌，过期时间为 2026-10-30 23:59（北京时间）。
- 实际调用与 App 共用的 API 客户端，网络通过学校页面中的 Fetch 传输：只附加 `Authorization: Bearer`，`credentials: omit`，未使用登录 Cookie；成功读取 19 份作业，来自 4 门有作业的课程，均含截止时间。
- 账户资料、课程和作业只读读取成功；实际使用当前用户适用的截止日期和提交状态。没有提交、修改或删除作业。
- 测试令牌和学生作业明细仅在测试进程内存中使用；报告只记录数量，未写入源码与安装包。
- Windows Node 自带 Fetch 在此网络环境未连接成功；上述实测使用浏览器 HTTPS 网络。尚未在 iOS／Android 实机验证该学校网络连接。

## 自动验证

- TypeScript 类型检查。
- 34 项自动测试：原有任务、跨天、循环、迁移、AI；新增个人令牌输入、账户识别、只读请求、分页、HTML 提取、权限／限流／令牌失效、跨站阻止、取消、部分失败，以及旧 OAuth 缓存迁移。
- iOS／Android／Web 资源导出通过。
- 浏览器交互回归通过：真实表单路径的令牌输入／校验、失败不替换旧连接、保存后输入清空、三种作业排序、完成状态同步保留、失败保留缓存、刷新恢复。令牌未进入浏览器本地持久数据；网页无 JavaScript 异常。
- 原有日期滑动、左右箭头和 AI 添加小事去重回归通过，320／393／768 宽度无横向溢出。
- 同一账户更新令牌保留勾选；更换账户清除混用状态；断开连接后令牌和作业缓存清除，普通任务仍保留。确认操作放在同一设置面板内，修复了叠加弹窗无法点击的问题。
- 原有完整界面回归和跨天、起止时间、时长互换、子任务、循环实例完成状态回归均通过。

## 构建产物

- Android Release APK：`TJMuse-0.1.2-arm64-v8a.apk`，35,682,428 字节，ARM64；包名 `com.tjmuse.app`，versionName `0.1.2`、versionCode `6`，最低 API 24、target API 36、compile API 37。
- APK 签名校验通过（v2），证书与上一版相同，证书 SHA-256 为 `76b0fe38d4c1660364a4a21d73e6018267a10caf680204d11b822e76b64fc94a`。
- iOS 未签名 IPA：`TJMuse-0.1.2-unsigned.ipa`，11,156,193 字节；版本 `0.1.2`、build `6`，最低 iOS 16.4；已验证 ZIP、Info.plist、iPhoneOS ARM64 Mach-O、嵌入 JS。无加密、无代码签名、无预置描述文件，仍需用户自签后安装。
- [iOS 云构建记录](https://expo.dev/accounts/qwertymi/projects/tjmuse/builds/33feb9ce-3f79-42f3-9f86-91188a241c41)：`FINISHED`；本机 IPA SHA-256 与云端打包日志一致。
- APK SHA-256：`21a689e8656c56ccb0f9d049e09c5de4e46356affe2db62e958f40b59b199956`。
- IPA SHA-256：`3f3881929ce9ee451f821f92e105e18d3ae9f040255c5bd3025868c2ae690e07`。
- 较早的同名 0.1.2（build 5）文件已复制并核对至 `releases/archive/0.1.2-build5/`；当前完整元数据为 `releases/build-info-0.1.2-build6.json`。
- 源码 ZIP 通过 `scripts/package-source.py` 逐文件比对和 ZIP CRC 校验，包含个人令牌接入源码与使用说明，排除实际密钥、本机依赖与工具链。

## 实机待验证

学校网络在移动端的可达性、系统安全存储、通知送达、覆盖升级，以及原生日期手势和视觉效果仍需安装验证。网页登录和 API 实测不代替完整移动端实机测试。
