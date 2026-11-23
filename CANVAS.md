> 当前版本为 0.2.2：Canvas 采用同济 IAM 统一认证，作业改为打开／返回 App 自动同步，并新增周课表。见[更新日志](UPDATE-0.2.2.md)与[当前登录说明](LOCAL-LOGIN-0.2.2.md)。本文保留历史版本记录。

> 0.2.1 build 15 新增可选的本机学号密码自动登录，详见[设置步骤](LOCAL-LOGIN-0.2.1.md)。build 14 的会话维护机制继续保留，见[本机登录保活说明](CANVAS-SESSION-0.2.1.md)。

# 同济 Canvas 个人访问令牌接入

0.2.1 预览新增官方网页登录与隐藏 WebView 自动更换所选专用令牌。开启后，令牌管理会使用 `/profile/tokens/:id` 的 GET 和 PUT（`access_token[regenerate]=1`）；作业本身继续只读，原有手动令牌方式仍可使用。配置、维护周期和真实联调边界见 [0.2.1 预览说明](PREVIEW-0.2.1.md)。

当前 0.2.0（build 10）沿用用户在 Canvas 设置页生成个人访问令牌，再粘贴到 TJMuse。默认网址为 `https://canvas.tongji.edu.cn/`，移动端直接访问学校 API，无需部署 TJMuse 授权服务、OAuth Developer Key 或 client secret。

## 获取和填写令牌

1. 在 TJMuse 的“作业 → 连接 Canvas”确认学校网站地址，点击“打开 Canvas 令牌设置页”。默认打开 [同济 Canvas 用户设置](https://canvas.tongji.edu.cn/profile/settings)。
2. 在学校页面完成统一身份认证登录。页面实际入口名称为 **创建新访问许可证**，弹窗标题为 **生成访问许可证**。其他 Canvas 版本也可能称为“新访问令牌”或“New Access Token”。
3. 在“用途”中填写 TJMuse，在“过期”中设置有效期，点击 **生成令牌**。
4. 复制生成的令牌，返回 TJMuse，粘贴到“个人访问令牌”，点击 **验证令牌并同步**。
5. 连接成功后即可查看课程作业；在 App 可运行时于设备本地 00:00／12:00 自动触发一次；其他时间可手动同步。关闭或挂起应用时无法保证唤醒，错过不会在其他时段补同步。

已在用户授权登录的同济站点实际确认以上入口和表单。2026-10-29 经用户明确授权生成了用途为“TJMuse 0.1.2 连接测试”的临时令牌，有效期设置为 2026-10-30 23:59（北京时间）；仅使用 Bearer 令牌、不发送网页登录 Cookie，成功读取 4 门有作业课程的 19 份作业和截止时间。真实学生内容与令牌不包含在源码、安装包和验证报告中。

## 使用规则

- 学校地址可以修改，但必须为 HTTPS 根网址；令牌必须由对应 Canvas 站点生成。
- 连接时先验证账户并获取完整作业快照，全部成功后才替换已保存的令牌；验证失败保留原有连接与缓存。
- 更新同一 Canvas 账户的令牌时保留本地完成状态。切换站点或账户时重新建立该账户的缓存，防止不同账户之间混用状态。
- iOS／Android 令牌保存在系统安全存储中，不进入任务、聊天或普通本地数据。连接表单关闭或保存成功后清空输入；重新打开时不回填已保存令牌。
- 网页预览仅在内存中保留令牌，刷新后需重新填写；学校可能限制跨域请求。正式同步面向 iOS／Android，网页预览不代理或上传令牌。
- 令牌无效、过期、被撤销、无权限、限流、网络异常均显示对应提示，失败不覆盖已有完整缓存。
- “断开 Canvas”清除本机令牌和作业缓存。要在学校端撤销令牌，请回到 Canvas 用户设置，删除对应访问许可证；App 不自动撤销可能被其他工具共用的个人令牌。

## 作业显示

有截止时间的作业从开始日到截止日每天进入 To-do，包含首尾日期，按设备本地时区计算。开始优先采用当前用户的开放时间 `unlock_at`，缺失时使用 `created_at`；两者均缺失时采用保留的首次同步记录。旧缓存没有开始字段时先保留截止日显示，下次成功同步补全。

可在“作业”或“我的 → 作业显示设置”选择按时间穿插、置于顶部或底部。时间线排序：开始日按开始时间、中间日按 00:00、截止日按截止时间；同日开始并截止时按开始时间。卡片显示完整截止日期和时间，详情与作业页显示开始时间来源；各天共享完成状态。窗口不占满全部空闲时间，AI 只在窗口内安排实际工作。截止提醒仍只发送一次。无截止日期的作业默认保留在作业页，可逐项或全局开启在 To-do 显示；开启后从开始日起持续显示。

两页提供“已提交的作业”展开／折叠入口，默认展开，共用并保存选择；折叠时保留数量与统计。只折叠 Canvas 已提交状态，本机手动勾选与提交状态分别保存。

本地勾选不代替 Canvas 提交。所有作业都可在本机勾选或反选，包括已提交作业；手动选择优先于同步状态，并在同步、同账户更新令牌与重启后保留。AI 和提醒遵循本机完成状态，Canvas 提交状态仍独立展示与折叠。作业说明从 HTML 提取为纯文本，查看详情可打开学校原文。

提交判定检查实际提交证据，`graded` 仅表示评分状态，不再直接等同已提交；未提交、缺交或要求重交时保持未完成。升级后成功同步可修正旧缓存中的自动状态，不覆盖用户明确勾选／反选。

[Canvas 官方学生指南](https://community.instructure.com/en/kb/articles/661207-how-do-i-view-assignments-as-a-student)将“即将到来”定义为截止日期分类，TJMuse 对其中尚未实际提交的作业显示未完成，并允许手动修改本机勾选。

## 显示与本机删除（0.2.0）

“我的 → 作业显示设置”提供总开关、限时作业默认显示、隐藏无时间限制的作业三个选项。每项详情可选择“跟随默认／显示／隐藏”，单项优先于默认规则；总开关关闭时统一隐藏，重新开启后恢复单项选择。

“删除作业”移除本机列表、后续 AI 规划与提醒，独立的删除偏好在同步和重启后保留；作业页的“已经删除的作业”保留 72 小时并显示剩余时间，期间可以恢复。旧删除记录没有时间戳时，从升级起计时。开启“启用手动清空”后可确认提前清空；到期或清空时移除作业内容，只保留最小删除标记防止同步重新导入。前台到期触发清理；关闭或挂起 App 时，在下次运行时清理过期内容。没有向学校发出删除或修改请求。断开连接或切换账户会清除该连接的本机缓存和偏好。

显示选择只控制 To-do 和日历标记；作业截止通知独立控制。未删除的隐藏作业仍可供 AI 参考。已提交折叠偏好继续保留。

## 自动同步时点（0.2.0）

已移除启动、进页面、普通回前台和每 5 分钟自动读取。设备本地 00:00／12:00 所在分钟，应用可运行时每个时段最多自动尝试一次，时段标记持久化防止重启重复；失败不自动重试，其他时段不补同步。手动按钮和用户主动验证令牌的读取不受此限制。

iOS／Android 系统不保证关闭或挂起应用后准点联网，本版没有后台唤醒服务。要在其他时间更新缓存，请手动同步。已安排的本地截止通知与联网同步分别工作。

## API 与实现

读取端点只有：

```text
GET /api/v1/users/self/profile
GET /api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100
GET /api/v1/courses/:course_id/assignments?include[]=submission&per_page=100
Authorization: Bearer <个人访问令牌>
```

资料请求仅提取用户 ID，用于识别账户；不保存姓名、头像或个人日历订阅链接。按 `Link` 分页，分页仅允许在同一学校域名的 `/api/v1/` 内，拒绝跨站跳转和携带令牌的分页地址。每次同步全部成功后才更新缓存，保留未修改作业的本地完成状态。

实现位于 `src/core/canvas-api.ts`、`src/services/canvas.ts`、`src/state/store.tsx` 和 `src/screens/HomeworkScreen.tsx`。旧版 OAuth 服务已从当前源码移除，build 5 的完整源码保留在 `releases/archive/0.1.2-build5/`。

## 官方文档与适用范围

- [手动生成令牌、令牌保存与 Bearer 验证](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth#manual-token-generation)
- [Canvas 个人令牌管理指南](https://community.instructure.com/en/kb/articles/662901-how-do-i-manage-api-access-tokens-in-my-user-account)
- [用户资料 API](https://developerdocs.instructure.com/services/canvas/resources/users#method.profile.settings)
- [课程 API](https://developerdocs.instructure.com/services/canvas/resources/courses)
- [作业 API](https://developerdocs.instructure.com/services/canvas/resources/assignments)
- [提交 API：提交时间、缺交标记与重交状态](https://developerdocs.instructure.com/services/canvas/resources/submissions)
- [分页规则](https://developerdocs.instructure.com/services/canvas/basics/file.pagination)

Instructure 官方将手动令牌用于个人测试，并要求面向多个用户的应用使用 OAuth 获取授权。本版按用户要求实现个人令牌连接，适用于个人测试与学校允许的使用场景；公开向多用户发布前，应与学校确认接入规则并按要求采用 OAuth。个人令牌通常具有该账户的 API 权限，TJMuse 本身仅发出上述 GET 读取请求，不把令牌描述为受限的只读凭据。
