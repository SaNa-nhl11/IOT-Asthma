import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";

export interface SensorData {
  id?: number;
  temperature: number | string;
  humidity: number | string;
  co2: number | string;
  air_quality: number | string;
  timestamp: string;
  timeLabel?: string;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  unit: string;
  color: string;
  subtext?: string;
  icon?: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/readings/";

export default function App() {
  const [readings, setReadings] = useState<SensorData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  // Background fetch function (does not cause button flickering)
  const fetchReadings = useCallback(async (isManual = false) => {
    if (isManual) setManualLoading(true);
    try {
      const res = await axios.get<SensorData[]>(API_URL);
      if (Array.isArray(res.data)) {
        const formatted = res.data.map((item: SensorData) => {
          const date = item.timestamp ? new Date(item.timestamp) : new Date();
          const timeLabel = isNaN(date.getTime())
            ? "--:--"
            : date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
          return {
            ...item,
            temperature: Number(item.temperature),
            humidity: Number(item.humidity),
            co2: Number(item.co2),
            air_quality: Number(item.air_quality),
            timeLabel,
          };
        });
        setReadings(formatted);
        setLastFetched(new Date().toLocaleTimeString());
        setError(null);
      }
    } catch {
      setError(
        "Cannot reach Django backend at " +
          API_URL +
          ". Ensure 'python manage.py runserver 0.0.0.0:8000' is running."
      );
    } finally {
      if (isManual) setManualLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadings(false);
    const interval = setInterval(() => fetchReadings(false), 3000); // 3-second live poll
    return () => clearInterval(interval);
  }, [fetchReadings]);

  const latest = useMemo(() => {
    return readings.length > 0
      ? readings[readings.length - 1]
      : { temperature: "--", humidity: "--", co2: "--", air_quality: "--" };
  }, [readings]);

  const formatNumber = (val: number | string, decimals = 1): string => {
    const num = Number(val);
    if (!isNaN(num)) {
      return Number.isInteger(num) ? num.toString() : num.toFixed(decimals);
    }
    return String(val);
  };

  // Asthma health risk evaluation
  const asthmaAlert = useMemo(() => {
    if (readings.length === 0) return null;
    const co2Val = Number(latest.co2);
    const aqiVal = Number(latest.air_quality);

    if ((!isNaN(co2Val) && co2Val >= 1000) || (!isNaN(aqiVal) && aqiVal >= 100)) {
      return {
        title: "⚠️ Asthma Trigger Warning: Hazardous Air Quality Detected",
        desc: `High air pollution levels detected (CO₂: ${latest.co2} ppm, AQI: ${latest.air_quality}). Open windows for fresh ventilation and keep emergency inhalers ready.`,
        bg: "#fef2f2",
        color: "#991b1b",
        border: "#f87171",
      };
    }
    if ((!isNaN(co2Val) && co2Val >= 800) || (!isNaN(aqiVal) && aqiVal >= 50)) {
      return {
        title: "🟡 Caution: Moderate Environmental Condition",
        desc: "Air quality is slightly degraded. Individuals with sensitive asthma may experience mild respiratory discomfort.",
        bg: "#fffbeb",
        color: "#92400e",
        border: "#fcd34d",
      };
    }
    return {
      title: "🟢 Optimal Environment: Safe for Asthma Patients",
      desc: "All monitored indoor environmental metrics are within healthy, safe breathing thresholds.",
      bg: "#f0fdf4",
      color: "#166534",
      border: "#86efac",
    };
  }, [readings, latest]);

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Asthma Air & Environment Monitor</h1>
          <p style={styles.subtitle}>
            Real-time Wokwi ESP32 IoT Telemetry Station & Asthma Early-Warning System
          </p>
        </div>

        <div style={styles.headerRight}>
          <span
            style={{
              ...styles.badge,
              backgroundColor: readings.length > 0 ? "#ecfdf5" : "#f1f5f9",
              color: readings.length > 0 ? "#059669" : "#64748b",
              border: `1px solid ${readings.length > 0 ? "#a7f3d0" : "#cbd5e1"}`,
            }}
          >
            {readings.length > 0
              ? `● Live Telemetry (${readings.length} readings)`
              : "○ Waiting for Wokwi..."}
          </span>
          <button
            onClick={() => fetchReadings(true)}
            style={styles.refreshBtn}
            disabled={manualLoading}
          >
            {manualLoading ? "Updating..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Asthma Alert Status Banner */}
      {asthmaAlert && (
        <div
          style={{
            ...styles.alertBanner,
            backgroundColor: asthmaAlert.bg,
            color: asthmaAlert.color,
            borderColor: asthmaAlert.border,
          }}
        >
          <strong>{asthmaAlert.title}</strong>
          <div style={{ marginTop: "4px", fontSize: "14px" }}>
            {asthmaAlert.desc}
          </div>
        </div>
      )}

      {/* 4 Key Sensor Cards */}
      <div style={styles.grid}>
        <MetricCard
          title="Temperature"
          value={formatNumber(latest.temperature)}
          unit="°C"
          color="#f97316"
          subtext="Healthy comfort: 18 - 24 °C"
          icon="🌡️"
        />
        <MetricCard
          title="Humidity"
          value={formatNumber(latest.humidity)}
          unit="%"
          color="#0ea5e9"
          subtext="Optimal range: 30 - 60 %"
          icon="💧"
        />
        <MetricCard
          title="CO₂ Concentration"
          value={formatNumber(latest.co2, 0)}
          unit="ppm"
          color="#8b5cf6"
          subtext="Asthma threshold: < 1000 ppm"
          icon="🫁"
        />
        <MetricCard
          title="Air Quality (AQI)"
          value={formatNumber(latest.air_quality, 0)}
          unit="AQI"
          color="#10b981"
          subtext="Target: < 50 Good"
          icon="🍃"
        />
      </div>

      {readings.length === 0 ? (
        <div style={styles.emptyState}>
          <h3 style={{ margin: "0 0 10px 0" }}>📡 Waiting for First Telemetry Packet</h3>
          <p style={{ margin: 0 }}>
            Click <strong>Play</strong> in your Wokwi simulation to begin transmitting data.
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "10px" }}>
            Endpoint: <code>{API_URL}</code> | Secret Key: <code>ASTHMA_SECRET_KEY_123</code>
          </p>
        </div>
      ) : (
        <>
          {/* Chart 1: CO2 & Air Quality Trend */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h3 style={styles.chartTitle}>CO₂ (ppm) & Air Quality Index</h3>
                <span style={styles.chartSub}>Last reading at: {lastFetched}</span>
              </div>
              <div style={styles.legend}>
                <span style={{ color: "#8b5cf6" }}>● CO₂ (ppm)</span>
                <span style={{ color: "#10b981", marginLeft: "14px" }}>● Air Quality (AQI)</span>
              </div>
            </div>

            <NativeSvgChart
              data={readings}
              lines={[
                { key: "co2", color: "#8b5cf6", name: "CO2 (ppm)" },
                { key: "air_quality", color: "#10b981", name: "Air Quality (AQI)" },
              ]}
              height={220}
            />
          </div>

          {/* Chart 2: Temperature & Humidity Trend */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h3 style={styles.chartTitle}>Temperature (°C) & Humidity (%)</h3>
                <span style={styles.chartSub}>Last reading at: {lastFetched}</span>
              </div>
              <div style={styles.legend}>
                <span style={{ color: "#f97316" }}>● Temperature (°C)</span>
                <span style={{ color: "#0ea5e9", marginLeft: "14px" }}>● Humidity (%)</span>
              </div>
            </div>

            <NativeSvgChart
              data={readings}
              lines={[
                { key: "temperature", color: "#f97316", name: "Temperature (°C)" },
                { key: "humidity", color: "#0ea5e9", name: "Humidity (%)" },
              ]}
              height={220}
            />
          </div>

          {/* Live Incoming Feed Table */}
          <div style={styles.chartCard}>
            <h3 style={{ ...styles.chartTitle, marginBottom: "12px" }}>
              📋 Recent Incoming Telemetry Packets
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Packet ID</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Temperature</th>
                    <th style={styles.th}>Humidity</th>
                    <th style={styles.th}>CO₂ Level</th>
                    <th style={styles.th}>Air Quality</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(-6).reverse().map((r, idx) => (
                    <tr key={r.id || idx} style={styles.tr}>
                      <td style={styles.td}>#{r.id || idx + 1}</td>
                      <td style={styles.td}>{r.timeLabel}</td>
                      <td style={styles.td}>{r.temperature}°C</td>
                      <td style={styles.td}>{r.humidity}%</td>
                      <td style={styles.td}>
                        <strong style={{ color: Number(r.co2) > 1000 ? "#ef4444" : "#1e293b" }}>
                          {r.co2} ppm
                        </strong>
                      </td>
                      <td style={styles.td}>
                        <strong style={{ color: Number(r.air_quality) > 100 ? "#ef4444" : "#1e293b" }}>
                          {r.air_quality} AQI
                        </strong>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.tableBadge,
                            backgroundColor:
                              Number(r.co2) > 1000 || Number(r.air_quality) > 100
                                ? "#fee2e2"
                                : "#dcfce7",
                            color:
                              Number(r.co2) > 1000 || Number(r.air_quality) > 100
                                ? "#b91c1c"
                                : "#15803d",
                          }}
                        >
                          {Number(r.co2) > 1000 || Number(r.air_quality) > 100
                            ? "Hazardous"
                            : "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Native Responsive SVG Chart Component
// (Guaranteed 100% immune to React 19 / Recharts react-is conflicts)
// -----------------------------------------------------------------------------
interface ChartLineConfig {
  key: keyof SensorData;
  color: string;
  name: string;
}

interface NativeSvgChartProps {
  data: SensorData[];
  lines: ChartLineConfig[];
  height?: number;
}

function NativeSvgChart({ data, lines, height = 220 }: NativeSvgChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const width = 800;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Calculate global min and max for this chart's lines
  let minVal = Infinity;
  let maxVal = -Infinity;

  lines.forEach((line) => {
    data.forEach((d) => {
      const val = Number(d[line.key]);
      if (!isNaN(val)) {
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    });
  });

  if (minVal === Infinity || maxVal === -Infinity) {
    minVal = 0;
    maxVal = 100;
  }

  // Add 10% breathing room to chart bounds
  const span = maxVal - minVal || 1;
  const yMin = Math.max(0, Math.floor(minVal - span * 0.08));
  const yMax = Math.ceil(maxVal + span * 0.12);
  const yRange = yMax - yMin || 1;

  const getX = (idx: number) => {
    return padLeft + (idx / Math.max(1, data.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    return padTop + plotH - ((val - yMin) / yRange) * plotH;
  };

  // Generate SVG path for a line
  const createPath = (key: keyof SensorData) => {
    return data
      .map((d, i) => {
        const val = Number(d[key]) || 0;
        const x = getX(i);
        const y = getY(val);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  // 4 Y-axis horizontal gridlines
  const gridRows = [0, 0.33, 0.66, 1].map((pct) => {
    const val = Math.round(yMin + pct * yRange);
    const y = padTop + plotH - pct * plotH;
    return { val, y };
  });

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Horizontal Gridlines & Y-Axis Labels */}
        {gridRows.map((row, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={row.y}
              x2={width - padRight}
              y2={row.y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={padLeft - 8}
              y={row.y + 4}
              fontSize="11"
              fill="#94a3b8"
              textAnchor="end"
            >
              {row.val}
            </text>
          </g>
        ))}

        {/* X-Axis Timestamps (up to 6 evenly spaced labels) */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 5));
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = getX(i);
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              fontSize="11"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {d.timeLabel}
            </text>
          );
        })}

        {/* Plot Lines & Points */}
        {lines.map((line) => {
          const pathD = createPath(line.key);
          return (
            <g key={String(line.key)}>
              <path
                d={pathD}
                fill="none"
                stroke={line.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {data.map((d, i) => {
                const val = Number(d[line.key]) || 0;
                return (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(val)}
                    r={hoveredIndex === i ? 5 : 3}
                    fill={line.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          );
        })}

        {/* Transparent Columns for Interactive Hover */}
        {data.map((_, i) => {
          const x = getX(i);
          const colW = plotW / Math.max(1, data.length);
          return (
            <rect
              key={i}
              x={x - colW / 2}
              y={padTop}
              width={colW}
              height={plotH}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredIndex(i)}
            />
          );
        })}

        {/* Vertical Hover Guideline */}
        {hoveredIndex !== null && (
          <line
            x1={getX(hoveredIndex)}
            y1={padTop}
            x2={getX(hoveredIndex)}
            y2={padTop + plotH}
            stroke="#94a3b8"
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          style={{
            position: "absolute",
            left: `${(getX(hoveredIndex) / width) * 100}%`,
            top: "10px",
            transform: "translateX(-50%)",
            background: "#0f172a",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "3px" }}>
            {data[hoveredIndex].timeLabel}
          </div>
          {lines.map((l) => (
            <div key={String(l.key)}>
              <span style={{ color: l.color }}>● {l.name}:</span>{" "}
              <strong>{data[hoveredIndex][l.key]}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, unit, color, subtext, icon }: MetricCardProps) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>{title}</span>
        {icon && <span style={{ fontSize: "18px" }}>{icon}</span>}
      </div>
      <div style={styles.cardValue}>
        {value} <span style={styles.cardUnit}>{unit}</span>
      </div>
      {subtext && <div style={styles.cardSubtext}>{subtext}</div>}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1050px",
    margin: "0 auto",
    padding: "32px 24px",
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap" as const,
    gap: "16px",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  badge: {
    padding: "6px 14px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "600",
  },
  refreshBtn: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
  errorBanner: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #fca5a5",
    fontSize: "14px",
  },
  alertBanner: {
    padding: "16px 20px",
    borderRadius: "8px",
    marginBottom: "24px",
    border: "1px solid transparent",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "28px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  cardTitle: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "600",
  },
  cardValue: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#0f172a",
  },
  cardUnit: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#64748b",
  },
  cardSubtext: {
    marginTop: "8px",
    fontSize: "12px",
    color: "#94a3b8",
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  chartTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
  },
  chartSub: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  legend: {
    fontSize: "13px",
    fontWeight: "500",
  },
  emptyState: {
    backgroundColor: "#ffffff",
    border: "2px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "48px 24px",
    textAlign: "center" as const,
    color: "#475569",
    marginTop: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  },
  thRow: {
    borderBottom: "2px solid #e2e8f0",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left" as const,
    color: "#64748b",
    fontWeight: "600",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "10px 14px",
    color: "#334155",
  },
  tableBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "600",
  },
};
