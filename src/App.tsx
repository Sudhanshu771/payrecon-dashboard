import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/authContext';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PaymentsPage from './pages/PaymentsPage';
import ReconciliationPage from './pages/ReconciliationPage';
import RunDetailsPage from './pages/RunDetailsPage';
import StatementsPage from './pages/StatementsPage';
import './App.css';

// ROUTES: which page shows for which URL (like @GetMapping, but in the browser)
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Everything below needs a login, and shares the Layout (menu + top bar) */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<HomeRedirect />} />
        <Route path="/payments" element={
          <RequireAuth roles={['OPERATOR', 'AUDITOR']}><PaymentsPage /></RequireAuth>} />
        <Route path="/statements" element={
          <RequireAuth roles={['AUDITOR']}><StatementsPage /></RequireAuth>} />
        <Route path="/reconciliation" element={
          <RequireAuth roles={['AUDITOR']}><ReconciliationPage /></RequireAuth>} />
        <Route path="/reconciliation/:runId" element={
          <RequireAuth roles={['AUDITOR']}><RunDetailsPage /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// "/" → the right start page for the user's role
function HomeRedirect() {
  const { hasRole } = useAuth();
  return <Navigate to={hasRole('AUDITOR') ? '/reconciliation' : '/payments'} replace />;
}
