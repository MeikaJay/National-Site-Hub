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

export default function LeaderTraining() {
  const [trainingItems, setTrainingItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const { data, error } = await supabase
      .from("weekly_trainings")
      .select(`
        id,
        training_start_date,
        training_end_date,
        topic,
        status,
        notes,
        leaders (name)
      `)
      .order("training_start_date", { ascending: true });

    if (error) {
      setPageError(error.message);
      setLoading(false);
      return;
    }

    setTrainingItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const today = new Date().toISOString().split("T")[0];

  const currentWeek = useMemo(() => {
    return trainingItems.find(
      (item) =>
        item.training_start_date <= today && item.training_end_date >= today
    );
  }, [trainingItems, today]);

  const upcomingTrainings = useMemo(() => {
    return trainingItems.filter((item) => item.training_start_date > today);
  }, [trainingItems, today]);

  return (
    <Layout title="Weekly Training" links={leaderLinks}>
      {pageError && <p className="error-text">{pageError}</p>}

      <div className="card">
        <h2 className="section-title">Current Training Week</h2>
        <p className="section-subtext">
          View the current host leader and topic for this week.
        </p>

        {loading ? (
          <p>Loading current training...</p>
        ) : !currentWeek ? (
          <p>No training scheduled for the current week.</p>
        ) : (
          <div className="card-grid">
            <div className="card dashboard-card">
              <h3>{currentWeek.topic}</h3>
              <p>
                <strong>Host:</strong> {currentWeek.leaders?.name || "Unknown"}
              </p>
              <p>
                <strong>Week:</strong> {currentWeek.training_start_date} to{" "}
                {currentWeek.training_end_date}
              </p>
              <p>
                <strong>Status:</strong> {currentWeek.status}
              </p>
              <p>
                <strong>Notes:</strong> {currentWeek.notes || "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">Upcoming Training Schedule</h2>
        <p className="section-subtext">
          View upcoming weekly training assignments.
        </p>

        {loading ? (
          <p>Loading training schedule...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Host Leader</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {upcomingTrainings.length === 0 ? (
                  <tr>
                    <td colSpan="6">No upcoming training entries found.</td>
                  </tr>
                ) : (
                  upcomingTrainings.map((item) => (
                    <tr key={item.id}>
                      <td>{item.leaders?.name || "Unknown"}</td>
                      <td>{item.training_start_date}</td>
                      <td>{item.training_end_date}</td>
                      <td>{item.topic}</td>
                      <td>
                        <span className={`status-pill status-${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.notes || "—"}</td>
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