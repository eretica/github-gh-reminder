import { useState } from "react";
import { RepositoryList } from "../components/RepositoryList";
import { SettingsForm } from "../components/SettingsForm";
import { Tabs } from "../components/Tabs";
import { useRepositories } from "../hooks/useRepositories";
import { useSettings } from "../hooks/useSettings";

const TABS = [
  { id: "repositories", label: "Repositories" },
  { id: "notifications", label: "Notification Settings" },
];

export default function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState("repositories");

  const {
    repositories,
    loading: reposLoading,
    error: reposError,
    addRepository,
    removeRepository,
    toggleRepository,
    reorderRepositories,
  } = useRepositories();

  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();

  const handleClose = (): void => {
    window.api.closeSettings();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          PR Reminder Settings
        </h1>
        <button
          onClick={handleClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-all duration-200 hover:scale-110 active:scale-95"
          title="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {/* Error messages */}
        {(reposError || settingsError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-fadeIn">
            {reposError || settingsError}
          </div>
        )}

        {activeTab === "repositories" && (
          <div className="animate-fadeIn">
            {reposLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <RepositoryList
                repositories={repositories}
                onToggle={toggleRepository}
                onRemove={removeRepository}
                onReorder={reorderRepositories}
                onAdd={addRepository}
              />
            )}
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="animate-fadeIn">
            <SettingsForm
              settings={settings}
              onSave={updateSettings}
              loading={settingsLoading}
            />
          </div>
        )}
      </main>
    </div>
  );
}
