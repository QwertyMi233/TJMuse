# 0.2.1：课表登录跳出默认浏览器修复

对应内部构建号 13，显示版本仍为 0.2.1。

## 问题与原因

iOS 实机反馈：导入同济课表时跳转至默认浏览器，App 内的课表读取流程中断。

旧配置只在 `originWhitelist` 中允许 HTTPS。已安装的 `react-native-webview` 14.0.1 会先检查这个列表；遇到未匹配的 HTTP 地址，会直接调用 `Linking.openURL`，不会再执行 TJMuse 的导航回调。因此，回调里原有的同济 HTTP → HTTPS 修正实际无法运行。这一行为可通过直接调用依赖包的真实导航包装器复现。

参考项目也对 `http://1.tongji.edu.cn` 登录回跳做了协议升级。依赖库关于未匹配地址的说明见 [originWhitelist 文档](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md#originwhitelist)；新窗口行为同时核对了当前安装版本的 `apple/RNCWebViewImpl.m`。

## 修复

- 所有 URL 先进入 App 自己的导航策略，阻止 WebView 提前交给系统浏览器。策略继续允许正常 HTTPS 登录、表单和回跳。
- 仅将同济课表默认端口的 HTTP 地址升级到 HTTPS，在原来的 WebView 内跳转，保留路径、编码参数和登录会话。
- 其他 HTTP、外部应用协议和本地文件链接由 App 拦截，不自动打开外部应用；没有关闭 TLS 或增加 HTTP 加载例外。
- 允许登录网页创建新窗口。iOS 沿用原生的“将原始请求加载到当前 WebView”处理，不设置会丢失 POST 数据的 URL-only 新窗口回调；Android 继续关闭多窗口支持，使用当前内置网页。
- 关闭网页链接预览，避免登录时误进入外部预览。

没有改变课表解析、保存、学期、显隐、主题或用户资料，也没有保存学校密码。

## 验证

- TypeScript 检查通过；84 项测试通过。
- 新增回归直接执行已安装依赖的真实导航包装器：旧配置会打开外部浏览器，新配置会在 App 内生成 HTTPS 跳转；其他不支持协议不会调用 `Linking.openURL`。
- HTTPS 统一认证与表单请求继续由原生 WebView 原样加载，不在 JS 中重新构造 POST 请求；同济回跳的编码参数保持不变。
- iOS／Android／Web 资源导出通过，包含 13 条 Web 路由。

本轮在 Windows 上完成代码、依赖导航路径和构建验证，尚未完成 iOS／Android 真机复测。安装修复包后，请从“课程表 → 加号 → 从同济1系统导入”重新登录，确认整个过程停留在 TJMuse，登录后读取并保存课表。
