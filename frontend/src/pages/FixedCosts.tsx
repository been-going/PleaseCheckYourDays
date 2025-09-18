import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import { useAuth } from "../context/AuthContext";
import "./FixedCosts.css";

function FixedCostsContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const qc = useQueryClient();
  const api = useApi();

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: costs = [],
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: ["fixedCosts"],
    queryFn: api.getFixedCosts,
    enabled: isAuthenticated,
  });

  const { total, sortedCosts } = useMemo(() => {
    const sorted = [...costs].sort((a, b) => a.paymentDate - b.paymentDate);
    const sum = sorted.reduce((acc, cost) => acc + cost.amount, 0);
    return { total: sum, sortedCosts: sorted };
  }, [costs]);

  const mAddCost = useMutation({
    mutationFn: (newCost: {
      name: string;
      amount: number;
      paymentDate: number;
    }) => api.addFixedCost(newCost),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixedCosts"] });
      setName("");
      setAmount("");
      setPaymentDate("");
    },
    onError: () => setFormError("항목 추가에 실패했습니다."),
  });

  const mDeleteCost = useMutation({
    mutationFn: (id: string) => api.deleteFixedCost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixedCosts"] }),
    onError: () => setFormError("삭제에 실패했습니다."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseInt(amount, 10);
    const dateNum = parseInt(paymentDate, 10);

    if (!name.trim() || isNaN(amountNum) || amountNum <= 0 || isNaN(dateNum)) {
      setFormError("유효한 항목, 금액, 날짜를 입력하세요.");
      return;
    }
    if (dateNum < 1 || dateNum > 31) {
      setFormError("결제일은 1에서 31 사이의 숫자여야 합니다.");
      return;
    }

    if (!isAuthenticated) {
      setFormError("고정비를 추가하려면 로그인이 필요합니다.");
      return;
    }

    mAddCost.mutate({ name, amount: amountNum, paymentDate: dateNum });
  };

  const handleDelete = (id: string) => {
    setFormError(null);
    if (!isAuthenticated) {
      setFormError("고정비를 삭제하려면 로그인이 필요합니다.");
      return;
    }

    if (window.confirm("정말로 이 항목을 삭제하시겠습니까?")) {
      mDeleteCost.mutate(id);
    }
  };

  return (
    <div className="fixed-costs-container">
      <header className="page-header">
        <h1>월별 고정비</h1>
        <div className="total-amount">
          총 합계: <strong>{total.toLocaleString()}원</strong>
        </div>
      </header>

      {formError && <p className="error-message">{formError}</p>}
      {queryError && (
        <p className="error-message">데이터를 불러오는 데 실패했습니다.</p>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleSubmit} className="add-cost-form">
          <input
            type="text"
            value={name}
            disabled={!isAuthenticated}
            onChange={(e) => setName(e.target.value)}
            placeholder={isAuthenticated ? "항목 (예: 월세)" : "로그인 후 추가"}
            required
          />
          <input
            type="number"
            value={amount}
            disabled={!isAuthenticated}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="금액"
            required
          />
          <input
            type="number"
            value={paymentDate}
            disabled={!isAuthenticated}
            onChange={(e) => setPaymentDate(e.target.value)}
            placeholder="결제일 (1-31)"
            min="1"
            max="31"
            required
          />
          <button
            type="submit"
            className="btn primary"
            disabled={!isAuthenticated || mAddCost.isPending}
          >
            {mAddCost.isPending ? "추가 중..." : "추가"}
          </button>
        </form>
      </div>

      <div className="card">
        {isLoading && isAuthenticated ? (
          <p style={{ textAlign: "center", color: "var(--muted)" }}>
            로딩 중...
          </p>
        ) : !isAuthenticated ? (
          <p style={{ textAlign: "center", color: "var(--muted)" }}>
            로그인하여 고정비를 관리하세요.
          </p>
        ) : (
          <div className="costs-table-wrapper">
            {sortedCosts.length > 0 ? (
              <table className="costs-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th className="amount-cell">금액</th>
                    <th className="actions-cell">결제일</th>
                    <th className="actions-cell">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCosts.map((cost) => (
                    <tr key={cost.id}>
                      <td>{cost.name}</td>
                      <td className="amount-cell">
                        {cost.amount.toLocaleString()}원
                      </td>
                      <td className="actions-cell">
                        매월 {cost.paymentDate}일
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={() => handleDelete(cost.id)}
                          className="btn"
                          disabled={mDeleteCost.isPending}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: "center", color: "var(--muted)" }}>
                아직 추가된 고정비 항목이 없습니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function FixedCosts() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  return (
    <>
      {isAuthLoading ? (
        <div className="card" style={{ maxWidth: 800, margin: "2rem auto" }}>
          <p style={{ textAlign: "center" }}>Loading...</p>
        </div>
      ) : (
        <FixedCostsContent isAuthenticated={isAuthenticated} />
      )}
    </>
  );
}
