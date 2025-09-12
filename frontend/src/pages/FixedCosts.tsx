import React, { useState, useEffect, useCallback } from "react";
import { useApi } from "../api";
import { FixedCost } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./FixedCosts.css";

function FixedCostsContent() {
  const api = useApi();
  const { isAuthenticated } = useAuth();
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  const fetchCosts = useCallback(async () => {
    if (!isAuthenticated) {
      setCosts([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFixedCosts();
      setCosts(data.sort((a, b) => a.paymentDate - b.paymentDate));
      const sum = data.reduce((acc, cost) => acc + cost.amount, 0);
      setTotal(sum);
    } catch (e: any) {
      if ((e as any).response?.status !== 401) {
        setError("데이터를 불러오는 데 실패했습니다.");
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseInt(amount, 10);
    const dateNum = parseInt(paymentDate, 10);

    if (!name.trim() || isNaN(amountNum) || amountNum <= 0 || isNaN(dateNum)) {
      setError("유효한 항목, 금액, 날짜를 입력하세요.");
      return;
    }
    if (dateNum < 1 || dateNum > 31) {
      setError("결제일은 1에서 31 사이의 숫자여야 합니다.");
      return;
    }

    if (!isAuthenticated) {
      setError("고정비를 추가하려면 로그인이 필요합니다.");
      return;
    }

    try {
      await api.addFixedCost({ name, amount: amountNum, paymentDate: dateNum });
      setName("");
      setAmount("");
      setPaymentDate("");
      await fetchCosts();
    } catch (e: any) {
      setError("항목 추가에 실패했습니다.");
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    if (!isAuthenticated) {
      setError("고정비를 삭제하려면 로그인이 필요합니다.");
      return;
    }

    if (window.confirm("정말로 이 항목을 삭제하시겠습니까?")) {
      try {
        await api.deleteFixedCost(id);
        await fetchCosts();
      } catch (e: any) {
        setError("삭제에 실패했습니다.");
        console.error(e);
      }
    }
  };

  return (
    <>
      <header className="fixed-costs-header">
        <h1>월별 고정비</h1>
        <div className="total-amount">
          총 합계: <strong>{total.toLocaleString()}원</strong>
        </div>
      </header>

      {error && <p className="error-message">{error}</p>}

      <div className="card">
        <form onSubmit={handleSubmit} className="add-cost-form">
          <input
            className="btn"
            type="text"
            value={name}
            disabled={!isAuthenticated}
            onChange={(e) => setName(e.target.value)}
            placeholder={isAuthenticated ? "항목 (예: 월세)" : "로그인 후 추가"}
            required
          />
          <input
            className="btn"
            type="number"
            value={amount}
            disabled={!isAuthenticated}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="금액"
            required
          />
          <input
            className="btn"
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
            disabled={!isAuthenticated}
          >
            추가
          </button>
        </form>
      </div>

      {loading && isAuthenticated ? (
        <div className="card">
          <p style={{ textAlign: "center" }}>로딩 중...</p>
        </div>
      ) : !isAuthenticated ? (
        <div className="card">
          <p style={{ textAlign: "center", color: "#666" }}>
            로그인하여 고정비를 관리하세요.
          </p>
        </div>
      ) : (
        <div className="card costs-table-wrapper">
          {costs.length === 0 && !loading && (
            <p style={{ textAlign: "center", color: "#666" }}>
              아직 추가된 고정비 항목이 없습니다.
            </p>
          )}
          {costs.length > 0 && (
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
                {costs.map((cost) => (
                  <tr key={cost.id}>
                    <td>{cost.name}</td>
                    <td className="amount-cell">
                      {cost.amount.toLocaleString()}원
                    </td>
                    <td className="actions-cell">매월 {cost.paymentDate}일</td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleDelete(cost.id)}
                        className="btn"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

export function FixedCosts() {
  const { isAuthLoading } = useAuth();

  return (
    <div className="fixed-costs-container">
      {isAuthLoading ? (
        <div className="card">
          <p style={{ textAlign: "center" }}>Loading...</p>
        </div>
      ) : (
        <FixedCostsContent />
      )}
    </div>
  );
}
