import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FileAudio, ListMusic, Music2, Play, Trash2, Upload, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleField } from "@/components/settings/SettingsFields";
import { useTranslation } from "@/i18n";
import {
  createId,
  getSoundAssets,
  getSoundFileError,
  type ComboBreakBehavior,
  type ComboMusicMode,
  type ComboOverflowBehavior,
  type ComboResumeBehavior,
  type HitFeedbackSource,
  type MissFeedbackMode,
  type SoundAsset,
  type SoundClipRef,
  uploadSoundAsset,
} from "@/lib/soundAssets";
import { playSoundClip } from "@/lib/soundEngine";
import { cn } from "@/lib/utils";
import type { SoundSettings } from "@/stores/settingsStore";

interface SoundSettingsPanelProps {
  onChange: (settings: Partial<SoundSettings>) => void;
  sound: SoundSettings;
}

type AssetMap = Record<string, SoundAsset>;

export function SoundSettingsPanel({ onChange, sound }: SoundSettingsPanelProps) {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();
  const [assetMap, setAssetMap] = useState<AssetMap>({});
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const assetIds = useMemo(() => collectAssetIds(sound), [sound]);

  useEffect(() => {
    let isMounted = true;

    getSoundAssets(assetIds).then((assets) => {
      if (!isMounted) {
        return;
      }

      setAssetMap(
        assets.reduce<AssetMap>((next, asset) => {
          next[asset.id] = asset;
          return next;
        }, {}),
      );
    });

    return () => {
      isMounted = false;
    };
  }, [assetIds]);

  const updateCustom = (custom: SoundSettings["custom"]) => {
    onChange({ custom });
  };

  const uploadShortClip = async (file: File, target: "hit" | "miss") => {
    const error = getSoundFileError(file);
    if (error) {
      setMessage(error);
      return;
    }

    const key = `${target}_short`;
    setMessage("");
    setUploadProgress((progress) => ({ ...progress, [key]: 1 }));

    try {
      const asset = await uploadSoundAsset({
        file,
        onProgress: (progress) => setUploadProgress((current) => ({ ...current, [key]: progress })),
      });
      const clip: SoundClipRef = {
        assetId: asset.id,
        id: createId("clip"),
        note: "",
      };

      setAssetMap((current) => ({ ...current, [asset.id]: asset }));

      if (target === "hit") {
        updateCustom({
          ...sound.custom,
          hitFeedback: {
            ...sound.custom.hitFeedback,
            customClip: clip,
            enabled: true,
            source: "custom",
          },
        });
      } else {
        updateCustom({
          ...sound.custom,
          missFeedback: {
            ...sound.custom.missFeedback,
            customClip: clip,
            mode: "custom",
          },
        });
      }

      setMessage(t("messages.soundUploadSuccess", { defaultValue: "音频已保存。" }));
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? uploadError.message : "音频上传失败。");
    } finally {
      setUploadProgress((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  const uploadComboTrack = async (file: File) => {
    const error = getSoundFileError(file);
    if (error) {
      setMessage(error);
      return;
    }

    setMessage("");
    setUploadProgress((progress) => ({ ...progress, combo: 1 }));

    try {
      const asset = await uploadSoundAsset({
        file,
        onProgress: (progress) => setUploadProgress((current) => ({ ...current, combo: progress })),
      });

      setAssetMap((current) => ({ ...current, [asset.id]: asset }));
      updateCustom({
        ...sound.custom,
        comboMusic: {
          ...sound.custom.comboMusic,
          enabled: true,
          mode: "manualClips",
          sourceAssetId: asset.id,
        },
      });
      navigate(`/settings/sounds/editor/${asset.id}`);
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? uploadError.message : "完整音乐上传失败。");
    } finally {
      setUploadProgress((current) => {
        const next = { ...current };
        delete next.combo;
        return next;
      });
    }
  };

  const comboAsset = sound.custom.comboMusic.sourceAssetId
    ? assetMap[sound.custom.comboMusic.sourceAssetId]
    : null;

  return (
    <div className="grid gap-5">
      <ToggleField
        label={t("fields.soundEnabled", { defaultValue: "音效" })}
        description={t("fields.soundEnabledDescription", {
          defaultValue: "控制训练中的命中反馈、连击音乐和未命中提示。",
        })}
        checked={sound.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <ToggleField
        label={t("fields.customSoundEnabled", { defaultValue: "自定义音频" })}
        description={t("fields.customSoundEnabledDescription", {
          defaultValue: "启用命中短反馈、连击音乐和未命中反馈的自定义配置。",
        })}
        checked={sound.customEnabled}
        disabled={!sound.enabled}
        onChange={(customEnabled) => onChange({ customEnabled })}
      />
      <ToggleField
        label={t("fields.useHitEffectSound", { defaultValue: "使用击中特效音效" })}
        description={t("fields.useHitEffectSoundDescription", {
          defaultValue: "未启用自定义音频时，击中特效可播放自身音效。",
        })}
        checked={sound.useHitEffectSound}
        disabled={!sound.enabled || sound.customEnabled}
        onChange={(useHitEffectSound) => onChange({ useHitEffectSound })}
      />

      {sound.customEnabled && (
        <div className="grid gap-5">
          <PanelBlock
            icon={Volume2}
            title="命中反馈"
            description="普通命中的短音效。启用连击音乐后建议关闭，避免声音叠在一起。"
            disabled={!sound.enabled}
          >
            <ToggleField
              label="播放普通命中音效"
              description="关闭后，命中主要由连击音乐承担反馈。"
              checked={sound.custom.hitFeedback.enabled}
              disabled={!sound.enabled}
              onChange={(enabled) =>
                updateCustom({
                  ...sound.custom,
                  hitFeedback: {
                    ...sound.custom.hitFeedback,
                    enabled,
                  },
                })
              }
            />
            <SegmentedControl<HitFeedbackSource>
              disabled={!sound.enabled || !sound.custom.hitFeedback.enabled}
              options={[
                { label: "默认命中音效", value: "default" },
                { label: "自定义短音效", value: "custom" },
              ]}
              value={sound.custom.hitFeedback.source}
              onChange={(source) =>
                updateCustom({
                  ...sound.custom,
                  hitFeedback: {
                    ...sound.custom.hitFeedback,
                    source,
                  },
                })
              }
            />
            {sound.custom.hitFeedback.source === "custom" && (
              <div className="grid gap-3">
                <ClipRow
                  assetMap={assetMap}
                  clip={sound.custom.hitFeedback.customClip}
                  emptyLabel="还没有自定义命中短音效"
                  onClear={() =>
                    updateCustom({
                      ...sound.custom,
                      hitFeedback: {
                        ...sound.custom.hitFeedback,
                        customClip: null,
                      },
                    })
                  }
                  onPlay={(clip) => void playSoundClip(clip)}
                />
                <UploadButton
                  disabled={!sound.enabled || !sound.custom.hitFeedback.enabled}
                  label="上传命中短音效"
                  onFile={(file) => void uploadShortClip(file, "hit")}
                />
                {typeof uploadProgress.hit_short === "number" && <ProgressBar value={uploadProgress.hit_short} />}
              </div>
            )}
            <ToggleField
              label="连击音乐播放时叠加命中音效"
              description="默认关闭；开启后每次命中仍会播放普通命中短音效。"
              checked={sound.custom.hitFeedback.playWithComboMusic}
              disabled={!sound.enabled || !sound.custom.hitFeedback.enabled}
              onChange={(playWithComboMusic) =>
                updateCustom({
                  ...sound.custom,
                  hitFeedback: {
                    ...sound.custom.hitFeedback,
                    playWithComboMusic,
                  },
                })
              }
            />
          </PanelBlock>

          <PanelBlock
            icon={Music2}
            title="连击音乐"
            description="连续命中时播放音乐。未命中会中断连击，并按规则重置、暂停或停止音乐。"
            disabled={!sound.enabled}
          >
            <ToggleField
              label="启用连击音乐"
              description="开启后，连续命中会驱动完整音乐或手动拆分的第 n 击片段。"
              checked={sound.custom.comboMusic.enabled}
              disabled={!sound.enabled}
              onChange={(enabled) =>
                updateCustom({
                  ...sound.custom,
                  comboMusic: {
                    ...sound.custom.comboMusic,
                    enabled,
                  },
                })
              }
            />
            <div className="grid gap-3">
              <AssetRow asset={comboAsset} emptyLabel="还没有上传连击音乐" />
              <div className="flex flex-wrap gap-2">
                <UploadButton
                  disabled={!sound.enabled}
                  label={comboAsset ? "替换完整音乐" : "上传完整音乐"}
                  onFile={(file) => void uploadComboTrack(file)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!sound.enabled || !sound.custom.comboMusic.sourceAssetId}
                  onClick={() => navigate(`/settings/sounds/editor/${sound.custom.comboMusic.sourceAssetId}`)}
                >
                  <ListMusic className="h-4 w-4" />
                  编辑连击片段
                </Button>
              </div>
              {typeof uploadProgress.combo === "number" && <ProgressBar value={uploadProgress.combo} />}
            </div>
            <SegmentedControl<ComboMusicMode>
              disabled={!sound.enabled || !sound.custom.comboMusic.enabled}
              options={[
                { label: "完整音乐", value: "fullTrack" },
                { label: "手动拆分片段", value: "manualClips" },
              ]}
              value={sound.custom.comboMusic.mode}
              onChange={(mode) =>
                updateCustom({
                  ...sound.custom,
                  comboMusic: {
                    ...sound.custom.comboMusic,
                    mode,
                  },
                })
              }
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField<ComboBreakBehavior>
                disabled={!sound.enabled || !sound.custom.comboMusic.enabled}
                label="未命中时"
                options={[
                  { label: "重头开始", value: "restart" },
                  { label: "暂停并保留进度", value: "pause" },
                  { label: "停止并静音", value: "stop" },
                ]}
                value={sound.custom.comboMusic.breakBehavior}
                onChange={(breakBehavior) =>
                  updateCustom({
                    ...sound.custom,
                    comboMusic: {
                      ...sound.custom.comboMusic,
                      breakBehavior,
                    },
                  })
                }
              />
              <SelectField<ComboResumeBehavior>
                disabled={!sound.enabled || !sound.custom.comboMusic.enabled}
                label="连击恢复时"
                options={[
                  { label: "从头播放", value: "fromStart" },
                  { label: "从暂停位置继续", value: "fromPausedPosition" },
                ]}
                value={sound.custom.comboMusic.resumeBehavior}
                onChange={(resumeBehavior) =>
                  updateCustom({
                    ...sound.custom,
                    comboMusic: {
                      ...sound.custom.comboMusic,
                      resumeBehavior,
                    },
                  })
                }
              />
              <SelectField<ComboOverflowBehavior>
                disabled={!sound.enabled || !sound.custom.comboMusic.enabled || sound.custom.comboMusic.mode !== "manualClips"}
                label="超过最后片段"
                options={[
                  { label: "沿用最后片段", value: "holdLast" },
                  { label: "循环片段", value: "loop" },
                  { label: "继续完整音乐", value: "continueFullTrack" },
                  { label: "不播放", value: "silent" },
                ]}
                value={sound.custom.comboMusic.overflowBehavior}
                onChange={(overflowBehavior) =>
                  updateCustom({
                    ...sound.custom,
                    comboMusic: {
                      ...sound.custom.comboMusic,
                      overflowBehavior,
                    },
                  })
                }
              />
              <label className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                <span className="text-xs text-muted-foreground">连击音乐音量</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={!sound.enabled || !sound.custom.comboMusic.enabled}
                  value={sound.custom.comboMusic.volume}
                  onChange={(event) =>
                    updateCustom({
                      ...sound.custom,
                      comboMusic: {
                        ...sound.custom.comboMusic,
                        volume: Number(event.target.value),
                      },
                    })
                  }
                  className="h-2 w-full accent-primary disabled:cursor-not-allowed"
                />
              </label>
            </div>
            <p className="rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">
              {sound.custom.comboMusic.mode === "fullTrack"
                ? "完整音乐模式下，第一次命中开始播放，后续连续命中不会重新触发，音乐会自然推进。"
                : `手动拆分模式下，当前有 ${sound.custom.comboMusic.clips.length} 个连击片段，连续命中会按第 1 击、第 2 击到第 n 击播放。`}
            </p>
          </PanelBlock>

          <PanelBlock
            icon={XCircle}
            title="未命中反馈"
            description="击不中时播放一个短提示音，也可以完全关闭。未命中不再支持连续音效。"
            disabled={!sound.enabled}
          >
            <SegmentedControl<MissFeedbackMode>
              disabled={!sound.enabled}
              options={[
                { label: "不播放", value: "none" },
                { label: "默认提示", value: "default" },
                { label: "自定义短音效", value: "custom" },
              ]}
              value={sound.custom.missFeedback.mode}
              onChange={(mode) =>
                updateCustom({
                  ...sound.custom,
                  missFeedback: {
                    ...sound.custom.missFeedback,
                    mode,
                  },
                })
              }
            />
            {sound.custom.missFeedback.mode === "custom" && (
              <div className="grid gap-3">
                <ClipRow
                  assetMap={assetMap}
                  clip={sound.custom.missFeedback.customClip}
                  emptyLabel="还没有自定义未命中短音效"
                  onClear={() =>
                    updateCustom({
                      ...sound.custom,
                      missFeedback: {
                        ...sound.custom.missFeedback,
                        customClip: null,
                      },
                    })
                  }
                  onPlay={(clip) => void playSoundClip(clip, sound.custom.missFeedback.volume)}
                />
                <UploadButton
                  disabled={!sound.enabled}
                  label="上传未命中短音效"
                  onFile={(file) => void uploadShortClip(file, "miss")}
                />
                {typeof uploadProgress.miss_short === "number" && <ProgressBar value={uploadProgress.miss_short} />}
              </div>
            )}
          </PanelBlock>
        </div>
      )}

      {message && (
        <p className="rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

function PanelBlock({
  children,
  description,
  disabled,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  disabled: boolean;
  icon: typeof Volume2;
  title: string;
}) {
  return (
    <div className={cn("grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-5", disabled && "opacity-55")}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function ClipRow({
  assetMap,
  clip,
  emptyLabel,
  onClear,
  onPlay,
}: {
  assetMap: AssetMap;
  clip: SoundClipRef | null;
  emptyLabel: string;
  onClear: () => void;
  onPlay: (clip: SoundClipRef) => void;
}) {
  const asset = clip ? assetMap[clip.assetId] : null;

  return (
    <div className="flex min-h-12 flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileAudio className="h-4 w-4 text-primary" />
          <span className="truncate">{asset?.name ?? emptyLabel}</span>
        </div>
        {clip && (
          <div className="mt-1 text-xs text-muted-foreground">
            {formatClipRange(clip, asset)}
            {clip.note ? ` · ${clip.note}` : ""}
          </div>
        )}
      </div>
      {clip && (
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => onPlay(clip)} title="播放">
            <Play className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" onClick={onClear} title="移除">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AssetRow({ asset, emptyLabel }: { asset?: SoundAsset | null; emptyLabel: string }) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <Music2 className="h-4 w-4 text-primary" />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{asset?.name ?? emptyLabel}</div>
        {asset && <div className="mt-1 text-xs text-muted-foreground">{formatMs(asset.durationMs)}</div>}
      </div>
    </div>
  );
}

function UploadButton({
  disabled = false,
  label,
  onFile,
}: {
  disabled?: boolean;
  label: string;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium transition-all hover:border-white/20 hover:bg-white/[0.06]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Upload className="h-4 w-4" />
      {label}
      <input
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onFile(file);
          }
        }}
        className="sr-only"
      />
    </label>
  );
}

function SegmentedControl<T extends string>({
  disabled = false,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className={cn("flex flex-wrap rounded-xl border border-white/10 bg-white/[0.03] p-1", disabled && "opacity-55")}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 rounded-lg px-3 text-sm transition-all",
            option.value === value
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
            disabled && "cursor-not-allowed",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SelectField<T extends string>({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <label className={cn("grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm", disabled && "opacity-55")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${value}%` }} />
    </div>
  );
}

function collectAssetIds(sound: SoundSettings) {
  return [
    sound.custom.hitFeedback.customClip?.assetId,
    sound.custom.missFeedback.customClip?.assetId,
    sound.custom.comboMusic.sourceAssetId,
  ].filter((id): id is string => Boolean(id));
}

function formatClipRange(clip: SoundClipRef, asset?: SoundAsset | null) {
  const start = clip.startMs ?? 0;
  const end = clip.endMs ?? asset?.durationMs;
  if (typeof end !== "number") {
    return "完整音频";
  }

  return `${formatMs(start)} - ${formatMs(end)}`;
}

function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}
