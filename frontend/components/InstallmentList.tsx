import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Installment } from '../types';
import { CreditCard, CheckCircle2, Circle, Plus, Minus, Calendar, Trash2 } from 'lucide-react';

const InstallmentList: React.FC = () => {
  const [activeOnly, setActiveOnly] = useState(true);
  const [items, setItems] = useState<Installment[]>([]);

  const load = async () => {
    const data = await dbService.getInstallments(activeOnly);
    setItems(data);
  };

  useEffect(() => {
    load();
  }, [activeOnly]);

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

                    <p className="text-2xl font-bold text-slate-800 mb-4">${item.amount_per_installment.toLocaleString()} <span className="text-xs font-normal text-gray-400">/ mes</span></p>

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
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                            <span className="text-xs text-gray-400">Ajustar pagadas:</span>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleUpdatePaid(item.id, item.installments_paid, -1, item.total_installments)}
                                    className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="font-mono font-medium text-gray-800 w-4 text-center">{item.installments_paid}</span>
                                <button 
                                    onClick={() => handleUpdatePaid(item.id, item.installments_paid, 1, item.total_installments)}
                                    className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
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