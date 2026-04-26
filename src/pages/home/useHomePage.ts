import { useTranslation } from "@/i18n";

export function useHomePage() {
  const { t } = useTranslation("home");

  return {
    t,
  };
}

export type HomePageViewModel = ReturnType<typeof useHomePage>;
