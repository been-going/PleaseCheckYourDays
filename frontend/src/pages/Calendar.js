import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDailyTasks, api } from "../api/client";
import './Calendar.css'; // Import the new CSS file

// --- Helper Functions ---
function ymd(d = new Date()) {
    const u = d.getTime() + d.getTimezoneOffset() * 60000;
    const k = new Date(u + 9 * 3600000);
    return `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, "0")}-${String(k.getDate()).padStart(2, "0")}`;
}
function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

// --- Components ---
const CalendarGrid = ({ focus, summaryMap, selectedDate, onDateClick }) => {
    const firstDay = firstOfMonth(focus).getDay();
    const daysInMonth = lastOfMonth(focus).getDate();

    const getCellColors = (pct) => {
        if (pct <= 0) return { background: "var(--card)", color: "var(--fg)" };
        if (pct < 33) return { background: "#ef4444", color: "#fff" };
        if (pct < 66) return { background: "#f59e0b", color: "#fff" };
        return { background: "#22c55e", color: "#fff" };
    };

    return _jsxs("div", { className: "card", children: [
        _jsxs("div", { className: "calendar-grid", children: [
            ["일", "월", "화", "수", "목", "금", "토"].map(day => _jsx("div", { className: "calendar-weekday", children: day }, day)),
            Array(firstDay).fill(null).map((_, i) => _jsx("div", { className: "calendar-day empty" }, `empty-${i}`)),
            Array.from({ length: daysInMonth }, (_, i) => {
                const dayDate = new Date(focus.getFullYear(), focus.getMonth(), i + 1);
                const dateKey = ymd(dayDate);
                const summary = summaryMap[dateKey];
                const ratio = summary ? summary.doneWeight / Math.max(1, summary.totalWeight) : 0;
                const pct = Math.round(ratio * 100);
                const colors = getCellColors(pct);
                const isSelected = selectedDate === dateKey;

                return _jsxs("div", {
                    onClick: () => onDateClick(dateKey),
                    className: `calendar-day ${isSelected ? 'selected' : ''}`,
                    style: colors,
                    children: [
                        _jsx("div", { className: "day-number", children: i + 1 }),
                        pct > 0 && _jsxs("div", { className: "day-percentage", children: [pct, "%"] })
                    ]
                }, dateKey);
            })
        ]})
    ]});
};

const DayDetails = ({ selectedDate, templates, mToggleCheck, onMemoClick }) => {
    const { data: dayTasks, isLoading, error } = useQuery({
        queryKey: ["tasks", selectedDate],
        queryFn: () => getDailyTasks(selectedDate),
        enabled: !!selectedDate,
    });

    const displayTasks = useMemo(() => {
        if (!dayTasks) return [];
        const activeTemplates = templates.filter((t) => t.defaultActive);
        const tasksByTplId = Object.fromEntries((dayTasks.tasks || []).filter((t) => t.templateId).map((t) => [t.templateId, t]));
        const oneOffs = (dayTasks.tasks || []).filter((t) => t.isOneOff);

        const templateTasks = activeTemplates.map((tpl) => {
            const task = tasksByTplId[tpl.id];
            return { id: task?.id, templateId: tpl.id, title: tpl.title, checked: task?.checked ?? false, note: task?.note ?? null, isOneOff: false };
        });
        const oneOffTasks = oneOffs.map((task) => ({ id: task.id, templateId: null, title: task.title, checked: task.checked, note: task.note, isOneOff: true }));
        return [...templateTasks, ...oneOffTasks];
    }, [templates, dayTasks]);

    if (!selectedDate) return null;

    return _jsxs("div", { className: "card day-details-container", children: [
        _jsx("h3", { className: "day-details-header", children: `${selectedDate} 루틴` }),
        isLoading && _jsx("p", { children: "로딩 중..." }),
        error && _jsx("p", { style: { color: 'red' }, children: "태스크를 불러오는 데 실패했습니다." }),
        !isLoading && !error && _jsx("div", { className: "list", children: displayTasks.map((task) => (
            _jsxs("div", { className: `item ${task.checked ? "done" : ""}`, children: [
                _jsxs("label", { className: "title", style: { display: 'flex', alignItems: 'center', gap: 12, cursor: "pointer" }, children: [
                    _jsx("input", { type: "checkbox", checked: task.checked, onChange: (e) => mToggleCheck.mutate({ id: task.id, templateId: task.templateId, checked: e.target.checked, dateYMD: selectedDate }) }),
                    _jsx("span", { children: task.title })
                ]}),
                _jsx("div", { className: "row", style: { gap: 8 }, children: 
                    _jsx("button", { className: "btn", onClick: () => onMemoClick(task), children: "메모" })
                })
            ]}, task.templateId || task.id)
        ))})
    ]});
};

const MemoModal = ({ memoTarget, onSave, onClose, isSaving }) => {
    const [memoText, setMemoText] = useState(memoTarget.note || "");

    useEffect(() => {
        setMemoText(memoTarget.note || "");
    }, [memoTarget]);

    const handleSave = () => {
        onSave(memoText);
    };

    return _jsx("div", { className: "modal-overlay", onClick: onClose, children: 
        _jsxs("div", { className: "modal-content", onClick: (e) => e.stopPropagation(), children: [
            _jsxs("div", { className: "modal-header", children: [
                _jsx("span", { children: `${memoTarget.title} 메모` }),
                _jsx("button", { className: "btn", onClick: onClose, "aria-label": "닫기", children: "×" })
            ]}),
            _jsx("div", { className: "modal-body", children: 
                _jsx("textarea", { 
                    autoFocus: true, 
                    value: memoText, 
                    onChange: (e) => setMemoText(e.target.value), 
                    placeholder: "오늘 느낀 점, 기록하고 싶은 내용을 적어주세요…",
                    onKeyDown: (e) => { 
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSave(); 
                        if (e.key === "Escape") onClose(); 
                    }
                })
            }),
            _jsxs("div", { className: "modal-footer", children: [
                _jsx("div", { className: "hotkey-hint", children: "Ctrl/⌘ + Enter 저장 • Esc 닫기" }),
                _jsxs("div", { style: { display: "flex", gap: 8 }, children: [
                    _jsx("button", { className: "btn", onClick: onClose, disabled: isSaving, children: "취소" }),
                    _jsx("button", { className: "btn primary", onClick: handleSave, disabled: isSaving, children: isSaving ? "저장 중..." : "저장" })
                ]})
            ]})
        ]})
    });
};

export default function Calendar() {
    const qc = useQueryClient();
    const [focus, setFocus] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [memoTarget, setMemoTarget] = useState(null);

    const from = ymd(firstOfMonth(focus));
    const to = ymd(lastOfMonth(focus));

    const { data: summaryData } = useQuery({ 
        queryKey: ["summaries", from, to], 
        queryFn: () => api(`/api/summaries?from=${from}&to=${to}`)
    });
    const summaryMap = useMemo(() => Object.fromEntries((summaryData || []).map((s) => [s.dateYMD, s])), [summaryData]);

    const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: () => api("/api/templates") });

    const mToggleCheck = useMutation({
        mutationFn: (p) => p.id
            ? api(`/api/tasks/${p.id}`, { method: "PATCH", body: JSON.stringify({ checked: p.checked }) })
            : api("/api/daily/check", { method: "POST", body: JSON.stringify({ dateYMD: p.dateYMD, templateId: p.templateId, checked: p.checked }) }),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["summaries"] });
            qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
        },
    });

    const mUpdateMemo = useMutation({
        mutationFn: (p) => p.taskId
            ? api(`/api/tasks/${p.taskId}`, { method: "PATCH", body: JSON.stringify({ note: p.note }) })
            : api("/api/daily/note", { method: "POST", body: JSON.stringify({ dateYMD: p.dateYMD, templateId: p.templateId, note: p.note }) }),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["tasks", variables.dateYMD] });
            setMemoTarget(null);
        },
    });

    const handleDateClick = (date) => {
        setSelectedDate(prev => prev === date ? null : date);
    };

    const handleSaveMemo = (memoText) => {
        if (!memoTarget) return;
        mUpdateMemo.mutate({
            dateYMD: selectedDate,
            taskId: memoTarget.isOneOff ? memoTarget.id : undefined,
            templateId: !memoTarget.isOneOff ? memoTarget.templateId : undefined,
            note: memoText,
        });
    };

    return _jsxs("div", { className: "grid", children: [
        _jsxs("div", { className: "calendar-header", children: [
            _jsx("button", { className: "btn", onClick: () => setFocus(new Date(focus.getFullYear(), focus.getMonth() - 1, 1)), children: "< 이전 달" }),
            _jsx("h2", { children: `${focus.getFullYear()}년 ${String(focus.getMonth() + 1).padStart(2, "0")}월` }),
            _jsx("button", { className: "btn", onClick: () => setFocus(new Date(focus.getFullYear(), focus.getMonth() + 1, 1)), children: "다음 달 >" })
        ]}),
        _jsx(CalendarGrid, { focus: focus, summaryMap: summaryMap, selectedDate: selectedDate, onDateClick: handleDateClick }),
        _jsx(DayDetails, { selectedDate: selectedDate, templates: templates, mToggleCheck: mToggleCheck, onMemoClick: setMemoTarget }),
        memoTarget && _jsx(MemoModal, { memoTarget: memoTarget, onSave: handleSaveMemo, onClose: () => setMemoTarget(null), isSaving: mUpdateMemo.isPending })
    ]});
}