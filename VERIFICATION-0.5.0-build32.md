# 0.5.0 build 32 验证记录

- 209 项自动化测试及 TypeScript 通过。
- 浏览器实际验证课程详情大按钮及作业详情删除按钮移除；四种短弹窗底部留白均为 12px。三个点编辑、保存取消、时间联动、启停恢复及两种课程删除范围通过。
- 普通短菜单采用内容高度的贴底面板；iOS 输入表单和原生日期选择仍由 SwiftUI 处理键盘。不能用浏览器结果替代 iPhone 原生呈现测试。
- Android 完整 Release 编译，发行签名不变，arm64-v8a，targetSdk 36，ZIP 校验通过。
- iOS 复用已验证的 build 29 原生程序，更新 Release Hermes 资源及主应用／Widget 扩展构建号；28 项原生输入匹配，29 个资源字节不变。本次未重新完整 Xcode 编译。现有原生 BottomSheetView／RNHostView／PresentationSizingModifier 实现存在。
- 后台认证及读取代码与 build 30 源码一致，本次没有重新采集登录信息或重新执行学校网站测试。
- **iPhone 安全区、键盘和手机后台登录仍未真机验证。**

详见 [修订说明](REPAIR-0.5.0-build32.md)。产物记录：`releases/build-info-0.5.0-build32.json`。
