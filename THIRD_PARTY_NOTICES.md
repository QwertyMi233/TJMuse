# Third-party notices

OpenAI and DeepSeek SVG logo artwork in `src/assets/` is from [lobehub/lobe-icons](https://github.com/lobehub/lobe-icons).

MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Brand names and logos belong to their respective owners. No affiliation or endorsement is implied.

The bundled holiday dates are factual dates independently transcribed from the State Council's published 2026 notice. Optional network updates use the public holiday-cn dataset; that repository provides its own license and sources.

## Markdown rendering

AI replies use [react-native-marked](https://github.com/gmsgowtham/react-native-marked) under the MIT license.

Copyright (c) 2022 Gowtham G

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## TJ-Class-Schedule platform integration

Canvas rotation script, Haoke protocol adaptations and Tongji timetable extraction/parsing reference [qp338113/TJ-Class-Schedule](https://github.com/qp338113/TJ-Class-Schedule), including `packages/canvas_session_bridge/android/src/main/assets/canvas_rotation.js`, `lib/data/platform_task_client.dart`, `lib/presentation/tongji_timetable_page.dart`, `lib/import/tongji_timetable_import.dart` and `lib/import/term_import.dart`.

Canvas login maintenance also references `lib/data/canvas_session_manager.dart`, `lib/notifications/notification_lifecycle.dart`, `lib/application/task_sync_controller.dart` and `packages/canvas_session_bridge/android/src/main/kotlin/icu/tjschedule/canvas_session/CanvasWebSession.kt`: reuse local WebView cookies, maintain sessions at startup/resume, preserve verified credentials, and continue with a valid Bearer token when browser-session maintenance fails.

MIT License

Copyright (c) 2026 Algernon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
## Inter 数字轮廓

日期数字轮廓衍生自 [Inter](https://github.com/rsms/inter)，Copyright 2020 The Inter Project Authors，遵循 SIL Open Font License 1.1。完整许可见 [Inter-OFL.txt](assets/licenses/Inter-OFL.txt)。仅打包经实例化和轮廓合并的数字矢量，未打包完整字体；生成脚本为 `scripts/generate-date-digits.py`。


## 0.4.0 locale and audio resources

Country and region labels were generated using ISO 3166 identifiers and the development runtime’s Intl.DisplayNames. Traditional Chinese app copy was converted with OpenCC during development. Core translations were authored for the app; supplementary fixed help text was drafted using Google Translate. No user tasks, accounts or credentials were submitted for translation.

The six onboarding chimes were supplied by the user, segmented and processed with a decaying echo. Source digest and segment ranges are recorded in `assets/audio/onboarding/manifest.json`. The supplied original recording remains unchanged.
# aes-js

The JavaScript AES implementation in `src/vendor/aes-js.js` is aes-js 3.1.2,
Copyright (c) 2015 Richard Moore, MIT license. The complete license is included
at `src/vendor/aes-js.LICENSE.txt`. It is used for the password encryption
protocol required by Haoke's official account service. The source tarball was
verified against the npm registry SHA-512 integrity value before vendoring.

