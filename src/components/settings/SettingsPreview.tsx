interface SettingsPreviewProps {
  centerDotEnabled: boolean;
  centerDotSize: number;
  crosshairColor: string;
  crosshairOpacity: number;
  crosshairOffset: number;
  crosshairSize: number;
  crosshairThickness: number;
  outerCrosshairEnabled: boolean;
  targetColor: string;
}

export function SettingsPreview({
  centerDotEnabled,
  centerDotSize,
  crosshairColor,
  crosshairOpacity,
  crosshairOffset,
  crosshairSize,
  crosshairThickness,
  outerCrosshairEnabled,
  targetColor,
}: SettingsPreviewProps) {
  const crosshairLineLength = crosshairSize * 0.32;

  return (
    <div className="relative h-28 w-full overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0.2))] md:w-44">
      <div
        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_32px_currentColor]"
        style={{ backgroundColor: targetColor, color: targetColor }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ height: crosshairSize, opacity: crosshairOpacity, width: crosshairSize }}
      >
        {outerCrosshairEnabled && (
          <>
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairColor,
                height: crosshairLineLength,
                transform: `translate(-50%, calc(-100% - ${crosshairOffset}px))`,
                width: crosshairThickness,
              }}
            />
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairColor,
                height: crosshairLineLength,
                transform: `translate(-50%, ${crosshairOffset}px)`,
                width: crosshairThickness,
              }}
            />
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairColor,
                height: crosshairThickness,
                transform: `translate(calc(-100% - ${crosshairOffset}px), -50%)`,
                width: crosshairLineLength,
              }}
            />
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairColor,
                height: crosshairThickness,
                transform: `translate(${crosshairOffset}px, -50%)`,
                width: crosshairLineLength,
              }}
            />
          </>
        )}
        {centerDotEnabled && (
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              backgroundColor: crosshairColor,
              height: centerDotSize,
              width: centerDotSize,
            }}
          />
        )}
      </div>
    </div>
  );
}
