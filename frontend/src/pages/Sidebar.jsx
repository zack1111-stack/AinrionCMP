import React from 'react';
import './styles/Sidebar.css';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  ClipboardList,
  UserCheck,
  BarChart2,
  LogOut,
  FileText
} from 'lucide-react';

const Sidebar = ({ role }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const renderLinks = () => {
    switch (role) {
      case 'admin':
        return (
          <>
            <li onClick={() => navigate('/admin/dashboard')}><Home size={20} /> Dashboard</li>
            <li onClick={() => navigate('/admin/users')}><Users size={20} /> Users</li>
            <li onClick={() => navigate('/admin/analytics')}><BarChart2 size={20} /> Analytics</li>
            <li onClick={handleLogout}><LogOut size={20} /> Logout</li>
          </>
        );
      case 'manager':
        return (
          <>
            <li onClick={() => navigate('/manager/dashboard')}><Home size={20} /> Dashboard</li>
            <li onClick={() => navigate('/manager/team')}><Users size={20} /> My Team</li>
            <li onClick={() => navigate('/manager/assign-task')}><ClipboardList size={20} /> Assign Task</li>
            <li onClick={() => navigate('/manager/my-tasks')}><FileText size={20} /> My Tasks</li>
            <li onClick={handleLogout}><LogOut size={20} /> Logout</li>
          </>
        );
      case 'employee':
        return (
          <>
            <li onClick={() => navigate('/employee/dashboard')}><Home size={20} /> Dashboard</li>
            <li onClick={() => navigate('/employee/tasks')}><ClipboardList size={20} /> My Tasks</li>
            <li onClick={() => navigate('/employee/attendance')}><UserCheck size={20} /> Attendance</li>
            <li onClick={() => navigate('/employee/profile')}><Users size={20} /> Profile</li>
            <li onClick={handleLogout}><LogOut size={20} /> Logout</li>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="sidebar">
      <ul className="sidebar-links">
        {renderLinks()}
      </ul>
    </div>
  );
};

export default Sidebar;
