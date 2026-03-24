import { useCallback, useEffect, useMemo, useState } from "react";
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

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  if (!startDate) return formatDate(endDate);
  if (!endDate) return formatDate(startDate);

  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
}

function getDayName(dateValue) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export default function LeaderTraining() {
  const [trainingItems, setTrainingItems] = useState([]);
  const [sessionItems, setSessionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [openTrainingId, setOpenTrainingId] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [trainingsRes, sessionsRes] = await Promise.all([
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
        .neq("status", "skipped")
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

    if (trainingsRes.error || sessionsRes.error) {
      setPageError(
        trainingsRes.error?.message ||
          sessionsRes.error?.message ||
          "Something went wrong loading training schedule."
      );
      setLoading(false);
      return;
    }

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

  const filteredTrainings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let items = trainingItems;

    if (term) {
      items = items.filter((item) => {
        const topic = (item.topic || "").toLowerCase();
        const hostLeader = (item.leaders?.name || "").toLowerCase();
        const notes = (item.notes || "").toLowerCase();
        const status = (item.status || "").toLowerCase();

        return (
          topic.includes(term) ||
          hostLeader.includes(term) ||
          notes.includes(term) ||
          status.includes(term)
        );
      });
    }

    return items.sort((a, b) => {
      const aDate = a.training_start_date || "";
      const bDate = b.training_start_date || "";
      return aDate.localeCompare(bDate);
    });
  }, [trainingItems, searchTerm]);

  const upcomingCount = useMemo(() => {
    return filteredTrainings.filter((item) => item.status === "scheduled").length;
  }, [filteredTrainings]);

  const totalSessionCount = useMemo(() => {
    return filteredTrainings.reduce((total, item) => {
      return total + (sessionsByTraining[item.id]?.length || 0);
    }, 0);
  }, [filteredTrainings, sessionsByTraining]);

  return (
    <Layout title="Weekly Training" links={leaderLinks}>
      <div style={styles.page}>
        <div style={styles.heroCard}>
          <div>
            <h2 style={styles.pageTitle}>Weekly Training Schedule</h2>
            <p style={styles.pageText}>
              View each week’s training topic and all scheduled session start times.
            </p>
          </div>

          <div style={styles.heroStats}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Training Weeks</div>
              <div style={styles.statValue}>{filteredTrainings.length}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Scheduled Weeks</div>
              <div style={styles.statValue}>{upcomingCount}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Sessions</div>
              <div style={styles.statValue}>{totalSessionCount}</div>
            </div>
          </div>
        </div>

        <div style={styles.filterCard}>
          <div>
            <h3 style={styles.sectionTitle}>Find a Training</h3>
            <p style={styles.helperText}>
              Search by topic, leader name, notes, or status.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search training..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {pageError ? <div style={styles.errorBox}>{pageError}</div> : null}

        {loading ? (
          <div style={styles.emptyState}>Loading training schedule...</div>
        ) : filteredTrainings.length === 0 ? (
          <div style={styles.emptyState}>No training schedule found.</div>
        ) : (
          <div style={styles.trainingGrid}>
            {filteredTrainings.map((item) => {
              const sessions = sessionsByTraining[item.id] || [];
              const isOpen = openTrainingId === item.id;

              return (
                <div key={item.id} style={styles.trainingCard}>
                  <div style={styles.trainingHeader}>
                    <div>
                      <div style={styles.topic}>{item.topic || "Untitled Training"}</div>
                      <div style={styles.hostLine}>
                        Host Leader: {item.leaders?.name || "Unknown"}
                      </div>
                    </div>

                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(item.status === "completed"
                          ? styles.statusCompleted
                          : styles.statusScheduled),
                      }}
                    >
                      {item.status || "scheduled"}
                    </span>
                  </div>

                  <div style={styles.infoGrid}>
                    <div style={styles.infoBox}>
                      <div style={styles.infoLabel}>Week Range</div>
                      <div style={styles.infoValue}>
                        {formatWeekRange(
                          item.training_start_date,
                          item.training_end_date
                        )}
                      </div>
                    </div>

                    <div style={styles.infoBox}>
                      <div style={styles.infoLabel}>Sessions</div>
                      <div style={styles.infoValue}>{sessions.length}</div>
                    </div>
                  </div>

                  {item.notes ? (
                    <div style={styles.notesBox}>
                      <span style={styles.notesLabel}>Notes:</span> {item.notes}
                    </div>
                  ) : null}

                  <div style={styles.sessionSection}>
                    <div style={styles.sessionHeader}>
                      <h4 style={styles.sessionTitle}>Session Schedule</h4>

                      <button
                        type="button"
                        style={styles.toggleButton}
                        onClick={() =>
                          setOpenTrainingId((prev) => (prev === item.id ? "" : item.id))
                        }
                      >
                        {isOpen ? "Hide Sessions" : "View Sessions"}
                      </button>
                    </div>

                    {isOpen ? (
                      sessions.length === 0 ? (
                        <div style={styles.noSessions}>
                          No session times have been posted yet.
                        </div>
                      ) : (
                        <div style={styles.sessionList}>
                          {sessions.map((session) => (
                            <div key={session.id} style={styles.sessionItem}>
                              <div style={styles.sessionDateWrap}>
                                <div style={styles.sessionDay}>
                                  {getDayName(session.session_date)}
                                </div>
                                <div style={styles.sessionDate}>
                                  {formatDate(session.session_date)}
                                </div>
                              </div>

                              <div style={styles.sessionTime}>
                                {formatTimeForDisplay(session.session_time)}
                              </div>

                              <div style={styles.sessionNote}>
                                {session.notes || " "}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div style={styles.collapsedHint}>
                        Click “View Sessions” to see all available start times for this week.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  heroCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
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
    lineHeight: "1.5",
  },
  heroStats: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  statCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px 16px",
    minWidth: "120px",
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statValue: {
    marginTop: "8px",
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
  },
  filterCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px 24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "16px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
  },
  helperText: {
    marginTop: "6px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "14px",
  },
  searchInput: {
    minWidth: "260px",
    width: "320px",
    maxWidth: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#0f172a",
    outline: "none",
    background: "#ffffff",
  },
  errorBox: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px 16px",
    fontWeight: "600",
  },
  emptyState: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    textAlign: "center",
    color: "#64748b",
    fontWeight: "600",
  },
  trainingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },
  trainingCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  trainingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
  topic: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: "1.3",
  },
  hostLine: {
    marginTop: "6px",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "600",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  statusScheduled: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  statusCompleted: {
    background: "#dcfce7",
    color: "#166534",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 120px",
    gap: "12px",
  },
  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px",
  },
  infoLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  infoValue: {
    marginTop: "8px",
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: "1.4",
  },
  notesBox: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "12px",
    padding: "12px 14px",
    color: "#9a3412",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  notesLabel: {
    fontWeight: "800",
  },
  sessionSection: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "16px",
  },
  sessionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  sessionTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
  },
  toggleButton: {
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  collapsedHint: {
    marginTop: "12px",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  noSessions: {
    marginTop: "12px",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "14px",
    color: "#64748b",
    fontWeight: "600",
  },
  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "12px",
  },
  sessionItem: {
    display: "grid",
    gridTemplateColumns: "1.2fr 110px 1fr",
    gap: "12px",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px 14px",
  },
  sessionDateWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  sessionDay: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#334155",
  },
  sessionDate: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "600",
  },
  sessionTime: {
    fontSize: "15px",
    fontWeight: "800",
    color: "#0f172a",
  },
  sessionNote: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.4",
    minHeight: "18px",
  },
};