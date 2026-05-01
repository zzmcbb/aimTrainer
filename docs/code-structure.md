# Aim Trainer 代码结构文档

## 1. 目录总览

```text
.
├── docs/                         项目文档
├── public/
│   ├── images/                   静态图片
│   └── sounds/                   内置音效
├── scripts/                      i18n 辅助脚本
├── src/
│   ├── app/                      应用路由
│   ├── components/               通用组件
│   ├── i18n/                     国际化
│   ├── lib/                      领域工具和基础工具
│   ├── pages/                    页面模块
│   ├── stores/                   全局状态
│   ├── styles/                   全局样式
│   └── types/                    类型补充
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

## 2. `src/app`

```text
src/app/
└── App.tsx
```

`App.tsx` 是应用路由入口。它负责：

- 引入 React Router 的 `Routes` 和 `Route`。
- 对非首页页面使用 `React.lazy` 懒加载。
- 使用 `Suspense` 包裹路由。
- 根据 `location.pathname` 提供路由切换容器。

业务逻辑不应写在 `App.tsx` 中。新增页面时，只在这里新增路由映射。

## 3. `src/pages`

页面目录按业务页面划分。

```text
src/pages/
├── history/
├── home/
├── modes/
├── settings/
└── training/
```

### 3.1 首页 `pages/home`

```text
home/
├── HomePageView.tsx
├── homePage.styles.ts
├── index.tsx
└── useHomePage.ts
```

职责：

- 展示品牌、首页视觉、训练入口、历史入口、设置入口。
- 展示语言切换。
- 当前无复杂业务状态，`useHomePage` 主要提供翻译函数。

### 3.2 模式页 `pages/modes`

```text
modes/
├── ModeSelectionPageView.tsx
├── index.tsx
├── modeSelectionPage.styles.ts
└── useModeSelectionPage.ts
```

职责：

- 展示训练模式卡片。
- 维护 hover 状态，用于背景视觉变化。
- 根据模式配置导航到训练路由。

训练模式的展示使用 `TrainingModeCard`，目前主要入口为 `Grid 3x3`。

### 3.3 训练页 `pages/training`

```text
training/
├── TrainingPageView.tsx
├── index.tsx
├── trainingPage.styles.ts
└── useGrid3x3Training.ts
```

职责：

- `index.tsx`：创建训练 view model 并渲染 view。
- `TrainingPageView.tsx`：渲染 Three.js mount 容器、HUD、准星、开始/暂停/完成弹层、结果图表和设置弹窗。
- `useGrid3x3Training.ts`：训练核心逻辑。

`useGrid3x3Training.ts` 当前包含多个职责，是项目后续最应该拆分的文件。

建议拆分目标：

```text
training/
├── engine/
│   ├── gridPositions.ts
│   ├── trainingState.ts
│   ├── targetSpawner.ts
│   ├── hitDetection.ts
│   ├── aimAssist.ts
│   ├── hitEffects.ts
│   └── trainingAudio.ts
├── hooks/
│   └── useGrid3x3Training.ts
└── components/
```

### 3.4 历史页 `pages/history`

```text
history/
├── HistoryPageView.tsx
├── historyPage.styles.ts
├── historyRecords.ts
├── index.tsx
└── useHistoryPage.ts
```

职责：

- `historyRecords.ts`：训练历史类型、分数计算、本地读写、记录校验。
- `useHistoryPage.ts`：筛选、分页、选中记录、趋势图数据和汇总统计。
- `HistoryPageView.tsx`：渲染历史列表、筛选器、统计卡和图表。

历史记录当前保存在 localStorage，最多 200 条。

### 3.5 设置页 `pages/settings`

```text
settings/
├── SettingsPageView.tsx
├── SoundEditorPage.tsx
├── index.tsx
├── settingsPage.styles.ts
├── useSettingsPage.ts
└── menus/
```

职责：

- `SettingsPageView.tsx`：设置页外层布局。
- `useSettingsPage.ts`：设置页 Escape 返回首页逻辑。
- `SoundEditorPage.tsx`：音频裁剪和整合包编辑页面。
- `menus/`：每个设置菜单的独立组件。

`menus/` 当前结构：

```text
menus/
├── AimAssistSettingsMenu.tsx
├── CrosshairSettingsMenu.tsx
├── DurationSettingsMenu.tsx
├── FpsSettingsMenu.tsx
├── HitEffectSettingsMenu.tsx
├── SensitivitySettingsMenu.tsx
├── SoundSettingsMenu.tsx
├── TargetSettingsMenu.tsx
├── menuTypes.ts
├── settingsMenuStorage.ts
└── settingsSections.ts
```

新增设置菜单时，需要：

1. 在 `settingsSections.ts` 增加菜单元信息。
2. 新建对应 `XxxSettingsMenu.tsx`。
3. 在 `SettingsPanel.tsx` 中接入渲染。
4. 在 `settings.json` 语言资源中补齐标题、描述和字段文案。

## 4. `src/components`

```text
components/
├── common/
├── history/
├── home/
├── settings/
├── training/
└── ui/
```

### 4.1 `components/ui`

低层 UI 组件，当前包含：

- `button.tsx`
- `badge.tsx`

这些组件是样式和交互基础，不应耦合业务。

### 4.2 `components/common`

跨页面通用组件：

- `PageHeader.tsx`
- `PageStatCard.tsx`

适合放置页面标题、通用统计卡等。

### 4.3 `components/home`

首页和模式页使用的视觉组件：

- `GlassCard.tsx`
- `ParallaxBackground.tsx`
- `TrainingModeCard.tsx`

### 4.4 `components/history`

历史页图表：

- `TrainingAnalyticsChart.tsx`

### 4.5 `components/training`

训练结果图表：

- `ResultTrendChart.tsx`

### 4.6 `components/settings`

设置相关组件：

- `LanguageSwitcher.tsx`：语言切换。
- `SettingsFields.tsx`：Range、Toggle、Color 等设置字段。
- `SettingsPanel.tsx`：设置面板壳和菜单导航。
- `SettingsPreview.tsx`：准星/目标预览。
- `SoundSettingsPanel.tsx`：音效设置业务面板。
- `SoundSettingsPanel.parts.tsx`：音效设置的纯展示部件和工具函数。

## 5. `src/stores`

```text
stores/
└── settingsStore.ts
```

`settingsStore.ts` 当前承担：

- 设置类型定义。
- 默认设置。
- localStorage 读取。
- localStorage 写入。
- 数据读取校验和旧数据兼容。
- Zustand store 创建。

后续文件继续增长时，建议拆成：

```text
stores/settings/
├── defaults.ts
├── persistence.ts
├── readers.ts
├── settingsStore.ts
└── types.ts
```

## 6. `src/lib`

```text
lib/
├── comboSoundPackArchive.ts
├── soundAssets.ts
├── soundEngine.ts
└── utils.ts
```

### 6.1 `utils.ts`

当前主要提供 `cn`，用于合并 className。

### 6.2 `soundAssets.ts`

负责：

- 定义音频素材、片段、整合包类型。
- 使用 Dexie 操作 IndexedDB。
- 校验 mp3/wav 文件。
- 上传音频并分析时长、波形峰值。
- 创建默认自定义音效设置。

### 6.3 `soundEngine.ts`

负责：

- 根据 `SoundClipRef` 播放短音效。
- 处理 Object URL 生命周期。
- 返回正在播放的音频对象，供调用方停止或管理。

### 6.4 `comboSoundPackArchive.ts`

负责：

- 导出连续击中整合包 zip。
- 导入整合包 zip。
- 校验 manifest、音频文件、片段数量、文件大小和时间范围。

## 7. `src/i18n`

```text
i18n/
├── index.tsx
└── locales/
    ├── en-US/
    └── zh-CN/
```

`index.tsx` 提供：

- `I18nProvider`
- `useTranslation`
- `getResolvedLanguage`

语言资源按 namespace 拆分：

- `common.json`
- `home.json`
- `history.json`
- `settings.json`
- `training.json`

## 8. `scripts`

```text
scripts/
├── i18n-extract.mjs
├── i18n-fill.mjs
├── i18n-sync.mjs
└── i18n-utils.mjs
```

i18n 脚本用于提取、同步和补齐语言资源。新增页面文案后，应运行：

```bash
pnpm i18n:update
```

## 9. `public`

```text
public/
├── images/
│   └── hero-bg.jpg
└── sounds/
    ├── balloon.mp3
    ├── blood_fog.mp3
    ├── burst.mp3
    ├── explosion.mp3
    ├── jinitaimei.mp3
    ├── niganma.mp3
    └── nuke.mp3
```

`public` 下的资源以根路径访问，例如 `/sounds/nuke.mp3`。

## 10. 文件放置原则

- 页面独有逻辑放在对应 `pages/<page>`。
- 跨页面组件放在 `components`。
- 业务无关 UI 放在 `components/ui`。
- 领域工具放在 `lib`。
- 全局状态放在 `stores`。
- 静态资源放在 `public`。
- 文档放在 `docs`。

不要为了“复用可能性”过早抽象。只有当组件或工具确实跨页面复用，或单文件职责明显过多时再抽离。
