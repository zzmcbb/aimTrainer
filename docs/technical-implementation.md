# Aim Trainer 技术细节实现文档

## 1. 技术栈

| 类别 | 技术 | 用途 |
| --- | --- | --- |
| 构建 | Vite | 开发服务器、生产构建 |
| 语言 | TypeScript | 类型约束 |
| UI | React 19 | 页面和组件 |
| 路由 | React Router 7 | SPA 路由 |
| 状态 | Zustand | 全局设置状态 |
| 样式 | Tailwind CSS 4 | 原子样式和主题变量 |
| 图标 | lucide-react | UI 图标 |
| 3D | Three.js | 训练场景、目标、命中特效 |
| 图表 | ECharts | 历史趋势、训练结果图 |
| 本地 DB | Dexie / IndexedDB | 音频素材 Blob 存储 |

## 2. 应用启动流程

1. 浏览器加载 `index.html`。
2. Vite 注入入口脚本 `src/main.tsx`。
3. React 挂载应用。
4. 应用包裹必要 Provider，包括路由和 i18n。
5. `App.tsx` 根据路由渲染页面。
6. 页面 hook 初始化自己的状态和副作用。

路由页面懒加载后，首屏主要加载首页相关代码，训练、历史、设置等页面在访问时再加载。

## 3. 设置持久化实现

设置 store 的核心流程：

```text
defaultSettings
  |
loadSettings()
  |
读取 localStorage
  |
JSON.parse
  |
逐字段校验、范围限制、旧字段兼容
  |
创建 Zustand store
```

每次调用 `setXxx` action 时：

```text
合并当前设置
  |
saveSettings(nextSettings)
  |
window.localStorage.setItem(...)
  |
set(partial)
```

读取校验策略：

- number 使用 `readNumber(value, fallback, min, max)` 限制范围。
- boolean 必须是布尔值，否则使用默认值。
- color 必须符合 `#[0-9a-f]{6}`。
- enum 使用专门 reader 校验。
- 音频片段、整合包等复杂对象逐层读取，坏数据会被丢弃或回退默认值。

这个设计保证本地数据损坏时 UI 不会崩溃。

## 4. 训练引擎实现

### 4.1 状态机

训练阶段：

- `idle`：未开始。
- `countdown`：倒计时中。
- `running`：训练中。
- `paused`：暂停。
- `complete`：训练结束。

UI 会根据阶段展示开始面板、倒计时、暂停层、完成结果或训练 HUD。

### 4.2 Three.js 场景

训练场景中固定生成 3x3 网格位置：

- 目标距离相机约 12 个单位。
- 九宫格间距为 2.15。
- 每个目标半径为 0.88。

目标对象使用 Three.js mesh。命中后目标会被移动到新的可用格子，避免立即重复同一位置。

### 4.3 输入与指针锁定

训练开始时调用 canvas 的 `requestPointerLock()`。

指针锁定后：

- `mousemove` 的 `movementX` / `movementY` 转换为 yaw / pitch。
- 灵敏度来自 `training.sensitivityX` 和 `training.sensitivityY`。
- yaw 和 pitch 被限制在最大角度范围内，避免视角翻转。
- 鼠标左键触发射击。

如果用户退出 pointer lock，训练会自动暂停。

### 4.4 命中检测

射击时使用 Three.js `Raycaster` 从屏幕中心发射射线。若射线与可见目标相交，则判定命中；否则判定未命中。

命中后：

- 增加 hits。
- 计算反应时间。
- 写入当前秒的 timeline bucket。
- 播放命中音效。
- 生成命中特效。
- 替换目标位置。

未命中后：

- 增加 misses。
- 写入 timeline shots。
- 播放未命中音效。
- 根据连续击中音效设置处理连击中断。

### 4.5 逻辑 tick 与渲染

训练逻辑使用固定 tick：

- `logicTickRate = 240`
- `logicStepMs = 1000 / 240`

渲染仍由 `requestAnimationFrame` 驱动，但会根据 `training.fpsLimit` 限制渲染频率。

好处：

- 训练倒计时和逻辑更新更稳定。
- UI 显示的 FPS 和逻辑 FPS 分开统计。
- 用户可通过 FPS 上限减少帧时间波动。

### 4.6 准星实现

准星不是 Three.js 对象，而是 React DOM overlay，始终位于屏幕中心。

准星由以下设置控制：

- `centerDotEnabled`
- `centerDotSize`
- `outerCrosshairEnabled`
- `outerCrosshairOffset`
- `size`
- `thickness`
- `color`
- `opacity`
- `dynamicSpreadEnabled`
- `spreadRecoverySeconds`

动态扩散通过 React state 控制线段 gap，并使用 CSS transition 回弹。

### 4.7 辅助瞄准

辅助瞄准会根据当前准星方向和目标方向计算角度差，在设定范围内把相机方向拉向最近目标。强度同时影响吸附范围和移动速度。

辅助瞄准默认关闭，是训练设置中的可选能力。

### 4.8 命中特效

命中特效类型：

- `balloon`
- `burst`
- `explosion`
- `nuke`
- `bloodMist`

特效由 Three.js 对象组成，命中时创建，达到生命周期后移除。系统限制最大活跃特效数量，避免长时间训练导致对象过多。

## 5. 训练结果和历史记录

训练完成后，系统创建 `TrainingHistoryRecord`：

- `modeId`
- `modeName`
- `completedAt`
- `durationSeconds`
- `score`
- `hits`
- `misses`
- `shots`
- `accuracy`
- `averageReactionMs`
- `timeline`

分数计算逻辑：

```text
score = (hits * 100 + accuracy * 8 + speedBonus) / durationFactor
```

其中：

- 命中数是主要得分来源。
- 准确率提供额外加成。
- 平均反应低于 450ms 时提供速度加成。
- 时长超过 60 秒时按比例修正。

历史记录保存到 localStorage，最多保留 200 条。

## 6. 历史页实现

历史页从 localStorage 读取所有记录，然后在前端完成：

- 模式筛选。
- 日期范围筛选。
- 分页。
- 选中记录详情。
- 汇总统计。
- 趋势图数据转换。

图表组件使用 ECharts。页面 view model 会把记录转换成图表需要的 label、score、accuracy、hits、averageReaction 等数组。

## 7. 音频素材实现

### 7.1 上传校验

仅支持：

- `.mp3`
- `.wav`

MIME 类型必须在白名单内。上传前会校验扩展名和 MIME 类型。

### 7.2 音频分析

上传音频后会读取 ArrayBuffer，并通过 Web Audio API 获取：

- `durationMs`
- `waveformPeaks`

`waveformPeaks` 用于音频编辑器绘制波形。

### 7.3 IndexedDB 存储

音频素材保存在 Dexie 表 `soundAssets` 中。Blob 不进入 localStorage，设置里只保存引用。

### 7.4 Object URL

播放音频时会从 IndexedDB 取出 Blob 并创建 Object URL。使用后需要合理释放，避免内存泄漏。

## 8. 连续击中整合包

整合包数据结构：

```text
ComboSoundPack
  id
  name
  sourceAssetId
  clips[]
  updatedAt
```

每个 clip 包含：

- `id`
- `index`
- `startMs`
- `endMs`
- `note`

训练时，连续命中会根据连击数选择对应片段。超过最后一段时，根据 overflow behavior 决定重播、循环、保持最后一段等策略。当前 UI 主流程使用从第一段重新开始。

## 9. 整合包导入导出

`comboSoundPackArchive.ts` 使用浏览器 Compression Streams 相关能力处理 zip。整合包包含：

- manifest JSON。
- 原始音频文件。

导入时会校验：

- zip 文件大小。
- manifest 格式。
- 音频文件类型。
- 音频大小。
- clip 数量。
- clip 时间范围。

导出时会生成 `.aimcombo.zip` 文件。

## 10. 国际化实现

`useTranslation(namespace)` 返回：

```ts
{
  language,
  preference,
  setLanguage,
  t,
}
```

`t` 支持：

- 通过点路径读取嵌套 key。
- fallback 到中文资源。
- fallback 到 `defaultValue`。
- 简单插值 `{{value}}`。

示例：

```ts
t("fields.fpsLimit", { defaultValue: "FPS 上限" })
t("fields.defaultValue", {
  defaultValue: "默认值 {{value}}",
  values: { value: "#ffffff" },
})
```

## 11. 样式实现

项目使用 Tailwind className 为主，少量样式常量放在 `*.styles.ts`。

全局变量、主题色和基础样式位于 `src/styles/globals.css`。

常见风格：

- 深色背景。
- 玻璃拟态面板。
- `primary` 作为青色强调色。
- 大量使用边框透明度、背景透明度和 backdrop blur。

交互控件优先使用已有 `Button`、`Badge` 和设置字段组件，避免每个页面重复写基础控件。

## 12. 构建细节

TypeScript 配置：

- `strict: true`
- `moduleResolution: Bundler`
- `baseUrl: .`
- 路径别名 `@/* -> src/*`

Vite 配置：

- React 插件。
- Tailwind CSS 插件。
- `@` alias。

构建命令：

```bash
pnpm build
```

构建包括：

1. `tsc -b`
2. `vite build`

因此 TypeScript 类型错误会阻止生产构建。
