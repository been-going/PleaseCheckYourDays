import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { DailyTask, DailySummary } from "../api/client";

type Summary = DailySummary;

export default function Today() {
  const qc = useQueryClient();
  const api = useApi();
  const q = useQuery({
    queryKey: ["today"],
    queryFn: api.initToday,
  });

  const toggle = useMutation({
    mutationFn: (p: { id: string; checked: boolean }) =>
      api.updateTask(p.id, { checked: p.checked }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
  });

  const addOneOff = useMutation({
    mutationFn: (title: string) =>
      api.addOneoff({ title, dateYMD: q.data!.dateYMD }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
  });

  const updateNote = useMutation({
    mutationFn: (p: { id: string; note: string }) =>
      api.updateTask(p.id, { note: p.note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["today"] });
    },
  });

  if (q.isLoading) return <div>로딩...</div>;
  if (q.error) return <div>에러: {(q.error as Error).message}</div>;

  const { tasks, summary } = q.data!;
  const ratio = summary
    ? Math.round((summary.doneWeight / Math.max(1, summary.totalWeight)) * 100)
    : 0;

  return (
    <div>
      <h2>오늘 · {ratio}%</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((t: DailyTask) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #eee",
              padding: "8px 0",
            }}
          >
            <button
              onClick={() => toggle.mutate({ id: t.id, checked: !t.checked })}
              style={{ marginRight: 8 }}
            >
              {t.checked ? "✅" : "⭕"}
            </button>
            <div
              style={{ flex: 1 }}
              onClick={() => {
                const note = prompt(
                  `정리(메모/수치) — ${t.title}`,
                  t.note || ""
                );
                if (note !== null) {
                  updateNote.mutate({ id: t.id, note });
                }
              }}
            >
              <div>{t.title}</div>
              {t.note && <small style={{ color: "#666" }}>{t.note}</small>}
            </div>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => {
            const title = prompt("오늘만 항목 제목");
            if (title) addOneOff.mutate(title);
          }}
        >
          + 오늘만 항목 추가
        </button>
      </div>
    </div>
  );
}
