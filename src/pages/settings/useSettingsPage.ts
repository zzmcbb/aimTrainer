import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";

export function useSettingsPage() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }

      event.preventDefault();
      navigate("/");
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return { t };
}

export type SettingsPageViewModel = ReturnType<typeof useSettingsPage>;
