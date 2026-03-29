import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Calculator, Filter, TrendingDown, TrendingUp, DollarSign, 
  Clock, FileSignature, BrainCircuit, FileText, Loader2, PiggyBank, CheckCircle
} from 'lucide-react';

interface Lote {
  id: string;
  nome_lote: string;
}

interface AlunoEmitido {
  id: string;
  lote_id: string;
}

export const CostCenterView: React.FC = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [alunosEmitidos, setAlunosEmitidos] = useState<AlunoEmitido[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroLote, setFiltroLote] = useState('TODOS');

  // Variáveis Financeiras Configuráveis (O usuário pode alterar na tela)
  const [config, setConfig] = useState({
    custoAssinatura: 0.50,       // Preço de 1 assinatura na Solis
    custoRegistro: 5.00,         // Preço do registro do Diploma na IES
    custoMedioApiAluno: 0.15,    // Média de gasto de Vision + Gemini por aluno
    horaFuncionario: 18.50,      // Valor da hora do funcionário que faria o trabalho
    minutosPorAluno: 45,         // Tempo médio que um humano leva para analisar 1 aluno
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      console.log('📊 A carregar dados financeiros do Supabase...');

      // 1. Busca os lotes para o filtro
      const { data: lotesData, error: lotesError } = await supabase
        .from('lotes')
        .select('id, nome_lote')
        .order('data_criacao', { ascending: false });

      if (lotesError) throw lotesError;
      setLotes(lotesData as Lote[]);

      // 2. Busca apenas os alunos que foram emitidos com sucesso
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos_dossie')
        .select('id, lote_id')
        .eq('status', 'EMITIDO_SOLIS');

      if (alunosError) throw alunosError;
      
      console.log(`✅ Foram encontrados ${alunosData.length} alunos faturáveis.`);
      setAlunosEmitidos(alunosData as AlunoEmitido[]);

    } catch (error) {
      console.error('❌ Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Handler para atualizar os inputs de configuração
  const handleConfigChange = (campo: keyof typeof config, valor: string) => {
    const num = parseFloat(valor);
    setConfig(prev => ({ ...prev, [campo]: isNaN(num) ? 0 : num }));
  };

  // ─── LÓGICA MATEMÁTICA DO CENTRO DE CUSTOS ─────────────────────────────────

  // Filtra os alunos com base no lote selecionado
  const alunosFiltrados = alunosEmitidos.filter(a => 
    filtroLote === 'TODOS' || a.lote_id === filtroLote
  );

  const totalAlunos = alunosFiltrados.length;
  
  // Custos da Máquina (SaaS)
  const qtdAssinaturas = totalAlunos * 3; // 3 assinaturas por aluno
  const custoTotalAssinaturas = qtdAssinaturas * config.custoAssinatura;
  const custoTotalRegistro = totalAlunos * config.custoRegistro;
  const custoTotalAPIs = totalAlunos * config.custoMedioApiAluno;
  
  const custoOperacaoSaaS = custoTotalAssinaturas + custoTotalRegistro + custoTotalAPIs;

  // Custos do Trabalho Manual (O que a IES gastaria)
  const horasTotaisManuais = (totalAlunos * config.minutosPorAluno) / 60;
  const custoOperacaoManual = horasTotaisManuais * config.horaFuncionario;

  // O grande número: A Economia!
  const economiaGerada = custoOperacaoManual - custoOperacaoSaaS;
  const percentualEconomia = custoOperacaoManual > 0 
    ? ((economiaGerada / custoOperacaoManual) * 100).toFixed(1) 
    : '0.0';

  // Formatador de Moeda BRL
  const formataMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Centro de Custos e ROI</h1>
        <p className="text-slate-500 mt-2">Acompanhe a economia gerada pelo sistema e os custos operacionais por lote.</p>
      </div>

      {/* ─── BARRA DE CONTROLO SUPERIOR ─────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-6 justify-between">
        
        {/* Filtro de Lote */}
        <div className="flex-1 max-w-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-500" /> Filtrar Visão por Lote
          </label>
          <select
            value={filtroLote}
            onChange={(e) => setFiltroLote(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
          >
            <option value="TODOS">Todos os Lotes Processados</option>
            {lotes.map(lote => (
              <option key={lote.id} value={lote.id}>{lote.nome_lote}</option>
            ))}
          </select>
        </div>

        {/* Variáveis Ajustáveis */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" title="Custo unitário de uma assinatura">Assinatura (R$)</label>
            <input type="number" step="0.01" value={config.custoAssinatura} onChange={(e) => handleConfigChange('custoAssinatura', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" title="Custo para registrar o diploma">Registro IES (R$)</label>
            <input type="number" step="0.01" value={config.custoRegistro} onChange={(e) => handleConfigChange('custoRegistro', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" title="Custo médio estimado de IA e OCR por aluno">Custo APIs (R$)</label>
            <input type="number" step="0.01" value={config.custoMedioApiAluno} onChange={(e) => handleConfigChange('custoMedioApiAluno', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" title="Valor pago por hora ao funcionário">Hora Colab. (R$)</label>
            <input type="number" step="0.01" value={config.horaFuncionario} onChange={(e) => handleConfigChange('horaFuncionario', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-400" />
          </div>
        </div>
      </div>

      {/* ─── CARDS DE INDICADORES PRINCIPAIS ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 p-8 bg-blue-50 rounded-full opacity-50"><FileText className="w-8 h-8 text-blue-500" /></div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Volume do Lote</h3>
          <p className="text-3xl font-black text-slate-800">{totalAlunos}</p>
          <p className="text-sm font-medium text-blue-600 mt-2">alunos processados</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 p-8 bg-amber-50 rounded-full opacity-50"><Clock className="w-8 h-8 text-amber-500" /></div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Tempo Manual Poupado</h3>
          <p className="text-3xl font-black text-slate-800">{horasTotaisManuais.toFixed(0)}h</p>
          <p className="text-sm font-medium text-amber-600 mt-2">de trabalho humano evitado</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 p-8 bg-red-50 rounded-full opacity-50"><TrendingDown className="w-8 h-8 text-red-500" /></div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Custo com Equipa (Se Manual)</h3>
          <p className="text-3xl font-black text-slate-800">{formataMoeda(custoOperacaoManual)}</p>
          <p className="text-sm font-medium text-slate-500 mt-2">Custo projetado da IES</p>
        </div>

        <div className="bg-emerald-600 p-6 rounded-2xl border border-emerald-500 shadow-md relative overflow-hidden text-white">
          <div className="absolute -right-4 -top-4 p-8 bg-emerald-500 rounded-full opacity-50"><PiggyBank className="w-8 h-8 text-white" /></div>
          <h3 className="text-sm font-bold text-emerald-100 uppercase tracking-wider mb-1">Economia Gerada (ROI)</h3>
          <p className="text-3xl font-black text-white">{formataMoeda(economiaGerada)}</p>
          <p className="text-sm font-medium text-emerald-200 mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> {percentualEconomia}% de poupança financeira
          </p>
        </div>
      </div>

      {/* ─── DETALHAMENTO DOS CUSTOS DA MÁQUINA ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Calculator className="w-6 h-6 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-800">Detalhamento dos Custos do Sistema (SaaS)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Assinaturas */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileSignature className="w-5 h-5" /></div>
                <h4 className="font-semibold text-slate-700">Assinaturas Solis</h4>
              </div>
              <p className="text-sm text-slate-500 mb-1">Total de assinaturas: <span className="font-bold text-slate-700">{qtdAssinaturas}</span></p>
              <p className="text-sm text-slate-500 mb-1">Taxa por unidade: <span className="font-bold text-slate-700">{formataMoeda(config.custoAssinatura)}</span></p>
              <p className="text-xs text-slate-400 mt-4 italic">* Considerando 3 assinaturas legais por dossiê completo.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-2xl font-bold text-slate-800">{formataMoeda(custoTotalAssinaturas)}</p>
            </div>
          </div>

          {/* Registros */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle className="w-5 h-5" /></div>
                <h4 className="font-semibold text-slate-700">Registro de Diplomas</h4>
              </div>
              <p className="text-sm text-slate-500 mb-1">Diplomas a registrar: <span className="font-bold text-slate-700">{totalAlunos}</span></p>
              <p className="text-sm text-slate-500 mb-1">Taxa por unidade: <span className="font-bold text-slate-700">{formataMoeda(config.custoRegistro)}</span></p>
              <p className="text-xs text-slate-400 mt-4 italic">* Cobrança da IES ou Ministério da Educação pelo registo formal.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-2xl font-bold text-slate-800">{formataMoeda(custoTotalRegistro)}</p>
            </div>
          </div>

          {/* Inteligência Artificial */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><BrainCircuit className="w-5 h-5" /></div>
                <h4 className="font-semibold text-slate-700">Consumo de IA & OCR</h4>
              </div>
              <p className="text-sm text-slate-500 mb-1">Consultas realizadas: <span className="font-bold text-slate-700">{totalAlunos} dossiês</span></p>
              <p className="text-sm text-slate-500 mb-1">Média por aluno: <span className="font-bold text-slate-700">{formataMoeda(config.custoMedioApiAluno)}</span></p>
              <p className="text-xs text-slate-400 mt-4 italic">* Engloba custos de infraestrutura do Google Vision, Gemini e/ou OpenAI.</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-2xl font-bold text-slate-800">{formataMoeda(custoTotalAPIs)}</p>
            </div>
          </div>

        </div>
        
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-slate-600 uppercase tracking-wide text-sm">Custo Total da Operação (Neste Lote)</span>
          <span className="text-3xl font-black text-slate-900">{formataMoeda(custoOperacaoSaaS)}</span>
        </div>

      </div>
    </div>
  );
};