import { getSoundAsset, type SoundClipRef } from "@/lib/soundAssets";

interface CachedBuffer {
  buffer: AudioBuffer;
  objectUrl: string;
}

const bufferCache = new Map<string, Promise<CachedBuffer>>();

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return new AudioContextClass();
}

async function loadAudioBuffer(assetId: string) {
  const cached = bufferCache.get(assetId);
  if (cached) {
    return cached;
  }

  const promise = (async (): Promise<CachedBuffer> => {
    const asset = await getSoundAsset(assetId);
    if (!asset) {
      throw new Error("音频文件不存在。");
    }

    const context = getAudioContext();
    if (!context) {
      throw new Error("当前环境不支持音频播放。");
    }

    try {
      const arrayBuffer = await asset.blob.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer);
      return {
        buffer,
        objectUrl: URL.createObjectURL(asset.blob),
      };
    } finally {
      await context.close();
    }
  })();

  bufferCache.set(assetId, promise);
  return promise;
}

export async function playSoundClip(clip: SoundClipRef, volume = 0.72) {
  const { buffer } = await loadAudioBuffer(clip.assetId);
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  const source = context.createBufferSource();
  const gainNode = context.createGain();
  const startSeconds = Math.max(0, (clip.startMs ?? 0) / 1000);
  const endSeconds =
    typeof clip.endMs === "number" ? Math.min(buffer.duration, Math.max(startSeconds, clip.endMs / 1000)) : buffer.duration;
  const duration = Math.max(0.01, endSeconds - startSeconds);

  source.buffer = buffer;
  gainNode.gain.value = volume;
  source.connect(gainNode);
  gainNode.connect(context.destination);
  source.start(0, startSeconds, duration);
  source.onended = () => {
    window.setTimeout(() => {
      context.close().catch(() => undefined);
    }, 120);
  };
}

export async function getSoundObjectUrl(assetId: string) {
  const cached = await loadAudioBuffer(assetId);
  return cached.objectUrl;
}
