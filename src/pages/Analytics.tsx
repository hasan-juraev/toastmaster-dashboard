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

export default function Analytics() {
  const { data, isLoading } = useAnalytics();

  const totalRoleCount =
    data?.roleDistribution.reduce((sum, role) => sum + role.count, 0) ?? 0;
  const uniqueRoles = data?.roleDistribution.length ?? 0;
  const roleDiversity =
    totalRoleCount > 0 ? Math.min(Math.round((uniqueRoles / 7) * 100), 100) : 0;
  const diversityWidth = totalRoleCount > 0 ? `${roleDiversity}%` : "0%";
  const completionWidth = data ? `${data.roleCompletionRate}%` : "0%";
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
              Track role completion, member rotation, and quality signals across
              the club from one dashboard.
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon="mic"
                label="Total Speeches"
                value={data?.speechesDelivered ?? 0}
                eyebrow={
                  data?.totalSpeechesPlanned
                    ? `${data.speakerCompletionRate}% complete`
                    : "Completed"
                }
              />
              <StatCard
                icon="groups"
                label="Total Roles"
                value={data?.totalRoles ?? 0}
                eyebrow="Tracked"
              />
              <StatCard
                icon="task_alt"
                label="Role Completion"
                value={`${data?.roleCompletionRate ?? 0}%`}
                eyebrow="Workflow"
              />
              <StatCard
                icon="spellcheck"
                label="Filler Word Avg"
                value={data?.fillerWordAvg ?? 0}
                eyebrow={fillerTrend}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
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
                  <div>
                    <h2 className="text-[1.8rem] font-semibold tracking-tight text-app-text">
                      Workflow Snapshot
                    </h2>
                    <p className="text-sm text-app-text-muted">
                      Coverage, completion, and role breadth.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    {data?.roleCompletionRate ?? 0}% complete
                  </span>
                </div>

                <div className="mt-6 rounded-[1.25rem] bg-app-panel-soft p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-app-text-muted">Completion rate</p>
                    <p className="text-sm font-semibold text-app-text">
                      {data?.roleStatusCounts.completed ?? 0} completed
                    </p>
                  </div>
                  <div className="mt-3 text-[3rem] font-semibold leading-none text-app-text">
                    {data?.roleCompletionRate ?? 0}%
                  </div>
                  <p className="mt-2 text-sm text-app-text-muted">
                    Measured from role workflow status updates on meeting assignments.
                  </p>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: completionWidth }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-app-border p-4">
                    <p className="text-sm text-app-text-muted">Assigned</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.roleStatusCounts.assigned ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-app-border p-4">
                    <p className="text-sm text-app-text-muted">In progress</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.roleStatusCounts.inProgress ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-app-border p-4">
                    <p className="text-sm text-app-text-muted">Skipped</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.roleStatusCounts.skipped ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-app-border p-4">
                    <p className="text-sm text-app-text-muted">Role diversity</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {roleDiversity}%
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-app-panel-soft">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: diversityWidth }}
                      />
                    </div>
                  </div>
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
                    <p className="app-eyebrow">Performance</p>
                    <h2 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-app-text">
                      Role analytics
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Ah-Counter</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.fillerWordAvg ?? 0} fillers avg
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      {data?.fillerReportsLogged ?? 0} reports logged across speakers
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Grammarian</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.grammarianStats.avgErrors ?? 0} errors avg
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      {data?.grammarianStats.notablePhrasesAvg ?? 0} notable phrases,
                      score {data?.grammarianStats.avgScore ?? 0}/10
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Speaker coverage</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.speakerCompletionRate ?? 0}% complete
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      {data?.speechesDelivered ?? 0} of {data?.totalSpeechesPlanned ?? 0} planned speeches delivered
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Evaluator</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.evaluatorStats.avgQuality ?? 0}/10 quality
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      {data?.evaluatorStats.reportsLogged ?? 0} evaluator reports logged
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Timer</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.timerStats.avgDelta ?? 0}s average drift
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      {data?.timerStats.onTimeRate ?? 0}% of logged timings finished within 15 seconds
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="text-sm text-app-text-muted">Facilitators</p>
                    <p className="mt-2 text-2xl font-semibold text-app-text">
                      {data?.facilitatorStats.avgScore ?? 0}/10 average score
                    </p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      Toastmaster {data?.facilitatorStats.toastmasterAvg ?? 0}/10,
                      General Evaluator {data?.facilitatorStats.generalEvaluatorAvg ?? 0}/10
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-panel rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="app-eyebrow">Members</p>
                  <h2 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-app-text">
                    Per-member role progress
                  </h2>
                </div>
              </div>

              {data?.memberRoleProgress.length ? (
                <div className="mt-5 grid gap-3">
                  {data.memberRoleProgress.map((member) => (
                    <article
                      key={member.memberName}
                      className="flex flex-col gap-3 rounded-[1.25rem] border border-app-border bg-app-panel-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-app-text">
                          {member.memberName}
                        </h3>
                        <p className="mt-1 text-sm text-app-text-muted">
                          Top role: {member.topRole}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:w-auto">
                        <div className="rounded-xl bg-white px-4 py-3 text-center">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                            Completed
                          </p>
                          <p className="mt-2 text-xl font-semibold text-app-text">
                            {member.rolesCompleted}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-4 py-3 text-center">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                            Role Types
                          </p>
                          <p className="mt-2 text-xl font-semibold text-app-text">
                            {member.distinctRoleCount}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.25rem] bg-app-panel-soft p-8 text-center text-sm text-app-text-muted">
                  No role progress data yet.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
