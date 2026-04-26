import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import * as THREE from "three";
import { useTranslation } from "@/i18n";
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
  const trainingSettings = useSettingsStore((state) => state.training);
  const crosshairSettings = useSettingsStore((state) => state.crosshair);
  const targetSettings = useSettingsStore((state) => state.target);
  const crosshairSettingsRef = useRef(crosshairSettings);
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
    sensitivityRef.current = {
      x: trainingSettings.sensitivityX,
      y: trainingSettings.sensitivityY,
    };
  }, [trainingSettings.sensitivityX, trainingSettings.sensitivityY]);

  useEffect(() => {
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
    gameStateRef.current.isRunning = false;
    setPhase("complete");
    setRemainingMs(0);
    syncStats();

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

        setRemainingMs(nextDurationMs);
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
    [clearCountdownTimer, requestPointerLock, spawnInitialTargets, trainingSettings.durationSeconds],
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
    };
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

    const updateGameLogic = (deltaMs: number) => {
      const gameState = gameStateRef.current;
      gameState.remainingMs = Math.max(0, gameState.remainingMs - deltaMs);
      logicFpsSampleRef.current.ticks += 1;
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

      updateTargetFadeIn(frameNow);
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
        replaceHitTarget(hitTarget);
      } else {
        gameState.misses += 1;
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
      roomMaterial.dispose();
      accentMaterial.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [finishTraining, pauseTraining, playCrosshairSpread, replaceHitTarget, syncStats]);

  const shots = stats.hits + stats.misses;
  const accuracy = shots > 0 ? Math.round((stats.hits / shots) * 100) : 0;
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
