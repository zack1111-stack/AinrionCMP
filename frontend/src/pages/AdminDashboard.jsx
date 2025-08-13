import React, { useState, useEffect, useRef } from 'react';

import './styles/AdminDashboard.css';
//import MessagesPage from './MessagesPage'; // already built
import { io } from 'socket.io-client';


import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  User,
  Calendar,
  AlertCircle,
  Clock,
  Activity,
  Zap,
  ClipboardList,
  Download,
  TrendingUp,
  CheckCircle,
  Award,
 
  BarChart2,
  
  MessageCircle,
  LogOut,
  Send
} from 'lucide-react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';

const AdminDashboard = () => {
  

  const [admin, setAdmin] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [messages, setMessages] = useState([]);
const [message, setMessage] = useState('');
const manager = JSON.parse(localStorage.getItem('user'));
const chatEndRef = useRef(null);
const myId = (admin?.id || manager?.id || null);



  useEffect(() => {
    if (activeTab === 'user') fetchUsers();
    if (activeTab === 'team') fetchTeams();
    if (activeTab === 'tasks') fetchTasks();
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab]);

  useEffect(() => {
    // Fetch current admin info
    const fetchAdmin = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`);
        setAdmin(res.data);
      } catch (err) {
        console.error('Failed to fetch admin info:', err);
      }
    };

    fetchAdmin();
  }, []);


  useEffect(() => {
  if (chatEndRef.current) {
    chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages]);



useEffect(() => {
  const adminData = JSON.parse(localStorage.getItem('user'));
  setAdmin(adminData);

  if (adminData?.id) {
    const newSocket = io('http://localhost:5000'); // or use process.env.REACT_APP_API_URL
    setSocket(newSocket);
    newSocket.emit('join', adminData.id);

    return () => newSocket.disconnect();
  }
}, []);



  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const sendMessage = async (e) => {
  e.preventDefault();
  if (!message.trim() || !selectedUser || !admin || !socket) return;

  const msgPayload = {
    fromUserId: admin.id,
    toUserId: selectedUser.id,
    message: message.trim(),
  };

  try {
    const res = await axios.post('http://localhost:5000/api/messages/send', msgPayload);

    const newMessage = {
      ...msgPayload,
      timestamp: res.data.timestamp,
      sender_id: admin.id,
      receiver_id: selectedUser.id,
    };

    // Update messages state directly without relying on socket listener
    setMessages((prev) => [...prev, newMessage]);

    // Emit the message to the socket
    socket.emit('private_message', newMessage);

    setMessage('');
  } catch (err) {
    console.error("❌ Failed to send message:", err);
  }
};



  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/teams`);
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/tasks`);
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/attendance/admin-summary`);
      setAttendance(res.data);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  };

  

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/analytics`);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  useEffect(() => {
  if (activeTab === 'messages') {
    fetchUsers();
  }
}, [activeTab]);

useEffect(() => {
  const fetchMessages = async () => {
    if (!selectedUser || !admin) return;

    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${admin.id}/${selectedUser.id}`);
      // Normalize sender_id/receiver_id for correct alignment after refresh
      const formatted = res.data.map(msg => ({
        ...msg,
        sender_id: Number(msg.sender_id || msg.fromUserId),
        receiver_id: Number(msg.receiver_id || msg.toUserId),
      }));
      setMessages(formatted);
    } catch (err) {
      console.error('❌ Failed to load messages:', err);
    }
  };

  fetchMessages();
}, [selectedUser, admin]);

useEffect(() => {
  const storedUser = JSON.parse(localStorage.getItem('user'));
  if (!storedUser?.id) return;

  setAdmin(storedUser);

  const newSocket = io('http://localhost:5000');
  setSocket(newSocket);
  newSocket.emit('join', storedUser.id);

  return () => newSocket.disconnect();
}, []);

useEffect(() => {
  if (!socket || !admin) return;

  const handlePrivateMessage = (data) => {
    // Normalize sender/receiver for correct rendering
    const normalized = {
      ...data,
      sender_id: data.fromUserId,
      receiver_id: data.toUserId,
    };

    // Only add if message is relevant to this chat and not already present
    setMessages((prev) => {
      const isDuplicate = prev.some(
        (msg) => msg.timestamp === normalized.timestamp && msg.message === normalized.message
      );
      if (
        !isDuplicate &&
        ((normalized.sender_id === selectedUser?.id && normalized.receiver_id === admin.id) ||
          (normalized.sender_id === admin.id && normalized.receiver_id === selectedUser?.id))
      ) {
        return [...prev, normalized];
      }
      return prev;
    });
  };

  socket.on('private_message', handlePrivateMessage);

  return () => {
    socket.off('private_message', handlePrivateMessage);
  };
}, [socket, selectedUser, admin]);




  const handleEdit = (user) => {
    setSelectedUser(user);
    setActiveTab('editUser');
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Delete this user?`)) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert('Error deleting user');
      }
    }
  };

  const handleUserUpdate = async (e) => {
    e.preventDefault();
    const updated = {
      name: e.target.name.value,
      email: e.target.email.value,
      role: e.target.role.value,
    };

    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/users/${selectedUser.id}`, updated);
      alert('User updated');
      setActiveTab('user');
      fetchUsers();
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleEditTeam = (team) => {
    // You can implement team editing functionality here
    // Similar to handleEdit for users
    alert('Edit team functionality will be implemented here');
  };

  const handleDeleteTeam = async (id) => {
    if (window.confirm(`Delete this team?`)) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/teams/${id}`);
        fetchTeams();
      } catch (err) {
        alert('Error deleting team');
      }
    }
  };

  const handleEditTask = (task) => {
    // You can implement task editing functionality here
    alert('Edit task functionality will be implemented here');
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm(`Delete this task?`)) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/tasks/${id}`);
        fetchTasks();
      } catch (err) {
        alert('Error deleting task');
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': {
        return (
          <div className="dashboard-content" style={{ 
            padding: '2rem',
            background: '#181824',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            {/* Header with Welcome Message and Quick Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '4px 0' }}>
              <div>
                <h1 style={{ color: '#4fc3f7', fontWeight: 700, fontSize: 24, marginBottom: 2, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>Welcome back, Admin 👋</h1>
                <p style={{ color: '#b3e5fc', fontSize: 14, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", letterSpacing: '0.3px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              </div>
              
              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button onClick={() => setActiveTab('user')} style={{
                  background: '#232336',
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: '1px solid #4fc3f7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <UserPlus size={18} color="#4fc3f7" />
                  Add New User
                </button>
                
                <select 
                  style={{ 
                    background: '#232336',
                    color: '#fff',
                    border: '1px solid #4fc3f7',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  onChange={(e) => console.log('Time range:', e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
              marginBottom: 28
            }}>
              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #4fc3f7',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 500, letterSpacing: '0.3px' }}>Total Users</p>
                  <Users size={24} color="#4fc3f7" />
                </div>
                <h2 style={{ fontSize: 38, margin: 0, color: '#fff', fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", letterSpacing: '-0.5px' }}>{users.length}</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontWeight: 500 }}>↑ 12% from last month</p>
              </div>

              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #2ecc71',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 16, margin: 0 }}>Active Teams</p>
                  <Users size={24} color="#2ecc71" />
                </div>
                <h2 style={{ fontSize: 36, margin: 0, color: '#fff', fontWeight: 700 }}>{teams.length}</h2>
                <p style={{ fontSize: 14, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 5% from last month</p>
              </div>

              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #f1c40f',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 16, margin: 0 }}>Pending Tasks</p>
                  <ClipboardList size={24} color="#f1c40f" />
                </div>
                <h2 style={{ fontSize: 36, margin: 0, color: '#fff', fontWeight: 700 }}>{tasks.filter(t => !t.completed).length}</h2>
                <p style={{ fontSize: 14, color: '#e74c3c', margin: '8px 0 0 0' }}>↑ 3 new tasks today</p>
              </div>

              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #9b59b6',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 16, margin: 0 }}>Today's Attendance</p>
                  <Calendar size={24} color="#9b59b6" />
                </div>
                <h2 style={{ fontSize: 36, margin: 0, color: '#fff', fontWeight: 700 }}>
                  {attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
                </h2>
                <p style={{ fontSize: 14, color: '#2ecc71', margin: '8px 0 0 0' }}>95% attendance rate</p>
              </div>
            </div>

            {/* Recent Activity and Quick Access */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              {/* Recent Activity */}
              <div style={{ 
                background: '#232336',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  color: '#4fc3f7', 
                  fontSize: 20, 
                  marginBottom: 16, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontWeight: 600,
                  letterSpacing: '-0.3px'
                }}>
                  <Activity size={20} color="#4fc3f7" /> Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...tasks, ...attendance]
                    .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
                    .slice(0, 5)
                    .map((item, i) => (
                      <div key={i} style={{ 
                        padding: '12px 16px',
                        background: '#181824',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <p style={{ 
                            margin: 0, 
                            color: '#fff', 
                            fontSize: 14,
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontWeight: 500,
                            letterSpacing: '0.2px'
                          }}>
                            {item.title || `${item.user_name} marked ${item.status}`}
                          </p>
                          <small style={{ 
                            color: '#b3e5fc',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: '12px',
                            letterSpacing: '0.2px'
                          }}>
                            {new Date(item.date || item.created_at).toLocaleString()}
                          </small>
                        </div>
                        <span style={{ 
                          padding: '4px 12px',
                          borderRadius: 12,
                          fontSize: 12,
                          background: item.title ? '#4fc3f7' : '#2ecc71',
                          color: '#fff'
                        }}>
                          {item.title ? 'Task' : 'Attendance'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Quick Access */}
              <div style={{ 
                background: '#232336',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  color: '#4fc3f7', 
                  fontSize: 20, 
                  marginBottom: 16, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontWeight: 600,
                  letterSpacing: '-0.3px'
                }}>
                  <Zap size={20} color="#4fc3f7" /> Quick Access
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { icon: <UserPlus size={18} />, label: 'Add New User', action: () => setActiveTab('user') },
                    { icon: <Users size={18} />, label: 'Manage Teams', action: () => setActiveTab('team') },
                    { icon: <ClipboardList size={18} />, label: 'View Tasks', action: () => setActiveTab('tasks') },
                    { icon: <Calendar size={18} />, label: 'Check Attendance', action: () => setActiveTab('attendance') },
                    { icon: <BarChart2 size={18} />, label: 'View Analytics', action: () => setActiveTab('analytics') }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      style={{
                        background: '#181824',
                        border: 'none',
                        borderRadius: 8,
                        padding: '14px 16px',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: '100%',
                        textAlign: 'left',
                        marginBottom: '4px'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateX(8px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      {React.cloneElement(item.icon, { color: '#4fc3f7' })}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'user': {
        return (
          <div className="user-management-page" style={{ 
            padding: '2rem',
            background: '#181824',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ 
              fontWeight: 700, 
              fontSize: 20, 
              margin: '0 0 24px 0', 
              color: '#fff', 
              textAlign: 'left',
              borderBottom: '2px solid #232336',
              paddingBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <UserPlus size={20} color="#4fc3f7" />
              User Management
            </h2>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <select style={{
                  background: '#232336',
                  border: '1px solid #4fc3f7',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px'
                }}>
                  <option value="all">All Users</option>
                  <option value="admin">Admins</option>
                  <option value="manager">Managers</option>
                  <option value="employee">Employees</option>
                </select>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    style={{
                      background: '#232336',
                      border: '1px solid #4fc3f7',
                      color: '#fff',
                      padding: '8px 12px',
                      paddingLeft: '36px',
                      borderRadius: '8px',
                      width: '250px',
                      fontSize: '14px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    }}
                  />
                  <Search 
                    size={16} 
                    color="#4fc3f7" 
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                </div>
              </div>
              <button style={{
                background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                boxShadow: '0 2px 4px rgba(79, 195, 247, 0.2)',
                transition: 'all 0.2s ease'
              }}>
                <UserPlus size={16} />
                Add New User
              </button>
            </div>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="user-table" style={{ 
                width: '100%', 
                borderCollapse: 'separate',
                borderSpacing: '0 8px',
                background: 'none'
              }}>
                <thead>
                  <tr style={{ 
                    color: '#4fc3f7',
                    fontWeight: 600,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  }}>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Role</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Last Active</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} style={{ 
                      background: '#232336',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      ':hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }
                    }}>
                      <td style={{ 
                        padding: '16px', 
                        color: '#fff',
                        borderRadius: '8px 0 0 8px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#fff'
                        }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{user.name}</div>
                          <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>ID: #{user.id}</div>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px', 
                        color: '#a0aec0',
                        fontSize: '14px',
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      }}>{user.email}</td>
                      <td style={{ 
                        padding: '16px'
                      }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          background: user.role === 'admin' ? '#4fc3f7' : user.role === 'manager' ? '#2196f3' : '#64b5f6',
                          color: '#fff',
                          textTransform: 'capitalize',
                          fontWeight: 500,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}>{user.role}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: user.active ? '#4CAF50' : '#a0aec0'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: user.active ? '#4CAF50' : '#a0aec0'
                          }}></div>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{
                        padding: '16px',
                        color: '#a0aec0',
                        fontSize: '13px',
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      }}>
                        {new Date().toLocaleDateString()}
                      </td>
                      <td style={{ 
                        padding: '16px',
                        borderRadius: '0 8px 8px 0'
                      }}>
                        <button onClick={() => handleEdit(user)} style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          marginRight: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
                          ':hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                          }
                        }}>Edit</button>
                        <button onClick={() => handleDelete(user.id)} style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)',
                          ':hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                          }
                        }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'editUser': {
        return (
          <div className="edit-user-form">
            <h2>Edit User</h2>
            <form onSubmit={handleUserUpdate}>
              <label>
                Name:
                <input name="name" type="text" defaultValue={selectedUser?.name} required />
              </label>
              <label>
                Email:
                <input name="email" type="email" defaultValue={selectedUser?.email} required />
              </label>
              <label>
                Role:
                <select name="role" defaultValue={selectedUser?.role}>
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Employee</option>
                </select>
              </label>
              <button type="submit">Update User</button>
            </form>
          </div>
        );
      }

      case 'team': {
        return (
          <div className="team-management-page" style={{ 
            padding: '2rem',
            background: '#181824',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ 
              fontWeight: 700, 
              fontSize: 20, 
              margin: '0 0 24px 0', 
              color: '#fff', 
              textAlign: 'left',
              borderBottom: '2px solid #232336',
              paddingBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Users size={20} color="#4fc3f7" />
              Team Management
            </h2>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <select style={{
                  background: '#232336',
                  border: '1px solid #4fc3f7',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px'
                }}>
                  <option value="all">All Teams</option>
                  <option value="active">Active Teams</option>
                  <option value="empty">Empty Teams</option>
                </select>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Search teams..."
                    style={{
                      background: '#232336',
                      border: '1px solid #4fc3f7',
                      color: '#fff',
                      padding: '8px 12px',
                      paddingLeft: '36px',
                      borderRadius: '8px',
                      width: '250px',
                      fontSize: '14px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    }}
                  />
                  <Search 
                    size={16} 
                    color="#4fc3f7" 
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                </div>
              </div>
              <button style={{
                background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                boxShadow: '0 2px 4px rgba(79, 195, 247, 0.2)',
                transition: 'all 0.2s ease'
              }}>
                <Users size={16} />
                Add New Team
              </button>
            </div>
            {teams.length === 0 ? (
              <div style={{ 
                color: '#666',
                fontSize: 18,
                marginTop: 16,
                textAlign: 'center',
                padding: '40px',
                background: '#232336',
                borderRadius: '12px',
                border: '2px dashed #333'
              }}>No teams found.</div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="team-table" style={{ 
                  width: '100%', 
                  borderCollapse: 'separate',
                  borderSpacing: '0 8px',
                  background: 'none'
                }}>
                  <thead>
                    <tr style={{ 
                      color: '#4fc3f7',
                      fontWeight: 600,
                      fontSize: 13,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Team Name</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Members</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Created Date</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, idx) => (
                      <tr key={team.id} style={{ 
                        background: '#232336',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        ':hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }
                      }}>
                        <td style={{ 
                          padding: '16px', 
                          color: '#fff',
                          borderRadius: '8px 0 0 8px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#fff'
                          }}>
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{team.name}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>ID: #{team.id}</div>
                          </div>
                        </td>
                        <td style={{ 
                          padding: '16px', 
                          color: '#a0aec0',
                          fontSize: '14px',
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <Users size={16} color="#4fc3f7" />
                            <span>{team.members_count || 0} members</span>
                          </div>
                        </td>
                        <td style={{ 
                          padding: '16px'
                        }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            background: team.members_count > 0 ? '#4CAF50' : '#a0aec0',
                            color: '#fff',
                            textTransform: 'capitalize',
                            fontWeight: 500,
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                          }}>
                            {team.members_count > 0 ? 'Active' : 'Empty'}
                          </span>
                        </td>
                        <td style={{
                          padding: '16px',
                          color: '#a0aec0',
                          fontSize: '13px',
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}>
                          {new Date(team.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td style={{ 
                          padding: '16px',
                          borderRadius: '0 8px 8px 0'
                        }}>
                          <button onClick={() => handleEditTeam(team)} style={{
                            background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            marginRight: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(79, 195, 247, 0.2)',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: '13px'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit size={14} />
                              Edit
                            </span>
                          </button>
                          <button onClick={() => handleDeleteTeam(team.id)} style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: '13px'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Trash2 size={14} />
                              Delete
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }

      case 'tasks': {
        return (
          <div className="task-management-page" style={{ 
            padding: '2rem',
            background: '#181824',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ 
              fontWeight: 700, 
              fontSize: 20, 
              margin: '0 0 24px 0', 
              color: '#fff', 
              textAlign: 'left',
              borderBottom: '2px solid #232336',
              paddingBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <ClipboardList size={20} color="#4fc3f7" />
              Task Management
            </h2>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <select style={{
                  background: '#232336',
                  border: '1px solid #4fc3f7',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px'
                }}>
                  <option value="all">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select style={{
                  background: '#232336',
                  border: '1px solid #4fc3f7',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px'
                }}>
                  <option value="all">All Priority</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    style={{
                      background: '#232336',
                      border: '1px solid #4fc3f7',
                      color: '#fff',
                      padding: '8px 12px',
                      paddingLeft: '36px',
                      borderRadius: '8px',
                      width: '250px',
                      fontSize: '14px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    }}
                  />
                  <Search 
                    size={16} 
                    color="#4fc3f7" 
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                </div>
              </div>
              <button style={{
                background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                boxShadow: '0 2px 4px rgba(79, 195, 247, 0.2)',
                transition: 'all 0.2s ease'
              }}>
                <ClipboardList size={16} />
                Add New Task
              </button>
            </div>
            {tasks.length === 0 ? (
              <div style={{ 
                color: '#666',
                fontSize: 18,
                marginTop: 16,
                textAlign: 'center',
                padding: '40px',
                background: '#232336',
                borderRadius: '12px',
                border: '2px dashed #333'
              }}>No tasks assigned yet.</div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="task-table" style={{ 
                  width: '100%', 
                  borderCollapse: 'separate',
                  borderSpacing: '0 8px',
                  background: 'none'
                }}>
                  <thead>
                    <tr style={{ 
                      color: '#4fc3f7',
                      fontWeight: 600,
                      fontSize: 13,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Task</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Assigned To</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Due Date</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Priority</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task, idx) => (
                      <tr key={task.id} style={{ 
                        background: '#232336',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        ':hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }
                      }}>
                        <td style={{ 
                          padding: '16px', 
                          color: '#fff',
                          borderRadius: '8px 0 0 8px',
                          fontWeight: 500
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{task.title}</div>
                            <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>ID: #{task.id}</div>
                          </div>
                        </td>
                        <td style={{ 
                          padding: '16px', 
                          color: '#a0aec0',
                          fontSize: '14px',
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <User size={16} color="#4fc3f7" />
                            <span>{task.assigned_to_name}</span>
                          </div>
                        </td>
                        <td style={{ 
                          padding: '16px',
                          color: '#a0aec0',
                          fontSize: '14px',
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <Calendar size={16} color="#4fc3f7" />
                            <span>{new Date(task.due_date || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            background: task.status === 'completed' ? '#4CAF50' : 
                                      task.status === 'in_progress' ? '#2196f3' : '#a0aec0',
                            color: '#fff',
                            textTransform: 'capitalize',
                            fontWeight: 500,
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                          }}>
                            {task.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            background: task.priority === 'high' ? '#ef4444' : 
                                      task.priority === 'medium' ? '#f59e0b' : '#4CAF50',
                            color: '#fff',
                            textTransform: 'capitalize',
                            fontWeight: 500,
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                          }}>
                            {task.priority || 'Low'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '16px',
                          borderRadius: '0 8px 8px 0'
                        }}>
                          <button onClick={() => handleEditTask(task)} style={{
                            background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            marginRight: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(79, 195, 247, 0.2)',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: '13px'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit size={14} />
                              Edit
                            </span>
                          </button>
                          <button onClick={() => handleDeleteTask(task.id)} style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: '13px'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Trash2 size={14} />
                              Delete
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }

      case 'attendance': {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        return (
          <div className="attendance-overview-page" style={{ 
            padding: '2rem',
            background: '#181824',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              borderBottom: '2px solid #232336',
              paddingBottom: '16px'
            }}>
              <h2 style={{ 
                fontWeight: 600, 
                fontSize: 28, 
                margin: 0,
                color: '#fff', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              }}>
                <Calendar size={28} color="#ffb300" />
                Attendance Calendar
              </h2>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <button style={{
                  background: '#232336',
                  border: '1px solid #ffb300',
                  color: '#ffb300',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  <span>Download Report</span>
                </button>
                <select style={{
                  background: '#232336',
                  border: '1px solid #4fc3f7',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px'
                }}>
                  <option value="daily">Daily View</option>
                  <option value="weekly">Weekly View</option>
                  <option value="monthly" selected>Monthly View</option>
                </select>
              </div>
            </div>

            {attendance.length === 0 ? (
              <div style={{ 
                color: '#666',
                fontSize: 18,
                textAlign: 'center',
                padding: '40px',
                background: '#232336',
                borderRadius: '12px',
                border: '2px dashed #333'
              }}>
                No attendance records found.
              </div>
            ) : (
              <>
                <div style={{
                  background: '#232336',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <button style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#4fc3f7',
                      cursor: 'pointer',
                      fontSize: '20px'
                    }}>←</button>
                    <div style={{
                      color: '#fff',
                      fontSize: '18px',
                      fontWeight: '600',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      letterSpacing: '0.2px'
                    }}>
                      {firstDay.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#4fc3f7',
                      cursor: 'pointer',
                      fontSize: '20px'
                    }}>→</button>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} style={{
                        padding: '8px',
                        textAlign: 'center',
                        color: '#ffb300',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {day}
                      </div>
                    ))}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '8px'
                  }}>
                    {Array.from({ length: 42 }).map((_, idx) => {
                      const dayNumber = idx - startingDay + 1;
                      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                      const date = new Date(currentYear, currentMonth, dayNumber);
                      const dateString = date.toISOString().split('T')[0];
                      
                      const dayAttendance = attendance.filter(a => a.date === dateString);
                      const presentCount = dayAttendance.filter(a => a.status === 'present').length;
                      const absentCount = dayAttendance.filter(a => a.status === 'absent').length;
                      const lateCount = dayAttendance.filter(a => a.status === 'late').length;
                      
                      const isToday = dayNumber === today.getDate() && 
                                    currentMonth === today.getMonth() && 
                                    currentYear === today.getFullYear();
                      
                      return (
                        <div key={idx} style={{
                          background: isCurrentMonth ? '#1a1a2e' : 'transparent',
                          borderRadius: '8px',
                          padding: '8px',
                          minHeight: '80px',
                          border: isToday ? '2px solid #ffb300' : '1px solid #333',
                          opacity: isCurrentMonth ? 1 : 0.3,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: isToday ? 'bold' : 'normal'
                          }}>
                            {isCurrentMonth ? dayNumber : ''}
                          </div>
                          {isCurrentMonth && dayAttendance.length > 0 && (
                            <>
                              {presentCount > 0 && (
                                <div style={{
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  background: '#4CAF50',
                                  color: '#fff',
                                  fontSize: '12px'
                                }}>
                                  P: {presentCount}
                                </div>
                              )}
                              {lateCount > 0 && (
                                <div style={{
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  background: '#FF9800',
                                  color: '#fff',
                                  fontSize: '12px'
                                }}>
                                  L: {lateCount}
                                </div>
                              )}
                              {absentCount > 0 && (
                                <div style={{
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  background: '#F44336',
                                  color: '#fff',
                                  fontSize: '12px'
                                }}>
                                  A: {absentCount}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  marginTop: '24px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      opacity: 0.2
                    }}>
                      <Users size={40} />
                    </div>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '15px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontWeight: 500,
                      letterSpacing: '0.2px'
                    }}>Present Today</h3>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '600',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                    }}>
                      {attendance.filter(a => 
                        a.status === 'present' && 
                        a.date === new Date().toISOString().split('T')[0]
                      ).length}
                    </div>
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '13px',
                      opacity: 0.9 
                    }}>
                      ↑ 5% from yesterday
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      opacity: 0.2
                    }}>
                      <Calendar size={40} />
                    </div>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '15px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontWeight: 500,
                      letterSpacing: '0.2px'
                    }}>Monthly Present</h3>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '600',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                    }}>
                      {attendance.filter(a => 
                        a.status === 'present' && 
                        new Date(a.date).getMonth() === currentMonth
                      ).length}
                    </div>
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '13px',
                      opacity: 0.9 
                    }}>
                      95% attendance rate
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      opacity: 0.2
                    }}>
                      <AlertCircle size={40} />
                    </div>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '15px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontWeight: 500,
                      letterSpacing: '0.2px'
                    }}>Monthly Absent</h3>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '600',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                    }}>
                      {attendance.filter(a => 
                        a.status === 'absent' && 
                        new Date(a.date).getMonth() === currentMonth
                      ).length}
                    </div>
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '13px',
                      opacity: 0.9 
                    }}>
                      ↓ 2% from last month
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      opacity: 0.2
                    }}>
                      <Clock size={40} />
                    </div>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '15px',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontWeight: 500,
                      letterSpacing: '0.2px'
                    }}>Monthly Late</h3>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '600',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                    }}>
                      {attendance.filter(a => 
                        a.status === 'late' && 
                        new Date(a.date).getMonth() === currentMonth
                      ).length}
                    </div>
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '13px',
                      opacity: 0.9 
                    }}>
                      ↓ 3% from last month
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      case 'analytics': {
        return (
          <div className="analytics-page" style={{ 
            padding: '2rem',
            background: '#181824',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ 
              fontWeight: 700, 
              fontSize: 20, 
              margin: '0 0 24px 0', 
              color: '#fff', 
              textAlign: 'left',
              borderBottom: '2px solid #232336',
              paddingBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <BarChart2 size={20} color="#4fc3f7" />
              Analytics Dashboard
            </h2>

            {/* Time Range Selector */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <select style={{
                  background: '#232336',
                  border: '1px solid #4fc3f7',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px'
                }}>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              <button style={{
                background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                boxShadow: '0 2px 4px rgba(79, 195, 247, 0.2)',
                transition: 'all 0.2s ease'
              }}>
                <Download size={16} />
                Export Report
              </button>
            </div>

            {/* Key Metrics */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
              marginBottom: 28
            }}>
              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #4fc3f7',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>Employee Performance</p>
                  <TrendingUp size={24} color="#4fc3f7" />
                </div>
                <h2 style={{ fontSize: 36, margin: 0, color: '#fff', fontWeight: 600 }}>85%</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 7% from last month</p>
              </div>

              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #2ecc71',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>Task Completion Rate</p>
                  <CheckCircle size={24} color="#2ecc71" />
                </div>
                <h2 style={{ fontSize: 36, margin: 0, color: '#fff', fontWeight: 600 }}>92%</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 3% from last month</p>
              </div>

              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #f1c40f',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>Average Response Time</p>
                  <Clock size={24} color="#f1c40f" />
                </div>
                <h2 style={{ fontSize: 36, margin: 0, color: '#fff', fontWeight: 600 }}>2.5h</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↓ 30min improvement</p>
              </div>

              <div style={{ 
                background: '#232336',
                padding: '24px',
                borderRadius: 12,
                borderLeft: '5px solid #9b59b6',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: 0, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>Team Efficiency</p>
                  <Award size={24} color="#9b59b6" />
                </div>
                <h2 style={{ fontSize: 36, margin: 0, color: '#fff', fontWeight: 600 }}>88%</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 5% from last month</p>
              </div>
            </div>

            {/* Detailed Analytics */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
              {/* Performance Trends */}
              <div style={{ 
                background: '#232336',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  color: '#4fc3f7', 
                  fontSize: 18, 
                  marginBottom: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <TrendingUp size={18} color="#4fc3f7" />
                  Performance Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { month: 'Jan', performance: 65 },
                    { month: 'Feb', performance: 72 },
                    { month: 'Mar', performance: 78 },
                    { month: 'Apr', performance: 74 },
                    { month: 'May', performance: 82 },
                    { month: 'Jun', performance: 85 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#4fc3f7" />
                    <YAxis stroke="#4fc3f7" />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#232336',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="performance" fill="#4fc3f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Performers */}
              <div style={{ 
                background: '#232336',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  color: '#4fc3f7', 
                  fontSize: 18, 
                  marginBottom: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Award size={18} color="#4fc3f7" />
                  Top Performers
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { name: 'John Doe', score: 95, role: 'Senior Developer' },
                    { name: 'Jane Smith', score: 92, role: 'Project Manager' },
                    { name: 'Mike Johnson', score: 88, role: 'Team Lead' }
                  ].map((performer, idx) => (
                    <div key={idx} style={{
                      padding: '12px 16px',
                      background: '#181824',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#fff'
                      }}>
                        {performer.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 500 }}>{performer.name}</p>
                        <small style={{ color: '#a0aec0', fontSize: 12 }}>{performer.role}</small>
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        background: '#4CAF50',
                        color: '#fff',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {performer.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {/* Task Distribution */}
              <div style={{ 
                background: '#232336',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  color: '#4fc3f7', 
                  fontSize: 18, 
                  marginBottom: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <PieChart size={18} color="#4fc3f7" />
                  Task Distribution
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Development', value: 35 },
                        { name: 'Design', value: 25 },
                        { name: 'Testing', value: 20 },
                        { name: 'Documentation', value: 20 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        '#4fc3f7',
                        '#2ecc71',
                        '#f1c40f',
                        '#9b59b6'
                      ].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: '#232336',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Attendance Overview */}
              <div style={{ 
                background: '#232336',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  color: '#4fc3f7', 
                  fontSize: 18, 
                  marginBottom: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Calendar size={18} color="#4fc3f7" />
                  Attendance Overview
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { day: 'Mon', present: 45, absent: 5 },
                    { day: 'Tue', present: 48, absent: 2 },
                    { day: 'Wed', present: 47, absent: 3 },
                    { day: 'Thu', present: 44, absent: 6 },
                    { day: 'Fri', present: 46, absent: 4 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="day" stroke="#4fc3f7" />
                    <YAxis stroke="#4fc3f7" />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#232336',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="present" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
        if (!analyticsData) {
          return (
            <div className="analytics-page" style={{ padding: '2rem' }}>
              <div style={{ 
                color: '#666',
                fontSize: 18,
                textAlign: 'center',
                padding: '40px',
                background: '#232336',
                borderRadius: '12px',
                border: '2px dashed #333'
              }}>
                Loading analytics data...
              </div>
            </div>
          );
        }

        return (
          <div className="analytics-page" style={{ 
            padding: '2rem',
            background: '#181824',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ 
              fontWeight: 700, 
              fontSize: 28, 
              margin: '0 0 24px 0', 
              color: '#fff', 
              textAlign: 'left',
              borderBottom: '2px solid #232336',
              paddingBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <BarChart2 size={28} color="#ffb300" />
              Analytics Overview
            </h2>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 320, background: '#232336', borderRadius: 14, padding: 24, marginBottom: 24 }}>
                <h4 style={{ fontWeight: 600, fontSize: 16, color: '#ffb300', marginBottom: 16 }}>Users by Role</h4>
                <PieChart width={300} height={250}>
                  <Pie
                    data={Object.entries(analyticsData.roleCounts || {}).map(([role, count]) => ({ name: role, value: count }))}
                    cx="50%" cy="50%" outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    <Cell fill="#42a5f5" />
                    <Cell fill="#66bb6a" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>

              <div style={{ flex: 1, minWidth: 320, background: '#232336', borderRadius: 14, padding: 24, marginBottom: 24 }}>
                <h4 style={{ fontWeight: 600, fontSize: 16, color: '#ffb300', marginBottom: 16 }}>System Totals</h4>
                <BarChart width={400} height={250} data={[
                  { name: 'Users', count: analyticsData.totalUsers || 0 },
                  { name: 'Teams', count: analyticsData.totalTeams || 0 },
                  { name: 'Tasks', count: analyticsData.totalTasks || 0 },
                  { name: 'Attendance', count: analyticsData.totalAttendance || 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#181824',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" fill="#ffb300" />
                </BarChart>
              </div>
            </div>
          </div>
        );
      }

      case 'messages':
  return (
    <div className="messages-page-whatsapp" style={{
      display: 'flex',
      height: 'calc(100vh - 80px)',
      background: '#232336',
      borderRadius: 16,
      boxShadow: '0 4px 24px #0006',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Left Sidebar - Users (for employee, just self) */}
    {/* Left Sidebar - Users (for admin: show all users) */}
<div className="sidebar-chat-users" style={{
  width: 320,
  minWidth: 220,
  maxWidth: 340,
  background: '#181824',
  borderRight: '1.5px solid #232336',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: 0,
}}>
  <div className="sidebar-header" style={{
    padding: '22px 18px 12px 18px',
    borderBottom: '1.5px solid #232336',
    background: 'transparent',
    fontWeight: 700,
    fontSize: 22,
    color: '#4fc3f7',
    letterSpacing: 1,
  }}>
    Chats
  </div>

  <div className="user-scroll" style={{
    flex: 1,
    overflowY: 'auto',
    padding: '0 0 0 0',
  }}>
    {users.map((u) => (
      <div
        key={u.id}
        className="user-item"
        onClick={() => setSelectedUser(u)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 18px',
          background: selectedUser?.id === u.id ? 'rgba(79,195,247,0.15)' : 'transparent',
          borderBottom: '1px solid #232336',
          cursor: 'pointer',
        }}
      >
        <img
          className="user-avatar-img"
          src={u.avatar ? `http://localhost:5000${u.avatar}` : `https://i.pravatar.cc/150?u=${u.id}`}
          alt="avatar"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #232336',
          }}
        />
        <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: '#fff', fontSize: 14 }}>{u.name}</strong>
          <small style={{ color: '#b3e5fc', fontSize: 12 }}>{u.email}</small>
        </div>
      </div>
    ))}
  </div>
</div>


      {/* Chat Area */}
      <div className="chat-area" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#232336',
        padding: 0,
      }}>
        <div className="chat-header" style={{
          height: 70,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 28px',
          borderBottom: '1.5px solid #232336',
          background: 'transparent',
          fontWeight: 700,
          fontSize: 16,
          color: '#4fc3f7',
        }}>
         <img
  src={selectedUser?.avatar ? `http://localhost:5000${selectedUser.avatar}` : `https://i.pravatar.cc/150?u=${selectedUser?.id}`}
  alt="user"
  className="user-avatar-img"
  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #232336' }}
/>

<span style={{ color: '#fff', fontWeight: 700, fontSize: 19 }}>
  {selectedUser?.name || 'You'}
</span>

        </div>

        <div className="chat-body" id="chat-body" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 28px 18px 28px',
          background: '#232336',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>

  {messages.map((msg, i) => {
  const isSentByMe = Number(msg.sender_id || msg.fromUserId) === Number(myId);

  return (
    <div
      key={i}
      className={`chat-message ${isSentByMe ? 'sent' : 'received'}`}
    >
      {msg.message}
    </div>
  );
})}



{/* Invisible auto-scroll anchor */}
<div ref={chatEndRef} />


        </div>

        <form onSubmit={sendMessage} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '18px 28px',
          borderTop: '1.5px solid #232336',
          background: '#232336',
          gap: 12,
          marginBottom: 18,
          boxShadow: '0 8px 24px 0 rgba(25,118,210,0.04)',
          borderRadius: '0 0 18px 18px',
        }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{
              flex: 1,
              background: '#181824',
              color: '#fff',
              border: '1.5px solid #232336',
              borderRadius: 24,
              padding: '12px 18px',
              fontSize: 17,
              outline: 'none',
            }}
          />
          <button type="submit" style={{
            background: 'linear-gradient(90deg, #42a5f7 60%, #1976d2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 44,
            height: 44,
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 4px #1976d222',
          }}>➤</button>
        </form>
      </div>
    </div>
  );


      default: {
        return null;
      }
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Toggle Button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#4fc3f7',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontSize: '24px'
        }}
      >
        {isSidebarOpen ? '✕' : '≡'}
      </button>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ 
          padding: '36px 0 24px 0', 
          textAlign: 'center', 
          borderBottom: '1px solid #232336', 
          marginBottom: 0, 
          position: 'relative' 
        }}>
          <h2 style={{ 
            fontSize: 26, 
            fontWeight: 900, 
            margin: 0, 
            letterSpacing: 1, 
            color: '#ffb300' 
          }}>🛠 Admin Panel</h2>
        </div>
        <ul className="nav-links" style={{
          marginTop: '18px'
        }}>
          <li onClick={() => setActiveTab('dashboard')}><BarChart2 size={18} /> <span>Dashboard</span></li>
          <li onClick={() => setActiveTab('user')}><UserPlus size={18} /> <span>User Management</span></li>
          <li onClick={() => setActiveTab('team')}><Users size={18} /> <span>Team Management</span></li>
          <li onClick={() => setActiveTab('tasks')}><ClipboardList size={18} /> <span>Tasks</span></li>
          <li onClick={() => setActiveTab('attendance')}><Calendar size={18} /> <span>Attendance</span></li>
          <li onClick={() => setActiveTab('analytics')}><BarChart2 size={18} /> <span>Analytics</span></li>
          <li onClick={() => setActiveTab('messages')}><MessageCircle size={18} /> <span>Messages</span></li>
        </ul>
        <div style={{ marginTop: 'auto', borderTop: '1px solid #232336', padding: '16px 0' }}>
          <li onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/';
          }} style={{ color: '#ff4d4d' }}><LogOut size={18} /> <span>Logout</span></li>
        </div>
      </aside>

      <main className={`main-area ${isSidebarOpen ? 'shifted' : ''}`}>

        {isSidebarOpen && (
          <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        <header style={{
          fontSize: 20,
          padding: '18px 0',
          background: '#181824',
          color: '#fff',
          borderBottom: '1px solid #232336',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '28px 32px'
        }}>
          <div className="user-info" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '19px',
            fontWeight: 600
          }}>
            <span>Welcome back, Admin</span>
            <img 
              src="https://i.pravatar.cc/40?admin" 
              alt="Admin" 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #232336',
                objectFit: 'cover'
              }}
            />
          </div>
        </header>
        <section className="main-content">{renderContent()}</section>
      </main>
    </div>
  );
};

export default AdminDashboard;
