import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get fixed expenses for a specific month (transactions of type FIXED_EXPENSE)
router.get('/month/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const monthStr = String(month).padStart(2, '0');
  const datePattern = `${year}-${monthStr}-%`;

  db.all(
    `SELECT * FROM transactions WHERE type = 'FIXED_EXPENSE' AND date LIKE ? ORDER BY description ASC`,
    [datePattern],
    (err, rows) => {
      if (err) {
        console.error('Error fetching fixed expenses:', err);
        return res.status(500).json({ error: 'Failed to fetch fixed expenses' });
      }
      res.json(rows || []);
    }
  );
});

// Update a FIXED_EXPENSE transaction (edit amount, description, etc)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { description, amount, currency, category, exchange_rate } = req.body;

  const updates = [];
  const values = [];

  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (amount !== undefined) {
    updates.push('amount = ?');
    values.push(amount);
  }
  if (currency !== undefined) {
    updates.push('currency = ?');
    values.push(currency);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    values.push(category);
  }
  if (exchange_rate !== undefined) {
    updates.push('exchange_rate = ?');
    values.push(exchange_rate);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND type = 'FIXED_EXPENSE'`;

  db.run(query, values, function(err) {
    if (err) {
      console.error('Error updating fixed expense:', err);
      return res.status(500).json({ error: 'Failed to update fixed expense' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Fixed expense not found' });
    }
    res.json({ message: 'Fixed expense updated successfully' });
  });
});

// Replicate fixed expenses from previous month to target month
router.post('/replicate', (req, res) => {
  const { year, month, exchange_rate } = req.body;

  if (!year || !month) {
    return res.status(400).json({ error: 'Missing required fields: year, month' });
  }

  // Calculate previous month
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  const prevMonthStr = String(prevMonth).padStart(2, '0');
  const prevDatePattern = `${prevYear}-${prevMonthStr}-%`;

  // Get FIXED_EXPENSE transactions from previous month
  db.all(
    `SELECT * FROM transactions WHERE type = 'FIXED_EXPENSE' AND date LIKE ? ORDER BY description ASC`,
    [prevDatePattern],
    (err, prevTransactions) => {
      if (err) {
        console.error('Error fetching previous month transactions:', err);
        return res.status(500).json({ error: 'Failed to fetch previous month transactions' });
      }

      if (!prevTransactions || prevTransactions.length === 0) {
        return res.status(400).json({ error: 'No hay gastos fijos en el mes anterior para replicar' });
      }

      // Check which transactions already exist in target month
      const targetMonthStr = String(month).padStart(2, '0');
      const targetDatePattern = `${year}-${targetMonthStr}-%`;

      db.all(
        `SELECT description FROM transactions WHERE type = 'FIXED_EXPENSE' AND date LIKE ?`,
        [targetDatePattern],
        (checkErr, existing) => {
          if (checkErr) {
            console.error('Error checking existing transactions:', checkErr);
            return res.status(500).json({ error: 'Failed to check existing transactions' });
          }

          const existingDescriptions = new Set(existing?.map(e => e.description) || []);
          const toCreate = prevTransactions.filter(t => !existingDescriptions.has(t.description));

          if (toCreate.length === 0) {
            return res.status(400).json({ error: 'Todos los gastos fijos ya existen en este mes' });
          }

          // Create transactions for target month
          const targetDate = `${year}-${targetMonthStr}-01`;
          let created = 0;
          let errors = 0;

          const createTransaction = (index) => {
            if (index >= toCreate.length) {
              if (errors > 0) {
                return res.status(500).json({ error: `Se crearon ${created} transacciones, pero ${errors} fallaron` });
              }
              return res.json({ message: `Se crearon ${created} gastos fijos`, count: created });
            }

            const tx = toCreate[index];
            const rate = tx.currency === 'USD' ? 1 : (exchange_rate || tx.exchange_rate || 0);

            db.run(
              `INSERT INTO transactions (type, amount, currency, exchange_rate, category, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              ['FIXED_EXPENSE', tx.amount, tx.currency, rate, tx.category, tx.description, targetDate, Date.now()],
              function(txErr) {
                if (txErr) {
                  console.error('Error creating transaction:', txErr);
                  errors++;
                } else {
                  created++;
                }
                createTransaction(index + 1);
              }
            );
          };

          createTransaction(0);
        }
      );
    }
  );
});

export default router;
