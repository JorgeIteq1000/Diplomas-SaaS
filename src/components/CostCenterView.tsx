import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, Clock, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const CostCenterView: React.FC = () => {
  const [dados, setDados] = useState({ processados: 0, emitidos: 0 });
  const [loading, setLoading] = useState(true);

  // Custos Estimados (Podes ajustar estes valores)
  const CUSTO_HUMANO_POR_DIPLOMA = 25.00; // R$ 25 gastos num colaborador manual
  const CUSTO_API_POR_DIPLOMA = 1.20; // R$ 1.20 gasto em Gemini + Vision
  const HORAS_HUMANAS_POR_DIPLOMA = 0.5; // 30 minutos por diploma

  useEffect(() => {
    const buscarDados = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.from('alunos_dossie').select('status');
        if (data) {
          const emitidos = data.filter(a => a.status === 'EMITIDO_SOLIS').length;
          setDados({ processados: data.length, emitidos });
        }
      } catch (error) {
        console.error('Erro nos custos:', error);
      } finally {
        setLoading(false);
      }
    };
    buscarDados();
  }, []);

  const custoTotalIA = dados.processados * CUSTO_API_POR_DIPLOMA;
  const custoEquivalenteHumano = dados.processados * CUSTO_HUMANO_POR_DIPLOMA;
  const economiaGerada = custoEquivalenteHumano - custoTotalIA;
  const horasPoupadas = Math.round(dados.emitidos * HORAS_HUMANAS_POR_DIPLOMA);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Centro de Custos e ROI</h1>
        <p className="text-slate-500 mt-1">Calculadora de retorno sobre o investimento e consumo de API.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-medium text-emerald-100">Economia Gerada</h3>
            <div className="p-2 bg-white/20 rounded-lg"><TrendingDown className="w-5 h-5" /></div>
          </div>
          <h2 className="text-4xl font-bold mb-1">R$ {economiaGerada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          <p className="text-emerald-100 text-sm">Comparado ao processo manual</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-medium text-slate-500">Horas Poupadas da Equipa</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clock className="w-5 h-5" /></div>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-1">{horasPoupadas}h</h2>
          <p className="text-slate-500 text-sm">Que podem ser realocadas noutras tarefas</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-medium text-slate-500">Custo Total em Nuvem (IA)</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Zap className="w-5 h-5" /></div>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-1">R$ {custoTotalIA.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          <p className="text-slate-500 text-sm">Google Cloud Vision + Gemini API</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          Simulador de Processamento Futuro
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 p-6 rounded-xl border border-slate-100">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-2">Quantos diplomas prevês emitir no próximo mês?</label>
            <input type="number" defaultValue="1000" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="hidden sm:block text-slate-300 font-light text-4xl">=</div>
          <div className="flex-1 w-full bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
            <p className="text-sm font-medium text-blue-600 mb-1">Custo Estimado (IA)</p>
            <p className="text-2xl font-bold text-blue-800">R$ 1.200,00</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export { CostCenterView };