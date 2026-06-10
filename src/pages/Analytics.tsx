import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "../components/ui/AppShell";
import { useMyAnalytics } from "../hooks/useMyAnalytics";
import { useProfile } from "../hooks/useProfile";
import type {
  AhCounterPoint,
  GrammarianPoint,
  TimerPoint,
} from "../hooks/useMyAnalytics";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDelta(seconds: number): string {
  const sign = seconds >= 0 ? "+" : "-";
  const abs = Math.abs(seconds);
  if (abs >= 60) {
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${sign}${m}m${s > 0 ? ` ${s}s` : ""}`;
  }
  return `${sign}${abs}s`;
}

function fmtSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ─── Stat card (top summary) ─────────────────────────────────────────────────

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

// ─── Stat chips inside chart sections ────────────────────────────────────────

function StatChip({
  label,
  value,
  accent = "bg-slate-100 text-slate-600",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${accent}`}
    >
      {label}:&nbsp;<strong>{value}</strong>
    </span>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-52 items-center justify-center rounded-[1.25rem] bg-app-panel-soft text-sm text-app-text-muted">
      {message}
    </div>
  );
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────

function SpeechTooltip({
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
    <div className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm shadow-app-card">
      <p className="text-xs text-app-text-muted">{label}</p>
      <p className="font-semibold text-app-text">
        {payload[0].value} speech{payload[0].value !== 1 ? "es" : ""}
      </p>
    </div>
  );
}

function GrammarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: GrammarianPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="min-w-[160px] rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm shadow-app-card">
      <p className="font-semibold text-app-text">{d.label}</p>
      <div className="mt-1.5 space-y-1">
        <p className="flex justify-between gap-4 text-app-text-muted">
          Errors
          <span className="font-medium text-orange-500">{d.grammarErrors}</span>
        </p>
        {d.score != null && (
          <p className="flex justify-between gap-4 text-app-text-muted">
            Score
            <span className="font-medium text-emerald-600">{d.score}/10</span>
          </p>
        )}
        <p className="flex justify-between gap-4 text-app-text-muted">
          Notable phrases
          <span className="font-medium text-app-text">{d.notablePhrases}</span>
        </p>
      </div>
    </div>
  );
}

function AhCounterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AhCounterPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const status =
    d.ahCount <= 2
      ? { text: "Excellent control", color: "text-emerald-600" }
      : d.ahCount <= 5
        ? { text: "Good – room to improve", color: "text-amber-600" }
        : { text: "High – focus on reduction", color: "text-red-600" };
  return (
    <div className="min-w-[160px] rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm shadow-app-card">
      <p className="font-semibold text-app-text">{d.label}</p>
      <p className="mt-1.5 flex justify-between gap-4 text-app-text-muted">
        Filler words
        <span className="font-medium text-app-text">{d.ahCount}</span>
      </p>
      <p className={`mt-1 text-xs font-medium ${status.color}`}>{status.text}</p>
    </div>
  );
}

function TimerTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TimerPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const statusColor = d.onTime
    ? "text-emerald-600"
    : d.delta > 0
      ? "text-orange-500"
      : "text-sky-500";
  const statusText = d.onTime
    ? "On time ✓"
    : d.delta > 0
      ? "Over target"
      : "Under target";
  return (
    <div className="min-w-[170px] rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm shadow-app-card">
      <p className="max-w-[160px] truncate font-semibold text-app-text">
        {d.speechTitle}
      </p>
      <p className="text-xs text-app-text-muted">{d.xLabel}</p>
      <div className="mt-1.5 space-y-1">
        <p className="flex justify-between gap-4 text-app-text-muted">
          Target
          <span className="font-medium text-app-text">
            {fmtSeconds(d.targetSeconds)}
          </span>
        </p>
        <p className="flex justify-between gap-4 text-app-text-muted">
          Actual
          <span className="font-medium text-app-text">
            {fmtSeconds(d.actualSeconds)}
          </span>
        </p>
        <p className={`font-semibold ${statusColor}`}>
          {formatDelta(d.delta)} — {statusText}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { memberId } = useProfile();
  const { data, isLoading, error } = useMyAnalytics();

  if (!memberId) {
    return (
      <AppShell>
        <div className="pt-14 text-center">
          <p className="text-sm text-app-text-muted">
            No member profile linked to your account.
          </p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="pt-10">
          <div className="rounded-[1.5rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
            Failed to load analytics. Please try again.
          </div>
        </div>
      </AppShell>
    );
  }

  const g = data?.summaryStats.grammarian;
  const ah = data?.summaryStats.ahCounter;
  const t = data?.summaryStats.timer;

  return (
    <AppShell>
      <section className="space-y-6 pb-8 pt-6 md:space-y-8 md:pt-10">

        {/* Page header */}
        <header>
          <p className="app-eyebrow">Personal Progress</p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-app-text sm:text-[2.4rem]">
            {isLoading ? "Loading…" : (data?.memberName ?? "My Analytics")}
          </h1>
        </header>

        {isLoading ? (
          <div className="app-panel rounded-[1.6rem] px-5 py-14 text-center text-app-text-muted">
            Loading your analytics…
          </div>
        ) : (
          <>
            {/* ── Summary cards ───────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon="mic"
                label="Speeches Delivered"
                value={data?.speechesDelivered ?? 0}
                eyebrow="As speaker"
              />
              <StatCard
                icon="groups"
                label="Roles Filled"
                value={data?.rolesFilled ?? 0}
                eyebrow={`${data?.completedRoles ?? 0} completed`}
              />
              <StatCard
                icon="task_alt"
                label="Role Completion"
                value={`${data?.roleCompletionRate ?? 0}%`}
              />
              <StatCard
                icon="spellcheck"
                label="Filler Words Avg"
                value={ah?.avgFillers ?? 0}
                eyebrow={`${ah?.timesTracked ?? 0} reports`}
              />
            </div>

            {/* ── Monthly speech activity ──────────────────────────────── */}
            <div className="app-panel rounded-[1.75rem] p-5">
              <div className="mb-5">
                <p className="app-eyebrow">Speech Activity</p>
                <h2 className="mt-1 text-[1.6rem] font-semibold tracking-tight text-app-text">
                  Monthly Speeches
                </h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  Completed speeches as speaker — last 6 months
                </p>
              </div>

              {data?.monthlySpeeches.every((p) => p.count === 0) ? (
                <EmptyChartState message="No completed speeches in the last 6 months" />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data?.monthlySpeeches}
                      margin={{ top: 12, right: 8, left: -24, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id="mySpGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0.02}
                          />
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
                      <Tooltip content={<SpeechTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#mySpGradient)"
                        dot={{
                          r: 4,
                          fill: "#3b82f6",
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 6,
                          stroke: "#dbeafe",
                          strokeWidth: 3,
                          fill: "#3b82f6",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ── Grammarian chart ─────────────────────────────────────── */}
            <div className="app-panel rounded-[1.75rem] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="app-eyebrow">Grammarian Role</p>
                  <h2 className="mt-1 text-[1.6rem] font-semibold tracking-tight text-app-text">
                    Grammar Performance
                  </h2>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Errors and score each time you served as Grammarian
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatChip
                    label="Times served"
                    value={g?.timesServed ?? 0}
                  />
                  {(g?.timesServed ?? 0) > 0 && (
                    <>
                      <StatChip
                        label="Avg errors"
                        value={g?.avgErrors ?? 0}
                        accent="bg-orange-50 text-orange-700"
                      />
                      {(g?.avgScore ?? 0) > 0 && (
                        <StatChip
                          label="Avg score"
                          value={`${g?.avgScore}/10`}
                          accent="bg-emerald-50 text-emerald-700"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {data?.grammarianSeries.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data.grammarianSeries}
                      margin={{ top: 12, right: 36, left: -24, bottom: 4 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="4 4"
                        stroke="rgba(148,163,184,0.22)"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <YAxis
                        yAxisId="errors"
                        orientation="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        allowDecimals={false}
                      />
                      <YAxis
                        yAxisId="score"
                        orientation="right"
                        domain={[0, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <Tooltip content={<GrammarTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                      />
                      <Line
                        yAxisId="errors"
                        type="monotone"
                        dataKey="grammarErrors"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{
                          r: 4.5,
                          fill: "#f97316",
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6, stroke: "#fed7aa", strokeWidth: 3 }}
                        name="Grammar Errors"
                      />
                      <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="score"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{
                          r: 4.5,
                          fill: "#10b981",
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6, stroke: "#a7f3d0", strokeWidth: 3 }}
                        name="Score (/10)"
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChartState message="No grammarian reports yet — serve as Grammarian to see your progress" />
              )}
            </div>

            {/* ── Ah Counter chart ─────────────────────────────────────── */}
            <div className="app-panel rounded-[1.75rem] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="app-eyebrow">As Speaker</p>
                  <h2 className="mt-1 text-[1.6rem] font-semibold tracking-tight text-app-text">
                    Filler Word Tracker
                  </h2>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Filler words counted when you spoke — lower is better
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatChip
                    label="Meetings tracked"
                    value={ah?.timesTracked ?? 0}
                  />
                  {(ah?.timesTracked ?? 0) > 0 && (
                    <StatChip
                      label="Avg fillers"
                      value={ah?.avgFillers ?? 0}
                      accent={
                        (ah?.avgFillers ?? 0) <= 2
                          ? "bg-emerald-50 text-emerald-700"
                          : (ah?.avgFillers ?? 0) <= 5
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                      }
                    />
                  )}
                </div>
              </div>

              {data?.ahCounterSeries.length ? (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.ahCounterSeries}
                        margin={{ top: 8, right: 8, left: -24, bottom: 4 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="4 4"
                          stroke="rgba(148,163,184,0.22)"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                        />
                        <Tooltip content={<AhCounterTooltip />} />
                        <Bar
                          dataKey="ahCount"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={52}
                          name="Filler Words"
                        >
                          {data.ahCounterSeries.map((entry) => (
                            <Cell
                              key={entry.date}
                              fill={
                                entry.ahCount <= 2
                                  ? "#10b981"
                                  : entry.ahCount <= 5
                                    ? "#f59e0b"
                                    : "#ef4444"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-app-text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      ≤ 2 — Excellent
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                      3–5 — Good
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                      6+ — High
                    </span>
                  </div>
                </>
              ) : (
                <EmptyChartState message="No filler word reports yet — Ah-Counter data will appear here when you're tracked as a speaker" />
              )}
            </div>

            {/* ── Timer chart ──────────────────────────────────────────── */}
            <div className="app-panel rounded-[1.75rem] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="app-eyebrow">Timer Role</p>
                  <h2 className="mt-1 text-[1.6rem] font-semibold tracking-tight text-app-text">
                    Speech Timing Accuracy
                  </h2>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Prepared speeches timed — seconds over/under target (±15s = on time)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatChip
                    label="Speeches timed"
                    value={t?.speechesTimed ?? 0}
                  />
                  {(t?.speechesTimed ?? 0) > 0 && (
                    <>
                      <StatChip
                        label="Avg drift"
                        value={formatDelta(t?.avgDelta ?? 0)}
                      />
                      <StatChip
                        label="On-time"
                        value={`${t?.onTimeRate ?? 0}%`}
                        accent={
                          (t?.onTimeRate ?? 0) >= 70
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }
                      />
                    </>
                  )}
                </div>
              </div>

              {data?.timerSeries.length ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.timerSeries}
                        margin={{ top: 8, right: 8, left: -10, bottom: 4 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="4 4"
                          stroke="rgba(148,163,184,0.22)"
                        />
                        <XAxis
                          dataKey="xLabel"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickFormatter={(v: number) =>
                            `${v > 0 ? "+" : ""}${v}s`
                          }
                        />
                        <Tooltip content={<TimerTooltip />} />
                        {/* Green band = on-time zone */}
                        <ReferenceArea
                          y1={-15}
                          y2={15}
                          fill="#10b981"
                          fillOpacity={0.07}
                        />
                        <ReferenceLine
                          y={0}
                          stroke="rgba(148,163,184,0.55)"
                          strokeDasharray="4 4"
                        />
                        <Bar
                          dataKey="delta"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={44}
                          name="Time Delta"
                        >
                          {data.timerSeries.map((entry) => (
                            <Cell
                              key={`${entry.date}-${entry.xLabel}`}
                              fill={
                                entry.onTime
                                  ? "#10b981"
                                  : entry.delta > 0
                                    ? "#f97316"
                                    : "#06b6d4"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-app-text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      ±15s — On time
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />
                      Over target
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" />
                      Under target
                    </span>
                  </div>
                </>
              ) : (
                <EmptyChartState message="No prepared speech timings yet — serve as Timer to see your data" />
              )}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
