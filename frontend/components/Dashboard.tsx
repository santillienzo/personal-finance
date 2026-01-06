import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { getHistoricalRate } from '../services/currency';
import { TransactionType } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from 'lucide-react';

const Dashboard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [summary, setSummary] = useState<any>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Array<{category: string, total: number}>>([]);
  const [currentRate, setCurrentRate] = useState<number>(0);
  
  // Filters
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth); // "all" or "01"-"12"

  const loadData = async () => {
    // Fetch exchange rate for the first day of the selected month/year
    let rateDate: string;
    if (month === 'all') {
      // For full year, use first day of January
      rateDate = `${year}-01-01`;
    } else {
      // Use first day of selected month
      rateDate = `${year}-${month}-01`;
    }
    const rate = await getHistoricalRate(rateDate);
    setCurrentRate(rate);

    // Determine month param: if 'all', pass 'all', else pass specific month string
    const monthParam = month === 'all' ? 'all' : month;

    // Get USD-normalized data
    const data = await dbService.getMonthlySummaryUSD(year, rate, monthParam);
    const breakdown = await dbService.getExpensesByCategoryUSD(year, monthParam);

    // Calculate Balance (all in USD)
    // Only count actual transactions - no projections
    const income = data[TransactionType.INCOME] || 0;
    const fixed = data[TransactionType.FIXED_EXPENSE] || 0;
    const major = data[TransactionType.MAJOR_EXPENSE] || 0;
    const micro = data[TransactionType.MICRO_EXPENSE] || 0;
    const installmentPayments = data[TransactionType.INSTALLMENT] || 0;
    
    const totalExpenses = fixed + major + micro + installmentPayments;
    const balance = income - totalExpenses;

    setSummary({
      income,
      fixed,
      major,
      micro,
      installmentPayments,
      totalExpenses,
      balance
    });
    setCategoryBreakdown(breakdown);
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  if (!summary) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Panel Financiero</h1>
            <p className="text-gray-500">Resumen de flujos y gastos</p>
        </div>
        
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
            <select 
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent font-medium text-gray-700 outline-none px-2 py-1 cursor-pointer hover:bg-gray-50 rounded-lg"
            >
                {Array.from({length: 5}, (_, i) => currentYear - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
            <div className="w-px bg-gray-200 my-1"></div>
            <select 
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent font-medium text-gray-700 outline-none px-2 py-1 cursor-pointer hover:bg-gray-50 rounded-lg"
            >
                <option value="all">Completo (Año)</option>
                {Array.from({length: 12}, (_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    const name = new Date(2023, i, 1).toLocaleString('es', { month: 'long' });
                    return <option key={m} value={m}>{name.charAt(0).toUpperCase() + name.slice(1)}</option>
                })}
            </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
            label="Ingresos" 
            amount={summary.income} 
            icon={<TrendingUp className="text-green-500" />} 
            bg="bg-green-50"
            rate={currentRate}
        />
        <StatCard 
            label="Balance" 
            amount={summary.balance} 
            icon={<DollarSign className={summary.balance >= 0 ? "text-indigo-500" : "text-red-500"} />} 
            bg={summary.balance >= 0 ? "bg-indigo-50" : "bg-red-50"}
            rate={currentRate}
        />
        <StatCard 
            label="Total Gastos" 
            amount={summary.totalExpenses} 
            icon={<TrendingDown className="text-orange-500" />} 
            bg="bg-orange-50"
            rate={currentRate}
        />
        <StatCard 
            label="Cuotas Pagadas"
            amount={summary.installmentPayments} 
            icon={<Calendar className="text-purple-500" />} 
            bg="bg-purple-50"
            rate={currentRate}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Desglose por Tipo</h3>
            <div className="space-y-4">
                <BarItem label="Gastos Fijos" amount={summary.fixed} color="bg-blue-500" total={summary.totalExpenses} rate={currentRate} />
                <BarItem label="Gastos Mayores (>15 USD)" amount={summary.major} color="bg-pink-500" total={summary.totalExpenses} rate={currentRate} />
                <BarItem label="Micro Gastos" amount={summary.micro} color="bg-yellow-500" total={summary.totalExpenses} rate={currentRate} />
                <BarItem label="Cuotas Pagadas" amount={summary.installmentPayments} color="bg-purple-500" total={summary.totalExpenses} rate={currentRate} />
            </div>
        </div>

        {/* Category Breakdown (Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <PieChart size={20} className="text-indigo-600"/>
                <h3 className="font-bold text-lg text-gray-800">Gastos por Categoría</h3>
            </div>
            
            {categoryBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    No hay gastos categorizados este periodo.
                </div>
            ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {categoryBreakdown.map((item, idx) => {
                        // Dynamic color generation based on index
                        const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500'];
                        const colorClass = colors[idx % colors.length];
                        const totalForCalc = summary.totalExpenses - summary.installments; // Categories usually apply to non-installment transaction expenses
                        // Or use totalExpenses as base? Let's use the sum of categorized items for the bar width to be relative to each other
                        const maxVal = categoryBreakdown[0].total; // Largest value is 100% width reference
                        
                        return (
                            <div key={item.category}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-gray-700">{item.category}</span>
                                    <div className="text-right">
                                        <span className="text-gray-900 font-bold">${item.total.toFixed(2)} USD</span>
                                        {currentRate > 0 && (
                                            <span className="text-gray-400 block">≈ ${(item.total * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} ARS</span>
                                        )}
                                    </div>
                                </div>
                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${colorClass}`} 
                                        style={{ width: `${(item.total / maxVal) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, amount, icon, bg, rate }: any) => {
  const arsAmount = rate > 0 ? amount * rate : 0;
  return (
    <div className={`p-4 rounded-xl border border-gray-100 flex items-center gap-4 ${bg}`}>
      <div className="p-3 bg-white rounded-lg shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900">${amount.toFixed(2)} USD</p>
        {rate > 0 && (
          <p className="text-xs text-gray-400">≈ ${arsAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ARS</p>
        )}
      </div>
    </div>
  );
};

const BarItem = ({ label, amount, color, total, rate }: any) => {
    const percent = total > 0 ? (amount / total) * 100 : 0;
    const arsAmount = rate > 0 ? amount * rate : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <div className="text-right">
                    <span className="font-medium">${amount.toFixed(2)} USD ({Math.round(percent)}%)</span>
                    {rate > 0 && (
                        <span className="text-xs text-gray-400 block">≈ ${arsAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ARS</span>
                    )}
                </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};

export default Dashboard;