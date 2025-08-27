import { useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { DailyTask, getDailyTasks, api } from "../api/client";

// --- Types ---
type Template = {
  id: string;
  title: string;
  defaultActive: boolean;
};
type MemoTarget =
  | { kind: "task"; id: string; title: string; note: string | null }
  | {
      kind: "template";
      templateId: string;
      title: string;
      note: string | null;
    };

// --- Helper Functions ---
function ymd(d = new Date()) {
  const u = d.getTime() + d.getTimezoneOffset() * 60000;
  const k = new Date(u + 9 * 3600000);
  return `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(k.getDate()).padStart(2, "0")}`;
}
function firstOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function getCellColors(pct: number): React.CSSProperties {
  if (pct <= 0) return { background: "var(--bg-cell-base, #374151)", color: "var(--text-dim, #d1d5db)" };
  if (pct < 33) return { background: "#ef4444", color: "#111827" };
  if (pct < 66) return { background: "#f59e0b", color: "#111827" };
  if (pct < 100) return { background: "#22c55e", color: "#111827" };
  return {
    background: "linear-gradient(45deg, #22c55e, #84cc16)",
    color: "#111827",
    fontWeight: "bold",
  };
}

// --- Component ---
export default function Calendar() {
  const qc = useQueryClient();
  const [focus, setFocus] = useState(new Date());

  // --- Data Fetching ---
  const from = ymd(firstOfMonth(focus));
  const to = ymd(lastOfMonth(focus));
  const { data: summaryData } = useQuery({
    queryKey: ["summaries", from, to],
    queryFn: () => api<any[]>(`/api/summaries?from=${from}&to=${to}`),
  });
  const summaryMap = useMemo(() => Object.fromEntries((summaryData || []).map((s) => [s.dateYMD, s])), [summaryData]);
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api<Template[]>("/api/templates"),
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
    mutationFn: (p: { id?: string; templateId?: string; checked: boolean; dateYMD: string }) =>
      p.id
        ? api(`/api/tasks/${p.id}`, { method: "PATCH", body: JSON.stringify({ checked: p.checked }) })
        : api("/api/daily/check", { method: "POST", body: JSON.stringify({ dateYMD: p.dateYMD, templateId: p.templateId, checked: p.checked }) }),
    onSuccess: (_, variables) => {
      // ✅ SOLVED: Invalidate by root key to avoid stale closures
      qc.invalidateQueries({ queryKey: ["summaries"] });
      qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
      handleDateClick(variables.dateYMD, true);
    },
  });

  const mUpdateMemo = useMutation({
    mutationFn: (p: { dateYMD: string; templateId?: string; taskId?: string; note: string }) =>
      p.taskId
        ? api(`/api/tasks/${p.taskId}`, { method: "PATCH", body: JSON.stringify({ note: p.note }) })
        : api("/api/daily/note", { method: "POST", body: JSON.stringify({ dateYMD: p.dateYMD, templateId: p.templateId, note: p.note }) }),
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
      const result = await getDailyTasks(date);
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
        templateId: memoTarget.kind === "template" ? memoTarget.templateId : undefined,
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
    const tasksByTplId = Object.fromEntries(dayTasks.filter((t) => t.templateId).map((t) => [t.templateId, t]));
    const oneOffs = dayTasks.filter((t) => t.isOneOff);
    const templateTasks = activeTemplates.map((tpl) => {
      const task = tasksByTplId[tpl.id];
      return { id: task?.id, templateId: tpl.id, title: tpl.title, checked: task?.checked ?? false, note: task?.note ?? null, isOneOff: false };
    });
    const oneOffTasks = oneOffs.map((task) => ({ id: task.id, templateId: null, title: task.title, checked: task.checked, note: task.note, isOneOff: true }));
    return [...templateTasks, ...oneOffTasks];
  }, [templates, dayTasks]);

  // --- Render ---
  return (
    <div className="calendar-page">
      {/* Calendar Grid */}
      <div className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <button className="btn" onClick={() => setFocus(new Date(focus.getFullYear(), focus.getMonth() - 1, 1))}>{"<"}</button>
          <h3 style={{ margin: 0, minWidth: 120, textAlign: "center" }}>{focus.getFullYear()}.{String(focus.getMonth() + 1).padStart(2, "0")}</h3>
          <button className="btn" onClick={() => setFocus(new Date(focus.getFullYear(), focus.getMonth() + 1, 1))}>{ ">"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => <div key={d} style={{ textAlign: "center", fontWeight: 600, paddingBottom: 8, color: "var(--text-dim)" }}>{d}</div>)}
          {Array(firstOfMonth(focus).getDay()).fill(0).map((_, i) => <div key={"pad" + i} />)}
          {Array.from({ length: lastOfMonth(focus).getDate() }, (_, i) => new Date(focus.getFullYear(), focus.getMonth(), i + 1)).map((d) => {
            const k = ymd(d);
            const s = summaryMap[k];
            const ratio = s ? s.doneWeight / Math.max(1, s.totalWeight) : 0;
            const pct = Math.round(ratio * 100);
            const colors = getCellColors(pct);
            const isSelected = selectedDate === k;
            return (
              <div key={k} onClick={() => handleDateClick(k)} className="calendar-cell" style={{ ...colors, border: isSelected ? "2px solid var(--primary)" : "2px solid transparent", opacity: isSelected ? 1 : 0.85 }}>
                <div style={{ fontWeight: 700 }}>{d.getDate()}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day's Task List */}
      {selectedDate && (
        <div className="card" style={{ marginTop: 24, padding: "4px 1rem 1rem" }}>
          <h4 style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>{selectedDate} 루틴</h4>
          {isLoading && <p>로딩 중...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {!isLoading && !error && (
            <div className="list">
              {displayTasks.map((task) => {
                const success = task.checked;
                return (
                  <div key={task.templateId || task.id} className={`item ${success ? "done" : ""}`} style={success ? { background: "rgba(34,197,94,.12)" } : {}}>
                    <div className="col">
                      <label className="title" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                        <input type="checkbox" checked={success} onChange={(e) => mToggleCheck.mutate({ id: task.id, templateId: task.templateId, checked: e.target.checked, dateYMD: selectedDate })} />
                        <span>{task.title}</span>
                      </label>
                      {task.note && <div className="note">“{task.note}”</div>}
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn" onClick={() => {
                        setMemoTarget(task.isOneOff ? { kind: "task", id: task.id!, title: task.title, note: task.note } : { kind: "template", templateId: task.templateId!, title: task.title, note: task.note });
                        setMemoText(task.note || "");
                      }}>메모</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Memo Modal */}
      {memoTarget && (
        <div className="modal-overlay" onClick={() => setMemoTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{memoTarget.title} 메모</span>
              <button className="btn-close" onClick={() => setMemoTarget(null)} aria-label="닫기">✕</button>
            </div>
            <div className="modal-body">
              <textarea autoFocus value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="오늘 느낀 점, 기록하고 싶은 내용을 적어주세요…" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSaveMemo(); if (e.key === "Escape") setMemoTarget(null); }} />
            </div>
            <div className="modal-footer">
              <div style={{ color: "#9ca3af", fontSize: 12 }}>Ctrl/⌘ + Enter 저장 • Esc 닫기</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => setMemoTarget(null)} disabled={isSavingMemo}>취소</button>
                <button className="btn primary" onClick={handleSaveMemo} disabled={isSavingMemo}>{isSavingMemo ? "저장 중..." : "저장"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}