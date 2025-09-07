import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
export default function Today() {
    const qc = useQueryClient();
    const q = useQuery({
        queryKey: ["today"],
        queryFn: () => api("/api/daily/init"),
    });
    const toggle = useMutation({
        mutationFn: (p) => api(`/api/tasks/${p.id}`, {
            method: "PATCH",
            body: JSON.stringify({ checked: p.checked }),
        }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
    });
    const addOneOff = useMutation({
        mutationFn: (title) => api("/api/tasks", { method: "POST", body: JSON.stringify({ title }) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
    });
    if (q.isLoading)
        return _jsx("div", { children: "\uB85C\uB529..." });
    if (q.error)
        return _jsxs("div", { children: ["\uC5D0\uB7EC: ", q.error.message] });
    const { tasks, summary } = q.data;
    const ratio = summary
        ? Math.round((summary.doneWeight / Math.max(1, summary.totalWeight)) * 100)
        : 0;
    return (_jsxs("div", { children: [_jsxs("h2", { children: ["\uC624\uB298 \u00B7 ", ratio, "%"] }), _jsx("ul", { style: { listStyle: "none", padding: 0 }, children: tasks.map((t) => (_jsxs("li", { style: {
                        display: "flex",
                        alignItems: "center",
                        borderBottom: "1px solid #eee",
                        padding: "8px 0",
                    }, children: [_jsx("button", { onClick: () => toggle.mutate({ id: t.id, checked: !t.checked }), style: { marginRight: 8 }, children: t.checked ? "✅" : "⭕" }), _jsxs("div", { style: { flex: 1 }, onClick: () => {
                                const note = prompt(`정리(메모/수치) — ${t.title}`, t.note || "");
                                if (note !== null) {
                                    api(`/api/tasks/${t.id}`, {
                                        method: "PATCH",
                                        body: JSON.stringify({ note }),
                                    }).then(() => qc.invalidateQueries({ queryKey: ["today"] }));
                                }
                            }, children: [_jsx("div", { children: t.title }), t.note && _jsx("small", { style: { color: "#666" }, children: t.note })] })] }, t.id))) }), _jsx("div", { style: { marginTop: 12 }, children: _jsx("button", { onClick: () => {
                        const title = prompt("오늘만 항목 제목");
                        if (title)
                            addOneOff.mutate(title);
                    }, children: "+ \uC624\uB298\uB9CC \uD56D\uBAA9 \uCD94\uAC00" }) })] }));
}
