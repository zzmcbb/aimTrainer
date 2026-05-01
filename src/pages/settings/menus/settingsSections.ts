import {
  Clock3,
  Crosshair,
  Gauge,
  Magnet,
  MousePointerClick,
  Palette,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";

export type SettingsSection =
  | "crosshair"
  | "aimAssist"
  | "target"
  | "duration"
  | "sensitivity"
  | "hit"
  | "sound"
  | "fps";

export const settingsSections: Array<{
  id: SettingsSection;
  icon: typeof Crosshair;
  translationKey: string;
  disabled?: boolean;
}> = [
  {
    id: "crosshair",
    icon: Crosshair,
    translationKey: "crosshair",
  },
  {
    id: "target",
    icon: Palette,
    translationKey: "target",
  },
  {
    id: "aimAssist",
    icon: Magnet,
    translationKey: "aimAssist",
  },
  {
    id: "duration",
    icon: Clock3,
    translationKey: "duration",
  },
  {
    id: "sensitivity",
    icon: SlidersHorizontal,
    translationKey: "sensitivity",
  },
  {
    id: "hit",
    icon: MousePointerClick,
    translationKey: "hit",
  },
  {
    id: "sound",
    icon: Volume2,
    translationKey: "sound",
  },
  {
    id: "fps",
    icon: Gauge,
    translationKey: "fps",
  },
];
