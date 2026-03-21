import React, { useState } from 'react';
import { 
  Key, 
  Users, 
  Globe, 
  Mail, 
  Shield, 
  Plus, 
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';

const teamMembers = [
  { name: 'Jorge Silva', email: 'jorge.bmw96@gmail.com', role: 'Admin', status: 'Ativo' },
  { name: 'Ana Souza', email: 'ana.souza@universidade.edu', role: 'Auditor', status: 'Ativo' },
  { name: 'Marcos Lima', email: 'marcos.lima@universidade.edu', role: 'Visualizador', status: 'Pendente' },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'integrations' | 'team'>('integrations');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500">Gerencie integrações de API e permissões da sua equipe.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('integrations')}
          className={cn(
            "px-6 py-3 text-sm font-bold transition-all border-b-2",
            activeTab === 'integrations' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Integrações
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('team')}
          className={cn(
            "px-6 py-3 text-sm font-bold transition-all border-b-2",
            activeTab === 'team' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipe & Acessos
          </div>
        </button>
      </div>

      {activeTab === 'integrations' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Chaves de API</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Google Cloud Vision</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value="************************"
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono text-sm"
                  />
                  <button className="absolute right-3 top-2 text-xs font-bold text-blue-600 hover:underline">Alterar</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Gemini AI (Google)</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value="************************"
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono text-sm"
                  />
                  <button className="absolute right-3 top-2 text-xs font-bold text-blue-600 hover:underline">Alterar</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Token Solis (MEC)</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value="************************"
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono text-sm"
                  />
                  <button className="absolute right-3 top-2 text-xs font-bold text-blue-600 hover:underline">Alterar</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-white p-4 rounded-full shadow-sm">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-bold text-slate-900">Segurança de Dados</h4>
            <p className="text-sm text-slate-500 max-w-xs">
              Suas chaves são criptografadas em repouso (AES-256) e nunca são expostas no front-end após a configuração inicial.
            </p>
            <button className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
              Ver documentação de segurança
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold">Gerenciar Usuários</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Convidar Membro
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">E-mail</th>
                  <th className="px-6 py-4 font-semibold">Nível de Acesso</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMembers.map((member) => (
                  <tr key={member.email} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{member.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold",
                        member.role === 'Admin' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "flex items-center gap-1.5 text-xs font-bold",
                        member.status === 'Ativo' ? "text-emerald-600" : "text-amber-600"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", member.status === 'Ativo' ? "bg-emerald-600" : "bg-amber-600")} />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
