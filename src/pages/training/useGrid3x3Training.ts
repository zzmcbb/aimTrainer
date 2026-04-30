import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import * as THREE from "three";
import { useTranslation } from "@/i18n";
import {
  calculateTrainingScore,
  createTrainingHistoryRecord,
  saveTrainingRecord,
} from "@/pages/history/historyRecords";
import { getSoundObjectUrl, playSoundClip } from "@/lib/soundEngine";
import type { ComboMusicClip, SoundClipRef } from "@/lib/soundAssets";
import { useSettingsStore } from "@/stores/settingsStore";

const distance = 12;
const spacing = 2.15;
const targetRadius = 0.88;
const baseRadiansPerPixel = 0.002;
const maxYaw = Math.PI / 2;
const maxPitch = Math.PI / 2;
const crosshairSpreadMaxOffset = 10;
const crosshairRecoveryEasing = "cubic-bezier(0.16, 1, 0.3, 1)";
const overlayActionDelayMs = 450;
const remainingUiUpdateIntervalMs = 100;
const logicTickRate = 240;
const logicStepMs = 1000 / logicTickRate;
const maxAccumulatedLogicMs = 250;
const targetFadeInMs = 50;
const maxActiveHitEffects = 8;
const nukeEffectCooldownMs = 140;
const nukeParticleCount = 54;
const bloodMistParticleCount = 30;
const aimAssistMinAngleRadians = 0.012;
const aimAssistMaxAngleRadians = 0.22;
const aimAssistMinRadiansPerSecond = 0.025;
const aimAssistMaxRadiansPerSecond = 7.2;
const hitEffectSoundPaths: Record<HitEffectKind, string> = {
  balloon: "/sounds/balloon.mp3",
  bloodMist: "/sounds/blood_fog.mp3",
  burst: "/sounds/burst.mp3",
  explosion: "/sounds/explosion.mp3",
  nuke: "/sounds/nuke.mp3",
};

type HitEffectKind = "balloon" | "burst" | "explosion" | "nuke" | "bloodMist";

interface HitEffectParticle {
  direction: any;
  object: any;
  origin: any;
  spin: any;
  speed: number;
}

interface HitEffectInstance {
  blastRings?: any[];
  durationMs: number;
  group: any;
  particles: HitEffectParticle[];
  ring?: any;
  shockLight?: any;
  startedAt: number;
  type: HitEffectKind;
}

interface ScreenShakeState {
  durationMs: number;
  intensity: number;
  startedAt: number;
}

const gridPositions = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const col = index % 3;

  return new THREE.Vector3((col - 1) * spacing, (1 - row) * spacing, -distance);
});

interface GridStats {
  hits: number;
  misses: number;
  averageReactionMs: number;
}

interface MutableGameState {
  activeTargetIndices: number[];
  hits: number;
  misses: number;
  isRunning: boolean;
  lastTargetAppearedAt: number;
  lastTickAt: number;
  pitch: number;
  reactionSamples: number[];
  remainingMs: number;
  timeline: TimelineBucket[];
  durationMs: number;
  startedAt: number;
  yaw: number;
}

interface TimelineBucket {
  hits: number;
  shots: number;
  reactionTotalMs: number;
  reactionSamples: number;
}

const createEmptyTimeline = (durationMs: number) =>
  Array.from({ length: Math.ceil(durationMs / 1000) }, () => ({
    hits: 0,
    shots: 0,
    reactionTotalMs: 0,
    reactionSamples: 0,
  }));

export function useGrid3x3Training() {
  const { t } = useTranslation("training");
  const mountRef = useRef<HTMLDivElement>(null);
  const targetRefs = useRef<any[]>([]);
  const targetMaterialRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const crosshairSpreadAnimationRef = useRef<number | null>(null);
  const logicAccumulatorRef = useRef(0);
  const suppressPointerUnlockUntilRef = useRef(0);
  const aimAssistSettings = useSettingsStore((state) => state.aimAssist);
  const trainingSettings = useSettingsStore((state) => state.training);
  const crosshairSettings = useSettingsStore((state) => state.crosshair);
  const hitSettings = useSettingsStore((state) => state.hit);
  const soundSettings = useSettingsStore((state) => state.sound);
  const targetSettings = useSettingsStore((state) => state.target);
  const aimAssistSettingsRef = useRef(aimAssistSettings);
  const crosshairSettingsRef = useRef(crosshairSettings);
  const hitSettingsRef = useRef(hitSettings);
  const soundSettingsRef = useRef(soundSettings);
  const targetSettingsRef = useRef(targetSettings);
  const audioContextRef = useRef<AudioContext | null>(null);
  const comboCountRef = useRef(0);
  const comboTrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const comboTrackAssetIdRef = useRef<string | null>(null);
  const comboPausedSecondsRef = useRef(0);
  const activeComboClipRef = useRef<{ audio: HTMLAudioElement; timerId: number | null } | null>(null);
  const fpsLimitRef = useRef(trainingSettings.fpsLimit);
  const lastRenderedAtRef = useRef(0);
  const sensitivityRef = useRef({
    x: trainingSettings.sensitivityX,
    y: trainingSettings.sensitivityY,
  });
  const defaultDurationMs = trainingSettings.durationSeconds * 1000;
  const gameStateRef = useRef<MutableGameState>({
    activeTargetIndices: [],
    hits: 0,
    misses: 0,
    isRunning: false,
    lastTargetAppearedAt: 0,
    lastTickAt: 0,
    pitch: 0,
    reactionSamples: [],
    remainingMs: defaultDurationMs,
    timeline: createEmptyTimeline(defaultDurationMs),
    durationMs: defaultDurationMs,
    startedAt: 0,
    yaw: 0,
  });
  const countdownTimerRef = useRef<number | null>(null);
  const savedSessionIdRef = useRef<string | null>(null);
  const fpsSampleRef = useRef({ frames: 0, lastSampleAt: performance.now() });
  const logicFpsSampleRef = useRef({ ticks: 0, lastSampleAt: performance.now() });
  const remainingUiSampleRef = useRef({ lastUpdatedAt: 0 });
  const [phase, setPhase] = useState<"idle" | "countdown" | "running" | "paused" | "complete">("idle");
  const phaseRef = useRef<typeof phase>("idle");
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [fps, setFps] = useState(0);
  const [logicFps, setLogicFps] = useState(0);
  const [remainingMs, setRemainingMs] = useState(defaultDurationMs);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [areOverlayActionsEnabled, setAreOverlayActionsEnabled] = useState(false);
  const [crosshairSpread, setCrosshairSpread] = useState(0);
  const [isCrosshairRecovering, setIsCrosshairRecovering] = useState(false);
  const [stats, setStats] = useState<GridStats>({
    hits: 0,
    misses: 0,
    averageReactionMs: 0,
  });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== "paused" && phase !== "complete") {
      setAreOverlayActionsEnabled(false);
      return;
    }

    setAreOverlayActionsEnabled(false);

    const timerId = window.setTimeout(() => {
      setAreOverlayActionsEnabled(true);
    }, overlayActionDelayMs);

    return () => window.clearTimeout(timerId);
  }, [phase]);

  useEffect(() => {
    aimAssistSettingsRef.current = aimAssistSettings;
  }, [aimAssistSettings]);

  useEffect(() => {
    crosshairSettingsRef.current = crosshairSettings;

    if (!crosshairSettings.dynamicSpreadEnabled) {
      if (crosshairSpreadAnimationRef.current !== null) {
        window.cancelAnimationFrame(crosshairSpreadAnimationRef.current);
        crosshairSpreadAnimationRef.current = null;
      }

      setIsCrosshairRecovering(false);
      setCrosshairSpread(0);
    }
  }, [crosshairSettings]);

  useEffect(() => {
    hitSettingsRef.current = hitSettings;
  }, [hitSettings]);

  useEffect(() => {
    soundSettingsRef.current = soundSettings;
  }, [soundSettings]);

  useEffect(() => {
    if (phaseRef.current !== "idle") {
      return;
    }

    const nextDurationMs = trainingSettings.durationSeconds * 1000;
    gameStateRef.current.remainingMs = nextDurationMs;
    gameStateRef.current.durationMs = nextDurationMs;
    gameStateRef.current.timeline = createEmptyTimeline(nextDurationMs);
    setRemainingMs(nextDurationMs);
  }, [trainingSettings.durationSeconds]);

  useEffect(() => {
    fpsLimitRef.current = trainingSettings.fpsLimit;
  }, [trainingSettings.fpsLimit]);

  useEffect(() => {
    sensitivityRef.current = {
      x: trainingSettings.sensitivityX,
      y: trainingSettings.sensitivityY,
    };
  }, [trainingSettings.sensitivityX, trainingSettings.sensitivityY]);

  useEffect(() => {
    targetSettingsRef.current = targetSettings;

    const materials = targetMaterialRef.current;
    if (!materials.length) {
      return;
    }

    materials.forEach((material) => {
      material.color.set(targetSettings.color);
      material.emissive.set(targetSettings.color);
    });
  }, [targetSettings.color]);

  const syncStats = useCallback(() => {
    const gameState = gameStateRef.current;
    const reactionTotal = gameState.reactionSamples.reduce((total, value) => total + value, 0);

    setStats({
      hits: gameState.hits,
      misses: gameState.misses,
      averageReactionMs: gameState.reactionSamples.length
        ? Math.round(reactionTotal / gameState.reactionSamples.length)
        : 0,
    });
  }, []);

  const chooseAvailableGridIndex = useCallback((blockedIndices: number[]) => {
    const blocked = new Set(blockedIndices);
    const available = gridPositions
      .map((_, index) => index)
      .filter((index) => !blocked.has(index));

    return available[Math.floor(Math.random() * available.length)] ?? 4;
  }, []);

  const setTargetToGridIndex = useCallback((target: any, gridIndex: number, appearedAt = performance.now()) => {
    target.position.copy(gridPositions[gridIndex]);
    target.visible = true;
    target.material.opacity = 0;
    target.userData.gridIndex = gridIndex;
    target.userData.spawnedAt = appearedAt;
    gameStateRef.current.lastTargetAppearedAt = appearedAt;
  }, []);

  const spawnInitialTargets = useCallback(() => {
    const gameState = gameStateRef.current;
    const activeIndices: number[] = [];

    targetRefs.current.forEach((target) => {
      const nextIndex = chooseAvailableGridIndex(activeIndices);
      activeIndices.push(nextIndex);
      setTargetToGridIndex(target, nextIndex);
    });

    gameState.activeTargetIndices = activeIndices;
  }, [chooseAvailableGridIndex, setTargetToGridIndex]);

  const replaceHitTarget = useCallback(
    (target: any) => {
      const gameState = gameStateRef.current;
      const previousIndex = target.userData.gridIndex as number;
      const otherIndices = gameState.activeTargetIndices.filter((index) => index !== previousIndex);
      const blockedIndices =
        gridPositions.length > otherIndices.length + 1 ? [...otherIndices, previousIndex] : otherIndices;
      const nextIndex = chooseAvailableGridIndex(blockedIndices);

      setTargetToGridIndex(target, nextIndex);
      gameState.activeTargetIndices = [...otherIndices, nextIndex];
    },
    [chooseAvailableGridIndex, setTargetToGridIndex],
  );

  const finishTraining = useCallback(() => {
    const gameState = gameStateRef.current;
    gameState.isRunning = false;
    setPhase("complete");
    setRemainingMs(0);
    syncStats();

    if (!savedSessionIdRef.current) {
      const reactionTotal = gameState.reactionSamples.reduce((total, value) => total + value, 0);
      const averageReactionMs = gameState.reactionSamples.length
        ? Math.round(reactionTotal / gameState.reactionSamples.length)
        : 0;
      const record = createTrainingHistoryRecord({
        modeId: "grid-3x3",
        modeName: "Grid 3x3",
        durationSeconds: Math.round(gameState.durationMs / 1000),
        hits: gameState.hits,
        misses: gameState.misses,
        averageReactionMs,
        timeline: gameState.timeline.map((bucket, index) => ({
          second: `${index + 1}s`,
          accuracy: bucket.shots > 0 ? Math.round((bucket.hits / bucket.shots) * 100) : 0,
          hits: bucket.hits,
          averageReaction: bucket.reactionSamples > 0
            ? Math.round(bucket.reactionTotalMs / bucket.reactionSamples)
            : 0,
        })),
      });

      saveTrainingRecord(record);
      savedSessionIdRef.current = record.id;
    }

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [syncStats]);

  const playCrosshairSpread = useCallback(() => {
    if (!crosshairSettingsRef.current.dynamicSpreadEnabled) {
      setIsCrosshairRecovering(false);
      setCrosshairSpread(0);
      return;
    }

    if (crosshairSpreadAnimationRef.current !== null) {
      window.cancelAnimationFrame(crosshairSpreadAnimationRef.current);
    }

    setIsCrosshairRecovering(false);
    setCrosshairSpread(crosshairSpreadMaxOffset);
    crosshairSpreadAnimationRef.current = window.requestAnimationFrame(() => {
      setIsCrosshairRecovering(true);
      setCrosshairSpread(0);
      crosshairSpreadAnimationRef.current = null;
    });
  }, []);

  const requestPointerLock = useCallback(async () => {
    const canvas = mountRef.current?.querySelector("canvas");
    if (!canvas) {
      return false;
    }

    if (document.pointerLockElement === canvas) {
      return true;
    }

    suppressPointerUnlockUntilRef.current = performance.now() + 800;

    const waitForPointerLock = new Promise<boolean>((resolve) => {
      let settled = false;
      let timeoutId: number | null = null;

      const cleanup = () => {
        document.removeEventListener("pointerlockchange", handlePointerLockChange);
        document.removeEventListener("pointerlockerror", handlePointerLockError);

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };

      const settle = (locked: boolean) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(locked);
      };

      const handlePointerLockChange = () => {
        settle(document.pointerLockElement === canvas);
      };

      const handlePointerLockError = () => {
        settle(false);
      };

      document.addEventListener("pointerlockchange", handlePointerLockChange);
      document.addEventListener("pointerlockerror", handlePointerLockError);
      timeoutId = window.setTimeout(() => settle(document.pointerLockElement === canvas), 800);
    });

    try {
      await canvas.requestPointerLock();
    } catch {
      return false;
    }

    return waitForPointerLock;
  }, []);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    async ({ reset }: { reset: boolean }) => {
      const locked = await requestPointerLock();
      if (!locked) {
        return;
      }

      clearCountdownTimer();
      suppressPointerUnlockUntilRef.current = performance.now() + 250;
      remainingUiSampleRef.current.lastUpdatedAt = performance.now();
      logicAccumulatorRef.current = 0;
      logicFpsSampleRef.current = { ticks: 0, lastSampleAt: performance.now() };

      if (reset) {
        const nextDurationMs = trainingSettings.durationSeconds * 1000;

        gameStateRef.current = {
          ...gameStateRef.current,
          activeTargetIndices: [],
          hits: 0,
          misses: 0,
          isRunning: false,
          lastTargetAppearedAt: 0,
          lastTickAt: 0,
          pitch: 0,
          reactionSamples: [],
          remainingMs: nextDurationMs,
          timeline: createEmptyTimeline(nextDurationMs),
          durationMs: nextDurationMs,
          startedAt: performance.now(),
          yaw: 0,
        };
        comboCountRef.current = 0;
        savedSessionIdRef.current = null;

        setRemainingMs(nextDurationMs);
        setStats({ hits: 0, misses: 0, averageReactionMs: 0 });
        spawnInitialTargets();
      } else {
        gameStateRef.current.isRunning = false;
      }

      setCountdown(trainingSettings.startCountdownSeconds);
      setPhase("countdown");

      let nextCount = trainingSettings.startCountdownSeconds;
      countdownTimerRef.current = window.setInterval(() => {
        nextCount -= 1;

        if (nextCount > 0) {
          setCountdown(nextCount);
          return;
        }

        clearCountdownTimer();
        const startedAt = performance.now();

        if (reset) {
          targetRefs.current.forEach((target) => {
            if (!target.visible) {
              return;
            }

            target.material.opacity = 0;
            target.userData.spawnedAt = startedAt;
          });
        }

        gameStateRef.current.isRunning = true;
        gameStateRef.current.lastTickAt = startedAt;
        gameStateRef.current.lastTargetAppearedAt = startedAt;
        setPhase("running");
      }, 1000);
    },
    [
      clearCountdownTimer,
      requestPointerLock,
      spawnInitialTargets,
      trainingSettings.durationSeconds,
      trainingSettings.startCountdownSeconds,
    ],
  );

  const startTraining = useCallback(() => {
    startCountdown({ reset: true });
  }, [startCountdown]);

  const resumeTraining = useCallback(() => {
    startCountdown({ reset: false });
  }, [startCountdown]);

  const pauseTraining = useCallback(() => {
    if (!gameStateRef.current.isRunning && phaseRef.current !== "countdown") {
      return;
    }

    clearCountdownTimer();
    gameStateRef.current.isRunning = false;
    setPhase("paused");
    syncStats();
  }, [clearCountdownTimer, syncStats]);

  const openTrainingSettings = useCallback(() => {
    if (gameStateRef.current.isRunning || phaseRef.current === "countdown") {
      pauseTraining();
    }

    setIsSettingsOpen(true);
  }, [pauseTraining]);

  const restartTraining = useCallback(() => {
    setIsSettingsOpen(false);
    startCountdown({ reset: true });
  }, [startCountdown]);

  const guardOverlayAction = useCallback(
    (event: SyntheticEvent) => {
      if (areOverlayActionsEnabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [areOverlayActionsEnabled],
  );

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (
      context: AudioContext,
      {
        at,
        duration,
        frequency,
        gain,
        type = "sine",
      }: { at: number; duration: number; frequency: number; gain: number; type?: OscillatorType },
    ) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, at);
      gainNode.gain.setValueAtTime(0.0001, at);
      gainNode.gain.exponentialRampToValueAtTime(gain, at + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.02);
    },
    [],
  );

  const playAudioFile = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.currentTime = 0;
    audio.volume = 0.72;
    audio.play().catch(() => {
      // Browsers can reject audio playback if the page has not received a user gesture yet.
    });
  }, []);

  const playDefaultHitFeedback = useCallback(
    (effectType: HitEffectKind) => {
      const soundSettings = soundSettingsRef.current;
      const useEffectSound = !soundSettings.customEnabled && hitSettingsRef.current.enabled && soundSettings.useHitEffectSound;

      if (useEffectSound) {
        playAudioFile(hitEffectSoundPaths[effectType]);
        return;
      }

      const context = getAudioContext();
      if (!context) {
        return;
      }

      const now = context.currentTime;
      playTone(context, { at: now, duration: 0.045, frequency: 1320, gain: 0.178, type: "sine" });
      playTone(context, { at: now + 0.018, duration: 0.07, frequency: 1980, gain: 0.148, type: "triangle" });
    },
    [getAudioContext, playAudioFile, playTone],
  );

  const stopActiveComboClip = useCallback(() => {
    const activeClip = activeComboClipRef.current;
    if (!activeClip) {
      return;
    }

    activeClip.audio.pause();
    if (activeClip.timerId !== null) {
      window.clearTimeout(activeClip.timerId);
    }
    activeComboClipRef.current = null;
  }, []);

  const stopComboTrack = useCallback((resetToStart: boolean) => {
    const audio = comboTrackAudioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    comboPausedSecondsRef.current = audio.currentTime;
    if (resetToStart) {
      audio.currentTime = 0;
      comboPausedSecondsRef.current = 0;
    }
  }, []);

  const getComboTrackAudio = useCallback(async (assetId: string) => {
    if (comboTrackAudioRef.current && comboTrackAssetIdRef.current === assetId) {
      return comboTrackAudioRef.current;
    }

    const objectUrl = await getSoundObjectUrl(assetId);
    const audio = new Audio(objectUrl);
    comboTrackAudioRef.current = audio;
    comboTrackAssetIdRef.current = assetId;
    comboPausedSecondsRef.current = 0;
    return audio;
  }, []);

  const selectComboClip = useCallback((clips: ComboMusicClip[], comboCount: number) => {
    const sortedClips = [...clips].sort((first, second) => first.index - second.index);
    if (sortedClips.length === 0) {
      return null;
    }

    const exact = sortedClips.find((item) => item.index === comboCount);
    if (exact) {
      return exact;
    }

    const overflowBehavior = soundSettingsRef.current.custom.comboMusic.overflowBehavior;
    if (overflowBehavior === "silent" || overflowBehavior === "continueFullTrack") {
      return null;
    }

    if (overflowBehavior === "loop" || overflowBehavior === "restart") {
      return sortedClips[(comboCount - 1) % sortedClips.length] ?? null;
    }

    return sortedClips.at(-1) ?? null;
  }, []);

  const playComboMusic = useCallback(
    (comboCount: number) => {
      const soundSettings = soundSettingsRef.current;
      const comboMusic = soundSettings.custom.comboMusic;

      if (!soundSettings.enabled || !soundSettings.customEnabled || !comboMusic.enabled || !comboMusic.sourceAssetId) {
        return;
      }

      if (comboMusic.mode === "fullTrack") {
        if (comboCount > 1 && comboTrackAudioRef.current && !comboTrackAudioRef.current.paused) {
          return;
        }

        getComboTrackAudio(comboMusic.sourceAssetId)
          .then((audio) => {
            audio.volume = comboMusic.volume;
            if (comboMusic.resumeBehavior === "fromPausedPosition" && comboPausedSecondsRef.current > 0) {
              audio.currentTime = comboPausedSecondsRef.current;
            } else {
              audio.currentTime = 0;
            }
            return audio.play();
          })
          .catch(() => undefined);
        return;
      }

      const clip = selectComboClip(comboMusic.clips, comboCount);
      if (!clip) {
        if (comboMusic.overflowBehavior === "continueFullTrack") {
          getComboTrackAudio(comboMusic.sourceAssetId)
            .then((audio) => {
              audio.volume = comboMusic.volume;
              if (audio.paused) {
                return audio.play();
              }
              return undefined;
            })
            .catch(() => undefined);
        }
        return;
      }

      stopActiveComboClip();
      getSoundObjectUrl(comboMusic.sourceAssetId)
        .then((objectUrl) => {
          const audio = new Audio(objectUrl);
          const durationMs = Math.max(20, clip.endMs - clip.startMs);
          audio.volume = comboMusic.volume;
          audio.currentTime = clip.startMs / 1000;
          const timerId = window.setTimeout(() => {
            audio.pause();
            activeComboClipRef.current = null;
          }, durationMs);

          activeComboClipRef.current = { audio, timerId };
          return audio.play();
        })
        .catch(() => undefined);
    },
    [getComboTrackAudio, selectComboClip, stopActiveComboClip],
  );

  const playHitSound = useCallback(
    (effectType: HitEffectKind) => {
      const soundSettings = soundSettingsRef.current;

      if (!soundSettings.enabled) {
        return;
      }

      comboCountRef.current += 1;
      const comboMusicEnabled =
        soundSettings.customEnabled &&
        soundSettings.custom.comboMusic.enabled &&
        Boolean(soundSettings.custom.comboMusic.sourceAssetId);

      if (comboMusicEnabled) {
        playComboMusic(comboCountRef.current);
      }

      if (!soundSettings.customEnabled) {
        playDefaultHitFeedback(effectType);
        return;
      }

      const hitFeedback = soundSettings.custom.hitFeedback;
      if (!hitFeedback.enabled || (comboMusicEnabled && !hitFeedback.playWithComboMusic)) {
        return;
      }

      if (hitFeedback.source === "custom" && hitFeedback.customClip) {
        playSoundClip(hitFeedback.customClip).catch(() => undefined);
        return;
      }

      playDefaultHitFeedback(effectType);
    },
    [playComboMusic, playDefaultHitFeedback],
  );

  const playMissSound = useCallback(() => {
    const soundSettings = soundSettingsRef.current;

    if (!soundSettings.enabled) {
      return;
    }

    comboCountRef.current = 0;
    stopActiveComboClip();

    const comboMusic = soundSettings.custom.comboMusic;
    if (soundSettings.customEnabled && comboMusic.enabled) {
      if (comboMusic.breakBehavior === "restart") {
        stopComboTrack(true);
      } else if (comboMusic.breakBehavior === "pause") {
        stopComboTrack(false);
      } else {
        stopComboTrack(true);
      }
    }

    if (!soundSettings.customEnabled) {
      return;
    }

    const missFeedback = soundSettings.custom.missFeedback;
    if (missFeedback.mode === "none") {
      return;
    }

    if (missFeedback.mode === "custom" && missFeedback.customClip) {
      playSoundClip(missFeedback.customClip, missFeedback.volume).catch(() => undefined);
    }
  }, [stopActiveComboClip, stopComboTrack]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }

      if (gameStateRef.current.isRunning || phaseRef.current === "countdown") {
        pauseTraining();

        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    };
    const preventEscapeDefault = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", preventEscapeDefault, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", preventEscapeDefault, { capture: true });
    };
  }, [isSettingsOpen, pauseTraining]);

  useEffect(() => {
    return () => {
      clearCountdownTimer();

      if (crosshairSpreadAnimationRef.current !== null) {
        window.cancelAnimationFrame(crosshairSpreadAnimationRef.current);
      }

      audioContextRef.current?.close();
      audioContextRef.current = null;
      stopActiveComboClip();
      comboTrackAudioRef.current?.pause();
      comboTrackAudioRef.current = null;
      comboTrackAssetIdRef.current = null;
    };
  }, [clearCountdownTimer, stopActiveComboClip]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb8c0cc);
    scene.fog = new THREE.Fog(0xb8c0cc, 18, 38);

    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0xb8c0cc, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.transformOrigin = "center center";
    renderer.domElement.style.willChange = "transform";
    mount.appendChild(renderer.domElement);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x7f8ea3, 2.1);
    scene.add(hemisphereLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-3.8, 5.5, -2.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x8bd6ff, 14, 24);
    fillLight.position.set(3.6, 2.6, -6);
    scene.add(fillLight);

    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0x9da8b7,
      roughness: 0.72,
      metalness: 0.04,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x748197,
      roughness: 0.68,
      metalness: 0.08,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 22), roomMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -3.05, -8);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 22), roomMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 4.3, -8);
    scene.add(ceiling);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 7.4), roomMaterial);
    backWall.position.set(0, 0.62, -16);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(22, 7.4), accentMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-7.8, 0.62, -8);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(22, 7.4), accentMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(7.8, 0.62, -8);
    scene.add(rightWall);

    const createTargetMaterial = () => new THREE.MeshPhysicalMaterial({
      color: targetSettings.color,
      emissive: targetSettings.color,
      emissiveIntensity: 0.18,
      roughness: 0.34,
      metalness: 0.18,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
      opacity: 0,
      transparent: true,
    });
    const targetGeometry = new THREE.SphereGeometry(targetRadius, 48, 32);
    const targets = Array.from({ length: 3 }, () => {
      const targetMaterial = createTargetMaterial();
      const target = new THREE.Mesh(targetGeometry, targetMaterial);
      target.castShadow = true;
      target.visible = false;
      scene.add(target);
      return target;
    });
    targetRefs.current = targets;
    targetMaterialRef.current = targets.map((target) => target.material);

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    const cameraForward = new THREE.Vector3();
    const targetCenterDirection = new THREE.Vector3();
    const hitEffects: HitEffectInstance[] = [];
    let lastNukeEffectAt = 0;
    let screenShake: ScreenShakeState | null = null;

    const createBloodMistTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;

      const context = canvas.getContext("2d");
      if (context) {
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255,255,255,0.46)");
        gradient.addColorStop(0.34, "rgba(255,255,255,0.2)");
        gradient.addColorStop(0.7, "rgba(255,255,255,0.05)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    };

    const bloodMistTexture = createBloodMistTexture();

    const disposeEffectObject = (object: any) => {
      object.traverse((child: any) => {
        const effectObject = child;
        if (!effectObject.isMesh && !effectObject.isSprite) {
          return;
        }

        effectObject.geometry?.dispose();
        const material = effectObject.material;

        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material.dispose();
        }
      });
    };

    const removeHitEffect = (effect: HitEffectInstance) => {
      scene.remove(effect.group);
      disposeEffectObject(effect.group);
    };

    const pruneHitEffects = (predicate: (effect: HitEffectInstance) => boolean) => {
      for (let index = hitEffects.length - 1; index >= 0; index -= 1) {
        const effect = hitEffects[index];

        if (!predicate(effect)) {
          continue;
        }

        hitEffects.splice(index, 1);
        removeHitEffect(effect);
      }
    };

    const trimOldestHitEffects = () => {
      while (hitEffects.length >= maxActiveHitEffects) {
        const effect = hitEffects.shift();

        if (effect) {
          removeHitEffect(effect);
        }
      }
    };

    const createParticleMaterial = (color: any, opacity = 0.95) =>
      new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

    const createBloodMistMaterial = (color: any, opacity = 0.34) =>
      new THREE.SpriteMaterial({
        color,
        map: bloodMistTexture,
        opacity,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

    const createHitEffectParticle = (
      geometry: any,
      material: any,
      position: any,
      distanceScale: number,
      directionOverride?: any,
    ): HitEffectParticle => {
      const object = new THREE.Mesh(geometry, material);
      object.position.copy(position);
      object.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      const direction = directionOverride ?? new THREE.Vector3(
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.8,
          Math.random() * 0.55 + 0.15,
        ).normalize();

      return {
        direction,
        object,
        origin: position.clone(),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ),
        speed: THREE.MathUtils.randFloat(1.4, 3.4) * distanceScale,
      };
    };

    const triggerScreenShake = (intensity: number, durationMs: number) => {
      screenShake = {
        durationMs,
        intensity,
        startedAt: performance.now(),
      };
    };

    const spawnHitEffect = (position: any) => {
      const settings = hitSettingsRef.current;
      if (!settings.enabled) {
        return;
      }

      const effectType = settings.type;
      const effectNow = performance.now();

      if (effectType === "nuke") {
        triggerScreenShake(18, 760);

        if (effectNow - lastNukeEffectAt < nukeEffectCooldownMs) {
          return;
        }

        lastNukeEffectAt = effectNow;
        pruneHitEffects((effect) => effect.type === "nuke");
        trimOldestHitEffects();
      } else {
        trimOldestHitEffects();
      }

      const group = new THREE.Group();
      group.position.copy(position);
      scene.add(group);

      const particles: HitEffectParticle[] = [];
      const targetColor = new THREE.Color(targetSettingsRef.current.color);
      const accentColor = targetColor.clone().offsetHSL(0.08, 0.2, 0.18);
      const durationMs =
        effectType === "nuke"
          ? 1180
          : effectType === "explosion"
            ? 620
            : effectType === "bloodMist"
              ? 680
              : effectType === "balloon"
                ? 460
                : 520;
      let ring: any;
      let blastRings: any[] | undefined;
      let shockLight: any;

      if (effectType === "burst") {
        const ringMaterial = createParticleMaterial(targetColor, 0.72);
        ring = new THREE.Mesh(new THREE.TorusGeometry(targetRadius * 0.72, 0.028, 10, 72), ringMaterial);
        group.add(ring);
      }

      if (effectType === "explosion") {
        const coreMaterial = createParticleMaterial(0xffb347, 0.9);
        ring = new THREE.Mesh(new THREE.SphereGeometry(targetRadius * 0.42, 24, 16), coreMaterial);
        group.add(ring);
      }

      if (effectType === "nuke") {
        const coreMaterial = createParticleMaterial(0xffffff, 1);
        ring = new THREE.Mesh(new THREE.SphereGeometry(targetRadius * 0.78, 32, 20), coreMaterial);
        group.add(ring);

        blastRings = [
          new THREE.Mesh(new THREE.TorusGeometry(targetRadius * 0.92, 0.04, 12, 96), createParticleMaterial(0xfff3a8, 0.92)),
          new THREE.Mesh(new THREE.TorusGeometry(targetRadius * 1.12, 0.035, 12, 96), createParticleMaterial(0xff8a2a, 0.78)),
          new THREE.Mesh(new THREE.TorusGeometry(targetRadius * 1.36, 0.03, 12, 96), createParticleMaterial(0xff3728, 0.62)),
        ];

        blastRings.forEach((blastRing, index) => {
          blastRing.rotation.set(
            index === 1 ? Math.PI / 2 : THREE.MathUtils.degToRad(72),
            index === 2 ? Math.PI / 2 : 0,
            index * THREE.MathUtils.degToRad(36),
          );
          group.add(blastRing);
        });

        shockLight = new THREE.PointLight(0xffc15f, 18, 14);
        group.add(shockLight);
      }

      const particleCount =
        effectType === "nuke"
          ? nukeParticleCount
          : effectType === "bloodMist"
            ? bloodMistParticleCount
            : effectType === "explosion"
              ? 24
              : effectType === "balloon"
                ? 18
                : 20;

      for (let index = 0; index < particleCount; index += 1) {
        const color =
          effectType === "nuke"
            ? [0xffffff, 0xfff1a6, 0xffb347, 0xff6a2a, 0xff2f1f][index % 5]
            : effectType === "explosion"
            ? [0xfff1a6, 0xff9a3d, 0xff4d2e][index % 3]
            : effectType === "balloon" || effectType === "bloodMist"
              ? targetColor
              : index % 2 === 0
                ? targetColor
                : accentColor;
        const balloonDirection = new THREE.Vector3(
          Math.cos((index / particleCount) * Math.PI * 2) * THREE.MathUtils.randFloat(0.65, 1.2),
          Math.sin((index / particleCount) * Math.PI * 2) * THREE.MathUtils.randFloat(0.65, 1.2),
          THREE.MathUtils.randFloat(0.08, 0.55),
        ).normalize();
        const balloonOrigin = balloonDirection.clone().multiplyScalar(targetRadius * THREE.MathUtils.randFloat(0.36, 0.62));
        const geometry =
          effectType === "balloon"
            ? new THREE.CircleGeometry(THREE.MathUtils.randFloat(0.12, 0.23), 3)
            : effectType === "bloodMist"
              ? undefined
            : effectType === "nuke"
              ? index % 4 === 0
                ? new THREE.BoxGeometry(
                    THREE.MathUtils.randFloat(0.07, 0.16),
                    THREE.MathUtils.randFloat(0.28, 0.58),
                    THREE.MathUtils.randFloat(0.07, 0.14),
                  )
                : new THREE.SphereGeometry(THREE.MathUtils.randFloat(0.06, 0.18), 12, 8)
            : effectType === "explosion"
              ? new THREE.SphereGeometry(THREE.MathUtils.randFloat(0.045, 0.11), 10, 8)
              : new THREE.BoxGeometry(
                  THREE.MathUtils.randFloat(0.05, 0.09),
                  THREE.MathUtils.randFloat(0.18, 0.34),
                  THREE.MathUtils.randFloat(0.04, 0.08),
                );
        const particle =
          effectType === "bloodMist"
            ? (() => {
                const material = createBloodMistMaterial(color, THREE.MathUtils.randFloat(0.16, 0.32));
                const object = new THREE.Sprite(material);
                const mistOrigin = balloonDirection
                  .clone()
                  .multiplyScalar(targetRadius * THREE.MathUtils.randFloat(0.08, 0.38));
                object.position.copy(mistOrigin);

                return {
                  direction: balloonDirection,
                  object,
                  origin: mistOrigin.clone(),
                  spin: new THREE.Vector3(
                    THREE.MathUtils.randFloat(-1.2, 1.2),
                    THREE.MathUtils.randFloat(-1.2, 1.2),
                    THREE.MathUtils.randFloat(-1.2, 1.2),
                  ),
                  speed: THREE.MathUtils.randFloat(0.72, 1.35),
                };
              })()
            : createHitEffectParticle(
                geometry,
                createParticleMaterial(color, 0.95),
                effectType === "balloon" ? balloonOrigin : new THREE.Vector3(0, 0, 0),
                effectType === "nuke"
                  ? 2.55
                  : effectType === "explosion"
                    ? 1.18
                    : effectType === "balloon"
                      ? 1.05
                      : 0.88,
                effectType === "balloon" ? balloonDirection : undefined,
              );

        if (effectType === "nuke") {
          particle.speed *= THREE.MathUtils.randFloat(1.35, 2.15);
          particle.spin.multiplyScalar(1.45);
        } else if (effectType === "bloodMist") {
          particle.direction.x *= THREE.MathUtils.randFloat(0.42, 0.78);
          particle.direction.z *= THREE.MathUtils.randFloat(0.08, 0.24);
          particle.direction.y += THREE.MathUtils.randFloat(0.08, 0.34);
          particle.direction.normalize();
        }

        particles.push(particle);
        group.add(particle.object);
      }

      hitEffects.push({
        blastRings,
        durationMs,
        group,
        particles,
        ring,
        shockLight,
        startedAt: performance.now(),
        type: effectType,
      });
    };

    const updateHitEffects = (frameNow: number) => {
      for (let index = hitEffects.length - 1; index >= 0; index -= 1) {
        const effect = hitEffects[index];
        const progress = THREE.MathUtils.clamp((frameNow - effect.startedAt) / effect.durationMs, 0, 1);
        const easeOut = 1 - (1 - progress) ** 3;
        const fade = 1 - progress;

        if (effect.ring) {
          const ringMaterial = effect.ring.material;
          const ringScale =
            effect.type === "nuke"
              ? 1 + easeOut * 5.8
              : effect.type === "explosion"
              ? 1 + easeOut * 2.7
              : effect.type === "burst"
                ? 1 + easeOut * 0.25
                : 1 + easeOut * 2.45;

          effect.ring.scale.setScalar(ringScale);
          ringMaterial.opacity = Math.max(0, fade * (effect.type === "nuke" ? 1 : 0.78));
        }

        effect.blastRings?.forEach((blastRing, ringIndex) => {
          const ringMaterial = blastRing.material;
          const delayedProgress = THREE.MathUtils.clamp(progress * (1.12 + ringIndex * 0.16) - ringIndex * 0.08, 0, 1);
          const delayedEaseOut = 1 - (1 - delayedProgress) ** 3;
          blastRing.scale.setScalar(1 + delayedEaseOut * (6.8 + ringIndex * 2.35));
          ringMaterial.opacity = Math.max(0, (1 - delayedProgress) * (0.68 - ringIndex * 0.12));
        });

        if (effect.shockLight) {
          effect.shockLight.intensity = Math.max(0, fade * fade * 18);
        }

        effect.particles.forEach((particle) => {
          const material = particle.object.material;
          const distance = particle.speed * easeOut;
          const gravity =
            effect.type === "nuke"
              ? progress * progress * 0.48
              : effect.type === "bloodMist"
                ? progress * progress * 0.18
              : effect.type === "balloon"
                ? progress * progress * 1.05
                : progress * progress * 0.25;

          particle.object.position.copy(particle.origin).addScaledVector(particle.direction, distance);
          particle.object.position.y -= gravity;
          if (effect.type === "bloodMist") {
            particle.object.position.x += Math.sin(progress * Math.PI * 2 + particle.spin.x) * 0.08 * fade;
            particle.object.position.y += Math.cos(progress * Math.PI * 1.6 + particle.spin.y) * 0.06 * fade;
          }
          particle.object.rotation.x += particle.spin.x * 0.015;
          particle.object.rotation.y += particle.spin.y * 0.015;
          particle.object.rotation.z += particle.spin.z * 0.015;
          particle.object.scale.setScalar(
            effect.type === "balloon"
              ? 0.95
              : effect.type === "nuke"
                ? 0.38 + fade * 1.55
                : effect.type === "bloodMist"
                  ? 0.42 + easeOut * 1.82
                : 0.45 + fade * 0.85,
          );
          material.opacity =
            effect.type === "balloon"
              ? 0.95
              : effect.type === "bloodMist"
                ? Math.max(0, fade * 0.34)
                : Math.max(0, fade);
        });

        if (progress >= 1) {
          hitEffects.splice(index, 1);
          removeHitEffect(effect);
        }
      }
    };

    const updateScreenShake = (frameNow: number) => {
      if (!screenShake) {
        renderer.domElement.style.transform = "";
        return;
      }

      const progress = THREE.MathUtils.clamp((frameNow - screenShake.startedAt) / screenShake.durationMs, 0, 1);

      if (progress >= 1) {
        screenShake = null;
        renderer.domElement.style.transform = "";
        return;
      }

      const fade = (1 - progress) ** 2;
      const amplitude = screenShake.intensity * fade;
      const offsetX = (Math.random() - 0.5) * amplitude;
      const offsetY = (Math.random() - 0.5) * amplitude;
      const rotation = (Math.random() - 0.5) * amplitude * 0.045;

      renderer.domElement.style.transform = `translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, 0) rotate(${rotation.toFixed(3)}deg)`;
    };

    const updateGameLogic = (deltaMs: number) => {
      const gameState = gameStateRef.current;
      gameState.remainingMs = Math.max(0, gameState.remainingMs - deltaMs);
      logicFpsSampleRef.current.ticks += 1;
    };

    const updateAimAssist = (deltaMs: number) => {
      const settings = aimAssistSettingsRef.current;
      if (!settings.enabled || phaseRef.current !== "running" || !gameStateRef.current.isRunning) {
        return;
      }

      const strength = THREE.MathUtils.clamp(settings.strength, 1, 100) / 100;
      const assistAngle = THREE.MathUtils.lerp(
        aimAssistMinAngleRadians,
        aimAssistMaxAngleRadians,
        strength ** 1.08,
      );
      const maxRadiansPerSecond = THREE.MathUtils.lerp(
        aimAssistMinRadiansPerSecond,
        aimAssistMaxRadiansPerSecond,
        strength ** 1.35,
      );
      let nearestTarget: any | null = null;
      let nearestAngle = Number.POSITIVE_INFINITY;

      camera.getWorldDirection(cameraForward);

      targetRefs.current.forEach((target) => {
        if (!target.visible) {
          return;
        }

        targetCenterDirection.copy(target.position).sub(camera.position).normalize();
        const targetAngle = cameraForward.angleTo(targetCenterDirection);

        if (targetAngle <= assistAngle && targetAngle < nearestAngle) {
          nearestAngle = targetAngle;
          nearestTarget = target;
        }
      });

      if (!nearestTarget) {
        return;
      }

      const targetPosition = nearestTarget.position;
      const desiredYaw = -Math.atan2(targetPosition.x, -targetPosition.z);
      const flatDistance = Math.hypot(targetPosition.x, targetPosition.z);
      const desiredPitch = Math.atan2(targetPosition.y, flatDistance);
      const gameState = gameStateRef.current;
      const falloff = Math.max(0, 1 - nearestAngle / assistAngle);
      const assistFactor = 0.25 + falloff ** 0.62 * 0.75;
      const maxStep = maxRadiansPerSecond * (deltaMs / 1000) * assistFactor;
      const yawDelta = THREE.MathUtils.clamp(desiredYaw - gameState.yaw, -maxStep, maxStep);
      const pitchDelta = THREE.MathUtils.clamp(desiredPitch - gameState.pitch, -maxStep, maxStep);

      gameState.yaw = THREE.MathUtils.clamp(gameState.yaw + yawDelta, -maxYaw, maxYaw);
      gameState.pitch = THREE.MathUtils.clamp(gameState.pitch + pitchDelta, -maxPitch, maxPitch);
      camera.rotation.set(gameState.pitch, gameState.yaw, 0, "YXZ");
    };

    const updateTargetFadeIn = (frameNow: number) => {
      targetRefs.current.forEach((target) => {
        if (!target.visible) {
          return;
        }

        const spawnedAt = target.userData.spawnedAt as number | undefined;
        const fadeProgress = spawnedAt ? (frameNow - spawnedAt) / targetFadeInMs : 1;
        target.material.opacity = THREE.MathUtils.clamp(fadeProgress, 0, 1);
      });
    };

    const animate = () => {
      const frameNow = performance.now();
      const minFrameIntervalMs = 1000 / fpsLimitRef.current;
      const elapsedSinceRender = frameNow - lastRenderedAtRef.current;

      if (lastRenderedAtRef.current > 0 && elapsedSinceRender < minFrameIntervalMs - 0.5) {
        animationRef.current = window.requestAnimationFrame(animate);
        return;
      }

      lastRenderedAtRef.current = frameNow - (elapsedSinceRender % minFrameIntervalMs);
      const fpsSample = fpsSampleRef.current;
      fpsSample.frames += 1;

      if (frameNow - fpsSample.lastSampleAt >= 500) {
        setFps((fpsSample.frames * 1000) / (frameNow - fpsSample.lastSampleAt));
        fpsSample.frames = 0;
        fpsSample.lastSampleAt = frameNow;
      }

      const logicFpsSample = logicFpsSampleRef.current;
      if (frameNow - logicFpsSample.lastSampleAt >= 500) {
        setLogicFps((logicFpsSample.ticks * 1000) / (frameNow - logicFpsSample.lastSampleAt));
        logicFpsSample.ticks = 0;
        logicFpsSample.lastSampleAt = frameNow;
      }

      const gameState = gameStateRef.current;
      const renderDeltaMs =
        gameState.lastTickAt > 0
          ? Math.min(Math.max(frameNow - gameState.lastTickAt, 0), maxAccumulatedLogicMs)
          : logicStepMs;
      if (gameState.isRunning) {
        const deltaMs = Math.min(frameNow - gameState.lastTickAt, maxAccumulatedLogicMs);
        gameState.lastTickAt = frameNow;
        logicAccumulatorRef.current += deltaMs;

        while (logicAccumulatorRef.current >= logicStepMs && gameState.remainingMs > 0) {
          updateGameLogic(logicStepMs);
          logicAccumulatorRef.current -= logicStepMs;
        }

        if (gameState.remainingMs <= 0) {
          logicAccumulatorRef.current = 0;
          setRemainingMs(0);
          finishTraining();
        } else if (frameNow - remainingUiSampleRef.current.lastUpdatedAt >= remainingUiUpdateIntervalMs) {
          remainingUiSampleRef.current.lastUpdatedAt = frameNow;
          setRemainingMs(gameState.remainingMs);
        }
      }

      updateAimAssist(renderDeltaMs);
      updateTargetFadeIn(frameNow);
      updateHitEffects(frameNow);
      updateScreenShake(frameNow);
      renderer.render(scene, camera);
      animationRef.current = window.requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) {
        return;
      }

      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (
        (phaseRef.current !== "running" && phaseRef.current !== "countdown") ||
        document.pointerLockElement !== renderer.domElement
      ) {
        return;
      }

      const gameState = gameStateRef.current;
      gameState.yaw -= event.movementX * sensitivityRef.current.x * baseRadiansPerPixel;
      gameState.pitch -= event.movementY * sensitivityRef.current.y * baseRadiansPerPixel;
      gameState.yaw = THREE.MathUtils.clamp(gameState.yaw, -maxYaw, maxYaw);
      gameState.pitch = THREE.MathUtils.clamp(gameState.pitch, -maxPitch, maxPitch);
      camera.rotation.set(gameState.pitch, gameState.yaw, 0, "YXZ");
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        phaseRef.current !== "running" ||
        !gameStateRef.current.isRunning ||
        document.pointerLockElement !== renderer.domElement
      ) {
        return;
      }

      raycaster.setFromCamera(center, camera);
      const intersections = raycaster.intersectObjects(targetRefs.current, false);
      const hitTarget = intersections.find((intersection: any) => intersection.object.visible)?.object;
      const gameState = gameStateRef.current;
      const elapsedMs = gameState.durationMs - gameState.remainingMs;
      const bucketIndex = Math.min(
        gameState.timeline.length - 1,
        Math.max(0, Math.floor(elapsedMs / 1000)),
      );
      const bucket = gameState.timeline[bucketIndex];

      bucket.shots += 1;

      if (hitTarget) {
        const hitAt = performance.now();
        const reactionStartedAt = gameState.lastTargetAppearedAt || gameState.startedAt || hitAt;
        const reactionMs = Math.max(0, hitAt - reactionStartedAt);

        gameState.hits += 1;
        gameState.reactionSamples.push(reactionMs);
        bucket.hits += 1;
        bucket.reactionTotalMs += reactionMs;
        bucket.reactionSamples += 1;
        playHitSound(hitSettingsRef.current.type);
        spawnHitEffect(hitTarget.position.clone());
        replaceHitTarget(hitTarget);
      } else {
        gameState.misses += 1;
        playMissSound();
      }

      playCrosshairSpread();
      syncStats();
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      setIsPointerLocked(locked);

      if (!locked && performance.now() < suppressPointerUnlockUntilRef.current) {
        return;
      }

      if (!locked && (gameStateRef.current.isRunning || phaseRef.current === "countdown")) {
        pauseTraining();
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);

      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }

      renderer.dispose();
      targetGeometry.dispose();
      targetMaterialRef.current.forEach((targetMaterial) => targetMaterial.dispose());
      targetMaterialRef.current = [];
      hitEffects.forEach(removeHitEffect);
      hitEffects.length = 0;
      renderer.domElement.style.transform = "";
      bloodMistTexture.dispose();
      roomMaterial.dispose();
      accentMaterial.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [finishTraining, pauseTraining, playCrosshairSpread, playHitSound, playMissSound, replaceHitTarget, syncStats]);

  const shots = stats.hits + stats.misses;
  const accuracy = shots > 0 ? Math.round((stats.hits / shots) * 100) : 0;
  const score = calculateTrainingScore({
    accuracy,
    averageReactionMs: stats.averageReactionMs,
    durationSeconds: Math.round(gameStateRef.current.durationMs / 1000),
    hits: stats.hits,
  });
  const displayedCrosshairSize = crosshairSettings.size;
  const crosshairLineLength = displayedCrosshairSize * 0.32;
  const crosshairLineGap = crosshairSettings.outerCrosshairOffset + crosshairSpread;
  const crosshairSpreadTransition = isCrosshairRecovering
    ? `transform ${crosshairSettings.spreadRecoverySeconds}s ${crosshairRecoveryEasing}`
    : "none";
  const resultTrend = useMemo(() => {
    const timeline = gameStateRef.current.timeline;

    return {
      seconds: timeline.map((_, index) => `${index + 1}s`),
      accuracy: timeline.map((bucket) =>
        bucket.shots > 0 ? Math.round((bucket.hits / bucket.shots) * 100) : 0,
      ),
      hits: timeline.map((bucket) => bucket.hits),
      averageReaction: timeline.map((bucket) =>
        bucket.reactionSamples > 0 ? Math.round(bucket.reactionTotalMs / bucket.reactionSamples) : 0,
      ),
    };
  }, [phase, stats.averageReactionMs, stats.hits, stats.misses]);


  return {
    t,
    mountRef,
    phase,
    countdown,
    fps,
    logicFps,
    remainingMs,
    stats,
    accuracy,
    score,
    crosshairSettings,
    displayedCrosshairSize,
    crosshairLineLength,
    crosshairLineGap,
    crosshairSpreadTransition,
    resultTrend,
    isSettingsOpen,
    areOverlayActionsEnabled,
    startTraining,
    resumeTraining,
    restartTraining,
    openTrainingSettings,
    setIsSettingsOpen,
    guardOverlayAction,
  };
}

export type Grid3x3TrainingViewModel = ReturnType<typeof useGrid3x3Training>;
