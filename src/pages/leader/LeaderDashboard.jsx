import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Layout from "../../components/Layout";
import NationalSiteHubSection from "../../components/NationalSiteHubSection";

function getBannerMessage(percent) {
  if (percent >= 100) {
    return "🔥 TARGET ACHIEVED. KEEP THE MOMENTUM GOING.";
  }
  if (percent >= 85) {
    return "📈 SO CLOSE. STRONG START, STRONGER FINISH TODAY.";
  }
  if (percent >= 70) {
    return "⚠️ KEEP PUSHING WE’RE NOT THERE YET.";
  }
  return "🚨 WE HAVE WORK TO DO. ADJUST AND RESET.";
}

const leaderLinks = [
  { to: "/leader", label: "Dashboard" },
  { to: "/leader/attendance", label: "Attendance" },
  { to: "/leader/pto", label: "Leadership PTO" },
  { to: "/leader/training", label: "Weekly Training" },
  { to: "/leader/loa", label: "LOA" },
  { to: "/leader/pips", label: "PIPs" },
  { to: "/leader/schedules", label: "Schedules" },
  { to: "/leader/sales", label: "Daily Sales" },
];

export default function LeaderDashboard() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const loadPercent = async () => {
      const { data, error } = await supabase
        .from("site_daily_sales")
        .select("sales_target, points_achieved")
        .order("sales_date", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return;

      const target = Number(data.sales_target || 0);
      const achieved = Number(data.points_achieved || 0);

      const calculatedPercent =
        target > 0 ? ((achieved / target) * 100).toFixed(2) : 0;

      setPercent(Number(calculatedPercent));
    };

    loadPercent();
  }, []);

  const bannerMessage = getBannerMessage(percent);

  return (
    <Layout title="Leader Dashboard" links={leaderLinks}>
      
      {/* 🔥 SCROLLING BANNER */}
      <div className="scroll-banner">
        <div className="scroll-text">
          {bannerMessage}
          <span className="scroll-divider">•</span>
          {bannerMessage}
          <span className="scroll-divider">•</span>
          {bannerMessage}
        </div>
      </div>

      <NationalSiteHubSection />

    </Layout>
  );
}