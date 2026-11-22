import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { taskApi } from '@/api/endpoints';
import { cn, getPriorityColor, getTypeColor } from '@/lib/utils';

/* ---------- Types and constants ---------- */

type Status = 'todo' | 'in_progress' | 'done';

interface BoardTask {
  _id: string;
  title: string;
  status: string;
  type: Parameters<typeof getTypeColor>[0];
  priority: Parameters<typeof getPriorityColor>[0];
  dueDate?: string | null;
  completedAt?: string | null;
  order?: number;
}

interface BoardMeta {
  total?: number;
  cap?: number;
  capReached?: boolean;
}

interface BoardResponse {
  data: { data: BoardTask[]; meta?: BoardMeta };
}

interface MoveVariables {
  taskId: string;
  targetStatus: Status;
  targetIndex: number;
}

const BOARD_KEY = ['tasks', 'board'] as const;

const COLUMNS: { id: Status; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

const isColumnId = (id: string): id is Status => COLUMNS.some((c) => c.id === id);

const columnTitle = (status: string) => COLUMNS.find((c) => c.id === status)?.title ?? status;

/* ---------- Helpers ---------- */

/**
 * Pure function used for the optimistic update. targetIndex is the FINAL index
 * of the task inside the target column after the move (0-based).
 * Order values are rewritten as 0..N-1 inside every column.
 */
function moveTaskInList(
  tasks: BoardTask[],
  taskId: string,
  targetStatus: Status,
  targetIndex: number
): BoardTask[] {
  const moving = tasks.find((t) => t._id === taskId);
  if (!moving) return tasks;

  const rest = tasks.filter((t) => t._id !== taskId);
  const result: BoardTask[] = [];

  for (const column of COLUMNS) {
    const columnTasks = rest.filter((t) => t.status === column.id);

    if (column.id === targetStatus) {
      const index = Math.max(0, Math.min(targetIndex, columnTasks.length));
      const statusChanged = moving.status !== targetStatus;
      columnTasks.splice(index, 0, {
        ...moving,
        status: targetStatus,
        completedAt: statusChanged
          ? targetStatus === 'done'
            ? new Date().toISOString()
            : null
          : moving.completedAt,
      });
    }

    columnTasks.forEach((task, order) => result.push({ ...task, order }));
  }

  // Tasks with a status that has no column (for example "review") stay untouched.
  rest.filter((t) => !isColumnId(t.status)).forEach((t) => result.push(t));

  return result;
}

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

// Prefer a task under the pointer (so cards can be placed between other cards),
// fall back to the column, and use the nearest item for keyboard dragging.
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const taskHit = pointerHits.find((hit) => !isColumnId(String(hit.id)));
    return taskHit ? [taskHit] : pointerHits;
  }
  return closestCenter(args);
};

/* ---------- Components ---------- */

function TaskCardContent({ task }: { task: BoardTask }) {
  const priority = String(task.priority);

  return (
    <div className="flex items-start gap-2">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-1 h-4 w-4 shrink-0 text-gray-400"
      >
        <circle cx="7" cy="5" r="1.4" />
        <circle cx="13" cy="5" r="1.4" />
        <circle cx="7" cy="10" r="1.4" />
        <circle cx="13" cy="10" r="1.4" />
        <circle cx="7" cy="15" r="1.4" />
        <circle cx="13" cy="15" r="1.4" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-white">{task.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={cn('badge text-xs', getTypeColor(task.type))}>{String(task.type)}</span>
          <span className={cn('badge text-xs', getPriorityColor(task.priority))}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        </div>
        {task.dueDate && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function SortableTask({
  task,
  disabled,
  reduceMotion,
}: {
  task: BoardTask;
  disabled: boolean;
  reduceMotion: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: reduceMotion ? undefined : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'card p-4 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-40 ring-2 ring-primary-500' : ''
      )}
    >
      <TaskCardContent task={task} />
    </div>
  );
}

function Column({
  id,
  title,
  tasks,
  disabled,
  reduceMotion,
}: {
  id: Status;
  title: string;
  tasks: BoardTask[];
  disabled: boolean;
  reduceMotion: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <section className="card flex h-full flex-col" aria-label={`${title} column`}>
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="font-semibold capitalize text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </p>
      </div>
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-[400px] flex-1 space-y-3 overflow-y-auto p-4',
            reduceMotion ? '' : 'transition-colors',
            isOver ? 'bg-gray-50 dark:bg-gray-800/50' : ''
          )}
        >
          {tasks.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              {disabled ? 'No tasks' : 'Drop tasks here'}
            </div>
          )}
          {tasks.map((task) => (
            <SortableTask key={task._id} task={task} disabled={disabled} reduceMotion={reduceMotion} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function BoardHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban Board</h1>
        <p className="text-gray-600 dark:text-gray-400">Visualize your workflow</p>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Board() {
  const queryClient = useQueryClient();
  const reduceMotion = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: BOARD_KEY,
    queryFn: () => taskApi.getBoard(),
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, targetStatus, targetIndex }: MoveVariables) =>
      taskApi.move(taskId, targetStatus, targetIndex),
    onMutate: async ({ taskId, targetStatus, targetIndex }) => {
      setMoveError(null);
      await queryClient.cancelQueries({ queryKey: BOARD_KEY });
      const previous = queryClient.getQueryData<BoardResponse>(BOARD_KEY);

      queryClient.setQueryData<BoardResponse>(BOARD_KEY, (old) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: moveTaskInList(old.data.data, taskId, targetStatus, targetIndex),
          },
        };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOARD_KEY, context.previous);
      }
      setMoveError('Could not move the task. Your change was undone.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasks = useMemo(() => (data?.data?.data ?? []) as unknown as BoardTask[], [data]);
  const meta = data?.data?.meta as BoardMeta | undefined;
  const capReached = meta?.capReached ?? false;
  const cap = meta?.cap ?? 500;
  const total = meta?.total ?? tasks.length;

  const tasksByStatus = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      done: tasks.filter((t) => t.status === 'done'),
    }),
    [tasks]
  );

  const activeTask = activeId ? tasks.find((t) => t._id === activeId) ?? null : null;

  /* Screen reader announcements */
  const titleOf = (id: string) => tasks.find((t) => t._id === id)?.title ?? 'task';

  const describePosition = (overId: string) => {
    if (isColumnId(overId)) return `the ${columnTitle(overId)} column`;
    const overTask = tasks.find((t) => t._id === overId);
    if (!overTask || !isColumnId(overTask.status)) return 'the board';
    const position = tasksByStatus[overTask.status].findIndex((t) => t._id === overId) + 1;
    return `position ${position} in the ${columnTitle(overTask.status)} column`;
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up task ${titleOf(String(active.id))}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Task ${titleOf(String(active.id))} is over ${describePosition(String(over.id))}.`
        : `Task ${titleOf(String(active.id))} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Task ${titleOf(String(active.id))} was dropped at ${describePosition(String(over.id))}.`
        : `Task ${titleOf(String(active.id))} was dropped. Nothing changed.`,
    onDragCancel: ({ active }) => `Dragging cancelled. Task ${titleOf(String(active.id))} was not moved.`,
  };

  /* Drag handlers */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || capReached) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    const task = tasks.find((t) => t._id === taskId);
    if (!task || !isColumnId(task.status)) return;

    let targetStatus: Status;
    let targetIndex: number;

    if (isColumnId(overId)) {
      // Dropped on the empty area of a column: put the task at the end.
      targetStatus = overId;
      targetIndex = tasksByStatus[overId].filter((t) => t._id !== taskId).length;
    } else {
      const overTask = tasks.find((t) => t._id === overId);
      if (!overTask || !isColumnId(overTask.status)) return;
      targetStatus = overTask.status;
      targetIndex = tasksByStatus[targetStatus].findIndex((t) => t._id === overId);
    }

    const currentIndex = tasksByStatus[task.status].findIndex((t) => t._id === taskId);
    if (task.status === targetStatus && currentIndex === targetIndex) return;

    moveTaskMutation.mutate({ taskId, targetStatus, targetIndex });
  };

  /* Loading and error states */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <BoardHeader />
        <div className="grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.id} className="card flex h-full flex-col">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h3 className="font-semibold capitalize text-gray-900 dark:text-white">{column.title}</h3>
              </div>
              <div className="min-h-[400px] flex-1 space-y-3 overflow-y-auto p-4">
                <div className="animate-pulse space-y-3 motion-reduce:animate-none">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 rounded bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BoardHeader />
        <div role="alert" className="py-8 text-center text-danger-600">
          Failed to load board
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To pick up a task, press Space or Enter. Use the arrow keys to move it, then press Space or Enter again to drop it, or Escape to cancel.',
        },
      }}
    >
      <div className="space-y-6">
        <BoardHeader />

        {capReached && (
          <div
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          >
            Showing the first {cap} of {total} tasks. Drag and drop is turned off while the board is
            capped. Archive or finish tasks to see the rest.
          </div>
        )}

        {moveError && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
          >
            {moveError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByStatus[column.id]}
              disabled={capReached}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
        {activeTask ? (
          <div className="card cursor-grabbing p-4 shadow-lg ring-2 ring-primary-500">
            <TaskCardContent task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}