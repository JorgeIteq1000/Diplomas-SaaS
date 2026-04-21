import React, { useState, useEffect } from 'react';
import { Search, Download, FileCode, Lock, CheckCircle, Loader2, Filter, Edit2, Save, X, ArrowDownAZ, ArrowUpZA, Send, Link } from 'lucide-react';
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
  lotes?: LoteInfo;
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
  const [cursosDisponiveis, setCursosDisponiveis] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros e Ordenação
  const [busca, setBusca] = useState('');
  const [filtroLote, setFiltroLote] = useState('TODOS');
  const [filtroCurso, setFiltroCurso] = useState('TODOS');
  const [ordemAlfabetica, setOrdemAlfabetica] = useState<'ASC' | 'DESC'>('ASC');

  // Estados para a edição do Lote na tabela
  const [editandoLoteAlunoId, setEditandoLoteAlunoId] = useState<string | null>(null);
  const [novoLoteIdSelecionado, setNovoLoteIdSelecionado] = useState<string>('');
  const [atualizandoLote, setAtualizandoLote] = useState(false);

  // Estados da vinculação de PDF
  const [uploadingPdfId, setUploadingPdfId] = useState<string | null>(null);

  const handleVincularLinkDrive = async (alunoId: string) => {
    const linkDrive = window.prompt("🔗 Insira o link oficial do Google Drive para o Diploma Registrado:");
    if (!linkDrive || linkDrive.trim() === '') return;

    try {
      setUploadingPdfId(alunoId);
      
      const alunoAtual = alunos.find(a => a.id === alunoId);
      if (!alunoAtual) return;

      const dadosExtraidosAtuais = alunoAtual.dados_extraidos || {};
      const urlsFinaisAtuais = dadosExtraidosAtuais.urls_finais || {};

      const novosDadosExtraidos = {
        ...dadosExtraidosAtuais,
        urlsFinais: {
          ...urlsFinaisAtuais,
          diploma_pdf: linkDrive.trim()
        },
        urls_finais: {
          ...urlsFinaisAtuais,
          diploma_pdf: linkDrive.trim()
        }
      };

      const { error: updateError } = await supabase
        .from('alunos_dossie')
        .update({ dados_extraidos: novosDadosExtraidos })
        .eq('id', alunoId);

      if (updateError) throw updateError;

      setAlunos(alunosAtuais => 
        alunosAtuais.map(aluno => 
          aluno.id === alunoId ? { ...aluno, dados_extraidos: novosDadosExtraidos } : aluno
        )
      );
      
    } catch (error: any) {
      alert(`Falha ao vincular o link: ${error.message}`);
    } finally {
      setUploadingPdfId(null);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos_dossie')
        .select('*, lotes(id, nome_lote)')
        // Atualizado para buscar alunos emitidos ou que já foram notificados
        .in('status', ['EMITIDO_SOLIS', 'AGUARDANDO_ENVIO', 'CONCLUIDO_NOTIFICADO']);

      if (alunosError) throw alunosError;
      
      const alunosCarregados = alunosData as AlunoEmitido[];
      setAlunos(alunosCarregados);

      const cursosUnicos = Array.from(new Set(alunosCarregados.map(a => a.curso_alvo))).filter(Boolean).sort();
      setCursosDisponiveis(cursosUnicos);

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

  const handleSalvarTrocaLote = async (alunoId: string) => {
    if (!novoLoteIdSelecionado) return;
    
    try {
      setAtualizandoLote(true);
      const { error } = await supabase
        .from('alunos_dossie')
        .update({ lote_id: novoLoteIdSelecionado })
        .eq('id', alunoId);

      if (error) throw error;
      
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

  // --- NOVA FUNÇÃO: DISPARO DE COMUNICAÇÃO MANUAL ---
  const handleDispararComunicacao = async (alunoId: string, nomeAluno: string) => {
    if (!window.confirm(`Tem a certeza que deseja notificar ${nomeAluno} agora? Confirme se os documentos já estão registrados.`)) return;
    
    try {
      const { error } = await supabase
        .from('alunos_dossie')
        .update({ status: 'AGUARDANDO_ENVIO' })
        .eq('id', alunoId);
      
      if (error) throw error;
      
      // Atualiza o status localmente para refletir na interface
      setAlunos(alunosAtuais => 
        alunosAtuais.map(aluno => 
          aluno.id === alunoId ? { ...aluno, status: 'AGUARDANDO_ENVIO' } : aluno
        )
      );
      
      alert("✅ Aluno enviado para a fila de comunicação! O robô fará o disparo em instantes.");
    } catch (error: any) {
      alert(`Erro ao agendar notificação: ${error.message}`);
    }
  };

  const alunosFiltradosEOrdenados = alunos
    .filter(a => {
      const matchBusca = a.nome_planilha.toLowerCase().includes(busca.toLowerCase()) || a.cpf.includes(busca);
      const matchLote = filtroLote === 'TODOS' || a.lote_id === filtroLote;
      const matchCurso = filtroCurso === 'TODOS' || a.curso_alvo === filtroCurso;
      return matchBusca && matchLote && matchCurso;
    })
    .sort((a, b) => {
      if (ordemAlfabetica === 'ASC') {
        return a.nome_planilha.localeCompare(b.nome_planilha);
      } else {
        return b.nome_planilha.localeCompare(a.nome_planilha);
      }
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
        <p className="text-slate-500 mt-2">Pesquise, filtre por Lotes/Cursos e baixe ou envie os documentos emitidos.</p>
      </div>

      <div className="flex gap-4 items-center">
        
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

        <div className="relative w-64">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Filter className="w-5 h-5" />
          </div>
          <select
            value={filtroLote}
            onChange={(e) => setFiltroLote(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all appearance-none text-slate-700 font-medium truncate"
          >
            <option value="TODOS">Todos os Lotes</option>
            {lotesDisponiveis.map(lote => (
              <option key={lote.id} value={lote.id}>
                {lote.nome_lote}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        <div className="relative w-64">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Filter className="w-5 h-5" />
          </div>
          <select
            value={filtroCurso}
            onChange={(e) => setFiltroCurso(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all appearance-none text-slate-700 font-medium truncate"
          >
            <option value="TODOS">Todos os Cursos</option>
            {cursosDisponiveis.map(curso => (
              <option key={curso} value={curso}>
                {curso}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        <button 
          onClick={() => setOrdemAlfabetica(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-700 flex items-center justify-center flex-shrink-0"
          title="Alternar Ordem Alfabética"
        >
          {ordemAlfabetica === 'ASC' ? <ArrowDownAZ className="w-5 h-5" /> : <ArrowUpZA className="w-5 h-5" />}
        </button>

      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                <th className="p-4">Aluno</th>
                <th className="p-4">Lote Pertencente</th>
                <th className="p-4">Curso Emitido</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações & Documentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alunosFiltradosEOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum aluno encontrado ou emitido ainda para este filtro.
                  </td>
                </tr>
              ) : (
                alunosFiltradosEOrdenados.map((aluno) => {
                  const urls = aluno.dados_extraidos?.urls_finais;
                  const isNotificado = aluno.status === 'CONCLUIDO_NOTIFICADO';
                  const isAguardandoEnvio = aluno.status === 'AGUARDANDO_ENVIO';
                  
                  return (
                    <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{aluno.nome_planilha}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
                      </td>
                      
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isNotificado ? 'bg-indigo-100 text-indigo-700' : isAguardandoEnvio ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isAguardandoEnvio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} 
                          {isNotificado ? 'Notificado' : isAguardandoEnvio ? 'Fila de Envio' : 'Emitido'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* BOTÃO DE DISPARO DE COMUNICAÇÃO (NOVO) */}
                          <button
                            onClick={() => handleDispararComunicacao(aluno.id, aluno.nome_planilha)}
                            disabled={isAguardandoEnvio}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-sm ${
                              isNotificado 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200' 
                                : isAguardandoEnvio
                                  ? 'bg-amber-100 text-amber-500 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                            title={isNotificado ? "Reenviar Documentos" : "Enviar Documentos ao Aluno"}
                          >
                            <Send className="w-4 h-4" /> {isNotificado ? "Reenviar" : "Notificar"}
                          </button>
                          
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
                            <button 
                              onClick={() => handleVincularLinkDrive(aluno.id)}
                              disabled={uploadingPdfId === aluno.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors group relative border border-slate-300 border-dashed hover:border-slate-400"
                            >
                              {uploadingPdfId === aluno.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />} 
                              Vincular Link GDrive
                            </button>
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