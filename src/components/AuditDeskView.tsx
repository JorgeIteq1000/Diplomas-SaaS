import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, FileText, ChevronRight, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AlunoErro {
  id: string;
  nome_planilha: string;
  cpf: string;
  curso_alvo: string;
  motivo_reprovacao: string;
  status: string;
  documento_erro_url?: string;
  dados_extraidos?: any; // <-- ADICIONADO PARA LER OS STATUS DA IA
}

const AuditDeskView: React.FC = () => {
  const [alunosComErro, setAlunosComErro] = useState<AlunoErro[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoErro | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Campos do formulário para correção manual
  const [formData, setFormData] = useState({
    nome: '',
    rg: '',
    dataNascimento: '',
    dataColacao: ''
  });

  const fetchErros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alunos_dossie')
        .select('*')
        .in('status', ['REPROVADO_IA', 'REPROVADO_ROTA'])
        .order('nome_planilha', { ascending: true });

      if (error) throw error;
      setAlunosComErro(data as AlunoErro[]);
      
      // Se tiver alunos com erro e nenhum selecionado, seleciona o primeiro
      if (data && data.length > 0 && !alunoSelecionado) {
        selecionarAluno(data[0] as AlunoErro);
      } else if (data && data.length === 0) {
        setAlunoSelecionado(null);
      }
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErros();
  }, []);

  // Log para depurarmos com qualidade o que a IA está devolvendo
  useEffect(() => {
    if (alunoSelecionado) {
      console.log("🔍 Dados de Validação da IA:", alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia);
    }
  }, [alunoSelecionado]);

  // Função que decide a cor da caixinha baseado no status da IA
  const getInputClass = (campo: string) => {
    const validacao = alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia;
    
    // Se não tiver a tag de validação ou se estiver tudo "OK", fundo branco normal
    if (!validacao || !validacao[campo] || validacao[campo] === 'OK') {
      return "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors";
    }
    
    // Se a IA gritou erro (DIVERGENTE, ILEGIVEL, AUSENTE...), pinta de vermelhão!
    return "w-full px-4 py-2 border-2 border-red-500 bg-red-50 text-red-900 rounded-lg focus:ring-2 focus:ring-red-500 outline-none placeholder-red-300 transition-colors";
  };

  const selecionarAluno = (aluno: AlunoErro) => {
    setAlunoSelecionado(aluno);
    // Pré-preenche o formulário com o nome original da planilha para facilitar
    setFormData({
      nome: aluno.nome_planilha,
      rg: '',
      dataNascimento: '',
      dataColacao: ''
    });
  };

  const handleForcarAprovacao = async () => {
    if (!alunoSelecionado) return;
    
    try {
      setSalvando(true);
      
      const { error } = await supabase
        .from('alunos_dossie')
        .update({ 
          status: 'AGUARDANDO_ROBO',
          motivo_reprovacao: 'Corrigido manualmente pelo Auditor. Aguardando reprocessamento.',
          correcoes_manuais: {
            nome: formData.nome,
            rg: formData.rg,
            dataNascimento: formData.dataNascimento,
            dataColacao: formData.dataColacao
          }
        })
        .eq('id', alunoSelecionado.id);

      if (error) throw error;

      alert('Aluno corrigido e devolvido para a fila do robô com sucesso!');
      setAlunoSelecionado(null);
      fetchErros(); // Recarrega a lista
      
    } catch (error: any) {
      alert(`Erro ao forçar aprovação: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      
      {/* MENU LATERAL ESQUERDO: LISTA DE ALUNOS COM ERRO */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Mesa de Auditoria
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {alunosComErro.length} {alunosComErro.length === 1 ? 'documento precisa' : 'documentos precisam'} de revisão
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alunosComErro.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-slate-700 font-medium">Tudo Limpo!</h3>
              <p className="text-slate-500 text-sm">Nenhum erro encontrado pela IA.</p>
            </div>
          ) : (
            alunosComErro.map((aluno) => (
              <div 
                key={aluno.id}
                onClick={() => selecionarAluno(aluno)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  alunoSelecionado?.id === aluno.id 
                  ? 'border-blue-500 bg-blue-50 shadow-sm' 
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-800 line-clamp-1">{aluno.nome_planilha}</h4>
                  <ChevronRight className={`w-5 h-5 ${alunoSelecionado?.id === aluno.id ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
                <p className="text-xs font-mono text-slate-500 mb-2">CPF: {aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
                <div className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium line-clamp-1">
                  <XCircle className="w-3 h-3 mr-1" />
                  {aluno.status === 'REPROVADO_ROTA' ? 'Erro de Matriz/Curso' : 'Reprovado pela IA'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL DIREITA: DIVISÃO DE TELA (PDF + FORMULÁRIO) */}
      {alunoSelecionado ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          <div className="flex-1 p-4 bg-slate-200 flex items-center justify-center relative">
              {alunoSelecionado.documento_erro_url ? (
                <iframe 
                  src={`${alunoSelecionado.documento_erro_url}#toolbar=0`} 
                  className="w-full h-full rounded-xl shadow-inner border border-slate-300 bg-white"
                  title="Documento Reprovado"
                />
              ) : (
                <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 text-center max-w-sm">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h4 className="text-slate-700 font-medium mb-2">Sem Documento</h4>
                  <p className="text-slate-500 text-sm">
                    O PDF original não foi encontrado ou não subiu para a nuvem.
                  </p>
                </div>
              )}
            </div>

          {/* LADO DIREITO DA ÁREA DIREITA: PAINEL DE CORREÇÃO */}
          <div className="w-full lg:w-1/2 bg-white overflow-y-auto p-6 lg:p-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Parecer da Auditoria</h2>

            {/* CARD DE ERRO DA IA */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8 shadow-sm">
              <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Motivo da Reprovação
              </h3>
              <p className="text-red-700 text-sm leading-relaxed">
                {alunoSelecionado.motivo_reprovacao || 'A IA não conseguiu validar a documentação.'}
              </p>
            </div>

            {/* FORMULÁRIO DE CORREÇÃO MANUAL */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Correção Manual</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo Correto</label>
                <input 
                  type="text" 
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className={getInputClass('nome')}
                  placeholder="Nome do Aluno"
                />
                {alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia?.nome && 
                 alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.nome !== 'OK' && (
                  <span className="text-xs text-red-600 font-medium mt-1 block">
                    ⚠️ Nome {alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.nome.toLowerCase()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                  <input 
                    type="text" 
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})}
                    className={getInputClass('data_nascimento')}
                    placeholder="DD/MM/AAAA"
                  />
                  {alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia?.data_nascimento && 
                   alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.data_nascimento !== 'OK' && (
                    <span className="text-xs text-red-600 font-medium mt-1 block">
                      ⚠️ Data de nascimento {alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.data_nascimento.toLowerCase()}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número do RG</label>
                  <input 
                    type="text" 
                    value={formData.rg}
                    onChange={(e) => setFormData({...formData, rg: e.target.value})}
                    className={getInputClass('rg')}
                    placeholder="Ex: 12.345.678-9"
                  />
                  {alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia?.rg && 
                   alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.rg !== 'OK' && (
                    <span className="text-xs text-red-600 font-medium mt-1 block">
                      ⚠️ RG {alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.rg.toLowerCase()}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Colação de Grau (Anterior)</label>
                <input 
                  type="text" 
                  value={formData.dataColacao}
                  onChange={(e) => setFormData({...formData, dataColacao: e.target.value})}
                  className={getInputClass('data_colacao')}
                  placeholder="DD/MM/AAAA"
                />
                {alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia?.data_colacao && 
                 alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.data_colacao !== 'OK' && (
                  <span className="text-xs text-red-600 font-medium mt-1 block">
                    ⚠️ Colação {alunoSelecionado.dados_extraidos.dados_formulario.validacao_ia.data_colacao.toLowerCase()}
                  </span>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={handleForcarAprovacao}
                  disabled={salvando}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Forçar Aprovação & Reprocessar
                </button>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
          <FileText className="w-20 h-20 mb-4 opacity-50" />
          <p className="text-lg font-medium">Selecione um aluno na lista para auditar.</p>
        </div>
      )}

    </div>
  );
};

export { AuditDeskView };