import { useEffect, useMemo, useState } from "react";
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
];

const emptyForm = {
  employee_name: "",
  leader_name: "",
  attendance_date: "",
  attendance_type: "",
  notes: "",
};

const attendanceOptions = [
  { label: "Tardy (6 minutes up to 29 minutes)", value: "Tardy 6 to 29 minutes", points: 0.25 },
  { label: "30 minutes up to 50% of work shift", value: "30 minutes up to 50% of shift", points: 0.5 },
  { label: "Over 50% of work shift", value: "Over 50% of shift", points: 1 },
  { label: "No Call / No Show", value: "No Call No Show", points: 2 },
];

function itemOrZero(value) {
  return Number(value || 0);
}

function getPointsForType(type) {
  const match = attendanceOptions.find((item) => item.value === type);
  return match ? itemOrZero(match.points) : 0;
}

function getActionLevel(total) {
  if (total >= 3) {
    return {
      label: "Corrective Action",
      color: "#b91c1c",
      background: "#fee2e2",
    };
  }

  if (total >= 2) {
    return {
      label: "Coaching and Documentation",
      color: "#b45309",
      background: "#fef3c7",
    };
  }

  return {
    label: "Below Threshold",
    color: "#166534",
    background: "#dcfce7",
  };
}

function getCutoffDate() {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 365);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

function isWithinRolling365(dateString) {
  if (!dateString) return false;
  const recordDate = new Date(`${dateString}T00:00:00`);
  return recordDate >= getCutoffDate();
}

function buildGroupedSummaries(records) {
  const grouped = {};

  records.forEach((record) => {
    const employeeName = (record.employee_name || "").trim();
    if (!employeeName) return;

    const key = employeeName.toLowerCase();

    if (!grouped[key]) {
      grouped[key] = {
        employee_name: employeeName,
        leader_name: record.leader_name || "",
        rolling_total: 0,
        event_count: 0,
        last_attendance_date: "",
        all_records: [],
      };
    }

    grouped[key].all_records.push(record);

    if (isWithinRolling365(record.attendance_date)) {
      grouped[key].rolling_total += itemOrZero(record.occurrence_points);
      grouped[key].event_count += 1;

      if (
        !grouped[key].last_attendance_date ||
        record.attendance_date > grouped[key].last_attendance_date
      ) {
        grouped[key].last_attendance_date = record.attendance_date;
      }
    }

    if (!grouped[key].leader_name && record.leader_name) {
      grouped[key].leader_name = record.leader_name;
    }
  });

  return Object.values(grouped)
    .map((employee) => ({
      ...employee,
      rolling_total: Number(employee.rolling_total.toFixed(2)),
      action_level: getActionLevel(employee.rolling_total),
      all_records: employee.all_records.sort((a, b) =>
        (b.attendance_date || "").localeCompare(a.attendance_date || "")
      ),
    }))
    .sort((a, b) => {
      if (b.rolling_total !== a.rolling_total) {
        return b.rolling_total - a.rolling_total;
      }
      return a.employee_name.localeCompare(b.employee_name);
    });
}

export default function LeaderAttendance() {
  const [formData, setFormData] = useState(emptyForm);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [leaderFilter, setLeaderFilter] = useState("");
  const [openEmployeeKey, setOpenEmployeeKey] = useState("");

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  async function fetchAttendanceRecords() {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("attendance_tracker")
        .select("*")
        .order("attendance_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAttendanceRecords(data || []);
    } catch (error) {
      console.error("Error loading attendance records:", error.message);
      setMessage("Unable to load attendance records.");
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

    if (!formData.attendance_date) {
      setMessage("Attendance date is required.");
      return;
    }

    if (!formData.attendance_type) {
      setMessage("Attendance type is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        employee_name: formData.employee_name.trim(),
        leader_name: formData.leader_name.trim(),
        attendance_date: formData.attendance_date,
        attendance_type: formData.attendance_type,
        occurrence_points: getPointsForType(formData.attendance_type),
        notes: formData.notes.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("attendance_tracker")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setMessage("Attendance record updated successfully.");
      } else {
        const { error } = await supabase
          .from("attendance_tracker")
          .insert([payload]);

        if (error) throw error;

        setMessage("Attendance record added successfully.");
      }

      resetForm();
      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error saving attendance record:", error.message);
      setMessage("There was an error saving the attendance record.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record) {
    setEditingId(record.id);
    setFormData({
      employee_name: record.employee_name || "",
      leader_name: record.leader_name || "",
      attendance_date: record.attendance_date || "",
      attendance_type: record.attendance_type || "",
      notes: record.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this attendance record?");
    if (!confirmed) return;

    try {
      setMessage("");

      const { error } = await supabase
        .from("attendance_tracker")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMessage("Attendance record deleted.");
      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error deleting attendance record:", error.message);
      setMessage("There was an error deleting the attendance record.");
    }
  }

  const groupedSummaries = useMemo(() => {
    return buildGroupedSummaries(attendanceRecords);
  }, [attendanceRecords]);

  const leaderOptions = useMemo(() => {
    const names = attendanceRecords
      .map((record) => (record.leader_name || "").trim())
      .filter(Boolean);

    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [attendanceRecords]);

  const filteredSummaries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return groupedSummaries.filter((employee) => {
      const matchesSearch =
        !term ||
        (employee.employee_name || "").toLowerCase().includes(term) ||
        (employee.leader_name || "").toLowerCase().includes(term) ||
        (employee.action_level?.label || "").toLowerCase().includes(term);

      const matchesLeader =
        !leaderFilter ||
        (employee.leader_name || "").toLowerCase() === leaderFilter.toLowerCase();

      return matchesSearch && matchesLeader;
    });
  }, [groupedSummaries, searchTerm, leaderFilter]);

  return (
    <Layout title="Attendance" links={leaderLinks}>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <h2 style={styles.pageTitle}>Attendance Tracker</h2>
          <p style={styles.pageText}>
            Enter attendance by policy. The system automatically assigns points and groups each agent into one running summary.
          </p>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3 style={styles.sectionTitle}>
            {editingId ? "Edit Attendance Record" : "Add Attendance Record"}
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
              <label style={styles.label}>Attendance Date</label>
              <input
                type="date"
                name="attendance_date"
                value={formData.attendance_date}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Attendance Type</label>
              <select
                name="attendance_type"
                value={formData.attendance_type}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Select attendance type</option>
                {attendanceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.points})
                  </option>
                ))}
              </select>
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
              placeholder="Add attendance notes"
            />
          </div>

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Attendance Record"
                : "Add Attendance Record"}
            </button>

            {editingId ? (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Employee Attendance Summary</h3>
              <p style={styles.helperText}>
                Rolling 365 totals update automatically based on attendance points.
              </p>
            </div>

            <div style={styles.filterRow}>
              <input
                type="text"
                placeholder="Search employee, leader, or action level"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />

              <select
                value={leaderFilter}
                onChange={(e) => setLeaderFilter(e.target.value)}
                style={styles.searchInput}
              >
                <option value="">All Leaders</option>
                {leaderOptions.map((leader) => (
                  <option key={leader} value={leader}>
                    {leader}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={styles.emptyState}>Loading attendance records...</div>
          ) : filteredSummaries.length === 0 ? (
            <div style={styles.emptyState}>No employee summaries found.</div>
          ) : (
            <div style={styles.summaryList}>
              {filteredSummaries.map((employee) => {
                const employeeKey = employee.employee_name.toLowerCase();
                const isOpen = openEmployeeKey === employeeKey;

                return (
                  <div key={employeeKey} style={styles.summaryCard}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenEmployeeKey((prev) =>
                          prev === employeeKey ? "" : employeeKey
                        )
                      }
                      style={styles.summaryHeader}
                    >
                      <div style={styles.summaryTopRow}>
                        <div>
                          <div style={styles.employeeName}>{employee.employee_name}</div>
                          <div style={styles.employeeMeta}>
                            Leader: {employee.leader_name || "Not provided"}
                          </div>
                        </div>

                        <span
                          style={{
                            ...styles.actionPill,
                            color: employee.action_level.color,
                            background: employee.action_level.background,
                          }}
                        >
                          {employee.action_level.label}
                        </span>
                      </div>

                      <div style={styles.summaryStats}>
                        <div style={styles.statBox}>
                          <div style={styles.statLabel}>Rolling Total</div>
                          <div style={styles.statValue}>{employee.rolling_total}</div>
                        </div>

                        <div style={styles.statBox}>
                          <div style={styles.statLabel}>Events</div>
                          <div style={styles.statValue}>{employee.event_count}</div>
                        </div>

                        <div style={styles.statBox}>
                          <div style={styles.statLabel}>Last Attendance</div>
                          <div style={styles.statValue}>
                            {employee.last_attendance_date || "No recent records"}
                          </div>
                        </div>
                      </div>
                    </button>

                    {isOpen ? (
                      <div style={styles.recordsWrap}>
                        <div style={styles.recordsHeader}>Attendance Records</div>

                        <div style={styles.tableWrap}>
                          <table style={styles.table}>
                            <thead>
                              <tr>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Type</th>
                                <th style={styles.th}>Points</th>
                                <th style={styles.th}>Notes</th>
                                <th style={styles.th}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {employee.all_records.map((record) => (
                                <tr key={record.id}>
                                  <td style={styles.td}>{record.attendance_date || "—"}</td>
                                  <td style={styles.td}>{record.attendance_type || "—"}</td>
                                  <td style={styles.td}>
                                    {itemOrZero(record.occurrence_points)}
                                  </td>
                                  <td style={styles.td}>{record.notes || "—"}</td>
                                  <td style={styles.td}>
                                    <div style={styles.tableButtonRow}>
                                      <button
                                        type="button"
                                        style={styles.inlineEditButton}
                                        onClick={() => handleEdit(record)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        style={styles.inlineDeleteButton}
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
                      </div>
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

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  headerCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  pageTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    color: "#0f172a",
  },
  pageText: {
    marginTop: "8px",
    marginBottom: 0,
    fontSize: "15px",
    color: "#475569",
    lineHeight: 1.6,
  },
  message: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "14px 16px",
    fontWeight: 600,
  },
  formCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  listCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#0f172a",
  },
  helperText: {
    marginTop: "6px",
    marginBottom: 0,
    fontSize: "14px",
    color: "#64748b",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#0f172a",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    background: "#ffffff",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  primaryButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  filterRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchInput: {
    minWidth: "220px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#0f172a",
    outline: "none",
    background: "#ffffff",
  },
  emptyState: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "28px",
    textAlign: "center",
    color: "#64748b",
    fontWeight: 600,
  },
  summaryList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  summaryCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
    background: "#ffffff",
  },
  summaryHeader: {
    width: "100%",
    border: "none",
    background: "#ffffff",
    padding: "18px",
    textAlign: "left",
    cursor: "pointer",
  },
  summaryTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
  employeeName: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#0f172a",
  },
  employeeMeta: {
    marginTop: "6px",
    fontSize: "14px",
    color: "#64748b",
  },
  actionPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  summaryStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },
  statBox: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "14px",
    border: "1px solid #e2e8f0",
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statValue: {
    marginTop: "8px",
    fontSize: "16px",
    fontWeight: 800,
    color: "#0f172a",
  },
  recordsWrap: {
    borderTop: "1px solid #e2e8f0",
    padding: "18px",
    background: "#f8fafc",
  },
  recordsHeader: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "12px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
    background: "#ffffff",
    borderRadius: "12px",
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    background: "#e2e8f0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 800,
  },
  td: {
    padding: "12px",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#0f172a",
    verticalAlign: "top",
  },
  tableButtonRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  inlineEditButton: {
    background: "#dbeafe",
    color: "#1d4ed8",
    border: "none",
    borderRadius: "10px",
    padding: "8px 10px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  inlineDeleteButton: {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: "10px",
    padding: "8px 10px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
};