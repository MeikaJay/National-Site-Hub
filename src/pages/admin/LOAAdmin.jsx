import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/leaders", label: "Leaders" },
  { to: "/admin/agents", label: "Agents" },
  { to: "/admin/pto", label: "Leadership PTO" },
  { to: "/admin/training", label: "Weekly Training" },
  { to: "/admin/attendance", label: "Attendance" },
  { to: "/admin/loa", label: "LOA" },
  { to: "/admin/pips", label: "PIPs" },
  { to: "/admin/schedules", label: "Schedules" },
];

const emptyForm = {
  employee_name: "",
  leader_name: "",
  loa_type: "",
  start_date: "",
  expected_return_date: "",
  actual_return_date: "",
  status: "Active",
  notes: "",
};

export default function LOAAdmin() {
  const [formData, setFormData] = useState(emptyForm);
  const [loaRecords, setLoaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLOARecords();
  }, []);

  async function fetchLOARecords() {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("loa_tracker")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLoaRecords(data || []);
    } catch (error) {
      console.error("Error loading LOA records:", error.message);
      setMessage("Unable to load LOA records.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.employee_name.trim()) {
      setMessage("Employee name is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        employee_name: formData.employee_name.trim(),
        leader_name: formData.leader_name.trim(),
        loa_type: formData.loa_type.trim(),
        start_date: formData.start_date || null,
        expected_return_date: formData.expected_return_date || null,
        actual_return_date: formData.actual_return_date || null,
        status: formData.status,
        notes: formData.notes.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("loa_tracker")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setMessage("LOA record updated successfully.");
      } else {
        const { error } = await supabase
          .from("loa_tracker")
          .insert([payload]);

        if (error) throw error;

        setMessage("LOA record added successfully.");
      }

      resetForm();
      fetchLOARecords();
    } catch (error) {
      console.error("Error saving LOA record:", error.message);
      setMessage("There was an error saving the LOA record.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record) {
    setEditingId(record.id);
    setFormData({
      employee_name: record.employee_name || "",
      leader_name: record.leader_name || "",
      loa_type: record.loa_type || "",
      start_date: record.start_date || "",
      expected_return_date: record.expected_return_date || "",
      actual_return_date: record.actual_return_date || "",
      status: record.status || "Active",
      notes: record.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this LOA record?");
    if (!confirmed) return;

    try {
      setMessage("");

      const { error } = await supabase
        .from("loa_tracker")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMessage("LOA record deleted.");
      fetchLOARecords();
    } catch (error) {
      console.error("Error deleting LOA record:", error.message);
      setMessage("There was an error deleting the LOA record.");
    }
  }

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return loaRecords;

    return loaRecords.filter((record) => {
      return (
        (record.employee_name || "").toLowerCase().includes(term) ||
        (record.leader_name || "").toLowerCase().includes(term) ||
        (record.loa_type || "").toLowerCase().includes(term) ||
        (record.status || "").toLowerCase().includes(term)
      );
    });
  }, [loaRecords, searchTerm]);

  return (
    <Layout title="LOA Tracker" links={adminLinks}>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <h2 style={styles.pageTitle}>LOA Tracker</h2>
          <p style={styles.pageText}>
            Add, update, and manage leave of absence records for the site.
          </p>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3 style={styles.sectionTitle}>
            {editingId ? "Edit LOA Record" : "Add LOA Record"}
          </h3>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Employee Name</label>
              <input
                type="text"
                name="employee_name"
                value={formData.employee_name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter employee name"
              />
            </div>

            <div>
              <label style={styles.label}>Leader Name</label>
              <input
                type="text"
                name="leader_name"
                value={formData.leader_name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter leader name"
              />
            </div>

            <div>
              <label style={styles.label}>LOA Type</label>
              <select
                name="loa_type"
                value={formData.loa_type}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Select type</option>
                <option value="Medical">Medical</option>
                <option value="Personal">Personal</option>
                <option value="FMLA">FMLA</option>
                <option value="Parental">Parental</option>
                <option value="Intermittent">Intermittent</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="Active">Active</option>
                <option value="Pending Return">Pending Return</option>
                <option value="Returned">Returned</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Expected Return Date</label>
              <input
                type="date"
                name="expected_return_date"
                value={formData.expected_return_date}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Actual Return Date</label>
              <input
                type="date"
                name="actual_return_date"
                value={formData.actual_return_date}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <label style={styles.label}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              style={styles.textarea}
              rows={4}
              placeholder="Add important details here"
            />
          </div>

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update LOA Record"
                : "Add LOA Record"}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={resetForm}
            >
              Clear
            </button>
          </div>
        </form>

        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3 style={styles.sectionTitle}>Current LOA Records</h3>
            <input
              type="text"
              placeholder="Search records"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {loading ? (
            <p style={styles.pageText}>Loading records...</p>
          ) : filteredRecords.length === 0 ? (
            <p style={styles.pageText}>No LOA records found.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Leader</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Start</th>
                    <th style={styles.th}>Expected Return</th>
                    <th style={styles.th}>Actual Return</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Notes</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>{record.employee_name || ""}</td>
                      <td style={styles.td}>{record.leader_name || ""}</td>
                      <td style={styles.td}>{record.loa_type || ""}</td>
                      <td style={styles.td}>{record.start_date || ""}</td>
                      <td style={styles.td}>
                        {record.expected_return_date || ""}
                      </td>
                      <td style={styles.td}>
                        {record.actual_return_date || ""}
                      </td>
                      <td style={styles.td}>{record.status || ""}</td>
                      <td style={styles.td}>{record.notes || ""}</td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            type="button"
                            style={styles.editButton}
                            onClick={() => handleEdit(record)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={styles.deleteButton}
                            onClick={() => handleDelete(record.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  headerCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  pageTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800",
    color: "#0f172a",
  },
  pageText: {
    marginTop: "8px",
    marginBottom: 0,
    color: "#475569",
    fontSize: "15px",
  },
  message: {
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#ecfdf5",
    color: "#166534",
    fontWeight: "600",
  },
  formCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  listCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "700",
    color: "#334155",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#fff",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "12px",
    background: "#0f172a",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "12px 18px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#fff",
    color: "#0f172a",
    fontWeight: "700",
    cursor: "pointer",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  searchInput: {
    minWidth: "240px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1100px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "2px solid #e2e8f0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "800",
    background: "#f8fafc",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: "14px",
    verticalAlign: "top",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  editButton: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "10px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: "700",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "10px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontWeight: "700",
    cursor: "pointer",
  },
};