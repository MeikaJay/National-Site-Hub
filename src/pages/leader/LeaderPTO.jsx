import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

const leaderLinks = [
  { to: "/leader", label: "Dashboard" },
  { to: "/leader/attendance", label: "Attendance" },
  { to: "/leader/pto", label: "Leadership PTO" },
  { to: "/leader/training", label: "Weekly Training" },
  { to: "/leader/loa", label: "LOA" },
  { to: "/leader/pips", label: "PIPs" },
  { to: "/leader/schedules", label: "Schedules" },
];

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

export default function LeaderPTO() {
  const [ptoItems, setPtoItems] = useState([]);
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
    };
  });

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [ptoRes, blackoutRes] = await Promise.all([
      supabase
        .from("leadership_pto")
        .select(`
          id,
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

    if (ptoRes.error || blackoutRes.error) {
      setPageError(
        ptoRes.error?.message ||
          blackoutRes.error?.message ||
          "Something went wrong loading PTO data."
      );
      setLoading(false);
      return;
    }

    const ptoData = ptoRes.data || [];
    const blackoutData = blackoutRes.data || [];

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
          status: isBlockedDate(date)
            ? "blackout"
            : count >= 2
            ? "full"
            : count === 1
            ? "limited"
            : "available",
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
  }, [approvedCoverageMap, blackoutDates, visibleMonth, isBlockedDate]);

  return (
    <Layout title="Leadership PTO Calendar" links={leaderLinks}>
      <div className="card">
        <h2 className="section-title">Leadership Coverage Calendar</h2>
        <p className="section-subtext">
          View only reference calendar for leadership PTO and blackout dates.
        </p>

        <div className="blackout-alert">
          <strong>Blackout Notice:</strong> October 1 through December 7 is
          automatically blacked out each year for AEP.
        </div>

        {pageError && <p className="error-text">{pageError}</p>}

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
        <h2 className="section-title">Current PTO Entries</h2>
        <p className="section-subtext">
          View current leadership PTO entries for reference.
        </p>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Leader</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ptoItems.length === 0 ? (
                <tr>
                  <td colSpan="5">No PTO entries found.</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}