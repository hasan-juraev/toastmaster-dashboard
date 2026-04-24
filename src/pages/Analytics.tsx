import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAnalytics } from "../hooks/useAnalytics";

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  badge?: string;
  badgeDown?: boolean;
  fullWidth?: boolean;
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  badge,
  badgeDown,
  fullWidth,
}: StatCardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 ${
        fullWidth ? "col-span-2" : ""
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}
          >
            <span className={`material-symbols-outlined text-xl ${iconColor}`}>
              {icon}
            </span>
          </div>
          {fullWidth && (
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                {label}
              </p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          )}
        </div>
        {badge && (
          <span
            className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
              badgeDown
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-0.5">
              {badgeDown ? "arrow_downward" : "arrow_upward"}
            </span>
            {badge}
          </span>
        )}
      </div>
      {!fullWidth && (
        <>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mt-2">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </>
      )}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="text-slate-500 dark:text-slate-400 text-xs">{label}</p>
      <p className="font-bold text-primary">{payload[0].value} speeches</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Analytics() {
  const navigate = useNavigate();
  const { data, isLoading } = useAnalytics();
  const [roleYear, setRoleYear] = useState("This Year");

  const totalRoleCount =
    data?.roleDistribution.reduce((sum, r) => sum + r.count, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-white">
      {/* ── Header ── */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-slate-50/80 dark:bg-background-dark/80 backdrop-blur-md z-10 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mr-1"
            title="Go back"
          >
            <span className="material-symbols-outlined text-xl text-slate-600 dark:text-slate-300">
              arrow_back
            </span>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track your speaking journey
            </p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative shadow-sm">
          <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
            notifications
          </span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-100 dark:border-slate-800" />
        </button>
      </header>

      <main className="px-6 py-6 space-y-6 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-slate-400 dark:text-slate-500 text-sm animate-pulse">
              Loading analytics…
            </div>
          </div>
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon="mic"
                iconBg="bg-blue-100 dark:bg-blue-900/50"
                iconColor="text-blue-600 dark:text-blue-400"
                label="Speeches Delivered"
                value={data?.speechesDelivered ?? 0}
                badge="+12%"
              />
              <StatCard
                icon="people"
                iconBg="bg-purple-100 dark:bg-purple-900/50"
                iconColor="text-purple-600 dark:text-purple-400"
                label="Total Roles"
                value={data?.totalRoles ?? 0}
                badge="+8%"
              />
              <StatCard
                icon="record_voice_over"
                iconBg="bg-orange-100 dark:bg-orange-900/50"
                iconColor="text-orange-600 dark:text-orange-400"
                label="Filler Word Avg"
                value={
                  data?.fillerWordAvg
                    ? `${data.fillerWordAvg} / speech`
                    : "No data"
                }
                badge="-15%"
                badgeDown
                fullWidth
              />
            </div>

            {/* ── Speech Progress Chart ── */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold">Speech Progress</h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last 6 months
                </span>
              </div>

              {data?.monthlySpeechData.every((d) => d.count === 0) ? (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    No speech data yet
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={192}>
                  <AreaChart
                    data={data?.monthlySpeechData}
                    margin={{ top: 8, right: 4, left: -28, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="speechGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-700"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#speechGradient)"
                      dot={{
                        fill: "#fff",
                        stroke: "#3b82f6",
                        strokeWidth: 2,
                        r: 4,
                      }}
                      activeDot={{ r: 6, fill: "#3b82f6" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Role Distribution Chart ── */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold">Role Distribution</h2>
                <select
                  value={roleYear}
                  onChange={(e) => setRoleYear(e.target.value)}
                  className="bg-transparent text-sm text-slate-500 dark:text-slate-400 border-none outline-none cursor-pointer"
                >
                  <option>This Year</option>
                  <option>All Time</option>
                </select>
              </div>

              {!data?.roleDistribution.length || totalRoleCount === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    No role data yet
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Donut chart */}
                  <div className="relative flex-shrink-0">
                    <PieChart width={128} height={128}>
                      <Pie
                        data={data.roleDistribution}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        strokeWidth={0}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {data.roleDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold">
                        {totalRoleCount}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Roles
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-3 flex-1">
                    {data.roleDistribution.map((role) => {
                      const pct =
                        totalRoleCount > 0
                          ? Math.round((role.count / totalRoleCount) * 100)
                          : 0;
                      return (
                        <div
                          key={role.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: role.color }}
                            />
                            <span className="text-slate-600 dark:text-slate-300">
                              {role.name}
                            </span>
                          </div>
                          <span className="font-medium">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
