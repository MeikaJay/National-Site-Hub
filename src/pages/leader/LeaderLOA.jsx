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

export default function LeaderLOA() {
  const [loaRecords, setLoaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
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
    <Layout title="LOA" links={leaderLinks}>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <h2 style={styles.pageTitle}>LOA Records</h2>
          <p style={styles.pageText}>
            Review current and past leave of absence records.
          </p>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3 style={styles.sectionTitle}>Team LOA Tracker</h3>
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
    background: "#fef2f2",
    color: "#991b1b",
    fontWeight: "600",
  },
  listCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
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
    minWidth: "950px",
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
};