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

const leaderTeamMap = {
  "Tabitha Espinoza": "Beast City",
  "Deangelo Evans": "Goal Hunters",
  "Tiara Rivers": "Soaring Eagles",
  "Vadereon Gray": "Goalrillaz",
  "Sarah Rendon": "Sales Seekers",
};

function getCurrentLeaderName() {
  return (
    localStorage.getItem("leaderName") ||
    localStorage.getItem("userName") ||
    localStorage.getItem("currentLeaderName") ||
    ""
  );
}

export default function LeaderSchedules() {
  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    const leaderName = getCurrentLeaderName();
    const mappedTeam = leaderTeamMap[leaderName] || "";
    if (mappedTeam) {
      setTeamFilter(mappedTeam);
    }
  }, []);

  async function fetchSchedules() {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("employee_schedules")
        .select("*")
        .order("team_name", { ascending: true })
        .order("leader_name", { ascending: true })
        .order("last_name", { ascending: true });

      if (error) throw error;

      setScheduleRecords(data || []);
    } catch (error) {
      console.error("Error loading schedules:", error.message);
      setMessage("Unable to load schedules.");
    } finally {
      setLoading(false);
    }
  }

  const teamOptions = useMemo(() => {
    const teams = [...new Set(scheduleRecords.map((item) => item.team_name || "").filter(Boolean))];
    return teams.sort((a, b) => a.localeCompare(b));
  }, [scheduleRecords]);

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
    <Layout title="Schedules" links={leaderLinks}>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <h2 style={styles.pageTitle}>Schedules</h2>
          <p style={styles.pageText}>
            View schedules by team so each manager can quickly focus on their own group.
          </p>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>Team Schedules</h3>
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
    background: "#fef2f2",
    color: "#991b1b",
    fontWeight: "600",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
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
  table: { width: "100%", borderCollapse: "collapse", minWidth: "1150px" },
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
};