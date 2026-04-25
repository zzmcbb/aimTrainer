import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { LanguagePreference } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

const languageOptions: LanguagePreference[] = ["system", "zh-CN", "en-US"];

export function LanguageSwitcher() {
  const { preference, setLanguage, t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedLabel = t(`language.${preference}`, { defaultValue: preference });

  return (
    <div ref={rootRef} className="fixed right-6 top-6 z-20">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-foreground",
          "shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl",
          "transition-all duration-300 hover:border-primary/25 hover:bg-white/[0.07] hover:shadow-[0_10px_36px_rgba(0,0,0,0.45),0_0_40px_rgba(0,200,200,0.08)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("language.label", { defaultValue: "语言" })}
      >
        <Languages className="h-3.5 w-3.5 text-primary drop-shadow-[0_0_8px_rgba(0,200,200,0.45)]" />
        <span>{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180 text-primary",
          )}
        />
      </button>

      <div
        className={cn(
          "absolute right-0 mt-3 w-44 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-background/80 p-1.5",
          "shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_70px_rgba(0,200,200,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl",
          "transition-all duration-200",
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0",
        )}
        role="listbox"
        aria-label={t("language.label", { defaultValue: "语言" })}
      >
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent" />

        <div className="relative space-y-1">
          {languageOptions.map((language) => {
            const isSelected = preference === language;

            return (
              <button
                key={language}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(language);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-200",
                  isSelected
                    ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(0,200,200,0.16)]"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                )}
              >
                <span>{t(`language.${language}`, { defaultValue: language })}</span>
                <Check
                  className={cn(
                    "h-3.5 w-3.5 transition-opacity duration-200",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
