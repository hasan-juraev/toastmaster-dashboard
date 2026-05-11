import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "../components/ui/AppShell";
import { useAnalytics } from "../hooks/useAnalytics";

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  eyebrow?: string;
}

function StatCard({ icon, label, value, eyebrow }: StatCardProps) {
  return (
    <div className="app-panel rounded-[1.6rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[1.3rem]">{icon}</span>
        </div>
        {eyebrow ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            {eyebrow}
          </span>
        ) : null}
      </div>
      <div className="mt-6 text-[2rem] font-semibold leading-none text-app-text sm:text-[2.6rem]">
        {value}
      </div>
      <p className="mt-3 text-base text-app-text-muted">{label}</p>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm shadow-app-card">
      <p className="text-xs text-app-text-muted">{label}</p>
      <p className="font-semibold text-app-text">{payload[0].value} speeches</p>
    </div>
  );
}

function getActivityCells(
  speechCounts: number[],
  roleCounts: number[],
  totalRoles: number,
) {
  return Array.from({ length: 24 }, (_, index) => {
    const speech = speechCounts[index % Math.max(speechCounts.length, 1)] ?? 0;
    const role = roleCounts[index % Math.max(roleCounts.length, 1)] ?? 0;
    const normalized =
      totalRoles > 0
        ? Math.min(4, Math.round(((speech * 2 + role) / totalRoles) * 12))
        : Math.min(4, speech);

    return normalized;
  });
}

export default function Analytics() {
  const { data, isLoading } = useAnalytics();

  const totalRoleCount =
    data?.roleDistribution.reduce((sum, role) => sum + role.count, 0) ?? 0;
  const uniqueRoles = data?.roleDistribution.length ?? 0;
  const roleDiversity =
    totalRoleCount > 0 ? Math.min(Math.round((uniqueRoles / 4) * 100), 100) : 0;
  const progressWidth = totalRoleCount > 0 ? `${roleDiversity}%` : "0%";
  const speechCounts = data?.monthlySpeechData.map((point) => point.count) ?? [];
  const roleCounts = data?.roleDistribution.map((role) => role.count) ?? [];
  const activityCells = getActivityCells(speechCounts, roleCounts, totalRoleCount);
  const fillerTrend =
    data?.fillerWordAvg && data.fillerWordAvg <= 4 ? "Excellent control" : "Improving";

  return (
    <AppShell>
      <section className="space-y-6 pt-6 pb-6 md:space-y-8 md:pt-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="app-eyebrow">Analytics</p>
            <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-app-text sm:text-[2.4rem]">
              Progress Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-app-text-muted md:text-base">
              Track your speaking journey with a lighter, clearer dashboard for
              speeches, roles, and meeting momentum.
            </p>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-app-border bg-app-panel text-app-text-muted transition hover:border-primary/30 hover:text-primary"
            title="Filters coming soon"
          >
            <span className="material-symbols-outlined">tune</span>
          </button>
        </header>

        {isLoading ? (
          <div className="app-panel rounded-[1.6rem] px-5 py-14 text-center text-app-text-muted">
            Loading analytics...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[0.75fr_0.75fr_1.5fr]">
              <StatCard
                icon="mic"
                label="Total Speeches"
                value={data?.speechesDelivered ?? 0}
                eyebrow="+2"
              />
              <StatCard
                icon="groups"
                label="Total Roles"
                value={data?.totalRoles ?? 0}
                eyebrow="This Year"
              />
              <div className="app-panel rounded-[1.75rem] p-5 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[1.2rem]">
                        pie_chart
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-app-text">
                        Role Diversity
                      </p>
                      <p className="text-sm text-app-text-muted">
                        Based on assigned role categories
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">+5%</span>
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                  <div className="text-[2.5rem] font-semibold leading-none text-app-text sm:text-[3rem]">
                    {roleDiversity}%
                  </div>
                  <p className="text-sm text-app-text-muted sm:pb-1">
                    {totalRoleCount
                      ? `${uniqueRoles} active role groups`
                      : "No role data yet"}
                  </p>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-app-panel-soft">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: progressWidth }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
              <div className="app-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[1.8rem] font-semibold tracking-tight text-app-text">
                      Speech Progress
                    </h2>
                    <p className="text-sm text-app-text-muted">Last 6 months</p>
                  </div>
                  <button
                    type="button"
                    className="text-app-text-muted transition hover:text-primary"
                    title="More analytics options coming soon"
                  >
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>

                {data?.monthlySpeechData.every((point) => point.count === 0) ? (
                  <div className="flex h-56 items-center justify-center rounded-[1.25rem] bg-app-panel-soft text-sm text-app-text-muted">
                    No speech data yet
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data?.monthlySpeechData}
                        margin={{ top: 12, right: 8, left: -24, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient
                            id="analyticsSpeechGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.26} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="4 4"
                          stroke="rgba(148,163,184,0.22)"
                        />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#94a3b8" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#94a3b8" }}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={4}
                          fill="url(#analyticsSpeechGradient)"
                          dot={{
                            r: 4.5,
                            strokeWidth: 2,
                            stroke: "#ffffff",
                            fill: "#3b82f6",
                          }}
                          activeDot={{
                            r: 7,
                            strokeWidth: 3,
                            stroke: "#dbeafe",
                            fill: "#3b82f6",
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="app-panel rounded-[1.75rem] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[1.8rem] font-semibold tracking-tight text-app-text">
                    Speaking Quality
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      data?.fillerWordAvg
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-app-panel-soft text-app-text-muted"
                    }`}
                  >
                    {data?.fillerWordAvg ? fillerTrend : "No data"}
                  </span>
                </div>

                <div className="mt-6 rounded-[1.25rem] bg-app-panel-soft p-5">
                  <p className="text-sm text-app-text-muted">Filler Word Avg</p>
                  <div className="mt-3 text-[3rem] font-semibold leading-none text-app-text">
                    {data?.fillerWordAvg ? `${data.fillerWordAvg}` : "--"}
                  </div>
                  <p className="mt-2 text-sm text-app-text-muted">
                    Average filler words per speech from recorded Ah-Counter data.
                  </p>
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-app-border p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-app-text">Activity Snapshot</p>
                    <span className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                      Recent mix
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-6 gap-2">
                    {activityCells.map((level, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-md"
                        style={{
                          backgroundColor:
                            level === 0
                              ? "rgba(226,232,240,0.9)"
                              : `rgba(59,130,246,${0.16 + level * 0.16})`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-app-text-muted">
                    A compact view of recent speaking and role volume derived from
                    your available analytics data.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="app-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[1.8rem] font-semibold tracking-tight text-app-text">
                    Role Distribution
                  </h2>
                  <span className="text-sm text-app-text-muted">
                    {totalRoleCount} total
                  </span>
                </div>

                {!data?.roleDistribution.length || totalRoleCount === 0 ? (
                  <div className="flex h-56 items-center justify-center rounded-[1.25rem] bg-app-panel-soft text-sm text-app-text-muted">
                    No role data yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="mx-auto w-full max-w-[12rem] sm:mx-0">
                      <ResponsiveContainer width="100%" height={192}>
                        <PieChart>
                          <Pie
                            data={data.roleDistribution}
                            dataKey="count"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={72}
                            strokeWidth={0}
                            startAngle={90}
                            endAngle={-270}
                          >
                            {data.roleDistribution.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-3">
                      {data.roleDistribution.map((role) => {
                        const percent = Math.round((role.count / totalRoleCount) * 100);

                        return (
                          <div
                            key={role.name}
                            className="flex items-center justify-between gap-3 rounded-xl bg-app-panel-soft px-3 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: role.color }}
                              />
                              <span className="text-sm font-medium text-app-text">
                                {role.name}
                              </span>
                            </div>
                            <span className="text-sm text-app-text-muted">
                              {percent}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="app-panel rounded-[1.75rem] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="app-eyebrow">Summary</p>
                    <h2 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-app-text">
                      Club snapshot
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Speaking cadence</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.speechesDelivered ? "Consistent growth" : "Waiting on data"}
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      The line chart shows whether speaking opportunities are steady month to month.
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Role coverage</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {uniqueRoles} active categories
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      Track how evenly members rotate through core meeting responsibilities.
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Quality trend</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.fillerWordAvg ? `${data.fillerWordAvg} filler words avg` : "No Ah-Counter data"}
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      Use this with evaluator feedback to coach speakers over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
