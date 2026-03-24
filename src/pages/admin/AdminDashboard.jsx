import AdminNationalHubEditor from "../../components/AdminNationalHubEditor";
import Layout from "../../components/Layout";

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

export default function AdminDashboard() {
  return (
    <Layout title="Admin Dashboard" links={adminLinks}>
      
      {/* EXISTING CARDS */}
      <div className="card-grid">
        <div className="card dashboard-card">
          <h3>Leadership PTO</h3>
          <p>Manage leader PTO, blackout dates, and coverage.</p>
        </div>

        <div className="card dashboard-card">
          <h3>Weekly Training</h3>
          <p>Track weekly hosts, dates, and training topics.</p>
        </div>

        <div className="card dashboard-card">
          <h3>Attendance</h3>
          <p>Review attendance by leader, team, and agent.</p>
        </div>

        <div className="card dashboard-card">
          <h3>LOA</h3>
          <p>Track leave of absence records and return dates.</p>
        </div>

        <div className="card dashboard-card">
          <h3>PIPs</h3>
          <p>Manage written, formal, and informal plans.</p>
        </div>

        <div className="card dashboard-card">
          <h3>Schedules</h3>
          <p>Manage shift codes, time zones, and schedule changes.</p>
        </div>
      </div>

      {/* 🔥 NEW SECTION: NATIONAL SITE HUB EDITOR */}
      <div style={{ marginTop: "30px" }}>
        <AdminNationalHubEditor />
      </div>

    </Layout>
  );
}