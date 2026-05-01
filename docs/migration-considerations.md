# Aim Trainer 前后端分离迁移考虑文档

## 1. 当前系统边界

当前项目是纯前端本地应用，没有后端、账号、远程数据库和对象存储。

当前本地数据：

- 设置：`localStorage: aim-trainer-settings`
- 设置页菜单记忆：`localStorage: aim-trainer-active-settings-section`
- 训练历史：`localStorage: aim-trainer:training-history:v1`
- 音频素材：IndexedDB `aim-trainer-sounds.soundAssets`

迁移到前后端分离时，不建议一次性把所有本地逻辑搬到服务端。训练过程必须继续在前端本地实时运行，否则网络延迟会影响命中判定和训练体验。

## 2. 迁移目标架构

建议目标：

```text
React 前端
  |
  |-- Auth API
  |-- Settings API
  |-- Training History API
  |-- Sound Asset API
  |-- Combo Pack API
  |
后端服务
  |
  |-- 关系型数据库 / 文档数据库
  |-- 对象存储
  |-- 缓存 / 队列（可选）
```

前端继续负责：

- 训练实时运行。
- Three.js 渲染。
- Pointer Lock 输入。
- 本地音频播放。
- 训练中即时统计。

后端负责：

- 用户身份。
- 设置云同步。
- 训练历史持久化。
- 音频素材存储。
- 整合包管理。
- 排行榜和分享能力。
- 服务端数据校验。

## 3. 数据模型建议

### 3.1 User

```text
User
  id
  email / thirdPartyProvider
  displayName
  avatarUrl
  createdAt
  updatedAt
```

### 3.2 SettingsProfile

```text
SettingsProfile
  id
  userId
  name
  isDefault
  schemaVersion
  settingsJson
  createdAt
  updatedAt
```

说明：

- MVP 可以只有一套默认设置。
- 后续可以扩展多套配置，如“压枪训练配置”“甩枪训练配置”。
- `settingsJson` 可以先保存完整 JSON，稳定后再拆字段。

### 3.3 TrainingSession

```text
TrainingSession
  id
  userId
  modeId
  modeName
  completedAt
  durationSeconds
  score
  hits
  misses
  shots
  accuracy
  averageReactionMs
  timelineJson
  settingsSnapshotJson
  clientVersion
  createdAt
```

建议保存 `settingsSnapshotJson`，这样历史记录可以还原当时的训练环境。

### 3.4 SoundAsset

```text
SoundAsset
  id
  userId
  name
  mimeType
  size
  durationMs
  waveformPeaksJson
  objectKey
  checksum
  createdAt
```

音频 Blob 应放对象存储，数据库只保存元数据和对象 key。

### 3.5 ComboSoundPack

```text
ComboSoundPack
  id
  userId
  name
  sourceAssetId
  builtIn
  clipsJson
  updatedAt
  createdAt
```

说明：

- `builtIn` 用于区分系统默认整合包和用户自定义整合包。
- 服务端落地后，内置整合包可以作为公共模板下发，用户编辑时再 fork 成个人副本。

如果需要分享整合包，可以增加：

- `visibility`
- `shareCode`
- `forkedFromPackId`

## 4. API 设计建议

### 4.1 设置 API

```text
GET    /api/settings/default
PUT    /api/settings/default
GET    /api/settings/profiles
POST   /api/settings/profiles
PUT    /api/settings/profiles/:id
DELETE /api/settings/profiles/:id
```

前期可以只实现默认设置：

- 登录后拉取远端设置。
- 本地修改后 debounce 保存。
- 离线时写入本地队列，恢复网络后同步。

### 4.2 训练历史 API

```text
GET  /api/training-sessions
POST /api/training-sessions
GET  /api/training-sessions/:id
```

查询参数：

- `modeId`
- `startDate`
- `endDate`
- `page`
- `pageSize`

训练结束后前端提交完整结果。后端应做基础校验，但不建议在早期尝试完全防作弊，因为训练过程全部在客户端运行。

### 4.3 音频素材 API

```text
POST   /api/sound-assets/upload-url
POST   /api/sound-assets
GET    /api/sound-assets
GET    /api/sound-assets/:id/download-url
DELETE /api/sound-assets/:id
```

推荐使用预签名 URL 上传到对象存储：

1. 前端请求上传 URL。
2. 前端直传对象存储。
3. 前端提交素材元数据。
4. 后端校验并创建记录。

### 4.4 整合包 API

```text
GET    /api/combo-packs
POST   /api/combo-packs
PUT    /api/combo-packs/:id
DELETE /api/combo-packs/:id
POST   /api/combo-packs/:id/export
POST   /api/combo-packs/import
```

整合包导入导出也可以继续在前端完成，后端只保存最终 pack 和 asset。

## 5. 前端改造步骤

### 5.1 第一步：抽 Repository

先不要直接在组件里调用 fetch。建议先抽象接口：

```text
SettingsRepository
TrainingHistoryRepository
SoundAssetRepository
ComboPackRepository
```

当前实现可以仍然是 localStorage / IndexedDB。等后端 API 稳定后，再替换为 HTTP 实现。

### 5.2 第二步：增加用户会话层

新增：

- `authStore`
- `AuthProvider`
- 登录态恢复逻辑。
- 未登录时继续允许本地训练。

建议保留“游客模式”，降低使用门槛。

### 5.3 第三步：设置同步

设置同步策略：

- 启动时加载本地设置。
- 登录后拉远端设置。
- 若本地有未同步变更，提示合并或覆盖。
- 保存时先写本地，再异步写远端。

冲突处理：

- 简单方案：远端 `updatedAt` 新则覆盖。
- 更好方案：按设置域合并，如 `crosshair`、`sound`、`training` 分别比较。

### 5.4 第四步：历史记录同步

历史记录是 append-only 数据，迁移相对简单：

- 本地记录增加 `syncStatus`。
- 训练完成先写本地。
- 后台提交到后端。
- 成功后写入远端 id。
- 失败时保留待重试。

### 5.5 第五步：音频素材同步

音频迁移最复杂，需要建立本地 id 到远端 id 的映射。

流程：

1. 扫描 IndexedDB 素材。
2. 计算 checksum。
3. 上传未存在素材。
4. 获取远端 asset id。
5. 更新设置和整合包引用。
6. 保留本地缓存用于训练即时播放。

## 6. 本地数据迁移流程

用户首次登录后：

1. 检测 localStorage 和 IndexedDB 是否有本地数据。
2. 展示“导入本地数据到账号”的确认。
3. 上传音频素材。
4. 转换设置中的 `assetId`。
5. 上传设置。
6. 批量上传训练历史。
7. 标记迁移完成。

不建议迁移后立即清空本地数据。可以只写入：

```text
aim-trainer:migration:<userId>:completed = true
```

以便出现问题时仍可恢复。

## 7. 服务端校验

### 7.1 设置校验

- 枚举值必须合法。
- 数值必须在允许范围内。
- 颜色必须是 hex。
- 音频引用必须属于当前用户。

### 7.2 训练记录校验

- `shots = hits + misses`。
- `accuracy` 与 hits/shots 不能明显不一致。
- `durationSeconds` 在允许范围内。
- `timeline` 长度和训练时长匹配。
- `averageReactionMs` 合理。

### 7.3 音频校验

- 文件大小限制。
- MIME 类型限制。
- 后端可二次探测音频时长。
- 用户总容量限制。
- 防止用户引用他人素材。

### 7.4 整合包校验

- clip 数量限制。
- `startMs >= 0`。
- `endMs > startMs`。
- `endMs <= durationMs`。
- index 不重复或服务端重新排序。

## 8. 离线与缓存

训练体验不应依赖网络。建议：

- 最近使用的设置本地缓存。
- 最近使用的音频 Blob 本地缓存。
- 训练历史先本地保存。
- 网络恢复后后台同步。

如果引入 Service Worker，可缓存静态资源和内置音效，但训练数据同步仍应由应用层管理。

## 9. 安全考虑

- 音频上传需要鉴权。
- 对象存储下载 URL 应短期有效。
- 服务端不能相信客户端提交的 userId，应从 token 解析。
- 训练成绩存在作弊可能，排行榜需要额外风控。
- 用户删除素材时，需要检查是否仍被整合包或设置引用。

## 10. 推荐迁移顺序

1. 抽 repository，不改变功能。
2. 增加 auth 和用户模型。
3. 接入设置云同步。
4. 接入训练历史云同步。
5. 接入音频素材上传。
6. 接入整合包云同步。
7. 增加排行榜、分享和多设备能力。

这个顺序能最大限度降低对训练核心体验的影响。
