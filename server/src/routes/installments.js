import express from 'express';
import db from '../database.js';

const router = express.Router();

router.post('/', (req, res) => {
  const { description, card_name, amount_per_installment, total_installments, installments_paid, start_date, is_active, currency } = req.body;
  
  if (!description || !card_name || !amount_per_installment || !total_installments || installments_paid === undefined || !start_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO installments (description, card_name, amount_per_installment, total_installments, installments_paid, start_date, is_active, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    description,
    card_name,
    amount_per_installment,
    total_installments,
    installments_paid,
    start_date,
    is_active !== undefined ? is_active : 1,
    currency || 'ARS'
  ], function(err) {
    if (err) {
      console.error('Error creating installment:', err);
      return res.status(500).json({ error: 'Failed to create installment' });
    }
    res.status(201).json({ id: this.lastID, message: 'Installment created successfully' });
  });
});

router.get('/', (req, res) => {
  const { activeOnly } = req.query;
  
  let query = 'SELECT * FROM installments';
  if (activeOnly === 'true') {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY start_date DESC';

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching installments:', err);
      return res.status(500).json({ error: 'Failed to fetch installments' });
    }
    res.json(rows || []);
  });
});

router.patch('/:id/paid', (req, res) => {
  const { id } = req.params;
  const { installments_paid } = req.body;

  if (installments_paid === undefined) {
    return res.status(400).json({ error: 'installments_paid is required' });
  }

  db.get('SELECT * FROM installments WHERE id = ?', [id], (err, installment) => {
    if (err) {
      console.error('Error fetching installment:', err);
      return res.status(500).json({ error: 'Failed to update installment' });
    }

    if (!installment) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    let isActive = installment.is_active;
    if (installments_paid >= installment.total_installments) {
      isActive = 0;
    }

    db.run('UPDATE installments SET installments_paid = ?, is_active = ? WHERE id = ?', 
      [installments_paid, isActive, id], 
      (err) => {
        if (err) {
          console.error('Error updating installment:', err);
          return res.status(500).json({ error: 'Failed to update installment' });
        }
        res.json({ message: 'Installment updated successfully' });
      }
    );
  });
});

router.patch('/:id/toggle', (req, res) => {
  const { id } = req.params;

  db.get('SELECT is_active FROM installments WHERE id = ?', [id], (err, installment) => {
    if (err) {
      console.error('Error fetching installment:', err);
      return res.status(500).json({ error: 'Failed to toggle installment' });
    }

    if (!installment) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    const newStatus = installment.is_active === 1 ? 0 : 1;
    
    db.run('UPDATE installments SET is_active = ? WHERE id = ?', [newStatus, id], (err) => {
      if (err) {
        console.error('Error updating installment:', err);
        return res.status(500).json({ error: 'Failed to toggle installment' });
      }
      res.json({ message: 'Installment status toggled successfully' });
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM installments WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting installment:', err);
      return res.status(500).json({ error: 'Failed to delete installment' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    res.json({ message: 'Installment deleted successfully' });
  });
});

// Mark installment as paid - creates a transaction and updates paid count
router.post('/:id/mark-paid', (req, res) => {
  const { id } = req.params;
  const { exchange_rate, payment_date, installment_number } = req.body;

  if (exchange_rate === undefined) {
    return res.status(400).json({ error: 'exchange_rate is required' });
  }

  db.get('SELECT * FROM installments WHERE id = ?', [id], (err, installment) => {
    if (err) {
      console.error('Error fetching installment:', err);
      return res.status(500).json({ error: 'Failed to mark installment as paid' });
    }

    if (!installment) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    // Use provided installment_number or calculate next one
    const paymentNumber = installment_number || (installment.installments_paid + 1);
    
    if (paymentNumber > installment.total_installments || paymentNumber < 1) {
      return res.status(400).json({ error: 'Invalid installment number' });
    }

    // Check if this installment number was already paid
    db.get('SELECT id FROM installment_payments WHERE installment_id = ? AND installment_number = ?', 
      [id, paymentNumber], (checkErr, existingPayment) => {
      if (checkErr) {
        console.error('Error checking existing payment:', checkErr);
        return res.status(500).json({ error: 'Failed to check existing payment' });
      }

      if (existingPayment) {
        return res.status(400).json({ error: `Installment #${paymentNumber} already paid` });
      }

      const paymentDateFinal = payment_date || new Date().toISOString().split('T')[0];
      
      // For USD installments, exchange_rate should be 1
      const finalRate = installment.currency === 'USD' ? 1 : exchange_rate;

      // Create transaction for this payment
      const txQuery = `
        INSERT INTO transactions (type, amount, currency, exchange_rate, category, description, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(txQuery, [
        'INSTALLMENT',
        installment.amount_per_installment,
        installment.currency,
        finalRate,
        'Cuotas',
        `${installment.description} (${paymentNumber}/${installment.total_installments})`,
        paymentDateFinal,
        Date.now()
      ], function(txErr) {
        if (txErr) {
          console.error('Error creating transaction:', txErr);
          return res.status(500).json({ error: 'Failed to create payment transaction' });
        }

        const transactionId = this.lastID;

        // Create installment_payment record
        db.run(`INSERT INTO installment_payments (installment_id, transaction_id, installment_number, payment_date) VALUES (?, ?, ?, ?)`,
          [id, transactionId, paymentNumber, paymentDateFinal],
          function(paymentErr) {
            if (paymentErr) {
              console.error('Error creating installment payment record:', paymentErr);
              return res.status(500).json({ error: 'Failed to create payment record' });
            }

            // Count total payments for this installment
            db.get('SELECT COUNT(*) as count FROM installment_payments WHERE installment_id = ?', [id], (countErr, countResult) => {
              if (countErr) {
                console.error('Error counting payments:', countErr);
                return res.status(500).json({ error: 'Failed to count payments' });
              }

              const newPaidCount = countResult.count;
              const isActive = newPaidCount >= installment.total_installments ? 0 : 1;

              // Update installment paid count
              db.run('UPDATE installments SET installments_paid = ?, is_active = ? WHERE id = ?',
                [newPaidCount, isActive, id],
                (updateErr) => {
                  if (updateErr) {
                    console.error('Error updating installment:', updateErr);
                    return res.status(500).json({ error: 'Failed to update installment' });
                  }
                  res.json({ 
                    message: 'Installment marked as paid', 
                    transaction_id: transactionId,
                    payment_number: paymentNumber,
                    new_paid_count: newPaidCount,
                    is_complete: isActive === 0
                  });
                }
              );
            });
          }
        );
      });
    });
  });
});

// Get payments for a specific installment
router.get('/:id/payments', (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT ip.*, t.amount, t.currency, t.exchange_rate 
    FROM installment_payments ip
    JOIN transactions t ON ip.transaction_id = t.id
    WHERE ip.installment_id = ?
    ORDER BY ip.installment_number ASC
  `, [id], (err, rows) => {
    if (err) {
      console.error('Error fetching installment payments:', err);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
    res.json(rows || []);
  });
});

export default router;
