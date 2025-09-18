import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { getStyleForPercentage } from "../utils/colorUtils";
import "./DashboardPage.css";

// The main component for the routine statistics list
function RoutineStatsList({ isAuthenticated }: { isAuthenticated: boolean }) {
  const api = useApi();
  const [routineSortBy, setRoutineSortBy] = useState("rate_desc");

  const {
    data: routineStats,
    isLoading: routineLoading,
    error: routineError,
  } = useQuery({
    queryKey: ["routineStats", routineSortBy],
    queryFn: () => api.getRoutineStats(routineSortBy, undefined),
    enabled: isAuthenticated,
  });

  const correctedRoutineStats = useMemo(() => {
    if (!routineStats) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return routineStats.map((routine) => {
      if (routine.isArchived) {
        return routine;
      }

      const createdAt = new Date(routine.createdAt);
      createdAt.setHours(0, 0, 0, 0);

      const timeDiff = today.getTime() - createdAt.getTime();
      const correctedTotalDays = Math.max(
        1,
        Math.floor(timeDiff / (1000 * 3600 * 24)) + 1
      );

      if (correctedTotalDays > routine.totalDays) {
        const correctedSuccessRate =
          (routine.doneCount / correctedTotalDays) * 100;
        return {
          ...routine,
          totalDays: correctedTotalDays,
          successRate: correctedSuccessRate,
        };
      }
      return routine;
    });
  }, [routineStats]);

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="placeholder-text">
          <p>로그인하여 루틴별 성공률 통계를 확인하세요.</p>
          <p>
            어떤 루틴을 잘 지키고 있는지, 어떤 루틴에 더 신경써야 할지 한눈에
            파악할 수 있습니다.
          </p>
        </div>
      );
    }

    if (routineLoading) {
      return <p className="placeholder-text">로딩 중...</p>;
    }

    if (routineError) {
      return (
        <p className="error-message">
          루틴 통계 데이터를 불러오는 중 오류가 발생했습니다.
        </p>
      );
    }

    if (correctedRoutineStats && correctedRoutineStats.length > 0) {
      return (
        <ul className="routine-list">
          {correctedRoutineStats.map((routine) => (
            <li key={routine.id}>
              <Link to={`/routines/${routine.id}`} className="routine-link">
                <div
                  className={`routine-item ${
                    routine.isArchived ? "archived" : ""
                  }`}
                >
                  <div className="routine-item-main">
                    <strong>
                      {routine.title}
                      {routine.isArchived && " (보관됨)"}
                    </strong>
                    <span
                      className="routine-percentage"
                      style={getStyleForPercentage(routine.successRate)}
                    >
                      {routine.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="routine-progress">
                    <div
                      className="routine-progress-bar"
                      style={{
                        width: `${routine.successRate}%`,
                        ...getStyleForPercentage(routine.successRate),
                      }}
                    />
                  </div>
                  <div className="routine-item-sub">
                    <span>
                      {routine.doneCount} / {routine.totalDays}일 성공
                    </span>
                    <span>
                      시작: {new Date(routine.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      );
    }

    return <p className="placeholder-text">표시할 루틴이 없습니다.</p>;
  };

  return (
    <div className="stat-card">
      <div className="routine-list-header">
        <h3>나의 루틴들</h3>
        <div className="sort-control">
          <label htmlFor="routine-sort">정렬:</label>
          <select
            id="routine-sort"
            value={routineSortBy}
            onChange={(e) => setRoutineSortBy(e.target.value)}
            className="btn"
            disabled={!isAuthenticated}
          >
            <option value="rate_desc">성공률 높은 순</option>
            <option value="rate_asc">성공률 낮은 순</option>
            <option value="date_desc">최신 생성 순</option>
            <option value="date_asc">오래된 순</option>
          </select>
        </div>
      </div>
      <div className="card-content">{renderContent()}</div>
    </div>
  );
}

function DashboardPageContent({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  return (
    <div className="stats-grid">
      <RoutineStatsList isAuthenticated={isAuthenticated} />
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  return (
    <div className="dashboard-page-container">
      <header className="page-header">
        <h1>대시보드</h1>
      </header>
      {isAuthLoading ? (
        <div className="card">
          <p style={{ textAlign: "center", color: "var(--muted)" }}>
            Loading Dashboard...
          </p>
        </div>
      ) : (
        <DashboardPageContent isAuthenticated={isAuthenticated} />
      )}
    </div>
  );
}
