import React, { useState } from 'react';
import { Key, Save, Server, Shield, Database, CheckCircle, Loader2 } from 'lucide-react';

const SettingsView: React.FC = () => {
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  // Aqui ficarão as chaves do cliente
  const [chaves, setChaves] = useState({
    gemini: 'AIzaSyD... (oculto)',
    vision: 'AIzaSyD... (oculto)',
    solis: '317d509... (oculto)',
    emailEsp: 'comercial@iteqescolas.com.br',
    senhaEsp: '••••••••••••'
  });

  const handleSalvar = () => {
    setSalvando(true);
    // Simulação visual de salvamento. Depois ligaremos no Supabase!
    setTimeout(() => {
      setSalvando(false);
      setSalvoSucesso(true);
      setTimeout(() => setSalvoSucesso(false), 3000);
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cofre de Integrações</h1>
        <p className="text-slate-500 mt-1">Gerencie as credenciais e chaves de API da sua instituição de forma segura.</p>
      </div>

      {/* BLOCO GOOGLE / IA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Server className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-800">APIs do Google (Inteligência Artificial)</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Google Gemini API Key (Cérebro da IA)</label>
            <div className="relative">
              <Key className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input 
                type="password" 
                value={chaves.gemini} 
                onChange={e => setChaves({...chaves, gemini: e.target.value})} 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Google Cloud Vision API Key (Leitura OCR)</label>
            <div className="relative">
              <Key className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input 
                type="password" 
                value={chaves.vision} 
                onChange={e => setChaves({...chaves, vision: e.target.value})} 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO ACADÊMICO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Database className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-slate-800">Integração Acadêmica (Solis & ESP)</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Token Master (Solis API)</label>
            <div className="relative">
              <Shield className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input 
                type="password" 
                value={chaves.solis} 
                onChange={e => setChaves({...chaves, solis: e.target.value})} 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">E-mail do Portal (ESP)</label>
              <input 
                type="text" 
                value={chaves.emailEsp} 
                onChange={e => setChaves({...chaves, emailEsp: e.target.value})} 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Senha do Portal (ESP)</label>
              <input 
                type="password" 
                value={chaves.senhaEsp} 
                onChange={e => setChaves({...chaves, senhaEsp: e.target.value})} 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSalvar} 
          disabled={salvando} 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-sm disabled:opacity-70"
        >
          {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : (salvoSucesso ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
          {salvando ? 'Criptografando e salvando...' : (salvoSucesso ? 'Salvo com Sucesso!' : 'Salvar Configurações')}
        </button>
      </div>
    </div>
  );
};

export { SettingsView };