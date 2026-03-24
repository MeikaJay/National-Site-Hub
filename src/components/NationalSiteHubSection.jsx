import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const sectionOrder = [
  "daily_game_plan",
  "site_wins",
  "important_updates",
  "message_of_the_day",
];

const fallbackData = {
  daily_game_plan: {
    title: "Today’s Game Plan",
    content: "No update added yet.",
  },
  site_wins: {
    title: "National Site Wins",
    content: "No wins posted yet.",
  },
  important_updates: {
    title: "Important Updates",
    content: "No updates posted yet.",
  },
  message_of_the_day: {
    title: "Message of the Day",
    content: "No message posted yet.",
  },
};

const sectionMeta = {
  daily_game_plan: {
    badge: "Focus",
    accent: "#3b82f6",
    background: "linear-gradient(180deg, #eef5ff 0%, #dfeeff 100%)",
    border: "#bfd8ff",
    icon: "🎯",
  },
  site_wins: {
    badge: "Wins",
    accent: "#d4a106",
    background: "linear-gradient(180deg, #fff8df 0%, #ffefb8 100%)",
    border: "#f2d66e",
    icon: "🏆",
  },
  important_updates: {
    badge: "Updates",
    accent: "#6b7280",
    background: "linear-gradient(180deg, #f4f6f8 0%, #e4e8ed 100%)",
    border: "#cfd6df",
    icon: "📌",
  },
  message_of_the_day: {
    badge: "Message",
    accent: "#a855f7",
    background: "linear-gradient(180deg, #f8edff 0%, #edd8ff 100%)",
    border: "#dab8ff",
    icon: "💬",
  },
};

export default function NationalSiteHubSection() {
  const [hubData, setHubData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("national_site_hub")
        .select("*");

      if (error) throw error;

      const formatted = { ...fallbackData };

      data.forEach((item) => {
        formatted[item.section_key] = {
          title: item.title || fallbackData[item.section_key]?.title || "",
          content: item.content || "",
        };
      });

      setHubData(formatted);
    } catch (err) {
      console.error("Error loading National Site Hub:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderLines = (content) => {
    const lines = (content || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return (
        <div style={styles.emptyState}>
          Nothing has been posted here yet.
        </div>
      );
    }

    return lines.map((line, index) => (
      <div key={index} style={styles.lineItem}>
        <div style={styles.bullet} />
        <div style={styles.lineText}>{line}</div>
      </div>
    ));
  };

  if (loading) {
    return (
      <section style={styles.wrapper}>
        <div style={styles.hero}>
          <div style={styles.heroBadge}>LIVE SITE BOARD</div>
          <h2 style={styles.heroTitle}>National Site Hub</h2>
          <p style={styles.heroSubtitle}>Loading updates...</p>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.wrapper}>
      <div style={styles.hero}>
        <div style={styles.heroBadge}>LIVE SITE BOARD</div>
        <h2 style={styles.heroTitle}>National Site Hub</h2>
        <p style={styles.heroSubtitle}>
          Daily direction, highlights, updates, and motivation in one place
        </p>
      </div>

      <div style={styles.grid}>
        {sectionOrder.map((key) => {
          const meta = sectionMeta[key];
          const section = hubData[key];

          return (
            <article
              key={key}
              style={{
                ...styles.card,
                background: meta.background,
                borderColor: meta.border,
                boxShadow: `0 14px 30px rgba(15, 23, 42, 0.08), inset 0 0 0 1px ${meta.border}`,
              }}
            >
              <div
                style={{
                  ...styles.accentBar,
                  background: meta.accent,
                }}
              />

              <div style={styles.cardHeader}>
                <div style={styles.topRow}>
                  <span
                    style={{
                      ...styles.cardBadge,
                      color: meta.accent,
                    }}
                  >
                    {meta.badge}
                  </span>

                  <span style={styles.iconBubble}>{meta.icon}</span>
                </div>

                <h3 style={styles.cardTitle}>{section?.title}</h3>
              </div>

              <div style={styles.messageBox}>
                {renderLines(section?.content)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const styles = {
  wrapper: {
    marginTop: "24px",
    padding: "28px",
    borderRadius: "28px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    border: "1px solid #e5ebf3",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  },
  hero: {
    marginBottom: "24px",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.08em",
  },
  heroTitle: {
    margin: "14px 0 8px 0",
    fontSize: "40px",
    lineHeight: "1.05",
    fontWeight: "900",
    color: "#0f172a",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: "17px",
    color: "#475569",
    fontWeight: "500",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    alignItems: "stretch",
  },
  card: {
    position: "relative",
    borderRadius: "24px",
    border: "1px solid",
    padding: "22px",
    minHeight: "280px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "8px",
  },
  cardHeader: {
    paddingLeft: "8px",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },
  cardBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.8)",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.02em",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
  },
  iconBubble: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.82)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: "32px",
    lineHeight: "1.08",
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  messageBox: {
    marginTop: "20px",
    marginLeft: "8px",
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: "140px",
  },
  lineItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  bullet: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#0f172a",
    marginTop: "8px",
    flexShrink: 0,
  },
  lineText: {
    fontSize: "20px",
    lineHeight: "1.45",
    color: "#1e293b",
    fontWeight: "600",
  },
  emptyState: {
    fontSize: "16px",
    color: "#64748b",
    fontWeight: "500",
  },
};