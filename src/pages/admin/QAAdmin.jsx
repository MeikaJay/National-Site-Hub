import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pto", label: "Leadership PTO" },
  { to: "/admin/training", label: "Weekly Training" },
  { to: "/admin/sales", label: "Daily Sales" },
  { to: "/admin/qa", label: "QA Performance" },
];

const emptySiteForm = {
  score_month: "",
  qa_score: "",
  notes: "",
};

const emptyLeaderForm = {
  score_month: "",
  leader_id: "",
  qa_score: "",
  notes: "",
};

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
    return { label: `Up ${Number(current - previous).toFixed(2)} pts`, className: "trend-up" };
  }

  if (current < previous) {
    return { label: `Down ${Number(previous - current).toFixed(2)} pts`, className: "trend-down" };
  }

  return { label: "No change", className: "trend-neutral" };
}
function getQAStatus(score) {
    const value = Number(score || 0);
  
    if (value >= 85) {
      return { className: "qa-green" };
    }
    if (value >= 70) {
      return { className: "qa-yellow" };
    }
    return { className: "qa-red" };
  }

export default function QAAdmin() {
  const [activeTab, setActiveTab] = useState("site");
  const [leaders, setLeaders] = useState([]);
  const [qaItems, setQaItems] = useState([]);
  const [siteForm, setSiteForm] = useState(emptySiteForm);
  const [leaderForm, setLeaderForm] = useState(emptyLeaderForm);
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [editingLeaderId, setEditingLeaderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    return qaItems.filter((item) => !!item.leader_id);
  }, [qaItems]);

  const latestSiteSummary = useMemo(() => {
    if (siteItems.length === 0) {
      return { current: "—", trend: { label: "No data", className: "trend-neutral" } };
    }

    const current = Number(siteItems[0].qa_score || 0);
    const previous = siteItems[1] ? Number(siteItems[1].qa_score || 0) : null;

    return {
      current: current.toFixed(2),
      trend: getTrend(current, previous),
    };
  }, [siteItems]);

  const latestLeaderSummary = useMemo(() => {
    if (leaderItems.length === 0) {
      return { current: "—", trend: { label: "No data", className: "trend-neutral" } };
    }

    const current = Number(leaderItems[0].qa_score || 0);
    const previous = leaderItems[1] ? Number(leaderItems[1].qa_score || 0) : null;

    return {
      current: current.toFixed(2),
      trend: getTrend(current, previous),
    };
  }, [leaderItems]);

  const handleSiteChange = (e) => {
    const { name, value } = e.target;
    setSiteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeaderChange = (e) => {
    const { name, value } = e.target;
    setLeaderForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetSiteForm = () => {
    setSiteForm(emptySiteForm);
    setEditingSiteId(null);
  };

  const resetLeaderForm = () => {
    setLeaderForm(emptyLeaderForm);
    setEditingLeaderId(null);
  };

  const handleEditSite = (item) => {
    setActiveTab("site");
    setEditingSiteId(item.id);
    setSiteForm({
      score_month: item.score_month || "",
      qa_score: item.qa_score ?? "",
      notes: item.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditLeader = (item) => {
    setActiveTab("leader");
    setEditingLeaderId(item.id);
    setLeaderForm({
      score_month: item.score_month || "",
      leader_id: item.leader_id || "",
      qa_score: item.qa_score ?? "",
      notes: item.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitSite = async (e) => {
    e.preventDefault();
    setPageError("");

    if (!siteForm.score_month) {
      setPageError("Please select a month.");
      return;
    }

    if (siteForm.qa_score === "" || Number(siteForm.qa_score) < 0) {
      setPageError("Please enter a valid site QA score.");
      return;
    }

    setSubmitting(true);

    const payload = {
      score_month: siteForm.score_month,
      leader_id: null,
      qa_score: Number(siteForm.qa_score),
      notes: siteForm.notes || null,
    };

    let error = null;

    if (editingSiteId) {
      const res = await supabase
        .from("monthly_qa_scores")
        .update(payload)
        .eq("id", editingSiteId);
      error = res.error;
    } else {
      const res = await supabase.from("monthly_qa_scores").insert([payload]);
      error = res.error;
    }

    if (error) {
      setPageError(error.message);
      setSubmitting(false);
      return;
    }

    resetSiteForm();
    await loadPageData();
    setSubmitting(false);
  };

  const handleSubmitLeader = async (e) => {
    e.preventDefault();
    setPageError("");

    if (!leaderForm.score_month || !leaderForm.leader_id) {
      setPageError("Please select a month and leader.");
      return;
    }

    if (leaderForm.qa_score === "" || Number(leaderForm.qa_score) < 0) {
      setPageError("Please enter a valid leader QA score.");
      return;
    }

    setSubmitting(true);

    const payload = {
      score_month: leaderForm.score_month,
      leader_id: leaderForm.leader_id,
      qa_score: Number(leaderForm.qa_score),
      notes: leaderForm.notes || null,
    };

    let error = null;

    if (editingLeaderId) {
      const res = await supabase
        .from("monthly_qa_scores")
        .update(payload)
        .eq("id", editingLeaderId);
      error = res.error;
    } else {
      const res = await supabase.from("monthly_qa_scores").insert([payload]);
      error = res.error;
    }

    if (error) {
      setPageError(error.message);
      setSubmitting(false);
      return;
    }

    resetLeaderForm();
    await loadPageData();
    setSubmitting(false);
  };

  const handleRemove = async (id) => {
    const confirmed = window.confirm("Remove this QA entry?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("monthly_qa_scores")
      .delete()
      .eq("id", id);

    if (error) {
      setPageError(error.message);
      return;
    }

    if (editingSiteId === id) resetSiteForm();
    if (editingLeaderId === id) resetLeaderForm();

    await loadPageData();
  };

  return (
    <Layout title="QA Performance" links={adminLinks}>
      <div className="card">
        <h2 className="section-title">QA Performance Tracker</h2>
        <p className="section-subtext">
          Track monthly site QA and each leader’s team average in one clean place.
        </p>

        <div className="sales-tab-row">
          <button
            type="button"
            className={`sales-tab-btn ${activeTab === "site" ? "sales-tab-active" : ""}`}
            onClick={() => setActiveTab("site")}
          >
            Site QA
          </button>
          <button
            type="button"
            className={`sales-tab-btn ${activeTab === "leader" ? "sales-tab-active" : ""}`}
            onClick={() => setActiveTab("leader")}
          >
            Leader QA
          </button>
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

        {activeTab === "site" ? (
          <form onSubmit={handleSubmitSite} className="pto-form">
            <div className="form-grid">
              <div className="form-field">
                <label>Month</label>
                <input
                  type="date"
                  name="score_month"
                  value={siteForm.score_month}
                  onChange={handleSiteChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Site QA Score</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="qa_score"
                  value={siteForm.qa_score}
                  onChange={handleSiteChange}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Notes</label>
              <textarea
                name="notes"
                value={siteForm.notes}
                onChange={handleSiteChange}
                rows="3"
                placeholder="Optional notes"
              />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting
                  ? editingSiteId
                    ? "Updating..."
                    : "Saving..."
                  : editingSiteId
                  ? "Update Site QA"
                  : "Add Site QA"}
              </button>

              {editingSiteId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetSiteForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitLeader} className="pto-form">
            <div className="form-grid">
              <div className="form-field">
                <label>Month</label>
                <input
                  type="date"
                  name="score_month"
                  value={leaderForm.score_month}
                  onChange={handleLeaderChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Leader</label>
                <select
                  name="leader_id"
                  value={leaderForm.leader_id}
                  onChange={handleLeaderChange}
                  required
                >
                  <option value="">Select leader</option>
                  {leaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Leader Team QA Score</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="qa_score"
                  value={leaderForm.qa_score}
                  onChange={handleLeaderChange}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Notes</label>
              <textarea
                name="notes"
                value={leaderForm.notes}
                onChange={handleLeaderChange}
                rows="3"
                placeholder="Optional notes"
              />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting
                  ? editingLeaderId
                    ? "Updating..."
                    : "Saving..."
                  : editingLeaderId
                  ? "Update Leader QA"
                  : "Add Leader QA"}
              </button>

              {editingLeaderId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetLeaderForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">
          {activeTab === "site" ? "Site QA Snapshot" : "Leader QA Snapshot"}
        </h2>

        <div className="sales-summary-grid">
          <div className="sales-summary-box">
            <div className="sales-summary-label">Latest Score</div>
            <div className="sales-summary-value">
              {activeTab === "site" ? latestSiteSummary.current : latestLeaderSummary.current}%
            </div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Month over Month</div>
            <div
              className={`sales-summary-value ${
                activeTab === "site"
                  ? latestSiteSummary.trend.className
                  : latestLeaderSummary.trend.className
              }`}
              style={{ fontSize: "18px" }}
            >
              {activeTab === "site"
                ? latestSiteSummary.trend.label
                : latestLeaderSummary.trend.label}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">
          {activeTab === "site" ? "Site Monthly QA History" : "Leader Monthly QA History"}
        </h2>

        {loading ? (
          <p>Loading QA entries...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  {activeTab === "leader" && <th>Leader</th>}
                  <th>QA Score</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === "site" ? siteItems : leaderItems).length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === "site" ? 4 : 5}>
                      No QA entries found.
                    </td>
                  </tr>
                ) : (
                  (activeTab === "site" ? siteItems : leaderItems).map((item) => (
                    <tr key={item.id}>
                      <td>{formatMonthDisplay(item.score_month)}</td>
                      {activeTab === "leader" && (
                        <td>{item.leaders?.name || "Unknown"}</td>
                      )}
                      <td>{Number(item.qa_score || 0).toFixed(2)}%</td>
                      <td>{item.notes || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() =>
                              activeTab === "site"
                                ? handleEditSite(item)
                                : handleEditLeader(item)
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleRemove(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}