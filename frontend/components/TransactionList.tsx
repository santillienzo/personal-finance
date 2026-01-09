import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Transaction, TransactionType, EXPENSE_CATEGORIES, MAJOR_EXPENSE_THRESHOLD_USD } from '../types';
import { Trash2, Tag, ArrowUpCircle, ArrowDownCircle, Filter, ShoppingBag, Coffee, Repeat, PiggyBank } from 'lucide-react';

const TransactionList: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = async () => {
    const data = await dbService.getTransactions(year, month === 'all' ? 'all' : month, categoryFilter);
    setTransactions(data);
  };

  useEffect(() => {
    load();
  }, [year, month, categoryFilter]);

  const handleDelete = async (id: number) => {
    if(window.confirm("¿Borrar este movimiento?")) {
        await dbService.deleteTransaction(id);
        load();
    }
  };

  // Helper to get amount in USD
  const getAmountInUSD = (tx: Transaction): number => {
    if (tx.currency === 'USD') return tx.amount;
    if (tx.exchange_rate > 0) return tx.amount / tx.exchange_rate;
    return 0;
  };

  // Sections filtering
  const incomes = transactions.filter(t => t.type === TransactionType.INCOME);
  const fixedExpenses = transactions.filter(t => t.type === TransactionType.FIXED_EXPENSE);
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  const majorExpenses = expenses.filter(t => getAmountInUSD(t) >= MAJOR_EXPENSE_THRESHOLD_USD);
  const microExpenses = expenses.filter(t => getAmountInUSD(t) < MAJOR_EXPENSE_THRESHOLD_USD);
  const installmentPayments = transactions.filter(t => t.type === TransactionType.INSTALLMENT);
  const savingDeposits = transactions.filter(t => t.type === TransactionType.SAVING_DEPOSIT);
  const savingWithdrawals = transactions.filter(t => t.type === TransactionType.SAVING_WITHDRAWAL);

  // Calculate section totals
  const getSectionTotals = (items: Transaction[]) => {
    let totalUSD = 0;
    let totalARS = 0;
    
    items.forEach(tx => {
      const rate = tx.exchange_rate || 0;
      if (tx.currency === 'USD') {
        totalUSD += tx.amount;
        if (rate > 0) totalARS += tx.amount * rate;
      } else {
        totalARS += tx.amount;
        if (rate > 0) totalUSD += tx.amount / rate;
      }
    });
    
    return { totalUSD, totalARS };
  };

  const renderSection = (title: string, items: Transaction[], icon: React.ReactNode, headerColor: string) => {
      if (items.length === 0) return null;

      const { totalUSD, totalARS } = getSectionTotals(items);

      return (
        <div className="mb-8">
            <div className={`flex items-center justify-between mb-3 px-1`}>
                <div className={`flex items-center gap-2 ${headerColor}`}>
                    {icon}
                    <h3 className="font-bold text-lg">{title}</h3>
                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        {items.length}
                    </span>
                </div>
                <div className="text-right">
                    <span className="font-bold text-gray-800">${totalUSD.toFixed(2)} USD</span>
                    <span className="text-xs text-gray-400 ml-2">≈ ${totalARS.toLocaleString(undefined, { maximumFractionDigits: 0 })} ARS</span>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                {items.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg border ${tx.type === TransactionType.INCOME ? 'bg-green-50 border-green-100 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                {tx.type === TransactionType.INCOME ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{tx.description}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{tx.date}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Tag size={10}/> {tx.category}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {renderAmounts(tx)}
                            <button 
                                onClick={() => handleDelete(tx.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  };

  const renderAmounts = (tx: Transaction) => {
    const isIncome = tx.type === TransactionType.INCOME;
    const sign = isIncome ? '+' : '-';
    const color = isIncome ? 'text-green-600' : 'text-gray-800';
    
    const rate = tx.exchange_rate || 0;
    const currency = tx.currency || 'ARS';

    let mainDisplay = '';
    let subDisplay = '';
    
    if (currency === 'ARS') {
        mainDisplay = `${sign}$${tx.amount.toLocaleString()} ARS`;
        if (rate > 0) {
            const usd = tx.amount / rate;
            subDisplay = `≈ $${usd.toFixed(2)} USD`;
        }
    } else {
        mainDisplay = `${sign}$${tx.amount.toLocaleString()} USD`;
        if (rate > 0) {
            const ars = tx.amount * rate;
            subDisplay = `≈ $${ars.toLocaleString(undefined, { maximumFractionDigits: 0 })} ARS`;
        }
    }

    return (
        <div className="text-right">
            <div className={`font-mono font-bold ${color} text-base`}>
                {mainDisplay}
            </div>
            {subDisplay && (
                <div className="text-xs text-gray-400">
                    <span className="font-medium text-slate-500">{subDisplay}</span>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h2 className="text-xl font-bold text-gray-800">Movimientos</h2>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select 
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
                {Array.from({length: 5}, (_, i) => currentYear - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>

            <select 
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="all">Todo el Año</option>
                {Array.from({length: 12}, (_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    return <option key={m} value={m}>Mes {m}</option>
                })}
            </select>

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 text-sm">
                <Filter size={16} className="text-gray-400" />
                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-transparent outline-none w-32"
                >
                    <option value="all">Categoría: Todas</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            No hay movimientos registrados para estos filtros.
        </div>
      ) : (
          <div>
            {renderSection("Ingresos", incomes, <ArrowUpCircle className="text-green-600" />, "text-green-800")}
            {renderSection("Gastos Fijos", fixedExpenses, <Repeat className="text-blue-600" />, "text-blue-800")}
            {renderSection("Gastos Relevantes (> 15 USD)", majorExpenses, <ShoppingBag className="text-pink-600" />, "text-pink-800")}
            {renderSection("Micro Gastos", microExpenses, <Coffee className="text-amber-600" />, "text-amber-800")}
            {renderSection("Pagos de Cuotas", installmentPayments, <Repeat className="text-purple-600" />, "text-purple-800")}
            {renderSection("Ahorros (Depósitos)", savingDeposits, <PiggyBank className="text-emerald-600" />, "text-emerald-800")}
            {renderSection("Ahorros (Retiros)", savingWithdrawals, <PiggyBank className="text-orange-600" />, "text-orange-800")}
          </div>
      )}
    </div>
  );
};

export default TransactionList;