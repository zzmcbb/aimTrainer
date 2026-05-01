import { SoundSettingsPanel } from "@/components/settings/SoundSettingsPanel";
import type { SoundSettings } from "@/stores/settingsStore";

interface SoundSettingsMenuProps {
  onChange: (settings: Partial<SoundSettings>) => void;
  sound: SoundSettings;
}

export function SoundSettingsMenu({ onChange, sound }: SoundSettingsMenuProps) {
  return <SoundSettingsPanel sound={sound} onChange={onChange} />;
}
