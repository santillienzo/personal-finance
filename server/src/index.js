import express from 'express';
import cors from 'cors';
import transactionsRouter from './routes/transactions.js';
import installmentsRouter from './routes/installments.js';
import fixedExpensesRouter from './routes/fixed-expenses.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/transactions', transactionsRouter);
app.use('/api/installments', installmentsRouter);
app.use('/api/fixed-expenses', fixedExpensesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FinanceFlow API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 FinanceFlow server running on http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite (financeflow.db)`);
});
