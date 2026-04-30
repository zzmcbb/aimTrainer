import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Pause, Play, Save, Scissors, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { createId, getSoundAsset, type ComboMusicClip, type SoundAsset } from "@/lib/soundAssets";
import { useSettingsStore } from "@/stores/settingsStore";

type DragMode = "create" | "left" | "right" | "move";

interface DraftClip extends ComboMusicClip {}

const minClipMs = 40;

export function SoundEditorPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const sound = useSettingsStore((state) => state.sound);
  const setSound = useSettingsStore((state) => state.setSound);
  const [asset, setAsset] = useState<SoundAsset | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<DraftClip | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<DraftClip[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pendingCreateRef = useRef<{ clientX: number; startMs: number } | null>(null);
  const dragRef = useRef<{ mode: DragMode; originMs: number; original?: DraftClip } | null>(null);
  const playTokenRef = useRef(0);
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
    if (!assetId || sound.custom.comboMusic.sourceAssetId !== assetId) {
      return;
    }

    setSavedDrafts(sound.custom.comboMusic.clips);
  }, [assetId, sound.custom.comboMusic.clips, sound.custom.comboMusic.sourceAssetId]);

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

  const startCreate = (clientX: number) => {
    if (!asset) {
      return;
    }

    pendingCreateRef.current = { clientX, startMs: positionToMs(clientX) };
  };

  const updateDraftByPointer = (clientX: number) => {
    if (!asset) {
      return;
    }

    const pointerMs = positionToMs(clientX);
    const pendingCreate = pendingCreateRef.current;

    if (pendingCreate && Math.abs(clientX - pendingCreate.clientX) > 3) {
      const nextDraft = normalizeClip(
        {
          endMs: Math.max(pendingCreate.startMs, pointerMs),
          id: createId("combo_clip"),
          index: nextSequenceIndex(savedDrafts),
          note: "",
          startMs: Math.min(pendingCreate.startMs, pointerMs),
        },
        asset.durationMs,
      );

      setDraft(nextDraft);
      pendingCreateRef.current = null;
      dragRef.current = { mode: "create", originMs: pendingCreate.startMs, original: nextDraft };
      suppressWaveformClickRef.current = true;
      return;
    }

    if (!draft || !dragRef.current) {
      return;
    }

    const { mode, originMs, original = draft } = dragRef.current;

    if (mode === "create") {
      setDraft(
        normalizeClip(
          { ...draft, startMs: Math.min(originMs, pointerMs), endMs: Math.max(originMs, pointerMs) },
          asset.durationMs,
        ),
      );
      return;
    }

    if (mode === "left") {
      setDraft(normalizeClip({ ...draft, startMs: Math.min(pointerMs, draft.endMs - minClipMs) }, asset.durationMs));
      return;
    }

    if (mode === "right") {
      setDraft(normalizeClip({ ...draft, endMs: Math.max(pointerMs, draft.startMs + minClipMs) }, asset.durationMs));
      return;
    }

    const delta = pointerMs - originMs;
    const width = original.endMs - original.startMs;
    const startMs = Math.min(asset.durationMs - width, Math.max(0, original.startMs + delta));
    setDraft({ ...draft, startMs, endMs: startMs + width });
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => updateDraftByPointer(event.clientX);
    const handlePointerUp = () => {
      pendingCreateRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  });

  const saveDraftToList = () => {
    if (!draft) {
      return;
    }

    setSavedDrafts((clips) => [...clips.filter((clip) => clip.id !== draft.id), draft]);
    setDraft(null);
  };

  const applyDraftsToSettings = () => {
    if (!asset) {
      return;
    }

    const clips = [...savedDrafts].sort((first, second) => first.index - second.index);

    setSound({
      custom: {
        ...sound.custom,
        comboMusic: {
          ...sound.custom.comboMusic,
          clips,
          enabled: true,
          mode: "manualClips",
          sourceAssetId: asset.id,
        },
      },
      customEnabled: true,
      enabled: true,
    });
    navigate("/settings");
  };

  if (error) {
    return (
      <EditorShell>
        <GlassCard intensity="high" className="p-6">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button type="button" className="mt-4" onClick={() => navigate("/settings")}>
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
            <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              返回音效设置
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">连击音乐编辑器</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {asset.name} · {formatMs(asset.durationMs)} · 点击波形播放完整音乐，拖拽生成第 n 击片段。
            </p>
          </div>
          <Button type="button" disabled={savedDrafts.length === 0} onClick={applyDraftsToSettings}>
            <Save className="h-4 w-4" />
            保存连击片段
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div
              ref={waveformRef}
              className="relative flex h-56 cursor-crosshair items-center gap-[2px] rounded-2xl border border-white/10 bg-black/25 p-4"
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).dataset.handle) {
                  return;
                }

                startCreate(event.clientX);
              }}
              onClick={(event) => {
                if (suppressWaveformClickRef.current) {
                  suppressWaveformClickRef.current = false;
                  return;
                }

                if (dragRef.current || (event.target as HTMLElement).dataset.handle) {
                  return;
                }

                playRange("full", positionToMs(event.clientX));
              }}
            >
              {asset.waveformPeaks.map((peak, index) => (
                <div
                  key={`${asset.id}_${index}`}
                  className="flex-1 rounded-full bg-primary/45"
                  style={{ height: `${Math.max(8, peak * 100)}%` }}
                />
              ))}

              {savedDrafts.map((clip) => (
                <Region
                  key={clip.id}
                  asset={asset}
                  clip={clip}
                  isHovered={hoveredId === clip.id}
                  isPlaying={playingId === clip.id}
                  onHover={setHoveredId}
                  onPlay={() => playRange(clip.id, clip.startMs, clip.endMs)}
                />
              ))}

              {draft && (
                <EditableRegion
                  asset={asset}
                  clip={draft}
                  onDragStart={(mode, clientX) => {
                    dragRef.current = { mode, originMs: positionToMs(clientX), original: draft };
                  }}
                  onPlay={() => playRange(draft.id, draft.startMs, draft.endMs)}
                  isPlaying={playingId === draft.id}
                />
              )}
            </div>

            <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center gap-2 font-medium">
                <Scissors className="h-4 w-4 text-primary" />
                当前片段
              </div>
              {draft ? (
                <DraftForm
                  asset={asset}
                  draft={draft}
                  onChange={setDraft}
                  onDelete={() => {
                    setSavedDrafts((clips) => clips.filter((clip) => clip.id !== draft.id));
                    setDraft(null);
                  }}
                  onSave={saveDraftToList}
                  onPlay={() => playRange(draft.id, draft.startMs, draft.endMs)}
                  isPlaying={playingId === draft.id}
                />
              ) : (
                <p className="text-sm text-muted-foreground">在波形上拖拽选择一段音乐，保存为第 n 击片段。</p>
              )}
            </div>
          </div>

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
                    onClick={() => setDraft(clip)}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left hover:border-primary/35"
                  >
                    <div className="font-medium">第 {clip.index} 击</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatMs(clip.startMs)} - {formatMs(clip.endMs)}
                    </div>
                    {clip.note && <div className="mt-2 text-xs text-muted-foreground">{clip.note}</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </EditorShell>
  );
}

function EditorShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
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
}: {
  asset: SoundAsset;
  clip: DraftClip;
  isHovered: boolean;
  isPlaying: boolean;
  onHover: (id: string | null) => void;
  onPlay: () => void;
}) {
  return (
    <div
      className="absolute top-4 bottom-4 rounded-xl border border-primary/45 bg-primary/20"
      style={regionStyle(asset, clip)}
      onMouseEnter={() => onHover(clip.id)}
      onMouseLeave={() => onHover(null)}
    >
      {isHovered && (
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
        className="absolute left-0 top-0 h-full w-4 cursor-ew-resize rounded-l-xl bg-white/35"
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart("left", event.clientX);
        }}
      />
      <button
        type="button"
        data-handle="right"
        className="absolute right-0 top-0 h-full w-4 cursor-ew-resize rounded-r-xl bg-white/35"
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
  onChange,
  onDelete,
  onPlay,
  onSave,
}: {
  asset: SoundAsset;
  draft: DraftClip;
  isPlaying: boolean;
  onChange: (draft: DraftClip) => void;
  onDelete: () => void;
  onPlay: () => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
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
        placeholder="备注，例如：第 1 击鼓点、进入副歌前奏"
        onChange={(event) => onChange({ ...draft, note: event.target.value })}
        className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-primary/40"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onPlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          试听片段
        </Button>
        <Button type="button" onClick={onSave}>
          <Save className="h-4 w-4" />
          保存片段
        </Button>
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
    width: `${Math.max(0.8, width)}%`,
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

function nextSequenceIndex(drafts: DraftClip[]) {
  return Math.max(0, ...drafts.map((clip) => clip.index)) + 1;
}

function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}
