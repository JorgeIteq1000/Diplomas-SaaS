import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, XCircle, FileText, ChevronRight, Loader2, Save, ShieldAlert, UserCheck, UploadCloud, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ConfiancaIA {
  nome?: number;
  rg?: number;
  data_nascimento?: number;
  data_colacao?: number;
  geral?: number;
}

interface AlunoErro {
  id: string;
  nome_planilha: string;
  cpf: string;
  curso_alvo: string;
  motivo_reprovacao: string;
  status: string;
  documento_erro_url?: string;
  auditado_por?: string; // Campo de compliance
  dados_extraidos?: {
    dados_formulario?: {
      validacao_ia?: {
        nome?: string;
        rg?: string;
        data_nascimento?: string;
        data_colacao?: string;
      };
      confianca_ia?: ConfiancaIA;
    };
  };
}

// ─── Helpers de score ─────────────────────────────────────────────────────────

/**
 * Converte o status textual da IA num score aproximado.
 * Usado como fallback quando o campo confianca_ia não existe nos dados.
 */
function scoreFromStatus(status?: string): number {
  switch (status?.toUpperCase()) {
    case 'OK':         return 90;
    case 'DIVERGENTE': return 35;
    case 'ILEGIVEL':   return 18;
    case 'AUSENTE':    return 8;
    default:           return 50;
  }
}

/**
 * Retorna o score de confiança para um campo.
 * Prioriza o valor numérico; cai no fallback por status se necessário.
 */
function getCampoScore(
  campo: 'nome' | 'rg' | 'data_nascimento' | 'data_colacao',
  aluno: AlunoErro
): number {
  const confianca = aluno.dados_extraidos?.dados_formulario?.confianca_ia;
  const validacao = aluno.dados_extraidos?.dados_formulario?.validacao_ia;

  if (confianca?.[campo] !== undefined) return confianca[campo]!;
  return scoreFromStatus(validacao?.[campo]);
}

/**
 * Calcula o score geral como média dos 4 campos principais.
 */
function getScoreGeral(aluno: AlunoErro): number {
  const confiancaGeral = aluno.dados_extraidos?.dados_formulario?.confianca_ia?.geral;
  if (confiancaGeral !== undefined) return confiancaGeral;

  const campos: Array<'nome' | 'rg' | 'data_nascimento' | 'data_colacao'> =
    ['nome', 'rg', 'data_nascimento', 'data_colacao'];
  const soma = campos.reduce((acc, c) => acc + getCampoScore(c, aluno), 0);
  return Math.round(soma / campos.length);
}

// ─── Sub-componente: Barra de Confiança ───────────────────────────────────────

interface ConfiancaBarProps {
  label: string;
  score: number;
  statusTexto?: string;
}

const ConfiancaBar: React.FC<ConfiancaBarProps> = ({ label, score, statusTexto }) => {
  const { cor, bgLeve, texto } = resolveCorScore(score);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {statusTexto && statusTexto !== 'OK' && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bgLeve} ${texto}`}>
              {statusTexto}
            </span>
          )}
          <span className={`text-sm font-bold tabular-nums ${texto}`}>
            {score}%
          </span>
        </div>
      </div>

      {/* Trilha da barra */}
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

// ─── Helpers visuais ──────────────────────────────────────────────────────────

function resolveCorScore(score: number): { cor: string; bgLeve: string; texto: string; label: string } {
  if (score >= 75) return { cor: 'bg-emerald-500', bgLeve: 'bg-emerald-100', texto: 'text-emerald-700', label: 'Verificar' };
  if (score >= 40) return { cor: 'bg-amber-400',   bgLeve: 'bg-amber-100',   texto: 'text-amber-700',   label: 'Atenção'   };
  return              { cor: 'bg-red-500',          bgLeve: 'bg-red-100',     texto: 'text-red-700',     label: 'Crítico'   };
}

function BadgePrioridade({ score }: { score: number }) {
  const { bgLeve, texto, label } = resolveCorScore(score);
  const icone = score >= 75 ? '●' : score >= 40 ? '◐' : '◉';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${bgLeve} ${texto}`}>
      <span className="text-[10px]">{icone}</span>
      {label} · {score}%
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const AuditDeskView: React.FC = () => {
  const [alunosComErro, setAlunosComErro] = useState<AlunoErro[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoErro | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState<string>('Auditor'); 

  const [formData, setFormData] = useState({ nome: '', rg: '', dataNascimento: '', dataColacao: '' });
  
  // Estado para a injeção do PDF
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pega o e-mail do usuário logado
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUsuarioLogado(data.user.email);
      }
    });
  }, []);

  const fetchErros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alunos_dossie')
        .select('*')
        .in('status', ['REPROVADO_IA', 'REPROVADO_ROTA'])
        .order('nome_planilha', { ascending: true });

      if (error) throw error;

      // Ordenar pela confiança geral crescente — os casos mais críticos primeiro
      const ordenados = (data as AlunoErro[]).sort(
        (a, b) => getScoreGeral(a) - getScoreGeral(b)
      );

      setAlunosComErro(ordenados);

      if (ordenados.length > 0 && !alunoSelecionado) {
        selecionarAluno(ordenados[0]);
      } else if (ordenados.length === 0) {
        setAlunoSelecionado(null);
      }
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchErros(); }, []);

  const selecionarAluno = (aluno: AlunoErro) => {
    setAlunoSelecionado(aluno);
    setFormData({ nome: aluno.nome_planilha, rg: '', dataNascimento: '', dataColacao: '' });
    setArquivoNovo(null); // Limpa o anexo se trocar de aluno
  };

  const getInputClass = (campo: 'nome' | 'rg' | 'data_nascimento' | 'data_colacao') => {
    const validacao = alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia;
    if (!validacao || !validacao[campo] || validacao[campo] === 'OK') {
      return 'w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors';
    }
    return 'w-full px-4 py-2 border-2 border-red-500 bg-red-50 text-red-900 rounded-lg focus:ring-2 focus:ring-red-500 outline-none placeholder-red-300 transition-colors';
  };

  const handleForcarAprovacao = async () => {
    if (!alunoSelecionado) return;
    try {
      setSalvando(true);
      
      let novoDocUrl = null;
      
      // 1. Faz o upload do novo PDF se o usuário tiver anexado um
      if (arquivoNovo) {
        const nomeArquivoStorage = `${alunoSelecionado.id}_correcao_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('documentos_auditoria')
          .upload(nomeArquivoStorage, arquivoNovo, { contentType: 'application/pdf', upsert: true });
          
        if (uploadError) throw uploadError;
        
        // Pega a URL pública gerada
        const { data: publicUrlData } = supabase.storage.from('documentos_auditoria').getPublicUrl(nomeArquivoStorage);
        novoDocUrl = publicUrlData.publicUrl;
      }

      // 2. Salva todas as informações no Supabase
      const { error } = await supabase
        .from('alunos_dossie')
        .update({
          status: 'AGUARDANDO_ROBO',
          motivo_reprovacao: `Corrigido por ${usuarioLogado}. Aguardando reprocessamento.`,
          correcoes_manuais: { 
            nome: formData.nome, 
            rg: formData.rg, 
            dataNascimento: formData.dataNascimento, 
            dataColacao: formData.dataColacao,
            novo_documento_url: novoDocUrl // Injeta a URL no JSON para o Python ler!
          },
          auditado_por: usuarioLogado 
        })
        .eq('id', alunoSelecionado.id);

      if (error) throw error;
      alert('Aluno corrigido e devolvido para a fila do robô!');
      setAlunoSelecionado(null);
      fetchErros();
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

  // Scores do aluno seleccionado (calculados uma vez)
  const scoreNome    = alunoSelecionado ? getCampoScore('nome',            alunoSelecionado) : 0;
  const scoreRg      = alunoSelecionado ? getCampoScore('rg',              alunoSelecionado) : 0;
  const scoreNasc    = alunoSelecionado ? getCampoScore('data_nascimento',  alunoSelecionado) : 0;
  const scoreColacao = alunoSelecionado ? getCampoScore('data_colacao',     alunoSelecionado) : 0;
  const scoreGeral   = alunoSelecionado ? getScoreGeral(alunoSelecionado) : 0;

  const validacaoAtual = alunoSelecionado?.dados_extraidos?.dados_formulario?.validacao_ia;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">

      {/* ── LISTA LATERAL ─────────────────────────────────────────────────── */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            Mesa de Auditoria
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {alunosComErro.length} {alunosComErro.length === 1 ? 'documento' : 'documentos'} pendentes
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
            alunosComErro.map((aluno) => {
              const sg = getScoreGeral(aluno);
              const isSelected = alunoSelecionado?.id === aluno.id;
              return (
                <div
                  key={aluno.id}
                  onClick={() => selecionarAluno(aluno)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-800 line-clamp-1 text-sm">{aluno.nome_planilha}</h4>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ml-1 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                  </div>

                  <p className="text-xs font-mono text-slate-400 mb-3">
                    {aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${resolveCorScore(sg).cor}`}
                        style={{ width: `${sg}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${resolveCorScore(sg).texto}`}>
                      {sg}%
                    </span>
                  </div>

                  <BadgePrioridade score={sg} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── PAINEL PRINCIPAL ──────────────────────────────────────────────── */}
      {alunoSelecionado ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* Visualizador de PDF */}
          <div className="flex-1 p-4 bg-slate-200 flex items-center justify-center">
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
                <p className="text-slate-500 text-sm">O PDF original não foi encontrado ou não subiu para a nuvem.</p>
              </div>
            )}
          </div>

          {/* Painel de correção */}
          <div className="w-full lg:w-1/2 bg-white overflow-y-auto p-6 lg:p-8">

            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Parecer da Auditoria</h2>
                <p className="text-sm text-slate-500 mt-0.5">{alunoSelecionado.nome_planilha}</p>
              </div>
              <div className={`flex flex-col items-center px-4 py-3 rounded-2xl border-2 ${
                scoreGeral >= 75 ? 'border-emerald-200 bg-emerald-50' :
                scoreGeral >= 40 ? 'border-amber-200 bg-amber-50' :
                'border-red-200 bg-red-50'
              }`}>
                <span className={`text-3xl font-bold tabular-nums leading-none ${resolveCorScore(scoreGeral).texto}`}>
                  {scoreGeral}%
                </span>
                <span className={`text-xs font-semibold mt-1 ${resolveCorScore(scoreGeral).texto}`}>
                  Confiança geral
                </span>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
              <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Motivo da Reprovação
              </h3>
              <p className="text-red-700 text-sm leading-relaxed">
                {alunoSelecionado.motivo_reprovacao || 'A IA não conseguiu validar a documentação.'}
              </p>
            </div>

            {/* ── ÁREA DE INJEÇÃO DE PDF ────────────────────────────────── */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                Anexar Documento Legível (Opcional)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Se a imagem original estiver ilegível, anexe aqui o novo PDF para o robô baixar e substituir na pasta.
              </p>
              
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => { 
                  if (e.target.files?.[0]) setArquivoNovo(e.target.files[0]); 
                }}
              />
              
              {arquivoNovo ? (
                <div className="flex items-center justify-between bg-white border border-blue-300 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-red-500" />
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{arquivoNovo.name}</span>
                  </div>
                  <button onClick={() => setArquivoNovo(null)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Clique para selecionar o PDF limpo
                </button>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                Confiança por Campo
              </h3>
              <div className="space-y-4">
                <ConfiancaBar label="Nome Completo" score={scoreNome} statusTexto={validacaoAtual?.nome} />
                <ConfiancaBar label="Número do RG" score={scoreRg} statusTexto={validacaoAtual?.rg} />
                <ConfiancaBar label="Data de Nascimento" score={scoreNasc} statusTexto={validacaoAtual?.data_nascimento} />
                <ConfiancaBar label="Data de Colação" score={scoreColacao} statusTexto={validacaoAtual?.data_colacao} />
              </div>
            </div>

            {/* ── FORMULÁRIO DE CORREÇÃO ────────────────────────────────── */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-slate-800 border-b pb-2">
                Correção Manual
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome Completo Correto
                  {scoreNome < 75 && (
                    <span className={`ml-2 text-xs font-semibold ${resolveCorScore(scoreNome).texto}`}>
                      · IA com {scoreNome}% de confiança
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={getInputClass('nome')}
                  placeholder="Nome do Aluno"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data de Nascimento
                    {scoreNasc < 75 && (
                      <span className={`ml-1 text-xs font-semibold ${resolveCorScore(scoreNasc).texto}`}>
                        · {scoreNasc}%
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                    className={getInputClass('data_nascimento')}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Número do RG
                    {scoreRg < 75 && (
                      <span className={`ml-1 text-xs font-semibold ${resolveCorScore(scoreRg).texto}`}>
                        · {scoreRg}%
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className={getInputClass('rg')}
                    placeholder="Ex: 12.345.678-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data de Colação de Grau
                  {scoreColacao < 75 && (
                    <span className={`ml-2 text-xs font-semibold ${resolveCorScore(scoreColacao).texto}`}>
                      · IA com {scoreColacao}% de confiança
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.dataColacao}
                  onChange={(e) => setFormData({ ...formData, dataColacao: e.target.value })}
                  className={getInputClass('data_colacao')}
                  placeholder="DD/MM/AAAA"
                />
              </div>

              {/* Aviso quando há campo crítico */}
              {[scoreNome, scoreRg, scoreNasc, scoreColacao].some(s => s < 40) && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">
                    Um ou mais campos têm confiança abaixo de 40%. Verifique o documento com atenção antes de forçar a aprovação.
                  </p>
                </div>
              )}

              {/* Registro de Auditoria / Compliance */}
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <UserCheck className="w-4 h-4" />
                <span>Esta correção será registrada em nome de: <strong>{usuarioLogado}</strong></span>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleForcarAprovacao}
                  disabled={salvando}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {salvando
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Save className="w-5 h-5" />
                  }
                  Forçar Aprovação & Injetar Correções
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