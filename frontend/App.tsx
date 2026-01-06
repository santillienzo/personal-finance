import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import InstallmentList from './components/InstallmentList';
import FixedExpensesList from './components/FixedExpensesList';
import { dbService } from './services/db';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'installments' | 'fixed' | 'add'>('dashboard');
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await dbService.init();
        setDbReady(true);
      } catch (e) {
        console.error("DB Init failed", e);
        setError(e instanceof Error ? e.message : 'Error al conectar con el servidor');
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-700">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-xl font-bold mb-2 text-center">Error de Conexión</h2>
          <p className="text-sm text-slate-600 mb-4 text-center">{error}</p>
          <div className="bg-slate-50 p-4 rounded text-xs text-slate-600">
            <p className="font-semibold mb-2">Para iniciar el servidor:</p>
            <code className="block bg-slate-800 text-green-400 p-2 rounded">
              cd server<br/>
              npm install<br/>
              npm run dev<br/>
              (Puerto 5000)
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-500">
        <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
            <p>Conectando al servidor...</p>
        </div>
      </div>
    );
  }

  const handleTransactionSuccess = () => {
    setActiveTab('dashboard');
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'transactions' && <TransactionList />}
      {activeTab === 'installments' && <InstallmentList />}
      {activeTab === 'fixed' && <FixedExpensesList />}
      {activeTab === 'add' && (
        <TransactionForm 
            onSuccess={handleTransactionSuccess} 
            onCancel={() => setActiveTab('dashboard')} 
        />
      )}
    </Layout>
  );
};

export default App;