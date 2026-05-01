import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/app/App";
import { I18nProvider } from "@/i18n";
import { ensureBuiltInComboPacks } from "@/lib/builtInComboPacks";
import { useSettingsStore } from "@/stores/settingsStore";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>,
);

void ensureBuiltInComboPacks(useSettingsStore.getState().sound.custom)
  .then((nextCustomSound) => {
    if (!nextCustomSound) {
      return;
    }

    useSettingsStore.getState().setSound({
      custom: nextCustomSound,
    });
  })
  .catch(() => {
    // Ignore builtin import failures to avoid blocking app startup.
  });
