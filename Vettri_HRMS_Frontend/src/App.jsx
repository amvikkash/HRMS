import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import PublicSiteLayout from './pages/landing/PublicSiteLayout';
import Home from './pages/landing/Home';
import About from './pages/landing/About';
import Contact from './pages/landing/Contact';
import Login from './pages/Login';
import ActivateAccount from './pages/ActivateAccount';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import EmployeeImport from './pages/employees/EmployeeImport';
import AttendanceList from './pages/attendance/AttendanceList';
import Devices from './pages/attendance/Devices';
import LeaveRequests from './pages/leave/LeaveRequests';
const JobOpenings = lazy(() => import('./pages/recruitment/JobOpenings'));
const CandidatePipeline = lazy(() => import('./pages/recruitment/CandidatePipeline'));
const MyInterviews = lazy(() => import('./pages/recruitment/MyInterviews'));
import CareersList from './pages/careers/CareersList';
import JobApply from './pages/careers/JobApply';
const PerformanceHub = lazy(() => import('./pages/performance/PerformanceHub'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const ExecutiveOverview = lazy(() => import('./pages/reports/ExecutiveOverview'));
const RecruiterDashboard = lazy(() => import('./pages/recruitment/RecruiterDashboard'));
const SalaryDashboard = lazy(() => import('./pages/salary/SalaryDashboard'));
const EmployeeSalaryList = lazy(() => import('./pages/salary/EmployeeSalaryList'));
const SalaryStructurePage = lazy(() => import('./pages/salary/SalaryStructurePage'));
const PayrollProcessing = lazy(() => import('./pages/salary/PayrollProcessing'));
const SalaryDetails = lazy(() => import('./pages/salary/SalaryDetails'));
const SalaryReports = lazy(() => import('./pages/salary/SalaryReports'));
const MonitoringDashboard = lazy(() => import('./pages/monitoring/MonitoringDashboard'));
const MonitoringDevices = lazy(() => import('./pages/monitoring/Devices'));
const MonitoringDeviceDetails = lazy(() => import('./pages/monitoring/DeviceDetails'));
const MonitoringActivity = lazy(() => import('./pages/monitoring/Activity'));
import SettingsUsers from './pages/SettingsUsers';
import SettingsOrganization from './pages/SettingsOrganization';
import SettingsLeave from './pages/SettingsLeave';
import SettingsAudit from './pages/SettingsAudit';
import NotFound from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import SupportInfo from './pages/SupportInfo';
import Welcome from './pages/Welcome';
const Requirements = lazy(() => import('./pages/Requirements'));
const MonitoringReports = lazy(() => import('./pages/monitoring/MonitoringReports'));
const SettingsPlatform = lazy(() => import('./pages/SettingsPlatform'));

export default function App() {
  return (
    <Suspense fallback={<div className="p-4 text-secondary-hz">Loading...</div>}><Routes>
      <Route element={<PublicSiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/careers" element={<CareersList />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/activate-account" element={<ActivateAccount />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/careers/:jobId" element={<JobApply />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="welcome" element={<Welcome />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/import" element={<EmployeeImport />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<AttendanceList />} />
          <Route path="attendance/devices" element={<Devices />} />
          <Route path="leave" element={<LeaveRequests />} />
          <Route path="recruitment" element={<JobOpenings />} />
          <Route path="recruitment/:jobOpeningId" element={<CandidatePipeline />} />
          <Route path="my-recruitment" element={<RecruiterDashboard />} />
          <Route path="my-interviews" element={<MyInterviews />} />
          <Route path="performance" element={<PerformanceHub />} />
          <Route path="monitoring" element={<MonitoringDashboard />} />
          <Route path="monitoring/live" element={<MonitoringDashboard />} />
          <Route path="monitoring/devices" element={<MonitoringDevices />} />
          <Route path="monitoring/devices/:id" element={<MonitoringDeviceDetails />} />
          <Route path="monitoring/activity" element={<MonitoringActivity />} />
          <Route path="monitoring/reports" element={<MonitoringReports />} />
          <Route path="salary" element={<SalaryDashboard />} />
          <Route path="salary/employees" element={<EmployeeSalaryList />} />
          <Route path="salary/employees/:employeeId" element={<SalaryDetails />} />
          <Route path="salary/structure" element={<SalaryStructurePage />} />
          <Route path="salary/payroll-processing" element={<PayrollProcessing />} />
          <Route path="salary/reports" element={<SalaryReports />} />
          <Route path="my-payslip" element={<SalaryDetails />} />
          <Route path="reports" element={<Reports />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="executive" element={<ExecutiveOverview />} />
          <Route path="settings/users" element={<SettingsUsers />} />
          <Route path="settings/organization" element={<SettingsOrganization />} />
          <Route path="settings/leave" element={<SettingsLeave />} />
          <Route path="settings/audit" element={<SettingsAudit />} />
          <Route path="settings/platform" element={<SettingsPlatform />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="support" element={<SupportInfo />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes></Suspense>
  );
}
