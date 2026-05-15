import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ForgotPassPage from './pages/FogotPassPage.jsx';
import VerifyOtpPage from './pages/VerifyOtpPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Tự động chuyển hướng từ "/" sang "/login" */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgotPassword" element={<ForgotPassPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />

        {/* Protected Route */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;