import express from 'express';
import db from '../database.js';

const router = express.Router();

router.post('/', (req, res) => {
  const { description, card_name, amount_per_installment, total_installments, installments_paid, start_date, is_active } = req.body;
  
  if (!description || !card_name || !amount_per_installment || !total_installments || installments_paid === undefined || !start_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO installments (description, card_name, amount_per_installment, total_installments, installments_paid, start_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    description,
    card_name,
    amount_per_installment,
    total_installments,
    installments_paid,
    start_date,
    is_active !== undefined ? is_active : 1
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

export default router;
