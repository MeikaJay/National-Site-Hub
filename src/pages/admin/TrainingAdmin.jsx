import { useCallback, useEffect, useMemo, useState } from "react";
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
  host_leader_id: "",
  topic: "",
  status: "scheduled",
  notes: "",
};

const emptySessionForm = {
  session_date: "",
  session_time: "",
  notes: "",
};

function formatTimeForDisplay(timeValue) {
  if (!timeValue) return "—";

  const clean = String(timeValue).slice(0, 5);
  const [hourString, minuteString] = clean.split(":");
  const hour = Number(hourString);
  const minute = minuteString || "00";

  if (Number.isNaN(hour)) return timeValue;

  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;

  return `${twelveHour}:${minute} ${suffix}`;
}

function formatWeekRange(startDate, endDate) {
  if (!startDate && !endDate) return "—";
  if (!startDate) return endDate;
  if (!endDate) return startDate;
  return `${startDate} to ${endDate}`;
}

export default function TrainingAdmin() {
  const [leaders, setLeaders] = useState([]);
  const [trainingItems, setTrainingItems] = useState([]);
  const [sessionItems, setSessionItems] = useState([]);

  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [openTrainingId, setOpenTrainingId] = useState("");

  const [formData, setFormData] = useState(emptyForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [leadersRes, trainingsRes, sessionsRes] = await Promise.all([
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
          host_leader_id,
          topic,
          status,
          notes,
          leaders (name)
        `)
        .order("training_start_date", { ascending: true }),

      supabase
        .from("weekly_training_sessions")
        .select(`
          id,
          training_id,
          session_date,
          session_time,
          notes,
          created_at
        `)
        .order("session_date", { ascending: true })
        .order("session_time", { ascending: true }),
    ]);

    if (leadersRes.error || trainingsRes.error || sessionsRes.error) {
      setPageError(
        leadersRes.error?.message ||
          trainingsRes.error?.message ||
          sessionsRes.error?.message ||
          "Something went wrong loading training data."
      );
      setLoading(false);
      return;
    }

    setLeaders(leadersRes.data || []);
    setTrainingItems(trainingsRes.data || []);
    setSessionItems(sessionsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const sessionsByTraining = useMemo(() => {
    const grouped = {};

    sessionItems.forEach((session) => {
      const key = session.training_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(session);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const dateCompare = (a.session_date || "").localeCompare(b.session_date || "");
        if (dateCompare !== 0) return dateCompare;
        return String(a.session_time || "").localeCompare(String(b.session_time || ""));
      });
    });

    return grouped;
  }, [sessionItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSessionChange = (e) => {
    const { name, value } = e.target;
    setSessionForm((prev) => ({
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

    return "";
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const resetSessionForm = () => {
    setSessionForm(emptySessionForm);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      training_start_date: item.training_start_date || "",
      training_end_date: item.training_end_date || "",
      host_leader_id: item.host_leader_id || "",
      topic: item.topic || "",
      status: item.status || "scheduled",
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

    const validationMessage = validateTraining();
    if (validationMessage) {
      setPageError(validationMessage);
      return;
    }

    setSubmitting(true);

    let error = null;

    if (editingId) {
      const response = await supabase
        .from("weekly_trainings")
        .update({
          training_start_date: formData.training_start_date,
          training_end_date: formData.training_end_date,
          host_leader_id: formData.host_leader_id,
          topic: formData.topic,
          status: formData.status,
          notes: formData.notes || null,
        })
        .eq("id", editingId);

      error = response.error;
    } else {
      const response = await supabase.from("weekly_trainings").insert([
        {
          training_start_date: formData.training_start_date,
          training_end_date: formData.training_end_date,
          host_leader_id: formData.host_leader_id,
          topic: formData.topic,
          status: formData.status,
          notes: formData.notes || null,
        },
      ]);

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

  const handleRemoveTraining = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this training week?"
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

    if (openTrainingId === id) {
      setOpenTrainingId("");
      resetSessionForm();
    }

    await loadPageData();
  };

  const handleToggleSessions = (trainingId) => {
    setPageError("");
    setOpenTrainingId((prev) => (prev === trainingId ? "" : trainingId));
    resetSessionForm();
  };

  const selectedTraining = trainingItems.find((item) => item.id === openTrainingId);

  const validateSession = () => {
    if (!openTrainingId) {
      return "Please choose a training week first.";
    }

    if (!selectedTraining) {
      return "Selected training week could not be found.";
    }

    if (!sessionForm.session_date || !sessionForm.session_time) {
      return "Please enter both session date and session time.";
    }

    if (sessionForm.session_date < selectedTraining.training_start_date) {
      return "Session date cannot be before the training week start date.";
    }

    if (sessionForm.session_date > selectedTraining.training_end_date) {
      return "Session date cannot be after the training week end date.";
    }

    return "";
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setPageError("");

    const validationMessage = validateSession();
    if (validationMessage) {
      setPageError(validationMessage);
      return;
    }

    setSessionSubmitting(true);

    const { error } = await supabase.from("weekly_training_sessions").insert([
      {
        training_id: openTrainingId,
        session_date: sessionForm.session_date,
        session_time: sessionForm.session_time,
        notes: sessionForm.notes || null,
      },
    ]);

    if (error) {
      setPageError(error.message);
      setSessionSubmitting(false);
      return;
    }

    resetSessionForm();
    await loadPageData();
    setSessionSubmitting(false);
  };

  const handleRemoveSession = async (sessionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this training session?"
    );
    if (!confirmed) return;

    setPageError("");

    const { error } = await supabase
      .from("weekly_training_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      setPageError(error.message);
      return;
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
          Keep the main page focused on the weekly training. Add session times only when needed.
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
          Each row is one weekly training. Open a row only when you need to manage its sessions.
        </p>

        {loading ? (
          <p>Loading training schedule...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Host Leader</th>
                  <th>Week Range</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Sessions</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainingItems.length === 0 ? (
                  <tr>
                    <td colSpan="7">No training entries found.</td>
                  </tr>
                ) : (
                  trainingItems.map((item) => {
                    const sessions = sessionsByTraining[item.id] || [];
                    const isOpen = openTrainingId === item.id;

                    return (
                      <tr key={item.id}>
                        <td>{item.leaders?.name || "Unknown"}</td>
                        <td>
                          {formatWeekRange(
                            item.training_start_date,
                            item.training_end_date
                          )}
                        </td>
                        <td>{item.topic}</td>
                        <td>
                          <span className={`status-pill status-${item.status}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{sessions.length}</td>
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
                              className="secondary-btn"
                              onClick={() => handleToggleSessions(item.id)}
                            >
                              {isOpen ? "Hide Sessions" : "Manage Sessions"}
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleRemoveTraining(item.id)}
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

      {selectedTraining && (
        <div className="card" style={{ marginTop: "20px" }}>
          <h2 className="section-title">Manage Sessions</h2>
          <p className="section-subtext">
            {selectedTraining.topic} • {selectedTraining.leaders?.name || "Unknown"} •{" "}
            {formatWeekRange(
              selectedTraining.training_start_date,
              selectedTraining.training_end_date
            )}
          </p>

          <form onSubmit={handleSessionSubmit} className="pto-form">
            <div className="form-grid">
              <div className="form-field">
                <label>Session Date</label>
                <input
                  type="date"
                  name="session_date"
                  value={sessionForm.session_date}
                  onChange={handleSessionChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Session Time</label>
                <input
                  type="time"
                  name="session_time"
                  value={sessionForm.session_time}
                  onChange={handleSessionChange}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Session Notes</label>
              <textarea
                name="notes"
                value={sessionForm.notes}
                onChange={handleSessionChange}
                placeholder="Optional notes for this session"
                rows="3"
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={sessionSubmitting}
            >
              {sessionSubmitting ? "Saving..." : "Add Session"}
            </button>
          </form>

          <div style={{ marginTop: "20px" }}>
            <h3 className="mini-section-title">Scheduled Sessions</h3>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session Date</th>
                    <th>Start Time</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(sessionsByTraining[selectedTraining.id] || []).length === 0 ? (
                    <tr>
                      <td colSpan="4">No sessions added yet.</td>
                    </tr>
                  ) : (
                    (sessionsByTraining[selectedTraining.id] || []).map((session) => (
                      <tr key={session.id}>
                        <td>{session.session_date}</td>
                        <td>{formatTimeForDisplay(session.session_time)}</td>
                        <td>{session.notes || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleRemoveSession(session.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}