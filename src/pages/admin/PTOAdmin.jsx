import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/pto", label: "Leadership PTO" },
];

const MAX_PTO_SLOTS = 2;

function getDateRange(start, end) {
  const dates = [];
  const current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function isAEPBlackout(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const year = date.getFullYear();

  const aepStart = new Date(`${year}-10-01T00:00:00`);
  const aepEnd = new Date(`${year}-12-07T00:00:00`);

  return date >= aepStart && date <= aepEnd;
}

export default function PTOAdmin() {
  const [leaders, setLeaders] = useState([]);
  const [ptoItems, setPtoItems] = useState([]);
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingPTO, setSubmittingPTO] = useState(false);
  const [submittingBlackout, setSubmittingBlackout] = useState(false);

  const [showPTOEntries, setShowPTOEntries] = useState(false);
  const [showBlackoutEntries, setShowBlackoutEntries] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
    };
  });

  const [ptoForm, setPtoForm] = useState({
    leader_id: "",
    start_date: "",
    end_date: "",
    status: "approved",
    notes: "",
  });

  const [blackoutForm, setBlackoutForm] = useState({
    blackout_date: "",
    reason: "",
  });

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [leadersRes, ptoRes, blackoutRes] = await Promise.all([
      supabase
        .from("leaders")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true }),

      supabase
        .from("leadership_pto")
        .select(`
          id,
          leader_id,
          start_date,
          end_date,
          status,
          notes,
          leaders (name)
        `)
        .order("start_date", { ascending: true }),

      supabase
        .from("pto_blackout_dates")
        .select("id, blackout_date, reason")
        .order("blackout_date", { ascending: true }),
    ]);

    if (leadersRes.error || ptoRes.error || blackoutRes.error) {
      setPageError(
        leadersRes.error?.message ||
          ptoRes.error?.message ||
          blackoutRes.error?.message ||
          "Something went wrong loading PTO data."
      );
      setLoading(false);
      return;
    }

    const leadersData = leadersRes.data || [];
    const ptoData = ptoRes.data || [];
    const blackoutData = blackoutRes.data || [];

    setLeaders(leadersData);
    setPtoItems(ptoData);
    setBlackoutDates(blackoutData);

    const formattedEvents = ptoData.map((item) => {
      const endDate = new Date(`${item.end_date}T00:00:00`);
      endDate.setDate(endDate.getDate() + 1);

      return {
        id: item.id,
        title: item.leaders?.name || "Leader",
        start: item.start_date,
        end: endDate.toISOString().split("T")[0],
        allDay: true,
        backgroundColor:
          item.status === "approved"
            ? "#22c55e"
            : item.status === "pending"
            ? "#f59e0b"
            : "#94a3b8",
        borderColor:
          item.status === "approved"
            ? "#22c55e"
            : item.status === "pending"
            ? "#f59e0b"
            : "#94a3b8",
        textColor: "#ffffff",
      };
    });

    setEvents(formattedEvents);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const manualBlackoutMap = useMemo(() => {
    const map = {};
    blackoutDates.forEach((item) => {
      map[item.blackout_date] = item.reason || "Manual blackout date";
    });
    return map;
  }, [blackoutDates]);

  const isBlockedDate = useCallback(
    (dateString) => isAEPBlackout(dateString) || !!manualBlackoutMap[dateString],
    [manualBlackoutMap]
  );

  const approvedCoverageMap = useMemo(() => {
    const counts = {};
    const approvedItems = ptoItems.filter((item) => item.status === "approved");

    approvedItems.forEach((item) => {
      const dates = getDateRange(item.start_date, item.end_date);
      dates.forEach((date) => {
        counts[date] = (counts[date] || 0) + 1;
      });
    });

    return counts;
  }, [ptoItems]);

  const visibleMonthCoverage = useMemo(() => {
    const rows = new Map();
    const { year, month } = visibleMonth;

    Object.entries(approvedCoverageMap).forEach(([date, count]) => {
      const d = new Date(`${date}T00:00:00`);
      if (d.getFullYear() === year && d.getMonth() === month) {
        rows.set(date, {
          date,
          count,
          status:
            count >= MAX_PTO_SLOTS ? "full" : count > 0 ? "limited" : "available",
        });
      }
    });

    blackoutDates.forEach((item) => {
      const d = new Date(`${item.blackout_date}T00:00:00`);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!rows.has(item.blackout_date)) {
          rows.set(item.blackout_date, {
            date: item.blackout_date,
            count: 0,
            status: "blackout",
          });
        }
      }
    });

    if (month === 9 || month === 10 || month === 11) {
      const aepStart = new Date(`${year}-10-01T00:00:00`);
      const aepEnd = new Date(`${year}-12-07T00:00:00`);
      const cursor = new Date(aepStart);

      while (cursor <= aepEnd) {
        if (cursor.getFullYear() === year && cursor.getMonth() === month) {
          const date = cursor.toISOString().split("T")[0];
          if (!rows.has(date)) {
            rows.set(date, {
              date,
              count: 0,
              status: "blackout",
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [approvedCoverageMap, blackoutDates, visibleMonth]);

  const handlePTOChange = (e) => {
    const { name, value } = e.target;
    setPtoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlackoutChange = (e) => {
    const { name, value } = e.target;
    setBlackoutForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePTO = () => {
    if (!ptoForm.leader_id) return "Please select a leader.";
    if (!ptoForm.start_date || !ptoForm.end_date) return "Please select both start and end dates.";
    if (ptoForm.end_date < ptoForm.start_date) return "End date cannot be before start date.";

    const selectedDates = getDateRange(ptoForm.start_date, ptoForm.end_date);

    for (const date of selectedDates) {
      if (isBlockedDate(date)) {
        return `One or more selected dates are blocked or blacked out.`;
      }

      const approvedCount = approvedCoverageMap[date] || 0;
      if (ptoForm.status === "approved" && approvedCount >= MAX_PTO_SLOTS) {
        return `One or more selected dates are already full.`;
      }
    }

    return "";
  };

  const handlePTOSubmit = async (e) => {
    e.preventDefault();
    setPageError("");

    const validationMessage = validatePTO();
    if (validationMessage) {
      setPageError(validationMessage);
      return;
    }

    setSubmittingPTO(true);

    const { error } = await supabase.from("leadership_pto").insert([
      {
        leader_id: ptoForm.leader_id,
        start_date: ptoForm.start_date,
        end_date: ptoForm.end_date,
        status: ptoForm.status,
        notes: ptoForm.notes || null,
      },
    ]);

    if (error) {
      setPageError(error.message);
      setSubmittingPTO(false);
      return;
    }

    setPtoForm({
      leader_id: "",
      start_date: "",
      end_date: "",
      status: "approved",
      notes: "",
    });

    await loadPageData();
    setSubmittingPTO(false);
  };

  const handlePTORemove = async (id) => {
    const confirmed = window.confirm("Are you sure you want to remove this PTO entry?");
    if (!confirmed) return;

    setPageError("");

    const { error } = await supabase
      .from("leadership_pto")
      .delete()
      .eq("id", id);

    if (error) {
      setPageError(error.message);
      return;
    }

    await loadPageData();
  };

  const handleBlackoutSubmit = async (e) => {
    e.preventDefault();
    setPageError("");

    if (!blackoutForm.blackout_date) {
      setPageError("Please select a blackout date.");
      return;
    }

    if (isAEPBlackout(blackoutForm.blackout_date)) {
      setPageError("That date is already blacked out automatically for AEP.");
      return;
    }

    if (manualBlackoutMap[blackoutForm.blackout_date]) {
      setPageError("That blackout date already exists.");
      return;
    }

    setSubmittingBlackout(true);

    const { error } = await supabase.from("pto_blackout_dates").insert([
      {
        blackout_date: blackoutForm.blackout_date,
        reason: blackoutForm.reason || null,
      },
    ]);

    if (error) {
      setPageError(error.message);
      setSubmittingBlackout(false);
      return;
    }

    setBlackoutForm({
      blackout_date: "",
      reason: "",
    });

    await loadPageData();
    setSubmittingBlackout(false);
  };

  const handleBlackoutRemove = async (id) => {
    const confirmed = window.confirm("Are you sure you want to remove this blackout date?");
    if (!confirmed) return;

    setPageError("");

    const { error } = await supabase
      .from("pto_blackout_dates")
      .delete()
      .eq("id", id);

    if (error) {
      setPageError(error.message);
      return;
    }

    await loadPageData();
  };

  return (
    <Layout title="Leadership PTO Calendar" links={adminLinks}>
      <div className="card">
        <h2 className="section-title">PTO Actions</h2>
        <p className="section-subtext">
          Enter PTO and add blackout dates for leadership coverage planning.
        </p>

        <div className="blackout-alert">
          <strong>Blackout Notice:</strong> October 1 through December 7 is
          automatically blacked out each year for AEP.
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

        <div className="dual-form-grid">
          <div>
            <h3 className="mini-section-title">Enter PTO</h3>

            <form onSubmit={handlePTOSubmit} className="pto-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Leader</label>
                  <select
                    name="leader_id"
                    value={ptoForm.leader_id}
                    onChange={handlePTOChange}
                    required
                  >
                    <option value="">Select leader</option>
                    {leaders.map((leader) => (
                      <option key={leader.id} value={leader.id}>
                        {leader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={ptoForm.start_date}
                    onChange={handlePTOChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={ptoForm.end_date}
                    onChange={handlePTOChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Status</label>
                  <select
                    name="status"
                    value={ptoForm.status}
                    onChange={handlePTOChange}
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={ptoForm.notes}
                  onChange={handlePTOChange}
                  placeholder="Optional notes"
                  rows="3"
                />
              </div>

              <button type="submit" className="primary-btn" disabled={submittingPTO}>
                {submittingPTO ? "Saving..." : "Add PTO"}
              </button>
            </form>
          </div>

          <div>
            <h3 className="mini-section-title">Add Blackout</h3>

            <form onSubmit={handleBlackoutSubmit} className="pto-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Blackout Date</label>
                  <input
                    type="date"
                    name="blackout_date"
                    value={blackoutForm.blackout_date}
                    onChange={handleBlackoutChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Reason</label>
                  <input
                    type="text"
                    name="reason"
                    value={blackoutForm.reason}
                    onChange={handleBlackoutChange}
                    placeholder="Example: Leadership meeting or site event"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={submittingBlackout}
              >
                {submittingBlackout ? "Saving..." : "Add Blackout Date"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">Leadership Coverage Calendar</h2>
        <p className="section-subtext">
          Max 2 leaders off at one time.
        </p>

        <div className="legend-row">
          <div className="legend-item">
            <span className="legend-dot legend-green" />
            <span>Approved PTO</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-yellow" />
            <span>Pending PTO</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-red" />
            <span>Full, 2 Leaders Off</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-blackout" />
            <span>Blackout Dates</span>
          </div>
        </div>

        {loading ? (
          <p>Loading PTO calendar...</p>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            height="auto"
            displayEventTime={false}
            dayMaxEvents={true}
            datesSet={(info) => {
              setVisibleMonth({
                year: info.view.currentStart.getFullYear(),
                month: info.view.currentStart.getMonth(),
              });
            }}
            dayCellClassNames={(arg) => {
              const dateString = arg.date.toISOString().split("T")[0];
              return isBlockedDate(dateString) ? ["fc-blackout-day"] : [];
            }}
          />
        )}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">Visible Month Coverage Status</h2>
        <p className="section-subtext">
          This section only shows the month currently open on the calendar.
        </p>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Leaders Off</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleMonthCoverage.length === 0 ? (
                <tr>
                  <td colSpan="3">No coverage items for this month.</td>
                </tr>
              ) : (
                visibleMonthCoverage.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>{day.count}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          day.status === "blackout"
                            ? "status-blackout"
                            : day.status === "full"
                            ? "status-denied"
                            : day.status === "limited"
                            ? "status-pending"
                            : "status-approved"
                        }`}
                      >
                        {day.status === "blackout"
                          ? "Blackout"
                          : day.status === "full"
                          ? "Full"
                          : day.status === "limited"
                          ? "Limited"
                          : "Available"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h2 className="section-title">Manage Existing Entries</h2>
        <p className="section-subtext">
          Open only what you need to manage.
        </p>

        <div className="manage-toggle-row">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setShowPTOEntries((prev) => !prev)}
          >
            {showPTOEntries ? "Hide PTO Entries" : "View PTO Entries"}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => setShowBlackoutEntries((prev) => !prev)}
          >
            {showBlackoutEntries ? "Hide Blackout Dates" : "View Blackout Dates"}
          </button>
        </div>

        {showPTOEntries && (
          <div style={{ marginTop: "20px" }}>
            <h3 className="mini-section-title">Current PTO Entries</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leader</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ptoItems.length === 0 ? (
                    <tr>
                      <td colSpan="6">No PTO entries found.</td>
                    </tr>
                  ) : (
                    ptoItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.leaders?.name || "Unknown"}</td>
                        <td>{item.start_date}</td>
                        <td>{item.end_date}</td>
                        <td>
                          <span className={`status-pill status-${item.status}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{item.notes || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handlePTORemove(item.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showBlackoutEntries && (
          <div style={{ marginTop: "20px" }}>
            <h3 className="mini-section-title">Current Manual Blackout Dates</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blackoutDates.length === 0 ? (
                    <tr>
                      <td colSpan="3">No manual blackout dates added.</td>
                    </tr>
                  ) : (
                    blackoutDates.map((item) => (
                      <tr key={item.id}>
                        <td>{item.blackout_date}</td>
                        <td>{item.reason || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleBlackoutRemove(item.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}