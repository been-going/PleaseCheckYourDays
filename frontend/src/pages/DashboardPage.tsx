import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { getStyleForPercentage } from "../utils/colorUtils";
import "./DashboardPage.css";

export default function DashboardPage() {
  const api = useApi();
  const { isAuthenticated } = useAuth();
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

  // ------------------- 여기를 수정했습니다! -------------------
  // 이전에는 여기서 보관된 루틴을 필터링했지만, 이제는 모든 루틴을 그대로 사용합니다.
  // const activeRoutineStats = useMemo(() => {
  //   return routineStats?.filter((stat) => !stat.isArchived) ?? [];
  // }, [routineStats]);
  // ---------------------------------------------------------

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
              className="btn"
              disabled={!isAuthenticated}
            >
              <option value="rate_desc">성공률 높은 순</option>
              <option value="rate_asc">성공률 낮은 순</option>
              <option value="date_desc">최신 생성 순</option>
              <option value="date_asc">오래된 순</option>
            </select>
          </div>
          {routineLoading && <p>로딩 중...</p>}
          {routineError && (
            <p className="error-message">
              루틴 통계 데이터를 불러오는 중 오류가 발생했습니다.
            </p>
          )}
          {!routineLoading && !routineError && (
            <>
              {!isAuthenticated ? (
                <div
                  style={{
                    padding: "2rem 0",
                    textAlign: "center",
                    color: "var(--muted)",
                  }}
                >
                  <p>로그인하여 루틴별 성공률 통계를 확인하세요.</p>
                  <p>
                    어떤 루틴을 잘 지키고 있는지, 어떤 루틴에 더 신경써야 할지
                    한눈에 파악할 수 있습니다.
                  </p>
                </div>
              ) : routineStats && routineStats.length > 0 ? (
                <ul
                  style={{
                    width: "100%",
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {/* activeRoutineStats 대신 routineStats를 직접 사용합니다. */}
                  {routineStats.map((routine) => (
                    <Link
                      to={`/routines/${routine.id}`}
                      key={routine.id}
                      className="routine-link"
                    >
                      {/* isArchived 상태에 따라 클래스를 추가합니다. */}
                      <li
                        className={`routine-item ${
                          routine.isArchived ? "archived" : ""
                        }`}
                      >
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
                            {/* 보관된 루틴임을 텍스트로도 표시합니다. */}
                            {routine.isArchived && " (보관됨)"}
                          </strong>
                          <span
                            className="routine-percentage"
                            style={getStyleForPercentage(routine.successRate)}
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
                  ))}
                </ul>
              ) : (
                <p>표시할 루틴이 없습니다.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
