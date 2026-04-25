import { useEffect, useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

interface ParallaxBackgroundProps {
  intensityBoost?: number;
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

export function ParallaxBackground({
  intensityBoost = 0,
}: ParallaxBackgroundProps) {
  const frameRef = useRef<number | null>(null);
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [smoothPosition, setSmoothPosition] = useState<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const animate = () => {
      setSmoothPosition((prev) => ({
        x: lerp(prev.x, mousePosition.x, 0.08),
        y: lerp(prev.y, mousePosition.y, 0.08),
      }));
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [mousePosition]);

  const intensity = 1 + intensityBoost * 0.3;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-[-60px]"
        style={{
          transform: `translate(${smoothPosition.x * 15 * intensity}px, ${smoothPosition.y * 15 * intensity}px) scale(1.15)`,
        }}
      >
        <img src="/images/hero-bg.jpg" alt="" className="h-full w-full object-cover" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      <div
        className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, oklch(0.75 0.18 195 / 0.4) 0%, transparent 70%)",
          transform: `translate(${smoothPosition.x * 35 * intensity}px, ${smoothPosition.y * 35 * intensity}px)`,
          filter: "blur(80px)",
        }}
      />

      <div
        className="absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full opacity-25"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.19 50 / 0.5) 0%, transparent 70%)",
          transform: `translate(${smoothPosition.x * -25 * intensity}px, ${smoothPosition.y * -25 * intensity}px)`,
          filter: "blur(100px)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
        style={{
          background: "radial-gradient(ellipse, oklch(0.98 0 0 / 0.1) 0%, transparent 60%)",
          transform: `translate(calc(-50% + ${smoothPosition.x * 10}px), calc(-50% + ${smoothPosition.y * 10}px))`,
        }}
      />

      <div
        className="absolute inset-[-20px] opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.75 0.18 195 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.75 0.18 195 / 0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: `translate(${smoothPosition.x * -8}px, ${smoothPosition.y * -8}px)`,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.95) 100%)",
        }}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

      <div
        className="absolute inset-0 opacity-30"
        style={{
          transform: `translate(${smoothPosition.x * 5}px, ${smoothPosition.y * 5}px)`,
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-primary/40"
            style={{
              width: `${2 + index * 0.5}px`,
              height: `${2 + index * 0.5}px`,
              left: `${15 + index * 15}%`,
              top: `${20 + (index % 3) * 25}%`,
              filter: "blur(1px)",
              animation: `float ${4 + index}s ease-in-out infinite`,
              animationDelay: `${index * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
