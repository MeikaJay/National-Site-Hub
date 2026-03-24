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
  last_name: "",
  first_name: "",
  time_zone_mu: "",
  shift_key: "",
  start_time: "",
  end_time: "",
  lunch_minutes: "30",
  role_name: "",
  site: "National",
  team_name: "",
  leader_name: "",
  leader_shift: "",
};

const timeZoneOptions = [
  { value: "1-EST", label: "1-EST", key: "eastern" },
  { value: "2-CST", label: "2-CST", key: "central" },
  { value: "3-PST", label: "3-PST", key: "pacific" },
];

function getTimeZoneKey(value) {
  const found = timeZoneOptions.find((item) => item.value === value);
  return found ? found.key : "";
}

function getShiftTimes(shiftKeys, shiftKey, timeZoneMu) {
  const found = shiftKeys.find((item) => item.shift_key === shiftKey);
  const tzKey = getTimeZoneKey(timeZoneMu);

  if (!found || !tzKey) {
    return { start_time: "", end_time: "" };
  }

  if (tzKey === "eastern") {
    return {
      start_time: found.start_time_eastern || "",
      end_time: found.end_time_eastern || "",
    };
  }

  if (tzKey === "central") {
    return {
      start_time: found.start_time_central || "",
      end_time: found.end_time_central || "",
    };
  }

  if (tzKey === "pacific") {
    return {
      start_time: found.start_time_pacific || "",
      end_time: found.end_time_pacific || "",
    };
  }

  return { start_time: "", end_time: "" };
}

export default function ScheduleAdmin() {
  const [formData, setFormData] = useState(emptyForm);
  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [shiftKeys, setShiftKeys] = useState([]);
  const [leaderShifts, setLeaderShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!formData.shift_key || !formData.time_zone_mu) return;

    const times = getShiftTimes(shiftKeys, formData.shift_key, formData.time_zone_mu);

    setFormData((prev) => ({
      ...prev,
      start_time: times.start_time,
      end_time: times.end_time,
    }));
  }, [formData.shift_key, formData.time_zone_mu, shiftKeys]);

  async function fetchAllData() {
    try {
      setLoading(true);
      setMessage("");

      const [scheduleRes, shiftRes, leaderRes] = await Promise.all([
        supabase
          .from("employee_schedules")
          .select("*")
          .order("team_name", { ascending: true })
          .order("leader_name", { ascending: true })
          .order("last_name", { ascending: true }),
        supabase
          .from("shift_keys")
          .select("*")
          .order("shift_key", { ascending: true }),
        supabase
          .from("leader_shifts")
          .select("*")
          .order("leader_name", { ascending: true }),
      ]);

      if (scheduleRes.error) throw scheduleRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (leaderRes.error) throw leaderRes.error;

      setScheduleRecords(scheduleRes.data || []);
      setShiftKeys(shiftRes.data || []);
      setLeaderShifts(leaderRes.data || []);
    } catch (error) {
      console.error("Error loading schedules:", error.message);
      setMessage("Unable to load schedules.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "leader_name") {
      const selectedLeader = leaderShifts.find((item) => item.leader_name === value);

      setFormData((prev) => ({
        ...prev,
        leader_name: value,
        team_name: selectedLeader ? selectedLeader.team || "" : "",
        leader_shift: selectedLeader ? `Leader Shift ${selectedLeader.shift_code}` : "",
      }));
      return;
    }

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

    if (!formData.last_name.trim() || !formData.first_name.trim()) {
      setMessage("First and last name are required.");
      return;
    }

    if (!formData.time_zone_mu || !formData.shift_key) {
      setMessage("Time zone and shift key are required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        last_name: formData.last_name.trim(),
        first_name: formData.first_name.trim(),
        time_zone_mu: formData.time_zone_mu,
        shift_key: formData.shift_key,
        start_time: formData.start_time,
        end_time: formData.end_time,
        lunch_minutes: formData.lunch_minutes,
        role_name: formData.role_name.trim(),
        site: formData.site.trim(),
        team_name: formData.team_name.trim(),
        leader_name: formData.leader_name.trim(),
        leader_shift: formData.leader_shift.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("employee_schedules")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setMessage("Schedule updated successfully.");
      } else {
        const { error } = await supabase
          .from("employee_schedules")
          .insert([payload]);

        if (error) throw error;
        setMessage("Schedule added successfully.");
      }

      resetForm();
      fetchAllData();
    } catch (error) {
      console.error("Error saving schedule:", error.message);
      setMessage("There was an error saving the schedule.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record) {
    setEditingId(record.id);
    setFormData({
      last_name: record.last_name || "",
      first_name: record.first_name || "",
      time_zone_mu: record.time_zone_mu || "",
      shift_key: record.shift_key || "",
      start_time: record.start_time || "",
      end_time: record.end_time || "",
      lunch_minutes: record.lunch_minutes || "30",
      role_name: record.role_name || "",
      site: record.site || "National",
      team_name: record.team_name || "",
      leader_name: record.leader_name || "",
      leader_shift: record.leader_shift || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this schedule record?");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("employee_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMessage("Schedule deleted.");
      fetchAllData();
    } catch (error) {
      console.error("Error deleting schedule:", error.message);
      setMessage("There was an error deleting the schedule.");
    }
  }

  const teamOptions = useMemo(() => {
    const teams = [
      ...new Set(
        [
          ...scheduleRecords.map((item) => item.team_name || ""),
          ...leaderShifts.map((item) => item.team || ""),
        ].filter(Boolean)
      ),
    ];
    return teams.sort((a, b) => a.localeCompare(b));
  }, [scheduleRecords, leaderShifts]);

  const filteredSchedules = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return scheduleRecords.filter((record) => {
      const matchesSearch =
        !term ||
        (record.last_name || "").toLowerCase().includes(term) ||
        (record.first_name || "").toLowerCase().includes(term) ||
        (record.leader_name || "").toLowerCase().includes(term) ||
        (record.time_zone_mu || "").toLowerCase().includes(term) ||
        (record.shift_key || "").toLowerCase().includes(term) ||
        (record.role_name || "").toLowerCase().includes(term) ||
        (record.team_name || "").toLowerCase().includes(term);

      const matchesTeam = !teamFilter || record.team_name === teamFilter;

      return matchesSearch && matchesTeam;
    });
  }, [scheduleRecords, searchTerm, teamFilter]);

  return (
    <Layout title="Schedules" links={adminLinks}>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <h2 style={styles.pageTitle}>Schedules</h2>
          <p style={styles.pageText}>
            Add, edit, and manage National Site schedules. Filter by team to make the page easier to work from.
          </p>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <form onSubmit={handleSubmit} style={styles.card}>
          <h3 style={styles.sectionTitle}>
            {editingId ? "Edit Schedule" : "Add Schedule"}
          </h3>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Last Name</label>
              <input name="last_name" value={formData.last_name} onChange={handleChange} style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>First Name</label>
              <input name="first_name" value={formData.first_name} onChange={handleChange} style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>Time Zone / MU</label>
              <select name="time_zone_mu" value={formData.time_zone_mu} onChange={handleChange} style={styles.input}>
                <option value="">Select time zone</option>
                {timeZoneOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Shift Key</label>
              <select name="shift_key" value={formData.shift_key} onChange={handleChange} style={styles.input}>
                <option value="">Select shift key</option>
                {shiftKeys.map((item) => (
                  <option key={item.shift_key} value={item.shift_key}>
                    {item.shift_key}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Start Time</label>
              <input name="start_time" value={formData.start_time} onChange={handleChange} style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>End Time</label>
              <input name="end_time" value={formData.end_time} onChange={handleChange} style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>Lunch</label>
              <select name="lunch_minutes" value={formData.lunch_minutes} onChange={handleChange} style={styles.input}>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Role</label>
              <input name="role_name" value={formData.role_name} onChange={handleChange} style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>Site</label>
              <input name="site" value={formData.site} onChange={handleChange} style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>Leader</label>
              <select name="leader_name" value={formData.leader_name} onChange={handleChange} style={styles.input}>
                <option value="">Select leader</option>
                {leaderShifts.map((leader) => (
                  <option key={leader.id} value={leader.leader_name}>
                    {leader.leader_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Team</label>
              <input name="team_name" value={formData.team_name} onChange={handleChange} style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>Leader Shift</label>
              <input name="leader_shift" value={formData.leader_shift} onChange={handleChange} style={styles.input} />
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Schedule" : "Add Schedule"}
            </button>

            <button type="button" style={styles.secondaryButton} onClick={resetForm}>
              Clear
            </button>
          </div>
        </form>

        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>Current Schedules</h3>
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
                placeholder="Search employee, leader, role, shift, or team"
                style={styles.searchInput}
              />
            </div>
          </div>

          {loading ? (
            <p style={styles.pageText}>Loading schedules...</p>
          ) : filteredSchedules.length === 0 ? (
            <p style={styles.pageText}>No schedules found.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Last Name</th>
                    <th style={styles.th}>First Name</th>
                    <th style={styles.th}>Team</th>
                    <th style={styles.th}>Leader</th>
                    <th style={styles.th}>Time Zone</th>
                    <th style={styles.th}>Shift</th>
                    <th style={styles.th}>Start</th>
                    <th style={styles.th}>End</th>
                    <th style={styles.th}>Lunch</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Site</th>
                    <th style={styles.th}>Leader Shift</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>{record.last_name}</td>
                      <td style={styles.td}>{record.first_name}</td>
                      <td style={styles.td}>{record.team_name}</td>
                      <td style={styles.td}>{record.leader_name}</td>
                      <td style={styles.td}>{record.time_zone_mu}</td>
                      <td style={styles.td}>{record.shift_key}</td>
                      <td style={styles.td}>{record.start_time}</td>
                      <td style={styles.td}>{record.end_time}</td>
                      <td style={styles.td}>{record.lunch_minutes}</td>
                      <td style={styles.td}>{record.role_name}</td>
                      <td style={styles.td}>{record.site}</td>
                      <td style={styles.td}>{record.leader_shift}</td>
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
  },
  searchInput: {
    minWidth: "220px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#fff",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "1250px" },
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
  actionButtons: { display: "flex", gap: "8px", flexWrap: "wrap" },
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