import React, { useState, useEffect } from 'react';
import { Search, Download, FileCode, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AlunoEmitido {
  id: string;
  nome_planilha: string;
  cpf: string;
  curso_alvo: string;
  status: string;
  dados_extraidos?: {
    urls_finais?: {
      historico_pdf?: string;
      diploma_xml?: string;
    };
  };
}

export const HistoryView: React.FC = () => {
  const [alunos, setAlunos] = useState<AlunoEmitido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const fetchEmitidos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alunos_dossie')
        .select('*')
        .eq('status', 'EMITIDO_SOLIS')
        .order('nome_planilha', { ascending: true });

      if (error) throw error;
      setAlunos(data as AlunoEmitido[]);
    } catch (error) {
      console.error('Erro ao buscar alunos emitidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmitidos();
  }, []);

  const alunosFiltrados = alunos.filter(a => 
    a.nome_planilha.toLowerCase().includes(busca.toLowerCase()) || 
    a.cpf.includes(busca)
  );

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
        <p className="text-slate-500 mt-2">Pesquise alunos e faça o download dos Históricos e Diplomas emitidos.</p>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Pesquisar por nome ou CPF..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
        />
      </div>

      {/* TABELA DE ALUNOS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                <th className="p-4">Aluno</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Curso Emitido</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Documentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alunosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum aluno encontrado ou emitido ainda.
                  </td>
                </tr>
              ) : (
                alunosFiltrados.map((aluno) => {
                  const urls = aluno.dados_extraidos?.urls_finais;
                  
                  return (
                    <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{aluno.nome_planilha}</td>
                      <td className="p-4 text-slate-500 font-mono text-sm">
                        {aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                      </td>
                      <td className="p-4 text-slate-600 text-sm">{aluno.curso_alvo}</td>
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
                            <div 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg cursor-not-allowed group relative"
                            >
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