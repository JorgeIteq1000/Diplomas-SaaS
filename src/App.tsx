import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BatchManagementView } from './components/BatchManagementView';
import { AuditDeskView } from './components/AuditDeskView';
import { HistoryView } from './components/HistoryView';
import { CostCenterView } from './components/CostCenterView';
import { SettingsView } from './components/SettingsView';
import { TeamManagementView } from './components/TeamManagementView';
import { LoginView } from './components/LoginView';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ApiGatewayView } from './components/ApiGatewayView';
import { CommunicationQueueView } from './components/CommunicationQueueView';

// ─── Timeout helper ──────────────────────────────────────────────────────────
// Se o Supabase não responder em X ms, rejeita a promise evitando loading infinito.
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
  );
  return Promise.race([Promise.resolve(promise), timeout]);
}

// ─── Busca o perfil do usuário com tratamento robusto ────────────────────────
async function fetchUserRole(email: string): Promise<'ADMIN' | 'COLABORADOR'> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('colaboradores')
        .select('perfil')
        .eq('email', email)
        .single(),
      5000 // 5 segundos de tolerância
    );

    if (error || !data) return 'COLABORADOR';
    return data.perfil as 'ADMIN' | 'COLABORADOR';
  } catch {
    // Timeout ou erro de rede: assume colaborador por segurança
    return 'COLABORADOR';
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessao, setSessao] = useState<any>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'COLABORADOR' | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Carregamento inicial da sessão ────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const carregarSessaoEPerfil = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          8000 // 8 segundos máximos para a primeira carga
        );

        if (error) {
          console.error('[Auth] Erro ao buscar sessão:', error.message);
          return; // finally vai liberar o loading
        }

        if (session && mounted) {
          setSessao(session);
          const role = await fetchUserRole(session.user.email ?? '');
          if (mounted) setUserRole(role);
        }
      } catch (err) {
        // Timeout ou falha de rede — libera o loading, mostra tela de login
        console.error('[Auth] Falha no carregamento inicial:', err);
      } finally {
        // SEMPRE libera o loading, independente do que acontecer acima
        if (mounted) setLoading(false);
      }
    };

    carregarSessaoEPerfil();

    // ─── Listener de mudança de autenticação ─────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Evento:', event);

        if (session) {
          setSessao(session);
          // Busca o perfil de forma assíncrona sem travar a UI
          fetchUserRole(session.user.email ?? '').then((role) => {
            if (mounted) setUserRole(role);
          });
        } else {
          setSessao(null);
          setUserRole(null);
        }

        // Garante que o loading seja liberado em qualquer transição
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] Erro no logout:', err);
    } finally {
      setSessao(null);
      setUserRole(null);
      setLoading(false);
    }
  }, []);

  // ─── Callback de login bem-sucedido ────────────────────────────────────────
  // O onAuthStateChange já lida com a sessão; este callback serve apenas
  // para forçar a remoção do loading caso o listener demore.
  const handleLoginSucesso = useCallback(() => {
    // O onAuthStateChange vai disparar e atualizar sessao + userRole.
    // Este timeout é um fallback de segurança caso o evento demore.
    setTimeout(() => setLoading(false), 3000);
  }, []);

  // ─── Loading global ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 animate-pulse">Carregando AutoCert...</p>
      </div>
    );
  }

  // ─── Sem sessão → tela de login ────────────────────────────────────────────
  if (!sessao) {
    return <LoginView onLoginSucesso={handleLoginSucesso} />;
  }

  // ─── Proteção de rotas (RBAC) ──────────────────────────────────────────────
  const renderContent = () => {
    const rotasRestritas = ['costs', 'team', 'settings', 'api', 'comms'];
    if (userRole !== 'ADMIN' && rotasRestritas.includes(activeTab)) {
      return (
        <div className="flex flex-col h-full items-center justify-center bg-slate-50 text-slate-500">
          <ShieldAlert className="w-20 h-20 text-red-400 mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-slate-700">Acesso Restrito</h2>
          <p className="mt-2 text-slate-500">
            O seu perfil de acesso não tem permissão para visualizar esta área.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'batches': return <BatchManagementView />;
      case 'audit': return <AuditDeskView />;
      case 'history': return <HistoryView />;
      case 'costs': return <CostCenterView />;
      case 'team': return <TeamManagementView />;
      case 'settings': return <SettingsView />;
      case 'api': return <ApiGatewayView />;
      case 'comms': return <CommunicationQueueView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        userRole={userRole}
      />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;