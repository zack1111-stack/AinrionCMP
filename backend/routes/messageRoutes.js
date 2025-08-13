const express = require('express');
const router = express.Router();
const { saveMessage, getConversation } = require('../models/messageModel');

// ✅ GET chat history between two users
router.get('/:fromUserId/:toUserId', async (req, res) => {
  const { fromUserId, toUserId } = req.params;
  try {
    const messages = await getConversation(fromUserId, toUserId);
    res.status(200).json(messages);
  } catch (err) {
    console.error('❌ Error getting messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ✅ POST new chat message
router.post('/send', async (req, res) => {
  const { fromUserId, toUserId, message } = req.body;

  if (!fromUserId || !toUserId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const saved = await saveMessage({ fromUserId, toUserId, message });
    console.log("✅ Message saved to DB:", saved);
    res.status(200).json(saved); // Return inserted message with timestamp/id
  } catch (err) {
    console.error('❌ Error saving message:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

module.exports = router;
