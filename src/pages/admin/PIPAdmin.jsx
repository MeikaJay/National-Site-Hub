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
  team_name: "",
  leader_name: "",
  pip_month: "",
  pip_type: "",
  issue_category: "",
  start_date: "",
  review_date: "",
  status: "Open",
  expectations: "",
  action_steps: "",
  notes: "",
};

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

function getTodayStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PIPAdmin() {
  const [formData, setFormData] = useState(emptyForm);
  const [pipRecords, setPipRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  useEffect(() => {
    fetchPIPRecords();
  }, []);

  async function fetchPIPRecords() {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("pip_tracker")
        .select("*")
        .order("pip_month", { ascending: false })
        .order("employee_name", { ascending: true });

      if (error) throw error;

      setPipRecords(data || []);
    } catch (error) {
      console.error("Error loading PIP records:", error.message);
      setMessage("Unable to load PIP records.");
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

    if (!formData.team_name.trim()) {
      setMessage("Team name is required.");
      return;
    }

    if (!formData.pip_month.trim()) {
      setMessage("PIP month is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        employee_name: formData.employee_name.trim(),
        team_name: formData.team_name.trim(),
        leader_name: formData.leader_name.trim(),
        pip_month: formData.pip_month.trim(),
        pip_type: formData.pip_type.trim(),
        issue_category: formData.issue_category.trim(),
        start_date: formData.start_date || null,
        review_date: formData.review_date || null,
        status: formData.status,
        expectations: formData.expectations.trim(),
        action_steps: formData.action_steps.trim(),
        notes: formData.notes.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("pip_tracker")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setMessage("PIP record updated successfully.");
      } else {
        const { error } = await supabase
          .from("pip_tracker")
          .insert([payload]);

        if (error) throw error;

        setMessage("PIP record added successfully.");
      }

      resetForm();
      fetchPIPRecords();
    } catch (error) {
      console.error("Error saving PIP record:", error.message);
      setMessage("There was an error saving the PIP record.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record) {
    setEditingId(record.id);
    setFormData({
      employee_name: record.employee_name || "",
      team_name: record.team_name || "",
      leader_name: record.leader_name || "",
      pip_month: record.pip_month || "",
      pip_type: record.pip_type || "",
      issue_category: record.issue_category || "",
      start_date: record.start_date || "",
      review_date: record.review_date || "",
      status: record.status || "Open",
      expectations: record.expectations || "",
      action_steps: record.action_steps || "",
      notes: record.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this PIP record?");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("pip_tracker")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMessage("PIP record deleted.");
      fetchPIPRecords();
    } catch (error) {
      console.error("Error deleting PIP record:", error.message);
      setMessage("There was an error deleting the PIP record.");
    }
  }

  const teamOptions = useMemo(() => {
    const teams = [...new Set(pipRecords.map((item) => item.team_name || "").filter(Boolean))];
    return teams.sort((a, b) => a.localeCompare(b));
  }, [pipRecords]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return pipRecords.filter((record) => {
      const matchesSearch =
        !term ||
        (record.employee_name || "").toLowerCase().includes(term) ||
        (record.team_name || "").toLowerCase().includes(term) ||
        (record.leader_name || "").toLowerCase().includes(term) ||
        (record.pip_month || "").toLowerCase().includes(term) ||
        (record.pip_type || "").toLowerCase().includes(term) ||
        (record.issue_category || "").toLowerCase().includes(term) ||
        (record.status || "").toLowerCase().includes(term);

      const matchesTeam = !teamFilter || record.team_name === teamFilter;

      return matchesSearch && matchesTeam;
    });
  }, [pipRecords, searchTerm, teamFilter]);

  function handleExportExcel() {
    if (filteredRecords.length === 0) {
      setMessage("There are no PIP records to export.");
      return;
    }

    const headers = [
      "Employee",
      "Team",
      "Leader",
      "PIP Month",
      "PIP Type",
      "Issue Category",
      "Start Date",
      "Review Date",
      "Status",
      "Expectations",
      "Action Steps",
      "Notes",
    ];

    const rows = filteredRecords.map((record) => [
      record.employee_name || "",
      record.team_name || "",
      record.leader_name || "",
      record.pip_month || "",
      record.pip_type || "",
      record.issue_category || "",
      record.start_date || "",
      record.review_date || "",
      record.status || "",
      record.expectations || "",
      record.action_steps || "",
      record.notes || "",
    ]);

    const csvContent = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) => row.map(escapeCsvValue).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pip_records_${getTodayStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage("PIP records exported successfully.");
  }

  return (
    <Layout title="PIP Tracker" links={adminLinks}>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <h2 style={styles.pageTitle}>PIP Tracker</h2>
          <p style={styles.pageText}>
            Add and manage monthly PIP records. Filter by team to keep the view clean and easy to work from.
          </p>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <form onSubmit={handleSubmit} style={styles.card}>
          <h3 style={styles.sectionTitle}>
            {editingId ? "Edit PIP Record" : "Add PIP Record"}
          </h3>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Employee Name</label>
              <input
                name="employee_name"
                value={formData.employee_name}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Team Name</label>
              <input
                name="team_name"
                value={formData.team_name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Beast City, Goal Hunters, etc."
              />
            </div>

            <div>
              <label style={styles.label}>Leader Name</label>
              <input
                name="leader_name"
                value={formData.leader_name}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>PIP Month</label>
              <input
                name="pip_month"
                value={formData.pip_month}
                onChange={handleChange}
                style={styles.input}
                placeholder="April 2026"
              />
            </div>

            <div>
              <label style={styles.label}>PIP Type</label>
              <select
                name="pip_type"
                value={formData.pip_type}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Select type</option>
                <option value="Informal">Informal</option>
                <option value="Formal">Formal</option>
                <option value="Written">Written</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Issue Category</label>
              <select
                name="issue_category"
                value={formData.issue_category}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Select category</option>
                <option value="Attendance">Attendance</option>
                <option value="Performance">Performance</option>
                <option value="QA">QA</option>
                <option value="Productivity">Productivity</option>
                <option value="Behavior">Behavior</option>
                <option value="Compliance">Compliance</option>
                <option value="Other">Other</option>
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
              <label style={styles.label}>Review Date</label>
              <input
                type="date"
                name="review_date"
                value={formData.review_date}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Extended">Extended</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div style={styles.textBlock}>
            <label style={styles.label}>Expectations</label>
            <textarea
              name="expectations"
              value={formData.expectations}
              onChange={handleChange}
              style={styles.textarea}
              rows={4}
            />
          </div>

          <div style={styles.textBlock}>
            <label style={styles.label}>Action Steps</label>
            <textarea
              name="action_steps"
              value={formData.action_steps}
              onChange={handleChange}
              style={styles.textarea}
              rows={4}
            />
          </div>

          <div style={styles.textBlock}>
            <label style={styles.label}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              style={styles.textarea}
              rows={4}
            />
          </div>

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update PIP Record" : "Add PIP Record"}
            </button>

            <button type="button" style={styles.secondaryButton} onClick={resetForm}>
              Clear
            </button>
          </div>
        </form>

        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>Current PIP Records</h3>
            <div style={styles.filterRow}>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                style={styles.searchInput}
              >
                <option value="">All Teams</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee, leader, month, team, or status"
                style={styles.searchInput}
              />

              <button
                type="button"
                style={styles.exportButton}
                onClick={handleExportExcel}
              >
                Export to Excel
              </button>
            </div>
          </div>

          {loading ? (
            <p style={styles.pageText}>Loading PIP records...</p>
          ) : filteredRecords.length === 0 ? (
            <p style={styles.pageText}>No PIP records found.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Team</th>
                    <th style={styles.th}>Leader</th>
                    <th style={styles.th}>Month</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Start</th>
                    <th style={styles.th}>Review</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Expectations</th>
                    <th style={styles.th}>Action Steps</th>
                    <th style={styles.th}>Notes</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>{record.employee_name}</td>
                      <td style={styles.td}>{record.team_name}</td>
                      <td style={styles.td}>{record.leader_name}</td>
                      <td style={styles.td}>{record.pip_month}</td>
                      <td style={styles.td}>{record.pip_type}</td>
                      <td style={styles.td}>{record.issue_category}</td>
                      <td style={styles.td}>{record.start_date}</td>
                      <td style={styles.td}>{record.review_date}</td>
                      <td style={styles.td}>{record.status}</td>
                      <td style={styles.td}>{record.expectations}</td>
                      <td style={styles.td}>{record.action_steps}</td>
                      <td style={styles.td}>{record.notes}</td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button type="button" style={styles.editButton} onClick={() => handleEdit(record)}>
                            Edit
                          </button>
                          <button type="button" style={styles.deleteButton} onClick={() => handleDelete(record.id)}>
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
  page: { display: "flex", flexDirection: "column", gap: "20px" },
  headerCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  card: {
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
  textBlock: {
    marginTop: "16px",
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
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  filterRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchInput: {
    minWidth: "220px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#fff",
  },
  exportButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "12px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1500px",
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