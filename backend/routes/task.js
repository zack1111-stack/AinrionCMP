const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 🔹 GET tasks - support created_by or assigned_to
router.get('/', async (req, res) => {
  try {
    const { created_by, assigned_to } = req.query;

    let query = `
      SELECT t.*, u.name AS assigned_to_name, m.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users m ON t.created_by = m.id
    `;
    const params = [];

    if (created_by) {
      query += ' WHERE t.created_by = ?';
      params.push(created_by);
    } else if (assigned_to) {
      query += ' WHERE t.assigned_to = ?';
      params.push(assigned_to);
    }

    const [tasks] = await db.query(query, params);
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 POST create a new task
// 🔹 POST create a new task
router.post('/', async (req, res) => {
  let { title, description, assigned_to, due_date, priority, created_by } = req.body;

  if (!title || !assigned_to || !created_by) {
    return res.status(400).json({ error: 'Title, assigned_to and created_by are required' });
  }

  // ✅ Format due_date to MySQL-compatible format if provided
  if (due_date) {
    try {
      const parsedDate = new Date(due_date);
      due_date = parsedDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    } catch (e) {
      console.warn("⚠️ Invalid due_date format, setting to NULL");
      due_date = null;
    }
  }

  try {
    await db.query(
      `INSERT INTO tasks (title, description, assigned_to, due_date, priority, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || '', assigned_to, due_date || null, priority || 'Medium', created_by]
    );
    res.status(201).json({ message: 'Task created successfully' });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 PUT update a task
router.put('/:id', async (req, res) => {
  const { title, description, assigned_to } = req.body;
  const { id } = req.params;

  try {
    await db.query(
      'UPDATE tasks SET title = ?, description = ?, assigned_to = ? WHERE id = ?',
      [title, description, assigned_to, id]
    );
    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 DELETE task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
