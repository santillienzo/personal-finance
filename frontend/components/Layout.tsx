import React from 'react';
import { Wallet, CreditCard, PieChart, PlusCircle, Repeat, PiggyBank } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'transactions' | 'installments' | 'fixed' | 'savings' | 'add';
  onTabChange: (tab: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-700 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="font-bold text-xl flex items-center gap-2">
            <Wallet className="w-6 h-6" /> FinanzaFlow
        </h1>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 border-b border-slate-800">
          <h1 className="font-bold text-2xl flex items-center gap-2 text-indigo-400">
            <Wallet className="w-8 h-8" /> FinanzaFlow
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gestión Inteligente</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => onTabChange('dashboard')} 
            icon={<PieChart size={20} />} 
            label="Resumen" 
          />
          <NavButton 
            active={activeTab === 'transactions'} 
            onClick={() => onTabChange('transactions')} 
            icon={<Wallet size={20} />} 
            label="Movimientos" 
          />
          <NavButton 
            active={activeTab === 'installments'} 
            onClick={() => onTabChange('installments')} 
            icon={<CreditCard size={20} />} 
            label="Cuotas Tarjeta" 
          />
          <NavButton 
            active={activeTab === 'fixed'} 
            onClick={() => onTabChange('fixed')} 
            icon={<Repeat size={20} />} 
            label="Gastos Fijos" 
          />
          <NavButton 
            active={activeTab === 'savings'} 
            onClick={() => onTabChange('savings')} 
            icon={<PiggyBank size={20} />} 
            label="Ahorros" 
          />
          <div className="pt-4 mt-4 border-t border-slate-800">
             <button
                onClick={() => onTabChange('add')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
                <PlusCircle size={20} />
                <span>Registrar</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 pb-safe z-50">
        <MobileNavButton active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} icon={<PieChart size={20} />} />
        <MobileNavButton active={activeTab === 'transactions'} onClick={() => onTabChange('transactions')} icon={<Wallet size={20} />} />
        <MobileNavButton active={activeTab === 'add'} onClick={() => onTabChange('add')} icon={<PlusCircle size={24} className="text-indigo-600" />} />
        <MobileNavButton active={activeTab === 'savings'} onClick={() => onTabChange('savings')} icon={<PiggyBank size={20} />} />
        <MobileNavButton active={activeTab === 'installments'} onClick={() => onTabChange('installments')} icon={<CreditCard size={20} />} />
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-800' : 'hover:bg-slate-800 text-slate-300'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon }: any) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-xl ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}
  >
    {icon}
  </button>
);

export default Layout;