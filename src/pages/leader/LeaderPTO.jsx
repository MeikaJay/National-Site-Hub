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

export default function LeaderPTO() {
  const [ptoItems, setPtoItems] = useState([]);
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);

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

  const getDayStatus = useCallback(
    (dateString) => {
      if (isBlockedDate(dateString)) {
        return {
          label: "Blackout",
          className: "day-status-blackout",
        };
      }

      const taken = approvedCoverageMap[dateString] || 0;
      const remaining = Math.max(MAX_PTO_SLOTS - taken, 0);

      if (taken >= MAX_PTO_SLOTS) {
        return {
          label: "Full",
          className: "day-status-full",
        };
      }

      if (taken === 1) {
        return {
          label: `${remaining} slot left`,
          className: "day-status-limited",
        };
      }

      return {
        label: `${remaining} slots open`,
        className: "day-status-open",
      };
    },
    [approvedCoverageMap, isBlockedDate]
  );

  return (
    <Layout title="Leadership PTO Calendar" links={leaderLinks}>
      <div className="card">
        <h2 className="section-title">Leadership Coverage Calendar</h2>
        <p className="section-subtext">
          Leaders can view PTO already taken and daily space available.
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
            displayEventTime={false}
            dayMaxEvents={true}
            dayCellClassNames={(arg) => {
              const dateString = arg.date.toISOString().split("T")[0];
              return isBlockedDate(dateString) ? ["fc-blackout-day"] : [];
            }}
            dayCellContent={(arg) => {
              const dateString = arg.date.toISOString().split("T")[0];
              const dayStatus = getDayStatus(dateString);

              return (
                <div className="custom-day-cell">
                  <div className="custom-day-number">{arg.dayNumberText}</div>
                  <div className={`custom-day-status ${dayStatus.className}`}>
                    {dayStatus.label}
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>
    </Layout>
  );
}