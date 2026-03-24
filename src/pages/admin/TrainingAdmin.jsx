import { useCallback, useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pto", label: "Leadership PTO" },
  { to: "/admin/training", label: "Weekly Training" },
];

const emptyForm = {
  training_start_date: "",
  training_end_date: "",
  session_date: "",
  session_time: "",
  host_leader_id: "",
  topic: "",
  status: "scheduled",
  notes: "",
};

function formatTimeForDisplay(timeValue) {
  if (!timeValue) return "—";

  const [hourString, minuteString] = timeValue.split(":");
  const hour = Number(hourString);
  const minute = minuteString || "00";

  if (Number.isNaN(hour)) return timeValue;

  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;

  return `${twelveHour}:${minute} ${suffix}`;
}

export default function TrainingAdmin() {
  const [leaders, setLeaders] = useState([]);
  const [trainingItems, setTrainingItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(emptyForm);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [leadersRes, trainingsRes] = await Promise.all([
      supabase
        .from("leaders")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true }),

      supabase
        .from("weekly_trainings")
        .select(`
          id,
          training_start_date,
          training_end_date,
          session_date,
          session_time,
          host_leader_id,
          topic,
          status,
          notes,
          leaders (name)
        `)
        .order("session_date", { ascending: true, nullsFirst: false })
        .order("session_time", { ascending: true, nullsFirst: false })
        .order("training_start_date", { ascending: true }),
    ]);

    if (leadersRes.error || trainingsRes.error) {
      setPageError(
        leadersRes.error?.message ||
          trainingsRes.error?.message ||
          "Something went wrong loading training data."
      );
      setLoading(false);
      return;
    }

    setLeaders(leadersRes.data || []);
    setTrainingItems(trainingsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateTraining = () => {
    if (
      !formData.training_start_date ||
      !formData.training_end_date ||
      !formData.host_leader_id ||
      !formData.topic
    ) {
      return "Please complete start date, end date, host leader, and topic.";
    }

    if (formData.training_end_date < formData.training_start_date) {
      return "End date cannot be before start date.";
    }

    if (formData.session_date && formData.session_date < formData.training_start_date) {
      return "Session date cannot be before training start date.";
    }

    if (formData.session_date && formData.session_date > formData.training_end_date) {
      return "Session date cannot be after training end date.";
    }

    return "";
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      training_start_date: item.training_start_date || "",
      training_end_date: item.training_end_date || "",
      session_date: item.session_date || "",
      session_time: item.session_time ? item.session_time.slice(0, 5) : "",
      host_leader_id: item.host_leader_id || "",
      topic: item.topic || "",
      status: item.status || "scheduled",
      notes: item.notes || "",
    });
    setPageError("");
  };

  const handleCancelEdit = () => {
    resetForm();
    setPageError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPageError("");

    const validationMessage = validateTraining();
    if (validationMessage) {
      setPageError(validationMessage);
      return;
    }

    setSubmitting(true);

    const payload = {
      training_start_date: formData.training_start_date,
      training_end_date: formData.training_end_date,
      session_date: formData.session_date || null,
      session_time: formData.session_time || null,
      host_leader_id: formData.host_leader_id,
      topic: formData.topic,
      status: formData.status,
      notes: formData.notes || null,
    };

    let error = null;

    if (editingId) {
      const response = await supabase
        .from("weekly_trainings")
        .update(payload)
        .eq("id", editingId);

      error = response.error;
    } else {
      const response = await supabase
        .from("weekly_trainings")
        .insert([payload]);

      error = response.error;
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
      "Are you sure you want to remove this training entry?"
    );
    if (!confirmed) return;

    setPageError("");

    const { error } = await supabase
      .from("weekly_trainings")
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
    <Layout title="Weekly Training" links={adminLinks}>
      <div className="card">
        <h2 className="section-title">
          {editingId ? "Edit Weekly Training" : "Add Weekly Training"}
        </h2>
        <p className="section-subtext">
          Track the training window, session date, start time, host leader, and topic.
        </p>

        {pageError && <p className="error-text">{pageError}</p>}

        <form onSubmit={handleSubmit} className="pto-form">
          <div className="form-grid">
            <div className="form-field">
              <label>Training Start Date</label>
              <input
                type="date"
                name="training_start_date"
                value={formData.training_start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Training End Date</label>
              <input
                type="date"
                name="training_end_date"
                value={formData.training_end_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Scheduled Training Date</label>
              <input
                type="date"
                name="session_date"
                value={formData.session_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Scheduled Start Time</label>
              <input
                type="time"
                name="session_time"
                value={formData.session_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Host Leader</label>
              <select
                name="host_leader_id"
                value={formData.host_leader_id}
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
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Topic</label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="Enter training topic"
              required
            />
          </div>

          <div className="form-field">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes"
              rows="3"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting
                ? editingId
                  ? "Updating..."
                  : "Saving..."
                : editingId
                ? "Update Training"
                : "Add Training"}
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
        <h2 className="section-title">Current Training Schedule</h2>
        <p className="section-subtext">
          View, edit, and remove weekly training entries.
        </p>

        {loading ? (
          <p>Loading training schedule...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Host Leader</th>
                  <th>Training Start</th>
                  <th>Training End</th>
                  <th>Session Date</th>
                  <th>Start Time</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainingItems.length === 0 ? (
                  <tr>
                    <td colSpan="9">No training entries found.</td>
                  </tr>
                ) : (
                  trainingItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.leaders?.name || "Unknown"}</td>
                      <td>{item.training_start_date}</td>
                      <td>{item.training_end_date}</td>
                      <td>{item.session_date || "—"}</td>
                      <td>{formatTimeForDisplay(item.session_time)}</td>
                      <td>{item.topic}</td>
                      <td>
                        <span className={`status-pill status-${item.status}`}>
                          {item.status}
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