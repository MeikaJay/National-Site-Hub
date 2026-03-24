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

function formatSessionLine(sessionDate, sessionTime) {
  if (!sessionDate && !sessionTime) return "—";

  const date = sessionDate
    ? new Date(`${sessionDate}T00:00:00`)
    : null;

  const dayName =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("en-US", { weekday: "long" })
      : "";

  const formattedDate = sessionDate ? formatDate(sessionDate) : "";
  const formattedTime = sessionTime ? formatTimeForDisplay(sessionTime) : "";

  return [dayName, formattedDate, formattedTime].filter(Boolean).join(" • ");
}

export default function LeaderTraining() {
  const [trainingItems, setTrainingItems] = useState([]);
  const [sessionItems, setSessionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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

    return trainingItems.filter((item) => {
      if (!term) return true;

      const topic = (item.topic || "").toLowerCase();
      const leader = (item.leaders?.name || "").toLowerCase();
      const status = (item.status || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();

      return (
        topic.includes(term) ||
        leader.includes(term) ||
        status.includes(term) ||
        notes.includes(term)
      );
    });
  }, [trainingItems, searchTerm]);

  return (
    <Layout title="Weekly Training" links={leaderLinks}>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <h2 style={styles.pageTitle}>Weekly Training Schedule</h2>
          <p style={styles.pageText}>
            View each training week, the host leader, and all scheduled session times.
          </p>

          <input
            type="text"
            placeholder="Search by topic, leader, or status"
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
          <div style={styles.trainingList}>
            {filteredTrainings.map((item) => {
              const sessions = sessionsByTraining[item.id] || [];

              return (
                <div key={item.id} style={styles.trainingCard}>
                  <div style={styles.topRow}>
                    <div style={styles.topicWrap}>
                      <div style={styles.topic}>{item.topic || "Untitled Training"}</div>
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

                  <div style={styles.leaderBadge}>
                    Leader: {item.leaders?.name || "Unknown"}
                  </div>

                  <div style={styles.metaText}>
                    <strong>Week:</strong>{" "}
                    {formatWeekRange(item.training_start_date, item.training_end_date)}
                  </div>

                  {item.notes ? (
                    <div style={styles.notesText}>
                      <strong>Notes:</strong> {item.notes}
                    </div>
                  ) : null}

                  <div style={styles.sessionBlock}>
                    <div style={styles.sessionHeading}>Session Times</div>

                    {sessions.length === 0 ? (
                      <div style={styles.noSessions}>
                        No session times have been posted yet.
                      </div>
                    ) : (
                      <div style={styles.sessionList}>
                        {sessions.map((session) => (
                          <div key={session.id} style={styles.sessionLine}>
                            {formatSessionLine(
                              session.session_date,
                              session.session_time
                            )}
                          </div>
                        ))}
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
    gap: "18px",
  },
  headerCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  pageTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
  },
  pageText: {
    margin: 0,
    color: "#475569",
    fontSize: "15px",
    lineHeight: "1.5",
  },
  searchInput: {
    width: "100%",
    maxWidth: "420px",
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
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    textAlign: "center",
    color: "#64748b",
    fontWeight: "600",
  },
  trainingList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  trainingCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    flexWrap: "wrap",
  },
  topicWrap: {
    flex: 1,
    minWidth: "220px",
  },
  topic: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: "1.3",
  },
  leaderBadge: {
    display: "inline-block",
    width: "fit-content",
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "14px",
    fontWeight: "800",
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
    background: "#fef3c7",
    color: "#92400e",
  },
  statusCompleted: {
    background: "#dcfce7",
    color: "#166534",
  },
  metaText: {
    fontSize: "15px",
    color: "#334155",
    lineHeight: "1.5",
  },
  notesText: {
    fontSize: "14px",
    color: "#475569",
    lineHeight: "1.5",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "12px 14px",
  },
  sessionBlock: {
    marginTop: "4px",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sessionHeading: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
  },
  noSessions: {
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "12px 14px",
  },
  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sessionLine: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: "1.4",
  },
};