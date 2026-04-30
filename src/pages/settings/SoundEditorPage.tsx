import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Pause, Play, Save, Scissors, Trash2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { createId, getSoundAsset, type ComboMusicClip, type SoundAsset, type SoundClipRef } from "@/lib/soundAssets";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";

type DragMode = "create" | "left" | "right" | "move";
type ShortClipTarget = "hit" | "miss";

interface DraftClip extends ComboMusicClip {}

const minClipMs = 20;
const activeSettingsSectionKey = "aim-trainer-active-settings-section";

export function SoundEditorPage() {
  const { assetId } = useParams();
  const [searchParams] = useSearchParams();
  const packId = searchParams.get("packId");
  const shortClipTarget = readShortClipTarget(searchParams.get("target"));
  const isShortClipEditor = Boolean(shortClipTarget);
  const navigate = useNavigate();
  const sound = useSettingsStore((state) => state.sound);
  const setSound = useSettingsStore((state) => state.setSound);
  const shortClip =
    shortClipTarget === "hit"
      ? sound.custom.hitFeedback.customClip
      : shortClipTarget === "miss"
        ? sound.custom.missFeedback.customClip
        : null;
  const [asset, setAsset] = useState<SoundAsset | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<DraftClip | null>(null);
  const [packageName, setPackageName] = useState("");
  const [savedDrafts, setSavedDrafts] = useState<DraftClip[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [zoom, setZoom] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pendingCreateRef = useRef<{ clientX: number; startMs: number } | null>(null);
  const dragRef = useRef<{ mode: DragMode; originMs: number; original?: DraftClip } | null>(null);
  const hasDraggedRef = useRef(false);
  const playTokenRef = useRef(0);
  const scrollSyncFrameRef = useRef<number | null>(null);
  const suppressWaveformClickRef = useRef(false);

  useEffect(() => {
    if (!assetId) {
      setError("缺少音频 ID。");
      return;
    }

    let isMounted = true;

    getSoundAsset(assetId).then((nextAsset) => {
      if (!isMounted) {
        return;
      }

      if (!nextAsset) {
        setError("没有找到这段音乐。");
        return;
      }

      const objectUrl = URL.createObjectURL(nextAsset.blob);
      objectUrlRef.current = objectUrl;
      setAsset(nextAsset);
      audioRef.current = new Audio(objectUrl);
    });

    return () => {
      isMounted = false;
      audioRef.current?.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [assetId]);

  useEffect(() => {
    if (isShortClipEditor) {
      return;
    }

    const requestedPack = packId ? sound.custom.comboMusic.packs.find((item) => item.id === packId) : null;
    if (requestedPack) {
      setSavedDrafts(requestedPack.clips);
      setPackageName(requestedPack.name);
      return;
    }

    if (!assetId || sound.custom.comboMusic.sourceAssetId !== assetId) {
      const pack = sound.custom.comboMusic.packs.find((item) => item.sourceAssetId === assetId);
      if (pack) {
        setSavedDrafts(pack.clips);
        setPackageName(pack.name);
      }
      return;
    }

    const pack = sound.custom.comboMusic.packs.find((item) => item.id === sound.custom.comboMusic.activePackId);
    setSavedDrafts(pack?.clips ?? sound.custom.comboMusic.clips);
    setPackageName(pack?.name ?? "");
  }, [
    assetId,
    isShortClipEditor,
    packId,
    sound.custom.comboMusic.activePackId,
    sound.custom.comboMusic.clips,
    sound.custom.comboMusic.packs,
    sound.custom.comboMusic.sourceAssetId,
  ]);

  useEffect(() => {
    if (!isShortClipEditor || !asset || !assetId) {
      return;
    }

    setSavedDrafts([]);
    setPackageName("");
    setSelectedSavedId(null);
    setDraft(
      normalizeClip(
        {
          endMs: shortClip?.endMs ?? asset.durationMs,
          id: shortClip?.id ?? createId("clip"),
          index: 1,
          note: shortClip?.note ?? "",
          startMs: shortClip?.startMs ?? 0,
        },
        asset.durationMs,
      ),
    );
  }, [
    asset,
    assetId,
    isShortClipEditor,
    shortClip?.endMs,
    shortClip?.id,
    shortClip?.note,
    shortClip?.startMs,
  ]);

  const sortedDrafts = useMemo(
    () => [...savedDrafts].sort((first, second) => first.index - second.index),
    [savedDrafts],
  );

  const stopAudio = () => {
    playTokenRef.current += 1;
    audioRef.current?.pause();
    setPlayingId(null);
  };

  const playRange = (id: string, startMs: number, endMs?: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (playingId === id) {
      stopAudio();
      return;
    }

    audio.pause();
    audio.currentTime = startMs / 1000;
    setPlayingId(id);
    const token = playTokenRef.current + 1;
    playTokenRef.current = token;
    void audio.play().catch(() => setPlayingId(null));

    if (typeof endMs === "number") {
      window.setTimeout(() => {
        if (playTokenRef.current === token) {
          audio.pause();
          setPlayingId(null);
        }
      }, Math.max(20, endMs - startMs));
    }
  };

  const positionToMs = (clientX: number) => {
    if (!asset || !waveformRef.current) {
      return 0;
    }

    const rect = waveformRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * asset.durationMs);
  };

  const syncScrollRatio = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    setScrollRatio(maxScroll > 0 ? Math.round((container.scrollLeft / maxScroll) * 1000) : 0);
  };

  const updateScrollFromRatio = (nextRatio: number) => {
    const container = scrollContainerRef.current;
    setScrollRatio(nextRatio);
    if (!container) {
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    container.scrollLeft = maxScroll > 0 ? (nextRatio / 1000) * maxScroll : 0;
  };

  const centerClipInTrack = (clip: DraftClip) => {
    if (!asset || !scrollContainerRef.current || !waveformRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const waveformWidth = waveformRef.current.offsetWidth;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0 || waveformWidth <= 0) {
      setScrollRatio(0);
      return;
    }

    const clipCenterRatio = Math.min(1, Math.max(0, (clip.startMs + clip.endMs) / 2 / asset.durationMs));
    const targetScrollLeft = Math.min(maxScroll, Math.max(0, clipCenterRatio * waveformWidth - container.clientWidth / 2));
    setScrollRatio(Math.round((targetScrollLeft / maxScroll) * 1000));
    container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  };

  const startCreate = (clientX: number) => {
    if (!asset) {
      return;
    }

    hasDraggedRef.current = false;
    pendingCreateRef.current = { clientX, startMs: positionToMs(clientX) };
  };

  const updateDraftByPointer = (clientX: number) => {
    if (!asset) {
      return;
    }

    const pointerMs = positionToMs(clientX);
    const pendingCreate = pendingCreateRef.current;

    if (pendingCreate && Math.abs(clientX - pendingCreate.clientX) > 3) {
      hasDraggedRef.current = true;
      const nextDraft = constrainClip(
        normalizeClip(
          {
            endMs: Math.max(pendingCreate.startMs, pointerMs),
            id: isShortClipEditor ? (draft?.id ?? shortClip?.id ?? createId("clip")) : createId("combo_clip"),
            index: isShortClipEditor ? 1 : nextSequenceIndex(savedDrafts),
            note: isShortClipEditor ? (draft?.note ?? shortClip?.note ?? "") : "",
            startMs: Math.min(pendingCreate.startMs, pointerMs),
          },
          asset.durationMs,
        ),
        asset.durationMs,
        isShortClipEditor ? [] : savedDrafts,
      );

      setDraft(nextDraft);
      setSelectedSavedId(null);
      pendingCreateRef.current = null;
      dragRef.current = { mode: "create", originMs: pendingCreate.startMs, original: nextDraft };
      suppressWaveformClickRef.current = true;
      return;
    }

    if (!draft || !dragRef.current) {
      return;
    }

    hasDraggedRef.current = true;
    const { mode, originMs, original = draft } = dragRef.current;

    if (mode === "create") {
      setActiveDraft(
        constrainClip(
          normalizeClip(
            { ...draft, startMs: Math.min(originMs, pointerMs), endMs: Math.max(originMs, pointerMs) },
            asset.durationMs,
          ),
          asset.durationMs,
          isShortClipEditor ? [] : savedDrafts,
          selectedSavedId ?? draft.id,
        ),
      );
      return;
    }

    if (mode === "left") {
      setActiveDraft(
        constrainClip(
          normalizeClip({ ...draft, startMs: Math.min(pointerMs, draft.endMs - minClipMs) }, asset.durationMs),
          asset.durationMs,
          isShortClipEditor ? [] : savedDrafts,
          selectedSavedId ?? draft.id,
        ),
      );
      return;
    }

    if (mode === "right") {
      setActiveDraft(
        constrainClip(
          normalizeClip({ ...draft, endMs: Math.max(pointerMs, draft.startMs + minClipMs) }, asset.durationMs),
          asset.durationMs,
          isShortClipEditor ? [] : savedDrafts,
          selectedSavedId ?? draft.id,
        ),
      );
      return;
    }

    const delta = pointerMs - originMs;
    const width = original.endMs - original.startMs;
    const startMs = Math.min(asset.durationMs - width, Math.max(0, original.startMs + delta));
    setActiveDraft(
      constrainClip(
        { ...draft, startMs, endMs: startMs + width },
        asset.durationMs,
        isShortClipEditor ? [] : savedDrafts,
        selectedSavedId ?? draft.id,
      ),
    );
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => updateDraftByPointer(event.clientX);
    const handlePointerUp = () => {
      pendingCreateRef.current = null;
      dragRef.current = null;
      if (hasDraggedRef.current) {
        window.setTimeout(() => {
          hasDraggedRef.current = false;
        }, 0);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  });

  useEffect(() => {
    syncScrollRatio();
  }, [zoom]);

  const saveDraftToList = () => {
    if (isShortClipEditor || !draft || selectedSavedId) {
      return;
    }

    setSavedDrafts((clips) =>
      [...clips.filter((clip) => clip.id !== draft.id), draft].sort((first, second) => first.index - second.index),
    );
    setDraft(null);
    setSelectedSavedId(null);
  };

  const applyShortClipToSettings = () => {
    if (!asset || !draft || !shortClipTarget) {
      return;
    }

    const clip: SoundClipRef = {
      assetId: asset.id,
      endMs: draft.endMs,
      id: draft.id,
      note: draft.note,
      startMs: draft.startMs,
    };

    if (shortClipTarget === "hit") {
      setSound({
        custom: {
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
        },
        customEnabled: true,
        enabled: true,
      });
      returnToSoundSettings();
      return;
    }

    setSound({
      custom: {
        ...sound.custom,
        missFeedback: {
          ...sound.custom.missFeedback,
          customClip: clip,
          mode: "custom",
        },
      },
      customEnabled: true,
      enabled: true,
    });
    returnToSoundSettings();
  };

  const applyDraftsToSettings = () => {
    if (!asset) {
      return;
    }

    const clips = [...savedDrafts].sort((first, second) => first.index - second.index);
    const existingPack = packId
      ? sound.custom.comboMusic.packs.find((pack) => pack.id === packId)
      : sound.custom.comboMusic.packs.find((pack) => pack.sourceAssetId === asset.id);
    const pack = {
      clips,
      id: existingPack?.id ?? createId("combo_pack"),
      name: packageName.trim() || existingPack?.name || `${asset.name.replace(/\.[^.]+$/, "")} 整合包`,
      sourceAssetId: asset.id,
      updatedAt: Date.now(),
    };
    const packs = [...sound.custom.comboMusic.packs.filter((item) => item.id !== pack.id), pack].sort(
      (first, second) => second.updatedAt - first.updatedAt,
    );
    const shouldActivatePack = !packId || sound.custom.comboMusic.activePackId === pack.id || !sound.custom.comboMusic.activePackId;
    const nextActivePackId = shouldActivatePack ? pack.id : sound.custom.comboMusic.activePackId;
    const nextActivePack = packs.find((item) => item.id === nextActivePackId) ?? pack;

    setSound({
      custom: {
        ...sound.custom,
        comboMusic: {
          ...sound.custom.comboMusic,
          activePackId: nextActivePack.id,
          clips: nextActivePack.clips,
          enabled: true,
          mode: "manualClips",
          overflowBehavior: "restart",
          packs,
          sourceAssetId: nextActivePack.sourceAssetId,
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
    returnToSoundSettings();
  };

  const returnToSoundSettings = () => {
    try {
      window.localStorage.setItem(activeSettingsSectionKey, "sound");
    } catch {
      // Returning to the sound tab is a convenience only.
    }
    navigate("/settings");
  };

  const setActiveDraft = (nextDraft: DraftClip) => {
    setDraft(nextDraft);
    if (isShortClipEditor || !selectedSavedId) {
      return;
    }

    setSavedDrafts((clips) =>
      clips
        .map((clip) => (clip.id === selectedSavedId ? nextDraft : clip))
        .sort((first, second) => first.index - second.index),
    );
  };

  const selectSavedDraft = (clip: DraftClip) => {
    stopAudio();
    setSelectedSavedId(clip.id);
    setDraft(clip);
    centerClipInTrack(clip);
  };

  if (error) {
    return (
      <EditorShell>
        <GlassCard intensity="high" className="p-6">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button type="button" className="mt-4" onClick={returnToSoundSettings}>
            返回设置
          </Button>
        </GlassCard>
      </EditorShell>
    );
  }

  if (!asset) {
    return (
      <EditorShell>
        <GlassCard intensity="high" className="p-6 text-sm text-muted-foreground">
          正在载入音乐...
        </GlassCard>
      </EditorShell>
    );
  }

  return (
    <EditorShell>
      <GlassCard intensity="high" className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <button
              type="button"
              onClick={returnToSoundSettings}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回音效设置
            </button>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              {isShortClipEditor ? (shortClipTarget === "hit" ? "击中音效编辑器" : "非击中音效编辑器") : "连击音乐编辑器"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {asset.name} · {formatMs(asset.durationMs)} ·{" "}
              {isShortClipEditor ? "拖拽调整要播放的音效区间，保存后直接更新当前音效。" : "拖拽生成区间，区间之间不会重叠。"}
            </p>
          </div>
          <Button
            type="button"
            disabled={isShortClipEditor ? !draft : savedDrafts.length === 0}
            onClick={isShortClipEditor ? applyShortClipToSettings : applyDraftsToSettings}
          >
            <Save className="h-4 w-4" />
            {isShortClipEditor ? (shortClipTarget === "hit" ? "保存击中音效" : "保存非击中音效") : "保存连击片段"}
          </Button>
        </div>

        <div className={cn("grid min-h-0 flex-1 gap-5", !isShortClipEditor && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
          <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-5">
            {!isShortClipEditor && (
              <label className="mb-4 grid gap-2 text-xs text-muted-foreground">
                整合包名称
                <input
                  value={packageName}
                  placeholder={`${asset.name.replace(/\.[^.]+$/, "")} 整合包`}
                  onChange={(event) => setPackageName(event.target.value)}
                  className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                />
              </label>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>音频长度 {formatMs(asset.durationMs)} · 缩放 {zoom.toFixed(1)}x</span>
              <label className="flex items-center gap-2">
                缩放
                <input
                  type="range"
                  min={1}
                  max={16}
                  step={0.25}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-36 accent-primary"
                />
              </label>
            </div>
            <div
              ref={scrollContainerRef}
              className="audio-editor-scroll overflow-x-auto pb-2"
              onScroll={() => {
                if (scrollSyncFrameRef.current !== null) {
                  return;
                }

                scrollSyncFrameRef.current = window.requestAnimationFrame(() => {
                  scrollSyncFrameRef.current = null;
                  syncScrollRatio();
                });
              }}
            >
              <div
                ref={waveformRef}
                className="relative flex h-56 cursor-crosshair items-center gap-[2px] rounded-2xl border border-white/10 bg-black/25 p-4"
                style={{ width: `${zoom * 100}%`, minWidth: "100%" }}
                onPointerDown={(event) => {
                  if ((event.target as HTMLElement).dataset.handle) {
                    return;
                  }

                  startCreate(event.clientX);
                }}
                onClick={(event) => {
                  suppressWaveformClickRef.current = false;
                }}
              >
                {asset.waveformPeaks.map((peak, index) => (
                  <div
                    key={`${asset.id}_${index}`}
                    className="flex-1 rounded-full bg-primary/45"
                    style={{ height: `${Math.max(8, peak * 100)}%` }}
                  />
                ))}

                {savedDrafts
                  .filter((clip) => clip.id !== selectedSavedId)
                  .map((clip) => (
                    <Region
                      key={clip.id}
                      asset={asset}
                      clip={clip}
                      isHovered={hoveredId === clip.id}
                      isPlaying={playingId === clip.id}
                      onHover={setHoveredId}
                      onPlay={() => playRange(clip.id, clip.startMs, clip.endMs)}
                      onSuppressClick={() => {
                        suppressWaveformClickRef.current = true;
                      }}
                      onSelect={() => selectSavedDraft(clip)}
                    />
                  ))}

                {draft && (
                  <EditableRegion
                    asset={asset}
                    clip={draft}
                    onDragStart={(mode, clientX) => {
                      hasDraggedRef.current = false;
                      stopAudio();
                      dragRef.current = { mode, originMs: positionToMs(clientX), original: draft };
                    }}
                    onPlay={() => playRange(draft.id, draft.startMs, draft.endMs)}
                    isPlaying={playingId === draft.id}
                  />
                )}
              </div>
              <TimeRuler durationMs={asset.durationMs} zoom={zoom} />
            </div>
            {zoom > 1 && (
              <input
                type="range"
                min={0}
                max={1000}
                step={1}
                value={scrollRatio}
                onChange={(event) => updateScrollFromRatio(Number(event.target.value))}
                className="audio-scroll-range mt-3 w-full"
                aria-label="音频轨道水平滚动"
              />
            )}

            <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center gap-2 font-medium">
                <Scissors className="h-4 w-4 text-primary" />
                当前片段
              </div>
              {draft ? (
                <DraftForm
                  asset={asset}
                  draft={draft}
                  isSaved={Boolean(selectedSavedId)}
                  onChange={(nextDraft) =>
                    setActiveDraft(
                      constrainClip(
                        nextDraft,
                        asset.durationMs,
                        isShortClipEditor ? [] : savedDrafts,
                        selectedSavedId ?? nextDraft.id,
                      ),
                    )
                  }
                  onDelete={() => {
                    if (!isShortClipEditor) {
                      setSavedDrafts((clips) => clips.filter((clip) => clip.id !== draft.id));
                    }
                    setDraft(null);
                    setSelectedSavedId(null);
                  }}
                  onSave={saveDraftToList}
                  onPlay={() => playRange(draft.id, draft.startMs, draft.endMs)}
                  isPlaying={playingId === draft.id}
                  isSingleClip={isShortClipEditor}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isShortClipEditor ? "在波形上拖拽选择要播放的音效区间。" : "在波形上拖拽选择一段音乐，保存为第 n 击片段。"}
                </p>
              )}
            </div>
          </div>

          {!isShortClipEditor && (
            <div className="min-h-0 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-4 font-medium">连击片段</div>
              <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.24)_transparent] [scrollbar-width:thin]">
                {savedDrafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">保存当前片段后，会在这里生成第 1 击、第 2 击到第 n 击。</p>
                ) : (
                  sortedDrafts.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => selectSavedDraft(clip)}
                      className={cn(
                        "rounded-2xl border p-4 text-left hover:border-primary/35",
                        selectedSavedId === clip.id ? "border-primary/35 bg-primary/10" : "border-white/10 bg-white/[0.025]",
                      )}
                    >
                      <div className="font-medium">第 {clip.index} 段</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatMs(clip.startMs)} - {formatMs(clip.endMs)}
                      </div>
                      {clip.note && <div className="mt-2 text-xs text-muted-foreground">{clip.note}</div>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </EditorShell>
  );
}

function EditorShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <style>
        {`
          .audio-editor-scroll {
            scrollbar-width: none;
          }

          .audio-editor-scroll::-webkit-scrollbar {
            display: none;
          }

          .audio-scroll-range {
            height: 28px;
            cursor: grab;
            appearance: none;
            background: transparent;
            outline: none;
          }

          .audio-scroll-range:active {
            cursor: grabbing;
          }

          .audio-scroll-range::-webkit-slider-runnable-track {
            height: 20px;
            border-radius: 999px;
            background: transparent;
          }

          .audio-scroll-range::-webkit-slider-thumb {
            width: 108px;
            height: 18px;
            margin-top: 1px;
            appearance: none;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.58);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 10px 22px rgba(0, 0, 0, 0.26);
            transition: background 120ms ease, box-shadow 120ms ease;
          }

          .audio-scroll-range::-webkit-slider-thumb:hover {
            background: rgba(0, 255, 238, 0.68);
            box-shadow: 0 0 0 1px rgba(0, 255, 238, 0.32), 0 0 18px rgba(0, 255, 238, 0.24);
          }

          .audio-scroll-range::-moz-range-track {
            height: 20px;
            border: 0;
            border-radius: 999px;
            background: transparent;
          }

          .audio-scroll-range::-moz-range-thumb {
            width: 108px;
            height: 18px;
            border: 0;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.58);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 10px 22px rgba(0, 0, 0, 0.26);
          }
        `}
      </style>
      <ParallaxBackground intensityBoost={0.45} />
      <div className="relative z-10 mx-auto flex h-screen w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        {children}
      </div>
    </main>
  );
}

function Region({
  asset,
  clip,
  isHovered,
  isPlaying,
  onHover,
  onPlay,
  onSuppressClick,
  onSelect,
}: {
  asset: SoundAsset;
  clip: DraftClip;
  isHovered: boolean;
  isPlaying: boolean;
  onHover: (id: string | null) => void;
  onPlay: () => void;
  onSuppressClick: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className="absolute top-4 bottom-4 rounded-xl border border-primary/45 bg-primary/20 transition-colors hover:border-primary hover:bg-primary/28"
      style={regionStyle(asset, clip)}
      onMouseEnter={() => onHover(clip.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {isHovered && (
        <button
          type="button"
          data-handle="play"
          onClick={(event) => {
            event.stopPropagation();
            onSuppressClick();
            onPlay();
          }}
          className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-foreground backdrop-blur"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

function EditableRegion({
  asset,
  clip,
  isPlaying,
  onDragStart,
  onPlay,
}: {
  asset: SoundAsset;
  clip: DraftClip;
  isPlaying: boolean;
  onDragStart: (mode: DragMode, clientX: number) => void;
  onPlay: () => void;
}) {
  return (
    <div
      className="absolute top-3 bottom-3 cursor-grab rounded-xl border border-primary bg-primary/30 shadow-[0_0_32px_rgba(0,200,200,0.16)]"
      style={regionStyle(asset, clip)}
      data-handle="move"
      onPointerDown={(event) => {
        event.stopPropagation();
        onDragStart("move", event.clientX);
      }}
    >
      <button
        type="button"
        data-handle="left"
        className="absolute left-0 top-0 h-full w-[13px] cursor-ew-resize rounded-l-xl bg-white/35 transition-all hover:bg-primary hover:shadow-[0_0_18px_rgba(0,255,238,0.45)] focus-visible:bg-primary focus-visible:outline-none"
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart("left", event.clientX);
        }}
      />
      <button
        type="button"
        data-handle="right"
        className="absolute right-0 top-0 h-full w-[13px] cursor-ew-resize rounded-r-xl bg-white/35 transition-all hover:bg-primary hover:shadow-[0_0_18px_rgba(0,255,238,0.45)] focus-visible:bg-primary focus-visible:outline-none"
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart("right", event.clientX);
        }}
      />
      <button
        type="button"
        data-handle="play"
        onClick={(event) => {
          event.stopPropagation();
          onPlay();
        }}
        className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-foreground backdrop-blur"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}

function DraftForm({
  asset,
  draft,
  isPlaying,
  isSingleClip,
  isSaved,
  onChange,
  onDelete,
  onPlay,
  onSave,
}: {
  asset: SoundAsset;
  draft: DraftClip;
  isPlaying: boolean;
  isSingleClip: boolean;
  isSaved: boolean;
  onChange: (draft: DraftClip) => void;
  onDelete: () => void;
  onPlay: () => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className={cn("grid gap-3", isSingleClip ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {!isSingleClip && (
          <label className="grid gap-2 text-xs text-muted-foreground">
            第 n 击
            <input
              type="number"
              min={1}
              value={draft.index}
              onChange={(event) => onChange({ ...draft, index: Math.max(1, Number(event.target.value) || 1) })}
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none"
            />
          </label>
        )}
        <label className="grid gap-2 text-xs text-muted-foreground">
          开始
          <input
            type="number"
            min={0}
            max={asset.durationMs}
            step={10}
            value={draft.startMs}
            onChange={(event) => onChange(normalizeClip({ ...draft, startMs: Number(event.target.value) }, asset.durationMs))}
            className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none"
          />
        </label>
        <label className="grid gap-2 text-xs text-muted-foreground">
          结束
          <input
            type="number"
            min={0}
            max={asset.durationMs}
            step={10}
            value={draft.endMs}
            onChange={(event) => onChange(normalizeClip({ ...draft, endMs: Number(event.target.value) }, asset.durationMs))}
            className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none"
          />
        </label>
      </div>
      <input
        value={draft.note}
        placeholder={isSingleClip ? "备注，例如：命中短促音、未命中低提示" : "备注，例如：第 1 击鼓点、进入副歌前奏"}
        onChange={(event) => onChange({ ...draft, note: event.target.value })}
        className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-primary/40"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onPlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          试听片段
        </Button>
        {!isSingleClip && !isSaved && (
          <Button type="button" onClick={onSave}>
            <Save className="h-4 w-4" />
            保存片段
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          删除片段
        </Button>
      </div>
    </div>
  );
}

function regionStyle(asset: SoundAsset, clip: DraftClip) {
  const left = (clip.startMs / asset.durationMs) * 100;
  const width = ((clip.endMs - clip.startMs) / asset.durationMs) * 100;

  return {
    left: `${left}%`,
    width: `${Math.max(0.4, width)}%`,
  };
}

function normalizeClip(clip: DraftClip, durationMs: number): DraftClip {
  const startMs = Math.max(0, Math.min(durationMs - minClipMs, clip.startMs));
  const endMs = Math.max(startMs + minClipMs, Math.min(durationMs, clip.endMs));

  return {
    ...clip,
    endMs,
    startMs,
  };
}

function constrainClip(clip: DraftClip, durationMs: number, clips: DraftClip[], ignoreId?: string): DraftClip {
  const others = clips
    .filter((item) => item.id !== ignoreId)
    .sort((first, second) => first.index - second.index);
  const previous = others.filter((item) => item.index < clip.index).at(-1);
  const next = others.find((item) => item.index > clip.index);
  const minStart = previous?.endMs ?? 0;
  const maxEnd = next?.startMs ?? durationMs;
  const width = Math.min(clip.endMs - clip.startMs, Math.max(minClipMs, maxEnd - minStart));
  let startMs = Math.max(minStart, Math.min(clip.startMs, maxEnd - width));
  let endMs = startMs + width;

  if (clip.startMs < minStart) {
    startMs = minStart;
    endMs = Math.min(maxEnd, startMs + width);
  }

  if (clip.endMs > maxEnd) {
    endMs = maxEnd;
    startMs = Math.max(minStart, endMs - width);
  }

  return normalizeClip({ ...clip, startMs, endMs }, durationMs);
}

function TimeRuler({ durationMs, zoom }: { durationMs: number; zoom: number }) {
  const tickCount = Math.max(4, Math.ceil(durationMs / 5000) + 1);

  return (
    <div className="relative mt-2 h-8 text-[11px] text-muted-foreground" style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
      {Array.from({ length: tickCount }, (_, index) => {
        const ratio = tickCount === 1 ? 0 : index / (tickCount - 1);
        const ms = ratio * durationMs;

        return (
          <div key={index} className="absolute top-0 -translate-x-1/2" style={{ left: `${ratio * 100}%` }}>
            <div className="mx-auto mb-1 h-2 w-px bg-white/20" />
            {formatMs(ms)}
          </div>
        );
      })}
    </div>
  );
}

function nextSequenceIndex(drafts: DraftClip[]) {
  return Math.max(0, ...drafts.map((clip) => clip.index)) + 1;
}

function readShortClipTarget(value: string | null): ShortClipTarget | null {
  return value === "hit" || value === "miss" ? value : null;
}

function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}
