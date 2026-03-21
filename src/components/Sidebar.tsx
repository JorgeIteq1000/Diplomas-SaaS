import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  FileCheck, 
  History, 
  BarChart3, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'batches', label: 'Gestão de Lotes', icon: Layers },
  { id: 'audit', label: 'Mesa de Auditoria', icon: FileCheck },
  { id: 'history', label: 'Histórico & Compliance', icon: History },
  { id: 'costs', label: 'Centro de Custos', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings },
] as const;

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-screen border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        <span className="font-bold text-xl text-white tracking-tight">AutoCert AI</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm font-medium",
              currentView === item.id 
                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
                : "hover:bg-slate-900 hover:text-white"
            )}
          >
            <item.icon className={cn("w-5 h-5", currentView === item.id ? "text-blue-400" : "text-slate-400")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>
      </div>
    </aside>
  );
}
