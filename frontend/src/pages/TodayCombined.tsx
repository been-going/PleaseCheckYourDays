import { useMemo, useState, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useApi } from "../api";
import { useAuth } from "../context/AuthContext";
import type { Template, DailyTask as Task } from "../api/client";
import { getStyleForPercentage } from "../utils/colorUtils";
import { getErrorMessage } from "../utils/errorUtils";
import { localYMD } from "../utils/dateUtils";
import { MemoModal } from "../components/MemoModal";
import TrashModal from "../components/TrashModal";
import { Link } from "react-router-dom";
import "./TodayCombined.css";

type Group = "MORNING" | "EXECUTE" | "EVENING";
type MemoTarget =
  | { kind: "task"; id: string; title: string; note: string | null }
  | { kind: "template"; id: string; title: string; note: string | null };

function label(g: Group) {
  return g === "MORNING"
    ? "아침루틴"
    : g === "EXECUTE"
    ? "실행루틴"
    : "저녁루틴";
}

function sortKey(t: { group: Group; order?: number }) {
  const order = { MORNING: 0, EXECUTE: 1, EVENING: 2 } as const;
  return order[t.group] * 1000 + (t.order ?? 0);
}

// --- 비로그인 사용자를 위한 목업 데이터 및 미리보기 컴포넌트 ---
const mockTemplates: Template[] = [
  {
    id: "tpl1",
    title: "아침 조깅하기",
    group: "MORNING",
    defaultActive: true,
    enableNote: true,
    enableValue: true,
    order: 1,
    weight: 1,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    isArchived: false,
  },
  {
    id: "tpl2",
    title: "책 15분 읽기",
    group: "MORNING",
    defaultActive: true,
    enableNote: false,
    enableValue: false,
    order: 2,
    weight: 1,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    isArchived: false,
  },
  {
    id: "tpl3",
    title: "프로젝트 작업 2시간",
    group: "EXECUTE",
    defaultActive: true,
    enableNote: true,
    enableValue: true,
    order: 1,
    weight: 1,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    isArchived: false,
  },
  {
    id: "tpl4",
    title: "오늘 배운 내용 정리",
    group: "EVENING",
    defaultActive: true,
    enableNote: true,
    enableValue: false,
    order: 1,
    weight: 1,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    isArchived: false,
  },
  {
    id: "tpl5",
    title: "내일 계획 세우기",
    group: "EVENING",
    defaultActive: true,
    enableNote: false,
    enableValue: false,
    order: 2,
    weight: 1,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    isArchived: false,
  },
].sort((a, b) => sortKey(a) - sortKey(b));

function TodayUnauthenticatedPreview() {
  const dateYMD = localYMD();

  const mockOneoffs: Task[] = [
    {
      id: "oneoff1",
      title: "우체국 가서 택배 보내기",
      isOneOff: true,
      checked: false,
      note: null,
      dateYMD: dateYMD,
      value: null,
      templateId: null,
      weight: 1,
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    },
    {
      id: "oneoff2",
      title: "저녁 장보기",
      isOneOff: true,
      checked: true,
      note: "계란, 우유, 양파",
      dateYMD: dateYMD,
      value: null,
      templateId: null,
      weight: 1,
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    },
  ];

  const mockByTplId: Record<string, Task> = {
    tpl1: {
      id: "task1",
      templateId: "tpl1",
      title: "아침 조깅하기",
      checked: true,
      note: "상쾌했다!",
      dateYMD: dateYMD,
      value: 0.5,
      isOneOff: false,
      weight: 1,
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    },
    tpl3: {
      id: "task3",
      templateId: "tpl3",
      title: "프로젝트 작업 2시간",
      checked: false,
      note: null,
      dateYMD: dateYMD,
      value: 1.5,
      isOneOff: false,
      weight: 1,
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    },
  };

  return (
    <div>
      <div
        className="card login-prompt-container"
        style={{
          position: "sticky",
          top: "1rem",
          zIndex: 20,
          marginBottom: "1rem",
        }}
      >
        <h3>모든 기능을 사용하려면 로그인이 필요합니다</h3>
        <p>
          로그인하여 오늘의 할 일과 루틴을 관리하고, 진행 상황을 추적하며
          생산성을 높여보세요.
        </p>
        <Link to="/login" className="btn primary" style={{ marginTop: "1rem" }}>
          로그인하고 시작하기
        </Link>
      </div>
      <div
        className="today-layout" // This class is now a simple flex column
        style={{
          filter: "grayscale(80%)",
          opacity: 0.7,
          pointerEvents: "none",
        }}
      >
        <TodaySummaryCard
          isAuthenticated={false}
          templates={mockTemplates}
          oneoffs={mockOneoffs}
          byTplId={mockByTplId}
          dateYMD={dateYMD}
        />
        <OneOffTasksCard
          dateYMD={dateYMD}
          oneoffs={mockOneoffs}
          onSetMemoTarget={() => {}}
          isAuthenticated={false}
        />
        <RoutineTemplatesCard
          templates={mockTemplates}
          byTplId={mockByTplId}
          dateYMD={dateYMD}
          onSetMemoTarget={() => {}}
          isAuthenticated={false}
          onOpenTrash={() => {}}
        />
      </div>
    </div>
  );
}

function TodayCombinedContent({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return <TodayUnauthenticatedPreview />;
  }

  const qc = useQueryClient();
  const api = useApi();

  const [memoTarget, setMemoTarget] = useState<MemoTarget | null>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [dateYMD] = useState(localYMD());

  const qTpl = useQuery({
    queryKey: ["templates"],
    queryFn: api.getTemplates,
    enabled: isAuthenticated,
  });
  const qDay = useQuery({
    queryKey: ["tasks", dateYMD],
    queryFn: () => api.getDailyTasks(dateYMD),
    enabled: isAuthenticated,
  });

  const invalidateToday = () =>
    qc.invalidateQueries({ queryKey: ["tasks", dateYMD] });

  const onMutationError = (error: unknown) => {
    const message = getErrorMessage(error);
    console.error("Mutation failed:", error);
    alert(message);
  };

  const mUpdateTask = useMutation({
    mutationFn: (p: {
      id: string;
      data: {
        checked?: boolean;
        note?: string;
        value?: number | null;
      };
    }) => api.updateTask(p.id, p.data),
    onSuccess: invalidateToday,
    onError: onMutationError,
  });

  const mNoteTemplate = useMutation({
    mutationFn: (p: {
      dateYMD: string;
      templateId: string;
      note: string;
      value: number | null;
    }) => api.upsertTaskNote(p),
    onSuccess: invalidateToday,
    onError: onMutationError,
  });

  const templates = (qTpl.data ?? [])
    .slice()
    .sort((a, b) => sortKey(a) - sortKey(b));
  const allTasks = qDay.data?.tasks ?? [];
  const byTplId = useMemo(
    () =>
      Object.fromEntries(
        allTasks.filter((t) => t.templateId).map((t) => [t.templateId, t])
      ),
    [allTasks]
  );

  const handleSaveMemo = async (memoText: string) => {
    if (!memoTarget) return;
    const { kind, id } = memoTarget;
    if (kind === "task") {
      await mUpdateTask.mutateAsync({ id, data: { note: memoText } });
    } else {
      const existingTask = byTplId[id];
      if (existingTask) {
        await mUpdateTask.mutateAsync({
          id: existingTask.id,
          data: { note: memoText },
        });
      } else {
        await mNoteTemplate.mutateAsync({
          templateId: id,
          dateYMD,
          note: memoText,
          value: null,
        });
      }
    }
    setMemoTarget(null);
  };

  const isLoading = isAuthenticated && (qTpl.isLoading || qDay.isLoading);

  if (isLoading) {
    return <div className="card">Loading...</div>;
  }

  return (
    <div className="today-layout">
      <TodaySummaryCard
        isAuthenticated={isAuthenticated}
        templates={templates}
        oneoffs={allTasks.filter((t) => t.isOneOff)}
        byTplId={byTplId}
        dateYMD={dateYMD}
      />
      <OneOffTasksCard
        dateYMD={dateYMD}
        oneoffs={allTasks.filter((t) => t.isOneOff)}
        onSetMemoTarget={setMemoTarget}
        isAuthenticated={isAuthenticated}
      />
      <RoutineTemplatesCard
        templates={templates}
        byTplId={byTplId}
        dateYMD={dateYMD}
        onSetMemoTarget={setMemoTarget}
        isAuthenticated={isAuthenticated}
        onOpenTrash={() => setIsTrashModalOpen(true)}
      />

      <MemoModal
        isOpen={!!memoTarget}
        targetTitle={memoTarget?.title ?? ""}
        initialText={memoTarget?.note ?? ""}
        isSaving={mUpdateTask.isPending || mNoteTemplate.isPending}
        onClose={() => setMemoTarget(null)}
        onSave={handleSaveMemo}
      />
      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
      />
    </div>
  );
}

export default function TodayCombined() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div className="card">Loading...</div>;
  }

  return <TodayCombinedContent isAuthenticated={isAuthenticated} />;
}

// --- Sub Components ---

const TodaySummaryCard = memo(function TodaySummaryCard({
  isAuthenticated,
  templates,
  oneoffs,
  byTplId,
  dateYMD,
}: {
  isAuthenticated: boolean;
  templates: Template[];
  oneoffs: Task[];
  byTplId: Record<string, Task>;
  dateYMD: string;
}) {
  const { total, done, pct } = useMemo(() => {
    const activeTemplates = templates.filter((t: Template) => t.defaultActive);
    const tplPairs = activeTemplates.map((tpl: Template) => ({
      tpl,
      row: byTplId[tpl.id],
    }));
    const totalCount = tplPairs.length + oneoffs.length;
    const doneCount =
      tplPairs.filter((p) => p.row?.checked === true).length +
      oneoffs.filter((t: Task) => t.checked === true).length;
    return {
      total: totalCount,
      done: doneCount,
      pct: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
    };
  }, [templates, oneoffs, byTplId]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>오늘의 체크리스트</h3>
        <div className="row" style={{ gap: 8 }}>
          <div className="tag">{dateYMD}</div>
          <div className="tag" style={getStyleForPercentage(pct)}>
            {pct}%
          </div>
        </div>
      </div>
      <div className="progress" aria-label="progress">
        {isAuthenticated && (
          <i style={{ width: `${pct}%`, ...getStyleForPercentage(pct) }} />
        )}
      </div>
      <div style={{ color: "var(--muted)", marginTop: 6, fontSize: "0.9rem" }}>
        {done} / {total} 완료
      </div>
    </div>
  );
});

const OneOffTasksCard = memo(function OneOffTasksCard({
  dateYMD,
  oneoffs,
  onSetMemoTarget,
  isAuthenticated,
}: {
  dateYMD: string;
  oneoffs: Task[];
  onSetMemoTarget: (target: MemoTarget) => void;
  isAuthenticated: boolean;
}) {
  const qc = useQueryClient();
  const api = useApi();
  const [oneoffTitle, setOneoffTitle] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const initialValues: Record<string, string> = {};
    oneoffs.forEach((t) => {
      initialValues[t.id] = t.value?.toString() ?? "";
    });
    setInputValues(initialValues);
  }, [oneoffs]);

  const invalidateToday = () =>
    qc.invalidateQueries({ queryKey: ["tasks", dateYMD] });

  const mAddOneoff = useMutation({
    mutationFn: (p: { title: string; dateYMD: string }) => api.addOneoff(p),
    onSuccess: () => {
      setOneoffTitle("");
      invalidateToday();
    },
  });

  const mUpdateTask = useMutation({
    mutationFn: (p: {
      id: string;
      data: { checked?: boolean; value?: number | null };
    }) => api.updateTask(p.id, p.data),
    onSuccess: invalidateToday,
  });

  const handleValueChange = (id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleValueBlur = (id: string) => {
    const task = oneoffs.find((t) => t.id === id);
    if (!task) return;

    const currentValue = inputValues[id] ?? "";
    const numericValue =
      currentValue.trim() === "" ? null : parseFloat(currentValue);

    if (numericValue !== (task.value ?? null)) {
      mUpdateTask.mutate({ id, data: { value: numericValue } });
    }
  };

  const mDeleteTask = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: invalidateToday,
  });

  return (
    <div className="card">
      <div className="card-header">
        <h3>오늘 해야 할 일</h3>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="btn"
            style={{ flex: 1 }}
            placeholder={
              isAuthenticated ? "오늘만 추가…" : "로그인 후 추가 가능"
            }
            value={oneoffTitle}
            onChange={(e) => setOneoffTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && oneoffTitle.trim() && isAuthenticated)
                mAddOneoff.mutate({ title: oneoffTitle.trim(), dateYMD });
            }}
            disabled={!isAuthenticated}
          />
          <button
            type="button"
            className="btn primary"
            disabled={!isAuthenticated || !oneoffTitle.trim()}
            onClick={() =>
              oneoffTitle.trim() &&
              isAuthenticated &&
              mAddOneoff.mutate({ title: oneoffTitle.trim(), dateYMD })
            }
          >
            추가
          </button>
        </div>
      </div>
      <div className="section">
        <div className="list">
          {oneoffs.map((t: Task) => (
            <div key={t.id} className={`item ${t.checked ? "done" : ""}`}>
              <div className="item-content">
                <label className="item-title">
                  <input
                    type="checkbox"
                    checked={t.checked}
                    disabled={!isAuthenticated}
                    onChange={() =>
                      mUpdateTask.mutate({
                        id: t.id,
                        data: { checked: !t.checked },
                      })
                    }
                  />
                  <span>{t.title}</span>
                </label>
                {(t.note || t.value !== null) && (
                  <div className="item-note">
                    {t.value !== null && (
                      <span className="task-value">[{t.value}시간] </span>
                    )}
                    {t.note && `“${t.note}”`}
                  </div>
                )}
              </div>
              <div className="item-actions">
                <div className="value-input-wrapper">
                  <input
                    type="number"
                    className="value-input"
                    value={inputValues[t.id] ?? ""}
                    onChange={(e) => handleValueChange(t.id, e.target.value)}
                    onBlur={() => handleValueBlur(t.id)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        (e.target as HTMLInputElement).blur();
                    }}
                    disabled={!isAuthenticated}
                  />
                  <span className="value-input-unit">시간</span>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={!isAuthenticated}
                  onClick={() =>
                    onSetMemoTarget({
                      kind: "task",
                      id: t.id,
                      title: t.title,
                      note: t.note,
                    })
                  }
                >
                  메모
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!isAuthenticated}
                  onClick={() => {
                    if (isAuthenticated && confirm(`'${t.title}' 삭제?`))
                      mDeleteTask.mutate(t.id);
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {!isAuthenticated && oneoffs.length === 0 && (
            <p className="placeholder-text">
              로그인하여 오늘의 할 일을 추가하고 관리하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

// Non-interactive item for DragOverlay
const RoutineItem = ({
  tpl,
  byTplId,
}: {
  tpl: Template;
  byTplId: Record<string, Task>;
}) => {
  const today = byTplId[tpl.id];
  const success = today?.checked === true;
  return (
    <div
      className={`item ${success ? "done" : ""}`}
      style={{ background: "var(--bg-hover)" }}
    >
      <div className="item-content">
        <label className="item-title">
          <input type="checkbox" checked={success} readOnly />
          <span>{tpl.title}</span>
        </label>
        {today &&
          ((tpl.enableNote && today.note) ||
            (tpl.enableValue && today.value !== null)) && (
            <div className="item-note">
              {tpl.enableValue && today.value !== null && (
                <span className="task-value">[{today.value}시간] </span>
              )}
              {tpl.enableNote && today.note && `“${today.note}”`}
            </div>
          )}
      </div>
      <div className="item-actions" style={{ visibility: "hidden" }}>
        {/* Placeholder for layout */}
        <div className="value-input-wrapper">
          <input type="number" className="value-input" readOnly />
          <span className="value-input-unit">시간</span>
        </div>
        <button type="button" className="btn">
          메모
        </button>
        <details className="menu">
          <summary className="btn">⋯</summary>
        </details>
      </div>
    </div>
  );
};

const SortableRoutineItem = ({
  tpl,
  children,
}: {
  tpl: Template;
  children: React.ReactNode;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tpl.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Hide original item while dragging
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: isDragging ? 10 : "auto",
    position: "relative" as "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span className="drag-handle" {...listeners}>
        ⠿
      </span>
      <div style={{ width: "100%" }}>{children}</div>
    </div>
  );
};

const RoutineTemplatesCard = memo(function RoutineTemplatesCard({
  templates,
  byTplId,
  dateYMD,
  onSetMemoTarget,
  isAuthenticated,
  onOpenTrash,
}: {
  templates: Template[];
  byTplId: Record<string, Task>;
  dateYMD: string;
  onSetMemoTarget: (target: MemoTarget) => void;
  isAuthenticated: boolean;
  onOpenTrash: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const qc = useQueryClient();
  const api = useApi();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);

  const [groupedTemplates, setGroupedTemplates] = useState<
    Record<Group, Template[]>
  >({
    MORNING: [],
    EXECUTE: [],
    EVENING: [],
  });

  useEffect(() => {
    const groups: Record<Group, Template[]> = {
      MORNING: [],
      EXECUTE: [],
      EVENING: [],
    };
    const sortedTemplates = [...templates].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    for (const tpl of sortedTemplates) {
      if (groups[tpl.group]) {
        groups[tpl.group]!.push(tpl);
      }
    }
    setGroupedTemplates(groups);
  }, [templates]);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const openMenus = document.querySelectorAll<HTMLDetailsElement>(
        ".routine-group .menu[open]"
      );
      openMenus.forEach((menu) => {
        if (!menu.contains(event.target as Node)) {
          menu.open = false;
        }
      });
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    const initialValues: Record<string, string> = {};
    Object.values(groupedTemplates)
      .flat()
      .forEach((tpl) => {
        const today = byTplId[tpl.id];
        if (today) {
          initialValues[tpl.id] = today.value?.toString() ?? "";
        }
      });
    setInputValues(initialValues);
  }, [groupedTemplates, byTplId]);

  const invalidateTemplates = () =>
    qc.invalidateQueries({ queryKey: ["templates"] });
  const invalidateToday = () =>
    qc.invalidateQueries({ queryKey: ["tasks", dateYMD] });

  const mCreateTpl = useMutation({
    mutationFn: (p: { title: string; group: Group }) => api.createTemplate(p),
    onSuccess: invalidateTemplates,
  });
  const mUpdateTpl = useMutation({
    mutationFn: (p: { id: string; title: string }) =>
      api.updateTemplate(p.id, { title: p.title }),
    onSuccess: invalidateTemplates,
  });
  const mDeleteTpl = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => {
      invalidateTemplates();
      qc.invalidateQueries({ queryKey: ["routineStats"] });
      alert("루틴이 휴지통으로 이동했습니다.");
    },
  });
  const mUpdateTplFlags = useMutation({
    mutationFn: (p: {
      id: string;
      data: { enableValue?: boolean; enableNote?: boolean };
    }) => api.updateTemplate(p.id, p.data),
    onSuccess: invalidateTemplates,
  });

  const mReorderTemplates = useMutation({
    mutationFn: (p: {
      updates: { id: string; order: number; group: Group }[];
    }) => api.reorderTemplates(p.updates),
    onSuccess: invalidateTemplates,
    onError: () => {
      alert("순서 변경에 실패했습니다. 페이지를 새로고침합니다.");
      window.location.reload();
    },
  });

  const mUpdateTask = useMutation({
    mutationFn: (p: {
      id: string;
      data: { checked?: boolean; value?: number | null };
    }) => api.updateTask(p.id, p.data),
    onSuccess: invalidateToday,
  });

  const mNoteTemplate = useMutation({
    mutationFn: (p: {
      dateYMD: string;
      templateId: string;
      note: string;
      value: number | null;
    }) => api.upsertTaskNote(p),
    onSuccess: invalidateToday,
  });

  const handleValueChange = (id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleValueBlur = (tplId: string) => {
    const today = byTplId[tplId];
    const currentValue = inputValues[tplId] ?? "";
    const numericValue =
      currentValue.trim() === "" ? null : parseFloat(currentValue);

    if (numericValue !== (today?.value ?? null)) {
      if (today) {
        mUpdateTask.mutate({ id: today.id, data: { value: numericValue } });
      } else {
        mNoteTemplate.mutate({
          templateId: tplId,
          dateYMD,
          note: "",
          value: numericValue,
        });
      }
    }
  };

  const mCheckTemplate = useMutation({
    mutationFn: (p: {
      dateYMD: string;
      templateId: string;
      checked: boolean;
    }) => api.upsertTaskFromTemplate(p),
    onSuccess: invalidateToday,
  });

  function findContainer(id: string): Group | undefined {
    if (id in groupedTemplates) {
      return id as Group;
    }
    return (Object.keys(groupedTemplates) as Group[]).find((key) =>
      groupedTemplates[key].some((item) => item.id === id)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const id = String(active.id);
    const allTemplates = Object.values(groupedTemplates).flat();
    setActiveTemplate(allTemplates.find((t) => t.id === id) || null);
  }

  function handleDragCancel() {
    setActiveTemplate(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTemplate(null);

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeId === overId) {
      return;
    }

    const newGroupedTemplates = { ...groupedTemplates };
    let finalGroupedTemplates;

    if (activeContainer === overContainer) {
      const items = newGroupedTemplates[activeContainer];
      const oldIndex = items.findIndex((item) => item.id === activeId);
      const newIndex = items.findIndex((item) => item.id === overId);
      if (oldIndex !== newIndex) {
        newGroupedTemplates[activeContainer] = arrayMove(
          items,
          oldIndex,
          newIndex
        );
      }
      finalGroupedTemplates = newGroupedTemplates;
    } else {
      const activeItems = newGroupedTemplates[activeContainer];
      const overItems = newGroupedTemplates[overContainer];
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      let overIndex = overItems.findIndex((item) => item.id === overId);
      if (overIndex === -1) {
        overIndex = overItems.length;
      }

      const [movedItem] = activeItems.splice(activeIndex, 1);
      overItems.splice(overIndex, 0, movedItem);
      finalGroupedTemplates = newGroupedTemplates;
    }

    setGroupedTemplates(finalGroupedTemplates);

    const updates: { id: string; order: number; group: Group }[] = [];
    (Object.keys(finalGroupedTemplates) as Group[]).forEach((group) => {
      finalGroupedTemplates[group].forEach((template, index) => {
        updates.push({
          id: template.id,
          order: index,
          group: group,
        });
      });
    });

    mReorderTemplates.mutate({ updates });
  }

  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplGroup, setNewTplGroup] = useState<Group>("EXECUTE");

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          고정 루틴
          <button
            className="btn"
            style={{ padding: "0.5rem", lineHeight: 1 }}
            onClick={onOpenTrash}
            aria-label="휴지통"
            title="휴지통"
            disabled={!isAuthenticated}
          >
            🗑️
          </button>
        </h3>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="btn"
            placeholder={
              isAuthenticated ? "새 루틴 제목" : "로그인 후 추가 가능"
            }
            value={newTplTitle}
            onChange={(e) => setNewTplTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTplTitle.trim() && isAuthenticated) {
                mCreateTpl.mutate({
                  title: newTplTitle.trim(),
                  group: newTplGroup,
                });
              }
            }}
            disabled={!isAuthenticated}
          />
          <select
            className="btn"
            value={newTplGroup}
            onChange={(e) => setNewTplGroup(e.target.value as Group)}
            disabled={!isAuthenticated}
          >
            <option value="MORNING">아침</option>
            <option value="EXECUTE">실행</option>
            <option value="EVENING">저녁</option>
          </select>
          <button
            type="button"
            className="btn primary"
            disabled={!isAuthenticated || !newTplTitle.trim()}
            onClick={() => {
              if (newTplTitle.trim() && isAuthenticated) {
                mCreateTpl.mutate({
                  title: newTplTitle.trim(),
                  group: newTplGroup,
                });
                setNewTplTitle("");
              }
            }}
          >
            추가
          </button>
        </div>
      </div>
      <div className="section">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {(Object.keys(groupedTemplates) as Group[]).map((group) => (
            <div className="routine-group" key={group}>
              <h4 className="routine-group-title">{label(group)}</h4>
              <SortableContext
                id={group}
                items={groupedTemplates[group].map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="list">
                  {groupedTemplates[group].map((tpl) => {
                    const today = byTplId[tpl.id];
                    const success = today?.checked === true;
                    return (
                      <SortableRoutineItem tpl={tpl} key={tpl.id}>
                        <div className={`item ${success ? "done" : ""}`}>
                          <div className="item-content">
                            <label className="item-title">
                              <input
                                type="checkbox"
                                checked={success}
                                disabled={!isAuthenticated}
                                onChange={() => {
                                  if (today) {
                                    mUpdateTask.mutate({
                                      id: today.id,
                                      data: { checked: !success },
                                    });
                                  } else {
                                    mCheckTemplate.mutate({
                                      templateId: tpl.id,
                                      dateYMD,
                                      checked: !success,
                                    });
                                  }
                                }}
                              />
                              <span>{tpl.title}</span>
                            </label>
                            {today &&
                              ((tpl.enableNote && today.note) ||
                                (tpl.enableValue && today.value !== null)) && (
                                <div className="item-note">
                                  {tpl.enableValue && today.value !== null && (
                                    <span className="task-value">
                                      [{today.value}시간]{" "}
                                    </span>
                                  )}
                                  {tpl.enableNote &&
                                    today.note &&
                                    `“${today.note}”`}
                                </div>
                              )}
                          </div>
                          <div className="item-actions">
                            <div
                              className="value-input-wrapper"
                              style={{
                                visibility: tpl.enableValue
                                  ? "visible"
                                  : "hidden",
                              }}
                            >
                              <input
                                type="number"
                                className="value-input"
                                value={inputValues[tpl.id] ?? ""}
                                onChange={(e) =>
                                  handleValueChange(tpl.id, e.target.value)
                                }
                                onBlur={() => handleValueBlur(tpl.id)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    (e.target as HTMLInputElement).blur();
                                }}
                                disabled={!isAuthenticated || !tpl.enableValue}
                              />
                              <span className="value-input-unit">시간</span>
                            </div>
                            <button
                              type="button"
                              className="btn"
                              disabled={!isAuthenticated || !tpl.enableNote}
                              style={{
                                visibility: tpl.enableNote
                                  ? "visible"
                                  : "hidden",
                              }}
                              onClick={() => {
                                if (!tpl.enableNote) return;
                                onSetMemoTarget({
                                  kind: "template",
                                  id: tpl.id,
                                  title: tpl.title,
                                  note: today?.note ?? null,
                                });
                              }}
                            >
                              메모
                            </button>
                            <details
                              className="menu"
                              {...(!isAuthenticated && {
                                onClick: (e) => e.preventDefault(),
                              })}
                            >
                              <summary
                                className="btn"
                                disabled={!isAuthenticated}
                              >
                                ⋯
                              </summary>
                              <div className="menu-list">
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    const next = prompt("새 제목", tpl.title);
                                    if (next)
                                      mUpdateTpl.mutate({
                                        id: tpl.id,
                                        title: next,
                                      });
                                  }}
                                >
                                  제목 수정
                                </button>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    mUpdateTplFlags.mutate({
                                      id: tpl.id,
                                      data: { enableNote: !tpl.enableNote },
                                    });
                                  }}
                                >
                                  {tpl.enableNote
                                    ? "메모 작성 끄기"
                                    : "메모 작성 켜기"}
                                </button>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    mUpdateTplFlags.mutate({
                                      id: tpl.id,
                                      data: { enableValue: !tpl.enableValue },
                                    });
                                  }}
                                >
                                  {tpl.enableValue
                                    ? "시간 작성 끄기"
                                    : "시간 작성 켜기"}
                                </button>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `'${tpl.title}' 루틴을 휴지통으로 이동하시겠습니까? (기록은 유지됩니다)`
                                      )
                                    ) {
                                      mDeleteTpl.mutate(tpl.id);
                                    }
                                  }}
                                >
                                  삭제 (보관)
                                </button>
                              </div>
                            </details>
                          </div>
                        </div>
                      </SortableRoutineItem>
                    );
                  })}
                </div>
              </SortableContext>
            </div>
          ))}
          <DragOverlay>
            {activeTemplate ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span className="drag-handle">⠿</span>
                <div style={{ width: "100%" }}>
                  <RoutineItem tpl={activeTemplate} byTplId={byTplId} />
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
});
