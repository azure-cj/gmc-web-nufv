import type { StaffDashboardFilters } from "@/server/services/staff-dashboard-service";
import {
  formatBusinessDate,
  formatRequestStatusLabel,
} from "@/lib/gmc-request";
import type { StaffDashboardOverviewData } from "@/server/services/staff-dashboard-overview-service";

interface StaffDashboardOverviewProps {
  basePath: string;
  filters: StaffDashboardFilters & { purposeFrom: string; purposeTo: string };
  data: StaffDashboardOverviewData;
}

const ACCENT_COLORS: Record<"blue" | "gold" | "teal" | "orange", string> = {
  blue: "#3B8FF3",
  gold: "#E0B50F",
  teal: "#34B1AA",
  orange: "#F29F67",
};

const ACCENT_TEXT_CLASSES: Record<"blue" | "gold" | "teal" | "orange", string> = {
  blue: "text-[#9CC6FF]",
  gold: "text-[#F4D15E]",
  teal: "text-[#7DE1D8]",
  orange: "text-[#FFC59C]",
};

function formatSignedChange(value: number): string {
  if (value === 0) {
    return "0%";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value)}%`;
}

function Sparkline({
  values,
  accent,
}: {
  values: number[];
  accent: string;
}) {
  const width = 120;
  const height = 36;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 1);
  const points = values.length > 1 ? values : [...values, ...values];
  const step = width / Math.max(points.length - 1, 1);

  const polyline = points
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${Math.max(2, Math.min(height - 2, y))}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-28">
      <polyline
        fill="none"
        stroke={accent}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
    </svg>
  );
}

function MetricCard({
  metric,
}: {
  metric: StaffDashboardOverviewData["metrics"][number];
}) {
  const trendDirection =
    metric.percentChange === 0 ? "flat" : metric.percentChange > 0 ? "up" : "down";
  const changeClass =
    trendDirection === "down"
      ? "text-rose-300"
      : trendDirection === "flat"
        ? "text-slate-300"
        : "text-emerald-300";
  const changeIcon = trendDirection === "down" ? "▼" : trendDirection === "flat" ? "•" : "▲";
  const accentColor = ACCENT_COLORS[metric.accent];
  const accentTextClass = ACCENT_TEXT_CLASSES[metric.accent];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5">
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accentColor }} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-[0.28em] ${accentTextClass}`}>
            {metric.label}
          </p>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
            {metric.value}
          </p>
          <div
            className={`mt-2 flex items-center gap-2 text-xs font-semibold ${changeClass}`}
            title={`${Math.abs(metric.percentChange)}% ${metric.percentChange > 0 ? "more" : metric.percentChange < 0 ? "fewer" : "the same"} ${metric.label.toLowerCase()} than the previous period`}
          >
            <span>{changeIcon}</span>
            <span>
              {formatSignedChange(metric.percentChange)} {metric.comparisonLabel}
            </span>
          </div>
        </div>
        <div className="shrink-0 rounded-2xl bg-white/5 p-2">
          <Sparkline values={metric.trend} accent={accentColor} />
        </div>
      </div>
    </article>
  );
}

function StatusDonut({
  data,
}: {
  data: StaffDashboardOverviewData["statusBreakdown"];
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = data
    .filter((item) => item.count > 0)
    .map((item) => {
      const length = total > 0 ? (item.count / total) * circumference : 0;
      const segment = {
        color: item.color,
        length,
        offset,
      };
      offset += length;
      return segment;
    });

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B8FF3]">
            Requests by Status
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#1E1E2C]">
            Current request distribution
          </h3>
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          Total {total}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto h-52 w-52">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="14"
            />
            {segments.length > 0 ? (
              segments.map((segment, index) => (
                <circle
                  key={`${segment.color}-${index}`}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                  strokeDashoffset={-segment.offset}
                  strokeLinecap="butt"
                />
              ))
            ) : (
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#dbe4f0"
                strokeWidth="14"
                strokeDasharray={`${circumference} 0`}
              />
            )}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Total
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight text-[#102040]">
              {total}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {data.map((item) => (
            <div key={item.status} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {formatRequestStatusLabel(item.status)}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {item.count} <span className="text-slate-400">({item.percentage}%)</span>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function PurposeBreakdownCard({
  basePath,
  filters,
  data,
}: {
  basePath: string;
  filters: StaffDashboardFilters & { purposeFrom: string; purposeTo: string };
  data: StaffDashboardOverviewData["purposeBreakdown"];
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E0B50F]">
            Requests by Purpose
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#1E1E2C]">
            Volume by request purpose
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Current range: {formatBusinessDate(data.from)} to {formatBusinessDate(data.to)}
          </p>
        </div>

        <form
          action={basePath}
          method="get"
          className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"
        >
          <input type="hidden" name="search" value={filters.search} />
          <input type="hidden" name="status" value={filters.status} />
          <input type="hidden" name="from" value={filters.from} />
          <input type="hidden" name="to" value={filters.to} />
          <input type="hidden" name="page" value={filters.page} />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              From
            </span>
            <input
              type="date"
              name="purposeFrom"
              defaultValue={filters.purposeFrom}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              To
            </span>
            <input
              type="date"
              name="purposeTo"
              defaultValue={filters.purposeTo}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-[#102040] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2C4368] sm:col-span-2"
          >
            Update Range
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-4">
        {data.items.map((item) => (
          <div key={item.purpose}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-800">{item.label}</span>
              <span className="text-slate-500">
                {item.count} requests ({item.percentage}%)
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#102040] via-[#2C4368] to-[#E0B50F]"
                style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function SlaCard({
  data,
}: {
  data: StaffDashboardOverviewData["sla"];
}) {
  const average = data.averageReleaseBusinessDays;
  const progress =
    average === null ? 0 : Math.min(100, Math.max((average / data.targetBusinessDays) * 100, 8));
  const progressClass =
    average === null
      ? "bg-slate-300"
      : average <= data.targetBusinessDays
        ? "bg-[#34B1AA]"
        : "bg-[#E0B50F]";

  return (
    <article className="rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 text-white shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E0B50F]">
            Average Turnaround Time
          </p>
          <h3 className="mt-2 text-xl font-semibold">Time to release</h3>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            How long it takes, on average, from a student&apos;s request to the certificate being released.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
          Goal: {data.targetBusinessDays} business days
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="text-4xl font-bold tracking-tight text-white">
            {average === null ? "—" : `${average.toFixed(1)} days`}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Average time from request submission to release.
          </p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              <span>Goal progress</span>
              <span>{average === null ? "No releases yet" : `${Math.min(100, Math.round(progress))}%`}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${progressClass}`}
                style={{ width: `${average === null ? 0 : progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Needs Attention
          </div>
          <div className="mt-2 text-3xl font-bold text-white">{data.overdueCount}</div>
          <div className="mt-3 max-h-52 space-y-3 overflow-y-auto pr-1">
            {data.overdueRequests.length > 0 ? (
              data.overdueRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-white/10 bg-[#242436] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {request.requestReferenceNumber}
                      </div>
                      <div className="text-xs text-slate-300">{request.studentName}</div>
                    </div>
                    <span className="rounded-full bg-[#E0B50F]/15 px-2.5 py-1 text-[11px] font-semibold text-[#E0C07A]">
                      Taking longer than usual
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Submitted {formatBusinessDate(request.dateSubmitted)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 px-3 py-5 text-sm text-slate-300">
                No pending requests are over the current target threshold.
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ActivityFeedCard({
  data,
}: {
  data: StaffDashboardOverviewData["activity"];
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B8FF3]">
            Recent Activity
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#1E1E2C]">
            Live audit trail
          </h3>
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {data.length} events
        </div>
      </div>

      <div className="mt-6 max-h-[31rem] space-y-3 overflow-y-auto pr-1">
        {data.length > 0 ? (
          data.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#102040] text-xs font-bold text-white">
                  {item.actorName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "ST"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-slate-900">{item.actorName}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-sm font-medium text-[#102040]">{item.actionLabel}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">Target: {item.targetLabel}</div>
                  {item.notes ? (
                    <div className="mt-2 text-xs leading-5 text-slate-500">{item.notes}</div>
                  ) : null}
                  <div className="mt-2 text-xs font-medium text-slate-400">
                    {item.relativeTime}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No recent staff activity found.
          </div>
        )}
      </div>
    </article>
  );
}

export default function StaffDashboardOverview({
  basePath,
  filters,
  data,
}: StaffDashboardOverviewProps) {
  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#E0B50F]">
              Discipline Office
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Dashboard
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              Live operational view of GMC requests, certificates, and administrative activity.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StatusDonut data={data.statusBreakdown} />
        <PurposeBreakdownCard
          basePath={basePath}
          filters={filters}
          data={data.purposeBreakdown}
        />
        <SlaCard data={data.sla} />
        <ActivityFeedCard data={data.activity} />
      </div>
    </section>
  );
}
