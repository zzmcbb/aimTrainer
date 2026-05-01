# Aim Trainer 代码风格与维护规范

## 1. 总原则

项目代码应优先满足以下目标：

1. 行为清晰：读代码时能快速判断数据从哪里来、事件往哪里走。
2. 职责单一：页面、组件、hook、store、lib 各自承担明确职责。
3. 类型可靠：公共数据结构必须有 TypeScript 类型。
4. 本地一致：新增代码优先沿用项目已有模式，不引入孤立风格。
5. 渐进抽象：只有重复真实出现或文件职责明显过重时再抽象。

不要为了“看起来高级”增加复杂抽象。训练项目的核心价值在交互稳定和反馈准确，代码结构应服务于可维护性。

## 2. TypeScript 规范

### 2.1 类型定义

公共数据结构使用 `interface`，联合值使用 `type`。

推荐：

```ts
export interface TrainingSettings {
  durationSeconds: number;
  fpsLimit: number;
}

export type TrainingPhase = "idle" | "countdown" | "running" | "paused" | "complete";
```

组件 props 使用 `interface`：

```ts
interface SettingsPanelProps {
  className?: string;
  surface?: "page" | "glass";
}
```

### 2.2 类型导入

只用于类型的位置使用 `import type`。

```ts
import type { SoundSettings } from "@/stores/settingsStore";
```

这样能减少运行时代码和循环依赖风险。

### 2.3 枚举风格

项目当前使用字符串联合类型，不使用 TypeScript `enum`。

推荐：

```ts
export type HitEffectType = "balloon" | "burst" | "explosion" | "nuke" | "bloodMist";
```

### 2.4 any 使用

应避免新增 `any`。当前训练页因 Three.js 对象和历史代码存在部分 `any`，后续重构时应逐步替换为更准确的 Three.js 类型。

如果必须使用 `any`，应局限在边界层，并避免向外扩散。

### 2.5 运行时校验

来自 localStorage、IndexedDB、URL、文件上传的数据都不能只依赖 TypeScript。需要运行时校验。

已有模式：

- `readNumber`
- `readBoolean`
- `readColor`
- enum reader
- `isTrainingHistoryRecord`
- 文件类型校验函数

新增持久化数据时，也应提供 reader 或 validator。

## 3. React 组件规范

### 3.1 组件定义

使用具名函数组件：

```tsx
export function SettingsPanel({ className, surface = "page" }: SettingsPanelProps) {
  return <section className={className} />;
}
```

不推荐默认导出页面组件。当前项目以 named export 为主。

### 3.2 组件职责

组件分三类：

- 页面 View：负责页面布局和展示。
- 业务组件：负责某个业务区块，如设置面板、音效设置。
- 基础 UI：只封装样式和通用交互，如 Button、Badge。

页面 View 不应直接写复杂业务算法。复杂逻辑应进入 hook 或 lib。

### 3.3 Props 设计

Props 应表达组件真实依赖，避免传入整个大对象，除非组件确实需要完整对象。

推荐：

```tsx
<SettingsPreview
  crosshairColor={crosshair.color}
  targetColor={target.color}
/>
```

当组件就是某个设置域的编辑器时，可以传整个设置域：

```tsx
<CrosshairSettingsMenu crosshair={crosshair} onChange={setCrosshair} />
```

### 3.4 条件渲染

简单条件直接内联：

```tsx
{activeSection === "sound" && <SoundSettingsMenu sound={sound} onChange={setSound} />}
```

条件过多或 JSX 很长时，应抽成子组件。

### 3.5 列表 key

列表 key 使用稳定 id，不使用 index，除非列表没有可变顺序且没有状态。

```tsx
{packs.map((pack) => (
  <PackRow key={pack.id} pack={pack} />
))}
```

## 4. Hook 规范

### 4.1 页面 hook

页面 hook 命名为 `useXxxPage`，返回 view model。

```ts
export function useHistoryPage() {
  return {
    records,
    selectedRecord,
    selectRecord,
  };
}
```

页面 View 通过 props 接收 view model。

### 4.2 高频状态

训练循环、音频播放、Three.js 对象等高频或可变对象应使用 `useRef`，避免每帧触发 React 渲染。

适合 `useRef`：

- renderer、scene、camera。
- 当前音频元素。
- 当前训练内部状态。
- animation frame id。
- 最新设置快照。

适合 `useState`：

- UI 需要展示的数据。
- 用户可见阶段。
- 表单状态。
- 弹窗开关。

### 4.3 useMemo / useCallback

只在以下场景使用：

- 派生数据计算较复杂。
- 需要稳定引用传给子组件或 effect。
- 依赖数组明确且能降低重复计算。

不要为了形式统一给所有函数都套 `useCallback`。

### 4.4 Effect 清理

所有副作用必须考虑清理：

- `addEventListener` 对应 `removeEventListener`。
- `setInterval` / `setTimeout` 对应 clear。
- `requestAnimationFrame` 对应 cancel。
- Object URL 对应 revoke。
- Three.js geometry/material/renderer 对应 dispose。

训练页这类资源密集页面尤其要严格清理。

## 5. 状态管理规范

### 5.1 Zustand store

store 中只放跨页面共享状态。页面内部状态不要随意放进全局 store。

适合全局：

- 用户设置。
- 语言偏好。

不适合全局：

- 某个弹窗是否打开。
- 历史页当前页码。
- hover 状态。
- 训练中的每帧内部状态。

### 5.2 Action 命名

设置更新 action 使用 `setXxx`：

- `setCrosshair`
- `setTraining`
- `setSound`

重置类 action 使用动词：

- `resetAimSettings`

### 5.3 持久化

store action 内部负责持久化，调用方不应自己写 localStorage。

新增设置域时，需要同时处理：

1. 类型定义。
2. 默认值。
3. reader 校验。
4. persist 合并。
5. action。
6. UI 表单。
7. i18n 文案。

## 6. 文件和命名规范

### 6.1 文件命名

当前项目使用 PascalCase 组件文件和 camelCase 工具文件。

推荐：

```text
HomePageView.tsx
useHomePage.ts
homePage.styles.ts
soundAssets.ts
settingsStore.ts
```

### 6.2 目录命名

目录使用小写或业务名：

```text
pages/settings
components/common
lib
stores
```

### 6.3 导入路径

跨目录导入优先使用 `@/` alias：

```ts
import { Button } from "@/components/ui/button";
```

同目录或强相关局部文件可以使用相对路径：

```ts
import { homePageStyles as styles } from "./homePage.styles";
```

### 6.4 导入顺序

推荐顺序：

1. React / 第三方库。
2. 项目绝对路径 `@/...`。
3. 相对路径 `./...`。
4. type import 可与对应模块放一起，但必须使用 `import type`。

示例：

```tsx
import { useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SettingsPageViewModel } from "./useSettingsPage";
```

## 7. 样式规范

### 7.1 Tailwind 优先

项目以 Tailwind className 为主。除全局主题、重用样式常量和第三方库适配外，不新增普通 CSS 文件。

### 7.2 页面样式常量

页面级重复 className 可以放在 `*.styles.ts`：

```ts
export const homePageStyles = {
  page: "relative min-h-screen overflow-hidden bg-background text-foreground",
  content: "relative z-10 flex min-h-screen items-center justify-center px-6 py-10",
};
```

### 7.3 className 合并

条件 className 使用 `cn`：

```tsx
className={cn("rounded-2xl border", disabled && "opacity-55")}
```

### 7.4 视觉一致性

当前视觉语言：

- 深色背景。
- 玻璃拟态面板。
- 青色 primary 强调。
- 半透明边框。
- `rounded-2xl` / `rounded-3xl` 大圆角面板。
- lucide 图标。

新增 UI 应延续这套视觉，但不要无限叠加玻璃卡片。复杂工具页面应优先保证可读性和操作密度。

### 7.5 响应式

必须检查小屏宽度：

- 文本不能溢出按钮。
- 工具栏应允许换行。
- 列表操作按钮应在移动端堆叠或网格排列。
- 固定尺寸元素要有 `min-w-0`、`truncate` 或响应式 grid。

## 8. 国际化规范

### 8.1 文案来源

用户可见文案应进入 i18n 资源，不要长期硬编码在组件里。

当前部分历史代码仍有硬编码中文，后续修改相关区域时应顺手补齐 i18n。

### 8.2 namespace

按页面选择 namespace：

- 首页：`home`
- 模式页：`home` 或后续拆 `modes`
- 历史页：`history`
- 设置页：`settings`
- 训练页：`training`
- 通用：`common`

### 8.3 defaultValue

调用 `t` 时应提供 `defaultValue`，便于缺失 key 时仍能展示合理文案。

```tsx
t("grid3x3.start", { defaultValue: "开始训练" })
```

### 8.4 新增文案流程

1. 在组件里使用 `t`。
2. 运行 `pnpm i18n:update`。
3. 检查 `zh-CN` 和 `en-US` 资源。
4. 手动优化机器补齐不准确的翻译。

## 9. 音频代码规范

### 9.1 文件校验

所有用户上传音频必须经过 `getSoundFileError` 或同等级校验。

### 9.2 Blob 存储

音频 Blob 只进入 IndexedDB，不进入 localStorage。

### 9.3 Object URL

创建 Object URL 后必须考虑释放：

```ts
const url = URL.createObjectURL(blob);
URL.revokeObjectURL(url);
```

### 9.4 音频引用

设置中保存 `SoundClipRef`，不要直接保存完整 `SoundAsset`。

## 10. Three.js 代码规范

### 10.1 创建与释放

创建的资源必须释放：

- renderer：`dispose`
- geometry：`dispose`
- material：`dispose`
- texture：`dispose`
- DOM canvas：从 mount 节点移除

### 10.2 React 与 Three.js 边界

Three.js 对象不要放进 React state。使用 ref 保存，并在 effect 中初始化和清理。

### 10.3 渲染循环

渲染循环应避免读取过期闭包。需要读取最新设置时，使用 settings ref 同步。

## 11. 错误处理规范

### 11.1 用户可恢复错误

如上传失败、文件类型不对、整合包导入失败，应展示明确错误文案。

### 11.2 本地存储错误

localStorage 写入失败不应阻断 UI。当前设置持久化已经使用 try/catch 静默兜底。

### 11.3 解析失败

解析本地历史、设置、manifest 时，应回退默认值或跳过坏记录，而不是抛到页面崩溃。

## 12. 性能规范

### 12.1 首屏

非首页页面继续使用路由懒加载。新增重型页面不要直接进入主 bundle。

### 12.2 图表

ECharts 较重，图表组件应只在需要展示图表的页面中加载。

### 12.3 训练页

训练页禁止在每一帧 setState。UI 更新应节流，例如剩余时间当前约 100ms 更新一次。

### 12.4 大文件

超过 500 行的文件需要评估是否拆分。超过 1000 行基本应拆分，除非是临时迁移状态。

当前优先拆分目标：

- `useGrid3x3Training.ts`
- `SoundEditorPage.tsx`
- `HistoryPageView.tsx`

## 13. 测试和验证规范

当前项目没有自动化测试，提交前至少运行：

```bash
pnpm build
```

涉及 i18n 时运行：

```bash
pnpm i18n:update
pnpm build
```

涉及 UI 或训练交互时，需要手动验证：

- 首页能进入模式页。
- 模式页能进入训练。
- 训练能开始、暂停、完成。
- 设置弹窗能打开并修改关键设置。
- 历史页能看到新增记录。
- 自定义音频上传、编辑、播放不报错。

## 14. 新功能开发流程

建议流程：

1. 明确功能属于哪个业务域。
2. 先找现有页面/组件模式。
3. 定义类型。
4. 写最小可工作的 UI 和逻辑。
5. 接入持久化或历史记录。
6. 补 i18n。
7. 运行 build。
8. 更新相关文档。

## 15. 禁止事项

- 不要在组件里直接写大段持久化解析逻辑。
- 不要把 Blob 或大型数组写入 localStorage。
- 不要在训练循环中频繁 setState。
- 不要新增无类型的复杂对象。
- 不要跳过文件上传校验。
- 不要把页面独有样式塞进全局 CSS。
- 不要在没有清理的 effect 中注册事件或创建资源。
