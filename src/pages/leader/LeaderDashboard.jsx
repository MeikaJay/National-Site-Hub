import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
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
  { to: "/leader/sales", label: "Daily Sales" },
];

function getBannerMessage(percent, trend) {
  if (percent >= 100) {
    return "🔥 TARGET ACHIEVED. KEEP THE MOMENTUM GOING.";
  }

  if (percent >= 85) {
    if (trend === "up") {
      return "📈 YOU’RE CLOSE AND IMPROVING. FINISH STRONG.";
    }
    if (trend === "down") {
      return "📈 CLOSE TO TARGET. STAY SHARP AND FINISH STRONG.";
    }
    return "📈 SO CLOSE. STRONG START, STRONGER FINISH.";
  }

  if (percent >= 70) {
    if (trend === "up") {
      return "⚠️ KEEP PUSHING. MOMENTUM IS BUILDING.";
    }
    return "⚠️ KEEP PUSHING. WE’RE NOT THERE YET.";
  }

  return "🚨 WE HAVE WORK TO DO. ADJUST AND RESET.";
}

export default function LeaderDashboard() {
  const [percent, setPercent] = useState(0);
  const [trend, setTrend] = useState("same");

  useEffect(() => {
    const loadBannerData = async () => {
      try {
        const { data, error } = await supabase
          .from("site_daily_sales")
          .select("sales_target, points_achieved, sales_date")
          .order("sales_date", { ascending: false })
          .limit(2);

        if (error) {
          console.error("Error loading banner sales data:", error.message);
          return;
        }

        if (!data || data.length === 0) {
          return;
        }

        const latest = data[0];
        const previous = data[1];

        const latestTarget = Number(latest?.sales_target || 0);
        const latestAchieved = Number(latest?.points_achieved || 0);

        const latestPercent =
          latestTarget > 0 ? (latestAchieved / latestTarget) * 100 : 0;

        setPercent(Number(latestPercent.toFixed(2)));

        if (previous) {
          const prevTarget = Number(previous?.sales_target || 0);
          const prevAchieved = Number(previous?.points_achieved || 0);

          const prevPercent =
            prevTarget > 0 ? (prevAchieved / prevTarget) * 100 : 0;

          if (latestPercent > prevPercent) {
            setTrend("up");
          } else if (latestPercent < prevPercent) {
            setTrend("down");
          } else {
            setTrend("same");
          }
        } else {
          setTrend("same");
        }
      } catch (err) {
        console.error("Unexpected banner load error:", err);
      }
    };

    loadBannerData();
  }, []);

  const bannerMessage = getBannerMessage(percent, trend);

  return (
    <Layout title="Leader Dashboard" links={leaderLinks}>
      <div className="scroll-banner">
        <div className="scroll-text">
          <span>{bannerMessage}</span>
          <span className="scroll-divider">•</span>
          <span>{bannerMessage}</span>
          <span className="scroll-divider">•</span>
          <span>{bannerMessage}</span>
        </div>
      </div>

      <NationalSiteHubSection />
    </Layout>
  );
}