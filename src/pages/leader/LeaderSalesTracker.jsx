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

export default function LeaderSalesTracker() {
  const [activeTab, setActiveTab] = useState("site");
  const [leaders, setLeaders] = useState([]);
  const [siteSalesItems, setSiteSalesItems] = useState([]);
  const [leaderSalesItems, setLeaderSalesItems] = useState([]);
  const [leaderFilter, setLeaderFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredSiteItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return siteSalesItems.filter((item) => {
      if (!term) return true;
      return (
        (item.sales_date || "").toLowerCase().includes(term) ||
        (item.notes || "").toLowerCase().includes(term)
      );
    });
  }, [siteSalesItems, searchTerm]);

  const filteredLeaderItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return leaderSalesItems.filter((item) => {
      const matchesLeader =
        !leaderFilter || item.leader_id === leaderFilter;

      const matchesSearch =
        !term ||
        (item.sales_date || "").toLowerCase().includes(term) ||
        (item.notes || "").toLowerCase().includes(term) ||
        (item.leaders?.name || "").toLowerCase().includes(term);

      return matchesLeader && matchesSearch;
    });
  }, [leaderSalesItems, leaderFilter, searchTerm]);

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
            <div style={{ flex: "1 1 260px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                Search
              </label>
              <input
                type="text"
                className="sales-search-input"
                placeholder={
                  activeTab === "site"
                    ? "Search by date or notes"
                    : "Search by leader, date, or notes"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {activeTab === "leader" && (
              <div style={{ flex: "1 1 260px" }}>
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
          </div>
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

        <div className="sales-summary-grid">
          <div className="sales-summary-box">
            <div className="sales-summary-label">Total Target</div>
            <div className="sales-summary-value">
              {activeTab === "site" ? siteSummary.totalTarget : leaderSummary.totalTarget}
            </div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Points Achieved</div>
            <div className="sales-summary-value">
              {activeTab === "site" ? siteSummary.totalAchieved : leaderSummary.totalAchieved}
            </div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Percent to Target</div>
            <div className="sales-summary-value">
              {(activeTab === "site" ? siteSummary.percent : leaderSummary.percent).toFixed(2)}%
            </div>
          </div>

          <div
            className={`sales-summary-box ${
              activeTab === "site" ? siteSummary.status.className : leaderSummary.status.className
            }`}
          >
            <div className="sales-summary-label">Performance</div>
            <div className="sales-summary-value">
              {activeTab === "site" ? siteSummary.status.label : leaderSummary.status.label}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card">Loading sales data...</div>
        ) : activeTab === "site" ? (
          filteredSiteItems.length === 0 ? (
            <div className="card">No site sales data found.</div>
          ) : (
            <div className="leader-sales-grid">
              {filteredSiteItems.map((item) => {
                const percent = getPercentToTarget(item.sales_target, item.points_achieved);
                const status = getStatusConfig(percent);

                return (
                  <div key={item.id} className={`leader-sales-card ${status.toneClass}`}>
                    <div className="leader-sales-top">
                      <div>
                        <div className="leader-sales-name">Site Performance</div>
                        <div className="leader-sales-date">{item.sales_date}</div>
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
          )
        ) : filteredLeaderItems.length === 0 ? (
          <div className="card">No leader sales data found.</div>
        ) : (
          <div className="leader-sales-grid">
            {filteredLeaderItems.map((item) => {
              const percent = getPercentToTarget(item.sales_target, item.points_achieved);
              const status = getStatusConfig(percent);

              return (
                <div key={item.id} className={`leader-sales-card ${status.toneClass}`}>
                  <div className="leader-sales-top">
                    <div>
                      <div className="leader-sales-name">
                        {item.leaders?.name || "Unknown Leader"}
                      </div>
                      <div className="leader-sales-date">{item.sales_date}</div>
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
        )}
      </div>
    </Layout>
  );
}