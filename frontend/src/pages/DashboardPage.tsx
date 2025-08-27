import { useState, useEffect } from 'react';
import { getStats, StatsData } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './DashboardPage.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchStats();
  }, [date]);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const fetchedStats = await getStats(year, month);
      setStats(fetchedStats);
    } catch (err) {
      setError('통계 데이터를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  const taskCompletionData = stats ? [
    { name: '완료', value: stats.taskStats.completed },
    { name: '미완료', value: stats.taskStats.total - stats.taskStats.completed },
  ] : [];

  return (
    <div className="dashboard-page-container">
      <header className="page-header">
        <h1>월별 대시보드</h1>
        <div className="month-selector">
          <button onClick={handlePrevMonth}>&lt; 이전 달</button>
          <h2>{`${date.getFullYear()}년 ${date.getMonth() + 1}월`}</h2>
          <button onClick={handleNextMonth}>다음 달 &gt;</button>
        </div>
      </header>

      {isLoading && <p>데이터를 불러오는 중...</p>}
      {error && <p className="error-message">{error}</p>}

      {stats && !isLoading && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>태스크 완료율</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={taskCompletionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {taskCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p>{stats.taskStats.total}개 중 {stats.taskStats.completed}개 완료 ({stats.taskStats.completionRate.toFixed(1)}%)</p>
          </div>

          <div className="stat-card">
            <h3>카테고리별 태스크</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.categoryStats} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-card">
            <h3>고정비 총액</h3>
            <div className="fixed-cost-summary">
              <span>{stats.fixedCostStats.count}개 항목</span>
              <strong>{stats.fixedCostStats.total.toLocaleString()}원</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
