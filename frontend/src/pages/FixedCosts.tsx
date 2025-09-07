import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../api'; // Import useApi
import { FixedCost } from '../api/client'; // Keep type import

export function FixedCosts() {
  const api = useApi(); // Get the api client
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFixedCosts(); // Use api.getFixedCosts
      setCosts(data.sort((a, b) => a.paymentDate - b.paymentDate));
      const sum = data.reduce((acc, cost) => acc + cost.amount, 0);
      setTotal(sum);
    } catch (e: any) {
      setError('데이터를 불러오는 데 실패했습니다.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api]); // Add api to dependency array

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts, api]); // Add api to dependency array

  const handleSubmit = async (e: React.FormEvent) => {
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
      await api.addFixedCost({ name, amount: amountNum, paymentDate: dateNum }); // Use api.addFixedCost
      setName('');
      setAmount('');
      setPaymentDate('');
      await fetchCosts();
    } catch (e: any) {
      setError('항목 추가에 실패했습니다.');
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 이 항목을 삭제하시겠습니까?')) {
      try {
        await api.deleteFixedCost(id); // Use api.deleteFixedCost
        await fetchCosts();
      } catch (e: any) {
        setError('삭제에 실패했습니다.');
        console.error(e);
      }
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.h1}>월별 고정비</h1>
        <div style={styles.totalAmount}>
          총 합계: <strong>{total.toLocaleString()}원</strong>
        </div>
      </header>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.card}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="항목 (예: 월세)"
            required
          />
          <input
            style={styles.input}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="금액"
            required
          />
          <input
            style={styles.input}
            type="number"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            placeholder="결제일 (1-31)"
            min="1"
            max="31"
            required
          />
          <button type="submit" style={styles.addButton}>추가</button>
        </form>
      </div>

      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, textAlign: 'left'}}>항목</th>
                <th style={{...styles.th, textAlign: 'right'}}>금액</th>
                <th style={{...styles.th, textAlign: 'center'}}>결제일</th>
                <th style={{...styles.th, textAlign: 'center'}}>관리</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost, index) => (
                <tr key={cost.id} style={index % 2 === 0 ? styles.trEven : {}}>
                  <td style={styles.td}>{cost.name}</td>
                  <td style={{...styles.td, textAlign: 'right'}}>{cost.amount.toLocaleString()}원</td>
                  <td style={{...styles.td, textAlign: 'center'}}>매월 {cost.paymentDate}일</td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <button onClick={() => handleDelete(cost.id)} style={styles.deleteButton}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  h1: {
    fontSize: '2rem',
    color: 'var(--text-color, #E0E0E0)',
  },
  totalAmount: {
    fontSize: '1.5rem',
    color: 'var(--text-color, #E0E0E0)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '1rem',
  },
  addButton: {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    marginBottom: '15px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 15px',
    borderBottom: '2px solid #eee',
    color: '#666',
    fontWeight: '600',
  },
  td: {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#333',
  },
  trEven: {
    backgroundColor: '#f9f9f9',
  },
  deleteButton: {
    padding: '5px 10px',
    border: '1px solid #ff4d4d',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#ff4d4d',
    cursor: 'pointer',
  },
};