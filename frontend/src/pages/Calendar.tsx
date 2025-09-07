import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { DailyTask, Template as ITemplate } from "../api/client";
import "./Calendar.css";

// --- Types ---
type Template = ITemplate;
type MemoTarget =
  | { kind: "task"; id: string; title: string; note: string | null }
  | {
      kind: "template";
      templateId: string;
      title: string;
      note: string | null;
    };

// --- Helper Functions ---
function localYMD(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

const getProgressBarColor = (pct: number) => {
  if (pct < 33) return "#ef4444";
  if (pct < 66) return "#f59e0b";
  if (pct >= 100) return "#84cc16";
  return "#22c55e";
};

// --- Sub-components ---

const DayDetails = ({
  selectedDate,
  tasks,
  isLoading,
  error,
  onToggleCheck,
  onSetMemoTarget,
}: {
  selectedDate: string | null;
  tasks: any[];
  isLoading: boolean;
  error: string | null;
  onToggleCheck: (params: {
    id?: string;
    templateId?: string;
    checked: boolean;
  }) => void;
  onSetMemoTarget: (target: MemoTarget) => void;
}) => {
  if (!selectedDate) {
    return (
      <div className="sidebar-placeholder">
        <span>날짜를 선택하여 상세 내용을 확인하세요.</span>
      </div>
    );
  }

  return (
    <div className="day-details-container">
      <h3 className="day-details-header">{selectedDate} 루틴</h3>
      {isLoading && <p>로딩 중...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!isLoading && !error && (
        <div className="day-details-list">
          {tasks.map((task) => (
            <div
              key={task.templateId || task.id}
              className={`item ${task.checked ? "done" : ""}`}
            >
              <label className="title">
                <input
                  type="checkbox"
                  checked={task.checked}
                  onChange={(e) =>
                    onToggleCheck({
                      id: task.id,
                      templateId: task.templateId ?? undefined,
                      checked: e.target.checked,
                    })
                  }
                />
                <span>{task.title}</span>
              </label>
              {task.note && <div className="note">“{task.note}”</div>}
              <button
                className="btn-memo"
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

// --- Main Component ---
export default function Calendar() {
  const qc = useQueryClient();
  const api = useApi();
  const [focus, setFocus] = useState(new Date());

  // --- Data Fetching ---
  const from = localYMD(firstOfMonth(focus));
  const to = localYMD(lastOfMonth(focus));
  const { data: summaryData } = useQuery({
    queryKey: ["summaries", from, to],
    queryFn: () => api.getDailySummaries(from, to),
  });
  const summaryMap = useMemo(
    () => Object.fromEntries((summaryData || []).map((s) => [s.dateYMD, s])),
    [summaryData]
  );
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: api.getTemplates,
  });

  // --- State ---
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTasks, setDayTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoTarget, setMemoTarget] = useState<MemoTarget | null>(null);
  const [memoText, setMemoText] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  // --- Mutations ---
  const mToggleCheck = useMutation({
    mutationFn: (p: {
      id?: string;
      templateId?: string;
      checked: boolean;
      dateYMD: string;
    }) =>
      p.id
        ? api.updateTask(p.id, { checked: p.checked })
        : api.upsertTaskFromTemplate({
            dateYMD: p.dateYMD,
            templateId: p.templateId!,
            checked: p.checked,
          }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["summaries"] });
      qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
      handleDateClick(variables.dateYMD, true);
    },
  });

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
      qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
      handleDateClick(variables.dateYMD, true);
    },
  });

  // --- Event Handlers ---
  const handleDateClick = async (date: string, force = false) => {
    if (date === selectedDate && !force) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(date);
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getDailyTasks(date);
      setDayTasks(result.tasks);
    } catch (err) {
      setError("태스크를 불러오는 데 실패했습니다.");
      setDayTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMemo = async () => {
    if (!memoTarget || !selectedDate) return;
    setIsSavingMemo(true);
    try {
      await mUpdateMemo.mutateAsync({
        dateYMD: selectedDate,
        taskId: memoTarget.kind === "task" ? memoTarget.id : undefined,
        templateId:
          memoTarget.kind === "template" ? memoTarget.templateId : undefined,
        note: memoText,
      });
      setMemoTarget(null);
    } finally {
      setIsSavingMemo(false);
    }
  };

  // --- Data Processing ---
  const displayTasks = useMemo(() => {
    const activeTemplates = templates.filter((t) => t.defaultActive);
    const tasksByTplId = Object.fromEntries(
      dayTasks.filter((t) => t.templateId).map((t) => [t.templateId, t])
    );
    const oneOffs = dayTasks.filter((t) => t.isOneOff);
    const templateTasks = activeTemplates.map((tpl) => {
      const task = tasksByTplId[tpl.id];
      return {
        id: task?.id,
        templateId: tpl.id,
        title: tpl.title,
        checked: task?.checked ?? false,
        note: task?.note ?? null,
        isOneOff: false,
      };
    });
    const oneOffTasks = oneOffs.map((task) => ({
      id: task.id,
      templateId: null,
      title: task.title,
      checked: task.checked,
      note: task.note,
      isOneOff: true,
    }));
    return [...templateTasks, ...oneOffTasks];
  }, [templates, dayTasks]);

  const todayYMD = localYMD();

  // --- Render ---
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
        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
          {Array(firstOfMonth(focus).getDay())
            .fill(0)
            .map((_, i) => (
              <div key={"pad" + i} className="calendar-day empty" />
            ))}
          {Array.from(
            { length: lastOfMonth(focus).getDate() },
            (_, i) => new Date(focus.getFullYear(), focus.getMonth(), i + 1)
          ).map((d) => {
            const k = localYMD(d);
            const s = summaryMap[k];
            const ratio = s ? s.doneWeight / Math.max(1, s.totalWeight) : 0;
            const pct = Math.round(ratio * 100);
            const isSelected = selectedDate === k;
            const isToday = k === todayYMD;

            return (
              <div
                key={k}
                onClick={() => handleDateClick(k)}
                className={`calendar-day ${isSelected ? "selected" : ""} ${
                  isToday ? "today" : ""
                }`}
              >
                <div className="day-number">{d.getDate()}</div>
                {s && (
                  <div className="day-progress">
                    <div
                      className="day-progress-bar"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: getProgressBarColor(pct),
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
        <DayDetails
          selectedDate={selectedDate}
          tasks={displayTasks}
          isLoading={isLoading}
          error={error}
          onToggleCheck={({ id, templateId, checked }) =>
            mToggleCheck.mutate({
              id,
              templateId,
              checked,
              dateYMD: selectedDate!,
            })
          }
          onSetMemoTarget={(target) => {
            setMemoTarget(target);
            setMemoText(target.note || "");
          }}
        />
      </div>

      {/* Memo Modal */}
      {memoTarget && (
        <div className="modal-overlay" onClick={() => setMemoTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{memoTarget.title} 메모</span>
              <button
                className="btn-close"
                onClick={() => setMemoTarget(null)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <textarea
                autoFocus
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="오늘 느낀 점, 기록하고 싶은 내용을 적어주세요…"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter")
                    handleSaveMemo();
                  if (e.key === "Escape") setMemoTarget(null);
                }}
              />
            </div>
            <div className="modal-footer">
              <div className="hotkey-hint">Ctrl/⌘ + Enter 저장 • Esc 닫기</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => setMemoTarget(null)}
                  disabled={isSavingMemo}
                >
                  취소
                </button>
                <button
                  className="btn primary"
                  onClick={handleSaveMemo}
                  disabled={isSavingMemo}
                >
                  {isSavingMemo ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
