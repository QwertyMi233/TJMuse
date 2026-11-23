> 当前版本为 0.2.2：Canvas 采用同济 IAM 统一认证，作业改为打开／返回 App 自动同步，并新增周课表。见[更新日志](UPDATE-0.2.2.md)与[当前登录说明](LOCAL-LOGIN-0.2.2.md)。本文保留历史版本记录。

# Canvas 自动保持登录 · 0.2.1 build 14

> 本文保留 build 14 的会话维护记录。当前 build 15 已增加可选的本机学号密码自动登录，默认关闭；开启需明确同意，凭据保存在系统安全存储中。好课也支持独立设置，详见[本机自动登录说明](LOCAL-LOGIN-0.2.1.md)。下文“不保存或自动填写密码”描述的是 build 14 的行为。

2026-10-31。显示版本保持 0.2.1。已有自动更换设置在升级后继续使用；首次启用时，请在 App 内完成一次学校官方登录，选择 TJMuse 专用令牌并启用自动更换。

## 使用

在“作业 → Canvas 自动更换令牌”中，可查看“自动保持登录已开启”和最近登录检查时间，或点击“立即检查登录状态”。“停止自动更换”同时停止自动保活。

App 启动和回到前台会检查登录状态，短时间重复切换有两分钟冷却。运行中约每十分钟维护一次；学校要求重新认证后减少为约三十分钟重试，回前台仍可重新检查。隐藏网页允许学校已有统一认证会话自行跳回 Canvas；确实需要密码或二次验证时，只提示用户重新登录，不保存或自动填写学校密码。

保活仅请求 Cookie 会话下的 `/api/v1/users/self/profile`，确认账户并更新网页登录会话，不读取作业、不导出 Cookie、不重新生成令牌。令牌仍按原十二小时／临近到期规则轮换，保活时间不会推迟令牌到期维护。作业自动同步继续仅在本地 00:00／12:00，手动同步保留。

使用原生 WebView 持久数据存储、共享 Cookie 与进程池，复用同一个 App 内官方登录留下的会话。浏览器 Safari／Edge 的登录状态不等于 App 内的登录状态。关闭或挂起 App 后不能保证准点保活；学校撤销会话、强制重新认证或令牌达到永久期限时仍需人工处理。

## 对照参考源码

本次重新检查 [qp338113/TJ-Class-Schedule](https://github.com/qp338113/TJ-Class-Schedule) 的：

- [CanvasWebSession.kt](https://github.com/qp338113/TJ-Class-Schedule/blob/main/packages/canvas_session_bridge/android/src/main/kotlin/icu/tjschedule/canvas_session/CanvasWebSession.kt)：复用原生 Cookie，隐藏网页执行维护，凭据先安全保存后验证。
- [notification_lifecycle.dart](https://github.com/qp338113/TJ-Class-Schedule/blob/main/lib/notifications/notification_lifecycle.dart)：启动与回前台维护连接。
- [task_sync_controller.dart](https://github.com/qp338113/TJ-Class-Schedule/blob/main/lib/application/task_sync_controller.dart)：Cookie 过期不等于 Bearer 令牌失效，网页登录维护失败后继续验证已保存凭据。

原项目这部分原生桥面向 Android；TJMuse 采用 iOS／Android 均可用的 React Native WebView 与系统安全存储。没有复制学校密码，也不通过开发者服务器中转。

## 错误与兼容

- 网页会话过期或临时网络错误不会阻断有效令牌读取作业；若令牌也失效，则保留缓存并提示错误。
- 账户、令牌归属、权限改变或安全提交失败仍会阻止同步；一次成功的网页检查不能解除这类保护或永久期限限制。
- 维护和同步共享正在执行的维护任务，避免换令牌时读到旧值。
- 保活成功时间、尝试时间和状态独立持久保存，不保存 Cookie／令牌到普通 App 数据。
- 不清空原有任务、课表、作业完成状态或聊天记录；Contributor 署名与此前登录跳转修复保留。

## 验证范围

TypeScript、90 项核心测试及三平台资源导出通过。新增测试实际执行注入脚本，覆盖只读 Cookie 请求、外部来源、账户变化、登录与网络异常、启动／回前台冷却、轮换计时独立、有效令牌回退、敏感错误保护及重启恢复。浏览器演示用于验证设置入口，不使用真实学校账户。

本轮没有在 iOS／Android 真机验证真实学校长时间登录、挂起恢复或服务端会话期限。浏览器模拟和安装包校验不能保证学校永远不要求重新认证。
