import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Crosshair, MousePointer2, RotateCcw, Settings, Timer, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { ResultTrendChart } from "@/components/training/ResultTrendChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

const durationMs = 60_000;
const distance = 12;
const spacing = 2.15;
const targetRadius = 0.88;
const baseRadiansPerPixel = 0.002;
const sensitivity = 0.8;
const maxYaw = Math.PI / 2;
const maxPitch = Math.PI / 2;

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
  lastTickAt: number;
  pitch: number;
  reactionSamples: number[];
  remainingMs: number;
  timeline: TimelineBucket[];
  startedAt: number;
  yaw: number;
}

interface TimelineBucket {
  hits: number;
  shots: number;
  reactionTotalMs: number;
  reactionSamples: number;
}

const createEmptyTimeline = () =>
  Array.from({ length: Math.ceil(durationMs / 1000) }, () => ({
    hits: 0,
    shots: 0,
    reactionTotalMs: 0,
    reactionSamples: 0,
  }));

export function TrainingPage() {
  const { t } = useTranslation("training");
  const mountRef = useRef<HTMLDivElement>(null);
  const targetRefs = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const gameStateRef = useRef<MutableGameState>({
    activeTargetIndices: [],
    hits: 0,
    misses: 0,
    isRunning: false,
    lastTickAt: 0,
    pitch: 0,
    reactionSamples: [],
    remainingMs: durationMs,
    timeline: createEmptyTimeline(),
    startedAt: 0,
    yaw: 0,
  });
  const countdownTimerRef = useRef<number | null>(null);
  const fpsSampleRef = useRef({ frames: 0, lastSampleAt: performance.now() });
  const [phase, setPhase] = useState<"idle" | "countdown" | "running" | "paused" | "complete">("idle");
  const phaseRef = useRef<typeof phase>("idle");
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [fps, setFps] = useState(0);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [stats, setStats] = useState<GridStats>({
    hits: 0,
    misses: 0,
    averageReactionMs: 0,
  });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

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

  const setTargetToGridIndex = useCallback((target: any, gridIndex: number) => {
    target.position.copy(gridPositions[gridIndex]);
    target.visible = true;
    target.userData.gridIndex = gridIndex;
    target.userData.spawnedAt = performance.now();
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
    gameStateRef.current.isRunning = false;
    setPhase("complete");
    setRemainingMs(0);
    syncStats();

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [syncStats]);

  const requestPointerLock = useCallback(async () => {
    const canvas = mountRef.current?.querySelector("canvas");
    if (!canvas) {
      return false;
    }

    if (document.pointerLockElement === canvas) {
      return true;
    }

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
      await canvas.requestPointerLock({ unadjustedMovement: true });
    } catch {
      try {
        await canvas.requestPointerLock();
      } catch {
        return false;
      }
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

      if (reset) {
        gameStateRef.current = {
          ...gameStateRef.current,
          activeTargetIndices: [],
          hits: 0,
          misses: 0,
          isRunning: false,
          lastTickAt: 0,
          pitch: 0,
          reactionSamples: [],
          remainingMs: durationMs,
          timeline: createEmptyTimeline(),
          startedAt: performance.now(),
          yaw: 0,
        };

        setRemainingMs(durationMs);
        setStats({ hits: 0, misses: 0, averageReactionMs: 0 });
        spawnInitialTargets();
      } else {
        gameStateRef.current.isRunning = false;
      }

      setCountdown(3);
      setPhase("countdown");

      let nextCount = 3;
      countdownTimerRef.current = window.setInterval(() => {
        nextCount -= 1;

        if (nextCount > 0) {
          setCountdown(nextCount);
          return;
        }

        clearCountdownTimer();
        gameStateRef.current.isRunning = true;
        gameStateRef.current.lastTickAt = performance.now();
        setPhase("running");
      }, 1000);
    },
    [clearCountdownTimer, requestPointerLock, spawnInitialTargets],
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

  const restartTraining = useCallback(() => {
    startCountdown({ reset: true });
  }, [startCountdown]);

  useEffect(() => {
    return () => clearCountdownTimer();
  }, [clearCountdownTimer]);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0xb8c0cc, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    const targetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff7a1a,
      emissive: 0x6b1800,
      emissiveIntensity: 0.18,
      roughness: 0.34,
      metalness: 0.18,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
    });
    const targetGeometry = new THREE.SphereGeometry(targetRadius, 48, 32);
    const targets = Array.from({ length: 3 }, () => {
      const target = new THREE.Mesh(targetGeometry, targetMaterial);
      target.castShadow = true;
      target.visible = false;
      scene.add(target);
      return target;
    });
    targetRefs.current = targets;

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    const animate = () => {
      const frameNow = performance.now();
      const fpsSample = fpsSampleRef.current;
      fpsSample.frames += 1;

      if (frameNow - fpsSample.lastSampleAt >= 500) {
        setFps((fpsSample.frames * 1000) / (frameNow - fpsSample.lastSampleAt));
        fpsSample.frames = 0;
        fpsSample.lastSampleAt = frameNow;
      }

      const gameState = gameStateRef.current;
      if (gameState.isRunning) {
        const deltaMs = frameNow - gameState.lastTickAt;
        gameState.lastTickAt = frameNow;
        gameState.remainingMs = Math.max(0, gameState.remainingMs - deltaMs);
        setRemainingMs(gameState.remainingMs);

        if (gameState.remainingMs <= 0) {
          finishTraining();
        }
      }

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
      gameState.yaw -= event.movementX * sensitivity * baseRadiansPerPixel;
      gameState.pitch -= event.movementY * sensitivity * baseRadiansPerPixel;
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
      const elapsedMs = durationMs - gameState.remainingMs;
      const bucketIndex = Math.min(
        gameState.timeline.length - 1,
        Math.max(0, Math.floor(elapsedMs / 1000)),
      );
      const bucket = gameState.timeline[bucketIndex];

      bucket.shots += 1;

      if (hitTarget) {
        const reactionMs = performance.now() - hitTarget.userData.spawnedAt;

        gameState.hits += 1;
        gameState.reactionSamples.push(reactionMs);
        bucket.hits += 1;
        bucket.reactionTotalMs += reactionMs;
        bucket.reactionSamples += 1;
        replaceHitTarget(hitTarget);
      } else {
        gameState.misses += 1;
      }

      syncStats();
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      setIsPointerLocked(locked);

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
      targetMaterial.dispose();
      roomMaterial.dispose();
      accentMaterial.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [finishTraining, pauseTraining, replaceHitTarget, syncStats]);

  const shots = stats.hits + stats.misses;
  const accuracy = shots > 0 ? Math.round((stats.hits / shots) * 100) : 0;
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

  return (
    <main className="relative h-screen overflow-hidden bg-background text-foreground">
      <div ref={mountRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.03)_48%,rgba(0,0,0,0.22)_100%)]" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-white/80" />
        <div className="absolute bottom-0 left-1/2 h-2.5 w-px -translate-x-1/2 bg-white/80" />
        <div className="absolute left-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-white/80" />
        <div className="absolute right-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-white/80" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/80" />
      </div>

      <div className="absolute left-6 right-6 top-6 z-20 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-white/10 bg-black/30 px-4 py-1.5 backdrop-blur-xl">
            <Crosshair className="h-3.5 w-3.5 text-primary" />
            {t("grid3x3.mode", { defaultValue: "Grid 3x3" })}
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-black/30 px-4 py-1.5 backdrop-blur-xl">
            FPS {fps.toFixed(2)}
          </Badge>
        </div>

        <div className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-3">
          <HudStat icon={Timer} label={t("grid3x3.time", { defaultValue: "剩余时间" })} value={`${Math.ceil(remainingMs / 1000)}s`} />
          <HudStat label={t("grid3x3.hits", { defaultValue: "命中" })} value={stats.hits} />
          <HudStat label={t("grid3x3.accuracy", { defaultValue: "命中率" })} value={`${accuracy}%`} />
        </div>

        <Button asChild variant="outline" className="bg-black/30 backdrop-blur-xl">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            {t("grid3x3.backHome", { defaultValue: "返回首页" })}
          </Link>
        </Button>
      </div>

      {phase === "idle" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-6 backdrop-blur-sm">
          <div className="max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_45px_rgba(0,200,200,0.14)]">
              <MousePointer2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("grid3x3.title", { defaultValue: "九宫格射击训练" })}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {t("grid3x3.subtitle", {
                defaultValue: "在固定九宫格中快速定位并命中目标。",
              })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              {t("grid3x3.clickToStart", {
                defaultValue: "点击开始后会锁定鼠标。移动鼠标瞄准，左键射击。",
              })}
            </p>
            <Button size="lg" onClick={startTraining} className="mt-8 px-10 py-6">
              {t("grid3x3.start", { defaultValue: "开始训练" })}
            </Button>
          </div>
        </div>
      )}

      {phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="-translate-y-32 text-[7rem] font-bold leading-none text-white drop-shadow-[0_0_45px_rgba(0,0,0,0.75)]">
            {countdown}
          </div>
        </div>
      )}

      {phase === "complete" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-6 backdrop-blur-md">
          <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-primary">
                    {t("grid3x3.complete", { defaultValue: "训练完成" })}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {t("grid3x3.title", { defaultValue: "九宫格射击训练" })}
                  </h2>
                </div>
              </div>

              <div className="mb-6 grid gap-3 md:grid-cols-3">
                <ResultStat label={t("grid3x3.hits", { defaultValue: "命中" })} value={stats.hits} />
                <ResultStat label={t("grid3x3.accuracy", { defaultValue: "命中率" })} value={`${accuracy}%`} />
                <ResultStat
                  label={t("grid3x3.averageReaction", { defaultValue: "平均反应" })}
                  value={stats.averageReactionMs ? `${stats.averageReactionMs}ms` : "-"}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <ResultTrendChart
                  seconds={resultTrend.seconds}
                  accuracy={resultTrend.accuracy}
                  hits={resultTrend.hits}
                  averageReaction={resultTrend.averageReaction}
                  accuracyLabel={t("grid3x3.accuracyTrend", { defaultValue: "命中率分布" })}
                  hitsLabel={t("grid3x3.hitTrend", { defaultValue: "命中分布" })}
                  averageReactionLabel={t("grid3x3.reactionTrend", {
                    defaultValue: "平均反应分布",
                  })}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <div className="mb-5 text-center">
                <div className="text-sm uppercase tracking-[0.24em] text-primary">
                  {t("grid3x3.complete", { defaultValue: "训练完成" })}
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {t("grid3x3.mode", { defaultValue: "Grid 3x3" })}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={restartTraining} className="py-6">
                  <RotateCcw className="h-4 w-4" />
                  {t("grid3x3.restart", { defaultValue: "重新开始" })}
                </Button>
                <Button size="lg" variant="outline" className="py-6">
                  <Settings className="h-4 w-4" />
                  {t("grid3x3.settings", { defaultValue: "设置" })}
                </Button>
                <Button asChild size="lg" variant="outline" className="py-6">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4" />
                    {t("grid3x3.backHome", { defaultValue: "返回首页" })}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-6 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
            <div className="mb-5 text-center">
              <div className="text-sm uppercase tracking-[0.24em] text-primary">
                {t("grid3x3.paused", { defaultValue: "已暂停" })}
              </div>
              <div className="mt-2 text-2xl font-bold">
                {t("grid3x3.title", { defaultValue: "九宫格射击训练" })}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={resumeTraining} className="py-6">
                {t("grid3x3.continue", { defaultValue: "继续游戏" })}
              </Button>
              <Button size="lg" variant="outline" onClick={restartTraining} className="py-6">
                <RotateCcw className="h-4 w-4" />
                {t("grid3x3.restart", { defaultValue: "重新开始" })}
              </Button>
              <Button size="lg" variant="outline" className="py-6">
                <Settings className="h-4 w-4" />
                {t("grid3x3.settings", { defaultValue: "设置" })}
              </Button>
              <Button asChild size="lg" variant="outline" className="py-6">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  {t("grid3x3.backHome", { defaultValue: "返回首页" })}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

interface HudStatProps {
  icon?: typeof Timer;
  label: string;
  value: string | number;
}

function HudStat({ icon: Icon, label, value }: HudStatProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-5 py-2.5 text-base shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-bold text-foreground">{value}</span>
    </div>
  );
}

interface ResultStatProps {
  label: string;
  value: string | number;
}

function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}
