import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BatchManagementView } from './components/BatchManagementView';
import { AuditDeskView } from './components/AuditDeskView';
import { HistoryView } from './components/HistoryView';
import { CostCenterView } from './components/CostCenterView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { Loader2 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessao, setSessao] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Verifica se já existe um utilizador logado quando o site abre
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  // Se não houver sessão, mostra o ecrã de Login!
  if (!sessao) {
    return <LoginView onLoginSucesso={() => {}} />;
  }

  // Se estiver autenticado, mostra o SaaS
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'batches': return <BatchManagementView />;
      case 'audit': return <AuditDeskView />;
      case 'history': return <HistoryView />;
      case 'costs': return <CostCenterView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;