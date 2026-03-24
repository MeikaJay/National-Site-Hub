import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pto", label: "Leadership PTO" },
  { to: "/admin/training", label: "Weekly Training" },
  { to: "/admin/sales", label: "Daily Sales" },
];

const emptySiteForm = {
  sales_date: "",
  sales_target: "",
  points_achieved: "",
  notes: "",
};

const emptyLeaderForm = {
  sales_date: "",
  leader_id: "",
  sales_target: "",
  points_achieved: "",
  notes: "",
};

function getPercentToTarget(target, achieved) {
  const targetNum = Number(target || 0);
  const achievedNum = Number(achieved || 0);
  if (targetNum <= 0) return 0;
  return Number(((achievedNum / targetNum) * 100).toFixed(2));
}

function getStatusConfig(percent) {
  if (percent >= 100) return { label: "Green", className: "status-green" };
  if (percent >= 85) return { label: "Yellow", className: "status-yellow" };
  if (percent >= 70) return { label: "Orange", className: "status-orange" };
  return { label: "Red", className: "status-red" };
}

// DATE HELPERS
function isSameDay(dateString) {
  return new Date(dateString).toDateString() === new Date().toDateString();
}

function isThisWeek(dateString) {
  const date = new Date(dateString);
  const today = new Date();

  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return date >= start && date <= end;
}

function isThisMonth(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isThisQuarter(dateString) {
  const date = new Date(dateString);
  const today = new Date();

  const currentQuarter = Math.floor(today.getMonth() / 3);
  const inputQuarter = Math.floor(date.getMonth() / 3);

  return (
    date.getFullYear() === today.getFullYear() &&
    inputQuarter === currentQuarter
  );
}

export default function SalesTrackerAdmin() {
  const [activeTab, setActiveTab] = useState("site");
  const [dateView, setDateView] = useState("today");
  const [selectedDate, setSelectedDate] = useState("");

  const [leaders, setLeaders] = useState([]);
  const [siteSalesItems, setSiteSalesItems] = useState([]);
  const [leaderSalesItems, setLeaderSalesItems] = useState([]);

  const [siteForm, setSiteForm] = useState(emptySiteForm);
  const [leaderForm, setLeaderForm] = useState(emptyLeaderForm);

  const [editingSiteId, setEditingSiteId] = useState(null);
  const [editingLeaderId, setEditingLeaderId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadPageData = useCallback(async () => {
    const [leadersRes, siteRes, leaderRes] = await Promise.all([
      supabase.from("leaders").select("id, name").eq("active", true),
      supabase.from("site_daily_sales").select("*").order("sales_date", { ascending: false }),
      supabase.from("leader_daily_sales").select("*, leaders(name)").order("sales_date", { ascending: false }),
    ]);

    setLeaders(leadersRes.data || []);
    setSiteSalesItems(siteRes.data || []);
    setLeaderSalesItems(leaderRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // FILTER LOGIC
  const applyFilter = (item) => {
    if (selectedDate) return item.sales_date === selectedDate;

    if (dateView === "today") return isSameDay(item.sales_date);
    if (dateView === "week") return isThisWeek(item.sales_date);
    if (dateView === "month") return isThisMonth(item.sales_date);
    if (dateView === "quarter") return isThisQuarter(item.sales_date);

    return true;
  };

  const filteredSite = siteSalesItems.filter(applyFilter);
  const filteredLeader = leaderSalesItems.filter(applyFilter);

  const summary = (items) => {
    const target = items.reduce((s, i) => s + Number(i.sales_target || 0), 0);
    const achieved = items.reduce((s, i) => s + Number(i.points_achieved || 0), 0);
    const percent = getPercentToTarget(target, achieved);

    return {
      target: target.toFixed(2),
      achieved: achieved.toFixed(2),
      percent,
      status: getStatusConfig(percent),
    };
  };

  const siteSummary = summary(filteredSite);
  const leaderSummary = summary(filteredLeader);

  return (
    <Layout title="Daily Sales" links={adminLinks}>
      <div className="card">
        <h2>Daily Sales Tracker</h2>

        {/* TABS */}
        <div className="sales-tab-row">
          <button onClick={() => setActiveTab("site")} className={activeTab==="site"?"sales-tab-active":""}>
            Site
          </button>
          <button onClick={() => setActiveTab("leader")} className={activeTab==="leader"?"sales-tab-active":""}>
            Leader
          </button>
        </div>

        {/* FILTERS */}
        <div className="sales-tab-row">
          <button onClick={()=>{setDateView("today");setSelectedDate("")}}>Today</button>
          <button onClick={()=>{setDateView("week");setSelectedDate("")}}>Week</button>
          <button onClick={()=>{setDateView("month");setSelectedDate("")}}>Month</button>
          <button onClick={()=>{setDateView("quarter");setSelectedDate("")}}>Quarter</button>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e)=>setSelectedDate(e.target.value)}
        />

        {/* SUMMARY */}
        <div className="sales-summary-grid">
          <div>Target: {(activeTab==="site"?siteSummary:leaderSummary).target}</div>
          <div>Achieved: {(activeTab==="site"?siteSummary:leaderSummary).achieved}</div>
          <div>%: {(activeTab==="site"?siteSummary:leaderSummary).percent}%</div>
        </div>

        {/* FORM (UNCHANGED CORE) */}
        {activeTab==="site" ? (
          <form onSubmit={handleSubmitSite}>
            <input type="date" name="sales_date" value={siteForm.sales_date} onChange={(e)=>setSiteForm({...siteForm, sales_date:e.target.value})}/>
            <input type="number" name="sales_target" value={siteForm.sales_target} onChange={(e)=>setSiteForm({...siteForm, sales_target:e.target.value})}/>
            <input type="number" name="points_achieved" value={siteForm.points_achieved} onChange={(e)=>setSiteForm({...siteForm, points_achieved:e.target.value})}/>
            <button>Add</button>
          </form>
        ) : (
          <form onSubmit={handleSubmitLeader}>
            <input type="date" name="sales_date" value={leaderForm.sales_date} onChange={(e)=>setLeaderForm({...leaderForm, sales_date:e.target.value})}/>
            <select onChange={(e)=>setLeaderForm({...leaderForm, leader_id:e.target.value})}>
              {leaders.map(l=>(
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <input type="number" name="sales_target" value={leaderForm.sales_target} onChange={(e)=>setLeaderForm({...leaderForm, sales_target:e.target.value})}/>
            <input type="number" name="points_achieved" value={leaderForm.points_achieved} onChange={(e)=>setLeaderForm({...leaderForm, points_achieved:e.target.value})}/>
            <button>Add</button>
          </form>
        )}

        {/* TABLE */}
        <div>
          {(activeTab==="site"?filteredSite:filteredLeader).map(item=>(
            <div key={item.id}>
              {item.sales_date} - {item.sales_target} / {item.points_achieved}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}