import React, { useState } from 'react';
import { 
  BrainCircuit, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileText,
  User,
  CreditCard,
  Calendar,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AuditDeskView() {
  const [formData, setFormData] = useState({
    name: 'RICARDO OLIVEIRA SANTOS',
    cpf: '123.456.789-00',
    rg: 'MG-12.345.678',
    birthDate: '15/05/1998',
    graduationDate: '20/12/2023'
  });

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-500">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mesa de Auditoria</h1>
          <p className="text-slate-500">Resolva pendências de leitura que a IA sinalizou.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-bold text-slate-900">12</span> de 45 pendências
          </div>
          <div className="flex gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Document Viewer */}
        <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden flex items-center justify-center group">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/doc/800/1200')] bg-cover bg-center opacity-40 blur-sm" />
          <div className="relative z-10 bg-white p-8 shadow-2xl rounded-lg border border-slate-200 max-w-md w-full">
            <div className="flex items-center justify-between mb-8 border-b pb-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documento de Identidade</span>
            </div>
            <div className="space-y-6">
              <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
              <div className="h-32 w-full bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-300 text-sm italic">Área de Assinatura</span>
              </div>
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Divergência Detectada
          </div>
        </div>

        {/* Right: Review Panel */}
        <div className="w-[450px] flex flex-col gap-4 overflow-y-auto pr-2">
          {/* AI Reasoning */}
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <BrainCircuit className="w-5 h-5" />
              Raciocínio da IA
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
              "O documento apresenta uma mancha de desgaste na região do nome. A confiança na leitura do sobrenome <strong>'SANTOS'</strong> é de apenas 62%. Recomendo validação humana para evitar erro no registro do MEC."
            </p>
          </div>

          {/* Correction Form */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Dados do Aluno
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.cpf}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                    <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">RG</label>
                  <input 
                    type="text" 
                    value={formData.rg}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Data de Nasc.</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.birthDate}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    />
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Colação de Grau</label>
                  <input 
                    type="text" 
                    value={formData.graduationDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
            <button className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
              Forçar Aprovação
            </button>
            <button className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-bold hover:bg-red-100 transition-all">
              <XCircle className="w-5 h-5" />
              Reprovar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
