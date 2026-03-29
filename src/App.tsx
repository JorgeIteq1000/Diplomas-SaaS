import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BatchManagementView } from './components/BatchManagementView';
import { AuditDeskView } from './components/AuditDeskView';
import { HistoryView } from './components/HistoryView';
import { CostCenterView } from './components/CostCenterView';
import { SettingsView } from './components/SettingsView';
import { TeamManagementView } from './components/TeamManagementView'; // A NOSSA TELA NOVA AQUI!
import { LoginView } from './components/LoginView';
import { Loader2, ShieldAlert } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessao, setSessao] = useState<any>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'COLABORADOR' | null>(null); // NOVO: Guarda o perfil do usuário
  const [loading, setLoading] = useState(true);

  // Busca a sessão e o perfil do usuário no banco de dados
  useEffect(() => {
    let mounted = true;

    const carregarSessaoEPerfil = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && mounted) {
        setSessao(session);
        // Vai na tabela verificar se é Admin ou Colaborador
        const { data } = await supabase
          .from('colaboradores')
          .select('perfil')
          .eq('email', session.user.email)
          .single();
          
        if (data) {
          setUserRole(data.perfil);
        } else {
          // Se o e-mail não estiver na tabela, por segurança, ele é apenas Colaborador
          setUserRole('COLABORADOR');
        }
      }
      if (mounted) setLoading(false);
    };

    carregarSessaoEPerfil();

    // Fica escutando caso o usuário faça login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSessao(session);
        const { data } = await supabase
          .from('colaboradores')
          .select('perfil')
          .eq('email', session.user.email)
          .single();
        if (data) setUserRole(data.perfil);
        else setUserRole('COLABORADOR');
      } else {
        setSessao(null);
        setUserRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

  // ─── LÓGICA DE PROTEÇÃO DE ROTAS (RBAC) ───────────────────────────────────
  const renderContent = () => {
    // Se for COLABORADOR e tentar aceder a áreas restritas, a porta fecha!
if (userRole !== 'ADMIN' && (activeTab === 'costs' || activeTab === 'team' || activeTab === 'settings')) {
      return (
        <div className="flex flex-col h-full items-center justify-center bg-slate-50 text-slate-500">
          <ShieldAlert className="w-20 h-20 text-red-400 mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-slate-700">Acesso Restrito</h2>
          <p className="mt-2 text-slate-500">O seu perfil de acesso não tem permissão para visualizar esta área.</p>
        </div>
      );
    }

    // Se tiver acesso livre, renderiza normalmente:
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'batches': return <BatchManagementView />;
      case 'audit': return <AuditDeskView />;
      case 'history': return <HistoryView />;
      case 'costs': return <CostCenterView />;
      case 'team': return <TeamManagementView />; // Rota da Nova Tela
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Passamos o userRole para a Sidebar saber quais botões ela deve esconder */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} userRole={userRole} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;