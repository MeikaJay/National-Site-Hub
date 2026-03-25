import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

const leaderLinks = [
  { to: "/leader", label: "Dashboard" },
  { to: "/leader/attendance", label: "Attendance" },
  { to: "/leader/pto", label: "Leadership PTO" },
  { to: "/leader/training", label: "Weekly Training" },
  { to: "/leader/loa", label: "LOA" },
  { to: "/leader/pips", label: "PIPs" },
  { to: "/leader/schedules", label: "Schedules" },
  { to: "/leader/sales", label: "Daily Sales" },
];

function getPercentToTarget(target, achieved) {
  const targetNum = Number(target || 0);
  const achievedNum = Number(achieved || 0);
  if (targetNum <= 0) return 0;
  return Number(((achievedNum / targetNum) * 100).toFixed(2));
}

function getStatusConfig(percent) {
  if (percent >= 100) {
    return {
      label: "Strong",
      className: "status-green",
      toneClass: "sales-card-green",
    };
  }
  if (percent >= 85) {
    return {
      label: "Close",
      className: "status-yellow",
      toneClass: "sales-card-yellow",
    };
  }
  if (percent >= 70) {
    return {
      label: "Needs Push",
      className: "status-orange",
      toneClass: "sales-card-orange",
    };
  }
  return {
    label: "Off Track",
    className: "status-red",
    toneClass: "sales-card-red",
  };
}

function formatDateDisplay(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isSameDay(dateString, compareDate = new Date()) {
  const input = new Date(`${dateString}T00:00:00`);
  return input.toDateString() === compareDate.toDateString();
}

function isThisWeek(dateString) {
  const input = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(input.getTime())) return false;

  const today = new Date();
  const day = today.getDay();

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - day);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return input >= start && input <= end;
}

function isThisMonth(dateString) {
  const input = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(input.getTime())) return false;

  const today = new Date();

  return (
    input.getFullYear() === today.getFullYear() &&
    input.getMonth() === today.getMonth()
  );
}

function isThisQuarter(dateString) {
  const input = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(input.getTime())) return false;

  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3);
  const inputQuarter = Math.floor(input.getMonth() / 3);

  return (
    input.getFullYear() === today.getFullYear() &&
    inputQuarter === currentQuarter
  );
}

function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) =>
    (b.sales_date || "").localeCompare(a.sales_date || "")
  );
}

export default function LeaderSalesTracker() {
  const [activeTab, setActiveTab] = useState("site");
  const [dateView, setDateView] = useState("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [leaders, setLeaders] = useState([]);
  const [siteSalesItems, setSiteSalesItems] = useState([]);
  const [leaderSalesItems, setLeaderSalesItems] = useState([]);
  const [leaderFilter, setLeaderFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [leadersRes, siteRes, leaderRes] = await Promise.all([
      supabase
        .from("leaders")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true }),

      supabase
        .from("site_daily_sales")
        .select("id, sales_date, sales_target, points_achieved, notes")
        .order("sales_date", { ascending: false }),

      supabase
        .from("leader_daily_sales")
        .select(`
          id,
          sales_date,
          leader_id,
          sales_target,
          points_achieved,
          notes,
          leaders (name)
        `)
        .order("sales_date", { ascending: false }),
    ]);

    if (leadersRes.error || siteRes.error || leaderRes.error) {
      setPageError(
        leadersRes.error?.message ||
          siteRes.error?.message ||
          leaderRes.error?.message ||
          "Something went wrong loading sales data."
      );
      setLoading(false);
      return;
    }

    setLeaders(leadersRes.data || []);
    setSiteSalesItems(siteRes.data || []);
    setLeaderSalesItems(leaderRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const applyDateViewFilter = useCallback(
    (item) => {
      if (selectedDate) {
        return item.sales_date === selectedDate;
      }

      if (dateView === "today") return isSameDay(item.sales_date);
      if (dateView === "yesterday") return isSameDay(item.sales_date, new Date(getYesterdayDate()));
      if (dateView === "week") return isThisWeek(item.sales_date);
      if (dateView === "month") return isThisMonth(item.sales_date);
      if (dateView === "quarter") return isThisQuarter(item.sales_date);

      return true;
    },
    [dateView, selectedDate]
  );

  const filteredSiteItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const items = siteSalesItems.filter((item) => {
      const matchesSearch =
        !term ||
        (item.notes || "").toLowerCase().includes(term) ||
        (item.sales_date || "").toLowerCase().includes(term);

      return matchesSearch && applyDateViewFilter(item);
    });

    return sortByDateDesc(items);
  }, [siteSalesItems, searchTerm, applyDateViewFilter]);

  const filteredLeaderItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const items = leaderSalesItems.filter((item) => {
      const matchesLeader = !leaderFilter || item.leader_id === leaderFilter;

      const matchesSearch =
        !term ||
        (item.notes || "").toLowerCase().includes(term) ||
        (item.sales_date || "").toLowerCase().includes(term) ||
        (item.leaders?.name || "").toLowerCase().includes(term);

      return matchesLeader && matchesSearch && applyDateViewFilter(item);
    });

    return sortByDateDesc(items);
  }, [leaderSalesItems, leaderFilter, searchTerm, applyDateViewFilter]);

  const siteSummary = useMemo(() => {
    const totalTarget = filteredSiteItems.reduce(
      (sum, item) => sum + Number(item.sales_target || 0),
      0
    );
    const totalAchieved = filteredSiteItems.reduce(
      (sum, item) => sum + Number(item.points_achieved || 0),
      0
    );
    const percent = getPercentToTarget(totalTarget, totalAchieved);

    return {
      totalTarget: totalTarget.toFixed(2),
      totalAchieved: totalAchieved.toFixed(2),
      percent,
      status: getStatusConfig(percent),
    };
  }, [filteredSiteItems]);

  const leaderSummary = useMemo(() => {
    const totalTarget = filteredLeaderItems.reduce(
      (sum, item) => sum + Number(item.sales_target || 0),
      0
    );
    const totalAchieved = filteredLeaderItems.reduce(
      (sum, item) => sum + Number(item.points_achieved || 0),
      0
    );
    const percent = getPercentToTarget(totalTarget, totalAchieved);

    return {
      totalTarget: totalTarget.toFixed(2),
      totalAchieved: totalAchieved.toFixed(2),
      percent,
      status: getStatusConfig(percent),
    };
  }, [filteredLeaderItems]);

  const activeItems = activeTab === "site" ? filteredSiteItems : filteredLeaderItems;
  const activeSummary = activeTab === "site" ? siteSummary : leaderSummary;

  const trend = useMemo(() => {
    if (activeItems.length < 2 || selectedDate) return null;

    const current = activeItems[0];
    const previous = activeItems[1];

    const currentPercent = getPercentToTarget(
      current.sales_target,
      current.points_achieved
    );
    const previousPercent = getPercentToTarget(
      previous.sales_target,
      previous.points_achieved
    );

    const diff = Number((currentPercent - previousPercent).toFixed(2));

    if (diff > 0) {
      return {
        label: `Up ${diff.toFixed(2)}% vs previous entry`,
        tone: "trend-up",
      };
    }

    if (diff < 0) {
      return {
        label: `Down ${Math.abs(diff).toFixed(2)}% vs previous entry`,
        tone: "trend-down",
      };
    }

    return {
      label: "No change vs previous entry",
      tone: "trend-same",
    };
  }, [activeItems, selectedDate]);

  const topPerformers = useMemo(() => {
    if (activeTab !== "leader") return [];

    return filteredLeaderItems
      .map((item) => ({
        ...item,
        percent: getPercentToTarget(item.sales_target, item.points_achieved),
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);
  }, [filteredLeaderItems, activeTab]);

  return (
    <Layout title="Daily Sales" links={leaderLinks}>
      <div className="sales-page-wrap">
        <div className="sales-hero-card">
          <div>
            <h2 className="section-title">Daily Sales Performance</h2>
            <p className="section-subtext">
              View site progress or filter down to individual leader performance.
            </p>
          </div>

          <div className="sales-tab-row">
            <button
              type="button"
              className={`sales-tab-btn ${activeTab === "site" ? "sales-tab-active" : ""}`}
              onClick={() => setActiveTab("site")}
            >
              Site View
            </button>
            <button
              type="button"
              className={`sales-tab-btn ${activeTab === "leader" ? "sales-tab-active" : ""}`}
              onClick={() => setActiveTab("leader")}
            >
              Leader View
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                View Range
              </label>
              <div className="sales-tab-row" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className={`sales-tab-btn ${dateView === "today" ? "sales-tab-active" : ""}`}
                  onClick={() => {
                    setDateView("today");
                    setSelectedDate("");
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`sales-tab-btn ${dateView === "yesterday" ? "sales-tab-active" : ""}`}
                  onClick={() => {
                    setDateView("yesterday");
                    setSelectedDate(getYesterdayDate());
                  }}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  className={`sales-tab-btn ${dateView === "week" ? "sales-tab-active" : ""}`}
                  onClick={() => {
                    setDateView("week");
                    setSelectedDate("");
                  }}
                >
                  Current Week
                </button>
                <button
                  type="button"
                  className={`sales-tab-btn ${dateView === "month" ? "sales-tab-active" : ""}`}
                  onClick={() => {
                    setDateView("month");
                    setSelectedDate("");
                  }}
                >
                  Current Month
                </button>
                <button
                  type="button"
                  className={`sales-tab-btn ${dateView === "quarter" ? "sales-tab-active" : ""}`}
                  onClick={() => {
                    setDateView("quarter");
                    setSelectedDate("");
                  }}
                >
                  Current Quarter
                </button>
              </div>
            </div>

            <div style={{ flex: "1 1 220px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                Pick a Date
              </label>
              <input
                type="date"
                className="sales-search-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div style={{ flex: "1 1 220px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                Search Notes
              </label>
              <input
                type="text"
                className="sales-search-input"
                placeholder="Search notes"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {activeTab === "leader" && (
              <div style={{ flex: "1 1 220px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  Leader Filter
                </label>
                <select
                  className="sales-search-input"
                  value={leaderFilter}
                  onChange={(e) => setLeaderFilter(e.target.value)}
                >
                  <option value="">All Leaders</option>
                  {leaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDate && (
              <div style={{ display: "flex", alignItems: "end" }}>
                <button
                  type="button"
                  className="sales-tab-btn"
                  onClick={() => setSelectedDate("")}
                >
                  Clear Date
                </button>
              </div>
            )}
          </div>
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

        <div className="sales-summary-grid">
          <div className="sales-summary-box">
            <div className="sales-summary-label">Total Target</div>
            <div className="sales-summary-value">{activeSummary.totalTarget}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Points Achieved</div>
            <div className="sales-summary-value">{activeSummary.totalAchieved}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Percent to Target</div>
            <div className="sales-summary-value">{activeSummary.percent.toFixed(2)}%</div>
          </div>

          <div className={`sales-summary-box ${activeSummary.status.className}`}>
            <div className="sales-summary-label">Performance</div>
            <div className="sales-summary-value">{activeSummary.status.label}</div>
          </div>
        </div>

        {trend && (
          <div className={`sales-trend-box ${trend.tone}`}>
            {trend.label}
          </div>
        )}

        {activeTab === "leader" && topPerformers.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Top Performers</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topPerformers.map((item, index) => (
                <div key={item.id} className="top-performer-row">
                  <div className="top-performer-rank">#{index + 1}</div>
                  <div className="top-performer-name">
                    {item.leaders?.name || "Unknown Leader"}
                  </div>
                  <div className="top-performer-percent">{item.percent.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "6px" }}>Detailed Entries</h3>
              <p style={{ margin: 0, color: "#64748b" }}>
                Open this only when you want to review each entry.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => setShowDetails((prev) => !prev)}
            >
              {showDetails ? "Hide Details" : "View Detailed Entries"}
            </button>
          </div>
        </div>

        {showDetails &&
          (loading ? (
            <div className="card">Loading sales data...</div>
          ) : activeItems.length === 0 ? (
            <div className="card">No sales data found for this view.</div>
          ) : (
            <div className="leader-sales-grid">
              {activeTab === "site"
                ? activeItems.map((item) => {
                    const percent = getPercentToTarget(item.sales_target, item.points_achieved);
                    const status = getStatusConfig(percent);

                    return (
                      <div key={item.id} className={`leader-sales-card ${status.toneClass}`}>
                        <div className="leader-sales-top">
                          <div>
                            <div className="leader-sales-name">Site</div>
                            <div className="leader-sales-date">
                              {formatDateDisplay(item.sales_date)}
                            </div>
                          </div>
                          <span className={`status-pill ${status.className}`}>{status.label}</span>
                        </div>

                        <div className="leader-sales-metrics">
                          <div className="leader-sales-metric-box">
                            <div className="leader-sales-metric-label">Target</div>
                            <div className="leader-sales-metric-value">
                              {Number(item.sales_target || 0).toFixed(2)}
                            </div>
                          </div>

                          <div className="leader-sales-metric-box">
                            <div className="leader-sales-metric-label">Achieved</div>
                            <div className="leader-sales-metric-value">
                              {Number(item.points_achieved || 0).toFixed(2)}
                            </div>
                          </div>

                          <div className="leader-sales-metric-box">
                            <div className="leader-sales-metric-label">% to Target</div>
                            <div className="leader-sales-metric-value">{percent.toFixed(2)}%</div>
                          </div>
                        </div>

                        {item.notes ? <div className="leader-sales-notes">{item.notes}</div> : null}
                      </div>
                    );
                  })
                : activeItems.map((item) => {
                    const percent = getPercentToTarget(item.sales_target, item.points_achieved);
                    const status = getStatusConfig(percent);

                    return (
                      <div key={item.id} className={`leader-sales-card ${status.toneClass}`}>
                        <div className="leader-sales-top">
                          <div>
                            <div className="leader-sales-name">
                              {item.leaders?.name || "Unknown Leader"}
                            </div>
                            <div className="leader-sales-date">
                              {formatDateDisplay(item.sales_date)}
                            </div>
                          </div>
                          <span className={`status-pill ${status.className}`}>{status.label}</span>
                        </div>

                        <div className="leader-sales-metrics">
                          <div className="leader-sales-metric-box">
                            <div className="leader-sales-metric-label">Target</div>
                            <div className="leader-sales-metric-value">
                              {Number(item.sales_target || 0).toFixed(2)}
                            </div>
                          </div>

                          <div className="leader-sales-metric-box">
                            <div className="leader-sales-metric-label">Achieved</div>
                            <div className="leader-sales-metric-value">
                              {Number(item.points_achieved || 0).toFixed(2)}
                            </div>
                          </div>

                          <div className="leader-sales-metric-box">
                            <div className="leader-sales-metric-label">% to Target</div>
                            <div className="leader-sales-metric-value">{percent.toFixed(2)}%</div>
                          </div>
                        </div>

                        {item.notes ? <div className="leader-sales-notes">{item.notes}</div> : null}
                      </div>
                    );
                  })}
            </div>
          ))}
      </div>
    </Layout>
  );
}