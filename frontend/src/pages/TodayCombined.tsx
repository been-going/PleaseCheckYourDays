// TodayCombined.tsx - Fully refactored for useApi hook
import { useMemo, useState, CSSProperties } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { Template, DailyTask as Task } from "../api/client";
import { getStyleForPercentage } from "../utils/colorUtils";

type Group = "MORNING" | "EXECUTE" | "EVENING";

function localYMD(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function label(g: Group) {
  return g === "MORNING"
    ? "아침루틴"
    : g === "EXECUTE"
    ? "실행루틴"
    : "저녁루틴";
}

function sortKey(t: { group: Group; order?: number }) {
  const order = { MORNING: 0, EXECUTE: 1, EVENING: 2 } as const;
  return order[t.group] * 1000 + ((t as any).order ?? 0);
}

function isDone(t: {
  checked: boolean;
  note?: string | null;
  value?: number | null;
}) {
  return !!(
    t.checked ||
    (t.note && t.note.trim().length > 0) ||
    typeof t.value === "number"
  );
}

export default function TodayCombined() {
  const qc = useQueryClient();
  const api = useApi();

  const [showNotes, setShowNotes] = useState(true);
  type MemoTarget =
    | { kind: "task"; id: string; title: string }
    | { kind: "template"; id: string; title: string };
  const [memoTarget, setMemoTarget] = useState<MemoTarget | null>(null);
  const [memoText, setMemoText] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

  const [dateYMD, setDateYMD] = useState(localYMD());
  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplGroup, setNewTplGroup] = useState<Group>("EXECUTE");
  const [oneoffTitle, setOneoffTitle] = useState("");

  const qTpl = useQuery({
    queryKey: ["templates"],
    queryFn: api.getTemplates,
  });
  const qDay = useQuery({
    queryKey: ["tasks", dateYMD],
    queryFn: () => api.getDailyTasks(dateYMD),
  });

  const invalidateToday = () =>
    qc.invalidateQueries({ queryKey: ["tasks", dateYMD] });
  const invalidateTemplates = () =>
    qc.invalidateQueries({ queryKey: ["templates"] });

  const onMutationError = (error: unknown) => {
    console.error("Mutation failed:", error);
    alert("작업에 실패했습니다. 개발자 콘솔을 확인해주세요.");
  };

  const mCreateTpl = useMutation({
    mutationFn: (p: { title: string; group: Group }) =>
      api.createTemplate({ title: p.title, group: p.group }),
    onSuccess: () => {
      setNewTplTitle("");
      invalidateTemplates();
    },
    onError: onMutationError,
  });
  const mUpdateTpl = useMutation({
    mutationFn: (p: {
      id: string;
      title?: string;
      group?: Group;
      defaultActive?: boolean;
    }) => {
      const { id, ...rest } = p;
      return api.updateTemplate(id, rest);
    },
    onSuccess: invalidateTemplates,
    onError: onMutationError,
  });
  const mDeleteTpl = useMutation({
    mutationFn: (p: { id: string }) => api.deleteTemplate(p.id),
    onSuccess: invalidateTemplates,
    onError: onMutationError,
  });
  const mAddOneoff = useMutation({
    mutationFn: (p: { title: string; dateYMD: string }) => api.addOneoff(p),
    onSuccess: () => {
      setOneoffTitle("");
      invalidateToday();
    },
    onError: onMutationError,
  });
  const mDeleteTask = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: invalidateToday,
    onError: onMutationError,
  });
  const mCheckTemplate = useMutation({
    mutationFn: (p: {
      dateYMD: string;
      templateId: string;
      checked: boolean;
    }) => api.upsertTaskFromTemplate(p),
    onSuccess: invalidateToday,
    onError: onMutationError,
  });
  const mNoteTemplate = useMutation({
    mutationFn: (p: { dateYMD: string; templateId: string; note: string }) =>
      api.upsertTaskNote(p),
    onSuccess: invalidateToday,
    onError: onMutationError,
  });
  const mUpdateTask = useMutation({
    mutationFn: (p: {
      id: string;
      data: { checked?: boolean; note?: string; value?: number };
    }) => api.updateTask(p.id, p.data),
    onSuccess: invalidateToday,
    onError: onMutationError,
  });

  const templates = (qTpl.data ?? [])
    .slice()
    .sort((a, b) => sortKey(a) - sortKey(b));
  const activeTemplates = useMemo(
    () => templates.filter((t) => t.defaultActive),
    [templates]
  );
  const allTasks = qDay.data?.tasks ?? [];
  const oneoffs = useMemo(() => allTasks.filter((t) => t.isOneOff), [allTasks]);

  const byTplId = useMemo(() => {
    const map: Record<string, Task> = {};
    for (const t of allTasks) {
      if (t.templateId) {
        map[t.templateId] = t;
      }
    }
    return map;
  }, [allTasks]);

  const { total, done, pct } = useMemo(() => {
    const tplPairs = activeTemplates.map((tpl) => ({
      tpl,
      row: byTplId[tpl.id],
    }));
    const totalCount = tplPairs.length + oneoffs.length;
    const doneCount =
      tplPairs.filter((p) => p.row?.checked === true).length +
      oneoffs.filter((t) => t.checked === true).length;
    const pctVal = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
    return { total: totalCount, done: doneCount, pct: pctVal };
  }, [activeTemplates, byTplId, oneoffs]);

  const isLoading = qTpl.isLoading || qDay.isLoading;

  async function saveMemo() {
    if (!memoTarget) return;
    try {
      setSavingMemo(true);
      if (memoTarget.kind === "task") {
        await mUpdateTask.mutateAsync({
          id: memoTarget.id,
          data: { note: memoText },
        });
      } else {
        const existingTask = byTplId[memoTarget.id];
        if (existingTask) {
          await mUpdateTask.mutateAsync({
            id: existingTask.id,
            data: { note: memoText },
          });
        } else {
          await mNoteTemplate.mutateAsync({
            templateId: memoTarget.id,
            dateYMD,
            note: memoText,
          });
        }
      }
      setMemoTarget(null);
    } catch (e) {
      console.error("Failed to save memo:", e);
    } finally {
      setSavingMemo(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      {isLoading && <div className="card">Loading...</div>}
      {!isLoading && (
        <>
          <div className="card">
            <div
              className="row"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <h3>오늘의 체크리스트</h3>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <div className="tag">{dateYMD}</div>
                <div className="tag" style={getStyleForPercentage(pct)}>
                  {pct}%
                </div>
              </div>
            </div>
            <div className="progress" aria-label="progress">
              <i style={{ width: `${pct}%`, ...getStyleForPercentage(pct) }} />
            </div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              {done} / {total} 완료
            </div>
          </div>

          <div className="card">
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <h3>오늘 루틴</h3>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="btn"
                  placeholder="오늘만 추가…"
                  value={oneoffTitle}
                  onChange={(e) => setOneoffTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && oneoffTitle.trim()) {
                      mAddOneoff.mutate({
                        title: oneoffTitle.trim(),
                        dateYMD,
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    oneoffTitle.trim() &&
                    mAddOneoff.mutate({ title: oneoffTitle.trim(), dateYMD })
                  }
                >
                  오늘만 추가
                </button>
              </div>
            </div>
            <div className="section">
              <div className="list">
                {oneoffs.map((t) => (
                  <div key={t.id} className={`item ${t.checked ? "done" : ""}`}>
                    <div className="col">
                      <div className="title">{t.title}</div>
                      {showNotes && t.note && (
                        <div className="note">“{t.note}”</div>
                      )}
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className={`btn ${t.checked ? "" : "primary"}`}
                        onClick={() =>
                          mUpdateTask.mutate({
                            id: t.id,
                            data: { checked: !t.checked },
                          })
                        }
                      >
                        {t.checked ? "성공 취소" : "성공"}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setMemoTarget({
                            kind: "task",
                            id: t.id,
                            title: t.title,
                          });
                          setMemoText(t.note ?? "");
                        }}
                      >
                        메모
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          if (confirm(`'${t.title}' 삭제?`))
                            mDeleteTask.mutate(t.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <h3>고정 루틴</h3>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="btn"
                  placeholder="새 루틴 제목"
                  value={newTplTitle}
                  onChange={(e) => setNewTplTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTplTitle.trim()) {
                      mCreateTpl.mutate({
                        title: newTplTitle.trim(),
                        group: newTplGroup,
                      });
                    }
                  }}
                />
                <select
                  className="btn"
                  value={newTplGroup}
                  onChange={(e) => setNewTplGroup(e.target.value as Group)}
                >
                  <option value="MORNING">아침</option>
                  <option value="EXECUTE">실행</option>
                  <option value="EVENING">저녁</option>
                </select>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    newTplTitle.trim() &&
                    mCreateTpl.mutate({
                      title: newTplTitle.trim(),
                      group: newTplGroup,
                    })
                  }
                >
                  루틴 추가
                </button>
              </div>
            </div>
            <div className="section">
              {templates.map((tpl) => {
                const today = byTplId[tpl.id];
                const success = today?.checked === true;
                return (
                  <div key={tpl.id} className={`item ${success ? "done" : ""}`}>
                    <div className="col">
                      <div className="title">{tpl.title}</div>
                      {showNotes && today?.note && (
                        <div className="note">“{today.note}”</div>
                      )}
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className={`btn ${success ? "" : "primary"}`}
                        onClick={() => {
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
                      >
                        {success ? "취소" : "오늘 성공"}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setMemoTarget({
                            kind: "template",
                            id: tpl.id,
                            title: tpl.title,
                          });
                          setMemoText(today?.note ?? "");
                        }}
                      >
                        메모
                      </button>
                      <details className="menu">
                        <summary className="btn">⋯</summary>
                        <div className="menu-list">
                          <button
                            type="button"
                            className="menu-item"
                            onClick={() => {
                              const next = prompt("새 제목", tpl.title);
                              if (next)
                                mUpdateTpl.mutate({ id: tpl.id, title: next });
                            }}
                          >
                            제목 수정
                          </button>
                          <button
                            type="button"
                            className="menu-item"
                            onClick={() => mDeleteTpl.mutate({ id: tpl.id })}
                          >
                            템플릿 삭제
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

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
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") saveMemo();
                  if (e.key === "Escape") setMemoTarget(null);
                }}
              />
            </div>
            <div className="modal-footer">
              <div style={{ color: "#9ca3af", fontSize: 12 }}>
                Ctrl/⌘ + Enter 저장 • Esc 닫기
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => setMemoTarget(null)}
                  disabled={savingMemo}
                >
                  취소
                </button>
                <button
                  className="btn primary"
                  onClick={saveMemo}
                  disabled={savingMemo}
                >
                  {savingMemo ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
