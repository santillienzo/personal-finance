import { Transaction, Installment } from '../types';
import { apiService } from './api';

class DatabaseServerService {
  private isReady: boolean = false;

  async init() {
    if (this.isReady) return;

    try {
      await apiService.checkHealth();
      this.isReady = true;
    } catch (err) {
      console.error("Failed to connect to server:", err);
      throw new Error("No se pudo conectar al servidor. Asegúrate de que el servidor esté ejecutándose en http://localhost:3001");
    }
  }

  async addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>) {
    await apiService.addTransaction(tx);
  }

  async getTransactions(year: number, month?: string, category?: string): Promise<Transaction[]> {
    return apiService.getTransactions(year, month, category);
  }

  async deleteTransaction(id: number) {
    await apiService.deleteTransaction(id);
  }

  async addInstallment(inst: Omit<Installment, 'id'>) {
    await apiService.addInstallment(inst);
  }

  async getInstallments(activeOnly: boolean = false): Promise<Installment[]> {
    return apiService.getInstallments(activeOnly);
  }

  async updateInstallmentPaid(id: number, newPaidCount: number) {
    await apiService.updateInstallmentPaid(id, newPaidCount);
  }

  async toggleInstallmentStatus(id: number) {
    await apiService.toggleInstallmentStatus(id);
  }

  async deleteInstallment(id: number) {
    await apiService.deleteInstallment(id);
  }

  async markInstallmentPaid(id: number, exchange_rate: number, payment_date?: string, installment_number?: number) {
    return apiService.markInstallmentPaid(id, exchange_rate, payment_date, installment_number);
  }

  async getInstallmentPayments(id: number) {
    return apiService.getInstallmentPayments(id);
  }

  async getMonthlySummary(year: number, month?: string): Promise<Record<string, number>> {
    const summary = await apiService.getMonthlySummary(year, month);
    
    const activeInstallments = await this.getInstallments(true);
    let installmentsTotal = activeInstallments.reduce((acc, curr) => acc + curr.amount_per_installment, 0);
    
    if (month === 'all') {
      installmentsTotal = installmentsTotal * 12;
    }

    summary['INSTALLMENTS'] = installmentsTotal;

    return summary;
  }

  async getMonthlySummaryUSD(year: number, currentRate: number, month?: string): Promise<Record<string, number>> {
    // Only return actual transactions - no projections
    // INSTALLMENT type transactions are already included in the summary from the API
    return apiService.getMonthlySummaryUSD(year, month);
  }

  async getExpensesByCategory(year: number, month?: string): Promise<Array<{category: string, total: number}>> {
    return apiService.getExpensesByCategory(year, month);
  }

  async getExpensesByCategoryUSD(year: number, month?: string): Promise<Array<{category: string, total: number}>> {
    return apiService.getExpensesByCategoryUSD(year, month);
  }
}

export const dbService = new DatabaseServerService();
