# FinanceFlow Server

Node.js server with Express and SQLite for managing personal finance data.

## Installation

```bash
npm install
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### Transactions

- `POST /api/transactions` - Create a new transaction
- `GET /api/transactions?year=2024&month=01&category=Alimentos` - Get transactions (filtered)
- `DELETE /api/transactions/:id` - Delete a transaction
- `GET /api/transactions/summary?year=2024&month=01` - Get monthly summary
- `GET /api/transactions/expenses-by-category?year=2024&month=01` - Get expenses by category

### Installments

- `POST /api/installments` - Create a new installment
- `GET /api/installments?activeOnly=true` - Get installments
- `PATCH /api/installments/:id/paid` - Update installments paid count
- `PATCH /api/installments/:id/toggle` - Toggle installment active status
- `DELETE /api/installments/:id` - Delete an installment

### Health Check

- `GET /api/health` - Check server status

## Database

SQLite database file: `financeflow.db`

The database is automatically created with the required schema on first run.
