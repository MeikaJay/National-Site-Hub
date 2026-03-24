import PIPAdmin from "./pages/admin/PIPAdmin";
import LeaderPIPs from "./pages/leader/LeaderPIPs";
import ScheduleAdmin from "./pages/admin/ScheduleAdmin";
import LeaderSchedules from "./pages/leader/LeaderSchedules";
import AttendanceAdmin from "./pages/admin/AttendanceAdmin";
import LeaderAttendance from "./pages/leader/LeaderAttendance";
import LOAAdmin from "./pages/admin/LOAAdmin";
import LeaderLOA from "./pages/leader/LeaderLOA";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";

import AdminDashboard from "./pages/admin/AdminDashboard";
import PTOAdmin from "./pages/admin/PTOAdmin";
import TrainingAdmin from "./pages/admin/TrainingAdmin";

import LeaderDashboard from "./pages/leader/LeaderDashboard";
import LeaderPTO from "./pages/leader/LeaderPTO";
import LeaderTraining from "./pages/leader/LeaderTraining";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/pto" element={<PTOAdmin />} />
      <Route path="/admin/training" element={<TrainingAdmin />} />

      <Route path="/leader" element={<LeaderDashboard />} />
      <Route path="/leader/pto" element={<LeaderPTO />} />
      <Route path="/leader/training" element={<LeaderTraining />} />
      <Route path="/admin/loa" element={<LOAAdmin />} />
<Route path="/leader/loa" element={<LeaderLOA />} />
<Route path="/admin/attendance" element={<AttendanceAdmin />} />
<Route path="/leader/attendance" element={<LeaderAttendance />} />
<Route path="/admin/schedules" element={<ScheduleAdmin />} />
<Route path="/leader/schedules" element={<LeaderSchedules />} />
<Route path="/admin/pips" element={<PIPAdmin />} />
<Route path="/leader/pips" element={<LeaderPIPs />} />
<Route path="/admin/sales" element={<SalesTrackerAdmin />} />
<Route path="/leader/sales" element={<LeaderSalesTracker />} />
    </Routes>
  );
}