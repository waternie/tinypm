import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

const AgentHome = lazy(() => import('./pages/AgentHome'));
const MemberList = lazy(() => import('./pages/members/MemberList'));
const ProjectManagement = lazy(() => import('./pages/ProjectManagement'));
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail'));
const UserManagement = lazy(() => import('./pages/users/UserManagement'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
    <div className="spinner spinner-lg" />
  </div>
);

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={(
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<Navigate to="/agent" replace />} />
          <Route path="agent" element={<AgentHome />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="members" element={<MemberList />} />
          <Route
            path="users"
            element={(
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            )}
          />
        </Route>
        <Route path="*" element={<Navigate to="/agent" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
