import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingDown, 
  Zap, 
  Cpu, 
  Database, 
  Calculator,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

const apiConsumption = [
  { name: 'Google Vision (OCR)', usage: '12.450 reqs', cost: 'R$ 622,50', icon: Cpu },
  { name: 'Tokens Gemini (IA)', usage: '4.2M tokens', cost: 'R$ 1.120,00', icon: Zap },
  { name: 'Taxa Solis (MEC)', usage: '4.280 registros', cost: 'R$ 8.560,00', icon: Database },
];

export function CostCenterView() {
  const [simAlunos, setSimAlunos] = useState(1000);

  const estimatedCost = simAlunos * 2.45;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Centro de Custos</h1>
        <p className="text-slate-500">Acompanhe o ROI e a previsibilidade financeira da operação.</p>
      </header>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Custo Total (Mês)</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">R$ 10.302,50</p>
          <p className="text-xs text-slate-400 mt-2">Ref. Março 2024</p>
        </div>

        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-emerald-700">Economia Gerada</span>
          </div>
          <p className="text-3xl font-bold text-emerald-900">R$ 45.200,00</p>
          <p className="text-xs text-emerald-600 mt-2">vs. Processo Manual Humano</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-50 p-2 rounded-lg text-slate-600">
              <Calculator className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Custo Médio / Diploma</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">R$ 2,41</p>
          <p className="text-xs text-slate-400 mt-2">Eficiência Operacional: 94%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Consumption */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Consumo de APIs</h3>
          <div className="space-y-4">
            {apiConsumption.map((api) => (
              <div key={api.name} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-2 rounded-md shadow-sm">
                    <api.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{api.name}</p>
                    <p className="text-xs text-slate-500">{api.usage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{api.cost}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulator */}
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calculator className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Simulador de Previsibilidade</h3>
            <p className="text-slate-400 text-sm mb-8">Planeje seu próximo semestre com base no volume de alunos.</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Volume de Alunos Previsto</label>
                <input 
                  type="range" 
                  min="100" 
                  max="10000" 
                  step="100"
                  value={simAlunos}
                  onChange={(e) => setSimAlunos(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-sm font-mono">
                  <span>100</span>
                  <span className="text-blue-400 font-bold">{simAlunos} Alunos</span>
                  <span>10.000</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Custo Estimado</p>
                  <p className="text-4xl font-bold text-white">R$ {estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <button className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-500 transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
