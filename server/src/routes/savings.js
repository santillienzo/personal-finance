import express from 'express';
import db from '../database.js';

const router = express.Router();

// ============== ACCOUNTS ==============

// Get all savings accounts
router.get('/accounts', (req, res) => {
  db.all(
    `SELECT * FROM savings_accounts WHERE is_active = 1 ORDER BY name ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching savings accounts:', err);
        return res.status(500).json({ error: 'Failed to fetch savings accounts' });
      }
      res.json(rows || []);
    }
  );
});

// Create a new savings account
router.post('/accounts', (req, res) => {
  const { name, type, currency, icon, color } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  db.run(
    `INSERT INTO savings_accounts (name, type, currency, icon, color) VALUES (?, ?, ?, ?, ?)`,
    [name, type, currency || 'USD', icon || 'wallet', color || '#6366f1'],
    function(err) {
      if (err) {
        console.error('Error creating savings account:', err);
        return res.status(500).json({ error: 'Failed to create savings account' });
      }
      res.status(201).json({ id: this.lastID, message: 'Account created successfully' });
    }
  );
});

// Update a savings account
router.patch('/accounts/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, currency, icon, color } = req.body;

  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (type !== undefined) { updates.push('type = ?'); values.push(type); }
  if (currency !== undefined) { updates.push('currency = ?'); values.push(currency); }
  if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
  if (color !== undefined) { updates.push('color = ?'); values.push(color); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  db.run(
    `UPDATE savings_accounts SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        console.error('Error updating savings account:', err);
        return res.status(500).json({ error: 'Failed to update savings account' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json({ message: 'Account updated successfully' });
    }
  );
});

// Delete (deactivate) a savings account
router.delete('/accounts/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE savings_accounts SET is_active = 0 WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        console.error('Error deleting savings account:', err);
        return res.status(500).json({ error: 'Failed to delete savings account' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json({ message: 'Account deleted successfully' });
    }
  );
});

// ============== MOVEMENTS ==============

// Get movements for an account (or all if no account specified)
router.get('/movements', (req, res) => {
  const { account_id, limit } = req.query;

  let query = `
    SELECT m.*, a.name as account_name, a.color as account_color
    FROM savings_movements m
    JOIN savings_accounts a ON m.account_id = a.id
  `;
  const params = [];

  if (account_id) {
    query += ` WHERE m.account_id = ?`;
    params.push(account_id);
  }

  query += ` ORDER BY m.date DESC, m.created_at DESC`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(parseInt(limit));
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching savings movements:', err);
      return res.status(500).json({ error: 'Failed to fetch movements' });
    }
    res.json(rows || []);
  });
});

// Add a movement (deposit or withdrawal) - also creates a transaction
router.post('/movements', (req, res) => {
  const { account_id, type, amount, currency, exchange_rate, description, date } = req.body;

  if (!account_id || !type || !amount || !date) {
    return res.status(400).json({ error: 'account_id, type, amount, and date are required' });
  }

  if (!['DEPOSIT', 'WITHDRAWAL'].includes(type)) {
    return res.status(400).json({ error: 'Type must be DEPOSIT or WITHDRAWAL' });
  }

  // First get the account name for the transaction description
  db.get('SELECT name FROM savings_accounts WHERE id = ?', [account_id], (err, account) => {
    if (err || !account) {
      console.error('Error fetching account:', err);
      return res.status(404).json({ error: 'Account not found' });
    }

    const accountName = account.name;
    const transactionType = type === 'DEPOSIT' ? 'SAVING_DEPOSIT' : 'SAVING_WITHDRAWAL';
    const transactionDesc = description || (type === 'DEPOSIT' ? `Ahorro → ${accountName}` : `Retiro ← ${accountName}`);

    // Create the transaction first
    db.run(
      `INSERT INTO transactions (type, amount, currency, exchange_rate, category, description, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [transactionType, amount, currency || 'USD', exchange_rate || 0, 'Ahorro', transactionDesc, date, Date.now()],
      function(txErr) {
        if (txErr) {
          console.error('Error creating transaction:', txErr);
          return res.status(500).json({ error: 'Failed to create transaction' });
        }

        const transactionId = this.lastID;

        // Then create the savings movement
        db.run(
          `INSERT INTO savings_movements (account_id, type, amount, currency, exchange_rate, description, date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [account_id, type, amount, currency || 'USD', exchange_rate || 0, description || '', date],
          function(movErr) {
            if (movErr) {
              console.error('Error creating savings movement:', movErr);
              // Rollback: delete the transaction we just created
              db.run('DELETE FROM transactions WHERE id = ?', [transactionId]);
              return res.status(500).json({ error: 'Failed to create movement' });
            }
            res.status(201).json({ 
              id: this.lastID, 
              transaction_id: transactionId,
              message: 'Movement and transaction created successfully' 
            });
          }
        );
      }
    );
  });
});

// Delete a movement
router.delete('/movements/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM savings_movements WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting movement:', err);
      return res.status(500).json({ error: 'Failed to delete movement' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Movement not found' });
    }
    res.json({ message: 'Movement deleted successfully' });
  });
});

// ============== PORTFOLIO SUMMARY ==============

// Get portfolio summary (balances per account + total)
router.get('/portfolio', (req, res) => {
  // Get all active accounts with their balance
  const query = `
    SELECT 
      a.id,
      a.name,
      a.type,
      a.currency,
      a.icon,
      a.color,
      COALESCE(SUM(CASE WHEN m.type = 'DEPOSIT' THEN m.amount ELSE -m.amount END), 0) as balance
    FROM savings_accounts a
    LEFT JOIN savings_movements m ON a.id = m.account_id
    WHERE a.is_active = 1
    GROUP BY a.id
    ORDER BY a.name ASC
  `;

  db.all(query, [], (err, accounts) => {
    if (err) {
      console.error('Error fetching portfolio:', err);
      return res.status(500).json({ error: 'Failed to fetch portfolio' });
    }

    // Calculate totals (assuming all accounts are in USD for simplicity)
    let totalUSD = 0;
    (accounts || []).forEach(acc => {
      if (acc.currency === 'USD') {
        totalUSD += acc.balance;
      }
      // For ARS accounts, we'd need current rate - but savings are typically in USD
    });

    res.json({
      accounts: accounts || [],
      totalUSD
    });
  });
});

// Get available balance (income - expenses from transactions, not yet allocated to savings)
router.get('/available', (req, res) => {
  // Calculate total income - total expenses from all transactions
  // This represents money that could be allocated to savings
  const query = `
    SELECT 
      type,
      SUM(CASE 
        WHEN currency = 'USD' THEN amount 
        WHEN exchange_rate > 0 THEN amount / exchange_rate 
        ELSE 0 
      END) as total_usd
    FROM transactions
    GROUP BY type
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error calculating available balance:', err);
      return res.status(500).json({ error: 'Failed to calculate available balance' });
    }

    let income = 0;
    let expenses = 0;

    (rows || []).forEach(row => {
      if (row.type === 'INCOME') {
        income = row.total_usd;
      } else {
        expenses += row.total_usd;
      }
    });

    // Get total already allocated to savings
    db.get(
      `SELECT COALESCE(SUM(CASE 
        WHEN type = 'DEPOSIT' AND currency = 'USD' THEN amount
        WHEN type = 'DEPOSIT' AND exchange_rate > 0 THEN amount / exchange_rate
        WHEN type = 'WITHDRAWAL' AND currency = 'USD' THEN -amount
        WHEN type = 'WITHDRAWAL' AND exchange_rate > 0 THEN -amount / exchange_rate
        ELSE 0
      END), 0) as allocated
      FROM savings_movements`,
      [],
      (err2, result) => {
        if (err2) {
          console.error('Error calculating allocated:', err2);
          return res.status(500).json({ error: 'Failed to calculate allocated' });
        }

        const allocated = result?.allocated || 0;
        const netBalance = income - expenses;
        const available = netBalance - allocated;

        res.json({
          income,
          expenses,
          netBalance,
          allocated,
          available
        });
      }
    );
  });
});

export default router;
