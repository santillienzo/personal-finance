import express from 'express';
import db from '../database.js';

const router = express.Router();

router.post('/', (req, res) => {
  const { type, amount, currency, exchange_rate, category, description, date } = req.body;
  
  if (!type || !amount || !date) {
    return res.status(400).json({ error: 'Missing required fields: type, amount, date' });
  }

  const query = `
    INSERT INTO transactions (type, amount, currency, exchange_rate, category, description, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    type,
    amount,
    currency || 'ARS',
    exchange_rate || 0,
    category || 'Otros',
    description,
    date,
    Date.now()
  ], function(err) {
    if (err) {
      console.error('Error creating transaction:', err);
      return res.status(500).json({ error: 'Failed to create transaction' });
    }
    res.status(201).json({ id: this.lastID, message: 'Transaction created successfully' });
  });
});

router.get('/', (req, res) => {
  const { year, month, category } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  let query = `SELECT * FROM transactions WHERE strftime('%Y', date) = ?`;
  const params = [year];

  if (month && month !== 'all') {
    query += ` AND strftime('%m', date) = ?`;
    params.push(month);
  }

  if (category && category !== 'all') {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY date DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching transactions:', err);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
    res.json(rows || []);
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting transaction:', err);
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  });
});

router.get('/summary', (req, res) => {
  const { year, month } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  let query = `SELECT type, SUM(amount) as total FROM transactions WHERE strftime('%Y', date) = ?`;
  const params = [year];

  if (month && month !== 'all') {
    query += ` AND strftime('%m', date) = ?`;
    params.push(month);
  }

  query += ` GROUP BY type`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching summary:', err);
      return res.status(500).json({ error: 'Failed to fetch summary' });
    }

    const summary = {};
    (rows || []).forEach(row => {
      summary[row.type] = row.total;
    });

    res.json(summary);
  });
});

router.get('/expenses-by-category', (req, res) => {
  const { year, month } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  let query = `
    SELECT category, SUM(amount) as total 
    FROM transactions 
    WHERE type != 'INCOME' 
    AND strftime('%Y', date) = ?
  `;
  const params = [year];

  if (month && month !== 'all') {
    query += ` AND strftime('%m', date) = ?`;
    params.push(month);
  }

  query += ` GROUP BY category ORDER BY total DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching expenses by category:', err);
      return res.status(500).json({ error: 'Failed to fetch expenses by category' });
    }
    res.json(rows || []);
  });
});

// Get summary normalized to USD
router.get('/summary-usd', (req, res) => {
  const { year, month } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  let query = `SELECT type, amount, currency, exchange_rate FROM transactions WHERE strftime('%Y', date) = ?`;
  const params = [year];

  if (month && month !== 'all') {
    query += ` AND strftime('%m', date) = ?`;
    params.push(month);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching summary:', err);
      return res.status(500).json({ error: 'Failed to fetch summary' });
    }

    const summary = {};
    (rows || []).forEach(row => {
      // Convert to USD
      let amountUSD = row.amount;
      if (row.currency === 'ARS' && row.exchange_rate > 0) {
        amountUSD = row.amount / row.exchange_rate;
      }
      // If USD, amount is already in USD
      
      if (!summary[row.type]) {
        summary[row.type] = 0;
      }
      summary[row.type] += amountUSD;
    });

    res.json(summary);
  });
});

// Get expenses by category normalized to USD
router.get('/expenses-by-category-usd', (req, res) => {
  const { year, month } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  let query = `
    SELECT category, amount, currency, exchange_rate 
    FROM transactions 
    WHERE type != 'INCOME' 
    AND strftime('%Y', date) = ?
  `;
  const params = [year];

  if (month && month !== 'all') {
    query += ` AND strftime('%m', date) = ?`;
    params.push(month);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching expenses by category:', err);
      return res.status(500).json({ error: 'Failed to fetch expenses by category' });
    }

    const categoryTotals = {};
    (rows || []).forEach(row => {
      // Convert to USD
      let amountUSD = row.amount;
      if (row.currency === 'ARS' && row.exchange_rate > 0) {
        amountUSD = row.amount / row.exchange_rate;
      }
      
      if (!categoryTotals[row.category]) {
        categoryTotals[row.category] = 0;
      }
      categoryTotals[row.category] += amountUSD;
    });

    // Convert to array and sort
    const results = Object.entries(categoryTotals)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    res.json(results);
  });
});

export default router;
