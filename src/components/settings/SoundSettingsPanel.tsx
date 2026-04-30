import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, FileAudio, Music2, Pencil, Play, Trash2, Upload, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleField } from "@/components/settings/SettingsFields";
import { useTranslation } from "@/i18n";
import {
  createId,
  getSoundAssets,
  getSoundFileError,
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
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
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
          comboMusic: {
            ...sound.custom.comboMusic,
            enabled: false,
          },
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
          activePackId: null,
          clips: [],
          enabled: true,
          mode: "manualClips",
          overflowBehavior: "restart",
          sourceAssetId: asset.id,
        },
        hitFeedback: {
          ...sound.custom.hitFeedback,
          enabled: false,
          playWithComboMusic: false,
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

  const activePack =
    sound.custom.comboMusic.packs.find((pack) => pack.id === sound.custom.comboMusic.activePackId) ??
    sound.custom.comboMusic.packs.find((pack) => pack.sourceAssetId === sound.custom.comboMusic.sourceAssetId) ??
    null;
  const activePackId = activePack?.id ?? sound.custom.comboMusic.activePackId;
  const comboAsset = sound.custom.comboMusic.sourceAssetId
    ? assetMap[sound.custom.comboMusic.sourceAssetId]
    : activePack
      ? assetMap[activePack.sourceAssetId]
      : null;
  const setCustomEnabled = (customEnabled: boolean) => {
    onChange({
      customEnabled,
      useHitEffectSound: customEnabled ? false : sound.useHitEffectSound,
    });
  };
  const setSingleHitEnabled = (enabled: boolean) => {
    updateCustom({
      ...sound.custom,
      comboMusic: {
        ...sound.custom.comboMusic,
        enabled: enabled ? false : sound.custom.comboMusic.enabled,
      },
      hitFeedback: {
        ...sound.custom.hitFeedback,
        enabled,
        playWithComboMusic: false,
      },
    });
  };
  const setComboEnabled = (enabled: boolean) => {
    updateCustom({
      ...sound.custom,
      comboMusic: {
        ...sound.custom.comboMusic,
        enabled,
        mode: "manualClips",
        overflowBehavior: "restart",
      },
      hitFeedback: {
        ...sound.custom.hitFeedback,
        enabled: enabled ? false : sound.custom.hitFeedback.enabled,
        playWithComboMusic: false,
      },
    });
  };
  const selectPack = (packId: string) => {
    const pack = sound.custom.comboMusic.packs.find((item) => item.id === packId);
    if (!pack) {
      return;
    }

    onChange({
      custom: {
        ...sound.custom,
        comboMusic: {
          ...sound.custom.comboMusic,
          activePackId: pack.id,
          clips: pack.clips,
          enabled: true,
          mode: "manualClips",
          overflowBehavior: "restart",
          sourceAssetId: pack.sourceAssetId,
        },
        hitFeedback: {
          ...sound.custom.hitFeedback,
          enabled: false,
          playWithComboMusic: false,
        },
      },
      customEnabled: true,
      enabled: true,
    });
    setConfirmingDeleteId(null);
  };
  const deletePack = (packId: string) => {
    if (confirmingDeleteId !== packId) {
      setConfirmingDeleteId(packId);
      return;
    }

    const packs = sound.custom.comboMusic.packs.filter((pack) => pack.id !== packId);
    const nextActivePack = activePackId === packId ? (packs[0] ?? null) : (packs.find((pack) => pack.id === activePackId) ?? null);

    updateCustom({
      ...sound.custom,
      comboMusic: {
        ...sound.custom.comboMusic,
        activePackId: nextActivePack?.id ?? null,
        clips: nextActivePack?.clips ?? [],
        enabled: nextActivePack ? sound.custom.comboMusic.enabled : false,
        packs,
        sourceAssetId: nextActivePack?.sourceAssetId ?? null,
      },
    });
    setConfirmingDeleteId(null);
  };
  const deleteCurrentComboAsset = () => {
    const sourceAssetId = sound.custom.comboMusic.sourceAssetId;
    if (!sourceAssetId) {
      return;
    }

    const confirmId = `asset:${sourceAssetId}`;
    if (confirmingDeleteId !== confirmId) {
      setConfirmingDeleteId(confirmId);
      return;
    }

    const packs = sound.custom.comboMusic.packs.filter((pack) => pack.sourceAssetId !== sourceAssetId);
    const nextActivePack = packs[0] ?? null;

    updateCustom({
      ...sound.custom,
      comboMusic: {
        ...sound.custom.comboMusic,
        activePackId: nextActivePack?.id ?? null,
        clips: nextActivePack?.clips ?? [],
        enabled: Boolean(nextActivePack) && sound.custom.comboMusic.enabled,
        packs,
        sourceAssetId: nextActivePack?.sourceAssetId ?? null,
      },
    });
    setConfirmingDeleteId(null);
  };
  const editCurrentComboAsset = () => {
    const sourceAssetId = sound.custom.comboMusic.sourceAssetId;
    if (!sourceAssetId) {
      return;
    }

    const packId = activePack?.sourceAssetId === sourceAssetId ? `?packId=${activePack.id}` : "";
    setConfirmingDeleteId(null);
    navigate(`/settings/sounds/editor/${sourceAssetId}${packId}`);
  };
  const editShortClip = (target: "hit" | "miss", clip: SoundClipRef | null) => {
    if (!clip) {
      return;
    }

    setConfirmingDeleteId(null);
    navigate(`/settings/sounds/editor/${clip.assetId}?target=${target}`);
  };

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
        label="默认音效"
        description="使用系统内置命中反馈。只有默认音效开启时，击中特效音效才可使用。"
        checked={!sound.customEnabled}
        disabled={!sound.enabled}
        onChange={(checked) => setCustomEnabled(!checked)}
      />
      <ToggleField
        label={t("fields.customSoundEnabled", { defaultValue: "自定义音效" })}
        description={t("fields.customSoundEnabledDescription", {
          defaultValue: "使用自定义命中、连续命中和未命中音效。",
        })}
        checked={sound.customEnabled}
        disabled={!sound.enabled}
        onChange={setCustomEnabled}
      />
      {!sound.customEnabled && (
        <ToggleField
          label={t("fields.useHitEffectSound", { defaultValue: "使用击中特效音效" })}
          description={t("fields.useHitEffectSoundDescription", {
            defaultValue: "默认音效开启时，击中特效可播放对应的效果音。",
          })}
          checked={sound.useHitEffectSound}
          disabled={!sound.enabled}
          onChange={(useHitEffectSound) => onChange({ useHitEffectSound })}
        />
      )}

      {sound.customEnabled && (
        <div className="grid gap-5">
          <PanelBlock
            icon={Volume2}
            title="击中音效"
            description="击中音效支持单次击中短音效，也可以选择连续击中整合包。"
            disabled={!sound.enabled}
          >
            <ToggleField
              label="单次击中音效"
              description="每次命中播放一个短音效。"
              checked={sound.custom.hitFeedback.enabled}
              disabled={!sound.enabled}
              onChange={setSingleHitEnabled}
            />
            <SegmentedControl<HitFeedbackSource>
              disabled={!sound.enabled || !sound.custom.hitFeedback.enabled}
              options={[
                { label: "默认", value: "default" },
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
                  onEdit={() => editShortClip("hit", sound.custom.hitFeedback.customClip)}
                  onPlay={(clip) => void playSoundClip(clip)}
                />
                <UploadButton
                  disabled={!sound.enabled || !sound.custom.hitFeedback.enabled}
                  label="上传单次击中音效"
                  onFile={(file) => void uploadShortClip(file, "hit")}
                />
                {typeof uploadProgress.hit_short === "number" && <ProgressBar value={uploadProgress.hit_short} />}
              </div>
            )}
          </PanelBlock>

          <PanelBlock
            icon={Music2}
            title="连续击中音效"
            description="选择已经编辑好的整合包使用；添加或编辑整合包会进入音效编辑页面。"
            disabled={!sound.enabled}
          >
            <ToggleField
              label="启用连续击中音效"
              description="开启后，连续命中会按第 1 段、第 2 段到第 n 段播放。"
              checked={sound.custom.comboMusic.enabled}
              disabled={!sound.enabled}
              onChange={setComboEnabled}
            />
            <div className="grid gap-3">
              {sound.custom.comboMusic.packs.length === 0 && (
                <ComboAssetCard
                  asset={comboAsset}
                  confirmDeleteId={sound.custom.comboMusic.sourceAssetId ? `asset:${sound.custom.comboMusic.sourceAssetId}` : null}
                  emptyLabel="还没有选择连续击中整合包"
                  isConfirmingDelete={
                    Boolean(sound.custom.comboMusic.sourceAssetId) &&
                    confirmingDeleteId === `asset:${sound.custom.comboMusic.sourceAssetId}`
                  }
                  onDelete={deleteCurrentComboAsset}
                  onEdit={editCurrentComboAsset}
                />
              )}
              {sound.custom.comboMusic.packs.length > 0 && (
                <div className="grid gap-2">
                  {sound.custom.comboMusic.packs.map((pack) => (
                    <div
                      key={pack.id}
                      className={cn(
                        "grid min-h-12 gap-3 rounded-xl border p-3",
                        pack.id === activePackId
                          ? "border-primary/35 bg-primary/10"
                          : "border-white/10 bg-black/20",
                      )}
                    >
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,auto)] xl:items-center">
                        <button type="button" className="min-w-0 text-left" onClick={() => selectPack(pack.id)}>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {pack.id === activePackId && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            <span className="truncate">{pack.name}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {pack.clips.length} 段音效
                          </div>
                        </button>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="button"
                            variant={pack.id === activePackId ? "default" : "outline"}
                            className="min-w-0 px-2"
                            onClick={() => selectPack(pack.id)}
                            title={pack.id === activePackId ? "当前整合包" : "切换到此整合包"}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {pack.id === activePackId ? "已选中" : "选中"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!sound.enabled}
                            onClick={() => {
                              setConfirmingDeleteId(null);
                              navigate(`/settings/sounds/editor/${pack.sourceAssetId}?packId=${pack.id}`);
                            }}
                            title="编辑整合包"
                            className="min-w-0 px-2"
                          >
                            <Pencil className="h-4 w-4" />
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onBlur={() => {
                              if (confirmingDeleteId === pack.id) {
                                setConfirmingDeleteId(null);
                              }
                            }}
                            onClick={() => deletePack(pack.id)}
                            title={confirmingDeleteId === pack.id ? "再次点击确认删除" : "删除整合包"}
                            className={cn(
                              "min-w-0 px-2",
                              confirmingDeleteId === pack.id && "border-red-400/40 bg-red-500/12 text-red-100 hover:bg-red-500/18",
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                            {confirmingDeleteId === pack.id ? "确认删除" : "删除"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <UploadButton
                  disabled={!sound.enabled}
                  label="添加音效"
                  onFile={(file) => void uploadComboTrack(file)}
                />
              </div>
              {typeof uploadProgress.combo === "number" && <ProgressBar value={uploadProgress.combo} />}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField
                label="未命中时是否重头播放"
                description="开启后未命中会清空连击进度；关闭后会暂停并从暂停处继续。"
                checked={sound.custom.comboMusic.breakBehavior === "restart"}
                disabled={!sound.enabled || !sound.custom.comboMusic.enabled}
                onChange={(restartOnMiss) =>
                  updateCustom({
                    ...sound.custom,
                    comboMusic: {
                      ...sound.custom.comboMusic,
                      breakBehavior: restartOnMiss ? "restart" : "pause",
                      resumeBehavior: restartOnMiss ? "fromStart" : "fromPausedPosition",
                    },
                  })
                }
              />
              <label className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                <span className="text-xs text-muted-foreground">连续击中音量</span>
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
              当前整合包有 {sound.custom.comboMusic.clips.length} 段音效，连续命中会按第 1 段、第 2 段到第 n 段播放；超过最后一段后默认从第 1 段重新开始。
            </p>
          </PanelBlock>

          <PanelBlock
            icon={XCircle}
            title="非击中音效"
            description="非击中音效只支持单次短音效，不支持连续击中整合包。"
            disabled={!sound.enabled}
          >
            <SegmentedControl<MissFeedbackMode>
              disabled={!sound.enabled}
              options={[
                { label: "不播放", value: "none" },
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
                  onEdit={() => editShortClip("miss", sound.custom.missFeedback.customClip)}
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
  onEdit,
  onPlay,
}: {
  assetMap: AssetMap;
  clip: SoundClipRef | null;
  emptyLabel: string;
  onClear: () => void;
  onEdit?: () => void;
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
          {onEdit && (
            <Button type="button" variant="outline" onClick={onEdit} title="编辑音效">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClear} title="移除">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ComboAssetCard({
  asset,
  confirmDeleteId,
  emptyLabel,
  isConfirmingDelete,
  onDelete,
  onEdit,
}: {
  asset?: SoundAsset | null;
  confirmDeleteId: string | null;
  emptyLabel: string;
  isConfirmingDelete: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="grid min-h-12 gap-3 rounded-xl border border-white/10 bg-black/20 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Music2 className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{asset?.name ?? emptyLabel}</div>
          {asset && <div className="mt-1 text-xs text-muted-foreground">{formatMs(asset.durationMs)}</div>}
        </div>
      </div>
      {asset && (
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button type="button" variant="outline" onClick={onEdit} title="编辑整合包" className="min-w-20">
            <Pencil className="h-4 w-4" />
            编辑
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!confirmDeleteId}
            onBlur={() => undefined}
            onClick={onDelete}
            title={isConfirmingDelete ? "再次点击确认删除" : "删除整合包"}
            className={cn(
              "min-w-20",
              isConfirmingDelete && "border-red-400/40 bg-red-500/12 text-red-100 hover:bg-red-500/18",
            )}
          >
            <Trash2 className="h-4 w-4" />
            {isConfirmingDelete ? "确认删除" : "删除"}
          </Button>
        </div>
      )}
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        {label}
      </Button>
      <input
        ref={inputRef}
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
        className="hidden"
      />
    </>
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
    ...sound.custom.comboMusic.packs.map((pack) => pack.sourceAssetId),
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
