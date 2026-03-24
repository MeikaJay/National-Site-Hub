import AdminNationalHubEditor from "../../components/AdminNationalHubEditor";
import Layout from "../../components/Layout";

const adminLinks = [
  { to: "/admin", label: "Dashboard" }, 
  { to: "/admin/pto", label: "Leadership PTO" },
  { to: "/admin/training", label: "Weekly Training" },
  { to: "/admin/attendance", label: "Attendance" },
  { to: "/admin/loa", label: "LOA" },
  { to: "/admin/pips", label: "PIPs" },
  { to: "/admin/schedules", label: "Schedules" },
  { to: "/admin/sales", label: "Daily Sales" },
];

export default function AdminDashboard() {
  return (
    <Layout title="Admin Dashboard" links={adminLinks}>

      {/* 🔥 NEW SECTION: NATIONAL SITE HUB EDITOR */}
      <div style={{ marginTop: "30px" }}>
        <AdminNationalHubEditor />
      </div>

    </Layout>
  );
}