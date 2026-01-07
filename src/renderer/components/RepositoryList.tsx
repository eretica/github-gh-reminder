import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  Repository,
  RepositoryNotificationSettings,
} from "../../shared/types";
import { RepositoryItem } from "./RepositoryItem";

interface RepositoryListProps {
  repositories: Repository[];
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onAdd: () => void;
  onUpdateNotificationSettings?: (
    id: string,
    settings: Partial<RepositoryNotificationSettings>
  ) => void;
}

export function RepositoryList({
  repositories,
  onToggle,
  onRemove,
  onReorder,
  onAdd,
  onUpdateNotificationSettings,
}: RepositoryListProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = repositories.findIndex((r) => r.id === active.id);
      const newIndex = repositories.findIndex((r) => r.id === over.id);

      const newOrder = [...repositories];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);

      onReorder(newOrder.map((r) => r.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Registered Repositories
        </h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add
        </button>
      </div>

      {repositories.length === 0 ? (
        <div className="text-center py-8 text-gray-500 animate-fadeIn">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-scaleIn"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <p>No repositories registered</p>
          <p className="text-sm mt-1">
            Click "Add" to register a Git repository
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={repositories.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {repositories.map((repo) => (
                <RepositoryItem
                  key={repo.id}
                  repository={repo}
                  onToggle={onToggle}
                  onRemove={onRemove}
                  onUpdateNotificationSettings={onUpdateNotificationSettings}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
