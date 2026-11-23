# TJMuse 桌面小组件

0.5.0 提供名为 **TJMuse · 今日安排** 的桌面组件。iOS 使用 `systemLarge`（4×4），Android 默认占 4×4 网格，可由桌面调整尺寸。

长按桌面，选择添加小组件，在 TJMuse 中选择“今日安排”。先打开一次 TJMuse，使组件获得本机日程快照。

组件顶部显示教学周、星期和日期。课程与 To-do 按时间排序，作业放到最后。已完成事项及已过结束时间的事项不显示；无截止时间的作业遵循作业显示设置。最多显示六项，超出部分显示数量，完整列表在 App 内查看。

## 刷新与离线

应用在日程、课程启用状态、作业或语言变化后，生成未来七天的本地显示快照。iOS 提交在事项结束和午夜切换的时间线；Android 保存快照，并以原生闹钟在这些边界请求重新绘制。七天后快照清空，重新打开 App 可更新。

0.5.2 在读取本机日程后立即发布，并在返回前台及进入后台时重发最新快照，不依赖任务发生更改；对话或其他无关数据变化不再推迟刷新。iOS 写入后核对时间线，无法访问共享目录或写入失败时在 App 提示原因。小组件显示“打开 App 同步”属于初始占位内容，与“今天暂无剩余安排”不同。

刷新由系统调度，省电、待机与系统刷新预算可能使刷新延后。关闭 App 不依赖隐藏浏览器来刷新组件；组件不会访问学校或 AI 服务。快照仅包含显示所需的标题、位置、时间与日期，不包含密码、令牌、API Key 或完整作业说明。

## iOS 自签

未签名 IPA 内含主应用 `com.tjmuse.app` 及小组件扩展 `com.tjmuse.app.widgets`。重新签名时，需要同时签名主应用与扩展，并将二者配置到同一个有效 App Group，项目默认值为 `group.com.tjmuse.app`。若更改包名或 App Group，需同步修改 `app.json` 中的 `expo-widgets` 配置并重新编译。

只签主应用、删除扩展或去掉 App Group 权限，可能仍可打开应用，但无法使用小组件。Windows 编译和浏览器演示无法验证 iPhone 桌面实际安装与系统刷新时机。

## 实现依据

- [Expo Widgets：平台尺寸、时间线及 Android 支持范围](https://docs.expo.dev/versions/v58.0.0/sdk/widgets/)
- [Apple：保持 WidgetKit 内容更新](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)
- [Android：AppWidgetProviderInfo 网格尺寸](https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo)

组件使用 Expo Widgets 原生扩展。Android 的边界刷新由项目内 `modules/agenda-refresh` 实现。首页、每日计划与组件共用核心日程投影，并各自使用对应的筛选规则。
