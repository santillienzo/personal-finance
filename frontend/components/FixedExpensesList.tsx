import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Transaction, TransactionType, Currency, EXPENSE_CATEGORIES } from '../types';
import { getHistoricalRate } from '../services/currency';
import { 
  Repeat, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  Loader2,
  RefreshCw,
  Calendar,
  Plus
} from 'lucide-react';

const FixedExpensesList: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [replicating, setReplicating] = useState(false);
  const [currentRate, setCurrentRate] = useState<number>(0);
  
  // View state - which month to show
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'ARS' as Currency,
    category: 'Servicios'
  });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    description: '',
    amount: '',
    currency: 'ARS' as Currency,
    category: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await dbService.getFixedExpensesForMonth(viewYear, viewMonth);
      setExpenses(data);
    } catch (error) {
      console.error('Error loading fixed expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRate = async () => {
    const today = new Date().toISOString().split('T')[0];
    const rate = await getHistoricalRate(today);
    setCurrentRate(rate);
  };

  useEffect(() => {
    load();
    fetchCurrentRate();
  }, [viewYear, viewMonth]);

  const handleStartEdit = (expense: Transaction) => {
    setEditingId(expense.id);
    setEditData({
      description: expense.description,
      amount: String(expense.amount),
      currency: expense.currency,
      category: expense.category
    });
  };

  const handleSaveEdit = async (id: number) => {
    try {
      await dbService.updateFixedExpense(id, {
        description: editData.description,
        amount: parseFloat(editData.amount),
        currency: editData.currency,
        category: editData.category
      });
      setEditingId(null);
      await load();
    } catch (error) {
      console.error('Error updating fixed expense:', error);
      alert('Error al actualizar el gasto fijo');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto fijo?')) return;
    
    try {
      await dbService.deleteTransaction(id);
      await load();
    } catch (error) {
      console.error('Error deleting fixed expense:', error);
      alert('Error al eliminar el gasto fijo');
    }
  };

  const handleReplicate = async () => {
    if (replicating) return;
    
    const monthName = new Date(viewYear, viewMonth - 1, 1).toLocaleString('es', { month: 'long' });
    if (!window.confirm(`¿Replicar gastos fijos del mes anterior a ${monthName} ${viewYear}?`)) return;

    setReplicating(true);
    try {
      const result = await dbService.replicateFixedExpenses(viewYear, viewMonth, currentRate);
      alert(`Se crearon ${result.count} gastos fijos`);
      await load();
    } catch (error: any) {
      console.error('Error replicating:', error);
      alert(error.message || 'Error al replicar gastos fijos');
    } finally {
      setReplicating(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    const monthStr = String(viewMonth).padStart(2, '0');
    const date = `${viewYear}-${monthStr}-01`;
    const rate = formData.currency === 'USD' ? 1 : currentRate;

    try {
      await dbService.addTransaction({
        type: TransactionType.FIXED_EXPENSE,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        exchange_rate: rate,
        category: formData.category,
        date: date
      });
      setFormData({ description: '', amount: '', currency: 'ARS', category: 'Servicios' });
      setShowForm(false);
      await load();
    } catch (error) {
      console.error('Error adding fixed expense:', error);
      alert('Error al crear el gasto fijo');
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2023, month - 1, 1).toLocaleString('es', { month: 'long' });
  };

  const getPrevMonthName = () => {
    let prevMonth = viewMonth - 1;
    let prevYear = viewYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = viewYear - 1;
    }
    return `${getMonthName(prevMonth)} ${prevYear}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gastos Fijos</h2>
          <p className="text-gray-500 text-sm">Subscripciones, gimnasio, servicios recurrentes</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Add Button */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Nuevo
          </button>
          
          {/* Month/Year Selector */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
          <Calendar size={16} className="text-gray-400 ml-2" />
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="bg-transparent font-medium text-gray-700 outline-none px-2 py-1 cursor-pointer hover:bg-gray-50 rounded-lg"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const name = getMonthName(i + 1);
              return (
                <option key={i + 1} value={i + 1}>
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </option>
              );
            })}
          </select>
          <div className="w-px bg-gray-200 my-1 h-5"></div>
          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="bg-transparent font-medium text-gray-700 outline-none px-2 py-1 cursor-pointer hover:bg-gray-50 rounded-lg"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAddExpense} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Nuevo Gasto Fijo para {getMonthName(viewMonth)} {viewYear}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Descripción</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej: Netflix, Gimnasio..."
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Replicate Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <RefreshCw size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Replicar del Mes Anterior</h3>
              <p className="text-sm text-gray-500">Copiar gastos fijos de {getPrevMonthName()}</p>
            </div>
          </div>
          <button
            onClick={handleReplicate}
            disabled={replicating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {replicating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Repeat size={16} />
            )}
            Replicar Gastos Fijos
          </button>
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No hay gastos fijos para {getMonthName(viewMonth)} {viewYear}.</p>
          <p className="text-sm mt-2">Usa "Replicar del Mes Anterior" o registra uno nuevo desde "Registrar".</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  {editingId === expense.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          className="w-full p-1.5 border border-gray-200 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editData.category}
                          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                          className="w-full p-1.5 border border-gray-200 rounded text-sm"
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.amount}
                            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                            className="w-24 p-1.5 border border-gray-200 rounded text-sm text-right"
                          />
                          <select
                            value={editData.currency}
                            onChange={(e) => setEditData({ ...editData, currency: e.target.value as Currency })}
                            className="p-1.5 border border-gray-200 rounded text-sm"
                          >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleSaveEdit(expense.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{expense.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{expense.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <span className="font-semibold text-gray-800">
                            ${expense.amount.toLocaleString()} {expense.currency}
                          </span>
                          {expense.currency === 'ARS' && currentRate > 0 && (
                            <p className="text-xs text-gray-400">≈ ${(expense.amount / currentRate).toFixed(2)} USD</p>
                          )}
                          {expense.currency === 'USD' && currentRate > 0 && (
                            <p className="text-xs text-gray-400">≈ ${(expense.amount * currentRate).toLocaleString()} ARS</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleStartEdit(expense)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FixedExpensesList;
