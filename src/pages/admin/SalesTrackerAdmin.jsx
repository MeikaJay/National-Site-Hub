import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pto", label: "Leadership PTO" },
  { to: "/admin/training", label: "Weekly Training" },
  { to: "/admin/sales", label: "Daily Sales" },
];

const emptyForm = {
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
    return {
      label: "Green",
      className: "status-green",
    };
  }

  if (percent >= 85) {
    return {
      label: "Yellow",
      className: "status-yellow",
    };
  }

  if (percent >= 70) {
    return {
      label: "Orange",
      className: "status-orange",
    };
  }

  return {
    label: "Red",
    className: "status-red",
  };
}

export default function SalesTrackerAdmin() {
  const [leaders, setLeaders] = useState([]);
  const [salesItems, setSalesItems] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [leadersRes, salesRes] = await Promise.all([
      supabase
        .from("leaders")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true }),

      supabase
        .from("daily_sales_tracker")
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

    if (leadersRes.error || salesRes.error) {
      setPageError(
        leadersRes.error?.message ||
          salesRes.error?.message ||
          "Something went wrong loading sales data."
      );
      setLoading(false);
      return;
    }

    setLeaders(leadersRes.data || []);
    setSalesItems(salesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const dashboardSummary = useMemo(() => {
    const totalTarget = salesItems.reduce(
      (sum, item) => sum + Number(item.sales_target || 0),
      0
    );

    const totalAchieved = salesItems.reduce(
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
  }, [salesItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      sales_date: item.sales_date || "",
      leader_id: item.leader_id || "",
      sales_target: item.sales_target ?? "",
      points_achieved: item.points_achieved ?? "",
      notes: item.notes || "",
    });
    setPageError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    resetForm();
    setPageError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPageError("");

    if (!formData.sales_date || !formData.leader_id) {
      setPageError("Please select a date and leader.");
      return;
    }

    if (formData.sales_target === "" || Number(formData.sales_target) < 0) {
      setPageError("Please enter a valid sales target.");
      return;
    }

    if (
      formData.points_achieved === "" ||
      Number(formData.points_achieved) < 0
    ) {
      setPageError("Please enter valid points achieved.");
      return;
    }

    setSubmitting(true);

    const payload = {
      sales_date: formData.sales_date,
      leader_id: formData.leader_id,
      sales_target: Number(formData.sales_target),
      points_achieved: Number(formData.points_achieved),
      notes: formData.notes || null,
    };

    let error = null;

    if (editingId) {
      const res = await supabase
        .from("daily_sales_tracker")
        .update(payload)
        .eq("id", editingId);

      error = res.error;
    } else {
      const res = await supabase
        .from("daily_sales_tracker")
        .insert([payload]);

      error = res.error;
    }

    if (error) {
      setPageError(error.message);
      setSubmitting(false);
      return;
    }

    resetForm();
    await loadPageData();
    setSubmitting(false);
  };

  const handleRemove = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this sales entry?"
    );
    if (!confirmed) return;

    setPageError("");

    const { error } = await supabase
      .from("daily_sales_tracker")
      .delete()
      .eq("id", id);

    if (error) {
      setPageError(error.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadPageData();
  };

  return (
    <Layout title="Daily Sales" links={adminLinks}>
      <div className="card">
        <h2 className="section-title">
          {editingId ? "Edit Daily Sales Entry" : "Add Daily Sales Entry"}
        </h2>
        <p className="section-subtext">
          Enter target and points achieved. Percent to target will calculate automatically.
        </p>

        {pageError && <p className="error-text">{pageError}</p>}

        <form onSubmit={handleSubmit} className="pto-form">
          <div className="form-grid">
            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                name="sales_date"
                value={formData.sales_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Leader</label>
              <select
                name="leader_id"
                value={formData.leader_id}
                onChange={handleChange}
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
              <label>Sales Target</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="sales_target"
                value={formData.sales_target}
                onChange={handleChange}
                placeholder="Enter target"
                required
              />
            </div>

            <div className="form-field">
              <label>Points Achieved</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="points_achieved"
                value={formData.points_achieved}
                onChange={handleChange}
                placeholder="Enter achieved"
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Optional notes"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting
                ? editingId
                  ? "Updating..."
                  : "Saving..."
                : editingId
                ? "Update Entry"
                : "Add Entry"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">Sales Snapshot</h2>
        <p className="section-subtext">
          Overall performance based on all visible entries.
        </p>

        <div className="sales-summary-grid">
          <div className="sales-summary-box">
            <div className="sales-summary-label">Total Target</div>
            <div className="sales-summary-value">{dashboardSummary.totalTarget}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Total Achieved</div>
            <div className="sales-summary-value">{dashboardSummary.totalAchieved}</div>
          </div>

          <div className="sales-summary-box">
            <div className="sales-summary-label">Percent to Target</div>
            <div className="sales-summary-value">
              {dashboardSummary.percent.toFixed(2)}%
            </div>
          </div>

          <div className={`sales-summary-box ${dashboardSummary.status.className}`}>
            <div className="sales-summary-label">Status</div>
            <div className="sales-summary-value">{dashboardSummary.status.label}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">Daily Sales Entries</h2>
        <p className="section-subtext">
          View, edit, and remove daily sales records.
        </p>

        {loading ? (
          <p>Loading sales entries...</p>
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
                {salesItems.length === 0 ? (
                  <tr>
                    <td colSpan="8">No sales entries found.</td>
                  </tr>
                ) : (
                  salesItems.map((item) => {
                    const percent = getPercentToTarget(
                      item.sales_target,
                      item.points_achieved
                    );
                    const status = getStatusConfig(percent);

                    return (
                      <tr key={item.id}>
                        <td>{item.sales_date}</td>
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
                              onClick={() => handleEdit(item)}
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