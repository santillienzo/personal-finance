import React, { useState } from 'react';
import { dbService } from '../services/db';
import { getHistoricalRate } from '../services/currency';
import { TransactionType, EXPENSE_CATEGORIES, Currency } from '../types';
import { Save, X, RefreshCw } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [mode, setMode] = useState<'transaction' | 'installment'>('transaction');
  const [loading, setLoading] = useState(false);

  // Transaction State
  const [isExpense, setIsExpense] = useState(true); // Simplified toggle: true = Gasto, false = Ingreso
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Installment State
  const [cardName, setCardName] = useState('');
  const [totalInstallments, setTotalInstallments] = useState(3);
  const [amountPerInstallment, setAmountPerInstallment] = useState('');
  const [installmentsPaid, setInstallmentsPaid] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'transaction') {
        const numAmount = parseFloat(amount);
        
        // 1. Fetch Historical Rate
        let rate = 0;
        try {
            rate = await getHistoricalRate(date);
        } catch (error) {
            console.error("Could not fetch rate", error);
        }

        // 2. Determine Transaction Type automatically
        let finalType = TransactionType.INCOME;
        
        if (isExpense) {
            // Calculate amount in USD to determine if it's Major or Micro
            let amountInUSD = numAmount;
            
            if (currency === 'ARS') {
                // If rate is 0 (API fail), we can't convert accurately. 
                // We'll assume Micro unless it's huge (e.g. > 15000 ARS ~ 15 USD roughly generic fallback)
                // But strictly using the rate:
                if (rate > 0) {
                    amountInUSD = numAmount / rate;
                } else {
                    amountInUSD = 0; // Fallback
                }
            }

            // Threshold: 15 USD
            if (amountInUSD >= 15) {
                finalType = TransactionType.MAJOR_EXPENSE;
            } else {
                finalType = TransactionType.MICRO_EXPENSE;
            }
        }

        await dbService.addTransaction({
            type: finalType,
            amount: numAmount,
            currency: currency,
            exchange_rate: rate,
            description,
            category: !isExpense ? 'Ingreso' : category,
            date,
        });
    } else {
        await dbService.addInstallment({
            description,
            card_name: cardName,
            amount_per_installment: parseFloat(amountPerInstallment),
            total_installments: Number(totalInstallments),
            installments_paid: Number(installmentsPaid),
            start_date: date,
            is_active: 1
        });
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registrar Movimiento</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X /></button>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
            type="button"
            onClick={() => setMode('transaction')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === 'transaction' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
        >
            Ingreso / Gasto
        </button>
        <button 
            type="button"
            onClick={() => setMode('installment')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === 'installment' ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
        >
            Cuota Tarjeta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Common Fields */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input 
                required
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                placeholder="Ej: Supermercado, Netflix, Monitor..."
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input 
                required
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
        </div>

        {/* Transaction Specifics */}
        {mode === 'transaction' && (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                        <div className="flex">
                            <input 
                                required
                                type="number" 
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-l-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                placeholder="0.00"
                            />
                             <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as Currency)}
                                className="bg-gray-50 border-y border-r border-gray-200 rounded-r-xl px-3 text-sm font-bold text-gray-700 outline-none hover:bg-gray-100 cursor-pointer"
                            >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento</label>
                        <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                                type="button"
                                onClick={() => setIsExpense(false)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isExpense ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Ingreso
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsExpense(true)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isExpense ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Gasto
                            </button>
                        </div>
                    </div>
                </div>
                
                {isExpense && (
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 mb-2">
                        El sistema clasificará automáticamente esto como <strong>Micro Gasto</strong> o <strong>Gasto Mayor</strong> si supera los 15 USD.
                    </div>
                )}

                {isExpense && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                )}
            </>
        )}

        {/* Installment Specifics */}
        {mode === 'installment' && (
            <>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Tarjeta</label>
                     <input 
                        required
                        list="card-suggestions"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        placeholder="Ej: Visa Santander, Amex"
                     />
                     <datalist id="card-suggestions">
                         <option value="Visa" />
                         <option value="Mastercard" />
                         <option value="Amex" />
                     </datalist>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monto por Cuota</label>
                        <input 
                            required
                            type="number"
                            step="0.01"
                            value={amountPerInstallment}
                            onChange={(e) => setAmountPerInstallment(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            placeholder="0.00"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Cuotas</label>
                        <select
                            value={totalInstallments}
                            onChange={(e) => setTotalInstallments(Number(e.target.value))}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            {[3, 6, 9, 12, 18, 24].map(n => (
                                <option key={n} value={n}>{n} cuotas</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas ya pagadas</label>
                    <input 
                        type="number"
                        min="0"
                        max={totalInstallments}
                        value={installmentsPaid}
                        onChange={(e) => setInstallmentsPaid(Number(e.target.value))}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                </div>
            </>
        )}

        <button 
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
        >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Calculando y Guardando...' : 'Guardar'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;