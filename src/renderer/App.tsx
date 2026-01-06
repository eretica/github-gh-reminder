import { useEffect, useState } from "react";
import MainPage from "./pages/MainPage";
import SettingsPage from "./pages/SettingsPage";

type Page = "main" | "settings";

function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>("main");

  useEffect(() => {
    // Parse hash to determine which page to show
    const hash = window.location.hash.replace("#", "");
    if (hash === "/settings") {
      setCurrentPage("settings");
    } else {
      setCurrentPage("main");
    }

    // Listen for hash changes
    const handleHashChange = (): void => {
      const newHash = window.location.hash.replace("#", "");
      if (newHash === "/settings") {
        setCurrentPage("settings");
      } else {
        setCurrentPage("main");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPage === "settings" ? <SettingsPage /> : <MainPage />}
    </div>
  );
}

export default App;
