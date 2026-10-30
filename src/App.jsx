import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import AboutUs from './pages/AboutUs';

import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './hooks/useAuth';

import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import HRLayout from './layouts/HRLayout';
import MemberLayout from './layouts/MemberLayout';

import LoginPage from './pages/auth/LoginPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageHR from './pages/admin/ManageHR';
import ManageEmployees from './pages/admin/ManageEmployees';
import ManageInterns from './pages/admin/ManageInterns';
import ManageProjects from './pages/admin/ManageProjects';
import UserDetails from './pages/admin/UserDetails';

import HRDashboard from './pages/hr/HRDashboard';
import ManagePeople from './pages/hr/ManagePeople';
import HRManageInterns from './pages/hr/ManageInterns';
import CreateProject from './pages/hr/CreateProject';
import HRProjectDetails from './pages/hr/HRProjectDetails';
import ProjectReviewPage from './pages/hr/ProjectReviewPage';
import HRProjects from './pages/hr/HRProjects';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeCurrentProject from './pages/employee/CurrentProject';
import EmployeePastProjects from './pages/employee/PastProjects';

import InternDashboard from './pages/intern/InternDashboard';
import InternCurrentProject from './pages/intern/CurrentProject';
import InternPastProjects from './pages/intern/PastProjects';

import NotFoundPage from './pages/errors/NotFoundPage';
import UnauthorizedPage from './pages/errors/UnauthorizedPage';

import './App.css';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading company portal..." />;
  }

  // Home route for the signed-in user's role. Used to redirect "/" and to
  // bounce already-authenticated users away from the login page.
  const dashboardPath = (() => {
    if (!user) return '/login';

    switch (user.role) {
      case 'Admin':
        return '/admin';
      case 'HR':
        return '/hr';
      case 'Employee':
        return '/employee';
      case 'Intern':
        return '/intern';
      default:
        return '/unauthorized';
    }
  })();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={dashboardPath} replace />} />

      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={user ? <Navigate to={dashboardPath} replace /> : <LoginPage />}
        />
      </Route>

      <Route
        path="/unauthorized"
        element={<UnauthorizedPage />}
      />

      <Route
        element={
          <ProtectedRoute allowedRoles={['Admin']} />
        }
      >
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="hr" element={<ManageHR />} />
          <Route path="employees" element={<ManageEmployees />} />
          <Route path="interns" element={<ManageInterns />} />
          <Route path="projects" element={<ManageProjects />} />
          <Route path="users/:userId" element={<UserDetails />} />
        </Route>
      </Route>

      {/* Admins can also open the HR area to create and staff projects. */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['HR', 'Admin']} />
        }
      >
        <Route path="/hr" element={<HRLayout />}>
          <Route index element={<HRDashboard />} />
          <Route path="people" element={<ManagePeople />} />
          <Route path="interns" element={<HRManageInterns />} />
          <Route path="projects" element={<HRProjects />} />
          <Route path="projects/create" element={<CreateProject />} />
          <Route path="projects/:projectId" element={<HRProjectDetails />} />
          <Route
            path="projects/:projectId/review"
            element={<ProjectReviewPage />}
          />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['Employee']} />
        }
      >
        <Route path="/employee" element={<MemberLayout />}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="current-project" element={<EmployeeCurrentProject />} />
          <Route path="past-projects" element={<EmployeePastProjects />} />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['Intern']} />
        }
      >
        <Route path="/intern" element={<MemberLayout />}>
          <Route index element={<InternDashboard />} />
          <Route path="current-project" element={<InternCurrentProject />} />
          <Route path="past-projects" element={<InternPastProjects />} />
        </Route>
      </Route>

      <Route path="/about" element={<AboutUs />} />

<Route
  path="*"
  element={<NotFoundPage />}
/>
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    document.title = 'Company Management Portal';
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}