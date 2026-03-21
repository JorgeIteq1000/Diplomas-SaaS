import React from 'react';
import { LayoutDashboard, Layers, ShieldAlert, History, CircleDollarSign, Settings, LogOut, GraduationCap } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'batches', label: 'Gestão de Lotes', icon: <Layers className="w-5 h-5" /> },
    { id: 'audit', label: 'Mesa de Auditoria', icon: <ShieldAlert className="w-5 h-5" /> },
    { id: 'history', label: 'Histórico (MEC)', icon: <History className="w-5 h-5" /> },
    { id: 'costs', label: 'Centro de Custos', icon: <CircleDollarSign className="w-5 h-5" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shadow-xl z-10">
      
      {/* LOGO E NOME DO PRODUTO */}
      <div className="p-6 flex items-center gap-3 text-white border-b border-slate-800">
        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">AutoCert AI</span>
      </div>

      {/* ITENS DO MENU */}
      <div className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* BOTÃO DE SAIR (LOGOUT) */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm w-full hover:bg-red-500/10 hover:text-red-400 text-slate-400 group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Sair do Sistema
        </button>
      </div>

    </div>
  );
};

export { Sidebar };