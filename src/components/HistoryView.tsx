import React, { useState, useEffect } from 'react';
import { Search, Download, FileCode, Lock, CheckCircle, Loader2, Filter, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LoteInfo {
  id: string;
  nome_lote: string;
}

interface AlunoEmitido {
  id: string;
  nome_planilha: string;
  cpf: string;
  curso_alvo: string;
  status: string;
  lote_id: string;
  lotes?: LoteInfo; // Recebe o JOIN do banco de dados
  dados_extraidos?: {
    urls_finais?: {
      historico_pdf?: string;
      diploma_xml?: string;
      diploma_pdf?: string;
    };
  };
}

export const HistoryView: React.FC = () => {
  const [alunos, setAlunos] = useState<AlunoEmitido[]>([]);
  const [lotesDisponiveis, setLotesDisponiveis] = useState<LoteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroLote, setFiltroLote] = useState('TODOS');

  // Estados para a edição do Lote na tabela
  const [editandoLoteAlunoId, setEditandoLoteAlunoId] = useState<string | null>(null);
  const [novoLoteIdSelecionado, setNovoLoteIdSelecionado] = useState<string>('');
  const [atualizandoLote, setAtualizandoLote] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // 1. Busca os alunos emitidos e faz um JOIN com a tabela lotes para pegar o nome
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos_dossie')
        .select('*, lotes(id, nome_lote)')
        .eq('status', 'EMITIDO_SOLIS')
        .order('nome_planilha', { ascending: true });

      if (alunosError) throw alunosError;
      setAlunos(alunosData as AlunoEmitido[]);

      // 2. Busca todos os lotes globais para o Filtro e para o Dropdown de Troca
      const { data: lotesData, error: lotesError } = await supabase
        .from('lotes')
        .select('id, nome_lote')
        .order('data_criacao', { ascending: false });

      if (lotesError) throw lotesError;
      setLotesDisponiveis(lotesData as LoteInfo[]);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Função que salva a troca de lote no banco e atualiza a tela
  const handleSalvarTrocaLote = async (alunoId: string) => {
    if (!novoLoteIdSelecionado) return;
    
    try {
      setAtualizandoLote(true);
      const { error } = await supabase
        .from('alunos_dossie')
        .update({ lote_id: novoLoteIdSelecionado })
        .eq('id', alunoId);

      if (error) throw error;
      
      // Atualiza o visual sem precisar recarregar o banco
      const loteNome = lotesDisponiveis.find(l => l.id === novoLoteIdSelecionado)?.nome_lote || '';
      setAlunos(alunosAtuais => 
        alunosAtuais.map(aluno => {
          if (aluno.id === alunoId) {
            return { 
              ...aluno, 
              lote_id: novoLoteIdSelecionado,
              lotes: { id: novoLoteIdSelecionado, nome_lote: loteNome } 
            };
          }
          return aluno;
        })
      );
      
      setEditandoLoteAlunoId(null);
      
    } catch (error: any) {
      alert(`Erro ao trocar de lote: ${error.message}`);
    } finally {
      setAtualizandoLote(false);
    }
  };

  // Aplica os filtros combinados (Texto + Lote)
  const alunosFiltrados = alunos.filter(a => {
    const matchBusca = a.nome_planilha.toLowerCase().includes(busca.toLowerCase()) || a.cpf.includes(busca);
    const matchLote = filtroLote === 'TODOS' || a.lote_id === filtroLote;
    return matchBusca && matchLote;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Acervo de Documentos</h1>
        <p className="text-slate-500 mt-2">Pesquise, filtre por Lotes e baixe os documentos emitidos.</p>
      </div>

      {/* BARRA DE PESQUISA E FILTRO */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou CPF..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
          />
        </div>

        <div className="relative w-80">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Filter className="w-5 h-5" />
          </div>
          <select
            value={filtroLote}
            onChange={(e) => setFiltroLote(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all appearance-none text-slate-700 font-medium"
          >
            <option value="TODOS">Todos os Lotes</option>
            {lotesDisponiveis.map(lote => (
              <option key={lote.id} value={lote.id}>
                {lote.nome_lote}
              </option>
            ))}
          </select>
          {/* Ícone de Seta do Select */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {/* TABELA DE ALUNOS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                <th className="p-4">Aluno</th>
                <th className="p-4">Lote Pertencente</th>
                <th className="p-4">Curso Emitido</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Documentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alunosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum aluno encontrado ou emitido ainda para este filtro.
                  </td>
                </tr>
              ) : (
                alunosFiltrados.map((aluno) => {
                  const urls = aluno.dados_extraidos?.urls_finais;
                  
                  return (
                    <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{aluno.nome_planilha}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
                      </td>
                      
                      {/* CÉLULA DO LOTE (COM EDIÇÃO INLINE) */}
                      <td className="p-4">
                        {editandoLoteAlunoId === aluno.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px] truncate bg-white"
                              value={novoLoteIdSelecionado}
                              onChange={(e) => setNovoLoteIdSelecionado(e.target.value)}
                            >
                              <option value="" disabled>Selecione um lote...</option>
                              {lotesDisponiveis.map(l => (
                                <option key={l.id} value={l.id}>{l.nome_lote}</option>
                              ))}
                            </select>
                            <button 
                              onClick={() => handleSalvarTrocaLote(aluno.id)}
                              disabled={atualizandoLote}
                              className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                              title="Salvar Novo Lote"
                            >
                              {atualizandoLote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => setEditandoLoteAlunoId(null)}
                              className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="text-slate-600 text-sm font-medium truncate max-w-[180px]" title={aluno.lotes?.nome_lote || 'Sem Lote'}>
                              {aluno.lotes?.nome_lote || 'Sem Lote'}
                            </span>
                            <button 
                              onClick={() => {
                                setEditandoLoteAlunoId(aluno.id);
                                setNovoLoteIdSelecionado(aluno.lote_id || '');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                              title="Mover Aluno para outro Lote"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-slate-600 text-sm max-w-[200px] truncate" title={aluno.curso_alvo}>{aluno.curso_alvo}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Emitido
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* BOTÃO 1: HISTÓRICO PDF */}
                          {urls?.historico_pdf ? (
                            <a 
                              href={urls.historico_pdf} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                              title="Baixar Histórico Escolar (PDF)"
                            >
                              <Download className="w-4 h-4" /> Histórico
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg">
                              Sem Histórico
                            </span>
                          )}

                          {/* BOTÃO 2: DIPLOMA XML */}
                          {urls?.diploma_xml ? (
                            <a 
                              href={urls.diploma_xml} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                              title="Baixar Diploma para Registro (XML)"
                            >
                              <FileCode className="w-4 h-4" /> XML Diploma
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg">
                              Sem XML
                            </span>
                          )}

                          {/* BOTÃO 3: DIPLOMA PDF (DINÂMICO) */}
                          {urls?.diploma_pdf ? (
                            <a 
                              href={urls.diploma_pdf} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                              title="Baixar Diploma Registrado (PDF)"
                            >
                              <Download className="w-4 h-4" /> Diploma PDF
                            </a>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg cursor-not-allowed group relative">
                              <Lock className="w-3.5 h-3.5" /> Diploma PDF
                              {/* Tooltip Hover */}
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs text-center rounded shadow-lg z-10">
                                Aguardando o Registro oficial da Instituição de Ensino.
                              </div>
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};