import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

type Template = {
  id: string;
  title: string;
  defaultActive: boolean;
  weight: number;
  order: number;
};

export default function Templates() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["templates"],
    queryFn: () => api<Template[]>("/api/templates"),
  });
  const add = useMutation({
    mutationFn: (title: string) =>
      api("/api/templates", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  if (list.isLoading) return <div>로딩...</div>;
  if (list.error) return <div>에러: {(list.error as Error).message}</div>;

  return (
    <div>
      <h3>고정 루틴</h3>
      <ul>
        {list.data!.map((t) => (
          <li key={t.id}>
            {t.title} {t.defaultActive ? "· 활성" : ""}
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          const title = prompt("루틴 제목");
          if (title) add.mutate(title);
        }}
      >
        + 추가
      </button>
      <p style={{ color: "#666", marginTop: 8 }}>
        ※ 순서/활성 토글, 가중치 수정 등은 다음 단계에서 이어서 구현.
      </p>
    </div>
  );
}
