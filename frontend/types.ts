export enum TransactionType {
  INCOME = 'INCOME',
  FIXED_EXPENSE = 'FIXED_EXPENSE', // Subscriptions, gym, etc.
  MAJOR_EXPENSE = 'MAJOR_EXPENSE', // > 15 USD, categorized
  MICRO_EXPENSE = 'MICRO_EXPENSE', // Small daily expenses
}

export const EXPENSE_CATEGORIES = [
  'Alimentos',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Ocio',
  'Salud',
  'Educación',
  'Ropa',
  'Tecnología',
  'Mascotas',
  'Otros'
];

export type Currency = 'ARS' | 'USD';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  exchange_rate: number; // Rate at the time of transaction
  category: string;
  description: string;
  date: string; // ISO YYYY-MM-DD
  created_at?: number;
}

export interface Installment {
  id: number;
  description: string;
  card_name: string;
  amount_per_installment: number;
  total_installments: number;
  installments_paid: number;
  start_date: string;
  is_active: number; // 1 for active, 0 for paid/cancelled
}

export interface SqlJsDatabase {
  run(sql: string, params?: any[] | object): void;
  exec(sql: string): Array<{ columns: string[]; values: any[][] }>;
  prepare(sql: string): any;
  export(): Uint8Array;
  close(): void;
}

declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}