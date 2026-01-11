import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Repository } from "../../../../shared/types";

interface RepositoryItemProps {
  repository: Repository;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}

export function RepositoryItem({
  repository,
  onToggle,
  onRemove,
}: RepositoryItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: repository.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-3 transition-shadow duration-200 ${isDragging ? "shadow-lg" : "hover:shadow-sm"}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={repository.enabled}
          onChange={(e) => onToggle(repository.id, e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-all duration-200"
        />

        {/* Repository info */}
        <div className="flex-1 min-w-0">
          <div
            className={`font-medium truncate transition-colors duration-200 ${!repository.enabled ? "text-gray-400" : "text-gray-900"}`}
          >
            {repository.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {repository.path}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onRemove(repository.id)}
          className="text-gray-400 hover:text-red-500 transition-all duration-200 hover:scale-110 active:scale-95"
          title="Remove repository"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
