const db = require('../config/db');

// Save message to DB and return the inserted message
const saveMessage = async ({ fromUserId, toUserId, message }) => {
  console.log("💾 Saving to DB:", { fromUserId, toUserId, message });

  const sql = `
    INSERT INTO messages (from_user_id, to_user_id, message, timestamp)
    VALUES (?, ?, ?, NOW())
  `;

  const [result] = await db.query(sql, [fromUserId, toUserId, message]);

  // Fetch the newly inserted message
  const [rows] = await db.query(`SELECT * FROM messages WHERE id = ?`, [result.insertId]);
  return rows[0]; // return inserted message
};

// Get chat history between 2 users
const getConversation = async (fromUserId, toUserId) => {
  const sql = `
    SELECT * FROM messages 
    WHERE (from_user_id = ? AND to_user_id = ?) 
       OR (from_user_id = ? AND to_user_id = ?)
    ORDER BY timestamp ASC
  `;
  const [rows] = await db.query(sql, [fromUserId, toUserId, toUserId, fromUserId]);
  return rows;
};

module.exports = {
  saveMessage,
  getConversation
};
