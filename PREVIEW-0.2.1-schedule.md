> 当前版本为 0.2.2：Canvas 采用同济 IAM 统一认证，作业改为打开／返回 App 自动同步，并新增周课表。见[更新日志](UPDATE-0.2.2.md)与[当前登录说明](LOCAL-LOGIN-0.2.2.md)。本文保留历史版本记录。

# TJMuse 0.2.1：课表与外观修订

2026-10-31。显示版本仍为 **0.2.1**，当前内部构建号为 **15**。本轮增加[好课和 Canvas 本机学号自动登录](LOCAL-LOGIN-0.2.1.md)，此前课表、排版、外观、登录跳转修复、Canvas 保活及 Contributor 大写署名保留。APK／未签名 IPA／源码 ZIP 已更新；本轮 IPA 复用 build 14 原生包并更新 Release 资源，未重新进行 Xcode 编译。见[验证记录](VERIFICATION-0.2.1-build15.md)。

## 本机演示

运行 `node scripts/serve-preview.mjs` 后打开 [交互演示](http://127.0.0.1:8081/?demo=021)。示例数据使用独立存储，不读取学校账户，也不覆盖正常模式的数据。已经打开过演示时，可先点击顶部“重置演示”。

1. 点击第二栏“课程表”。页面保持空白，右下角加号打开“课表管理”。
2. 点击“从同济1系统导入”，进入示例课表预览。修改课表名称，核对学期第一周、每周第一天、单／双周和节次时间；不需要的课程可以取消勾选。
3. 保存后返回 To-do，查看当天课程。重复导入可保存多份课表，在管理菜单分别勾选显示／隐藏、编辑或删除。每份课表独立保存学期和节次。
4. 在“我的 → 首页排版”切换“按时间穿插／按分类显示”。分类模式下，课程、作业、To-do 分别折叠，每类已勾选任务也可独立折叠；选择在重启后保留。
5. 在“我的 → 主题颜色”选择跟随系统或固定浅色／深色，分别编辑两套配色。深色模式的按钮、图标和卡片具有柔和发光效果。
6. “关于我们”居中显示版本、OrstaLogic 版权和纯文字 `Contributor qp338113`；署名没有跳转链接。

截图总览：`artifacts/TJMuse-0.2.1-schedule-preview.html`。

## 正式移动端课表导入

参考 [qp338113/TJ-Class-Schedule](https://github.com/qp338113/TJ-Class-Schedule) 的 [课表网页抓取](https://github.com/qp338113/TJ-Class-Schedule/blob/main/lib/presentation/tongji_timetable_page.dart)、[课程解析](https://github.com/qp338113/TJ-Class-Schedule/blob/main/lib/import/tongji_timetable_import.dart)及 [节次时间](https://github.com/qp338113/TJ-Class-Schedule/blob/main/lib/import/term_import.dart)。沿用其 MIT 许可，完整版权见 [第三方声明](THIRD_PARTY_NOTICES.md)。

App 在官方 WebView 打开 `https://1.tongji.edu.cn/GraduateStudentTimeTable`。用户完成统一认证、选定学期并显示完整个人课表后，点击“读取当前个人课表”。默认桌面布局，可切换手机网页。只读取“学生课表”到“已选课程列表”之间的课程卡片和排课浮层，不读取密码、Cookie 或访问令牌。课表保存前必须经过预览确认。

解析保留每门课的星期、节次、地点、教师和实际周次，支持不连续周次、单／双周、本科及研究生排课文本。浮层与原格子的星期／节次匹配后才覆盖，避免上一格浮层串入。无法可靠识别的记录会跳过并在预览提示。默认节次来自参考项目，用户可按当期学校安排修改。

已启用课表的课程按各自学期周次加入首页、AI 固定时间上下文和课程提醒。隐藏课表同时停止这些展示和未来提醒；删除课表不影响独立 To-do 或平台作业。课程没有完成 Checkbox。课程表网格继续留待后续开发。

## 外观与兼容

- 浅色默认：前景 `#123B64`，背景 `#FFFFFF`，强调色 `#0066B3`。
- 深色默认：前景 `#F2F6FC`，背景 `#111D2D`，强调色 `#0066B3`。
- 默认跟随系统；旧版自定义配色迁移至对应模式，不覆盖用户颜色。两套配色可分别修改或恢复。
- 旧的作业位置入口从作业页和作业显示菜单移除，改用“我的 → 首页排版”统一管理课程、作业、To-do。
- 原有任务、作业勾选、删除记录、平台连接与对话保留。

## 验证范围

已通过 TypeScript 检查、90 项核心测试及 iOS／Android／Web 资源导出（13 条 Web 路由）。浏览器回归覆盖多课表导入、显隐和重启、课程详情、分类与已完成任务独立折叠、系统／手动主题、两套配色、深色发光、无链接署名和 320／393／768 像素布局；没有页面 JavaScript 异常。原有好课、Canvas 和作业操作演示回归也通过。

另以模拟官方网页运行实际 DOM 抓取和悬浮脚本，验证区域限定、节次识别、排课浮层与周次解析。上述演示与模拟网页均未请求学校平台。本轮尚未在手机上完成真实统一认证、实际账户课表和原生 WebView 联调，需在后续安装包中验证；演示不能替代该项验证。

检查命令：`node node_modules/typescript/bin/tsc --noEmit`、`node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`、`node scripts/qa-schedule-theme.cjs`、`node scripts/qa-v021.cjs`。浏览器脚本需要 Playwright 与 Edge；可通过 `PLAYWRIGHT_MODULE` 指定本机 Playwright 模块路径。
