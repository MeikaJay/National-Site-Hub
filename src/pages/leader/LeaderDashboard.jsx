import Layout from "../../components/Layout";
import NationalSiteHubSection from "../../components/NationalSiteHubSection";

const leaderLinks = [
  { to: "/leader", label: "Dashboard" },
  { to: "/leader/attendance", label: "Attendance" },
  { to: "/leader/pto", label: "Leadership PTO" },
  { to: "/leader/training", label: "Weekly Training" },
  { to: "/leader/loa", label: "LOA" },
  { to: "/leader/pips", label: "PIPs" },
  { to: "/leader/schedules", label: "Schedules" },
];

export default function LeaderDashboard() {
  return (
    <Layout title="Leader Dashboard" links={leaderLinks}>
      <NationalSiteHubSection />
    </Layout>
  );
}