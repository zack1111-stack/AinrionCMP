const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/team');
const taskRoutes = require('./routes/task');
const attendanceRoutes = require('./routes/attendance');
const analyticsRoutes = require('./routes/analytics');
const leaveRequestRoutes = require('./routes/leaveRequests');
const messageRoutes = require('./routes/messageRoutes');
const { saveMessage } = require('./models/messageModel');



dotenv.config();

const app = express();
const server = http.createServer(app);

// 🟡 Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Use your frontend origin in production
    methods: ['GET', 'POST']
  }
});

// ✅ Socket.IO connection logic with room-based messaging
io.on('connection', (socket) => {
  console.log('🟢 A user connected:', socket.id);

  // ✅ Join a room with user ID
  socket.on('join', (userId) => {
    if (!userId) {
      console.warn('⚠️ Tried to join without a userId');
      return;
    }
    socket.join(userId.toString()); // join room using userId
    console.log(`👤 User ${userId} joined room ${userId}`);
  });

  // 📤 Handle sending private messages
// 📤 Handle sending private messages
socket.on('private_message', async (msg) => {
  const {
    fromUserId,
    toUserId,
    from_user_id,
    to_user_id,
    message,
    timestamp,
  } = msg;

  const senderId = fromUserId || from_user_id;
  const receiverId = toUserId || to_user_id;

  if (!senderId || !receiverId || !message) {
    console.error('❌ Missing sender or receiver ID in private_message:', msg);
    return;
  }

  const fullMessage = {
    fromUserId: senderId,
    toUserId: receiverId,
    message,
    timestamp: timestamp || new Date().toISOString(),
  };

  console.log('📨 Server received private_message:', fullMessage);

  // ✅ Save message to database
  try {
    const saved = await saveMessage({ fromUserId: senderId, toUserId: receiverId, message });
    console.log('✅ Message saved to DB:', saved);
  } catch (err) {
    console.error('❌ Error saving message to DB:', err);
  }

  // Emit to receiver and sender
 io.to(receiverId.toString()).emit('private_message', fullMessage);

  console.log(`📤 Emitted message to: [${senderId}] and [${receiverId}]`);
});



  // 🔴 Handle disconnects
  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

// 🟢 Middleware
app.use(cors());
app.use(express.json());

// 🟢 Serve uploaded avatar files
app.use('/uploads', express.static('uploads'));

// 🟢 API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/messages', messageRoutes);


// 🟢 Root route
app.get('/', (req, res) => {
  res.send('🚀 Company Management API is running');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
