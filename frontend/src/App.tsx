import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Database,
  Download,
  Eye,
  Fingerprint,
  LayoutDashboard,
  Menu,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  type Evidence,
  type Investigation,
  type Overview,
  type Transaction,
} from "./api";
const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: CreditCard },
  { to: "/cases", label: "Investigation cases", icon: Fingerprint },
  { to: "/model", label: "Model evaluation", icon: Activity },
  { to: "/methodology", label: "Methodology", icon: CircleHelp },
];
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
const time = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
function Shell({ children }: { children: React.ReactNode }) {
  const { data: health } = useLatestLoad(api.health);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Shield size={20} />
            <span />
          </div>
          <div>
            <b>verityflow</b>
            <small>RISK INTELLIGENCE</small>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === "Transactions" && (
                <span className="nav-count">72</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="dataset-card">
            <div className="dataset-icon">
              <Database size={16} />
            </div>
            <div>
              <b>Demo workspace</b>
              <small>Synthetic scenarios · 72 records</small>
            </div>
            <span className="live-dot" />
          </div>
          <div className="profile">
            <div className="avatar">VF</div>
            <div>
              <b>Analyst workspace</b>
              <small>Investigation team</small>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-sep">/</span>
            <b>
              {location.pathname.startsWith("/transactions/")
                ? "Investigation"
                : (nav.find((item) => item.to === location.pathname)?.label ??
                  "Risk overview")}
            </b>
          </div>
          <div className="top-actions">
            <div
              className={`api-status ${health ? "api-online" : "api-offline"}`}
              aria-live="polite"
            >
              <span className="status-dot" />{" "}
              {health ? "API connected" : "API unavailable"}
            </div>
            <button
              className="icon-button notification"
              aria-label="Notifications"
            >
              <Bell size={17} />
              <i />
            </button>
            <div className="top-avatar">A</div>
          </div>
        </header>
        {children}
        <footer className="app-footer">
          <span>
            VERITYFLOW AI <i /> Synthetic demo mode
          </span>
          <span>
            Educational investigation support · Not for financial decisions
          </span>
        </footer>
      </main>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}
function DemoBanner() {
  return (
    <div className="demo-banner">
      <div className="banner-icon">
        <Sparkles size={16} />
      </div>
      <div>
        <b>Exploring synthetic demo scenarios</b>
        <span>
          These fictional transactions are illustrative fixtures—not real
          customer activity or model predictions.
        </span>
      </div>
      <button
        aria-label="Dismiss notice"
        className="banner-dismiss"
        onClick={(e) =>
          e.currentTarget
            .closest(".demo-banner")
            ?.setAttribute("hidden", "true")
        }
      >
        <X size={16} />
      </button>
    </div>
  );
}
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-state">
      <AlertTriangle size={19} />
      <div>
        <b>We couldn't load this view</b>
        <span>
          {message.includes("502")
            ? "The Go API is not responding. Start the backend on port 8080, then retry."
            : message}
        </span>
      </div>
      <button className="button-secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
function useLoad<T>(loader: () => Promise<T>, key = "") {
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    loader()
      .then((value) => {
        if (active) {
          setState({ key, data: value, error: "" });
        }
      })
      .catch((e) => {
        if (active) {
          setState({ key, data: null, error: e.message });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, key, loader]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : "",
    loading: loading || state.key !== key,
    retry: () => setRefresh((v) => v + 1),
  };
}
function useLatestLoad<T>(loader: () => Promise<T>) {
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);
  const stableLoader = useCallback(() => loaderRef.current(), []);
  return useLoad(stableLoader);
}
function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Shield;
  accent: string;
  trend?: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className={`stat-icon ${accent}`}>
          <Icon size={17} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">
        {trend && (
          <span className="trend">
            <ArrowUpRight size={13} />
            {trend}
          </span>
        )}
        {detail}
      </div>
    </article>
  );
}
function RiskPill({ risk }: { risk: string }) {
  return (
    <span className={`risk-pill ${risk}`}>
      <i />
      {risk} risk
    </span>
  );
}
function TxTable({
  items,
  onSelect,
  compact = false,
}: {
  items: Transaction[];
  onSelect?: (t: Transaction) => void;
  compact?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>TRANSACTION</th>
            <th>MERCHANT / CATEGORY</th>
            <th>LOCATION</th>
            <th>TIMESTAMP</th>
            <th>AMOUNT</th>
            <th>RISK ESTIMATE</th>
            {!compact && <th></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr
              key={t.id}
              onClick={() => onSelect?.(t)}
              className={onSelect ? "clickable-row" : ""}
            >
              <td>
                <div className="tx-id">
                  <span className="tx-glyph">
                    <CreditCard size={14} />
                  </span>
                  <span>
                    <b>{t.id}</b>
                    <small>Transaction · demo</small>
                  </span>
                </div>
              </td>
              <td>
                <div className="cell-main">{t.merchant}</div>
                <div className="cell-sub">
                  {t.category.replaceAll("_", " ")}
                </div>
              </td>
              <td>
                <div className="cell-main">{t.city}</div>
                <div className="cell-sub">{t.state}, US</div>
              </td>
              <td>
                <div className="cell-main">{time(t.timestamp)}</div>
              </td>
              <td>
                <b>{money(t.amount)}</b>
              </td>
              <td>
                <div className="risk-cell">
                  <RiskPill risk={t.risk_band} />
                  <span>{Math.round(t.demo_risk * 100)}%</span>
                </div>
              </td>
              {!compact && (
                <td>
                  <button className="row-open" aria-label={`Inspect ${t.id}`}>
                    <ChevronRight size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="empty-state">
          <Search size={21} />
          <b>No matching transactions</b>
          <span>Try a broader search or reset the filters.</span>
        </div>
      )}
    </div>
  );
}
function OverviewPage() {
  const { data, error, loading, retry } = useLoad<Overview>(api.overview),
    trends = useLatestLoad(api.trends),
    cats = useLatestLoad(api.categories),
    recent = useLatestLoad(() =>
      api.transactions(new URLSearchParams({ page: "1", page_size: "6" })),
    );
  const [selected, setSelected] = useState<Transaction | null>(null);
  if (loading)
    return (
      <Shell>
        <div className="content">
          <div className="skeleton heading-skeleton" />
          <div className="stat-grid">
            {[1, 2, 3, 4].map((x) => (
              <div className="skeleton stat-skeleton" key={x} />
            ))}
          </div>
          <div className="skeleton chart-skeleton" />
        </div>
      </Shell>
    );
  if (error || !data)
    return (
      <Shell>
        <div className="content">
          <ErrorState message={error} onRetry={retry} />
        </div>
      </Shell>
    );
  const distribution = Object.entries(data.risk_distribution).map(
      ([name, value]) => ({ name, value }),
    ),
    palette = { low: "#38b7a6", medium: "#e7ad58", high: "#ed746f" };
  return (
    <Shell>
      <div className="content">
        <PageHeading
          eyebrow="SYNTHETIC DEMO MODE · FIXTURE WORKSPACE"
          title="Risk overview"
          description="A connected view of transaction activity, risk indicators, and investigation evidence."
          action={
            <button className="button-secondary" onClick={() => window.print()}>
              <Download size={15} /> Export view
            </button>
          }
        />
        <DemoBanner />
        <div className="overview-toolbar">
          <div className="period-label">
            <Clock3 size={15} /> All available fixture dates
          </div>
          <span className="toolbar-note">Showing synthetic demo scenarios</span>
          <NavLink className="filter-button" to="/transactions">
            <SlidersHorizontal size={15} /> Open filters
          </NavLink>
        </div>
        <div className="stat-grid">
          {[
            {
              label: "Transactions analysed",
              value: data.total_transactions.toLocaleString(),
              detail: "Synthetic demo records",
              icon: CreditCard,
              accent: "teal",
            },
            {
              label: "High-risk scenarios",
              value: data.high_risk_scenarios.toLocaleString(),
              detail: "Illustrative demo risk bands",
              icon: AlertTriangle,
              accent: "amber",
            },
            {
              label: "Lower-risk scenarios",
              value: data.lower_risk_scenarios.toLocaleString(),
              detail: "Not labelled ground truth",
              icon: Shield,
              accent: "blue",
            },
            {
              label: "High-risk scenario share",
              value: `${(data.alert_rate * 100).toFixed(1)}%`,
              detail: "Not a measured fraud rate",
              icon: Activity,
              accent: "blue",
            },
            {
              label: "High-risk scenario amount",
              value: money(data.flagged_amount),
              detail: "Sum of high-risk demo records",
              icon: Activity,
              accent: "rose",
            },
          ].map((x) => (
            <StatCard key={x.label} {...x} />
          ))}
        </div>
        <div className="chart-grid">
          <article className="panel trend-panel">
            <div className="panel-header">
              <div>
                <h2>Transaction activity</h2>
                <p>Scenario volume and high-risk estimates over time</p>
              </div>
              <span className="chart-legend">
                <i className="legend-total" /> All scenarios{" "}
                <i className="legend-alert" /> High-risk
              </span>
            </div>
            <div className="chart-area">
              {trends.data && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trends.data.items}
                    margin={{ top: 12, right: 10, bottom: 0, left: -18 }}
                  >
                    <defs>
                      <linearGradient
                        id="totalFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#39b4a3"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="95%"
                          stopColor="#39b4a3"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 5"
                      vertical={false}
                      stroke="#202d3d"
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#7f8da0", fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#7f8da0", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#121e2c",
                        border: "1px solid #2b3a4c",
                        borderRadius: 9,
                        color: "#eef3f8",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Scenarios"
                      stroke="#39b4a3"
                      strokeWidth={2}
                      fill="url(#totalFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="alerts"
                      name="High risk"
                      stroke="#ed746f"
                      strokeWidth={2}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
          <article className="panel risk-panel">
            <div className="panel-header">
              <div>
                <h2>Risk distribution</h2>
                <p>Rule-generated scenario bands</p>
              </div>
              <button
                className="icon-button"
                title="Risk bands are illustrative demo scores"
              >
                <CircleHelp size={16} />
              </button>
            </div>
            <div className="risk-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={84}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {distribution.map((x) => (
                      <Cell
                        key={x.name}
                        fill={palette[x.name as keyof typeof palette]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#121e2c",
                      border: "1px solid #2b3a4c",
                      borderRadius: 9,
                      color: "#eef3f8",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <b>{data.total_transactions}</b>
                <span>scenarios</span>
              </div>
            </div>
            <div className="risk-legend">
              {distribution.map((x) => (
                <div key={x.name}>
                  <span>
                    <i
                      style={{
                        background: palette[x.name as keyof typeof palette],
                      }}
                    />
                    {x.name} risk
                  </span>
                  <b>{x.value}</b>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div className="panel category-panel">
          <div className="panel-header">
            <div>
              <h2>Merchant category signals</h2>
              <p>High-risk scenario counts by merchant category</p>
            </div>
            <span className="subtle-badge">DEMO FIXTURES</span>
          </div>
          <div className="category-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cats.data?.items}
                margin={{ top: 10, right: 10, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="#202d3d"
                />
                <XAxis
                  dataKey="category"
                  tickFormatter={(v) => v.replaceAll("_", " ")}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#8e9bad", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#7f8da0", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121e2c",
                    border: "1px solid #2b3a4c",
                    borderRadius: 9,
                    color: "#eef3f8",
                  }}
                />
                <Bar
                  dataKey="alerts"
                  name="High-risk scenarios"
                  fill="#ed746f"
                  radius={[4, 4, 0, 0]}
                  barSize={27}
                />
                <Bar
                  dataKey="total"
                  name="All scenarios"
                  fill="#33495a"
                  radius={[4, 4, 0, 0]}
                  barSize={27}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="section-head">
          <div>
            <div className="eyebrow">INVESTIGATION QUEUE</div>
            <h2>Recent suspicious scenarios</h2>
            <p>Illustrative fixtures ranked by demo risk estimate.</p>
          </div>
          <NavLink className="text-link" to="/transactions">
            Explore transactions <ChevronRight size={15} />
          </NavLink>
        </div>
        <div className="panel table-panel">
          {recent.data && (
            <TxTable
              items={recent.data.items
                .slice()
                .sort((a, b) => b.demo_risk - a.demo_risk)
                .slice(0, 5)}
              onSelect={setSelected}
              compact
            />
          )}
        </div>
        <div id="explorer-filters" className="note-strip">
          <Fingerprint size={16} />
          <span>
            Identity fields, card numbers, street addresses, and ground-truth
            labels are not displayed.
          </span>
        </div>
        {selected && (
          <InvestigationDrawer
            transaction={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </Shell>
  );
}
function InvestigationDrawer({
  transaction: t,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const [agentQuestion, setAgentQuestion] = useState(
    "Explain the risk indicators, retrieve supporting evidence, and suggest non-consequential next checks.",
  );
  const [questionDraft, setQuestionDraft] = useState(agentQuestion);
  const [agentRun, setAgentRun] = useState(0);
  const investigationLoader = useCallback(
    () => api.investigate(t.id, agentQuestion),
    [t.id, agentQuestion, agentRun],
  );
  const {
    data: agent,
    error: agentError,
    loading: agentLoading,
    retry: retryAgent,
  } = useLoad<Investigation>(investigationLoader, `${t.id}:${agentRun}`);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [compare, setCompare] = useState<{
    left: Transaction;
    right: Transaction;
    limitations: string;
  } | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const evidenceById = useMemo(
    () => new Map((agent?.evidence ?? []).map((item) => [item.id, item])),
    [agent],
  );
  const saveDecision = async () => {
    if (!agent || !decision || !confirmed) return;
    try {
      await api.action(agent.case_id, t.id, decision, note, true);
      setActionMessage("Analyst action appended to this demo case.");
      setConfirmed(false);
    } catch (e) {
      setActionMessage(
        e instanceof Error ? e.message : "Could not record analyst action",
      );
    }
  };
  const showEvidence = (item: Evidence) => setSelectedEvidence(item);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(
    null,
  );
  const compareNormal = async () => {
    try {
      const page = await api.transactions(
        new URLSearchParams({
          page: "1",
          page_size: "72",
          risk: "low",
          sort: "amount",
          order: "asc",
        }),
      );
      const candidate = page.items.find((x) => x.category === t.category);
      if (!candidate) {
        setReportMessage(
          "No same-category lower-risk demo comparison is available.",
        );
        return;
      }
      const result = await api.compare(t.id, candidate.id);
      setCompare({
        left: result.left,
        right: result.right,
        limitations: result.limitations,
      });
    } catch (e) {
      setReportMessage(
        e instanceof Error ? e.message : "Comparison unavailable",
      );
    }
  };
  const generateReport = async () => {
    if (!agent) return;
    try {
      const value = await api.report(agent.case_id);
      setReportMessage(
        `Report generated · SHA-256 ${String(value.content_sha256 ?? "").slice(0, 16)}…`,
      );
    } catch (e) {
      setReportMessage(e instanceof Error ? e.message : "Report unavailable");
    }
  };
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="investigation-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="eyebrow">SYNTHETIC CASE REVIEW</span>
            <h2>Transaction details</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>
        <div className="drawer-id">
          <span className="tx-glyph">
            <CreditCard size={15} />
          </span>
          <b>{t.id}</b>
          <RiskPill risk={t.risk_band} />
        </div>
        <div className="drawer-amount">
          {money(t.amount)}
          <small>Observed fixture amount</small>
        </div>
        <div className="detail-list">
          <div>
            <span>Merchant</span>
            <b>{t.merchant}</b>
          </div>
          <div>
            <span>Category</span>
            <b>{t.category.replaceAll("_", " ")}</b>
          </div>
          <div>
            <span>Timestamp</span>
            <b>{time(t.timestamp)}</b>
          </div>
          <div>
            <span>Location context</span>
            <b>
              {t.city}, {t.state}, US
            </b>
          </div>
        </div>
        <div className="drawer-toolbar">
          <button className="button-secondary" onClick={compareNormal}>
            Compare with similar lower-risk scenario
          </button>
          {agent && (
            <button className="button-secondary" onClick={generateReport}>
              Generate case report
            </button>
          )}
        </div>
        {compare && (
          <div className="comparison-card">
            <b>
              Fixture comparison · {compare.left.id} vs {compare.right.id}
            </b>
            <div>
              <span>
                {compare.left.category.replaceAll("_", " ")} ·{" "}
                {money(compare.left.amount)} ·{" "}
                {Math.round(compare.left.demo_risk * 100)}% demo
              </span>
              <i>↔</i>
              <span>
                {compare.right.category.replaceAll("_", " ")} ·{" "}
                {money(compare.right.amount)} ·{" "}
                {Math.round(compare.right.demo_risk * 100)}% demo
              </span>
            </div>
            <small>{compare.limitations}</small>
          </div>
        )}
        {reportMessage && <div className="agent-status">{reportMessage}</div>}
        <section className="drawer-section">
          <h3>
            <Activity size={15} /> Demo risk estimate
          </h3>
          <div className="score-box">
            <div className="score-top">
              <b>{Math.round(t.demo_risk * 100)}%</b>
              <span>illustrative only</span>
            </div>
            <div className="score-track">
              <i style={{ width: `${Math.round(t.demo_risk * 100)}%` }} />
            </div>
            <p>
              Fictional scenario score—not a trained or calibrated model
              prediction. No local feature attribution is available.
            </p>
          </div>
        </section>
        <section className="drawer-section">
          <h3>
            <Eye size={15} /> Deterministic rule findings
          </h3>
          {t.findings.length ? (
            t.findings.map((f) => (
              <div className="finding" key={f.code}>
                <span className="finding-dot" />
                <div>
                  <b>{f.title}</b>
                  <p>{f.evidence}</p>
                  <small>Review indicator · not proof of fraud</small>
                </div>
              </div>
            ))
          ) : (
            <div className="no-finding">
              No configured demo rules triggered for this scenario.
            </div>
          )}
        </section>
        <section className="drawer-section">
          <h3>
            <Sparkles size={15} /> Evidence-grounded investigator
          </h3>
          <label className="agent-question">
            Ask about this case
            <textarea
              value={questionDraft}
              maxLength={600}
              onChange={(event) => setQuestionDraft(event.target.value)}
              aria-label="Question for the investigation agent"
            />
            <button
              className="button-secondary"
              disabled={!questionDraft.trim() || agentLoading}
              onClick={() => {
                setAgentQuestion(questionDraft);
                setAgentRun((value) => value + 1);
              }}
            >
              Ask agent
            </button>
          </label>
          {agentLoading ? (
            <div className="agent-status">
              Reviewing transaction facts and deterministic rules…
            </div>
          ) : agentError ? (
            <div className="agent-status agent-error">
              {agentError}. Gemini/evidence agent unavailable.
              <button className="button-secondary" onClick={retryAgent}>
                Retry
              </button>
              <p>
                Fallback: verify the activity using an approved channel; compare
                only authorized history. No AI-generated finding is shown.
              </p>
            </div>
          ) : (
            agent && (
              <>
                <div className="agent-mode">
                  {agent.mode === "gemini_with_backend_tools"
                    ? "GEMINI · BACKEND TOOLS EXECUTED"
                    : "DETERMINISTIC FALLBACK · GEMINI UNAVAILABLE"}
                </div>
                <p className="agent-summary">{agent.summary}</p>
                <div className="agent-subhead">Agent tool activity</div>
                {agent.tool_calls.map((tool, i) => (
                  <div className="tool-trace" key={`${tool.name}-${i}`}>
                    <span>{tool.status === "complete" ? "✓" : "!"}</span>
                    <b>{tool.name.replaceAll("_", " ")}</b>
                    <small>{tool.status}</small>
                  </div>
                ))}
                <div className="agent-subhead">
                  Evidence ledger · click to inspect
                </div>
                {agent.evidence.map((item) => (
                  <button
                    className="evidence-item"
                    key={item.id}
                    onClick={() => showEvidence(item)}
                  >
                    <span className={`source-chip ${item.source_type}`}>
                      {item.source_type.replaceAll("_", " ")}
                    </span>
                    <b>{item.id}</b>
                    <span>{item.explanation}</span>
                    <small>{item.status} · limitations recorded</small>
                  </button>
                ))}
                {selectedEvidence && (
                  <div className="evidence-detail">
                    <div>
                      <b>{selectedEvidence.id}</b>
                      <button
                        className="icon-button"
                        aria-label="Close evidence details"
                        onClick={() => setSelectedEvidence(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <small>
                      {selectedEvidence.source_type.replaceAll("_", " ")} ·{" "}
                      {selectedEvidence.status}
                    </small>
                    <p>{selectedEvidence.explanation}</p>
                    <code>
                      {JSON.stringify(
                        selectedEvidence.observed_value ??
                          selectedEvidence.derived_value ??
                          null,
                        null,
                        2,
                      )}
                    </code>
                    <p className="evidence-limit">
                      Limitations: {selectedEvidence.limitations}
                    </p>
                  </div>
                )}
                <div className="agent-subhead">Finding references</div>
                {agent.findings.map((finding, i) => (
                  <div className="finding" key={`${finding.kind}-${i}`}>
                    <div>
                      <b>{finding.kind.replaceAll("_", " ")}</b>
                      <p>{finding.text}</p>
                      <div className="evidence-links">
                        {finding.evidence_ids.map((id) => {
                          const evidence = evidenceById.get(id);
                          return evidence ? (
                            <button
                              key={id}
                              onClick={() => showEvidence(evidence)}
                            >
                              {id}
                            </button>
                          ) : (
                            <span className="invalid-evidence" key={id}>
                              Unverified reference: {id}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="agent-subhead">Missing evidence</div>
                <ul className="check-list">
                  {agent.missing_evidence.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <div className="agent-subhead">Suggested next checks</div>
                <ul className="check-list">
                  {agent.next_checks.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <div className="analyst-form">
                  <div className="agent-subhead">
                    Record analyst action · requires your confirmation
                  </div>
                  <select
                    aria-label="Analyst case status"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                  >
                    <option value="">Choose status</option>
                    <option value="under_review">Under review</option>
                    <option value="needs_information">Needs information</option>
                    <option value="escalated">Escalated</option>
                    <option value="closed">Closed</option>
                  </select>
                  <textarea
                    aria-label="Analyst rationale"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Document independent evidence and rationale (8–1000 characters)."
                    maxLength={1000}
                  />
                  <label className="confirm-action">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    I reviewed the evidence and confirm this analyst action.
                  </label>
                  <button
                    className="button-secondary"
                    disabled={!decision || note.trim().length < 8 || !confirmed}
                    onClick={saveDecision}
                  >
                    Append action to audit history
                  </button>
                  {actionMessage && <small>{actionMessage}</small>}
                </div>
                <div className="drawer-disclaimer">
                  {agent.disclaimer} Audit history is an in-memory demo record,
                  not tamper-proof.
                </div>
              </>
            )
          )}
        </section>
        <div className="drawer-disclaimer">
          Alert only, not a finding of fraud. All displayed data is synthetic.
        </div>
      </aside>
    </div>
  );
}
function TransactionsPage() {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [risk, setRisk] = useState("all"),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [fromDate, setFromDate] = useState(""),
    [toDate, setToDate] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("risk"),
    [selected, setSelected] = useState<Transaction | null>(null);
  const params = useMemo(
    () =>
      new URLSearchParams({
        q: search,
        page: String(page),
        page_size: "12",
        sort: sort === "time" ? "timestamp" : sort,
        order: "desc",
        ...(category !== "all" ? { category } : {}),
        ...(risk !== "all" ? { risk } : {}),
        ...(min ? { min_amount: min } : {}),
        ...(max ? { max_amount: max } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      }),
    [search, category, risk, min, max, fromDate, toDate, page, sort],
  );
  const requestKey = params.toString();
  const transactionLoader = useCallback(
    () => api.transactions(new URLSearchParams(requestKey)),
    [requestKey],
  );
  const {
    data,
    error,
    loading: requestLoading,
    retry,
  } = useLoad(transactionLoader, requestKey);
  const loading = requestLoading || (data !== null && data.page !== page);
  const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };
  const reset = () => {
    setSearch("");
    setCategory("all");
    setRisk("all");
    setMin("");
    setMax("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };
  return (
    <Shell>
      <div className="content">
        <PageHeading
          eyebrow="TRANSACTION INVESTIGATION"
          title="Transaction explorer"
          description="Search, filter, and inspect synthetic transaction scenarios."
        />
        <DemoBanner />
        <div className="explorer-filters">
          <label className="search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => updateFilter(setSearch, e.target.value)}
              placeholder="Search ID, merchant, category, location"
              aria-label="Search transactions"
            />
            <kbd>⌘ K</kbd>
          </label>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => updateFilter(setCategory, e.target.value)}
          >
            <option value="all">All categories</option>
            {[
              "grocery_pos",
              "gas_transport",
              "shopping_net",
              "food_dining",
              "entertainment",
              "misc_pos",
            ].map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by risk"
            value={risk}
            onChange={(e) => updateFilter(setRisk, e.target.value)}
          >
            <option value="all">All risk bands</option>
            <option value="high">High risk</option>
            <option value="medium">Medium risk</option>
            <option value="low">Low risk</option>
          </select>
          <input
            className="amount-filter"
            type="number"
            min="0"
            placeholder="Min $"
            value={min}
            onChange={(e) => updateFilter(setMin, e.target.value)}
            aria-label="Minimum amount"
          />
          <input
            className="amount-filter"
            type="number"
            min="0"
            placeholder="Max $"
            value={max}
            onChange={(e) => updateFilter(setMax, e.target.value)}
            aria-label="Maximum amount"
          />
          <input
            className="date-filter"
            type="date"
            value={fromDate}
            onChange={(e) => updateFilter(setFromDate, e.target.value)}
            aria-label="From date"
            title="From date"
          />
          <input
            className="date-filter"
            type="date"
            value={toDate}
            onChange={(e) => updateFilter(setToDate, e.target.value)}
            aria-label="To date"
            title="To date"
          />
          <button onClick={reset} className="reset-button">
            Reset
          </button>
        </div>
        <div className="result-summary">
          <span>
            {data?.total ?? "—"} scenarios <i />
            <label className="sort-label">
              Sort by
              <select
                aria-label="Sort transactions"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="risk">Demo risk</option>
                <option value="amount">Amount</option>
                <option value="time">Newest</option>
              </select>
            </label>
          </span>
          <span className="subtle-badge">NO PERSONAL IDENTIFIERS</span>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <div className="panel table-panel">
            {loading ? (
              <div className="table-loading">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div className="skeleton table-row-skeleton" key={i} />
                ))}
              </div>
            ) : (
              data && <TxTable items={data.items} onSelect={setSelected} />
            )}
          </div>
        )}
        <div className="pagination">
          <span>
            Showing{" "}
            {data?.total ? Math.min((page - 1) * 12 + 1, data.total) : 0}–
            {Math.min(page * 12, data?.total ?? 0)} of {data?.total ?? 0}
          </span>
          <div>
            <button
              disabled={page <= 1}
              onClick={() => setPage((v) => v - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil((data?.total ?? 0) / 12))}
            </span>
            <button
              disabled={page >= Math.ceil((data?.total ?? 0) / 12)}
              onClick={() => setPage((v) => v + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {selected && (
          <InvestigationDrawer
            transaction={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </Shell>
  );
}
function MetricsDashboard({ report }: { report: Record<string, unknown> }) {
  const selected = (report.selected ?? {}) as Record<string, unknown>;
  const split = (report.split ?? {}) as Record<string, unknown>;
  const curve = (selected.precision_recall_curve ?? {}) as {
    precision?: number[];
    recall?: number[];
  };
  const matrix = (selected.confusion_matrix ?? []) as number[][];
  const importance = (selected.global_permutation_importance ?? []) as {
    feature: string;
    mean_pr_auc_drop: number;
    std: number;
  }[];
  const models = (report.models ?? []) as Record<string, unknown>[];
  const curveData = (curve.recall ?? []).map((recall, index) => ({
    recall,
    precision: curve.precision?.[index] ?? 0,
  }));
  const metric = (name: string) =>
    typeof selected[name] === "number"
      ? `${(Number(selected[name]) * 100).toFixed(1)}%`
      : "—";
  return (
    <>
      <div className="stat-grid evaluation-stats">
        {[
          ["Precision", metric("precision")],
          ["Recall", metric("recall")],
          ["F1-score", metric("f1")],
          ["PR-AUC", metric("pr_auc")],
          ["ROC-AUC", metric("roc_auc")],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-detail">
              Saved chronological holdout result
            </div>
          </div>
        ))}
      </div>
      <div className="chart-grid evaluation-grid">
        <article className="panel trend-panel">
          <div className="panel-header">
            <div>
              <h2>Precision–recall curve</h2>
              <p>Points serialized in the evaluation artifact</p>
            </div>
            <span className="subtle-badge">
              {String(report.selected_model ?? "selected model")}
            </span>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={curveData}
                margin={{ top: 12, right: 10, bottom: 0, left: -18 }}
              >
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="#202d3d"
                />
                <XAxis
                  type="number"
                  dataKey="recall"
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#7f8da0", fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="precision"
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#7f8da0", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121e2c",
                    border: "1px solid #2b3a4c",
                    borderRadius: 9,
                    color: "#eef3f8",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="precision"
                  stroke="#39b4a3"
                  fill="#39b4a322"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel risk-panel">
          <div className="panel-header">
            <div>
              <h2>Confusion matrix</h2>
              <p>Actual rows · predicted columns</p>
            </div>
          </div>
          <div className="confusion-matrix">
            <div />
            <b>Predicted 0</b>
            <b>Predicted 1</b>
            <b>Actual 0</b>
            <span>{matrix[0]?.[0] ?? "—"}</span>
            <span>{matrix[0]?.[1] ?? "—"}</span>
            <b>Actual 1</b>
            <span>{matrix[1]?.[0] ?? "—"}</span>
            <span>{matrix[1]?.[1] ?? "—"}</span>
          </div>
          <div className="matrix-threshold">
            Selected threshold{" "}
            <b>
              {typeof selected.threshold === "number"
                ? Number(selected.threshold).toFixed(4)
                : "—"}
            </b>
          </div>
        </article>
      </div>
      <div className="panel model-comparison">
        <div className="panel-header">
          <div>
            <h2>Baseline versus selected model</h2>
            <p>Metrics reported directly from the saved holdout evaluation</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>MODEL</th>
                <th>PRECISION</th>
                <th>RECALL</th>
                <th>F1</th>
                <th>PR-AUC</th>
                <th>ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={String(model.name)}>
                  <td>
                    {String(model.name)}
                    {model.name === report.selected_model && (
                      <span className="selected-tag">SELECTED</span>
                    )}
                  </td>
                  {["precision", "recall", "f1", "pr_auc", "roc_auc"].map(
                    (key) => (
                      <td key={key}>
                        {typeof model[key] === "number"
                          ? Number(model[key]).toFixed(4)
                          : "—"}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="split-summary">
          Chronological 80/20 holdout <i /> Train{" "}
          {String(split.train_rows ?? "—")} rows <i /> Validation{" "}
          {String(split.validation_rows ?? "—")} rows <i /> Validation
          prevalence{" "}
          {typeof (
            report.fraud_prevalence as Record<string, unknown> | undefined
          )?.validation === "number"
            ? `${(Number((report.fraud_prevalence as Record<string, unknown>).validation) * 100).toFixed(2)}%`
            : "—"}{" "}
          <i /> Latency{" "}
          {typeof selected.inference_latency_ms_per_transaction === "number"
            ? `${Number(selected.inference_latency_ms_per_transaction).toFixed(3)} ms/row`
            : "—"}
        </div>
      </div>
      <div className="panel importance-panel">
        <div className="panel-header">
          <div>
            <h2>Global feature importance</h2>
            <p>Validation PR-AUC decrease after shuffling each input feature</p>
          </div>
          <span className="subtle-badge">GLOBAL · NOT CASE-SPECIFIC</span>
        </div>
        <div className="importance-list">
          {importance.map((row) => (
            <div key={row.feature}>
              <span>{row.feature.replaceAll("_", " ")}</span>
              <div>
                <i
                  style={{
                    width: `${Math.max(0, Math.min(100, row.mean_pr_auc_drop * 1000))}%`,
                  }}
                />
              </div>
              <b>{row.mean_pr_auc_drop.toFixed(4)}</b>
            </div>
          ))}
        </div>
        <p className="importance-caveat">
          Global association is not a causal or per-transaction explanation.
          Case-level feature contributions are not currently generated.
        </p>
      </div>
    </>
  );
}
function ModelPage() {
  const { data, error, loading, retry } = useLatestLoad(api.metrics);
  return (
    <Shell>
      <div className="content">
        <PageHeading
          eyebrow="MODEL QUALITY & VALIDATION"
          title="Model evaluation"
          description="Evaluation metrics are loaded from the saved, chronological holdout report."
        />
        <div className="model-status-panel">
          <div className="model-status-icon">
            <Activity size={20} />
          </div>
          <div>
            <h2>
              {loading
                ? "Checking for an evaluation artifact…"
                : error
                  ? "No trained model evaluation available"
                  : "Evaluation artifact loaded"}
            </h2>
            <p>
              {error ||
                "Metrics shown below are generated from your saved evaluation output."}
            </p>
          </div>
          <span
            className={`subtle-badge ${error ? "badge-muted" : "badge-good"}`}
          >
            {error ? "MODEL UNAVAILABLE" : "VERIFIED OUTPUT"}
          </span>
        </div>
        {error && (
          <div className="method-card">
            <h3>Generate measured results</h3>
            <p>
              Place the authorized Kaggle CSV files under the ignored raw data
              folder, install ML dependencies, then run the documented train and
              evaluation commands. This page does not substitute fixture
              numbers.
            </p>
            <div className="inline-code">
              make train &amp;&amp; make evaluate
            </div>
          </div>
        )}
        {error && (
          <button className="button-secondary" onClick={retry}>
            Retry evaluation lookup
          </button>
        )}
        {data && <MetricsDashboard report={data} />}
        <div className="evaluation-notes">
          <div className="eyebrow">EVALUATION POLICY</div>
          <ul>
            <li>
              Chronological split; no random mixing of future records into
              training.
            </li>
            <li>
              Report precision, recall, F1, PR-AUC, ROC-AUC, and confusion
              matrix.
            </li>
            <li>
              Threshold selection is explicitly documented and not a production
              policy.
            </li>
            <li>
              Test-file classification metrics require genuinely available,
              valid labels.
            </li>
          </ul>
        </div>
      </div>
    </Shell>
  );
}
function MethodologyPage() {
  return (
    <Shell>
      <div className="content">
        <PageHeading
          eyebrow="DATA PROVENANCE & RESPONSIBLE USE"
          title="Methodology & safeguards"
          description="What this workspace measures, what it does not, and how evidence should be interpreted."
        />
        <DemoBanner />
        <div className="method-grid">
          <article className="method-card">
            <div className="method-icon">
              <Database size={18} />
            </div>
            <h2>Data provenance</h2>
            <p>
              The intended source is the Kaggle{" "}
              <em>Credit Card Transactions Fraud Detection Dataset</em> by
              kartik2112. It contains simulated US card transactions; it is not
              real banking data and is not an MSME lending dataset.
            </p>
            <div className="method-callout">
              Dataset is never downloaded automatically. Obtain it only after
              reviewing the Kaggle access terms and placing CSVs locally.
            </div>
          </article>
          <article className="method-card">
            <div className="method-icon">
              <Activity size={18} />
            </div>
            <h2>Risk score meaning</h2>
            <p>
              Current demo scores are deterministic values generated for
              interface exploration. They are not trained model output,
              calibrated probabilities, or evidence of fraud.
            </p>
            <div className="threshold-list">
              <span>
                Medium review band <b>≥ 35%</b>
              </span>
              <span>
                High review band <b>≥ 70%</b>
              </span>
              <span>
                Large-amount rule <b>≥ $1,500</b>
              </span>
            </div>
          </article>
          <article className="method-card">
            <div className="method-icon">
              <Fingerprint size={18} />
            </div>
            <h2>Feature safeguards</h2>
            <p>
              Training excludes names, raw card and transaction identifiers,
              street addresses, ZIP codes, date of birth, occupation, gender,
              and the target label.
            </p>
            <div className="method-callout">
              Category, merchant, state, time-derived features, amount,
              population context, and approximate card-to-merchant distance are
              evaluated. Feature usefulness and bias require review.
            </div>
          </article>
          <article className="method-card">
            <div className="method-icon">
              <Shield size={18} />
            </div>
            <h2>Responsible use</h2>
            <p>
              Alerts prioritize human review only. A prediction or rule finding
              is not proof of fraud, and must not drive lending,
              account-freezing, legal, or other consequential decisions.
            </p>
            <div className="method-callout">
              Simulated data may encode artificial patterns. Expect drift, false
              positives, false negatives, and subgroup performance differences.
            </div>
          </article>
        </div>
        <div className="method-section">
          <h2>Investigation evidence layers</h2>
          <div className="evidence-steps">
            <div>
              <span>01</span>
              <b>Observed fields</b>
              <p>
                Fixture timestamp, amount, category, merchant, and coarse
                location.
              </p>
            </div>
            <div>
              <span>02</span>
              <b>Demo estimate</b>
              <p>
                Clearly marked illustrative UI score; no live model connected.
              </p>
            </div>
            <div>
              <span>03</span>
              <b>Rule findings</b>
              <p>Deterministic thresholds with the underlying values shown.</p>
            </div>
            <div>
              <span>04</span>
              <b>Hypotheses</b>
              <p>
                Suggested follow-up only; independently verify before action.
              </p>
            </div>
          </div>
        </div>
        <div className="source-footnote">
          Dataset:{" "}
          <a
            href="https://www.kaggle.com/datasets/kartik2112/fraud-detection"
            target="_blank"
            rel="noreferrer"
          >
            Kaggle · kartik2112/fraud-detection <ArrowUpRight size={13} />
          </a>{" "}
          · Not affiliated with Kaggle.
        </div>
      </div>
    </Shell>
  );
}
function NotFound() {
  return (
    <Shell>
      <div className="content">
        <PageHeading
          eyebrow="NOT FOUND"
          title="This view isn't available"
          description="Use the navigation to return to the risk overview."
        />
        <NavLink className="button-secondary" to="/">
          Back to overview
        </NavLink>
      </div>
    </Shell>
  );
}
function CasesPage() {
  const { data, error, loading, retry } = useLatestLoad(api.cases);
  return (
    <Shell>
      <div className="content">
        <PageHeading
          eyebrow="ANALYST WORKFLOW"
          title="Investigation cases"
          description="Review evidence-backed demo investigations and their application-level action history."
        />
        <DemoBanner />
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : loading ? (
          <div className="skeleton chart-skeleton" />
        ) : (
          <div className="panel table-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CASE</th>
                    <th>TRANSACTION</th>
                    <th>STATUS</th>
                    <th>UPDATED</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <b>{item.id}</b>
                      </td>
                      <td>{item.transaction_id}</td>
                      <td>
                        <span className="subtle-badge">
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{time(item.updated_at)}</td>
                      <td>
                        <NavLink
                          className="text-link"
                          to={`/cases/${encodeURIComponent(item.id)}`}
                        >
                          Open <ChevronRight size={14} />
                        </NavLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.items.length && (
                <div className="empty-state">
                  <Fingerprint size={20} />
                  <b>No investigation cases yet</b>
                  <span>
                    Open a transaction and run the investigator to create a demo
                    case.
                  </span>
                  <NavLink to="/transactions">Browse transactions</NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
function CaseRoute() {
  const { id = "" } = useParams();
  const loader = useCallback(() => api.caseDetail(id), [id]);
  const { data, error, loading, retry } = useLoad(loader, id);
  return (
    <Shell>
      <div className="content">
        <PageHeading
          eyebrow="CASE DETAIL & AUDIT HISTORY"
          title={data?.case.id ?? "Investigation case"}
          description="Review the transaction, evidence ledger, and appended analyst actions."
          action={
            <NavLink to="/cases" className="button-secondary">
              <ChevronLeft size={15} /> Cases
            </NavLink>
          }
        />
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : loading ? (
          <div className="skeleton chart-skeleton" />
        ) : (
          data && (
            <>
              <div className="demo-banner">
                <div className="banner-icon">
                  <Database size={15} />
                </div>
                <div>
                  <b>Demo persistence limitation</b>
                  <span>
                    Case and audit events are in-memory, append-only within this
                    process only; not durable or tamper-proof.
                  </span>
                </div>
              </div>
              <div className="panel case-transaction">
                <h2>Linked transaction</h2>
                {data.transaction ? (
                  <TxTable items={[data.transaction]} compact />
                ) : (
                  <p>Transaction unavailable.</p>
                )}
              </div>
              <div className="case-columns">
                <section className="panel">
                  <h2>Evidence ledger</h2>
                  {data.evidence.map((item) => (
                    <div className="evidence-readonly" key={item.id}>
                      <span className="source-chip">
                        {item.source_type.replaceAll("_", " ")}
                      </span>
                      <b>{item.id}</b>
                      <p>{item.explanation}</p>
                      <small>
                        {item.status} · {item.limitations}
                      </small>
                    </div>
                  ))}
                </section>
                <section className="panel">
                  <h2>Analyst audit trail</h2>
                  {data.events.map((event) => (
                    <div className="audit-event" key={event.id}>
                      <span className="audit-dot" />
                      <div>
                        <b>{event.action.replaceAll("_", " ")}</b>
                        <small>
                          {time(event.at)} · {event.actor}
                        </small>
                        {event.rationale && <p>{event.rationale}</p>}
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )
        )}
      </div>
    </Shell>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/transactions/:id" element={<TransactionRoute />} />
      <Route path="/cases" element={<CasesPage />} />
      <Route path="/cases/:id" element={<CaseRoute />} />
      <Route path="/model" element={<ModelPage />} />
      <Route path="/methodology" element={<MethodologyPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
function TransactionRoute() {
  const { id = "" } = useParams(),
    navigate = useNavigate(),
    { data, error, loading } = useLatestLoad(() => api.transaction(id));
  return (
    <Shell>
      <div className="content">
        {loading ? (
          <div className="skeleton chart-skeleton" />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => navigate("/transactions")}
          />
        ) : (
          data && (
            <>
              <PageHeading
                eyebrow="TRANSACTION INVESTIGATION"
                title={data.id}
                description="Review observed fixture data, illustrative risk, and deterministic findings."
                action={
                  <button
                    className="button-secondary"
                    onClick={() => navigate("/transactions")}
                  >
                    <ChevronLeft size={15} /> Back to explorer
                  </button>
                }
              />
              <DemoBanner />
              <div className="detail-page-panel">
                <InvestigationDrawer
                  transaction={data}
                  onClose={() => navigate("/transactions")}
                />
              </div>
            </>
          )
        )}
      </div>
    </Shell>
  );
}
