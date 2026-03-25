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
  { to: "/leader/qa", label: "QA Performance" },
];

function formatMonthDisplay(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getTrend(current, previous) {
  if (previous === null || previous === undefined) {
    return { label: "No prior month", className: "trend-neutral" };
  }

  if (current > previous) {
    return {
      label: `Up ${Number(current - previous).toFixed(2)} pts`,
      className: "trend-up",
    };
  }

  if (current < previous) {
    return {
      label: `Down ${Number(previous - current).toFixed(2)} pts`,
      className: "trend-down",
    };
  }

  return { label: "No change", className: "trend-neutral" };
}

function getCompareLabel(teamScore, siteScore) {
  if (siteScore === null || siteScore === undefined) {
    return { label: "No site average yet", className: "trend-neutral" };
  }

  if (teamScore > siteScore) {
    return {
      label: `Above site avg by ${Number(teamScore - siteScore).toFixed(2)} pts`,
      className: "trend-up",
    };
  }

  if (teamScore < siteScore) {
    return {
      label: `Below site avg by ${Number(siteScore - teamScore).toFixed(2)} pts`,
      className: "trend-down",
    };
  }

  return { label: "At site average", className: "trend-neutral" };
}

function getQAStatus(score) {
  const value = Number(score || 0);

  if (value >= 85) {
    return {
      className: "qa-green",
      label: "Strong",
      cardClass: "qa-history-green",
    };
  }
  if (value >= 70) {
    return {
      className: "qa-yellow",
      label: "Watch",
      cardClass: "qa-history-yellow",
    };
  }
  return {
    className: "qa-red",
    label: "Urgent",
    cardClass: "qa-history-red",
  };
}

export default function QALeader() {
  const [leaders, setLeaders] = useState([]);
  const [qaItems, setQaItems] = useState([]);
  const [leaderFilter, setLeaderFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [leadersRes, qaRes] = await Promise.all([
      supabase
        .from("leaders")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true }),

      supabase
        .from("monthly_qa_scores")
        .select(`
          id,
          score_month,
          leader_id,
          qa_score,
          notes,
          created_at,
          leaders (name)
        `)
        .order("score_month", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (leadersRes.error || qaRes.error) {
      setPageError(
        leadersRes.error?.message ||
          qaRes.error?.message ||
          "Something went wrong loading QA data."
      );
      setLoading(false);
      return;
    }

    setLeaders(leadersRes.data || []);
    setQaItems(qaRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const siteItems = useMemo(() => {
    return qaItems.filter((item) => !item.leader_id);
  }, [qaItems]);

  const leaderItems = useMemo(() => {
    return qaItems.filter((item) =>
      leaderFilter ? item.leader_id === leaderFilter : !!item.leader_id
    );
  }, [qaItems, leaderFilter]);

  const latestSite = siteItems[0] || null;
  const previousSite = siteItems[1] || null;

  const latestLeader = leaderItems[0] || null;
  const previousLeader = leaderItems[1] || null;

  const siteTrend = latestSite
    ? getTrend(
        Number(latestSite.qa_score || 0),
        previousSite ? Number(previousSite.qa_score || 0) : null
      )
    : { label: "No data", className: "trend-neutral" };

  const leaderTrend = latestLeader
    ? getTrend(
        Number(latestLeader.qa_score || 0),
        previousLeader ? Number(previousLeader.qa_score || 0) : null
      )
    : { label: "No data", className: "trend-neutral" };

  const compareToSite = latestLeader
    ? getCompareLabel(
        Number(latestLeader.qa_score || 0),
        latestSite ? Number(latestSite.qa_score || 0) : null
      )
    : { label: "No data", className: "trend-neutral" };

  return (
    <Layout title="QA Performance" links={leaderLinks}>
      <div className="sales-page-wrap">
        <div className="sales-hero-card">
          <div>
            <h2 className="section-title">Monthly QA Performance</h2>
            <p className="section-subtext">
              Compare site QA and team QA month over month in a cleaner view.
            </p>
          </div>

          <div style={{ minWidth: "260px", width: "320px", maxWidth: "100%" }}>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}
            >
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
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

        <div className="sales-summary-grid">
          <div className="sales-summary-box">
            <div className="sales-summary-label">Site QA</div>
            <div
              className={`sales-summary-value ${
                latestSite ? getQAStatus(latestSite.qa_score).className : ""
              }`}
            >
              {latestSite ? Number(latestSite.qa_score || 0).toFixed(2) : "—"}%
            </div>
            <div
              className={siteTrend.className}
              style={{ marginTop: "8px", fontWeight: 700 }}
            >
              {siteTrend.label}
            </div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Team QA</div>
            <div
              className={`sales-summary-value ${
                latestLeader ? getQAStatus(latestLeader.qa_score).className : ""
              }`}
            >
              {latestLeader ? Number(latestLeader.qa_score || 0).toFixed(2) : "—"}%
            </div>
            <div
              className={leaderTrend.className}
              style={{ marginTop: "8px", fontWeight: 700 }}
            >
              {leaderTrend.label}
            </div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Team vs Site</div>
            <div
              className="sales-summary-value"
              style={{ fontSize: "18px", lineHeight: "1.4" }}
            >
              {compareToSite.label}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: "14px" }}>Monthly QA History</h3>

          {loading ? (
            <p>Loading QA history...</p>
          ) : leaderItems.length === 0 ? (
            <p>No leader QA history found.</p>
          ) : (
            <div className="qa-history-list">
              {leaderItems.map((item) => {
                const qaStatus = getQAStatus(item.qa_score);

                return (
                  <div
                    key={item.id}
                    className={`qa-history-card ${qaStatus.cardClass}`}
                  >
                    <div className="qa-history-top">
                      <div>
                        <div className="qa-history-month">
                          {formatMonthDisplay(item.score_month)}
                        </div>
                        <div className="qa-history-leader">
                          {item.leaders?.name || "Unknown"}
                        </div>
                      </div>

                      <div className="qa-history-score-wrap">
                        <div className={`qa-history-score ${qaStatus.className}`}>
                          {Number(item.qa_score || 0).toFixed(2)}%
                        </div>
                        <div className="qa-history-status">{qaStatus.label}</div>
                      </div>
                    </div>

                    {item.notes ? (
                      <div className="qa-history-notes">{item.notes}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}