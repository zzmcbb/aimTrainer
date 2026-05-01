# Aim Trainer 系统架构文档

## 1. 项目定位

Aim Trainer 是一个浏览器端瞄准训练应用，当前 MVP 以纯前端单页应用形式实现。项目核心目标是让用户在桌面浏览器中完成瞄准训练、查看训练结果、调整训练体验，并支持本地自定义音效。

当前系统没有独立后端，所有用户数据都保存在浏览器本地：

- 训练设置保存在 `localStorage`。
- 训练历史保存在 `localStorage`。
- 用户上传音频保存在 IndexedDB。
- 静态内置音效和图片资源由 `public/` 目录提供。

这意味着当前应用具备离线可用、本地响应快、部署简单的特点，但也存在跨设备同步、账号体系、服务端校验、数据备份和多人排行缺失的问题。

## 2. 总体架构

系统采用典型 React SPA 分层：

```text
浏览器
  |
  |-- React Router 路由层
  |     |
  |     |-- 页面层 pages
  |     |     |
  |     |     |-- 页面 hook / view model
  |     |     |-- 页面 View
  |     |
  |     |-- 组件层 components
  |     |
  |     |-- 状态层 stores
  |     |
  |     |-- 领域工具层 lib
  |
  |-- localStorage
  |
  |-- IndexedDB
  |
  |-- public 静态资源
```

各层职责如下：

- `src/app`：应用路由、页面懒加载和路由切换容器。
- `src/pages`：页面级模块，每个页面负责自己的数据组装、交互状态和视图。
- `src/components`：跨页面复用组件，包括 UI 基础组件、设置组件、图表组件和视觉组件。
- `src/stores`：全局状态，目前主要是设置 store。
- `src/lib`：领域能力和工具函数，如音频素材、音频播放、整合包导入导出、className 合并。
- `src/i18n`：轻量国际化系统和语言资源。
- `src/styles`：全局样式、主题变量和 Tailwind 配置入口。

## 3. 路由架构

路由定义在 `src/app/App.tsx`。除首页外，主要页面通过 `React.lazy` 懒加载，降低首屏包体积。

当前路由：

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | `HomePage` | 首页，提供训练、历史、设置入口 |
| `/modes` | `ModeSelectionPage` | 训练模式选择 |
| `/training/grid-3x3` | `TrainingPage` | 九宫格射击训练 |
| `/history` | `HistoryPage` | 训练历史和统计分析 |
| `/settings` | `SettingsPage` | 全局设置 |
| `/settings/sounds/editor/:assetId` | `SoundEditorPage` | 音频片段和整合包编辑 |

路由层不直接持有业务状态，只负责把用户带到对应页面。

## 4. 页面架构

页面通常遵循以下结构：

```text
pages/example/
  index.tsx              页面入口
  useExamplePage.ts      页面行为和 view model
  ExamplePageView.tsx    页面视图
  examplePage.styles.ts  页面样式常量
```

这种拆法的目标是：

- `index.tsx` 保持极薄，只连接 hook 和 view。
- hook 负责状态、派生数据、事件处理和路由副作用。
- View 尽量专注 JSX 渲染。
- 样式常量从 JSX 中抽出，降低页面文件噪音。

训练页是当前例外：`useGrid3x3Training.ts` 仍承载大量训练引擎逻辑，包括 Three.js 场景、输入、状态机、音效、特效和成绩记录。后续应继续拆分。

## 5. 状态架构

### 5.1 全局设置

全局设置由 Zustand 管理，入口为 `src/stores/settingsStore.ts`。

设置域包括：

- `language`：语言偏好。
- `crosshair`：准星外观和动态扩散。
- `target`：目标颜色。
- `aimAssist`：辅助瞄准开关和强度。
- `hit`：命中特效开关和类型。
- `sound`：默认音效、自定义音效、连续击中整合包和未命中音效。
- `training`：训练时长、倒计时、灵敏度和 FPS 上限。

store 提供以下 action：

- `setLanguage`
- `setCrosshair`
- `setTarget`
- `setAimAssist`
- `setHit`
- `setSound`
- `setTraining`
- `resetAimSettings`

所有 action 写入 Zustand 状态时会同步持久化到 `localStorage`。

### 5.2 页面局部状态

页面局部状态使用 React `useState`、`useMemo`、`useRef` 和 `useEffect`。例如：

- 首页和模式页主要维护 hover 状态。
- 历史页维护筛选条件、分页和选中记录。
- 设置页维护当前菜单、重置确认态。
- 训练页维护训练阶段、倒计时、FPS、剩余时间、统计数据和弹窗状态。

### 5.3 高频运行状态

训练页中高频变化的数据大量放在 `useRef` 中，而不是全部放入 React state。原因是训练循环以 `requestAnimationFrame` 和固定逻辑 tick 驱动，若每一帧都 setState 会造成不必要的 React 渲染。

典型高频状态：

- `gameStateRef`：训练运行状态、命中数、剩余时间、镜头角度、时间线。
- `targetRefs`：Three.js 目标对象。
- `soundSettingsRef`：训练中读取最新音效设置。
- `fpsLimitRef`：运行时 FPS 上限。

React state 只承载需要显示到 UI 的结果，如剩余时间、命中数、FPS 和阶段。

## 6. 数据存储架构

### 6.1 localStorage

| Key | 内容 | 说明 |
| --- | --- | --- |
| `aim-trainer-settings` | 全局设置 | 由 `settingsStore` 读写 |
| `aim-trainer-active-settings-section` | 设置页当前菜单 | 只属于 UI 记忆 |
| `aim-trainer:training-history:v1` | 训练历史 | 最多保存 200 条 |

### 6.2 IndexedDB

IndexedDB 通过 Dexie 封装，数据库名为 `aim-trainer-sounds`，表为 `soundAssets`。

`SoundAsset` 保存：

- `id`
- `name`
- `mimeType`
- `size`
- `durationMs`
- `waveformPeaks`
- `blob`
- `createdAt`

设置 store 中不保存音频 Blob，只保存 `assetId` 和片段时间，避免 localStorage 过大或序列化失败。

## 7. 训练架构

训练页由 `useGrid3x3Training` 作为主控制器。它包含以下子系统：

- 场景系统：创建 Three.js scene、camera、renderer、目标物、房间材质和特效对象。
- 输入系统：使用 Pointer Lock 捕获鼠标移动；鼠标左键触发射击。
- 状态机：`idle`、`countdown`、`running`、`paused`、`complete`。
- 逻辑 tick：以 240Hz 逻辑步长更新训练倒计时和命中逻辑。
- 渲染节流：根据用户设置的 FPS 上限控制渲染频率。
- 命中检测：使用 Raycaster 从屏幕中心检测目标。
- 统计系统：记录命中、未命中、反应时间、准确率和每秒时间线。
- 音效系统：播放默认命中特效音、短音效、连续击中音乐和未命中音效。
- 结果系统：训练结束后创建历史记录并保存。

训练页的设计重点是：高频逻辑不依赖 React 渲染，UI 只订阅必要的低频结果。

## 8. 音效架构

音效系统由三个文件承担：

- `lib/soundAssets.ts`：素材上传、IndexedDB 存储、音频分析和默认自定义设置。
- `lib/soundEngine.ts`：短音效播放、Object URL 管理。
- `lib/comboSoundPackArchive.ts`：连续击中整合包导入导出。

音效类型：

- 默认音效：内置在 `public/sounds`。
- 单次命中短音效：用户上传单个 mp3/wav，可裁剪播放范围。
- 连续击中整合包：一个音频文件配多段片段，按连击顺序播放。
- 未命中短音效：用户上传短音效，未命中时播放。

## 9. 国际化架构

项目使用自实现轻量 i18n，而不是第三方 i18n 框架。

入口：`src/i18n/index.tsx`

资源：

```text
src/i18n/locales/zh-CN/
src/i18n/locales/en-US/
```

命名空间：

- `common`
- `home`
- `history`
- `settings`
- `training`

语言偏好保存在设置 store，支持：

- `system`
- `zh-CN`
- `en-US`

`useTranslation(namespace)` 返回 `t(key, options)`，支持默认值和简单插值。

## 10. 构建和部署架构

构建工具为 Vite。常用命令：

```bash
pnpm dev
pnpm build
pnpm preview
pnpm i18n:update
```

部署产物位于 `dist/`。由于当前应用是纯前端 SPA，只要静态服务器支持回退到 `index.html` 即可部署。

当前构建存在部分 chunk 大于 500 KB 的提示，主要原因是 Three.js、ECharts、历史数据模块和训练页逻辑较重。该提示不是构建失败，但后续优化时应考虑更细粒度的懒加载和手动分包。

## 11. 架构演进方向

优先级较高的架构演进：

1. 拆分 `useGrid3x3Training.ts`，把训练引擎从 React hook 中逐步抽成多个领域模块。
2. 拆分 `SoundEditorPage.tsx`，将音频加载、波形交互、片段保存和 UI 展示分离。
3. 将 `settingsStore.ts` 拆成类型、默认值、持久化、迁移和 store 创建。
4. 为本地存储增加显式 schema version。
5. 将历史记录和音频素材抽象为 repository，为未来接后端做准备。
