import { useState, useEffect, FormEvent } from 'react';
import { getGoals, createGoal, updateGoal, deleteGoal, Goal } from '../api/client';
import './GoalsPage.css'; // Create a new CSS file for specific styles

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedGoals = await getGoals();
      setGoals(fetchedGoals);
    } catch (err) {
      setError('목표를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !targetDate) {
      setError('목표 제목과 목표일은 필수입니다.');
      return;
    }

    try {
      await createGoal({
        title,
        description,
        targetDate,
        startDate: new Date().toISOString(),
      });
      // Reset form and refetch
      setTitle('');
      setDescription('');
      setTargetDate('');
      setError(null);
      fetchGoals();
    } catch (err) {
      setError('목표 생성에 실패했습니다.');
      console.error(err);
    }
  };

  return (
    <div className="goals-page-container">
      <header className="page-header">
        <h1>목표 관리</h1>
        <p>장기적인 목표를 설정하고 진행 상황을 추적하세요.</p>
      </header>

      <div className="goal-form-card">
        <h2>새 목표 추가</h2>
        <form onSubmit={handleCreateGoal}>
          <div className="form-group">
            <input
              type="text"
              placeholder="예: 매일 30분씩 책 읽기"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>
          <textarea
            placeholder="상세 설명 (선택 사항)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit" className="btn-primary">목표 추가</button>
        </form>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="goals-list">
        {isLoading ? (
          <p>목표를 불러오는 중...</p>
        ) : goals.length > 0 ? (
          goals.map((goal) => (
            <div key={goal.id} className="goal-card">
              <div className="goal-card-header">
                <h3>{goal.title}</h3>
                <span>목표일: {new Date(goal.targetDate).toLocaleDateString()}</span>
              </div>
              {goal.description && <p className="goal-description">{goal.description}</p>}
              <div className="progress-container">
                <label>진행률: {goal.progress}%</label>
                <progress value={goal.progress} max="100"></progress>
              </div>
            </div>
          ))
        ) : (
          <p>아직 설정된 목표가 없습니다. 첫 목표를 추가해보세요!</p>
        )}
      </div>
    </div>
  );
}