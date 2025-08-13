import React, { useState, useEffect, useRef } from 'react';
import './styles/EmployeeDashboard.css';
//import MessagesPage from './MessagesPage';
import { io } from 'socket.io-client';
import {
  Home,
  ClipboardList,
  Calendar,
  User,
  MessageCircle,
  LogOut
} from 'lucide-react';
import axios from 'axios';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
const EmployeeDashboard = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
  const [submitting, setSubmitting] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showLeaveRequests, setShowLeaveRequests] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toggle, setToggle] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
const [selectedUser, setSelectedUser] = useState(null);
const chatBodyRef = useRef(null);



  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : {};
  });

  const userId = user?.id;

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', email: '', department: '', phone: '', gender: '', status: ''
  });

  const formatToIST = (utcTimestamp) => {
    try {
      const utcDate = new Date(utcTimestamp);
      const istDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      return istDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Invalid Date";
    }
  };


  useEffect(() => {
  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users');
      const allUsers = res.data;

      // Optional: Filter out self if you don’t want to show the current user
      const filtered = allUsers.filter(u => u.id !== user.id);

      setUsers(filtered);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  if (activeTab === 'messages') {
    fetchUsers();
  }
}, [activeTab, user.id]);


useEffect(() => {
  const fetchConversation = async () => {
    if (!selectedUser || !user?.id) return;

    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${user.id}/${selectedUser.id}`);

      const formatted = res.data.map(msg => ({
        sender_id: msg.from_user_id,
        receiver_id: msg.to_user_id,
        message: msg.message,
        timestamp: msg.timestamp,
      }));

      console.log('📨 Loaded conversation from DB:', formatted);
      setMessages(formatted);
    } catch (err) {
      console.error("❌ Failed to load messages:", err);
    }
  };

  fetchConversation();
}, [selectedUser?.id, user?.id]);



 useEffect(() => {
  if (!user || !user.id) return;

  const newSocket = io('http://localhost:5000', { autoConnect: true });
  setSocket(newSocket);

  console.log("🔌 [Socket] Emitting join for user:", user.id); // ✅ Log this
  newSocket.emit('join', user.id);

  return () => {
    newSocket.disconnect();
  };
}, [user?.id]);


 useEffect(() => {
  if (!socket) return;

  const handleMessage = (msg) => {
    setMessages(prevMessages => {
      const isDuplicate = prevMessages.some(m =>
        (m.message === msg.message &&
         m.fromUserId === msg.fromUserId &&
         m.toUserId === msg.toUserId &&
         m.timestamp === msg.timestamp)
      );

      if (isDuplicate) return prevMessages;
      return [...prevMessages, msg];
    });
  };

  socket.on('private_message', handleMessage);
  return () => socket.off('private_message', handleMessage);
}, [socket]);

useEffect(() => {
  if (chatBodyRef.current) {
    chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }
}, [messages]);


  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/users/${userId}`);
        setUser(response.data);
      } catch (error) {
        console.error("Fetch user error", error);
      }
    };

    if (userId && activeTab === 'profile') {
      fetchUserProfile();
    }
  }, [userId, activeTab]);

  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

 const sendMessage = async (e) => {
  e.preventDefault();
  if (!message.trim() || !socket || !selectedUser) return;

  const currentUser = JSON.parse(localStorage.getItem('user'));

  if (!currentUser?.id || !selectedUser?.id) {
    console.error("❌ Invalid IDs. Current:", currentUser, "Selected:", selectedUser);
    return;
  }

  const msgPayload = {
    fromUserId: currentUser.id,
    toUserId: selectedUser.id,
    message: message.trim(),
  };

  try {
    // Save to DB
    const res = await axios.post('http://localhost:5000/api/messages/send', msgPayload);

    const savedMessage = res.data;

    console.log("✅ Message saved in DB:", savedMessage);

    // Send real-time via socket
    socket.emit('private_message', {
      fromUserId: currentUser.id,
      toUserId: selectedUser.id,
      message: savedMessage.message,
      timestamp: savedMessage.timestamp,
    });

    // Update UI immediately
    setMessages((prev) => [
      ...prev,
      {
        fromUserId: currentUser.id,
        toUserId: selectedUser.id,
        message: savedMessage.message,
        timestamp: savedMessage.timestamp,
      },
    ]);

    setMessage('');
  } catch (err) {
    console.error("❌ Failed to send/save message:", err);
  }
};


  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      await axios.put(`http://localhost:5000/api/users/${userId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log("✅ Avatar uploaded");
    } catch (error) {
      console.error("❌ Avatar upload failed", error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/users/${user.id}`, editForm);
      const updated = await axios.get(`${process.env.REACT_APP_API_URL}/users/${user.id}`);
      setUser(updated.data);
      setEditMode(false);
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const fetchAttendance = async () => {
    try {
      const employee = JSON.parse(localStorage.getItem('user'));
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/attendance/user/${employee.id}`);
      setAttendance(res.data);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/leave-requests/user/${user.id}`);
      setLeaveRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  };

  const handleSubmitAttendance = async () => {
    setSubmitting(true);
    const employee = JSON.parse(localStorage.getItem('user'));
    const today = new Date().toLocaleDateString('en-CA');
    const timestamp = new Date();

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/attendance`, {
        user_id: employee.id,
        date: today,
        status: 'Present',
        timestamp
      });
      alert('✅ Attendance submitted');
      fetchAttendance();
    } catch (err) {
      alert('❌ Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveRequest = async (e) => {
    e.preventDefault();
    const employee = JSON.parse(localStorage.getItem('user'));
    const employee_id = employee?.id;
    const employee_name = employee?.name || employee?.full_name || 'Unknown';

    const form = e.target;
    const start_date = form.start_date.value;
    const end_date = form.end_date.value;
    const reason = form.reason.value;

    if (!employee_id || !employee_name || !start_date || !end_date || !reason) {
      alert("❗ All fields are required before submitting leave request.");
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/leave-requests`, {
        employee_id,
        employee_name,
        start_date,
        end_date,
        reason
      });

      alert('✅ Leave request submitted!');
      form.reset();
      fetchLeaveRequests();
    } catch (err) {
      alert('❌ Error submitting leave request');
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchEmployeeTasks = async () => {
      try {
        const employee = JSON.parse(localStorage.getItem('user'));
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/tasks?assigned_to=${employee.id}`);
        setTasks(res.data);
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      }
    };

    if (activeTab === 'tasks') {
      fetchEmployeeTasks();
    }

    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab]);

;



  const renderContent = () => {
    // Calculate common values used across multiple cases
    const today = new Date().toLocaleDateString('en-CA');
    const todayAttendance = attendance.find(a => new Date(a.date).toLocaleDateString('en-CA') === today);
    const timestampRaw = todayAttendance?.timestamp;
    const parsedDate = timestampRaw ? new Date(timestampRaw.replace(' ', 'T')) : null;
    const checkInHour = parsedDate ? parsedDate.getHours() : null;
    const delayHours = checkInHour && checkInHour > 10 ? checkInHour - 10 : 0;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{
            padding: '32px',
            maxWidth: '1400px',
            margin: '0 auto',
          }}>
            {/* Welcome Section */}
            <div style={{
              background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
            }}>
              <img
                src={user?.avatar
                  ? `http://localhost:5000${user.avatar}`
                  : 'https://i.pravatar.cc/100?u=' + encodeURIComponent(user?.email || 'employee')
                }
                alt="Profile"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '3px solid #ffb300'
                }}
              />
              <div>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '8px'
                }}>Welcome back, {user?.name || 'Employee'}!</h1>
                <p style={{ color: '#b3e5fc', fontSize: '16px' }}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                borderRadius: '16px',
                padding: '24px',
                borderLeft: '4px solid #4fc3f7'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#4fc3f7', fontSize: '16px', fontWeight: '600' }}>Tasks Due Today</h3>
                  <span style={{ background: '#4fc3f7', padding: '6px 12px', borderRadius: '12px', color: '#181824', fontSize: '14px', fontWeight: '700' }}>{tasks.filter(t => new Date(t.due_date).toDateString() === new Date().toDateString()).length}</span>
                </div>
                <p style={{ color: '#fff', fontSize: '14px' }}>Click to view your urgent tasks</p>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                borderRadius: '16px',
                padding: '24px',
                borderLeft: '4px solid #4caf50'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#4caf50', fontSize: '16px', fontWeight: '600' }}>Task Progress</h3>
                  <span style={{ background: '#4caf50', padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '700' }}>{Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)}%</span>
                </div>
                <p style={{ color: '#fff', fontSize: '14px' }}>Overall completion rate</p>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                borderRadius: '16px',
                padding: '24px',
                borderLeft: '4px solid #ffb300'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#ffb300', fontSize: '16px', fontWeight: '600' }}>Attendance</h3>
                  <span style={{ 
                    background: todayAttendance ? '#4caf50' : '#f44336',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}>{todayAttendance ? 'Present' : 'Not Marked'}</span>
                </div>
                <p style={{ color: '#fff', fontSize: '14px' }}>
                  {todayAttendance
                    ? `Checked in at ${new Date(todayAttendance.timestamp).toLocaleTimeString()}`
                    : 'Mark your attendance for today'
                  }
                </p>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                borderRadius: '16px',
                padding: '24px',
                borderLeft: '4px solid #e91e63'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#e91e63', fontSize: '16px', fontWeight: '600' }}>Leave Balance</h3>
                  <span style={{ background: '#e91e63', padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '700' }}>12 Days</span>
                </div>
                <p style={{ color: '#fff', fontSize: '14px' }}>Remaining paid leave days</p>
              </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
            }}>
              {/* Recent Tasks */}
              <div style={{
                background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                borderRadius: '20px',
                padding: '24px',
              }}>
                <h3 style={{ color: '#ffb300', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Recent Tasks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {tasks.slice(0, 3).map((task, index) => (
                    <div key={index} style={{
                      background: '#35354a',
                      borderRadius: '12px',
                      padding: '16px',
                      borderLeft: `4px solid ${task.priority === 'High' ? '#f44336' : task.priority === 'Medium' ? '#ffb300' : '#4fc3f7'}`
                    }}>
                      <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>{task.title}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#b3e5fc', fontSize: '14px' }}>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        <span style={{
                          background: task.status === 'completed' ? '#4caf50' : '#ff9800',
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>{task.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('tasks')} style={{
                  width: '100%',
                  padding: '12px',
                  background: '#35354a',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  marginTop: '16px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}>View All Tasks</button>
              </div>

              {/* Quick Actions */}
              <div style={{
                background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                borderRadius: '20px',
                padding: '24px',
              }}>
                <h3 style={{ color: '#ffb300', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Quick Actions</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px'
                }}>
                  <button onClick={() => setActiveTab('attendance')} style={{
                    background: '#35354a',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    textAlign: 'left'
                  }}>
                    <Calendar size={24} style={{ marginBottom: '8px', color: '#4fc3f7' }} />
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Mark Attendance</div>
                    <small style={{ color: '#b3e5fc' }}>Check in for today</small>
                  </button>

                  <button onClick={() => { setActiveTab('attendance'); setShowLeaveForm(true); }} style={{
                    background: '#35354a',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    textAlign: 'left'
                  }}>
                    <Calendar size={24} style={{ marginBottom: '8px', color: '#ffb300' }} />
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Request Leave</div>
                    <small style={{ color: '#b3e5fc' }}>Apply for time off</small>
                  </button>

                  <button onClick={() => setActiveTab('profile')} style={{
                    background: '#35354a',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    textAlign: 'left'
                  }}>
                    <User size={24} style={{ marginBottom: '8px', color: '#e91e63' }} />
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Update Profile</div>
                    <small style={{ color: '#b3e5fc' }}>Manage your details</small>
                  </button>

                  <button onClick={() => setActiveTab('messages')} style={{
                    background: '#35354a',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    textAlign: 'left'
                  }}>
                    <MessageCircle size={24} style={{ marginBottom: '8px', color: '#4caf50' }} />
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Messages</div>
                    <small style={{ color: '#b3e5fc' }}>Chat with colleagues</small>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tasks':
        const groupedTasks = tasks.reduce((acc, task) => {
          const status = task.status || 'Pending';
          if (!acc[status]) acc[status] = [];
          acc[status].push(task);
          return acc;
        }, {});

        return (
          <div className="tasks-page" style={{
            background: '#181824',
            borderRadius: 18,
            boxShadow: '0 4px 24px #0004',
            padding: '24px 32px',
            maxWidth: 1200,
            margin: '40px auto',
            fontFamily: 'Segoe UI, sans-serif',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <h2 style={{
                color: '#ffb300',
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: 0.5,
              }}>My Tasks</h2>
              <div style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center'
              }}>
                <div style={{
                  background: '#232336',
                  padding: '8px 16px',
                  borderRadius: 12,
                  color: '#b3e5fc'
                }}>
                  Total Tasks: {tasks.length}
                </div>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: '#232336',
                borderRadius: 12,
                color: '#b3b3b3'
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <p style={{ fontSize: 18, marginBottom: 8 }}>No tasks assigned to you yet</p>
                <p style={{ fontSize: 14, color: '#666' }}>New tasks will appear here when assigned</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 24,
              }}>
                {Object.entries(groupedTasks).map(([status, statusTasks]) => (
                  <div key={status} style={{
                    background: '#232336',
                    borderRadius: 16,
                    padding: 20,
                  }}>
                    <h3 style={{
                      color: '#4fc3f7',
                      fontSize: 18,
                      fontWeight: 600,
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      {status === 'Completed' ? '✅' : status === 'In Progress' ? '⚡' : '📋'} {status}
                      <span style={{ 
                        marginLeft: 'auto',
                        fontSize: 14,
                        color: '#666',
                        fontWeight: 400
                      }}>{statusTasks.length}</span>
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}>
                      {statusTasks.map(task => (
                        <div key={task.id} style={{
                          background: '#181824',
                          borderRadius: 12,
                          padding: '16px',
                          position: 'relative',
                          borderLeft: task.priority === 'High' ? '4px solid #f44336' : 
                                    task.priority === 'Medium' ? '4px solid #ffb300' : 
                                    '4px solid #4fc3f7',
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 12,
                          }}>
                            <h4 style={{ 
                              color: '#fff',
                              fontSize: 16,
                              fontWeight: 600,
                              marginRight: 12,
                            }}>{task.title}</h4>
                            <span style={{
                              background: task.priority === 'High' ? '#f44336' : 
                                        task.priority === 'Medium' ? '#ffb300' : 
                                        '#4fc3f7',
                              color: task.priority === 'High' ? '#fff' : '#181824',
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                            }}>{task.priority}</span>
                          </div>
                          
                          {task.description && (
                            <p style={{
                              color: '#b3b3b3',
                              fontSize: 14,
                              marginBottom: 12,
                              lineHeight: 1.4,
                            }}>{task.description}</p>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#b3e5fc',
                            fontSize: 13,
                          }}>
                            <div style={{
                              display: 'flex',
                              gap: 16,
                              alignItems: 'center',
                            }}>
                              <span>
                                🗓️ Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                }) : 'N/A'}
                              </span>
                              {task.assignedBy && (
                                <span>
                                  👤 By: {task.assignedBy}
                                </span>
                              )}
                            </div>
                            {task.created_at && (
                              <span style={{ color: '#666', fontSize: 12 }}>
                                Created: {new Date(task.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'attendance':
        const lastCheckInTime = parsedDate
          ? parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
          : 'Not yet';

        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return {
            date: d.toLocaleDateString('en-CA'),
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          };
        }).reverse();

        const chartData = last7Days.map(day => {
          const record = attendance.find(a => new Date(a.date).toLocaleDateString('en-CA') === day.date);
          return {
            day: day.label,
            status: record?.status || 'Absent',
            statusCount: record?.status === 'Present' ? 1 : 0
          };
        });

        const statusCount = chartData.reduce((acc, cur) => {
          acc[cur.status] = (acc[cur.status] || 0) + 1;
          return acc;
        }, {});

        if (showCharts) {
          return (
            <div className="chart-view" style={{
              maxWidth: 900,
              margin: '40px auto',
              background: 'linear-gradient(120deg, #232336 60%, #35354a 100%)',
              borderRadius: 22,
              boxShadow: '0 8px 32px #0008',
              padding: '36px 28px 32px 28px',
              fontFamily: 'Segoe UI, sans-serif',
              color: '#fff',
            }}>
              <button className="btn secondary" style={{ marginBottom: 18, background: '#35354a', color: '#ffb300', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16, padding: '8px 18px', cursor: 'pointer' }} onClick={() => setShowCharts(false)}>← Back to Attendance</button>
              <h2 style={{
                fontSize: '1.7rem',
                fontWeight: 700,
                color: '#ffb300',
                marginBottom: 10,
                textAlign: 'center',
                letterSpacing: 0.5
              }}>📈 Attendance Insights (Last 7 Days)</h2>
              <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', marginTop: 24 }}>
                <div style={{ background: '#232336', borderRadius: 16, boxShadow: '0 2px 10px #0006', padding: 18, width: 370, height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff' }}>
                  <h4 style={{ color: '#b3e5fc', fontWeight: 600, marginBottom: 8 }}>Daily Presence</h4>
                  <BarChart width={320} height={220} data={chartData} style={{ margin: '0 auto' }}>
                    <XAxis dataKey="day" tick={{ fontSize: 13, fill: '#b3e5fc' }} />
                    <YAxis tick={{ fontSize: 13, fill: '#b3e5fc' }} />
                    <Tooltip contentStyle={{ background: '#35354a', color: '#fff', borderRadius: 8, border: 'none' }} />
                    <Bar dataKey="statusCount" radius={[8,8,0,0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.status === 'Present' ? '#4fc3f7' :
                              entry.status === 'Absent' ? '#f44336' :
                                '#ffb300'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                  <div style={{ marginTop: 10, fontSize: 13, color: '#b3e5fc' }}>
                    <span style={{ color: '#4fc3f7', fontWeight: 600 }}>■</span> Present &nbsp;
                    <span style={{ color: '#f44336', fontWeight: 600 }}>■</span> Absent &nbsp;
                    <span style={{ color: '#ffb300', fontWeight: 600 }}>■</span> Pending
                  </div>
                </div>
                <div style={{ background: '#232336', borderRadius: 16, boxShadow: '0 2px 10px #0006', padding: 18, width: 370, height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff' }}>
                  <h4 style={{ color: '#b3e5fc', fontWeight: 600, marginBottom: 8 }}>Summary</h4>
                  <PieChart width={220} height={220} style={{ margin: '0 auto' }}>
                    <Pie
                      data={[
                        { name: 'Present', value: statusCount['Present'] || 0 },
                        { name: 'Absent', value: statusCount['Absent'] || 0 },
                        { name: 'Pending', value: statusCount['Pending'] || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      dataKey="value"
                    >
                      <Cell fill="#4fc3f7" />
                      <Cell fill="#f44336" />
                      <Cell fill="#ffb300" />
                    </Pie>
                    <Tooltip contentStyle={{ background: '#35354a', color: '#fff', borderRadius: 8, border: 'none' }} />
                  </PieChart>
                  <div style={{ marginTop: 10, fontSize: 13, color: '#b3e5fc' }}>
                    <span style={{ color: '#4fc3f7', fontWeight: 600 }}>●</span> Present &nbsp;
                    <span style={{ color: '#f44336', fontWeight: 600 }}>●</span> Absent &nbsp;
                    <span style={{ color: '#ffb300', fontWeight: 600 }}>●</span> Pending
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (showLeaveForm) {
          return (
            <div className="leave-request-page" style={{
              maxWidth: 480,
              margin: '40px auto',
              background: 'linear-gradient(120deg, #232336 60%, #35354a 100%)',
              borderRadius: 18,
              boxShadow: '0 6px 24px #0008',
              padding: '32px 28px 28px 28px',
              fontFamily: 'Segoe UI, sans-serif',
              color: '#fff',
            }}>
              <button className="btn secondary" style={{ marginBottom: 18, background: '#35354a', color: '#ffb300', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16, padding: '8px 18px', cursor: 'pointer' }} onClick={() => setShowLeaveForm(false)}>← Back to Attendance</button>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: '#ffb300',
                marginBottom: 18,
                textAlign: 'center',
                letterSpacing: 0.5
              }}>📝 Submit Leave Request</h2>
              <form className="leave-form-page" onSubmit={handleLeaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontWeight: 600, color: '#b3e5fc', marginBottom: 2 }}>Start Date</label>
                  <input type="date" name="start_date" required style={{ padding: '10px', borderRadius: 8, border: '1px solid #35354a', fontSize: '1rem', background: '#232336', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontWeight: 600, color: '#b3e5fc', marginBottom: 2 }}>End Date</label>
                  <input type="date" name="end_date" required style={{ padding: '10px', borderRadius: 8, border: '1px solid #35354a', fontSize: '1rem', background: '#232336', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontWeight: 600, color: '#b3e5fc', marginBottom: 2 }}>Reason</label>
                  <textarea name="reason" placeholder="Type reason here..." required style={{ padding: '10px', borderRadius: 8, border: '1px solid #35354a', fontSize: '1rem', background: '#232336', color: '#fff', minHeight: 60, resize: 'vertical' }}></textarea>
                </div>
                <button type="submit" className="btn primary" style={{ marginTop: 8, fontWeight: 700, fontSize: '1rem', borderRadius: 8, background: 'linear-gradient(90deg, #ffb300 60%, #ff9800 100%)', color: '#181824', border: 'none', boxShadow: '0 1px 4px #0002', letterSpacing: 0.2 }}>Submit Request</button>
              </form>
            </div>
          );
        }

        if (showLeaveRequests) {
          return (
            <div className="leave-requests-page" style={{
              maxWidth: 900,
              margin: '40px auto',
              background: 'linear-gradient(120deg, #232336 60%, #35354a 100%)',
              borderRadius: 22,
              boxShadow: '0 8px 32px #0008',
              padding: '36px 28px 32px 28px',
              fontFamily: 'Segoe UI, sans-serif',
              color: '#fff',
            }}>
              <button className="btn secondary" style={{ marginBottom: 18, background: '#35354a', color: '#ffb300', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16, padding: '8px 18px', cursor: 'pointer' }} onClick={() => setShowLeaveRequests(false)}>← Back to Attendance</button>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#ffb300',
                marginBottom: 18,
                textAlign: 'center',
                letterSpacing: 0.5
              }}>🗂️ My Leave Requests</h2>
              {leaveRequests.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#b3e5fc', fontSize: '1.1rem', marginTop: 32 }}>No leave requests submitted.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="leave-table" style={{ width: '100%', background: '#232336', borderRadius: 14, boxShadow: '0 2px 10px #0006', fontSize: '1rem', marginTop: 10, color: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#35354a', color: '#ffb300' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Start Date</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>End Date</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reason</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Requested On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map(req => (
                        <tr key={req.id} style={{ borderBottom: '1px solid #35354a' }}>
                          <td style={{ padding: '12px 16px', color: '#b3e5fc' }}>{req.start_date}</td>
                          <td style={{ padding: '12px 16px', color: '#b3e5fc' }}>{req.end_date}</td>
                          <td style={{ padding: '12px 16px', maxWidth: 220, whiteSpace: 'pre-line', wordBreak: 'break-word', color: '#b3e5fc' }}>{req.reason}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`status-badge ${req.status.toLowerCase()}`} style={{
                              backgroundColor: req.status === 'Pending' ? '#ffb300' : req.status === 'Approved' ? '#4caf50' : '#f44336',
                              color: req.status === 'Pending' ? '#181824' : '#fff',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontWeight: 600,
                              fontSize: '0.98rem',
                              letterSpacing: 0.2
                            }}>{req.status}</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#b3e5fc' }}>{new Date(req.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="professional-attendance-ui" style={{
            maxWidth: '1200px',
            margin: '20px auto',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {/* Attendance Status Card */}
            <div style={{
              background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '24px'
              }}>
                <div style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px',
                }}>
                  <img
                    src={
                      user?.avatar
                        ? `http://localhost:5000${user.avatar}`
                        : 'https://i.pravatar.cc/100?u=' + encodeURIComponent(user?.email || user?.name || 'employee')
                    }
                    alt="Employee"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '3px solid #ffb300',
                      objectFit: 'cover'
                    }}
                  />
                  {todayAttendance?.status === 'Present' && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      background: '#4caf50',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #181824',
                      color: '#fff',
                      fontSize: '12px'
                    }}>✓</div>
                  )}
                </div>
                <div>
                  <h2 style={{
                    fontSize: '24px',
                    color: '#fff',
                    marginBottom: '4px'
                  }}>{user?.name || 'Employee Name'}</h2>
                  <p style={{
                    color: '#b3e5fc',
                    fontSize: '14px'
                  }}>{user?.designation || user?.role || 'Employee Role'} • {user?.department || 'Department'}</p>
                </div>
              </div>

              <div style={{
                background: todayAttendance?.status === 'Present' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    color: '#b3e5fc',
                    fontSize: '14px'
                  }}>Today's Status</span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: todayAttendance?.status === 'Present' ? '#4caf50' : '#f44336',
                    color: '#fff'
                  }}>{todayAttendance?.status || 'Not Checked In'}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ color: '#b3e5fc', fontSize: '12px', marginBottom: '4px' }}>Check-in Time</p>
                    <p style={{ color: '#fff', fontSize: '14px' }}>{todayAttendance?.timestamp ? formatToIST(todayAttendance.timestamp) : 'Not Yet'}</p>
                  </div>
                  {delayHours > 0 && (
                    <div style={{
                      background: '#f44336',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>⏰</span>
                      <div>
                        <p style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{delayHours}h Late</p>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>Morning Delay</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                <button
                  onClick={handleSubmitAttendance}
                  disabled={submitting || todayAttendance}
                  style={{
                    padding: '16px',
                    background: submitting || todayAttendance 
                      ? '#35354a' 
                      : 'linear-gradient(90deg, #ffb300 0%, #ff9800 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: submitting || todayAttendance ? '#666' : '#181824',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: submitting || todayAttendance ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                    boxShadow: submitting || todayAttendance 
                      ? 'none' 
                      : '0 4px 15px rgba(255, 179, 0, 0.2)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(255, 179, 0, 0.3)',
                    }
                  }}
                >
                  {submitting ? (
                    <>
                      <span style={{ fontSize: '20px' }}>⏳</span>
                      Submitting...
                    </>
                  ) : todayAttendance ? (
                    <>
                      <span style={{ fontSize: '20px' }}>✅</span>
                      Already Checked In
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '20px' }}>👋</span>
                      Mark Attendance
                    </>
                  )}
                </button>

                {/* Attendance Tip */}
                {!todayAttendance && !submitting && (
                  <div style={{
                    background: 'rgba(79, 195, 247, 0.1)',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '20px' }}>💡</span>
                    <p style={{ 
                      color: '#4fc3f7', 
                      fontSize: '14px',
                      margin: 0
                    }}>
                      Remember to mark your attendance at the start of your workday
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Statistics Card */}
            <div style={{
              background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              <h3 style={{
                fontSize: '20px',
                color: '#ffb300',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📊</span> Monthly Overview
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  transition: 'transform 0.3s ease',
                  cursor: 'default',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(76, 175, 80, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}>
                    <span style={{ fontSize: '20px' }}>✅</span>
                  </div>
                  <p style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Present Days</p>
                  <h4 style={{ color: '#4caf50', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                    {statusCount?.Present || 0}
                  </h4>
                  <p style={{ color: '#81c784', fontSize: '13px' }}>This Month</p>
                </div>
                
                <div style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid rgba(244, 67, 54, 0.2)',
                  transition: 'transform 0.3s ease',
                  cursor: 'default',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(244, 67, 54, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}>
                    <span style={{ fontSize: '20px' }}>❌</span>
                  </div>
                  <p style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Absent Days</p>
                  <h4 style={{ color: '#f44336', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                    {statusCount?.Absent || 0}
                  </h4>
                  <p style={{ color: '#e57373', fontSize: '13px' }}>This Month</p>
                </div>

                <div style={{
                  background: 'rgba(255, 179, 0, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 179, 0, 0.2)',
                  transition: 'transform 0.3s ease',
                  cursor: 'default',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 179, 0, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}>
                    <span style={{ fontSize: '20px' }}>📊</span>
                  </div>
                  <p style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Attendance Rate</p>
                  <h4 style={{ color: '#ffb300', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                    {Math.round((statusCount?.Present || 0) / (Object.values(statusCount || {}).reduce((a, b) => a + b, 0) || 1) * 100)}%
                  </h4>
                  <p style={{ color: '#ffd54f', fontSize: '13px' }}>This Month</p>
                </div>
              </div>
              <button
                onClick={() => setShowCharts(true)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(35, 35, 54, 0.5)',
                  border: '1px solid #35354a',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(35, 35, 54, 0.8)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <span style={{ fontSize: '20px' }}>📈</span>
                <div>
                  <span style={{ fontWeight: '600' }}>View Detailed Statistics</span>
                  <p style={{ fontSize: '13px', color: '#b3e5fc', margin: '4px 0 0 0' }}>See your complete attendance history</p>
                </div>
              </button>
            </div>

            {/* Quick Actions Card */}
            <div style={{
              background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              <h3 style={{
                fontSize: '20px',
                color: '#ffb300',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚡</span> Quick Actions
              </h3>
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                <button
                  onClick={() => setShowLeaveForm(true)}
                  style={{
                    padding: '20px',
                    background: 'rgba(35, 35, 54, 0.5)',
                    border: '1px solid #35354a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>📝</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>Submit Leave Request</p>
                    <p style={{ color: '#b3e5fc', fontSize: '14px' }}>Apply for time off or vacation</p>
                  </div>
                </button>
                <button
                  onClick={() => { fetchLeaveRequests(); setShowLeaveRequests(true); }}
                  style={{
                    padding: '20px',
                    background: 'rgba(35, 35, 54, 0.5)',
                    border: '1px solid #35354a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>�</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>View Leave History</p>
                    <p style={{ color: '#b3e5fc', fontSize: '14px' }}>Check your leave requests status</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div style={{
            maxWidth: '1200px',
            margin: '40px auto',
            padding: '0 20px',
          }}>
            {editMode ? (
              <div style={{
                background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}>
                <form className="profile-edit-form" onSubmit={handleProfileUpdate} style={{
                  maxWidth: '600px',
                  margin: '0 auto',
                }}>
                  <h2 style={{
                    fontSize: '28px',
                    color: '#ffb300',
                    marginBottom: '32px',
                    textAlign: 'center',
                    fontWeight: '700',
                  }}>✏️ Edit Profile</h2>
                  <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ color: '#b3e5fc', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: '#232336',
                          border: '2px solid #35354a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '16px',
                          transition: 'border-color 0.3s',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#b3e5fc', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Email Address</label>
                      <input 
                        type="email" 
                        value={editForm.email} 
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: '#232336',
                          border: '2px solid #35354a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '16px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#b3e5fc', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Phone Number</label>
                      <input 
                        type="text" 
                        value={editForm.phone} 
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: '#232336',
                          border: '2px solid #35354a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '16px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#b3e5fc', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Department</label>
                      <input 
                        type="text" 
                        value={editForm.department} 
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: '#232336',
                          border: '2px solid #35354a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '16px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#b3e5fc', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Gender</label>
                      <select 
                        value={editForm.gender} 
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: '#232336',
                          border: '2px solid #35354a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '16px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color: '#b3e5fc', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Status</label>
                      <select 
                        value={editForm.status} 
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: '#232336',
                          border: '2px solid #35354a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '16px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    marginTop: '32px',
                    justifyContent: 'center'
                  }}>
                    <button 
                      type="submit" 
                      style={{
                        padding: '12px 32px',
                        background: 'linear-gradient(90deg, #ffb300 0%, #ff9800 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#181824',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                    >
                      Save Changes
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setEditMode(false)}
                      style={{
                        padding: '12px 32px',
                        background: '#35354a',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: '32px',
              }}>
                {/* Left Column - Avatar and Quick Actions */}
                <div style={{
                  background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                  borderRadius: '20px',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: 'fit-content',
                }}>
                  <div 
                    onClick={handleAvatarClick}
                    style={{
                      width: '160px',
                      height: '160px',
                      borderRadius: '50%',
                      padding: '4px',
                      background: 'linear-gradient(45deg, #ffb300, #ff9800)',
                      cursor: 'pointer',
                      marginBottom: '24px',
                    }}
                  >
                    <img
                      src={
                        avatarPreview
                          ? avatarPreview
                          : user?.avatar
                            ? `http://localhost:5000${user.avatar}`
                            : 'https://i.pravatar.cc/160'
                      }
                      alt="Avatar"
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '4px solid #181824',
                      }}
                    />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '8px',
                    textAlign: 'center',
                  }}>
                    {user?.name || 'Employee Name'}
                  </h2>
                  <p style={{
                    color: '#b3e5fc',
                    fontSize: '16px',
                    marginBottom: '24px',
                    textAlign: 'center',
                  }}>
                    {user?.role || 'Role'} • {user?.department || 'Department'}
                  </p>
                  <button
                    onClick={() => {
                      setEditForm({
                        name: user?.name || '',
                        email: user?.email || '',
                        department: user?.department || '',
                        phone: user?.phone || '',
                        gender: user?.gender || '',
                        status: user?.status || ''
                      });
                      setEditMode(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(90deg, #ffb300 0%, #ff9800 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#181824',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                </div>

                {/* Right Column - Profile Information */}
                <div style={{
                  background: 'linear-gradient(135deg, #181824 0%, #232336 100%)',
                  borderRadius: '20px',
                  padding: '32px',
                }}>
                  <h3 style={{
                    fontSize: '22px',
                    color: '#ffb300',
                    marginBottom: '24px',
                    fontWeight: '600',
                  }}>Profile Information</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '24px',
                  }}>
                    <div>
                      <h4 style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Email Address</h4>
                      <p style={{ color: '#fff', fontSize: '16px' }}>{user?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Phone Number</h4>
                      <p style={{ color: '#fff', fontSize: '16px' }}>{user?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Department</h4>
                      <p style={{ color: '#fff', fontSize: '16px' }}>{user?.department || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Gender</h4>
                      <p style={{ color: '#fff', fontSize: '16px' }}>{user?.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Status</h4>
                      <p style={{ 
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        background: user?.status === 'Active' ? '#4caf50' : '#f44336',
                        color: '#fff',
                      }}>{user?.status || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Role</h4>
                      <p style={{ color: '#fff', fontSize: '16px' }}>{user?.role || 'N/A'}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <h4 style={{ color: '#b3e5fc', fontSize: '14px', marginBottom: '8px' }}>Joined Date</h4>
                      <p style={{ color: '#fff', fontSize: '16px' }}>
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

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
      {/* Left Sidebar - User List */}
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
          padding: '18px 18px 12px 18px',
          borderBottom: '1.5px solid #232336',
          background: 'transparent',
          fontWeight: 700,
          fontSize: 16,
          color: '#4fc3f7',
          letterSpacing: 1,
        }}>
          Chats
        </div>
        <div className="user-scroll" style={{
          flex: 1,
          overflowY: 'auto',
          padding: 0,
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
                cursor: 'pointer'
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
          fontSize: 14,
          color: '#4fc3f7',
        }}>
          {selectedUser ? (
            <>
              <img
                src={selectedUser.avatar ? `http://localhost:5000${selectedUser.avatar}` : `https://i.pravatar.cc/150?u=${selectedUser.id}`}
                alt="user"
                className="user-avatar-img"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #232336',
                }}
              />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {selectedUser.name}
              </span>
            </>
          ) : (
            <span style={{ color: '#fff' }}>Select a user to chat</span>
          )}
        </div>

        <div className="chat-body" id="chat-body"
        ref={chatBodyRef}
         style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 28px 18px 28px',
          background: '#232336',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#181824',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#35354a',
            borderRadius: '4px',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: '#35354a #181824',
        }}>
          {messages
  .filter(msg =>
    (msg.sender_id === user.id && msg.receiver_id === selectedUser?.id) ||
    (msg.receiver_id === user.id && msg.sender_id === selectedUser?.id) ||
    (msg.fromUserId === user.id && msg.toUserId === selectedUser?.id) ||
    (msg.toUserId === user.id && msg.fromUserId === selectedUser?.id)
  )
  .map((msg, i) => (

              <div
                key={i}
                className={
  msg.sender_id === user.id || msg.fromUserId === user.id
    ? 'chat-message sent'
    : 'chat-message received'
}

                style={{
                  alignSelf: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                  background: msg.sender_id === user.id ? '#4fc3f7' : '#232336',
                  color: msg.sender_id === user.id ? '#181824' : '#fff',
                  borderRadius: msg.sender_id === user.id ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '12px 20px',
                  maxWidth: '60%',
                  boxShadow: '0 2px 8px #1976d222',
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                {msg.message}
              </div>
            ))}
        </div>

        <form onSubmit={sendMessage} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 28px',
          borderTop: '1.5px solid #232336',
          background: '#232336',
          gap: 12
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
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button type="submit" style={{
            background: 'linear-gradient(90deg, #42a5f7 60%, #1976d2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            fontSize: 16,
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


      default:
        return null;
    }
  };

return (
  <div className={`employee-dashboard ${sidebarOpen ? 'sidebar-open' : ''} ${isDarkMode ? 'dark' : ''}`}>
   

    <button
      className="darkmode-toggle"
      onClick={() => setIsDarkMode(!isDarkMode)}
    >
      {isDarkMode ? '☀️' : '🌙'}
    </button>


    <button 
      onClick={toggleSidebar}
      style={{
        position: 'fixed',
        left: '20px',
        top: '20px',
        zIndex: 1201,
        background: '#232336',
        border: 'none',
        color: '#4fc3f7',
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease-in-out',
        boxShadow: '2px 0 8px rgba(0,0,0,0.2)'
      }}
    >
      {sidebarVisible ? '◀' : '▶'}
    </button>
    
    <aside
      className={`sidebar${sidebarOpen ? ' open' : ''}`}
      style={{
        width: sidebarOpen ? 265 : 0,
        minWidth: sidebarOpen ? 265 : 0,
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
        boxShadow: 'none',
        padding: 0,
        borderRadius: 0,
        zIndex: 1200,
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(.4,0,.2,1), min-width 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s, transform 0.3s ease-in-out',
        borderRight: 'none',
        transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      <div style={{ padding: '36px 0 24px 0', textAlign: 'center', borderBottom: '1px solid #232336', marginBottom: 0, position: 'relative' }}>
        <h2 className="logo" style={{ fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: 1, color: '#ffb300' }}>👷 Employee</h2>
      </div>
      <ul className="nav-links" style={{
        fontSize: 14,
        flex: 1,
        listStyle: 'none',
        margin: 0,
        padding: '28px 0 0 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <li onClick={() => setActiveTab('dashboard')} style={{ padding: '11px 22px', fontSize: 14, cursor: 'pointer', borderLeft: activeTab==='dashboard' ? '4px solid #ffb300' : '4px solid transparent', background: activeTab==='dashboard' ? '#232336' : 'none', fontWeight: activeTab==='dashboard' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 16px 16px 0' }}><Home size={16} style={{ marginRight: 10, verticalAlign: 'middle', color: activeTab==='dashboard' ? '#ffb300' : '#fff' }} /> <span>Dashboard</span></li>
        <li onClick={() => setActiveTab('tasks')} style={{ padding: '11px 22px', fontSize: 14, cursor: 'pointer', borderLeft: activeTab==='tasks' ? '4px solid #ffb300' : '4px solid transparent', background: activeTab==='tasks' ? '#232336' : 'none', fontWeight: activeTab==='tasks' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 16px 16px 0' }}><ClipboardList size={16} style={{ marginRight: 10, verticalAlign: 'middle', color: activeTab==='tasks' ? '#ffb300' : '#fff' }} /> <span>My Tasks</span></li>
        <li onClick={() => setActiveTab('attendance')} style={{ padding: '11px 22px', fontSize: 14, cursor: 'pointer', borderLeft: activeTab==='attendance' ? '4px solid #ffb300' : '4px solid transparent', background: activeTab==='attendance' ? '#232336' : 'none', fontWeight: activeTab==='attendance' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 16px 16px 0' }}><Calendar size={16} style={{ marginRight: 10, verticalAlign: 'middle', color: activeTab==='attendance' ? '#ffb300' : '#fff' }} /> <span>Attendance</span></li>
        <li onClick={() => setActiveTab('profile')} style={{ padding: '11px 22px', fontSize: 14, cursor: 'pointer', borderLeft: activeTab==='profile' ? '4px solid #ffb300' : '4px solid transparent', background: activeTab==='profile' ? '#232336' : 'none', fontWeight: activeTab==='profile' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 16px 16px 0' }}><User size={16} style={{ marginRight: 10, verticalAlign: 'middle', color: activeTab==='profile' ? '#ffb300' : '#fff' }} /> <span>Profile</span></li>
        <li onClick={() => setActiveTab('messages')} style={{ padding: '11px 22px', fontSize: 14, cursor: 'pointer', borderLeft: activeTab==='messages' ? '4px solid #ffb300' : '4px solid transparent', background: activeTab==='messages' ? '#232336' : 'none', fontWeight: activeTab==='messages' ? 800 : 500, color: '#fff', transition: 'background 0.2s', marginBottom: 8, borderRadius: '0 16px 16px 0' }}><MessageCircle size={16} style={{ marginRight: 10, verticalAlign: 'middle', color: activeTab==='messages' ? '#ffb300' : '#fff' }} /> <span>Messages</span></li>
      </ul>
      <div style={{ padding: '0 0 38px 0', borderTop: '1px solid #232336', textAlign: 'center', background: 'transparent', marginTop: 'auto' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '60%',
            background: '#232336',
            color: '#fff',
            border: '1.5px solid #35354a',
            borderRadius: 8,
            padding: '10px 0',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #0002',
            margin: '24px auto 0 auto',
            display: 'block',
            transition: 'all 0.2s ease',
          }}
        >
          <LogOut size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: '#4fc3f7' }} /> Logout
        </button>
      </div>
    </aside>

    <main
  className={`main-area${sidebarOpen ? ' shifted' : ' full'}`}
  style={{
    fontSize: 18,
    background: '#232336',
    color: '#fff',
    minHeight: '100vh',
    marginLeft: sidebarVisible ? 265 : 0,
    transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
    width: sidebarVisible ? 'calc(100% - 265px)' : '100%',
    borderRadius: 0,
    boxShadow: 'none',
    position: 'relative',
    left: 0,
    padding: 0,
    borderLeft: '1px solid #232336',
  }}
>

      <header className="dashboard-header" style={{ 
        fontSize: 16, 
        padding: '16px 32px', 
        background: '#181824', 
        color: '#fff', 
        borderBottom: '1px solid #232336',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <div className="header-right">
          <div className="user-info" style={{ 
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'rgba(35, 35, 54, 0.6)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid #35354a'
          }}>
            <span className="username" style={{ 
              fontSize: 15, 
              fontWeight: 600,
              color: '#b3e5fc',
              letterSpacing: '0.3px'
            }}>Welcome back, {user?.name || 'Employee'}</span>
            <img 
              src={user?.avatar
                ? `http://localhost:5000${user.avatar}`
                : 'https://i.pravatar.cc/100?u=' + encodeURIComponent(user?.email || 'employee')
              }
              alt="Employee" 
              className="avatar" 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '2px solid #ffb300',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      </header>

      <section className="main-content" style={{ fontSize: 14, background: '#232336', color: '#fff' }}>{renderContent()}</section>
    </main>
  </div>
);

};

export default EmployeeDashboard;
