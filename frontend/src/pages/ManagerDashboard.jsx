import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/ManagerDashboard.css';
import './styles/MessagesPage.css';
import { io } from 'socket.io-client'; // ✅ for real-time connection
import {
  Home,
  Users,
  ClipboardList,
  Calendar,
  MessageCircle,
  LogOut
} from 'lucide-react';
import axios from 'axios';

// Styles for the floating toggle button
const toggleButtonStyle = {
  position: 'fixed',
  top: '20px',
  left: '20px',
  zIndex: 1000,
  background: '#4fc3f7',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  fontSize: '20px',
  transition: 'all 0.3s ease'
};

// Calendar component for attendance
function AttendanceCalendar({ attendanceData }) {
  // Group attendance by username and date
  const grouped = {};
  attendanceData.forEach(entry => {
    if (!grouped[entry.username]) grouped[entry.username] = {};
    grouped[entry.username][entry.date] = entry.status;
  });

  // Get all unique users
  const users = Object.keys(grouped);
  // Get all unique dates (for the current month)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to format date as yyyy-mm-dd
  function fmt(d) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return (
    <table style={{ borderCollapse: 'collapse', minWidth: 600, background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #1976d222', overflow: 'hidden' }}>
      <thead>
        <tr>
          <th style={{ background: '#f7fafd', padding: 8, border: '1px solid #e0e0e0', minWidth: 120 }}>Employee</th>
          {days.map(day => (
            <th key={day} style={{ background: '#f7fafd', padding: 4, border: '1px solid #e0e0e0', fontWeight: 400, fontSize: 13 }}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user}>
            <td style={{ fontWeight: 500, background: '#f7fafd', padding: 8, border: '1px solid #e0e0e0' }}>{user}</td>
            {days.map(day => {
              const dateStr = fmt(day);
              const status = grouped[user][dateStr];
              let bg = '#fff', color = '#888', label = '';
              if (status === 'Present') { bg = '#e8f5e9'; color = '#388e3c'; label = '✔'; }
              else if (status === 'Absent') { bg = '#ffebee'; color = '#d32f2f'; label = '✖'; }
              else if (status) { bg = '#fffde7'; color = '#fbc02d'; label = status[0]; }
              return (
                <td key={day} style={{ padding: 4, border: '1px solid #e0e0e0', background: bg, color, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>
                  {label}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ManagerDashboard = () => {
 
  // Delete team handler
  const handleDeleteTeam = async (teamId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams((prev) => prev.filter((t) => t.team_id !== teamId));

      setOpenMenuTeamId(null);
    } catch (err) {
      alert('Failed to delete team');
    }
  };
  const [openMenuTeamId, setOpenMenuTeamId] = useState(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  // Add Member dialog state
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  // Create team handler
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/teams`,
        { name: newTeam.name, description: newTeam.description, manager_id: managerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Map API response to match fetchTeam structure and ensure manager_id is set
      const apiTeam = res.data;
      const mappedTeam = {
        team_id: apiTeam.team_id || apiTeam.id,
        team_name: apiTeam.team_name || apiTeam.name,
        manager_id: managerId, // force correct manager_id
        members: apiTeam.members || [],
        ...apiTeam
      };
      setTeamMembers((prev) => [...prev, mappedTeam]);
      setShowCreateTeam(false);
      setNewTeam({ name: '', description: '' });
      // Also fetch from backend to ensure full sync
      fetchTeams();
    } catch (err) {
      alert('Failed to create team');
    }
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [manager, setManager] = useState(null);
  const [socket, setSocket] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [taskView, setTaskView] = useState('list');
  const [attendanceData, setAttendanceData] = useState([]);
  const [showLeaveRequests, setShowLeaveRequests] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
const [message, setMessage] = useState('');
const [messages, setMessages] = useState([]);
const chatEndRef = useRef(null);
const [teams, setTeams] = useState([]);
const [showAddMemberModal, setShowAddMemberModal] = useState(false);



// 📌 Define only ONCE, somewhere near top of your component
const messagesEndRef = useRef(null);

const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};



  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: '',
    mention: ''
  });
  const [assignedTo, setAssignedTo] = useState(null);
 const managerId = manager?.id;
 // Replace with dynamic ID as needed
  const removeDuplicates = (data) => {
    const seen = new Set();
    return data.filter(entry => {
      const key = `${entry.username}-${entry.date}-${entry.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("managerSidebarOpen");
    return saved === "true";
  });

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem("managerSidebarOpen", newState);
  };


  
  const closeSidebar = () => {
    setIsSidebarOpen(false);
    localStorage.setItem("managerSidebarOpen", "false");
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
  const lastUser = JSON.parse(localStorage.getItem("lastChatUser"));
  if (lastUser) {
    setSelectedUser(lastUser);
    setAssignedTo(lastUser.id);
  }
}, []);
  
useEffect(() => {
  console.log('👀 useEffect - manager:', manager);
  if (manager?.id) {
    fetchTeams();
  }
}, [manager]);




useEffect(() => {
  if (!socket || !manager?.id) return;

  const handlePrivateMessage = (msg) => {
  console.log("📩 Received message:", msg);

  const senderId = msg.sender_id || msg.fromUserId;
  const receiverId = msg.receiver_id || msg.toUserId;

  

  // Always add message if it's addressed to me
  if (receiverId === manager.id) {
    setMessages(prev => [
      ...prev,
      {
        sender_id: senderId,
        receiver_id: receiverId,
        message: msg.message,
        timestamp: msg.timestamp || new Date().toISOString(),
      }
    ]);

    // Optional: Auto-focus the chat on the sender if not already selected
    if (!selectedUser || selectedUser.id !== senderId) {
      const senderUser = users.find(u => u.id === senderId);
      if (senderUser) setSelectedUser(senderUser);
    }
  }
};


  socket.on("private_message", handlePrivateMessage);

  return () => {
    socket.off("private_message", handlePrivateMessage);
  };
}, [socket, selectedUser, manager]);


useEffect(() => {
  if (socket && manager?.id) {
    socket.emit('join', manager.id);
    console.log(`🔗 Joined socket room: ${manager.id}`);
  }
}, [socket, manager]);




  useEffect(() => {
    if (activeTab === 'team') fetchTeams();
    if (activeTab === 'tasks') fetchTasks();
    if (activeTab === 'attendance') fetchAttendance();
  }, [activeTab]);

useEffect(() => {
  const managerData = JSON.parse(localStorage.getItem('user'));
  if (managerData?.id) {
    setManager(managerData); // ✅ still update state for future
    fetchTeams(managerData.id); // ✅ use id directly
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      newSocket.emit('join', managerData.id);
      console.log(`🧑‍💼 JOINED room: ${managerData.id}`);
    });

    return () => newSocket.disconnect();
  }
}, []);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };


    fetchUsers();
  }, []);

useEffect(() => {
  const fetchMessages = async () => {
    const res = await axios.get(`/api/messages/${manager.id}/${assignedTo}`);
    
    const formatted = res.data.map(msg => ({
      sender_id: msg.from_user_id,
      receiver_id: msg.to_user_id,
      message: msg.message,
    }));

    setMessages(formatted);
    scrollToBottom();
  };

  if (manager && assignedTo) {
    fetchMessages();
  }
}, [manager, assignedTo]);




useEffect(() => {
  if (!socket || !manager?.id) return;

  const handlePrivateMessage = (msg) => {
    console.log("📩 Received message:", msg);

    if (
      (msg.sender_id === selectedUser?.id && msg.receiver_id === manager.id) ||
      (msg.sender_id === manager.id && msg.receiver_id === selectedUser?.id)
    ) {
      setMessages(prev => [
        ...prev,
        {
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          message: msg.message,
          timestamp: msg.timestamp || new Date().toISOString()
        }
      ]);
    }
  };

  socket.on("private_message", handlePrivateMessage);

  return () => {
    socket.off("private_message", handlePrivateMessage);
  };
}, [socket, selectedUser, manager]);




const sendMessage = async (e) => {
  e.preventDefault();
  if (!message.trim() || !selectedUser || !manager?.id) return;

  const payload = {
    fromUserId: manager.id,
    toUserId: selectedUser.id,
    message: message.trim(),
  };

  console.log("📤 Sending payload to backend:", payload);

  try {
    const res = await axios.post('http://localhost:5000/api/messages/send', payload);

    if (res.status === 200 || res.status === 201) {
      const newMsg = {
        sender_id: res.data.from_user_id,
        receiver_id: res.data.to_user_id,
        message: res.data.message,
      };

      setMessages(prev => [...prev, newMsg]);
      setMessage('');
      scrollToBottom();
    }
  } catch (err) {
    console.error('❌ Error sending message:', err.message || err);
  }
};



 const fetchTeams = async (id = manager?.id) => {
  if (!id) return;
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/teams/manager/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('🟢 Fetching teams for manager:', id);
    console.log('📦 API Response:', res.data);

    if (!res.data || res.data.length === 0) {
      console.warn('⚠️ No teams received from backend!');
    } else {
      console.log('✅ Teams received:', res.data);
    }

    setTeams(res.data);         // ✅ for logic
    setTeamMembers(res.data);   // ✅ for UI render

  } catch (err) {
    console.error('❌ Error fetching teams:', err);
  }
};





 const handleAddMember = async (emp) => {
  console.log("🧪 Sending member ID:", emp?.id);
  console.log("📦 Payload:", { user_id: emp?.id });
  console.log("📍 Team ID (URL):", addMemberTeamId);

  try {
    const token = localStorage.getItem('token');
    await axios.post(`${process.env.REACT_APP_API_URL}/teams/${addMemberTeamId}/add-member`, {
      user_id: emp.id
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    toast.success('Member added successfully');
    setShowAddMemberModal(false);
    await fetchTeams();
  } catch (err) {
    console.error('❌ Failed to add member:', err.response?.data || err.message);
    toast.error('Failed to add member');
  }
};



  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/tasks?created_by=${managerId}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      // Get current year and month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      // Fetch all attendance for the current month (API must support this route)
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/attendance?year=${year}&month=${month}`);
      setAttendanceData(res.data);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/leave-requests/manager/${managerId}`);
      setLeaveRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  };

  const handleLeaveDecision = async (requestId, decision) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/leave-requests/${requestId}/status`, {
        status: decision
      });
      // Remove the processed request from the state
      setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      console.error(`Failed to ${decision.toLowerCase()} leave request:`, err);
    }
  };


  const handleMentionChange = (e) => {
    const value = e.target.value;
    setTaskForm({ ...taskForm, mention: value });

    if (value.startsWith('@')) {
      const search = value.slice(1).toLowerCase();
      const matched = users.filter(user =>
        user.name.toLowerCase().includes(search)
      );
      setSuggestions(matched);
    } else {
      setSuggestions([]);
    }
  };

  const handleUserSelect = (user) => {
    setTaskForm({ ...taskForm, mention: `@${user.name}` });
    setAssignedTo(user.id);
    setSuggestions([]);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();

    if (!assignedTo) {
      alert('Please select a user via @mention.');
      return;
    }

    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: assignedTo,
      due_date: taskForm.due_date,                      // ✅ included
      priority: taskForm.priority || 'Medium',          // ✅ included
      created_by: managerId
    };

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/tasks`, payload);
      alert('Task created!');
      setTaskForm({
        title: '',
        description: '',
        due_date: '',
        priority: '',
        mention: ''
      });
      setAssignedTo(null);
      setSuggestions([]);
      fetchTasks();
    } catch (err) {
      alert('Failed to create task');
      console.error(err);
    }
  };


  // Floating toggle button styles
const toggleButtonStyle = {
  position: 'fixed',
  top: '20px',
  left: '20px',
  zIndex: 1000,
  background: '#4fc3f7',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  fontSize: '20px',
  transition: 'background 0.3s ease'
};

// Sidebar styles
const sidebarStyle = {
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  width: '280px',
  background: '#181824',
  transform: 'translateX(-100%)',
  transition: 'transform 0.3s ease',
  zIndex: 999,
  boxShadow: '2px 0 8px rgba(0,0,0,0.2)'
};

const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content" style={{ background: '#181824', color: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0006', padding: 5, marginBottom: 32 }}>
            {/* Header with Welcome Message and Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h1 style={{ color: '#4fc3f7', fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Welcome back, {manager?.name || 'Manager'} 👋</h1>
                <p style={{ color: '#b3e5fc', fontSize: 14 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ 
                  background: '#232336', 
                  padding: '8px 16px', 
                  borderRadius: 8, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  border: '1px solid #4fc3f7',
                  cursor: 'pointer'
                }}>
                  <span style={{ color: '#4fc3f7', fontSize: 18 }}>🔔</span>
                  <div style={{ 
                    background: '#4fc3f7', 
                    color: '#181824', 
                    borderRadius: '50%', 
                    width: 20, 
                    height: 20, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 12, 
                    fontWeight: 'bold' 
                  }}>3</div>
                </div>
                <select 
                  style={{ 
                    background: '#232336', 
                    color: '#fff', 
                    border: '1px solid #4fc3f7',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 14,
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

            {/* Quick Actions Bar */}
            <div style={{ 
              display: 'flex', 
              gap: 16, 
              marginBottom: 28,
              background: '#232336',
              padding: 16,
              borderRadius: 12,
              boxShadow: '0 4px 12px #0003'
            }}>
              {[
                { icon: '➕', label: 'New Task', action: () => setActiveTab('tasks') },
                { icon: '👥', label: 'Add Team Member', action: () => setShowAddMemberDialog(true) },
                { icon: '📊', label: 'View Reports', action: () => setActiveTab('attendance') },
                { icon: '📅', label: 'Schedule Meeting', action: () => console.log('Schedule meeting') }
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={action.action}
                  style={{
                    background: '#181824',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 20px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    justifyContent: 'center'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = '#1e1e2d';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = '#181824';
                  }}
                >
                  <span style={{ fontSize: 20 }}>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>

            {/* Summary Cards */}
            <div className="summary-cards" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: 20,
              marginBottom: 28
            }}>
              <div className="card" style={{ 
                background: '#232336', 
                color: '#fff', 
                borderRadius: 12,
                padding: '20px 24px',
                borderLeft: '5px solid #4fc3f7',
                boxShadow: '0 4px 12px #0003'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: '0 0 8px 0' }}>Active Tasks</p>
                  <span style={{ color: '#4fc3f7', fontSize: 20 }}>📋</span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, fontWeight: 700 }}>{tasks.length}</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 12% from last week</p>
              </div>

              <div className="card" style={{ 
                background: '#232336', 
                color: '#fff', 
                borderRadius: 12,
                padding: '20px 24px',
                borderLeft: '5px solid #2ecc71',
                boxShadow: '0 4px 12px #0003'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: '0 0 8px 0' }}>Completed Tasks</p>
                  <span style={{ color: '#2ecc71', fontSize: 20 }}>✅</span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, fontWeight: 700 }}>156</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 8% from last week</p>
              </div>

              <div className="card" style={{ 
                background: '#232336', 
                color: '#fff', 
                borderRadius: 12,
                padding: '20px 24px',
                borderLeft: '5px solid #f2c94c',
                boxShadow: '0 4px 12px #0003'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: '0 0 8px 0' }}>Team Members</p>
                  <span style={{ color: '#f2c94c', fontSize: 20 }}>👥</span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, fontWeight: 700 }}>{teamMembers.flatMap(t => t.members || []).length}</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 2 new this week</p>
              </div>

              <div className="card" style={{ 
                background: '#232336', 
                color: '#fff', 
                borderRadius: 12,
                padding: '20px 24px',
                borderLeft: '5px solid #a66dd4',
                boxShadow: '0 4px 12px #0003'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#b3e5fc', fontSize: 15, margin: '0 0 8px 0' }}>Team Performance</p>
                  <span style={{ color: '#a66dd4', fontSize: 20 }}>📈</span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, fontWeight: 700 }}>92%</h2>
                <p style={{ fontSize: 13, color: '#2ecc71', margin: '8px 0 0 0' }}>↑ 5% improvement</p>
              </div>
            </div>

            {/* Recent Activities and Team Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <div style={{ 
                background: '#232336', 
                borderRadius: 12, 
                padding: 24,
                boxShadow: '0 4px 12px #0003'
              }}>
                <h3 style={{ color: '#4fc3f7', fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📅</span> Recent Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {tasks.slice(0, 3).map((task, i) => (
                    <div key={i} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#181824',
                      borderRadius: 8,
                      transition: 'transform 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateX(8px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: 15 }}>{task.title}</p>
                        <small style={{ color: '#b3e5fc' }}>Assigned to {task.assigned_to_name}</small>
                      </div>
                      <span style={{ color: '#4fc3f7', fontSize: 13 }}>Just now</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ 
                background: '#232336', 
                borderRadius: 12, 
                padding: 24,
                boxShadow: '0 4px 12px #0003'
              }}>
                <h3 style={{ color: '#4fc3f7', fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📊</span> Team Overview
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ 
                    background: '#181824', 
                    padding: '16px', 
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#b3e5fc' }}>Total Teams</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{teams.length}</span>
                  </div>
                  <div style={{ 
                    background: '#181824', 
                    padding: '16px', 
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#b3e5fc' }}>Active Projects</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{tasks.filter(t => !t.completed).length}</span>
                  </div>
                  <div style={{ 
                    background: '#181824', 
                    padding: '16px', 
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#b3e5fc' }}>Completion Rate</span>
                    <span style={{ color: '#2ecc71', fontWeight: 600 }}>92%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'team':
  return (
    <div
      className="team-management"
      style={{
        padding: '1rem 0 0 2rem',
        background: '#181824',
        boxShadow: '0 4px 24px #0006',
        color: '#fff',
        borderRadius: 16,
        marginBottom: 32,
      }}
    >
      <h2
        style={{
          fontWeight: 700,
          fontSize: 24,
          margin: '0 0 20px 0',
          color: '#4fc3f7',
          textAlign: 'left',
          letterSpacing: 1,
        }}
      >
        Team Management
      </h2>

      {teams.length === 0 && (
        <div style={{ color: '#bbb', fontSize: 18, marginTop: 16 }}>
          No teams found.
        </div>
      )}

      {teams.map((team) => {
        const getUniqueMembers = (members) => {
          const seen = new Set();
          return members.filter((m) => {
            const key = `${m.id}-${m.email}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        const uniqueMembers = getUniqueMembers(team.members || []);

        return (
          <div
            key={team.team_id}
            className="team-group"
            style={{
              background: 'linear-gradient(135deg, #232336 60%, #283593 100%)',
              borderRadius: 16,
              boxShadow: '0 4px 24px #0006',
              padding: 28,
              marginBottom: 32,
              position: 'relative',
              color: '#fff',
              border: '1px solid #283593',
              transition: 'background 0.3s',
              height: 'fit-content',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 0,
              }}
            >
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  color: '#888',
                  cursor: 'pointer',
                  marginRight: 8,
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Team options"
                onClick={() =>
                  setOpenMenuTeamId(
                    openMenuTeamId === team.team_id ? null : team.team_id
                  )
                }
              >
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>
                  ⋮
                </span>
              </button>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 23,
                  color: '#4fc3f7',
                  margin: 0,
                  letterSpacing: 0.5,
                }}
              >
                {team.team_name}
              </h3>

              {openMenuTeamId === team.team_id && (
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: 48,
                    background: '#222a3a',
                    border: '1px solid #4fc3f7',
                    borderRadius: 10,
                    boxShadow: '0 2px 16px #000a',
                    zIndex: 10,
                    minWidth: 140,
                    padding: '6px 0',
                  }}
                >
                  <button
                    style={{
                      display: 'block',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      padding: '8px 16px',
                      fontSize: 15,
                      color: '#4fc3f7',
                      cursor: 'pointer',
                      borderBottom: '1px solid #283593',
                    }}
                    onClick={() => {
                      setOpenMenuTeamId(null);
                      setAddMemberTeamId(team.team_id);
                      setShowAddMemberDialog(true);
                      setAddMemberLoading(true);
                      setAddMemberError('');
                      setAllEmployees([]);
                      (async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const res = await axios.get(
                            `${process.env.REACT_APP_API_URL}/users`,
                            {
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          );
                          const employees = Array.isArray(res.data)
                            ? res.data.filter((u) => u.role === 'employee')
                            : [];
                          setAllEmployees(employees);
                        } catch (err) {
                          setAddMemberError('Failed to fetch employees');
                        }
                        setAddMemberLoading(false);
                      })();
                    }}
                  >
                    Add Member
                  </button>

                  <button
                    style={{
                      display: 'block',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      padding: '8px 16px',
                      fontSize: 15,
                      color: '#ff5252',
                      cursor: 'pointer',
                      borderBottom: '1px solid #283593',
                    }}
                    onClick={() => handleDeleteTeam(team.team_id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                borderRadius: 8,
                background: '#232336',
                marginTop: '16px',
                padding: '0 4px',
              }}
            >
              <div
                className="table-container"
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginRight: '-4px',
                  borderRadius: 8,
                }}
              >
                <table
                  className="team-table custom-scrollbar"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    background: '#232336',
                    boxShadow: 'none',
                    marginLeft: 0,
                    color: '#b3e5fc',
                    borderRadius: 8,
                  }}
                >
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: '#232336',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#ffb300',
                          background: '#232336',
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#ffb300',
                          background: '#232336',
                        }}
                      >
                        Email
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#ffb300',
                          background: '#232336',
                        }}
                      >
                        Role
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#ffb300',
                          background: '#232336',
                        }}
                      >
                        Task Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueMembers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          style={{
                            padding: '16px',
                            color: '#aaa',
                            fontSize: '14px',
                            textAlign: 'center',
                          }}
                        >
                          No members in this team.
                        </td>
                      </tr>
                    ) : (
                      uniqueMembers.map((member) => (
                        <tr key={member.id}>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            {member.name}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            {member.email}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            {member.role}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            {member.taskCount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          style={{
            background: 'linear-gradient(90deg, #42a5f5 60%, #1976d2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 28px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 17,
            boxShadow: '0 1px 4px #1976d222',
            marginTop: 8,
          }}
          onClick={() => setShowCreateTeam(true)}
        >
          + Create Team
        </button>
      </div>

      {showCreateTeam && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 32px #1976d244',
              padding: 36,
              minWidth: 340,
              maxWidth: 400,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowCreateTeam(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 22,
                color: '#888',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2
              style={{
                fontWeight: 700,
                fontSize: 24,
                color: '#1976d2',
                marginBottom: 18,
              }}
            >
              Create New Team
            </h2>
            <form style={{ width: '100%' }} onSubmit={handleCreateTeam}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 12,
                  fontWeight: 500,
                  color: '#222',
                }}
              >
                Team Name
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, name: e.target.value })
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    borderRadius: 6,
                    border: '1px solid #bbb',
                    marginTop: 6,
                    fontSize: 16,
                  }}
                />
              </label>
              <label
                style={{
                  display: 'block',
                  marginBottom: 18,
                  fontWeight: 500,
                  color: '#222',
                }}
              >
                Description
                <textarea
                  value={newTeam.description}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, description: e.target.value })
                  }
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    borderRadius: 6,
                    border: '1px solid #bbb',
                    marginTop: 6,
                    fontSize: 16,
                    resize: 'vertical',
                  }}
                />
              </label>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(90deg, #42a5f5 60%, #1976d2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 28px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 17,
                  boxShadow: '0 1px 4px #1976d222',
                  width: '100%',
                }}
              >
                Create Team
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddMemberDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowAddMemberDialog(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 32px #1976d244',
              padding: 32,
              minWidth: 340,
              maxWidth: 400,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddMemberDialog(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 22,
                color: '#888',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2
              style={{
                fontWeight: 700,
                fontSize: 22,
                color: '#1976d2',
                marginBottom: 18,
              }}
            >
              Add Member to Team
            </h2>
            {addMemberLoading ? (
              <div>Loading employees...</div>
            ) : addMemberError ? (
              <div style={{ color: 'red', marginBottom: 12 }}>
                {addMemberError}
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                {allEmployees.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 16 }}>
                    No employees found.
                  </div>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {allEmployees.map((emp) => (
                      <li
                        key={emp.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <span>
                          {emp.name}{' '}
                          <span style={{ color: '#888', fontSize: 13 }}>
                            ({emp.email})
                          </span>
                        </span>
                        <button
                          style={{
                            background: '#1976d2',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 5,
                            padding: '6px 16px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: 15,
                          }}
                          onClick={async () => {
                            setAddMemberLoading(true);
                            setAddMemberError('');
                            try {
                              const token = localStorage.getItem('token');
                              await axios.post(
                                `${process.env.REACT_APP_API_URL}/teams/${addMemberTeamId}/add-member`,
                                {
                                  user_id: emp.id,
                                },
                                {
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                }
                              );
                              await fetchTeams();
                              setShowAddMemberDialog(false);
                            } catch (err) {
                              setAddMemberError('Failed to add member');
                            }
                            setAddMemberLoading(false);
                          }}
                        >
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );


      case 'tasks':
        return (
          <div className="task-board" style={{
            background: '#181824',
            borderRadius: 16,
            boxShadow: '0 4px 24px #0006',
            padding: 28,
            marginBottom: 32,
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            color: '#fff',
            border: '1px solid #283593',
            transition: 'background 0.3s',
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 28, margin: '0 0 20px 0', color: '#4fc3f7', textAlign: 'left' }}>Task Board</h2>

            {taskView === 'list' && (
              <>
                {tasks.length === 0 ? (
                  <p>No tasks yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        style={{
                          background: 'linear-gradient(135deg, #232336 60%, #283593 100%)',
                          borderRadius: 16,
                          boxShadow: '0 4px 24px #0006',
                          padding: 24,
                          color: '#fff',
                          border: '1px solid #283593',
                          fontSize: 18,
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'background 0.3s',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 20, color: '#fff' }}>{task.title}</span>
                        <span style={{ fontSize: 16, color: '#4fc3f7', fontWeight: 400 }}>Assigned to {task.assigned_to_name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="create-task-btn"
                  onClick={() => setTaskView('create')}
                  style={{
                    background: 'linear-gradient(90deg, #42a5f5 60%, #1976d2 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 32px',
                    fontWeight: 700,
                    fontSize: 18,
                    boxShadow: '0 1px 4px #1976d222',
                    marginTop: 18,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    alignSelf: 'flex-start',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #1976d2 60%, #42a5f5 100%)'}
                  onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg, #42a5f5 60%, #1976d2 100%)'}
                >
                  ➕ Create Task
                </button>
              </>
            )}

            {taskView === 'create' && (
              <div className="create-task">
                <button
                  className="back-btn"
                  onClick={() => setTaskView('list')}
                  style={{ marginBottom: '1rem' }}
                >
                  🔙 Back to Task List
                </button>

                <h3>Create New Task</h3>
                <form onSubmit={handleTaskSubmit}>
                  <label>Title:
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                      required
                    />
                  </label>

                  <label>Description:
                    <textarea
                      value={taskForm.description}
                      onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                      required
                    />
                  </label>

                  <label>Due Date:
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </label>

                  <label>Priority:
                    <select
                      value={taskForm.priority}
                      onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>

                  <label>@Mention:</label>
                  <div className="mention-wrapper">
                    <input
                      type="text"
                      value={taskForm.mention}
                      onChange={handleMentionChange}
                      placeholder="@username"
                    />
                    {suggestions.length > 0 && (
                      <ul className="mention-suggestions">
                        {suggestions.map(user => (
                          <li
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                          >
                            {user.name} ({user.email})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button type="submit">Create Task</button>
                </form>
              </div>
            )}
          </div>
        );
case 'attendance':
  return (
    <div style={{
      background: '#181824',
      borderRadius: 16,
      boxShadow: '0 4px 24px #0006',
      padding: 28,
      marginBottom: 32,
      color: '#fff'
    }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h2 style={{
            color: '#4fc3f7',
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8
          }}>Attendance Management</h2>
          <p style={{ color: '#b3e5fc', fontSize: 15 }}>
            Track and manage team attendance records
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <select
            style={{
              background: '#232336',
              border: '1px solid #4fc3f7',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer'
            }}
            onChange={(e) => {
              console.log('Selected team:', e.target.value);
            }}
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>

          <select
            style={{
              background: '#232336',
              border: '1px solid #4fc3f7',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer'
            }}
            onChange={(e) => {
              console.log('Selected range:', e.target.value);
            }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {!showLeaveRequests ? (
        <>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            marginBottom: 28
          }}>
            <div style={{
              background: '#232336',
              padding: '20px',
              borderRadius: 12,
              borderLeft: '4px solid #4fc3f7'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#b3e5fc' }}>Present Today</span>
                <span style={{ color: '#4fc3f7', fontSize: 20 }}>👥</span>
              </div>
              <h3 style={{ fontSize: 28, margin: 0 }}>24/30</h3>
              <p style={{ color: '#2ecc71', fontSize: 13, margin: '8px 0 0 0' }}>↑ 80% Attendance Rate</p>
            </div>

            <div style={{
              background: '#232336',
              padding: '20px',
              borderRadius: 12,
              borderLeft: '4px solid #2ecc71'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#b3e5fc' }}>On Time</span>
                <span style={{ color: '#2ecc71', fontSize: 20 }}>⏰</span>
              </div>
              <h3 style={{ fontSize: 28, margin: 0 }}>22</h3>
              <p style={{ color: '#2ecc71', fontSize: 13, margin: '8px 0 0 0' }}>↑ 92% Punctuality Rate</p>
            </div>

            <div style={{
              background: '#232336',
              padding: '20px',
              borderRadius: 12,
              borderLeft: '4px solid #f2c94c'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#b3e5fc' }}>Late Arrivals</span>
                <span style={{ color: '#f2c94c', fontSize: 20 }}>⚠️</span>
              </div>
              <h3 style={{ fontSize: 28, margin: 0 }}>2</h3>
              <p style={{ color: '#f2c94c', fontSize: 13, margin: '8px 0 0 0' }}>↓ 8% of total</p>
            </div>

            <div style={{
              background: '#232336',
              padding: '20px',
              borderRadius: 12,
              borderLeft: '4px solid #ff5252'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#b3e5fc' }}>Absent</span>
                <span style={{ color: '#ff5252', fontSize: 20 }}>❌</span>
              </div>
              <h3 style={{ fontSize: 28, margin: 0 }}>6</h3>
              <p style={{ color: '#ff5252', fontSize: 13, margin: '8px 0 0 0' }}>20% of total</p>
            </div>
          </div>

          {/* Attendance Table */}
          <div style={{
            background: '#232336',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <h3 style={{ color: '#4fc3f7', margin: 0 }}>Today's Attendance</h3>
              <button style={{
                background: 'linear-gradient(90deg, #42a5f5 60%, #1976d2 100%)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer'
              }}>
                Export Report
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: '0 8px'
              }}>
                <thead>
                  <tr>
                    {['Employee', 'Team', 'Check In', 'Check Out', 'Status', 'Actions'].map(header => (
                      <th key={header} style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        color: '#ffb300',
                        fontWeight: 600,
                        fontSize: 14
                      }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.flatMap(team => (team.members || []).map(member => ({ ...member, teamName: team.team_name }))).map((member, index) => (
                    <tr key={member.id} style={{
                      background: '#181824',
                      transition: 'transform 0.2s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(8px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <td style={{ padding: '16px', borderRadius: '8px 0 0 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#4fc3f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#181824',
                            fontWeight: 600,
                            fontSize: 16
                          }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{member.name}</div>
                            <div style={{ fontSize: 12, color: '#b3e5fc' }}>{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>{member.teamName}</td>
                      <td style={{ padding: '16px' }}>09:00 AM</td>
                      <td style={{ padding: '16px' }}>05:30 PM</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 12,
                          fontSize: 13,
                          background: index % 3 === 0 ? 'rgba(46, 204, 113, 0.2)' :
                            index % 3 === 1 ? 'rgba(242, 201, 76, 0.2)' :
                              'rgba(255, 82, 82, 0.2)',
                          color: index % 3 === 0 ? '#2ecc71' :
                            index % 3 === 1 ? '#f2c94c' :
                              '#ff5252'
                        }}>
                          {index % 3 === 0 ? 'Present' :
                            index % 3 === 1 ? 'Late' :
                              'Absent'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', borderRadius: '0 8px 8px 0' }}>
                        <button style={{
                          background: 'none',
                          border: '1px solid #4fc3f7',
                          borderRadius: 6,
                          padding: '6px 12px',
                          color: '#4fc3f7',
                          cursor: 'pointer',
                          fontSize: 13
                        }}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ Leave Request Button */}
          <div style={{ marginTop: '1rem' }}>
            <button
              className="leave-request-btn"
              style={{
                background: 'linear-gradient(90deg, #42a5f5 60%, #1976d2 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 17,
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                boxShadow: '0 1px 4px #1976d222'
              }}
              onClick={() => {
                fetchLeaveRequests();
                setShowLeaveRequests(true);
              }}
            >
              📄 View Leave Requests
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ✅ Leave Requests Table */}
          {leaveRequests.length === 0 ? (
            <p style={{ color: '#b3e5fc' }}>No leave requests found.</p>
          ) : (
            <table className="leave-request-table" style={{ background: '#232336', color: '#b3e5fc', borderRadius: 10, width: '100%', marginTop: 20 }}>
              <thead>
                <tr>
                  <th style={{ color: '#4fc3f7' }}>Employee</th>
                  <th style={{ color: '#4fc3f7' }}>Start</th>
                  <th style={{ color: '#4fc3f7' }}>End</th>
                  <th style={{ color: '#4fc3f7' }}>Reason</th>
                  <th style={{ color: '#4fc3f7' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...new Map(leaveRequests.map(req => [req.id, req])).values()].map((req, idx) => (
                  <tr key={idx}>
                    <td>{req.employee_name || req.name || req.employeeName || 'N/A'}</td>
                    <td>{new Date(req.start_date).toLocaleDateString()}</td>
                    <td>{new Date(req.end_date).toLocaleDateString()}</td>
                    <td>{req.reason}</td>
                    <td>
                      <button
                        onClick={async () => {
                          await handleLeaveDecision(req.id, 'Approved');
                          setLeaveRequests(prev => prev.filter(r => r.id !== req.id));
                        }}
                        style={{ marginRight: '5px' }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={async () => {
                          await handleLeaveDecision(req.id, 'Rejected');
                          setLeaveRequests(prev => prev.filter(r => r.id !== req.id));
                        }}
                      >
                        ❌ Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            style={{ marginTop: '1rem' }}
            onClick={() => setShowLeaveRequests(false)}
          >
            🔙 Back to Attendance
          </button>
        </>
      )}
    </div>
  );

// Removed duplicate/stray React.Fragment and leave requests block after the main attendance section.


     case 'messages':
  return (
    <div className="messages-page-whatsapp" style={{
      display: 'flex',
      height: '100%',
      minHeight: 'calc(100vh - 80px)',
      background: '#232336',
      borderRadius: 16,
      boxShadow: '0 4px 24px #0006',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Left Sidebar - Users */}
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
          fontSize: 18,
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
          {(users || []).map(user => (
            <div
              key={user.id}
              className="user-item"
             onClick={() => {
  setSelectedUser(user);
  setAssignedTo(user.id);
  localStorage.setItem("lastChatUser", JSON.stringify(user));
}}

              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 18px',
                cursor: 'pointer',
                background: assignedTo === user.id ? 'rgba(79,195,247,0.08)' : 'none',
                borderBottom: '1px solid #232336',
                transition: 'background 0.2s',
              }}
            >
              <img
                className="user-avatar-img"
                src={`https://i.pravatar.cc/150?u=${user.id}`}
                alt="avatar"
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #232336' }}
              />
              <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: '#fff', fontSize: 14 }}>{user.name}</strong>
                <small style={{ color: '#b3e5fc', fontSize: 12 }}>{user.email}</small>
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
          {assignedTo ? (
            <>
              <img
                src={`https://i.pravatar.cc/150?u=${assignedTo}`}
                alt="user"
                className="user-avatar-img"
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #232336' }}
              />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {users.find(u => u.id === assignedTo)?.name || 'User'}
              </span>
            </>
          ) : (
            <span style={{ color: '#b3e5fc', fontWeight: 500, fontSize: 18 }}>Select a user to start chatting</span>
          )}
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
  console.log("📩 Rendering message:", msg, "Logged-in manager ID:", manager?.id);

  return (
    <div
      key={i}
      className={msg.sender_id === manager?.id ? 'chat-message sent' : 'chat-message received'}
      style={{
        alignSelf: msg.sender_id === manager?.id ? 'flex-end' : 'flex-start',
        background: msg.sender_id === manager?.id ? '#4fc3f7' : '#232336',
        color: msg.sender_id === manager?.id ? '#181824' : '#fff',
        borderRadius: msg.sender_id === manager?.id ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '12px 20px',
        maxWidth: '60%',
        boxShadow: '0 2px 8px #1976d222',
        fontSize: 16,
      }}
    >
      {msg.message}
    </div>
  );
})}

          <div ref={chatEndRef}></div>
        </div>

        <div className="chat-input-area" style={{
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
            placeholder="Type a message..."
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
          onKeyDown={(e) => {
  if (e.key === 'Enter') {
    const msg = message.trim();
    if (!msg || !assignedTo || !socket) return;

    socket.emit('private_message', {
      fromUserId: manager.id,
      toUserId: assignedTo,
      message: msg,
    });

    setMessages(prev => [...prev, {
      sender_id: manager.id,
      receiver_id: assignedTo,
      message: msg,
    }]);

    setMessage('');
    scrollToBottom();
  }
}}

          />
          <button
            onClick={() => {
  const msg = message.trim();
  if (!msg || !assignedTo || !socket) return;

  socket.emit('private_message', {
    fromUserId: manager.id,
    toUserId: assignedTo, // ✅ FIXED
    message: msg,
  });

  setMessages(prev => [...prev, {
    sender_id: manager.id,
    receiver_id: assignedTo, // ✅ FIXED
    message: msg,
  }]);

  setMessage('');
  scrollToBottom();
}}

            style={{
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
        </div>
      </div>
    </div>
  );



      default:
        return null;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <div
      className={`manager-dashboard${isSidebarOpen ? " sidebar-open" : " sidebar-closed"}`}
      style={{ fontSize: '18px', lineHeight: 1.7, fontFamily: 'Inter, Arial, sans-serif', background: '#181824', minHeight: '100vh', color: '#fff', transition: 'padding-left 0.3s cubic-bezier(.4,0,.2,1)' }}
    >
      {/* Small toggle button, fixed at top left */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          top: 18,
          left: 18,
          zIndex: 2001,
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: '#232336',
          color: '#4fc3f7',
          border: 'none',
          fontSize: 22,
          boxShadow: '0 2px 8px #0002',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s, left 0.3s cubic-bezier(.4,0,.2,1)',
        }}
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? '✕' : '≡'}
      </button>

      {/* Sidebar with smooth transition */}
      <aside
        className={`sidebar${isSidebarOpen ? " open" : " closed"}`}
        style={{
          width: isSidebarOpen ? 265 : 0,
          minWidth: isSidebarOpen ? 180 : 0,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          background: '#181824',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          boxShadow: isSidebarOpen ? '2px 0 12px #0001' : 'none',
          padding: 0,
          borderRadius: 0,
          zIndex: 1200,
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(.4,0,.2,1), min-width 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s',
        }}
      >
        <div style={{ padding: '36px 0 24px 0', textAlign: 'center', borderBottom: '1px solid #232336', marginBottom: 0 }}>
          <h2 className="logo" style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: 1, color: '#ffb300' }}>📘 Manager</h2>
        </div>
        <ul className="nav-links" style={{
          fontSize: 22,
          flex: 1,
          listStyle: 'none',
          margin: 0,
          padding: '30px 0 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}>
          <li onClick={() => setActiveTab('dashboard')} style={{ padding: '18px 38px', fontSize: 22, cursor: 'pointer', borderLeft: activeTab==='dashboard' ? '5px solid #ffb300' : '5px solid transparent', background: activeTab==='dashboard' ? '#232336' : 'none', fontWeight: activeTab==='dashboard' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 24px 24px 0' }}><Home size={26} style={{ marginRight: 14, verticalAlign: 'middle', color: activeTab==='dashboard' ? '#ffb300' : '#fff' }} /> <span>Dashboard</span></li>
          <li onClick={() => setActiveTab('team')} style={{ padding: '18px 38px', fontSize: 22, cursor: 'pointer', borderLeft: activeTab==='team' ? '5px solid #ffb300' : '5px solid transparent', background: activeTab==='team' ? '#232336' : 'none', fontWeight: activeTab==='team' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 24px 24px 0' }}><Users size={26} style={{ marginRight: 14, verticalAlign: 'middle', color: activeTab==='team' ? '#ffb300' : '#fff' }} /> <span>Team Management</span></li>
          <li onClick={() => setActiveTab('attendance')} style={{ padding: '18px 38px', fontSize: 22, cursor: 'pointer', borderLeft: activeTab==='attendance' ? '5px solid #ffb300' : '5px solid transparent', background: activeTab==='attendance' ? '#232336' : 'none', fontWeight: activeTab==='attendance' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 24px 24px 0' }}><Calendar size={26} style={{ marginRight: 14, verticalAlign: 'middle', color: activeTab==='attendance' ? '#ffb300' : '#fff' }} /> <span>Attendance</span></li>
          <li onClick={() => setActiveTab('messages')} style={{ padding: '18px 38px', fontSize: 22, cursor: 'pointer', borderLeft: activeTab==='messages' ? '5px solid #ffb300' : '5px solid transparent', background: activeTab==='messages' ? '#232336' : 'none', fontWeight: activeTab==='messages' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 24px 24px 0' }}><MessageCircle size={26} style={{ marginRight: 14, verticalAlign: 'middle', color: activeTab==='messages' ? '#ffb300' : '#fff' }} /> <span>Messages</span></li>
        </ul>
        <div style={{ padding: '0 0 38px 0', borderTop: '1px solid #232336', textAlign: 'center', background: 'transparent', marginTop: 'auto' }}>
          <button
            onClick={handleLogout}
            style={{
              width: 'auto',
              background: 'linear-gradient(90deg, #42a5f5 60%, #1976d2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 1px 4px #1976d222',
              margin: '24px auto 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s',
            }}
          >
            <LogOut size={18} style={{ color: '#fff' }} /> Logout
          </button>
        </div>
      </aside>

      {/* Right side dashboard */}
      <main
        className={`main-area${isSidebarOpen ? ' shifted' : ' full'}`}
        style={{
          fontSize: 18,
          background: '#232336',
          color: '#fff',
          minHeight: '100vh',
          marginLeft: isSidebarOpen ? 265 : 0,
          transition: 'margin-left 0.3s cubic-bezier(.4,0,.2,1)',
          width: isSidebarOpen ? 'calc(100% - 265px)' : '100%',
        }}
      >
        <header className="dashboard-header" style={{ fontSize: 20, padding: '18px 0', background: '#181824', color: '#fff', borderBottom: '1px solid #232336' }}>
          <div className="header-left"></div>
          <div className="header-right">
            <div className="user-info" style={{ fontSize: 18 }}>
              <span className="username" style={{ fontSize: 19, fontWeight: 600 }}>John Smith</span>
              <img src="https://i.pravatar.cc/40" alt="Profile" className="avatar" />
            </div>
          </div>
        </header>

        <section className="main-content" style={{ fontSize: 18, background: '#232336', color: '#fff' }}>
          {renderContent()}
        </section>
      </main>

      {/* Overlay (mobile only) */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}
    </div>
  );

};

export default ManagerDashboard;
