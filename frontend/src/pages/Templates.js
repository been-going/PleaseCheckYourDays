import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
export default function Templates() {
    const qc = useQueryClient();
    const list = useQuery({
        queryKey: ["templates"],
        queryFn: () => api("/api/templates"),
    });
    const add = useMutation({
        mutationFn: (title) => api("/api/templates", {
            method: "POST",
            body: JSON.stringify({ title }),
        }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
    });
    if (list.isLoading)
        return _jsx("div", { children: "\uB85C\uB529..." });
    if (list.error)
        return _jsxs("div", { children: ["\uC5D0\uB7EC: ", list.error.message] });
    return (_jsxs("div", { children: [_jsx("h3", { children: "\uACE0\uC815 \uB8E8\uD2F4" }), _jsx("ul", { children: list.data.map((t) => (_jsxs("li", { children: [t.title, " ", t.defaultActive ? "· 활성" : ""] }, t.id))) }), _jsx("button", { onClick: () => {
                    const title = prompt("루틴 제목");
                    if (title)
                        add.mutate(title);
                }, children: "+ \uCD94\uAC00" }), _jsx("p", { style: { color: "#666", marginTop: 8 }, children: "\u203B \uC21C\uC11C/\uD65C\uC131 \uD1A0\uAE00, \uAC00\uC911\uCE58 \uC218\uC815 \uB4F1\uC740 \uB2E4\uC74C \uB2E8\uACC4\uC5D0\uC11C \uC774\uC5B4\uC11C \uAD6C\uD604." })] }));
}
