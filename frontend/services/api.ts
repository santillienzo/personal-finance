import { Transaction, Installment } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<{ id: number; message: string }> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  async getTransactions(year: number, month?: string, category?: string): Promise<Transaction[]> {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.append('month', month);
    if (category) params.append('category', category);

    return this.request(`/transactions?${params.toString()}`);
  }

  async deleteTransaction(id: number): Promise<{ message: string }> {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async getMonthlySummary(year: number, month?: string): Promise<Record<string, number>> {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.append('month', month);

    return this.request(`/transactions/summary?${params.toString()}`);
  }

  async getExpensesByCategory(year: number, month?: string): Promise<Array<{ category: string; total: number }>> {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.append('month', month);

    return this.request(`/transactions/expenses-by-category?${params.toString()}`);
  }

  async getMonthlySummaryUSD(year: number, month?: string): Promise<Record<string, number>> {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.append('month', month);

    return this.request(`/transactions/summary-usd?${params.toString()}`);
  }

  async getExpensesByCategoryUSD(year: number, month?: string): Promise<Array<{ category: string; total: number }>> {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.append('month', month);

    return this.request(`/transactions/expenses-by-category-usd?${params.toString()}`);
  }

  async addInstallment(inst: Omit<Installment, 'id'>): Promise<{ id: number; message: string }> {
    return this.request('/installments', {
      method: 'POST',
      body: JSON.stringify(inst),
    });
  }

  async getInstallments(activeOnly: boolean = false): Promise<Installment[]> {
    const params = activeOnly ? '?activeOnly=true' : '';
    return this.request(`/installments${params}`);
  }

  async updateInstallmentPaid(id: number, installments_paid: number): Promise<{ message: string }> {
    return this.request(`/installments/${id}/paid`, {
      method: 'PATCH',
      body: JSON.stringify({ installments_paid }),
    });
  }

  async toggleInstallmentStatus(id: number): Promise<{ message: string }> {
    return this.request(`/installments/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  async deleteInstallment(id: number): Promise<{ message: string }> {
    return this.request(`/installments/${id}`, {
      method: 'DELETE',
    });
  }

  async markInstallmentPaid(id: number, exchange_rate: number, payment_date?: string, installment_number?: number): Promise<{ message: string; transaction_id: number; payment_number: number; new_paid_count: number; is_complete: boolean }> {
    return this.request(`/installments/${id}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ exchange_rate, payment_date, installment_number }),
    });
  }

  async getInstallmentPayments(id: number): Promise<Array<{ id: number; installment_id: number; transaction_id: number; installment_number: number; payment_date: string; amount: number; currency: string; exchange_rate: number }>> {
    return this.request(`/installments/${id}/payments`);
  }

  async checkHealth(): Promise<{ status: string; message: string }> {
    return this.request('/health');
  }

  // Fixed Expenses (FIXED_EXPENSE transactions)
  async getFixedExpensesForMonth(year: number, month: number): Promise<Transaction[]> {
    return this.request(`/fixed-expenses/month/${year}/${month}`);
  }

  async updateFixedExpense(id: number, updates: Partial<Transaction>): Promise<{ message: string }> {
    return this.request(`/fixed-expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async replicateFixedExpenses(year: number, month: number, exchange_rate: number): Promise<{ message: string; count: number }> {
    return this.request('/fixed-expenses/replicate', {
      method: 'POST',
      body: JSON.stringify({ year, month, exchange_rate }),
    });
  }
}

export const apiService = new ApiService();
