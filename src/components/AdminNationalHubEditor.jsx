import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const defaultSections = {
  daily_game_plan: {
    title: "Today’s Game Plan",
    content: "",
  },
  site_wins: {
    title: "National Site Wins",
    content: "",
  },
  important_updates: {
    title: "Important Updates",
    content: "",
  },
  message_of_the_day: {
    title: "Message of the Day",
    content: "",
  },
};

export default function AdminNationalHubEditor() {
  const [formData, setFormData] = useState(defaultSections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("national_site_hub")
        .select("*");

      if (error) throw error;

      const updated = { ...defaultSections };

      data.forEach((item) => {
        updated[item.section_key] = {
          title: item.title || "",
          content: item.content || "",
        };
      });

      setFormData(updated);
    } catch (err) {
      console.error("Error loading hub data:", err.message);
      setMessage("Error loading data.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const saveSection = async (sectionKey) => {
    try {
      setSaving(true);
      setMessage("");

      const payload = {
        section_key: sectionKey,
        title: formData[sectionKey].title,
        content: formData[sectionKey].content,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("national_site_hub")
        .upsert(payload, { onConflict: "section_key" });

      if (error) throw error;

      setMessage(`${formData[sectionKey].title} saved successfully`);
    } catch (err) {
      console.error("Error saving section:", err.message);
      setMessage("Error saving changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading Hub Editor...</div>;
  }

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.header}>National Site Hub Editor</h2>
      <p style={styles.subheader}>
        Update what your team sees on the National Site Hub
      </p>

      {message && <div style={styles.message}>{message}</div>}

      {Object.keys(formData).map((sectionKey) => (
        <div key={sectionKey} style={styles.card}>
          <label style={styles.label}>Section Title</label>
          <input
            style={styles.input}
            value={formData[sectionKey].title}
            onChange={(e) =>
              handleChange(sectionKey, "title", e.target.value)
            }
          />

          <label style={styles.label}>Content</label>
          <textarea
            style={styles.textarea}
            rows="5"
            value={formData[sectionKey].content}
            onChange={(e) =>
              handleChange(sectionKey, "content", e.target.value)
            }
            placeholder="Use a new line for each point..."
          />

          <button
            style={styles.button}
            onClick={() => saveSection(sectionKey)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Section"}
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrapper: {
    marginTop: "20px",
    padding: "20px",
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
  },
  header: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
  },
  subheader: {
    marginBottom: "20px",
    color: "#666",
  },
  message: {
    marginBottom: "15px",
    padding: "10px",
    background: "#e6f4ea",
    color: "#1e7e34",
    borderRadius: "8px",
    fontWeight: "600",
  },
  card: {
    marginBottom: "20px",
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#f9fafb",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    marginBottom: "10px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  textarea: {
    width: "100%",
    marginBottom: "10px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 16px",
    background: "#1f7a3d",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
};