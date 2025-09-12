import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import { useAuth } from "../context/AuthContext";
import type { Template, DailyTask as Task } from "../api/client";
import { getStyleForPercentage } from "../utils/colorUtils";
import { localYMD } from "../utils/dateUtils";
import { MemoModal } from "../components/MemoModal";
import { TrashModal } from "../components/TrashModal";
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
  return order[t.group] * 1000 + ((t as any).order ?? 0);
}

function TodayCombinedContent({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  // 로그인하지 않은 사용자는 로그인 안내 화면을 표시합니다.
  if (!isAuthenticated) {
    return (
      <div className="card login-prompt-container">
        <h3>로그인이 필요합니다</h3>
        <p>로그인하여 오늘의 할 일과 루틴을 관리하고 진행 상황을 추적하세요.</p>
        <Link to="/login" className="btn primary" style={{ marginTop: "1rem" }}>
          로그인 페이지로 이동
        </Link>
      </div>
    );
  }

  const qc = useQueryClient();
  const api = useApi();

  const [memoTarget, setMemoTarget] = useState<MemoTarget | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
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
    console.error("Mutation failed:", error);
    alert("작업에 실패했습니다. 개발자 콘솔을 확인해주세요.");
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
          value: null, // When creating from memo, value is null
        });
      }
    }
    setMemoTarget(null);
  };

  // 데이터 로딩은 로그인 되었을 때만 의미가 있습니다.
  const isLoading = isAuthenticated && (qTpl.isLoading || qDay.isLoading);

  if (isLoading) {
    return <div className="card">Loading...</div>;
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
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
      />
      <RoutineTemplatesCard
        templates={templates}
        byTplId={byTplId}
        dateYMD={dateYMD}
        onSetMemoTarget={setMemoTarget}
        onOpenTrash={() => setIsTrashOpen(true)}
      />
      <MemoModal
        isOpen={!!memoTarget}
        targetTitle={memoTarget?.title ?? ""}
        initialText={memoTarget?.note ?? ""}
        isSaving={mUpdateTask.isPending || mNoteTemplate.isPending}
        onClose={() => setMemoTarget(null)}
        onSave={handleSaveMemo}
      />
      <TrashModal isOpen={isTrashOpen} onClose={() => setIsTrashOpen(false)} />
    </div>
  );
}

/**
 * 인증 상태 로딩을 처리하는 Wrapper 컴포넌트입니다.
 * isAuthLoading이 true이면 로딩 화면을, false이면 실제 컨텐츠를 렌더링합니다.
 */
export default function TodayCombined() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div className="card">Loading...</div>;
  }

  return <TodayCombinedContent isAuthenticated={isAuthenticated} />;
}

// --- Sub Components ---

const TodaySummaryCard = ({
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
}) => {
  const { total, done, pct } = useMemo(() => {
    const activeTemplates = templates.filter((t: Template) => t.defaultActive);
    const tplPairs = activeTemplates.map((tpl: Template) => ({
      tpl,
      row: byTplId[tpl.id],
    }));
    const totalCount = tplPairs.length + oneoffs.length;
    const doneCount =
      tplPairs.filter((p: any) => p.row?.checked === true).length +
      oneoffs.filter((t: Task) => t.checked === true).length;
    return {
      total: totalCount,
      done: doneCount,
      pct: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
    };
  }, [templates, oneoffs, byTplId]);

  return (
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
        {isAuthenticated && (
          <i style={{ width: `${pct}%`, ...getStyleForPercentage(pct) }} />
        )}
      </div>
      <div style={{ color: "var(--muted)", marginTop: 6 }}>
        {done} / {total} 완료
      </div>
    </div>
  );
};

const OneOffTasksCard = ({
  dateYMD,
  oneoffs,
  onSetMemoTarget,
}: {
  dateYMD: string;
  oneoffs: Task[];
  onSetMemoTarget: (target: MemoTarget) => void;
}) => {
  const qc = useQueryClient();
  const api = useApi();
  const { isAuthenticated } = useAuth();
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
            disabled={!isAuthenticated}
            onClick={() =>
              oneoffTitle.trim() &&
              isAuthenticated &&
              mAddOneoff.mutate({ title: oneoffTitle.trim(), dateYMD })
            }
          >
            오늘만 추가
          </button>
        </div>
      </div>
      <div className="section">
        <div className="list">
          {oneoffs.map((t: Task) => (
            <div key={t.id} className={`item ${t.checked ? "done" : ""}`}>
              <div className="col">
                <div className="title">{t.title}</div>
                {t.note && <div className="note">“{t.note}”</div>}
              </div>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
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
                  className={`btn btn-toggle-success ${
                    t.checked ? "" : "primary"
                  }`}
                  disabled={!isAuthenticated}
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
            <p style={{ textAlign: "center", color: "var(--muted)" }}>
              로그인하여 오늘의 할 일을 추가하고 관리하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const RoutineTemplatesCard = ({
  templates,
  byTplId,
  dateYMD,
  onSetMemoTarget,
  onOpenTrash,
}: {
  templates: Template[];
  byTplId: Record<string, Task>;
  dateYMD: string;
  onSetMemoTarget: (target: MemoTarget) => void;
  onOpenTrash: () => void;
}) => {
  const qc = useQueryClient();
  const api = useApi();
  const { isAuthenticated } = useAuth();
  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplGroup, setNewTplGroup] = useState<Group>("EXECUTE");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Find all open menus within the component
      const openMenus = document.querySelectorAll<HTMLDetailsElement>(
        ".routine-group .menu[open]"
      );

      openMenus.forEach((menu) => {
        // If the click happened outside of the current open menu, close it.
        if (!menu.contains(event.target as Node)) {
          menu.open = false;
        }
      });
    };

    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  useEffect(() => {
    const initialValues: Record<string, string> = {};
    templates.forEach((tpl) => {
      const today = byTplId[tpl.id];
      if (today) {
        initialValues[tpl.id] = today.value?.toString() ?? "";
      }
    });
    setInputValues(initialValues);
  }, [templates, byTplId]);
  const invalidateTemplates = () =>
    qc.invalidateQueries({ queryKey: ["templates"] });
  const invalidateToday = () =>
    qc.invalidateQueries({ queryKey: ["tasks", dateYMD] });

  const mCreateTpl = useMutation({
    mutationFn: (p: { title: string; group: Group }) => api.createTemplate(p),
    onSuccess: () => {
      setNewTplTitle("");
      invalidateTemplates();
    },
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

  const groupedTemplates = useMemo(() => {
    const groups: { [key in Group]?: Template[] } = {
      MORNING: [],
      EXECUTE: [],
      EVENING: [],
    };
    for (const tpl of templates) {
      if (groups[tpl.group]) groups[tpl.group]!.push(tpl);
    }
    return groups;
  }, [templates]);

  return (
    <div className="card">
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          고정 루틴
          <button
            className="btn-icon"
            onClick={onOpenTrash}
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
              if (e.key === "Enter" && newTplTitle.trim() && isAuthenticated)
                mCreateTpl.mutate({
                  title: newTplTitle.trim(),
                  group: newTplGroup,
                });
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
            disabled={!isAuthenticated}
            onClick={() =>
              newTplTitle.trim() &&
              isAuthenticated &&
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
        {(Object.keys(groupedTemplates) as Group[]).map((group) => {
          const groupTemplates = groupedTemplates[group];
          if (!groupTemplates || groupTemplates.length === 0) return null;
          return (
            <div key={group} className="routine-group">
              <h4 className="routine-group-title">{label(group)}</h4>
              <div className="list">
                {groupTemplates.map((tpl) => {
                  const today = byTplId[tpl.id];
                  const success = today?.checked === true;
                  return (
                    <div
                      key={tpl.id}
                      className={`item ${success ? "done" : ""}`}
                    >
                      <div className="col">
                        <div className="title">{tpl.title}</div>
                        {tpl.enableNote && today?.note && (
                          <div className="note">“{today.note}”</div>
                        )}
                      </div>
                      <div
                        className="row"
                        style={{ gap: 8, alignItems: "center" }}
                      >
                        {tpl.enableValue && (
                          <div className="value-input-wrapper">
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
                              disabled={!isAuthenticated}
                            />
                            <span className="value-input-unit">시간</span>
                          </div>
                        )}
                        <button
                          type="button"
                          className={`btn btn-toggle-success ${
                            success ? "" : "primary"
                          }`}
                          disabled={!isAuthenticated}
                          onClick={() => {
                            if (today)
                              mUpdateTask.mutate({
                                id: today.id,
                                data: { checked: !success },
                              });
                            else
                              mCheckTemplate.mutate({
                                templateId: tpl.id,
                                dateYMD,
                                checked: !success,
                              });
                          }}
                        >
                          {success ? "취소" : "오늘 성공"}
                        </button>
                        {tpl.enableNote && (
                          <button
                            type="button"
                            className="btn"
                            disabled={!isAuthenticated}
                            onClick={() =>
                              onSetMemoTarget({
                                kind: "template",
                                id: tpl.id,
                                title: tpl.title,
                                note: today?.note ?? null,
                              })
                            }
                          >
                            메모
                          </button>
                        )}
                        <details
                          className="menu"
                          {...(!isAuthenticated && {
                            onClick: (e) => e.preventDefault(),
                          })}
                        >
                          <summary className="btn" disabled={!isAuthenticated}>
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
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
