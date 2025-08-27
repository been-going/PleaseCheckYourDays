// TodayCombined.tsx  – 전체 교체 붙여넣기
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

type Group = "MORNING" | "EXECUTE" | "EVENING";
type Template = {
  id: string;
  title: string;
  group: Group;
  weight: number;
  defaultActive: boolean;
};
type Task = {
  id: string;
  title: string;
  dateYMD: string;
  templateId?: string | null;
  checked: boolean;
  note?: string | null;
  value?: number | null;
  weight: number;
  group?: Group;
  isOneOff?: boolean;
};

/** ✅ 로컬 타임존 기준 YYYY-MM-DD */
function localYMD(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TodayCombined() {
  const qc = useQueryClient();

  // ===== 글로벌 보기 옵션: 메모 보임/숨김 =====
  const [showNotes, setShowNotes] = useState(true);

  // ===== 메모 모달 상태 =====
  type MemoTarget =
    | { kind: "task"; id: string; title: string }
    | { kind: "template"; id: string; title: string };
  const [memoTarget, setMemoTarget] = useState<MemoTarget | null>(null);
  const [memoText, setMemoText] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

  // state
  const [dateYMD, setDateYMD] = useState<string>("");
  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplGroup, setNewTplGroup] = useState<Group>("EXECUTE");
  const [oneoffTitle, setOneoffTitle] = useState("");

  // 초기화(롤오버) - ✅ 로컬 날짜 사용
  useEffect(() => {
    api("/api/daily/init", { method: "POST" }).then(() =>
      setDateYMD(localYMD())
    );
  }, []);

  // queries
  const qTpl = useQuery({
    queryKey: ["templates"],
    queryFn: () => api<Template[]>("/api/templates"),
  });
  const qDay = useQuery({
    queryKey: ["tasks", dateYMD],
    enabled: !!dateYMD,
    queryFn: () =>
      api<{ dateYMD: string; tasks: Task[] }>(
        `/api/daily/tasks?date=${dateYMD}`
      ),
  });

  // 원오프 판별
  const isOneOffTask = (t: Task) =>
    t.isOneOff === true ||
    t.templateId == null ||
    (typeof t.templateId === "string" && t.templateId.trim() === "");

  // invalidate helper
  const invalidateToday = () =>
    qc.invalidateQueries({ queryKey: ["tasks", dateYMD] });

  // mutations
  const mToggleCheck = useMutation({
    mutationFn: (p: { id?: string; templateId?: string; checked: boolean }) =>
      p.id
        ? api(`/api/tasks/${encodeURIComponent(p.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checked: p.checked }),
          })
        : api("/api/daily/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dateYMD, // ✅ 로컬 YMD
              templateId: p.templateId,
              checked: p.checked,
            }),
          }),
    onSuccess: invalidateToday,
  });

  const mMemoTpl = useMutation({
    mutationFn: (p: { templateId: string; dateYMD: string; note: string }) =>
      api("/api/daily/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      }),
    onSuccess: invalidateToday,
  });

  const mMemoTask = useMutation({
    mutationFn: (p: { id: string; note: string }) =>
      api(`/api/tasks/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: p.note }),
      }),
    onSuccess: invalidateToday,
  });

  const mCreateTpl = useMutation({
    mutationFn: (p: { title: string; group: Group }) =>
      api("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      }),
    onSuccess: () => {
      setNewTplTitle("");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const mUpdateTpl = useMutation({
    mutationFn: (p: {
      id: string;
      title?: string;
      group?: Group;
      defaultActive?: boolean;
    }) =>
      api(`/api/templates/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  const mDeleteTpl = useMutation({
    mutationFn: (p: { id: string }) =>
      api(`/api/templates/${p.id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  const mAddOneoff = useMutation({
    mutationFn: (p: { title: string }) =>
      api("/api/daily/oneoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, dateYMD }), // ✅ 로컬 YMD
      }),
    onSuccess: () => {
      setOneoffTitle("");
      invalidateToday();
    },
  });

  // ───────── 데이터 가공 ─────────
  const templates = (qTpl.data ?? [])
    .slice()
    .sort((a, b) => sortKey(a) - sortKey(b));

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.defaultActive),
    [templates]
  );

  const allTasks = qDay.data?.tasks ?? [];
  const tasks = sortTasks(allTasks);

  const byTplId = useMemo(() => {
    const map: Record<string, Task> = {};
    for (const t of allTasks) {
      if (!isOneOffTask(t) && typeof t.templateId === "string") {
        const key = t.templateId.trim();
        if (key) map[key] = t;
      }
    }
    return map;
  }, [allTasks]);

  const oneoffs = useMemo(() => allTasks.filter(isOneOffTask), [allTasks]);

  // 진행 카운트/퍼센트(체크만 완료로 인정)
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

  const groups: Group[] = ["MORNING", "EXECUTE", "EVENING"];
  const isLoading = qTpl.isLoading || qDay.isLoading;

  // 색상/효과
  function colorForPct(p: number) {
    if (p < 33) return "#ef4444";
    if (p < 66) return "#f59e0b";
    return "#22c55e";
  }
  function glowForPct(p: number) {
    if (p < 33) return "0 0 .6rem rgba(239,68,68,.35)";
    if (p < 66) return "0 0 .6rem rgba(245,158,11,.35)";
    return "0 0 .6rem rgba(34,197,94,.45)";
  }
  function barStyleForPct(p: number): React.CSSProperties {
    if (p >= 100) {
      return {
        width: "100%",
        background:
          "linear-gradient(90deg,#16a34a 0%,#22c55e 40%,#84cc16 60%,#f59e0b 80%,#fbbf24 100%)",
        boxShadow:
          "0 0 .9rem rgba(34,197,94,.7), 0 0 1.6rem rgba(251,191,36,.6)",
        transition: "width .25s ease, background .25s ease, box-shadow .25s",
      };
    }
    return {
      width: `${p}%`,
      background: colorForPct(p),
      boxShadow: glowForPct(p),
      transition: "width .25s ease, background .25s ease, box-shadow .25s",
    };
  }
  function badgeStyleForPct(p: number): React.CSSProperties {
    if (p >= 100) {
      return {
        background:
          "linear-gradient(90deg,#22c55e 0%,#84cc16 60%,#f59e0b 100%)",
        color: "#0a0a0a",
        fontWeight: 700,
        border: "1px solid rgba(255,255,255,.25)",
        boxShadow:
          "0 0 .9rem rgba(34,197,94,.6), 0 0 1.1rem rgba(245,158,11,.55)",
      };
    }
    return {
      background: colorForPct(p),
      color: "#0b0f0a",
      fontWeight: 700,
    };
  }

  // 메모 열기
  function openMemoForTask(t: Task) {
    setMemoTarget({ kind: "task", id: t.id, title: t.title });
    setMemoText(t.note ?? "");
  }
  function openMemoForTemplate(tpl: Template) {
    const row = byTplId[tpl.id];
    setMemoTarget({ kind: "template", id: tpl.id, title: tpl.title });
    setMemoText(row?.note ?? "");
  }
  async function saveMemo() {
    if (!memoTarget) return;
    try {
      setSavingMemo(true);
      if (memoTarget.kind === "task") {
        await mMemoTask.mutateAsync({ id: memoTarget.id, note: memoText });
      } else {
        await mMemoTpl.mutateAsync({
          templateId: memoTarget.id,
          dateYMD,
          note: memoText,
        });
      }
      setMemoTarget(null);
    } finally {
      setSavingMemo(false);
    }
  }

  // ===== 모달 인라인 스타일 =====
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(10,12,16,.55)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };
  const modalStyle: React.CSSProperties = {
    width: "min(680px, 92vw)",
    background:
      "linear-gradient(180deg, rgba(17,24,39,.97), rgba(12,18,28,.97))",
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: 16,
    boxShadow:
      "0 18px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04) inset",
  };
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px 10px 16px",
    borderBottom: "1px solid rgba(255,255,255,.06)",
    color: "#e5e7eb",
    fontWeight: 700,
  };
  const bodyStyle: React.CSSProperties = { padding: "14px 16px" };
  const footerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px 14px 16px",
    gap: 8,
  };
  const closeBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: 0,
    cursor: "pointer",
    background: "rgba(255,255,255,.08)",
    color: "#e5e7eb",
  };
  const taStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 180,
    background: "rgba(255,255,255,.03)",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 12,
    padding: 12,
    outline: "none",
    resize: "vertical",
    fontSize: 15,
    lineHeight: 1.5,
  };
  const btn: React.CSSProperties = {
    border: 0,
    cursor: "pointer",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    background: "rgba(255,255,255,.08)",
    color: "#e5e7eb",
  };
  const btnPrimary: React.CSSProperties = {
    ...btn,
    background: "linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)",
    color: "#0a0a0a",
  };

  // 렌더
  return (
    <div className="grid" style={{ gap: 12 }}>
      {isLoading && <div className="card">불러오는 중…</div>}

      {!isLoading && (
        <>
          {/* 상단 요약 */}
          <div className="card">
            <div
              className="row"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <h3>오늘의 체크리스트</h3>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <div className="tag">{dateYMD}</div>
                <div className="tag" style={badgeStyleForPct(pct)}>
                  {pct}%
                </div>

                {/* ✅ 전역 보기 메뉴 (메모 표시/숨김) */}
                <details className="menu">
                  <summary className="btn">보기</summary>
                  <div className="menu-list" style={{ minWidth: 160 }}>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => setShowNotes((v) => !v)}
                    >
                      {showNotes ? "메모 숨기기" : "메모 표시"}
                    </button>
                  </div>
                </details>
              </div>
            </div>

            <div className="progress" aria-label="progress">
              <i style={barStyleForPct(pct)} />
            </div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              {done} / {total} 완료
            </div>
          </div>

          {/* 오늘 루틴(원오프) – 전역 '보기' 메뉴만 사용, 헤더 버튼 제거 */}
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
                      mAddOneoff.mutate({ title: oneoffTitle.trim() });
                    }
                  }}
                  style={{ minWidth: 200 }}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    oneoffTitle.trim() &&
                    mAddOneoff.mutate({ title: oneoffTitle.trim() })
                  }
                >
                  오늘만 추가
                </button>
              </div>
            </div>

            <div className="section">
              <div className="list">
                {oneoffs.length === 0 ? (
                  <div style={{ color: "var(--muted)" }}>
                    오늘만 추가한 항목이 없습니다.
                  </div>
                ) : (
                  oneoffs.map((t) => {
                    const success = t.checked === true;
                    return (
                      <div
                        key={t.id}
                        className={`item ${success ? "done" : ""}`}
                        style={
                          success
                            ? { background: "rgba(34,197,94,.12)" }
                            : undefined
                        }
                      >
                        <div className="col">
                          <div className="title">{t.title}</div>
                          {showNotes && t.note ? (
                            <div className="note">“{t.note}”</div>
                          ) : null}
                        </div>
                        <div className="row" style={{ gap: 8 }}>
                          <button
                            type="button"
                            className={`btn ${success ? "" : "primary"}`}
                            onClick={() =>
                              mToggleCheck.mutate({
                                id: t.id,
                                checked: !success,
                              })
                            }
                          >
                            {success ? "성공 취소" : "성공"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => openMemoForTask(t)}
                          >
                            메모
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={async () => {
                              if (
                                confirm(
                                  `'${t.title}' 오늘 루틴을 삭제할까요? (되돌릴 수 없음)`
                                )
                              ) {
                                await api(`/api/tasks/${t.id}`, {
                                  method: "DELETE",
                                });
                                invalidateToday();
                              }
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 고정 루틴 – 전역 '보기' 메뉴만 사용, 헤더 버튼 제거 */}
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
                  style={{ minWidth: 180 }}
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
              {groups.map((g) => {
                const glist = templates.filter((t) => t.group === g);
                if (glist.length === 0) return null;
                return (
                  <div key={g}>
                    <h4>{label(g)}</h4>
                    <div className="list">
                      {glist.map((tpl) => {
                        const today = byTplId[tpl.id];
                        const success = today?.checked === true;
                        const note = today?.note ?? "";
                        const active = tpl.defaultActive;

                        const itemStyle: React.CSSProperties = success
                          ? {
                              background: "rgba(34,197,94,.12)",
                              borderLeft: "3px solid var(--primary,#16a34a)",
                            }
                          : active
                          ? { borderLeft: "3px solid var(--primary,#16a34a)" }
                          : {
                              borderLeft: "3px solid var(--muted,#3f3f46)",
                              opacity: 0.75,
                            };

                        return (
                          <div key={tpl.id} className="item" style={itemStyle}>
                            <div className="col">
                              <div className="title">{tpl.title}</div>
                              {showNotes && note ? (
                                <div className="note">“{note}”</div>
                              ) : null}
                            </div>

                            <div className="row" style={{ gap: 8 }}>
                              <span
                                className={`tag ${success ? "success" : ""}`}
                              >
                                {success ? "오늘 성공" : "미완료"}
                              </span>

                              <button
                                type="button"
                                className={`btn ${success ? "" : "primary"}`}
                                onClick={() =>
                                  mToggleCheck.mutate({
                                    id: today?.id,
                                    templateId: tpl.id,
                                    checked: !success,
                                  })
                                }
                              >
                                {success ? "취소" : "오늘 성공"}
                              </button>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => openMemoForTemplate(tpl)}
                              >
                                메모
                              </button>

                              <details className="menu">
                                <summary className="btn" role="button">
                                  ⋯
                                </summary>
                                <div className="menu-list">
                                  <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                      const next = prompt("새 제목", tpl.title);
                                      if (next && next.trim()) {
                                        mUpdateTpl.mutate({
                                          id: tpl.id,
                                          title: next.trim(),
                                        });
                                      }
                                    }}
                                  >
                                    제목 수정
                                  </button>

                                  <div className="menu-sep" />
                                  <div className="menu-label">그룹 변경</div>
                                  <div className="menu-row">
                                    <button
                                      type="button"
                                      className="menu-item"
                                      onClick={() =>
                                        mUpdateTpl.mutate({
                                          id: tpl.id,
                                          group: "MORNING",
                                        })
                                      }
                                    >
                                      아침
                                    </button>
                                    <button
                                      type="button"
                                      className="menu-item"
                                      onClick={() =>
                                        mUpdateTpl.mutate({
                                          id: tpl.id,
                                          group: "EXECUTE",
                                        })
                                      }
                                    >
                                      실행
                                    </button>
                                    <button
                                      type="button"
                                      className="menu-item"
                                      onClick={() =>
                                        mUpdateTpl.mutate({
                                          id: tpl.id,
                                          group: "EVENING",
                                        })
                                      }
                                    >
                                      저녁
                                    </button>
                                  </div>

                                  <div className="menu-sep" />
                                  <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() =>
                                      mUpdateTpl.mutate({
                                        id: tpl.id,
                                        defaultActive: !tpl.defaultActive,
                                      })
                                    }
                                  >
                                    {tpl.defaultActive
                                      ? "오늘은 안할래"
                                      : "다시 할래"}
                                  </button>

                                  <div className="menu-sep" />
                                  <button
                                    type="button"
                                    className="menu-item"
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `'${tpl.title}' 템플릿을 삭제할까요? (되돌릴 수 없음)`
                                        )
                                      ) {
                                        await mDeleteTpl.mutateAsync({
                                          id: tpl.id,
                                        });
                                      }
                                    }}
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
                );
              })}
            </div>
          </div>

          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="kbd">오늘 성공: 고정 루틴에서 바로</div>
            <div className="kbd">메모: 각 항목 ‘메모’ 버튼</div>
            <div className="kbd">수정/삭제: ⋯ 메뉴</div>
          </div>

          {/* 모달 */}
          {memoTarget && (
            <div
              style={overlayStyle}
              role="dialog"
              aria-modal="true"
              onClick={() => !savingMemo && setMemoTarget(null)}
            >
              <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                  <span>{memoTarget.title} 메모 입력</span>
                  <button
                    style={closeBtn}
                    onClick={() => setMemoTarget(null)}
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                </div>

                <div style={bodyStyle}>
                  <textarea
                    style={taStyle}
                    autoFocus
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter")
                        saveMemo();
                      if (e.key === "Escape")
                        !savingMemo && setMemoTarget(null);
                    }}
                    placeholder="오늘 느낀 점, 기록하고 싶은 내용을 적어주세요…"
                  />
                </div>

                <div style={footerStyle}>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>
                    Ctrl/⌘ + Enter 저장 • Esc 닫기 • {memoText.length}자
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={btn}
                      disabled={savingMemo}
                      onClick={() => setMemoTarget(null)}
                    >
                      취소
                    </button>
                    <button
                      style={btnPrimary}
                      disabled={savingMemo}
                      onClick={saveMemo}
                    >
                      {savingMemo ? "저장 중…" : "저장"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
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
function sortTasks(list: Task[]) {
  return [...list].sort((a, b) => labelOrder(a) - labelOrder(b));
}
function labelOrder(t: Task) {
  const g = (t.group ?? "EXECUTE") as Group;
  const order = { MORNING: 0, EXECUTE: 1, EVENING: 2 } as const;
  return order[g];
}
