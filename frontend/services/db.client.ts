import { Transaction, Installment, TransactionType, SqlJsDatabase } from '../types';

const DB_NAME = 'finanzaflow_db_v1';

class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private SQL: any;
  private isReady: boolean = false;

  constructor() {}

  async init() {
    if (this.isReady) return;

    try {
      this.SQL = await window.initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
      });

      const savedDb = localStorage.getItem(DB_NAME);
      if (savedDb) {
        const uInt8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new this.SQL.Database(uInt8Array);
        this.migrate(); // Check for schema updates on existing DB
      } else {
        this.db = new this.SQL.Database();
        this.createTables();
      }
      
      this.isReady = true;
    } catch (err) {
      console.error("Failed to initialize SQLite:", err);
      throw err;
    }
  }

  private save() {
    if (!this.db) return;
    const data = this.db.export();
    const arr = Array.from(data);
    localStorage.setItem(DB_NAME, JSON.stringify(arr));
  }

  private createTables() {
    if (!this.db) return;
    
    const sql = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'ARS',
        exchange_rate REAL DEFAULT 0,
        category TEXT,
        description TEXT,
        date TEXT NOT NULL,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        card_name TEXT NOT NULL,
        amount_per_installment REAL NOT NULL,
        total_installments INTEGER NOT NULL,
        installments_paid INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );
    `;
    this.db.run(sql);
    this.save();
  }

  // Simple migration to add columns if they don't exist in saved DB
  private migrate() {
    if (!this.db) return;
    try {
        // Try to add columns. If they exist, SQLite throws an error which we catch and ignore.
        // This is a "lazy" migration strategy suitable for this simple client-side app.
        try { this.db.run("ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'ARS'"); } catch (e) {}
        try { this.db.run("ALTER TABLE transactions ADD COLUMN exchange_rate REAL DEFAULT 0"); } catch (e) {}
        this.save();
    } catch (e) {
        console.error("Migration error (might be already migrated):", e);
    }
  }

  // --- Transactions ---

  addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>) {
    if (!this.db) throw new Error("DB not initialized");
    const stmt = this.db.prepare(`
      INSERT INTO transactions (type, amount, currency, exchange_rate, category, description, date, created_at)
      VALUES (:type, :amount, :currency, :rate, :category, :description, :date, :created_at)
    `);
    
    stmt.run({
      ':type': tx.type,
      ':amount': tx.amount,
      ':currency': tx.currency || 'ARS',
      ':rate': tx.exchange_rate || 0,
      ':category': tx.category || 'Otros',
      ':description': tx.description,
      ':date': tx.date,
      ':created_at': Date.now()
    });
    stmt.free();
    this.save();
  }

  getTransactions(year: number, month?: string, category?: string): Transaction[] {
    if (!this.db) return [];
    
    let query = `SELECT * FROM transactions WHERE strftime('%Y', date) = :year`;
    const params: any = { ':year': String(year) };

    if (month && month !== 'all') {
        query += ` AND strftime('%m', date) = :month`;
        params[':month'] = month;
    }

    if (category && category !== 'all') {
        query += ` AND category = :category`;
        params[':category'] = category;
    }

    query += ` ORDER BY date DESC`;

    const stmt = this.db.prepare(query);
    stmt.bind(params);
    
    const results: Transaction[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as Transaction);
    }
    stmt.free();
    return results;
  }

  deleteTransaction(id: number) {
    if(!this.db) return;
    this.db.run("DELETE FROM transactions WHERE id = ?", [id]);
    this.save();
  }

  // --- Installments ---

  addInstallment(inst: Omit<Installment, 'id'>) {
    if (!this.db) throw new Error("DB not initialized");
    const stmt = this.db.prepare(`
      INSERT INTO installments (description, card_name, amount_per_installment, total_installments, installments_paid, start_date, is_active)
      VALUES (:desc, :card, :amount, :total, :paid, :start, :active)
    `);
    stmt.run({
      ':desc': inst.description,
      ':card': inst.card_name,
      ':amount': inst.amount_per_installment,
      ':total': inst.total_installments,
      ':paid': inst.installments_paid,
      ':start': inst.start_date,
      ':active': inst.is_active
    });
    stmt.free();
    this.save();
  }

  getInstallments(activeOnly: boolean = false): Installment[] {
    if (!this.db) return [];
    let sql = "SELECT * FROM installments";
    if (activeOnly) {
      sql += " WHERE is_active = 1";
    }
    sql += " ORDER BY start_date DESC";
    
    const stmt = this.db.prepare(sql);
    const results: Installment[] = [];
    while(stmt.step()) {
      results.push(stmt.getAsObject() as unknown as Installment);
    }
    stmt.free();
    return results;
  }

  updateInstallmentPaid(id: number, newPaidCount: number) {
    if(!this.db) return;
    const inst = this.getInstallmentById(id);
    if (!inst) return;

    let isActive = inst.is_active;
    if (newPaidCount >= inst.total_installments) {
        isActive = 0;
    }

    this.db.run(`UPDATE installments SET installments_paid = ?, is_active = ? WHERE id = ?`, [newPaidCount, isActive, id]);
    this.save();
  }

  toggleInstallmentStatus(id: number) {
      if(!this.db) return;
      const inst = this.getInstallmentById(id);
      if(!inst) return;
      const newStatus = inst.is_active === 1 ? 0 : 1;
      this.db.run(`UPDATE installments SET is_active = ? WHERE id = ?`, [newStatus, id]);
      this.save();
  }
  
  deleteInstallment(id: number) {
      if(!this.db) return;
      this.db.run("DELETE FROM installments WHERE id = ?", [id]);
      this.save();
  }

  private getInstallmentById(id: number): Installment | null {
      if(!this.db) return null;
      const stmt = this.db.prepare("SELECT * FROM installments WHERE id = :id");
      stmt.bind({':id': id});
      if(stmt.step()) {
          const res = stmt.getAsObject() as unknown as Installment;
          stmt.free();
          return res;
      }
      stmt.free();
      return null;
  }

  // --- Analysis ---
  
  getMonthlySummary(year: number, month?: string): Record<string, number> {
     if (!this.db) return {};

     // Note: This summary logic currently sums mixed currencies (ARS and USD) raw numbers. 
     // For a robust system, you'd normalize everything to one currency here. 
     // For this iteration, we assume most inputs are ARS or user is aware of mixed totals.
     
     let query = `SELECT type, SUM(amount) as total FROM transactions WHERE strftime('%Y', date) = :year`;
     const params: any = { ':year': String(year) };

     if (month && month !== 'all') {
         query += ` AND strftime('%m', date) = :month`;
         params[':month'] = month;
     }

     query += ` GROUP BY type`;

     const stmt = this.db.prepare(query);
     stmt.bind(params);
     
     const summary: Record<string, number> = {};
     while(stmt.step()) {
         const row = stmt.getAsObject();
         summary[row.type as string] = row.total as number;
     }
     stmt.free();
     
     const activeInstallments = this.getInstallments(true);
     let installmentsTotal = activeInstallments.reduce((acc, curr) => acc + curr.amount_per_installment, 0);
     
     if (month === 'all') {
         installmentsTotal = installmentsTotal * 12; 
     }

     summary['INSTALLMENTS'] = installmentsTotal;

     return summary;
  }

  getExpensesByCategory(year: number, month?: string): Array<{category: string, total: number}> {
    if (!this.db) return [];

    let query = `
        SELECT category, SUM(amount) as total 
        FROM transactions 
        WHERE type != 'INCOME' 
        AND strftime('%Y', date) = :year
    `;
    const params: any = { ':year': String(year) };

    if (month && month !== 'all') {
        query += ` AND strftime('%m', date) = :month`;
        params[':month'] = month;
    }

    query += ` GROUP BY category ORDER BY total DESC`;

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const results: Array<{category: string, total: number}> = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({ category: row.category as string, total: row.total as number });
    }
    stmt.free();
    return results;
  }
}

export const dbService = new DatabaseService();