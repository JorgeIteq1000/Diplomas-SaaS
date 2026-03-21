import React, { useState, useEffect } from 'react';
import { Users, FileCheck, BrainCircuit, Activity, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabaseClient';

const DashboardView: React.FC = () => {
  const [metricas, setMetricas] = useState({
    emitidos: 0,
    naFila: 0,
    taxaSucesso: 0,
    totalProcessados: 0
  });
  const [lotesRecentes, setLotesRecentes] = useState<any[]>([]);
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        // 1. Buscar Alunos para Métricas
        const { data: alunos, error: errAlunos } = await supabase.from('alunos_dossie').select('status, data_processamento');
        if (errAlunos) throw errAlunos;

        const emitidos = alunos.filter(a => a.status === 'EMITIDO_SOLIS').length;
        const naFila = alunos.filter(a => a.status === 'AGUARDANDO_ROBO' || a.status === 'EM_ANALISE_IA').length;
        const comErro = alunos.filter(a => a.status === 'REPROVADO_IA' || a.status === 'REPROVADO_ROTA').length;
        const totalProcessados = emitidos + comErro;
        const taxaSucesso = totalProcessados > 0 ? Math.round((emitidos / totalProcessados) * 100) : 0;

        setMetricas({ emitidos, naFila, taxaSucesso, totalProcessados });

        // 2. Buscar Lotes Recentes
        const { data: lotes } = await supabase.from('lotes').select('*').order('data_criacao', { ascending: false }).limit(5);
        if (lotes) setLotesRecentes(lotes);

        // 3. Simular dados do gráfico com base nos últimos 7 dias (para ter volume visual)
        const mockGrafico = [
          { name: 'Seg', emissoes: Math.floor(emitidos * 0.1) },
          { name: 'Ter', emissoes: Math.floor(emitidos * 0.2) },
          { name: 'Qua', emissoes: Math.floor(emitidos * 0.15) },
          { name: 'Qui', emissoes: Math.floor(emitidos * 0.3) },
          { name: 'Sex', emissoes: Math.floor(emitidos * 0.25) },
          { name: 'Sáb', emissoes: 0 },
          { name: 'Dom', emissoes: emitidos > 0 ? 1 : 0 },
        ];
        setDadosGrafico(mockGrafico);

      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Visão Geral</h1>
        <p className="text-slate-500 mt-1">Acompanha o desempenho do AutoCert AI em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Diplomas Emitidos</p>
              <h3 className="text-3xl font-bold text-slate-900">{metricas.emitidos}</h3>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600"><FileCheck className="w-6 h-6" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Taxa de Sucesso (IA)</p>
              <h3 className="text-3xl font-bold text-slate-900">{metricas.taxaSucesso}%</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><BrainCircuit className="w-6 h-6" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Alunos na Fila</p>
              <h3 className="text-3xl font-bold text-slate-900">{metricas.naFila}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600"><Users className="w-6 h-6" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Processado</p>
              <h3 className="text-3xl font-bold text-slate-900">{metricas.totalProcessados}</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600"><Activity className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px]">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Volume de Emissões (Últimos Dias)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosGrafico} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEmissoes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <Tooltip />
              <Area type="monotone" dataKey="emissoes" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorEmissoes)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Lotes Recentes</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {lotesRecentes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center mt-10">Nenhum lote processado ainda.</p>
            ) : (
              lotesRecentes.map(lote => (
                <div key={lote.id} className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                  <p className="font-semibold text-slate-800 text-sm truncate">{lote.nome_lote}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-white border border-slate-200 text-slate-600">
                      {lote.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(lote.data_criacao).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { DashboardView };