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
  const [salesItems, setSalesItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const { data, error } = await supabase
      .from("daily_sales_tracker")
      .select(`
        id,
        sales_date,
        leader_id,
        sales_target,
        points_achieved,
        notes,
        leaders (name)
      `)
      .order("sales_date", { ascending: false });

    if (error) {
      setPageError(error.message || "Something went wrong loading sales data.");
      setLoading(false);
      return;
    }

    setSalesItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return salesItems.filter((item) => {
      if (!term) return true;

      const leader = (item.leaders?.name || "").toLowerCase();
      const date = (item.sales_date || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();

      return leader.includes(term) || date.includes(term) || notes.includes(term);
    });
  }, [salesItems, searchTerm]);

  const summary = useMemo(() => {
    const totalTarget = filteredItems.reduce(
      (sum, item) => sum + Number(item.sales_target || 0),
      0
    );

    const totalAchieved = filteredItems.reduce(
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
  }, [filteredItems]);

  return (
    <Layout title="Daily Sales" links={leaderLinks}>
      <div className="sales-page-wrap">
        <div className="sales-hero-card">
          <div>
            <h2 className="section-title">Daily Sales Performance</h2>
            <p className="section-subtext">
              A clean view of targets, points achieved, and percent to target.
            </p>
          </div>

          <input
            type="text"
            className="sales-search-input"
            placeholder="Search by leader, date, or notes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

        <div className="sales-summary-grid">
          <div className="sales-summary-box">
            <div className="sales-summary-label">Total Target</div>
            <div className="sales-summary-value">{summary.totalTarget}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Points Achieved</div>
            <div className="sales-summary-value">{summary.totalAchieved}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Percent to Target</div>
            <div className="sales-summary-value">{summary.percent.toFixed(2)}%</div>
          </div>

          <div className={`sales-summary-box ${summary.status.className}`}>
            <div className="sales-summary-label">Performance</div>
            <div className="sales-summary-value">{summary.status.label}</div>
          </div>
        </div>

        {loading ? (
          <div className="card">Loading sales data...</div>
        ) : filteredItems.length === 0 ? (
          <div className="card">No sales data found.</div>
        ) : (
          <div className="leader-sales-grid">
            {filteredItems.map((item) => {
              const percent = getPercentToTarget(
                item.sales_target,
                item.points_achieved
              );
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

                    <span className={`status-pill ${status.className}`}>
                      {status.label}
                    </span>
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
                      <div className="leader-sales-metric-value">
                        {percent.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {item.notes ? (
                    <div className="leader-sales-notes">{item.notes}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}