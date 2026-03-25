import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pto", label: "Leadership PTO" },
  { to: "/admin/training", label: "Weekly Training" },
  { to: "/admin/sales", label: "Daily Sales" },
];

const emptySiteForm = {
  sales_date: "",
  sales_target: "",
  points_achieved: "",
  notes: "",
};

const emptyLeaderForm = {
  sales_date: "",
  leader_id: "",
  sales_target: "",
  points_achieved: "",
  notes: "",
};

function getPercentToTarget(target, achieved) {
  const targetNum = Number(target || 0);
  const achievedNum = Number(achieved || 0);
  if (targetNum <= 0) return 0;
  return Number(((achievedNum / targetNum) * 100).toFixed(2));
}

function getStatusConfig(percent) {
  if (percent >= 100) {
    return { label: "Green", className: "status-green" };
  }
  if (percent >= 85) {
    return { label: "Yellow", className: "status-yellow" };
  }
  if (percent >= 70) {
    return { label: "Orange", className: "status-orange" };
  }
  return { label: "Red", className: "status-red" };
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
function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function sortByDateDesc(items) {
  return [...items].sort((a, b) =>
    (b.sales_date || "").localeCompare(a.sales_date || "")
  );
}

export default function SalesTrackerAdmin() {
  const [activeTab, setActiveTab] = useState("site");
  const [dateView, setDateView] = useState("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [leaderFilter, setLeaderFilter] = useState("");

  const [leaders, setLeaders] = useState([]);
  const [siteSalesItems, setSiteSalesItems] = useState([]);
  const [leaderSalesItems, setLeaderSalesItems] = useState([]);

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

    const [leadersRes, siteRes, leaderRes] = await Promise.all([
      supabase
        .from("leaders")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true }),

      supabase
        .from("site_daily_sales")
        .select("id, sales_date, sales_target, points_achieved, notes, created_at")
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
          created_at,
          leaders (name)
        `)
        .order("sales_date", { ascending: false })
        .order("created_at", { ascending: false }),
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
      sales_date: item.sales_date || "",
      sales_target: item.sales_target ?? "",
      points_achieved: item.points_achieved ?? "",
      notes: item.notes || "",
    });
    setPageError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditLeader = (item) => {
    setActiveTab("leader");
    setEditingLeaderId(item.id);
    setLeaderForm({
      sales_date: item.sales_date || "",
      leader_id: item.leader_id || "",
      sales_target: item.sales_target ?? "",
      points_achieved: item.points_achieved ?? "",
      notes: item.notes || "",
    });
    setPageError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitSite = async (e) => {
    e.preventDefault();
    setPageError("");

    if (!siteForm.sales_date) {
      setPageError("Please select a date.");
      return;
    }

    if (siteForm.sales_target === "" || Number(siteForm.sales_target) < 0) {
      setPageError("Please enter a valid site sales target.");
      return;
    }

    if (siteForm.points_achieved === "" || Number(siteForm.points_achieved) < 0) {
      setPageError("Please enter valid site points achieved.");
      return;
    }

    setSubmitting(true);

    const payload = {
      sales_date: siteForm.sales_date,
      sales_target: Number(siteForm.sales_target),
      points_achieved: Number(siteForm.points_achieved),
      notes: siteForm.notes || null,
    };

    let error = null;

    if (editingSiteId) {
      const res = await supabase
        .from("site_daily_sales")
        .update(payload)
        .eq("id", editingSiteId);
      error = res.error;
    } else {
      const res = await supabase.from("site_daily_sales").insert([payload]);
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

    if (!leaderForm.sales_date || !leaderForm.leader_id) {
      setPageError("Please select a date and leader.");
      return;
    }

    if (leaderForm.sales_target === "" || Number(leaderForm.sales_target) < 0) {
      setPageError("Please enter a valid leader sales target.");
      return;
    }

    if (leaderForm.points_achieved === "" || Number(leaderForm.points_achieved) < 0) {
      setPageError("Please enter valid leader points achieved.");
      return;
    }

    setSubmitting(true);

    const payload = {
      sales_date: leaderForm.sales_date,
      leader_id: leaderForm.leader_id,
      sales_target: Number(leaderForm.sales_target),
      points_achieved: Number(leaderForm.points_achieved),
      notes: leaderForm.notes || null,
    };

    let error = null;

    if (editingLeaderId) {
      const res = await supabase
        .from("leader_daily_sales")
        .update(payload)
        .eq("id", editingLeaderId);
      error = res.error;
    } else {
      const res = await supabase.from("leader_daily_sales").insert([payload]);
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

  const handleRemoveSite = async (id) => {
    const confirmed = window.confirm("Remove this site sales entry?");
    if (!confirmed) return;

    const { error } = await supabase.from("site_daily_sales").delete().eq("id", id);

    if (error) {
      setPageError(error.message);
      return;
    }

    if (editingSiteId === id) resetSiteForm();
    await loadPageData();
  };

  const handleRemoveLeader = async (id) => {
    const confirmed = window.confirm("Remove this leader sales entry?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("leader_daily_sales")
      .delete()
      .eq("id", id);

    if (error) {
      setPageError(error.message);
      return;
    }

    if (editingLeaderId === id) resetLeaderForm();
    await loadPageData();
  };

  const applyDateViewFilter = useCallback(
    (item) => {
      if (selectedDate) {
        return item.sales_date === selectedDate;
      }

      if (dateView === "today") return isSameDay(item.sales_date);
      if (dateView === "week") return isThisWeek(item.sales_date);
      if (dateView === "month") return isThisMonth(item.sales_date);
      if (dateView === "quarter") return isThisQuarter(item.sales_date);

      return true;
    },
    [dateView, selectedDate]
  );

  const filteredSiteItems = useMemo(() => {
    return sortByDateDesc(siteSalesItems.filter((item) => applyDateViewFilter(item)));
  }, [siteSalesItems, applyDateViewFilter]);

  const filteredLeaderItems = useMemo(() => {
    return sortByDateDesc(
      leaderSalesItems.filter((item) => {
        const matchesLeader = !leaderFilter || item.leader_id === leaderFilter;
        return matchesLeader && applyDateViewFilter(item);
      })
    );
  }, [leaderSalesItems, leaderFilter, applyDateViewFilter]);

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

  const activeSummary = activeTab === "site" ? siteSummary : leaderSummary;

  return (
    <Layout title="Daily Sales" links={adminLinks}>
      <div className="card">
        <h2 className="section-title">Daily Sales Tracker</h2>
        <p className="section-subtext">
          Track site performance and individual leader performance without adding extra pages.
        </p>

        <div className="sales-tab-row">
          <button
            type="button"
            className={`sales-tab-btn ${activeTab === "site" ? "sales-tab-active" : ""}`}
            onClick={() => setActiveTab("site")}
          >
            Site Sales
          </button>
          <button
            type="button"
            className={`sales-tab-btn ${activeTab === "leader" ? "sales-tab-active" : ""}`}
            onClick={() => setActiveTab("leader")}
          >
            Leader Sales
          </button>
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

        {activeTab === "site" ? (
          <form onSubmit={handleSubmitSite} className="pto-form">
            <div className="form-grid">
              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  name="sales_date"
                  value={siteForm.sales_date}
                  onChange={handleSiteChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Site Sales Target</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="sales_target"
                  value={siteForm.sales_target}
                  onChange={handleSiteChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Site Points Achieved</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="points_achieved"
                  value={siteForm.points_achieved}
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
                  ? "Update Site Entry"
                  : "Add Site Entry"}
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
                <label>Date</label>
                <input
                  type="date"
                  name="sales_date"
                  value={leaderForm.sales_date}
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
                <label>Leader Sales Target</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="sales_target"
                  value={leaderForm.sales_target}
                  onChange={handleLeaderChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Leader Points Achieved</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="points_achieved"
                  value={leaderForm.points_achieved}
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
                  ? "Update Leader Entry"
                  : "Add Leader Entry"}
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
          {activeTab === "site" ? "Sales Snapshot" : "Leader Snapshot"}
        </h2>
        <p className="section-subtext">
          Filter the data below by range or by a specific date.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "end",
            marginBottom: "16px",
          }}
        >
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

        <div className="sales-summary-grid">
          <div className="sales-summary-box">
            <div className="sales-summary-label">Total Target</div>
            <div className="sales-summary-value">{activeSummary.totalTarget}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Total Achieved</div>
            <div className="sales-summary-value">{activeSummary.totalAchieved}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Percent to Target</div>
            <div className="sales-summary-value">
              {activeSummary.percent.toFixed(2)}%
            </div>
          </div>

          <div className={`sales-summary-box ${activeSummary.status.className}`}>
            <div className="sales-summary-label">Status</div>
            <div className="sales-summary-value">{activeSummary.status.label}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">
          {activeTab === "site" ? "Site Daily Sales Entries" : "Leader Daily Sales Entries"}
        </h2>

        {loading ? (
          <p>Loading sales entries...</p>
        ) : activeTab === "site" ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Target</th>
                  <th>Achieved</th>
                  <th>Percent to Target</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSiteItems.length === 0 ? (
                  <tr>
                    <td colSpan="7">No site sales entries found for this view.</td>
                  </tr>
                ) : (
                  filteredSiteItems.map((item) => {
                    const percent = getPercentToTarget(
                      item.sales_target,
                      item.points_achieved
                    );
                    const status = getStatusConfig(percent);

                    return (
                      <tr key={item.id}>
                        <td>{formatDateDisplay(item.sales_date)}</td>
                        <td>{Number(item.sales_target || 0).toFixed(2)}</td>
                        <td>{Number(item.points_achieved || 0).toFixed(2)}</td>
                        <td>{percent.toFixed(2)}%</td>
                        <td>
                          <span className={`status-pill ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>{item.notes || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEditSite(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleRemoveSite(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Leader</th>
                  <th>Target</th>
                  <th>Achieved</th>
                  <th>Percent to Target</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderItems.length === 0 ? (
                  <tr>
                    <td colSpan="8">No leader sales entries found for this view.</td>
                  </tr>
                ) : (
                  filteredLeaderItems.map((item) => {
                    const percent = getPercentToTarget(
                      item.sales_target,
                      item.points_achieved
                    );
                    const status = getStatusConfig(percent);

                    return (
                      <tr key={item.id}>
                        <td>{formatDateDisplay(item.sales_date)}</td>
                        <td>{item.leaders?.name || "Unknown"}</td>
                        <td>{Number(item.sales_target || 0).toFixed(2)}</td>
                        <td>{Number(item.points_achieved || 0).toFixed(2)}</td>
                        <td>{percent.toFixed(2)}%</td>
                        <td>
                          <span className={`status-pill ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>{item.notes || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEditLeader(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleRemoveLeader(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}