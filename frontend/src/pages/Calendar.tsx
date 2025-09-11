import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { DailyTask, Template as ITemplate } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getStyleForPercentage } from "../utils/colorUtils";
import { localYMD, firstOfMonth, lastOfMonth } from "../utils/dateUtils";
import { MemoModal } from "../components/MemoModal";
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

type DisplayTask = DailyTask & { isArchived: boolean };

const DayDetails = ({
  selectedDate,
  onSetMemoTarget,
  isAuthenticated,
  allTemplates, // Prop으로 받음
}: {
  selectedDate: string;
  onSetMemoTarget: (target: MemoTarget) => void;
  isAuthenticated: boolean;
  allTemplates: Template[]; // Prop 타입
}) => {
  const qc = useQueryClient();
  const api = useApi();

  const {
    data: dayTasksData,
    isLoading: isLoadingTasks,
    error,
  } = useQuery({
    queryKey: ["tasks", selectedDate],
    queryFn: () => api.getDailyTasks(selectedDate),
    enabled: !!selectedDate && isAuthenticated,
  });

  const mToggleCheck = useMutation({
    mutationFn: (p: {
      id?: string;
      templateId?: string;
      checked: boolean;
      dateYMD: string;
    }) =>
      p.id
        ? api.updateTask(p.id, { checked: p.checked })
        : api.upsertTaskFromTemplate({ ...p }),
    onSuccess: (_, variables) => {
      // 이제 부모 컴포넌트에서 관리하는 월별 task 쿼리를 무효화합니다.
      const from = localYMD(firstOfMonth(new Date(variables.dateYMD)));
      const to = localYMD(lastOfMonth(new Date(variables.dateYMD)));
      qc.invalidateQueries({ queryKey: ["tasks", "range", from, to] });
      qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
    },
  });

  const displayTasks = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }
    if (!dayTasksData || !allTemplates) return [];

    const allTasksForDay = dayTasksData.tasks ?? [];
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
        if (selectedDate >= archivedAtDate) {
          return false;
        }
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
    }));

    const templateMap = new Map(allTemplates.map((t) => [t.id, t]));
    const augmentedRealTasks: DisplayTask[] = allTasksForDay.map((task) => {
      const tpl = task.templateId
        ? templateMap.get(task.templateId)
        : undefined;
      return {
        ...task,
        isArchived: tpl?.isArchived ?? false,
      };
    });

    return [...augmentedRealTasks, ...placeholderTasks];
  }, [isAuthenticated, dayTasksData, allTemplates, selectedDate]);

  return (
    <div className="day-details-container">
      <h3 className="day-details-header">{selectedDate} 루틴</h3>
      {isLoadingTasks && <p>로딩 중...</p>}
      {error && (
        <p style={{ color: "red" }}>태스크를 불러오는 데 실패했습니다.</p>
      )}
      {!isLoadingTasks && !error && (
        <div className="day-details-list">
          {displayTasks.map((task) => (
            <div
              key={task.id}
              className={`item ${task.checked ? "done" : ""} ${
                task.isArchived ? "archived" : ""
              }`}
            >
              <div className="item-content">
                <label className="title">
                  <input
                    type="checkbox"
                    checked={task.checked}
                    disabled={!isAuthenticated || task.isArchived}
                    onChange={(e) =>
                      mToggleCheck.mutate({
                        id: task.id.startsWith("placeholder-")
                          ? undefined
                          : task.id,
                        templateId: task.templateId ?? undefined,
                        checked: e.target.checked,
                        dateYMD: selectedDate,
                      })
                    }
                  />
                  <span>{task.title}</span>
                </label>
                {task.note && <div className="note">“{task.note}”</div>}
              </div>
              <button
                className="btn-memo"
                disabled={!isAuthenticated || task.isArchived}
                aria-label="메모"
                onClick={() =>
                  onSetMemoTarget(
                    task.isOneOff
                      ? {
                          kind: "task",
                          id: task.id!,
                          title: task.title,
                          note: task.note,
                        }
                      : {
                          kind: "template",
                          templateId: task.templateId!,
                          title: task.title,
                          note: task.note,
                        }
                  )
                }
              >
                📝
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Calendar() {
  const qc = useQueryClient();
  const api = useApi();
  const { isAuthenticated } = useAuth();
  const [focus, setFocus] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPercentage, setShowPercentage] = useState(false); // 달성률 표시 상태
  const [memoTarget, setMemoTarget] = useState<MemoTarget | null>(null);

  const from = localYMD(firstOfMonth(focus));
  const to = localYMD(lastOfMonth(focus));

  // 1. 모든 템플릿 정보를 가져옵니다.
  const { data: allTemplates = [] } = useQuery({
    queryKey: ["templates", "all"],
    queryFn: api.getAllTemplates,
    enabled: isAuthenticated,
  });

  // 2. 현재 달의 모든 태스크 기록을 가져옵니다.
  const { data: monthTasks = [] } = useQuery({
    queryKey: ["tasks", "range", from, to],
    queryFn: () => api.getTasksForRange(from, to),
    enabled: isAuthenticated,
  });

  // 3. 프론트엔드에서 직접 달성률 요약 맵을 계산합니다.
  const summaryMap = useMemo(() => {
    if (!isAuthenticated || !allTemplates.length) {
      return {};
    }

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

      // 그날 당시에 활성화 상태였던 템플릿을 필터링합니다.
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

      // 그날 실제 기록이 있는 템플릿을 찾습니다.
      const templateIdsWithTasks = new Set(
        tasksOnDate.map((t) => t.templateId).filter(Boolean) as string[]
      );
      const templatesWithTasksOnDate = allTemplates.filter((tpl) =>
        templateIdsWithTasks.has(tpl.id)
      );

      // 두 목록을 합쳐 중복을 제거하여 그날의 총 루틴 목록을 만듭니다.
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
