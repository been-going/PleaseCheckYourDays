import { useState, useEffect } from "react";
import { useApi } from "../api"; // Import useApi
import { Link } from "react-router-dom";
import { RoutineStat } from "../api/client"; // Keep type import
import "./DashboardPage.css";

export default function DashboardPage() {
  const api = useApi(); // Get the api client
  const [routineStats, setRoutineStats] = useState<RoutineStat[] | null>(null);
  const [routineSortBy, setRoutineSortBy] = useState("rate_desc");
  const [routineLoading, setRoutineLoading] = useState(true);
  const [routineError, setRoutineError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutineStats = async () => {
      setRoutineLoading(true);
      setRoutineError(null);
      try {
        // Pass limit as undefined to get all routines
        const fetchedRoutineStats = await api.getRoutineStats(
          routineSortBy,
          undefined
        );
        setRoutineStats(fetchedRoutineStats);
      } catch (err) {
        setRoutineError("루틴 통계 데이터를 불러오는 중 오류가 발생했습니다.");
        console.error(err);
      } finally {
        setRoutineLoading(false);
      }
    };

    fetchRoutineStats();
  }, [routineSortBy, api]);

  return (
    <div className="dashboard-page-container">
      <header className="page-header">
        <h1>대시보드</h1>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>나의 루틴들</h3>
          <div
            style={{ width: "100%", marginBottom: "1rem", textAlign: "right" }}
          >
            <label htmlFor="routine-sort" style={{ marginRight: "8px" }}>
              정렬:
            </label>
            <select
              id="routine-sort"
              value={routineSortBy}
              onChange={(e) => setRoutineSortBy(e.target.value)}
              className="btn" // Use existing button style
            >
              <option value="rate_desc">성공률 높은 순</option>
              <option value="rate_asc">성공률 낮은 순</option>
              <option value="date_desc">최신 생성 순</option>
              <option value="date_asc">오래된 순</option>
            </select>
          </div>
          {routineLoading && <p>로딩 중...</p>}
          {routineError && <p className="error-message">{routineError}</p>}
          {routineStats && !routineLoading && (
            <ul
              style={{
                width: "100%",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {routineStats.length > 0 ? (
                routineStats.map((routine) => (
                  <Link
                    to={`/routines/${routine.id}`}
                    key={routine.id}
                    className="routine-link"
                  >
                    <li className="routine-item">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong
                          style={{
                            flex: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {routine.title}
                        </strong>
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "#0088FE",
                            marginLeft: "16px",
                          }}
                        >
                          {routine.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>
                        <span>
                          {routine.doneCount} / {routine.totalDays}일 성공
                        </span>
                        <span style={{ marginLeft: "10px", float: "right" }}>
                          시작:{" "}
                          {new Date(routine.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  </Link>
                ))
              ) : (
                <p>표시할 루틴이 없습니다.</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
