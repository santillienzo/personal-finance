import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { SavingsAccount, SavingsMovement, Portfolio, AvailableBalance, SavingsAccountType, SavingsMovementType, Currency } from '../types';
import { getHistoricalRate } from '../services/currency';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Banknote,
  Bitcoin,
  Building2,
  LineChart,
  MoreHorizontal,
  RefreshCw,
  X,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ACCOUNT_TYPES: { value: SavingsAccountType; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Efectivo', icon: <Banknote size={18} /> },
  { value: 'crypto', label: 'Crypto', icon: <Bitcoin size={18} /> },
  { value: 'bank', label: 'Banco', icon: <Building2 size={18} /> },
  { value: 'investment', label: 'Inversión', icon: <LineChart size={18} /> },
  { value: 'other', label: 'Otro', icon: <MoreHorizontal size={18} /> },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const getAccountIcon = (type: SavingsAccountType) => {
  const found = ACCOUNT_TYPES.find(t => t.value === type);
  return found?.icon || <Wallet size={18} />;
};

const SavingsDashboard: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [available, setAvailable] = useState<AvailableBalance | null>(null);
  const [movements, setMovements] = useState<SavingsMovement[]>([]);
  const [currentRate, setCurrentRate] = useState(0);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Account form
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'cash' as SavingsAccountType,
    currency: 'USD' as Currency,
    color: COLORS[0]
  });

  // Movement form
  const [movementForm, setMovementForm] = useState({
    account_id: 0,
    type: 'DEPOSIT' as SavingsMovementType,
    amount: '',
    currency: 'USD' as Currency,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const rate = await getHistoricalRate(new Date().toISOString().split('T')[0]);
      setCurrentRate(rate);

      const [portfolioData, availableData, movementsData] = await Promise.all([
        apiService.getPortfolio(),
        apiService.getAvailableBalance(),
        apiService.getSavingsMovements(undefined, 20)
      ]);

      setPortfolio(portfolioData);
      setAvailable(availableData);
      setMovements(movementsData);
    } catch (error) {
      console.error('Error loading savings data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name) return;

    try {
      await apiService.createSavingsAccount({
        name: accountForm.name,
        type: accountForm.type,
        currency: accountForm.currency,
        color: accountForm.color
      });
      setAccountForm({ name: '', type: 'cash', currency: 'USD', color: COLORS[0] });
      setShowAccountForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Error al crear la cuenta');
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementForm.account_id || !movementForm.amount) return;

    try {
      const rate = movementForm.currency === 'ARS' ? await getHistoricalRate(movementForm.date) : 1;
      
      await apiService.createSavingsMovement({
        account_id: movementForm.account_id,
        type: movementForm.type,
        amount: parseFloat(movementForm.amount),
        currency: movementForm.currency,
        exchange_rate: rate,
        description: movementForm.description,
        date: movementForm.date
      });
      
      setMovementForm({
        account_id: 0,
        type: 'DEPOSIT',
        amount: '',
        currency: 'USD',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowMovementForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating movement:', error);
      alert('Error al registrar el movimiento');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm('¿Eliminar esta cuenta de ahorro?')) return;
    try {
      await apiService.deleteSavingsAccount(id);
      loadData();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleDeleteMovement = async (id: number) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    try {
      await apiService.deleteSavingsMovement(id);
      loadData();
    } catch (error) {
      console.error('Error deleting movement:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const totalSavings = portfolio?.totalUSD || 0;
  const availableToSave = available?.available || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <PiggyBank className="text-indigo-500" />
            Mis Ahorros
          </h1>
          <p className="text-gray-500">Gestiona tu patrimonio y visualiza tu progreso</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAccountForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Nueva Cuenta
          </button>
          <button
            onClick={() => setShowMovementForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowUpCircle size={18} />
            Registrar Movimiento
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Savings */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet size={24} />
            </div>
            <span className="text-white/80 font-medium">Total Ahorrado</span>
          </div>
          <p className="text-3xl font-bold">${totalSavings.toFixed(2)} USD</p>
          {currentRate > 0 && (
            <p className="text-white/70 text-sm mt-1">
              ≈ ${(totalSavings * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} ARS
            </p>
          )}
        </div>

        {/* Available to Save */}
        <div className={`p-6 rounded-2xl shadow-sm border ${availableToSave >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${availableToSave >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {availableToSave >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <span className="text-gray-600 font-medium">Disponible para Ahorrar</span>
          </div>
          <p className={`text-2xl font-bold ${availableToSave >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            ${availableToSave.toFixed(2)} USD
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Ingresos - Gastos - Ya asignado
          </p>
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <LineChart size={24} />
            </div>
            <span className="text-gray-600 font-medium">Resumen</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Ingresos totales:</span>
              <span className="font-medium text-gray-800">${(available?.income || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gastos totales:</span>
              <span className="font-medium text-gray-800">${(available?.expenses || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Balance neto:</span>
              <span className={`font-bold ${(available?.netBalance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${(available?.netBalance || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Cuentas de Ahorro</h2>
        
        {portfolio?.accounts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
            <PiggyBank className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No tienes cuentas de ahorro configuradas</p>
            <button
              onClick={() => setShowAccountForm(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Crear tu primera cuenta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolio?.accounts.map(account => (
              <div
                key={account.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: account.color }}
                      >
                        {getAccountIcon(account.type as SavingsAccountType)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{account.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">${(account.balance || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{account.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center mt-2 text-gray-400">
                    {expandedAccount === account.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                
                {expandedAccount === account.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setMovementForm({ ...movementForm, account_id: account.id, type: 'DEPOSIT' });
                          setShowMovementForm(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                      >
                        <ArrowUpCircle size={16} /> Depositar
                      </button>
                      <button
                        onClick={() => {
                          setMovementForm({ ...movementForm, account_id: account.id, type: 'WITHDRAWAL' });
                          setShowMovementForm(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        <ArrowDownCircle size={16} /> Retirar
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
                    >
                      <Trash2 size={16} /> Eliminar cuenta
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Movements */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Movimientos Recientes</h2>
        
        {movements.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
            <p className="text-gray-500">No hay movimientos registrados</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
            {movements.map(mov => (
              <div key={mov.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${mov.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {mov.type === 'DEPOSIT' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {mov.description || (mov.type === 'DEPOSIT' ? 'Depósito' : 'Retiro')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span 
                        className="px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: mov.account_color || '#6366f1' }}
                      >
                        {mov.account_name}
                      </span>
                      <span>{mov.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold ${mov.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {mov.type === 'DEPOSIT' ? '+' : '-'}${mov.amount.toFixed(2)} {mov.currency}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMovement(mov.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Form Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Nueva Cuenta de Ahorro</h3>
              <button onClick={() => setShowAccountForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="Ej: USD Físicos, Binance..."
                  className="w-full p-3 border border-gray-200 rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAccountForm({ ...accountForm, type: type.value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                        accountForm.type === type.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {type.icon}
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select
                  value={accountForm.currency}
                  onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value as Currency })}
                  className="w-full p-3 border border-gray-200 rounded-lg"
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccountForm({ ...accountForm, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        accountForm.color === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAccountForm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Form Modal */}
      {showMovementForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {movementForm.type === 'DEPOSIT' ? 'Registrar Depósito' : 'Registrar Retiro'}
              </h3>
              <button onClick={() => setShowMovementForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
                <select
                  value={movementForm.account_id}
                  onChange={(e) => setMovementForm({ ...movementForm, account_id: parseInt(e.target.value) })}
                  className="w-full p-3 border border-gray-200 rounded-lg"
                  required
                >
                  <option value={0}>Seleccionar cuenta...</option>
                  {portfolio?.accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'DEPOSIT' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      movementForm.type === 'DEPOSIT'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowUpCircle size={18} /> Depósito
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'WITHDRAWAL' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      movementForm.type === 'WITHDRAWAL'
                        ? 'border-red-500 bg-red-50 text-red-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowDownCircle size={18} /> Retiro
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-3 border border-gray-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={movementForm.currency}
                    onChange={(e) => setMovementForm({ ...movementForm, currency: e.target.value as Currency })}
                    className="w-full p-3 border border-gray-200 rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={movementForm.date}
                  onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={movementForm.description}
                  onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                  placeholder="Ej: Ahorro del mes, Compra crypto..."
                  className="w-full p-3 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMovementForm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                    movementForm.type === 'DEPOSIT'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {movementForm.type === 'DEPOSIT' ? 'Depositar' : 'Retirar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsDashboard;
