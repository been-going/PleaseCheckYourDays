import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

type DailyTask = {
  id: string;
  dateYMD: string;
  title: string;
  weight: number;
  isOneOff: boolean;
  checked: boolean;
  note?: string;
  value?: number;
};

type Summary = { dateYMD: string; totalWeight: number; doneWeight: number };

export default function Today() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["today"],
    queryFn: () =>
      api<{ dateYMD: string; tasks: DailyTask[]; summary: Summary }>(
        "/api/daily/init"
      ),
  });

  const toggle = useMutation({
    mutationFn: (p: { id: string; checked: boolean }) =>
      api(`/api/tasks/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ checked: p.checked }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
  });

  const addOneOff = useMutation({
    mutationFn: (title: string) =>
      api("/api/tasks", { method: "POST", body: JSON.stringify({ title }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
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
        {tasks.map((t) => (
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
                  api(`/api/tasks/${t.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ note }),
                  }).then(() => qc.invalidateQueries({ queryKey: ["today"] }));
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
