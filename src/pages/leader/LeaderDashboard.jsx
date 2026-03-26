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

function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getBannerMessage(percent) {
  if (percent >= 100) {
    return "🔥 GREAT WORK YESTERDAY. TARGET ACHIEVED. KEEP THAT SAME MOMENTUM TODAY.";
  }

  if (percent >= 85) {
    return "📈 STRONG DAY YESTERDAY. WE WERE CLOSE. LET’S FINISH EVEN STRONGER TODAY.";
  }

  if (percent >= 70) {
    return "⚡ YESTERDAY SHOWED EFFORT. LET’S BUILD ON IT AND PUSH HARDER TODAY.";
  }

  return "🎯 YESTERDAY DIDN’T GO THE WAY WE WANTED. TODAY IS THE RESET. LOCK IN AND GO.";
}

export default function LeaderDashboard() {
  const [bannerMessage, setBannerMessage] = useState(
    "🔥 NEW DAY. NEW OPPORTUNITY. LET’S SET THE TONE EARLY."
  );

  useEffect(() => {
    const loadYesterdayBanner = async () => {
      try {
        const yesterday = getYesterdayDate();

        const { data, error } = await supabase
          .from("site_daily_sales")
          .select("sales_target, points_achieved")
          .eq("sales_date", yesterday)
          .maybeSingle();

        if (error) {
          console.error("Error loading yesterday sales data:", error.message);
          return;
        }

        if (!data) {
          setBannerMessage(
            "🔥 YESTERDAY’S NUMBERS AREN’T POSTED YET. TODAY IS STILL A CHANCE TO SET THE TONE."
          );
          return;
        }

        const target = Number(data.sales_target || 0);
        const achieved = Number(data.points_achieved || 0);
        const percent = target > 0 ? (achieved / target) * 100 : 0;

        setBannerMessage(getBannerMessage(percent));
      } catch (err) {
        console.error("Unexpected dashboard banner error:", err);
      }
    };

    loadYesterdayBanner();
  }, []);

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