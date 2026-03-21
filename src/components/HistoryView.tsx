import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const HistoryView: React.FC = () => {
  const [historico, setHistorico] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarHistorico = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('alunos_dossie')
          .select('id, nome_planilha, cpf, curso_alvo, status, data_processamento')
          .order('id', { ascending: false })
          .limit(100);

        if (error) throw error;
        if (data) setHistorico(data);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      } finally {
        setLoading(false);
      }
    };
    buscarHistorico();
  }, []);

  const historicoFiltrado = historico.filter(aluno => 
    aluno.nome_planilha.toLowerCase().includes(busca.toLowerCase()) || 
    aluno.cpf.includes(busca)
  );

  const getStatusBadge = (status: string) => {
      switch (status) {
        case 'EMITIDO_SOLIS': 
          return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Enviado para Registro</span>;
        case 'REPROVADO_IA':
        case 'REPROVADO_ROTA': 
          return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3"/> Falha na Auditoria</span>;
        case 'EM_ANALISE_IA': 
          return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Processando (IA)</span>;
        case 'AGUARDANDO_ROBO':
        default: 
          return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3"/> Fila de Espera</span>;
      }
    };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Histórico e Compliance</h1>
        <p className="text-slate-500 mt-1">Registo de auditoria completo para o MEC. Pesquisa por Nome ou CPF.</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-2 mr-3" />
        <input 
          type="text" 
          placeholder="Procurar aluno..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome do Aluno</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">CPF</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Curso Alvo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historicoFiltrado.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhum registo encontrado.</td></tr>
              ) : (
                historicoFiltrado.map(aluno => (
                  <tr key={aluno.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg"><FileText className="w-4 h-4 text-slate-500" /></div>
                      {aluno.nome_planilha}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm font-mono">{aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{aluno.curso_alvo}</td>
                    <td className="px-6 py-4">{getStatusBadge(aluno.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export { HistoryView };