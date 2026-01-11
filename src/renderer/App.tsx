import { useEffect, useState } from "react";
import { ROUTES } from "../shared/constants";
import MainPage from "./pages/MainPage";
import SettingsPage from "./pages/SettingsPage";

type Page = "main" | "settings";

function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>("main");

  useEffect(() => {
    // Parse hash to determine which page to show
    const hash = window.location.hash;
    if (hash === ROUTES.SETTINGS) {
      setCurrentPage("settings");
    } else {
      setCurrentPage("main");
    }

    // Listen for hash changes
    const handleHashChange = (): void => {
      const newHash = window.location.hash;
      if (newHash === ROUTES.SETTINGS) {
        setCurrentPage("settings");
      } else {
        setCurrentPage("main");
      }
    };

    // Listen for IPC navigation events (secure alternative to executeJavaScript)
    const unsubscribeToSettings = window.api.onNavigateToSettings(() => {
      window.location.hash = ROUTES.SETTINGS;
    });
    const unsubscribeToMain = window.api.onNavigateToMain(() => {
      window.location.hash = ROUTES.MAIN;
    });

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      unsubscribeToSettings();
      unsubscribeToMain();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div key={currentPage} className="animate-fadeIn">
        {currentPage === "settings" ? <SettingsPage /> : <MainPage />}
      </div>
    </div>
  );
}

export default App;
