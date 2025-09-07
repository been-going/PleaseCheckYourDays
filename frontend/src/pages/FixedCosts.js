import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { getFixedCosts, addFixedCost, deleteFixedCost } from '../api/client';

export function FixedCosts() {
    const [costs, setCosts] = useState([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState('');

    const fetchCosts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getFixedCosts();
            setCosts(data.sort((a, b) => a.paymentDate - b.paymentDate));
            const sum = data.reduce((acc, cost) => acc + cost.amount, 0);
            setTotal(sum);
        } catch (e) {
            setError('데이터를 불러오는 데 실패했습니다.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCosts();
    }, [fetchCosts]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amountNum = parseInt(amount, 10);
        const dateNum = parseInt(paymentDate, 10);
        if (!name.trim() || isNaN(amountNum) || amountNum <= 0 || isNaN(dateNum)) {
            setError('유효한 항목, 금액, 날짜를 입력하세요.');
            return;
        }
        if (dateNum < 1 || dateNum > 31) {
            setError('결제일은 1에서 31 사이의 숫자여야 합니다.');
            return;
        }
        try {
            await addFixedCost({ name, amount: amountNum, paymentDate: dateNum });
            setName('');
            setAmount('');
            setPaymentDate('');
            await fetchCosts();
        } catch (e) {
            setError('항목 추가에 실패했습니다.');
            console.error(e);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('정말로 이 항목을 삭제하시겠습니까?')) {
            try {
                await deleteFixedCost(id);
                await fetchCosts();
            } catch (e) {
                setError('삭제에 실패했습니다.');
                console.error(e);
            }
        }
    };

    return (_jsxs("div", { className: "grid", children: [
        _jsxs("div", { className: "row", style: { justifyContent: 'space-between' }, children: [
            _jsx("h1", { children: "월별 고정비" }),
            _jsxs("div", { style: { fontSize: '1.5rem' }, children: ["총 합계: ", _jsx("strong", { children: `${total.toLocaleString()}원` })] })
        ]}),
        
        error && _jsx("p", { style: { color: 'red' }, children: error }),
        
        _jsx("div", { className: "card", children: 
            _jsxs("form", { onSubmit: handleSubmit, className: "row", children: [
                _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "항목 (예: 월세)", required: true, style: { flex: 2 } }),
                _jsx("input", { type: "number", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "금액", required: true, style: { flex: 1 } }),
                _jsx("input", { type: "number", value: paymentDate, onChange: (e) => setPaymentDate(e.target.value), placeholder: "결제일 (1-31)", min: "1", max: "31", required: true, style: { flex: 1 } }),
                _jsx("button", { type: "submit", className: "btn primary", children: "추가" })
            ] })
        }),
        
        loading ? _jsx("p", { children: "로딩 중..." }) :
        _jsx("div", { className: "card", children: 
            _jsxs("table", { children: [
                _jsx("thead", { children: _jsxs("tr", { children: [
                    _jsx("th", { children: "항목" }),
                    _jsx("th", { style: { textAlign: 'right' }, children: "금액" }),
                    _jsx("th", { style: { textAlign: 'center' }, children: "결제일" }),
                    _jsx("th", { style: { textAlign: 'center' }, children: "관리" })
                ]}) }),
                _jsx("tbody", { children: costs.map((cost) => (
                    _jsxs("tr", {
                        children: [
                            _jsx("td", { children: cost.name }),
                            _jsxs("td", { style: { textAlign: 'right' }, children: [cost.amount.toLocaleString(), "원"] }),
                            _jsxs("td", { style: { textAlign: 'center' }, children: [cost.paymentDate, "일"] }),
                            _jsx("td", { style: { textAlign: 'center' }, children: 
                                _jsx("button", { className: "btn", onClick: () => handleDelete(cost.id), children: "삭제" })
                            })
                        ]
                    }, cost.id)
                )) })
            ] })
        })
    ]}));
}