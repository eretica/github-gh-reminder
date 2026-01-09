import { useState } from "react";
import type {
  NotificationPriority,
  RepositoryNotificationSettings,
} from "../../shared/types";

interface NotificationSettingsProps {
  settings: RepositoryNotificationSettings;
  onSave: (settings: RepositoryNotificationSettings) => void;
  onCancel: () => void;
}

export function NotificationSettings({
  settings,
  onSave,
  onCancel,
}: NotificationSettingsProps): JSX.Element {
  const [localSettings, setLocalSettings] =
    useState<RepositoryNotificationSettings>(settings);

  const handleSave = (): void => {
    onSave(localSettings);
  };

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">
        Notification Settings
      </h4>

      {/* Notify on New PR */}
      <div className="flex items-center justify-between">
        <label htmlFor="notifyOnNewPR" className="text-sm text-gray-700">
          Notify on new PRs
        </label>
        <input
          id="notifyOnNewPR"
          type="checkbox"
          checked={localSettings.notifyOnNewPR}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, notifyOnNewPR: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      {/* Enable Reminders */}
      <div className="flex items-center justify-between">
        <label htmlFor="enableReminders" className="text-sm text-gray-700">
          Enable reminders
        </label>
        <input
          id="enableReminders"
          type="checkbox"
          checked={localSettings.enableReminders}
          onChange={(e) =>
            setLocalSettings({
              ...localSettings,
              enableReminders: e.target.checked,
            })
          }
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      {/* Reminder Interval */}
      {localSettings.enableReminders && (
        <div className="space-y-2">
          <label
            htmlFor="reminderInterval"
            className="text-sm text-gray-700 block"
          >
            Reminder interval (hours)
          </label>
          <input
            id="reminderInterval"
            type="number"
            min="1"
            max="168"
            value={localSettings.reminderIntervalHours}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                reminderIntervalHours: Number.parseInt(e.target.value, 10),
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Notification Priority */}
      <div className="space-y-2">
        <label htmlFor="priority" className="text-sm text-gray-700 block">
          Notification priority
        </label>
        <select
          id="priority"
          value={localSettings.notificationPriority}
          onChange={(e) =>
            setLocalSettings({
              ...localSettings,
              notificationPriority: e.target.value as NotificationPriority,
            })
          }
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Do Not Disturb */}
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="doNotDisturb" className="text-sm text-gray-700 block">
            Do Not Disturb
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Silence all notifications for this repository
          </p>
        </div>
        <input
          id="doNotDisturb"
          type="checkbox"
          checked={localSettings.doNotDisturb}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, doNotDisturb: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
