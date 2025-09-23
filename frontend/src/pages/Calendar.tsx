import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { DailyTask, Template as ITemplate } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getStyleForPercentage } from "../utils/colorUtils";
import { localYMD, firstOfMonth, lastOfMonth } from "../utils/dateUtils";
import { MemoModal } from "../components/MemoModal";
import { Link } from "react-router-dom";
import "./Calendar.css";

type Template = ITemplate;
type MemoTarget =
  | { kind: "task"; id: string; title: string; note: string | null }
  | {
      kind: "template";
      templateId: string;
      title: string;
      note: string | null;
    };

type DisplayTask = DailyTask & { isArchived: boolean; enableNote: boolean };

const CircularProgress = ({
  percentage,
  size = 80,
}: {
  percentage: number;
  size?: number;
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const style = getStyleForPercentage(percentage);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="circular-progress"
    >
      <circle
        className="progress-background"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-bar"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ stroke: String(style.background ?? "transparent") }}
      />
      <text
        className="progress-text"
        x="50%"
        y="50%"
        dy=".3em"
        textAnchor="middle"
      >
        {`${percentage}%`}
      </text>
    </svg>
  );
};

const DayDetails = ({
  selectedDate,
  onSetMemoTarget,
  isAuthenticated,
  allTemplates,
  tasks,
  isLoading,
}: {
  selectedDate: string;
  onSetMemoTarget: (target: MemoTarget) => void;
  isAuthenticated: boolean;
  allTemplates: Template[];
  tasks: DailyTask[];
  isLoading: boolean;
}) => {
  const qc = useQueryClient();
  const api = useApi();

  const mToggleCheck = useMutation({
    mutationFn: (p: {
      id?: string;
      templateId?: string | null;
      checked: boolean;
      dateYMD: string;
    }) => {
      if (p.id) {
        return api.updateTask(p.id, { checked: p.checked });
      }
      if (p.templateId) {
        return api.upsertTaskFromTemplate({
          templateId: p.templateId,
          checked: p.checked,
          dateYMD: p.dateYMD,
        });
      }
      // This should ideally not be reached if logic is correct
      return Promise.reject(
        new Error("Cannot create a task without a templateId.")
      );
    },
    onSuccess: (_, variables) => {
      const from = localYMD(firstOfMonth(new Date(variables.dateYMD)));
      const to = localYMD(lastOfMonth(new Date(variables.dateYMD)));
      qc.invalidateQueries({ queryKey: ["tasks", "range", from, to] });
      qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
    },
  });

  const { displayTasks, doneCount, totalCount, pct } = useMemo(() => {
    if (!isAuthenticated || !allTemplates) {
      return { displayTasks: [], doneCount: 0, totalCount: 0, pct: 0 };
    }

    const allTasksForDay = tasks ?? [];
    const existingTemplateTaskIds = new Set(
      allTasksForDay.filter((t) => t.templateId).map((t) => t.templateId!)
    );

    const placeholderTemplates = allTemplates.filter((tpl) => {
      if (!tpl.defaultActive) return false;
      if (existingTemplateTaskIds.has(tpl.id)) return false;
      const createdAtDate = tpl.createdAt.substring(0, 10);
      if (selectedDate < createdAtDate) return false;
      if (tpl.isArchived) {
        const archivedAtDate = tpl.updatedAt.substring(0, 10);
        if (selectedDate >= archivedAtDate) return false;
      }
      return true;
    });

    const placeholderTasks: DisplayTask[] = placeholderTemplates.map((tpl) => ({
      id: `placeholder-${tpl.id}`,
      templateId: tpl.id,
      title: tpl.title,
      checked: false,
      note: null,
      isOneOff: false,
      isArchived: tpl.isArchived,
      dateYMD: selectedDate,
      value: null,
      weight: tpl.weight,
      createdAt: tpl.createdAt,
      updatedAt: tpl.updatedAt,
      enableNote: tpl.enableNote,
    }));

    const templateMap = new Map(allTemplates.map((t) => [t.id, t]));
    const augmentedRealTasks: DisplayTask[] = allTasksForDay.map((task) => {
      const tpl = task.templateId
        ? templateMap.get(task.templateId)
        : undefined;
      return {
        ...task,
        isArchived: tpl?.isArchived ?? false,
        enableNote: tpl?.enableNote ?? true,
      };
    });

    const finalTasks = [...augmentedRealTasks, ...placeholderTasks].sort(
      (a, b) => (a.isOneOff ? 1 : 0) - (b.isOneOff ? 1 : 0)
    );

    const total = finalTasks.length;
    if (total === 0) {
      return { displayTasks: [], doneCount: 0, totalCount: 0, pct: 0 };
    }
    const done = finalTasks.filter((t) => t.checked).length;
    return {
      displayTasks: finalTasks,
      doneCount: done,
      totalCount: total,
      pct: Math.round((done / total) * 100),
    };
  }, [isAuthenticated, tasks, allTemplates, selectedDate]);

  const { routineTasks, oneOffTasks } = useMemo(
    () => ({
      routineTasks: displayTasks.filter((t) => !t.isOneOff),
      oneOffTasks: displayTasks.filter((t) => t.isOneOff),
    }),
    [displayTasks]
  );

  const TaskItem = ({ task }: { task: DisplayTask }) => (
    <div
      className={`item ${task.checked ? "done" : ""} ${
        task.isArchived ? "archived" : ""
      }`}
    >
      <div className="item-content">
        <label className="item-title">
          <input
            type="checkbox"
            checked={task.checked}
            disabled={!isAuthenticated || task.isArchived}
            onChange={(e) =>
              mToggleCheck.mutate({
                id: task.id.startsWith("placeholder-") ? undefined : task.id,
                templateId: task.templateId,
                checked: e.target.checked,
                dateYMD: selectedDate,
              })
            }
          />
          <span>{task.title}</span>
        </label>
        {(task.note || task.value !== null) && (
          <div className="item-note">
            {task.value !== null && (
              <span className="task-value">[{task.value}시간] </span>
            )}
            {task.enableNote && task.note && `“${task.note}”`}
          </div>
        )}
      </div>
      {task.enableNote && !task.isOneOff && (
        <button
          className="btn-memo"
          disabled={!isAuthenticated || task.isArchived}
          aria-label="메모"
          onClick={() =>
            onSetMemoTarget({
              kind: "template",
              templateId: task.templateId!,
              title: task.title,
              note: task.note,
            })
          }
        >
          📝
        </button>
      )}
    </div>
  );

  return (
    <div className="day-details-container">
      {isAuthenticated && (
        <div className="day-details-summary">
          <CircularProgress percentage={pct} />
          <div className="day-details-info">
            <h3 className="day-details-date">{selectedDate}</h3>
            <p className="day-details-stats">
              {doneCount} / {totalCount} 완료
            </p>
          </div>
        </div>
      )}

      {!isAuthenticated ? (
        <div className="login-prompt">
          <p>로그인하여 {selectedDate}의 루틴을 관리해보세요.</p>
          <Link to="/login" className="btn primary">
            로그인
          </Link>
        </div>
      ) : isLoading ? (
        <p className="placeholder-text">로딩 중...</p>
      ) : (
        <div className="day-details-list">
          {displayTasks.length > 0 ? (
            <>
              {routineTasks.length > 0 && (
                <div className="task-group">
                  <h4 className="task-group-title">고정 루틴</h4>
                  {routineTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
              {oneOffTasks.length > 0 && (
                <div className="task-group">
                  <h4 className="task-group-title">오늘의 할 일</h4>
                  {oneOffTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="placeholder-text">
              이 날짜에 해당하는 루틴이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

function CalendarContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const qc = useQueryClient();
  const api = useApi();
  const [focus, setFocus] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPercentage, setShowPercentage] = useState(false);
  const [memoTarget, setMemoTarget] = useState<MemoTarget | null>(null);

  const from = localYMD(firstOfMonth(focus));
  const to = localYMD(lastOfMonth(focus));

  const { data: allTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["templates", "all"],
    queryFn: api.getAllTemplates,
    enabled: isAuthenticated,
  });

  const { data: monthTasks = [], isLoading: isLoadingMonthTasks } = useQuery({
    queryKey: ["tasks", "range", from, to],
    queryFn: () => api.getTasksForRange(from, to),
    enabled: isAuthenticated,
  });

  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return monthTasks.filter((task) => task.dateYMD === selectedDate);
  }, [selectedDate, monthTasks]);

  const summaryMap = useMemo(() => {
    if (!isAuthenticated || !allTemplates.length) return {};

    const summaries: Record<
      string,
      { totalWeight: number; doneWeight: number }
    > = {};
    const tasksByDate = monthTasks.reduce((acc, task) => {
      (acc[task.dateYMD] = acc[task.dateYMD] || []).push(task);
      return acc;
    }, {} as Record<string, DailyTask[]>);

    const daysInMonth = Array.from(
      {
        length: new Date(
          focus.getFullYear(),
          focus.getMonth() + 1,
          0
        ).getDate(),
      },
      (_, i) => localYMD(new Date(focus.getFullYear(), focus.getMonth(), i + 1))
    );

    for (const dateYMD of daysInMonth) {
      const tasksOnDate = tasksByDate[dateYMD] || [];
      const defaultActiveTemplatesOnDate = allTemplates.filter((tpl) => {
        if (!tpl.defaultActive) return false;
        const createdAtDate = tpl.createdAt.substring(0, 10);
        if (dateYMD < createdAtDate) return false;
        if (tpl.isArchived) {
          const archivedAtDate = tpl.updatedAt.substring(0, 10);
          if (dateYMD >= archivedAtDate) return false;
        }
        return true;
      });

      const templateIdsWithTasks = new Set(
        tasksOnDate.map((t) => t.templateId).filter(Boolean) as string[]
      );
      const templatesWithTasksOnDate = allTemplates.filter((tpl) =>
        templateIdsWithTasks.has(tpl.id)
      );

      const allRelevantTemplates = new Map<string, Template>();
      defaultActiveTemplatesOnDate.forEach((tpl) =>
        allRelevantTemplates.set(tpl.id, tpl)
      );
      templatesWithTasksOnDate.forEach((tpl) =>
        allRelevantTemplates.set(tpl.id, tpl)
      );

      const relevantTemplatesArray = Array.from(allRelevantTemplates.values());
      const activeTemplatesTotalWeight = relevantTemplatesArray.reduce(
        (sum, tpl) => sum + tpl.weight,
        0
      );
      const oneOffTasksTotalWeight = tasksOnDate
        .filter((t) => t.isOneOff)
        .reduce((sum, t) => sum + t.weight, 0);

      const totalWeight = activeTemplatesTotalWeight + oneOffTasksTotalWeight;
      const doneWeight = tasksOnDate
        .filter((t) => t.checked)
        .reduce((sum, t) => sum + t.weight, 0);

      if (totalWeight > 0 || doneWeight > 0) {
        summaries[dateYMD] = { totalWeight, doneWeight };
      }
    }
    return summaries;
  }, [isAuthenticated, allTemplates, monthTasks, focus]);

  const mUpdateMemo = useMutation({
    mutationFn: (p: {
      dateYMD: string;
      templateId?: string;
      taskId?: string;
      note: string;
    }) =>
      p.taskId
        ? api.updateTask(p.taskId, { note: p.note })
        : api.upsertTaskNote({
            dateYMD: p.dateYMD,
            templateId: p.templateId!,
            note: p.note,
          }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", "range", from, to] });
      qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
    },
  });

  const handleSaveMemo = async (memoText: string) => {
    if (!memoTarget || !selectedDate) return;
    const params = {
      dateYMD: selectedDate,
      note: memoText,
      taskId: memoTarget.kind === "task" ? memoTarget.id : undefined,
      templateId:
        memoTarget.kind === "template" ? memoTarget.templateId : undefined,
    };
    await mUpdateMemo.mutateAsync(params);
    setMemoTarget(null);
  };

  const todayYMD = localYMD();
  const isLoading =
    isAuthenticated && (isLoadingTemplates || isLoadingMonthTasks);

  if (isLoading) {
    return (
      <div className="card">
        <p style={{ textAlign: "center" }}>Loading Calendar Data...</p>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-main card">
        <div className="calendar-header">
          <button
            className="btn"
            onClick={() =>
              setFocus(new Date(focus.getFullYear(), focus.getMonth() - 1, 1))
            }
          >
            {"<"}
          </button>
          <h2>
            {focus.getFullYear()}.
            {String(focus.getMonth() + 1).padStart(2, "0")}
          </h2>
          <button
            className="btn"
            onClick={() =>
              setFocus(new Date(focus.getFullYear(), focus.getMonth() + 1, 1))
            }
          >
            {">"}
          </button>
        </div>
        <div className="calendar-controls">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showPercentage}
              onChange={() => setShowPercentage(!showPercentage)}
              disabled={!isAuthenticated}
            />
            <span className="slider"></span>
          </label>
          <span>달성률 숫자 표시</span>
        </div>
        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
          {Array(firstOfMonth(focus).getDay())
            .fill(0)
            .map((_, i) => (
              <div key={`pad${i}`} className="calendar-day empty" />
            ))}
          {Array.from(
            { length: lastOfMonth(focus).getDate() },
            (_, i) => new Date(focus.getFullYear(), focus.getMonth(), i + 1)
          ).map((d) => {
            const k = localYMD(d);
            const s = summaryMap[k];
            const ratio = s ? s.doneWeight / Math.max(1, s.totalWeight) : 0;
            const pct = Math.round(ratio * 100);
            return (
              <div
                key={k}
                onClick={() => setSelectedDate(k)}
                className={`calendar-day ${
                  selectedDate === k ? "selected" : ""
                } ${k === todayYMD ? "today" : ""}`}
              >
                <div className="day-number">{d.getDate()}</div>
                {s && showPercentage && (
                  <div className="day-percentage">{pct}%</div>
                )}
                {s && (
                  <div className="day-progress">
                    <div
                      className="day-progress-bar"
                      style={{
                        width: `${pct}%`,
                        background: getStyleForPercentage(pct).background,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="calendar-sidebar card">
        {selectedDate ? (
          <DayDetails
            selectedDate={selectedDate}
            onSetMemoTarget={setMemoTarget}
            isAuthenticated={isAuthenticated}
            allTemplates={allTemplates}
            tasks={tasksForSelectedDate}
            isLoading={isLoadingMonthTasks}
          />
        ) : (
          <div className="sidebar-placeholder">
            <span>날짜를 선택하여 상세 내용을 확인하세요.</span>
          </div>
        )}
      </div>
      <MemoModal
        isOpen={!!memoTarget}
        targetTitle={memoTarget?.title ?? ""}
        initialText={memoTarget?.note ?? ""}
        isSaving={mUpdateMemo.isPending}
        onClose={() => setMemoTarget(null)}
        onSave={handleSaveMemo}
      />
    </div>
  );
}

export default function Calendar() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="card">
        <p style={{ textAlign: "center" }}>Loading Calendar...</p>
      </div>
    );
  }

  return <CalendarContent isAuthenticated={isAuthenticated} />;
}
