import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { io } from 'socket.io-client'; // ✅ Added

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminProfile from './pages/AdminProfile';

// Manager pages
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerTeam from './pages/ManagerTeam';
import ManagerTasks from './pages/ManagerTasks';
import ManagerProfile from './pages/ManagerProfile';

// Employee pages
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeTasks from './pages/EmployeeTasks';
import EmployeeAttendance from './pages/EmployeeAttendance';
import EmployeeProfile from './pages/EmployeeProfile';
import LeaveRequestsPage from './pages/LeaveRequestsPage';

// Common pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';

// ✅ Setup socket
const socket = io('http://localhost:5000'); // Adjust to your server origin if deployed

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(storedUser);

    if (storedUser?.id) {
      socket.emit('join', storedUser.id); // ✅ Join room with user ID
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* 🌐 Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 🔐 Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard currentUser={currentUser} socket={socket} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <AdminProfile />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Manager Routes */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/team"
          element={
            <ProtectedRoute>
              <ManagerTeam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/tasks"
          element={
            <ProtectedRoute>
              <ManagerTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/profile"
          element={
            <ProtectedRoute>
              <ManagerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/leave-requests"
          element={
            <ProtectedRoute>
              <LeaveRequestsPage />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Employee Routes */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/tasks"
          element={
            <ProtectedRoute>
              <EmployeeTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/attendance"
          element={
            <ProtectedRoute>
              <EmployeeAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/profile"
          element={
            <ProtectedRoute>
              <EmployeeProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );

  
}

export default App;
