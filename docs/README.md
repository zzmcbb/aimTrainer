## 介绍

Aim Trainer 是一个运行在浏览器中的瞄准训练器，面向桌面 Chrome 用户，用于练习九宫格快速定位、微调和跟枪等基础瞄准能力。项目当前是纯前端 MVP，无需后端服务，训练设置、历史记录和自定义音效都保存在浏览器本地。
<img width="2940" height="1676" alt="image" src="https://github.com/user-attachments/assets/7485987c-c69b-4a94-abfb-1327e603a6dd" />


## 功能特性

- 训练模式选择：提供九宫格、微调训练、跟枪训练入口，当前核心可玩模式为九宫格训练。
- Three.js 训练场景：使用 Pointer Lock 捕获鼠标移动，通过屏幕中心射线进行命中判定。
- 实时 HUD：展示剩余时间、命中数、命中率、渲染 FPS 和逻辑 FPS。
- 训练结果统计：训练结束后展示得分、命中、准确率、平均反应时间和趋势图。
- 历史记录分析：本地保存训练记录，支持按模式、日期筛选，并展示趋势图和统计卡片。
- 可配置训练体验：支持准星、小球颜色、辅助瞄准、训练时长、灵敏度、FPS 上限、命中特效和音效设置。
- 自定义音效系统：支持上传音频、裁剪片段、连续击中整合包、内置默认整合包和导入导出。
- 中英文国际化：内置 `zh-CN` 和 `en-US` 两套语言资源。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 构建工具 | Vite |
| 语言 | TypeScript |
| UI | React 19 |
| 路由 | React Router 7 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS 4 |
| 3D 渲染 | Three.js |
| 图表 | ECharts |
| 本地数据库 | Dexie / IndexedDB |
| 图标 | lucide-react |

## 快速开始

```bash
pnpm install
pnpm dev
```

## 项目结构

```text
src/
  app/                 路由入口和页面懒加载
  components/          通用 UI、首页组件、设置组件、图表组件
  i18n/                国际化 Provider 和语言资源
  lib/                 音效、整合包、工具函数等领域能力
  pages/               首页、模式选择、训练、历史、设置页面
  stores/              Zustand 全局设置状态
  styles/              全局样式
public/
  sounds/              内置命中特效音效
  default-combo-packs/ 内置连续击中整合包
  images/              静态图片资源
docs/                  系统功能、架构、实现和维护文档
scripts/               i18n 提取、同步和补齐脚本
```

## 数据存储

当前版本没有后端服务，所有数据都存储在浏览器本地：

- `localStorage`：训练设置、当前设置菜单、训练历史记录。
- `IndexedDB`：用户上传音频、音频片段数据和内置连续击中整合包。
- `public/`：内置音效、默认整合包和静态图片。

这让项目易于部署和离线使用，但也意味着训练数据不会跨设备同步。

## 文档

更多实现细节可以查看 `docs/`：

- [系统功能文档](./docs/system-features.md)
- [系统架构文档](./docs/system-architecture.md)
- [代码结构文档](./docs/code-structure.md)
- [技术细节实现文档](./docs/technical-implementation.md)
- [代码风格与维护规范](./docs/coding-style.md)
- [前后端分离迁移考虑文档](./docs/migration-considerations.md)

## 当前限制

- 当前主要面向桌面 Chrome 浏览器。
- 训练页依赖 Pointer Lock，移动端体验不是当前 MVP 重点。
- 目前没有账号体系、云同步、排行榜和服务端校验。
- 微调训练和跟枪训练已有入口与结构预留，核心训练体验仍以九宫格为主。

## 后续计划

- 完善微调训练和跟枪训练的独立玩法。
- 增加训练数据导入导出能力。
- 增加更多图表维度和训练复盘视图。
- 设计后端账号体系、云同步和排行榜。
- 增强移动端或非 Chrome 浏览器的兼容提示。

## 页面截图
<img width="2940" height="1676" alt="image" src="https://github.com/user-attachments/assets/7ea4838e-88b1-432e-970f-5aeca5e15d28" />
<img width="2940" height="1676" alt="image" src="https://github.com/user-attachments/assets/15ad77d4-a9bc-488b-b8ca-d055848d9ac9" />
<img width="2940" height="1676" alt="image" src="https://github.com/user-attachments/assets/8cad3d5b-3ca3-4897-9ba5-f90657e8b981" />

