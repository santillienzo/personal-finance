import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Installment, Currency } from '../types';
import { getHistoricalRate } from '../services/currency';
import { CreditCard, CheckCircle2, Circle, Plus, Minus, Calendar, Trash2, DollarSign, Loader2 } from 'lucide-react';

interface PaymentForm {
  installmentId: number;
  date: string;
  installmentNumber: number;
  exchangeRate: number;
  loadingRate: boolean;
}

const InstallmentList: React.FC = () => {
  const [activeOnly, setActiveOnly] = useState(true);
  const [items, setItems] = useState<Installment[]>([]);
  const [loadingPayment, setLoadingPayment] = useState<number | null>(null);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [paidInstallments, setPaidInstallments] = useState<Record<number, number[]>>({});

  const load = async () => {
    const data = await dbService.getInstallments(activeOnly);
    setItems(data);
    
    // Load paid installments for each item
    const paidMap: Record<number, number[]> = {};
    for (const item of data) {
      try {
        const payments = await dbService.getInstallmentPayments(item.id);
        paidMap[item.id] = payments.map(p => p.installment_number);
      } catch {
        paidMap[item.id] = [];
      }
    }
    setPaidInstallments(paidMap);
  };

  useEffect(() => {
    load();
    fetchCurrentRate();
  }, [activeOnly]);

  const fetchCurrentRate = async () => {
    const today = new Date().toISOString().split('T')[0];
    const rate = await getHistoricalRate(today);
    setCurrentRate(rate);
  };

  const openPaymentForm = async (item: Installment) => {
    // Find next unpaid installment number
    const paid = paidInstallments[item.id] || [];
    let nextNumber = 1;
    for (let i = 1; i <= item.total_installments; i++) {
      if (!paid.includes(i)) {
        nextNumber = i;
        break;
      }
    }
    
    const today = new Date().toISOString().split('T')[0];
    setPaymentForm({
      installmentId: item.id,
      date: today,
      installmentNumber: nextNumber,
      exchangeRate: currentRate,
      loadingRate: false
    });
  };

  const handleDateChange = async (newDate: string) => {
    if (!paymentForm) return;
    
    setPaymentForm({ ...paymentForm, date: newDate, loadingRate: true });
    
    try {
      const rate = await getHistoricalRate(newDate);
      setPaymentForm(prev => prev ? { ...prev, exchangeRate: rate, loadingRate: false } : null);
    } catch (error) {
      console.error('Error fetching rate for date:', error);
      setPaymentForm(prev => prev ? { ...prev, exchangeRate: currentRate, loadingRate: false } : null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentForm || loadingPayment || paymentForm.loadingRate) return;
    
    const item = items.find(i => i.id === paymentForm.installmentId);
    if (!item) return;

    setLoadingPayment(paymentForm.installmentId);
    try {
      await dbService.markInstallmentPaid(
        paymentForm.installmentId, 
        paymentForm.exchangeRate,
        paymentForm.date,
        paymentForm.installmentNumber
      );
      setPaymentForm(null);
      await load();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      alert(error.message || 'Error al registrar el pago');
    } finally {
      setLoadingPayment(null);
    }
  };

  const handleUpdatePaid = async (id: number, current: number, delta: number, total: number) => {
    const newCount = current + delta;
    if (newCount < 0 || newCount > total) return;
    await dbService.updateInstallmentPaid(id, newCount);
    load();
  };

  const handleToggleStatus = async (id: number) => {
    await dbService.toggleInstallmentStatus(id);
    load();
  };

  const handleDelete = async (id: number) => {
      if(window.confirm("¿Estás seguro de que quieres eliminar este plan de cuotas?")) {
          await dbService.deleteInstallment(id);
          load();
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-800">Cuotas de Tarjeta</h2>
            <p className="text-gray-500 text-sm">Gestiona tus pagos a plazos</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveOnly(true)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeOnly ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
                Activas
            </button>
            <button 
                onClick={() => setActiveOnly(false)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!activeOnly ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
            >
                Historial
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
            const progress = (item.installments_paid / item.total_installments) * 100;
            const remaining = (item.total_installments - item.installments_paid) * item.amount_per_installment;

            return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl border ${item.is_active ? 'border-gray-200' : 'border-gray-100 opacity-75'} shadow-sm relative overflow-hidden group`}>
                    
                    {/* Status Badge & Actions */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs font-bold uppercase">
                            <CreditCard size={14} />
                            {item.card_name}
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleToggleStatus(item.id)}
                                className={`${item.is_active ? 'text-green-500' : 'text-gray-400'} hover:scale-110 transition-transform`}
                                title="Cambiar estado Activo/Finalizado"
                            >
                                {item.is_active ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </button>
                            <button 
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Eliminar Cuota"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-800 mb-1">{item.description}</h3>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                        <Calendar size={12} />
                        <span>{item.start_date}</span>
                    </div>

                    <div className="mb-4">
                        <p className="text-2xl font-bold text-slate-800">
                            ${item.amount_per_installment.toLocaleString()} {item.currency || 'ARS'}
                            <span className="text-xs font-normal text-gray-400"> / mes</span>
                        </p>
                        {item.currency === 'ARS' && currentRate > 0 && (
                            <p className="text-xs text-gray-400">
                                ≈ ${(item.amount_per_installment / currentRate).toFixed(2)} USD
                            </p>
                        )}
                        {item.currency === 'USD' && currentRate > 0 && (
                            <p className="text-xs text-gray-400">
                                ≈ ${(item.amount_per_installment * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} ARS
                            </p>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Progreso: {item.installments_paid}/{item.total_installments}</span>
                            <span>Resta: ${remaining.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Controls */}
                    {item.is_active === 1 && (
                        <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
                            {paymentForm && paymentForm.installmentId === item.id ? (
                                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Fecha de pago</label>
                                            <input
                                                type="date"
                                                value={paymentForm.date}
                                                onChange={(e) => handleDateChange(e.target.value)}
                                                className="w-full p-2 text-sm border border-gray-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Cuota Nro</label>
                                            <select
                                                value={paymentForm.installmentNumber}
                                                onChange={(e) => setPaymentForm({...paymentForm, installmentNumber: Number(e.target.value)})}
                                                className="w-full p-2 text-sm border border-gray-200 rounded-lg"
                                            >
                                                {Array.from({length: item.total_installments}, (_, i) => i + 1).map(num => {
                                                    const isPaid = (paidInstallments[item.id] || []).includes(num);
                                                    return (
                                                        <option key={num} value={num} disabled={isPaid}>
                                                            {num} {isPaid ? '(pagada)' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        {paymentForm.loadingRate ? (
                                            <>
                                                <Loader2 size={12} className="animate-spin" />
                                                Cargando tipo de cambio...
                                            </>
                                        ) : (
                                            <>Tipo de cambio ({paymentForm.date}): <span className="font-medium">${paymentForm.exchangeRate.toLocaleString()} ARS/USD</span></>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleConfirmPayment}
                                            disabled={loadingPayment === item.id}
                                            className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                                        >
                                            {loadingPayment === item.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <DollarSign size={16} />
                                            )}
                                            Confirmar Pago
                                        </button>
                                        <button
                                            onClick={() => setPaymentForm(null)}
                                            className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => openPaymentForm(item)}
                                    disabled={item.installments_paid >= item.total_installments}
                                    className="w-full py-2 px-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <DollarSign size={16} />
                                    Registrar Pago de Cuota
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
        {items.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400">
                No se encontraron cuotas.
            </div>
        )}
      </div>
    </div>
  );
};

export default InstallmentList;