import { useRef, type ReactNode } from "react";
import { FileAudio, Music2, Pencil, Play, Trash2, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SoundAsset, SoundClipRef } from "@/lib/soundAssets";
import type { SoundSettings } from "@/stores/settingsStore";

export type AssetMap = Record<string, SoundAsset>;

export function PanelBlock({
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

export function ClipRow({
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

export function ComboAssetCard({
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

export function UploadButton({
  accept = ".mp3,.wav,audio/mpeg,audio/wav",
  disabled = false,
  label,
  onFile,
}: {
  accept?: string;
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
        accept={accept}
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

export function SegmentedControl<T extends string>({
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

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${value}%` }} />
    </div>
  );
}

export function collectAssetIds(sound: SoundSettings) {
  return [
    sound.custom.hitFeedback.customClip?.assetId,
    sound.custom.missFeedback.customClip?.assetId,
    sound.custom.comboMusic.sourceAssetId,
    ...sound.custom.comboMusic.packs.map((pack) => pack.sourceAssetId),
  ].filter((id): id is string => Boolean(id));
}

export function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function safeDownloadName(value: string) {
  const trimmed = value.trim().replace(/[\\/:*?"<>|]+/g, "_");
  return trimmed || "combo-pack";
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
