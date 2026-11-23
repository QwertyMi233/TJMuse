# 安装包构建

2026-11-23 已将项目 Logo 和图标资源换为用户提供的蓝色 J 勾选图案，版本号不变，已交付的 build 37 安装包保留原文件。下一次打包需完整编译原生图标资源；iOS 不能仅替换 JavaScript 资源来更新桌面图标。原图为 `assets/logo.png`，使用 `scripts/render-icons.cjs` 生成各尺寸。

当前源码为 **0.5.2（内部构建号 39）**。按用户要求只回退显示版本并重试 iOS 云构建，内部构建号递增，保留所有修复及新 Logo。构建结果见 [本次验证记录](VERIFICATION-0.5.2-build39.md)。

降版本后已实际重新提交，Expo 仍以账户本月免费 iOS 构建额度用尽拒绝创建构建，提示于 2026-12-01 恢复；本次没有生成新 IPA。Android 工程配置及网页预览已同步版本，本次不重编 Android 安装包。

历史 build 38 的 Android 安装包为 0.5.3，已有文件不改写。该次 iOS 源码上传已获用户授权，但 Expo 因账户免费 iOS 构建额度用尽拒绝创建构建，提示于 2026-12-01 恢复。未升级付费套餐。新 Logo 仍需完整原生编译。

以下旧版构建记录保留作历史参考，重建时以当前源码版本和文件名为准。

本次尝试使用内部构建号 `39`。若修改智学盟说明清理或平台会话失效判定函数，先运行 `node scripts/build-webview-helpers.mjs` 生成 WebView 脚本文本，再运行 `node scripts/build-native-reader.cjs`，随后运行 `pnpm check`；Hermes 环境不能依赖 `Function.toString()` 还原源码。

0.2.1 历史构建为内部构建号 15，脚本按源码版本输出 `TJMuse-0.2.1-arm64-v8a.apk` 与 `TJMuse-0.2.1-unsigned.ipa`。Android 已完整编译；iOS 因云构建额度用完，本轮复用 build 14 原生包并更新 Release 资源，未重新进行 Xcode 编译。校验结果见[验证记录](VERIFICATION-0.2.1-build15.md)。以下 0.2.0 内容保留为历史构建步骤，命令中的版本文件名应改为当前版本。

本项目输出 Android Release APK 与 iPhone arm64 未签名 IPA。APKM 是拆分 APK 的容器；这里优先使用可直接安装、不依赖容器安装器的 APK。

0.2.0 历史构建对应产物为 `releases/TJMuse-0.2.0-arm64-v8a.apk` 与 `releases/TJMuse-0.2.0-unsigned.ipa`。Android 沿用 0.1.0 的独立发行签名，versionCode 为 10；iOS 为真实 iPhoneOS ARM64 的未签名 Release 归档，buildNumber 为 10，需用户自签后安装，最低 iOS 16.4。实际校验结果见 [本版验证记录](VERIFICATION-0.2.0-build10.md)。

Canvas 使用个人访问令牌由移动端直接读取，无需部署服务端；连接方法和实测范围见 [CANVAS.md](CANVAS.md)。

## Android · 本机 Windows

项目目录里的 `.build-tools/` 保存独立 JDK、Android SDK / NDK / CMake、Gradle 缓存和本地发行签名，不修改系统 Java 或 Android SDK 的全局配置。

Windows 必须保留 `pnpm-workspace.yaml` 的 `nodeLinker: hoisted`。`scripts/android-signing.gradle` 会为本机原生生成代码启用短路径，防止 CMake / Ninja 的 Windows 路径长度限制。

```powershell
node scripts/bootstrap-android.mjs --sdk
node node_modules/expo/bin/cli prebuild --no-install --platform android
./scripts/build-android.ps1
```

默认编译 `arm64-v8a`，适用于采用 ARM64 处理器的 Android 手机。可以用 `-Architecture 'arm64-v8a,armeabi-v7a,x86,x86_64'` 生成包含多个架构的安装包，但编译时间和体积更大。

脚本按 `package.json` 版本命名输出，当前为 `releases/TJMuse-0.2.0-arm64-v8a.apk` 和 SHA-256 文件。输出前会检查 Gradle 构建退出码。发行签名和密码保存在忽略上传的 `.build-tools/signing/`；后续版本沿用这一目录，保持升级签名一致。请单独备份，不要发送到聊天中。

如果 Gradle 官方下载站无法连接，可下载官方 9.4.1 分发包并校验 SHA-256，再解压到 `.build-tools/gradle/gradle-9.4.1/`。本地脚本会优先使用它。官方分发包 SHA-256 为 `2ab2958f2a1e51120c326cad6f385153bb11ee93b3c216c5fccebfdfbb7ec6cb`，可在 [Gradle 官方校验文件](https://services.gradle.org/distributions/gradle-9.4.1-bin.zip.sha256)核对。

## iOS · 未签名 IPA

这是 iPhone 真机 arm64 构建，供用户使用自己的自签工具重新签名。未签名文件不能直接安装。生成二进制仍需要 macOS 和 Xcode；Windows 可使用 GitHub Actions 或 EAS 的 macOS 云构建。

### GitHub Actions 云构建

工作流为 `.github/workflows/ios-unsigned.yml`，使用 GitHub 托管的 `xcode-27` ARM64 Mac，并选择 Xcode 27.1。它从锁文件安装依赖、运行类型检查和测试、生成 iOS 工程、安装 CocoaPods 依赖，再调用现有脚本完整执行 Release 真机编译。工作流不需要 Expo 登录，也不需要 Apple 签名证书；不会发布 App Store 或创建 GitHub Release。

将经过检查的源码上传到用户选定的仓库后，推送 `codex/ios-*` 分支会触发构建；也可在已有此工作流的分支上通过 Actions → Build unsigned iPhone IPA → Run workflow 手动启动。上传前须确认仓库可见性；公开仓库会公开源码。

成功后在运行页面的 Artifacts 下载 `TJMuse-iPhone-unsigned-<运行编号>`，其中包含当前版本的 IPA、SHA-256、IPA 验证结果及源码提交信息。当前源码输出为 `TJMuse-0.5.2-unsigned.ipa`（build 39）。日志单独保存 7 天。只有云端编译和产物校验实际通过后，才能将本次状态记为成功；添加配置不代表已生成安装包。

GitHub 托管运行器的可用性和计费由 GitHub 账户及仓库设置决定。流程不主动升级套餐或设置付费额度。

### EAS 云构建

在本机登录自己的 Expo 账户并关联项目后运行：

```sh
eas login --device
eas init
eas build --platform ios --profile ios-unsigned
```

当前 Windows 工程也提供独立的 EAS 包装脚本：`./scripts/eas.ps1 login --device`、`./scripts/eas.ps1 init`、`./scripts/eas.ps1 build --platform ios --profile ios-unsigned`。它使用项目目录的 CLI 与缓存。

项目没有 Git 仓库时，可以设置 `EAS_NO_VCS=1` 与 `EAS_PROJECT_ROOT` 指向工程目录。上传文件使用 `.easignore` 排除工具、缓存、签名、环境文件和构建产物。

`ios-unsigned` 配置不需要 Apple 签名凭据；使用 `.eas/build/ios-unsigned.yml` 调用 `scripts/build-ios-unsigned.sh`，执行 Release 真机 archive 并用标准 `Payload/TJMuse.app` 结构生成 IPA。脚本验证可执行文件包含 arm64，检查 ZIP 完整性并计算 SHA-256。

EAS 使用账户可用的云构建配额，无法登录或配额不可用时不能提交任务；不会自动购买额度或升级套餐。

### 自己的 Mac

```sh
pnpm install
pnpm exec expo prebuild --platform ios --no-install
cd ios
pod install
cd ..
bash scripts/build-ios-unsigned.sh
```

输出按 `package.json` 版本命名，当前为 `releases/TJMuse-0.2.0-unsigned.ipa`。修改版本时同步更新 `.eas/build/ios-unsigned.yml` 的上传路径。

## 构建后验证

- APK：用 Android SDK `apksigner verify --verbose --print-certs` 验证签名，用 `aapt dump badging` 核对包名 `com.tjmuse.app`、版本 `0.2.0` / versionCode 10、SDK 与处理器架构。
- IPA：校验压缩包完整性、`Payload/TJMuse.app/Info.plist`、真实 arm64 Mach-O 程序和嵌入 JS 资源；自签和安装后再验证通知、照片权限与 Liquid Glass。

可以运行 `python scripts/verify-ipa.py releases/TJMuse-0.2.0-unsigned.ipa` 重做 IPA 校验。该脚本直接检查压缩包，不执行其中的程序，并与当前 `app.json` 中的应用标识和版本核对。

## 源码 ZIP

运行 `python scripts/package-source.py`，输出 `releases/TJMuse-0.2.0-source.zip` 和 SHA-256 文件。包含代码、资源、文档、依赖锁文件与构建脚本，排除本机依赖、工具链、缓存、原生生成目录、安装包和私密签名文件。打包后逐个比对源文件并验证 ZIP 完整性。

相关文档：[EAS 自定义构建](https://docs.expo.dev/custom-builds/schema/)、[EAS 构建配置](https://docs.expo.dev/eas/json/)。

## 0.2.1 build 15 的本机 iOS 资源打包

仅适用于原生依赖、插件、配置和全部嵌入资源与已验证原生包完全一致的情况。新增原生模块或改变原生配置时，必须重新使用 Xcode／EAS 编译；脚本会拒绝这些变化。此方法不等于一次新的 Xcode 构建，也不代表已完成真机启动测试。

先导出 iOS Release Hermes 字节码：

```sh
node node_modules/expo/bin/cli export:embed --platform ios --entry-file node_modules/expo-router/entry --dev false --bytecode --bundle-output .build-tools/ios-embed-build15/main.jsbundle --assets-dest .build-tools/ios-embed-build15/resources
```

再使用 `python scripts/repack-ios-resources.py`，传入 `--base`（已归档的 build 14 未签名 IPA）、`--source`（对应源码 ZIP）、`--embedded .build-tools/ios-embed-build15`、`--output releases/TJMuse-0.2.1-unsigned.ipa` 和 `--base-sha256`（归档校验记录中的 SHA-256）。原生包与对应源码需另行提供，不包含在源码 ZIP 中。

脚本核对基包 SHA-256、所有原生输入、21 个嵌入资源与 Hermes 版本，仅修改主字节码、Info.plist 构建号和 Expo 构建信息，保留原生程序及框架逐字节一致。生成 `.resources.json` 记录，再运行 `python scripts/verify-ipa.py releases/TJMuse-0.2.1-unsigned.ipa` 校验设备平台、架构、无签名状态、版本与 ZIP 完整性。两者都通过后仍需用户自签安装验证。
