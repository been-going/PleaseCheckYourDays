import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../api";
import { getStyleForPercentage } from "../utils/colorUtils";
import "./RoutineDetailPage.css";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

/**
 * Converts a Date object to a 'YYYY-MM-DD' string in the local timezone.
 * This prevents timezone conversion issues when matching dates.
 * @param d The date to format.
 * @returns The formatted date string.
 */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CompletionInfo = {
  level: number;
  note: string | null;
  value: number | null;
};

type TooltipData = {
  x: number;
  y: number;
  content: React.ReactNode;
} | null;

// --- Heatmap Component ---
const Heatmap = ({
  year,
  completionData,
  onCellHover,
}: {
  year: number;
  completionData: Map<string, CompletionInfo>;
  onCellHover: (data: TooltipData) => void;
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { days, monthLabels } = useMemo(() => {
    const dayList: Date[] = [];
    const date = new Date(year, 0, 1);
    while (date.getFullYear() === year) {
      dayList.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    const firstDayOfWeek = dayList[0].getDay();
    const paddedDays = [...Array(firstDayOfWeek).fill(null), ...dayList];

    const labels: { name: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    paddedDays.forEach((day, index) => {
      if (day) {
        const month = day.getMonth();
        if (month !== lastMonth) {
          labels.push({
            name: MONTHS[month],
            weekIndex: Math.floor(index / 7),
          });
          lastMonth = month;
        }
      }
    });

    return { days: paddedDays, monthLabels: labels };
  }, [year]);

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-container">
        <div className="heatmap-months">
          {monthLabels.map((label) => (
            <div
              key={label.name}
              style={{ transform: `translateX(${label.weekIndex * 19}px)` }}
            >
              {label.name}
            </div>
          ))}
        </div>
        <div className="heatmap-body">
          <div className="heatmap-weekdays">
            {WEEKDAYS.map((day, i) => (
              <div key={i}>{day}</div>
            ))}
          </div>
          <div className="heatmap-grid">
            {days.map((day, index) => {
              if (!day) {
                return (
                  <div key={`pad-${index}`} className="heatmap-cell empty" />
                );
              }
              // FIX: Use the local timezone-aware helper function
              const ymd = toYMD(day);
              const completionInfo = completionData.get(ymd);
              const level = completionInfo?.level || 0;
              const isFuture = day > today;

              const cellClass = isFuture ? "future" : `level-${level}`;

              return (
                <div
                  key={ymd}
                  className={`heatmap-cell ${cellClass}`}
                  onMouseEnter={(e) => {
                    let content;
                    if (isFuture) {
                      content = (
                        <div>
                          <strong>{ymd}</strong> (Future)
                        </div>
                      );
                    } else if (completionInfo) {
                      content = (
                        <>
                          <div>
                            <strong>{ymd}</strong>
                          </div>
                          <div>
                            Status:{" "}
                            <strong>
                              Completed (Level {completionInfo.level})
                            </strong>
                          </div>
                          {completionInfo.note && (
                            <div>
                              Note: <strong>{completionInfo.note}</strong>
                            </div>
                          )}
                          {completionInfo.value !== null && (
                            <div>
                              Value: <strong>{completionInfo.value}</strong>
                            </div>
                          )}
                        </>
                      );
                    } else {
                      content = (
                        <div>
                          <strong>{ymd}</strong> (Not Completed)
                        </div>
                      );
                    }
                    onCellHover({ x: e.clientX, y: e.clientY, content });
                  }}
                  onMouseLeave={() => onCellHover(null)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const Legend = ({
  currentFilter,
  onFilterChange,
}: {
  currentFilter: number | null;
  onFilterChange: (level: number | null) => void;
}) => {
  const levels = [0, 1, 2, 3];
  return (
    <div className="heatmap-legend">
      <span>Less</span>
      {levels.map((level) => (
        <div
          key={level}
          className={`heatmap-cell level-${level} ${
            currentFilter === level ? "active" : ""
          }`}
          title={`Filter by Level ${level}`}
          onClick={() => onFilterChange(currentFilter === level ? null : level)}
        />
      ))}
      <span>More</span>
    </div>
  );
};

// --- Main Page Component ---
export default function RoutineDetailPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const api = useApi();
  const [year, setYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [filterLevel, setFilterLevel] = useState<number | null>(null);

  const {
    data: routineDetail,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["routineDetail", routineId],
    queryFn: () => api.getRoutineDetail(routineId!),
    enabled: !!routineId,
  });

  const completionMap = useMemo(() => {
    const map = new Map<string, CompletionInfo>();
    if (routineDetail?.completionData) {
      for (const item of routineDetail.completionData) {
        map.set(item.date, {
          level: item.level,
          note: item.note,
          value: item.value,
        });
      }
    }
    return map;
  }, [routineDetail]);

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {(error as Error).message}</div>;
  if (!routineDetail) return <div>루틴 정보를 찾을 수 없습니다.</div>;

  const totalDays =
    Math.floor(
      (new Date().getTime() - new Date(routineDetail.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  const successRate = (completionMap.size / Math.max(1, totalDays)) * 100;

  return (
    <div className="dashboard-page-container">
      <header
        className="page-header"
        style={{
          alignItems: "baseline",
          gap: "1rem",
          justifyContent: "flex-start",
        }}
      >
        <Link to="/dashboard" className="btn">
          &larr; 뒤로가기
        </Link>
        <div>
          <h1>{routineDetail.title}</h1>
          <p style={{ margin: 0, color: "#aaa" }}>
            시작일: {new Date(routineDetail.createdAt).toLocaleDateString()} /
            성공률:{" "}
            <span
              className="routine-percentage"
              style={getStyleForPercentage(successRate)}
            >
              {successRate.toFixed(1)}%
            </span>{" "}
            ({completionMap.size}/{totalDays} 일)
          </p>
        </div>
      </header>

      <div className="stat-card" data-filter-level={filterLevel ?? ""}>
        <div className="month-selector">
          <button className="btn" onClick={() => setYear((y) => y - 1)}>
            &lt;
          </button>
          <h2>{year}년</h2>
          <button className="btn" onClick={() => setYear((y) => y + 1)}>
            &gt;
          </button>
        </div>
        <Heatmap
          year={year}
          completionData={completionMap}
          onCellHover={setTooltip}
        />
        <Legend currentFilter={filterLevel} onFilterChange={setFilterLevel} />
      </div>

      <div
        className="heatmap-tooltip"
        style={{
          opacity: tooltip ? 1 : 0,
          visibility: tooltip ? "visible" : "hidden",
          left: tooltip ? `${tooltip.x}px` : 0,
          top: tooltip ? `${tooltip.y}px` : 0,
          transform: tooltip
            ? "translate(-50%, -120%)"
            : "translate(-50%, -100%)",
        }}
      >
        {tooltip && (
          <div className="heatmap-tooltip-content">{tooltip.content}</div>
        )}
      </div>
    </div>
  );
}
