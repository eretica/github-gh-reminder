import { useEffect, useState } from "react";
import type { Settings } from "../../../../shared/types";
import { CHECK_INTERVAL_OPTIONS, REMINDER_INTERVAL_OPTIONS } from "./constants";

interface SettingsFormProps {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  loading: boolean;
}

export function SettingsForm({
  settings,
  onSave,
  loading,
}: SettingsFormProps): JSX.Element {
  const [formData, setFormData] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    const changed =
      formData.notifyOnNew !== settings.notifyOnNew ||
      formData.enableReminder !== settings.enableReminder ||
      formData.reminderIntervalHours !== settings.reminderIntervalHours ||
      formData.checkIntervalMinutes !== settings.checkIntervalMinutes ||
      formData.showRefreshToast !== settings.showRefreshToast;

    setHasChanges(changed);
  }, [formData, settings]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">
          Notification Timing
        </h3>

        {/* Notify on new PR */}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.notifyOnNew}
            onChange={(e) =>
              setFormData({ ...formData, notifyOnNew: e.target.checked })
            }
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-900">
              Notify when new PR is assigned
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Show a notification when a new pull request requires your review
            </p>
          </div>
        </label>

        {/* Enable reminders */}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.enableReminder}
            onChange={(e) =>
              setFormData({ ...formData, enableReminder: e.target.checked })
            }
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-900">
              Enable periodic reminders
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Periodically remind about pending PR reviews
            </p>
          </div>
        </label>

        {/* Reminder interval */}
        {formData.enableReminder && (
          <div className="ml-7">
            <label className="block text-sm text-gray-700 mb-1">
              Reminder interval
              <select
                value={formData.reminderIntervalHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminderIntervalHours: Number(e.target.value),
                  })
                }
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {REMINDER_INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Check Interval */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Check Interval</h3>
        <p className="text-xs text-gray-500">How often to check for new PRs</p>
        <select
          value={formData.checkIntervalMinutes}
          onChange={(e) =>
            setFormData({
              ...formData,
              checkIntervalMinutes: Number(e.target.value),
            })
          }
          className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        >
          {CHECK_INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Toast Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">UI Feedback</h3>

        {/* Show refresh toast */}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.showRefreshToast}
            onChange={(e) =>
              setFormData({ ...formData, showRefreshToast: e.target.checked })
            }
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-900">
              Show toast notification on refresh
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Display a notification when the refresh button is clicked
            </p>
          </div>
        </label>
      </div>

      {/* Save button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            hasChanges && !saving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {saving ? "Saving..." : "Save"}
        </button>
        {hasChanges && !saving && (
          <span className="ml-3 text-xs text-gray-500">
            You have unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}
