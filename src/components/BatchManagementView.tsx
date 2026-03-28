import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, Clock, AlertCircle, Loader2, Tag } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';

interface Lote {
  id: string;
  nome_lote: string;
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'COM_ERRO';
  data_criacao: string;
}

const BatchManagementView: React.FC = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [nomeLote, setNomeLote] = useState(''); // Estado para o nome digitado pelo usuário
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setLotes(data as Lote[]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar lotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Carrega os lotes a primeira vez que entra na página
    fetchLotes();

    // 2. Cria o "Rádio" para ouvir as mudanças no Supabase em Tempo Real
    const inscricaoLotes = supabase
      .channel('observador-lotes')
      .on(
        'postgres_changes',
        {
          event: '*', // Ouve qualquer coisa (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'lotes',
        },
        (payload) => {
          console.log('⚡ Mágica Realtime a acontecer! Lote atualizado:', payload);
          // Quando o Python atualiza o Lote, o React atualiza a tela na hora!
          fetchLotes(); 
        }
      )
      .subscribe();

    // 3. Desliga o rádio se sairmos da página (para poupar memória)
    return () => {
      supabase.removeChannel(inscricaoLotes);
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // 1. Ler o ficheiro Excel
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const linhasValidas = data.filter(row => row.length >= 3);
      if (linhasValidas.length <= 1) {
        throw new Error('A planilha parece estar vazia ou não tem as colunas corretas (Nome, CPF, Curso).');
      }
      const alunosParaProcessar = linhasValidas.slice(1); 
      
      // 2. Definir o nome do lote (Usa o que foi digitado, ou gera automático se vazio)
      const nomeFinalDoLote = nomeLote.trim() !== '' 
        ? nomeLote.trim() 
        : `Lote Automático - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
      
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .insert([{ nome_lote: nomeFinalDoLote, status: 'PENDENTE' }])
        .select()
        .single();

      if (loteError) throw loteError;

      // 3. Inserir os alunos na tabela 'alunos_dossie'
      const insertsAlunos = alunosParaProcessar.map(linha => {
        const nomeBruto = String(linha[0] || '').trim();
        const cpfBruto = String(linha[1] || '').trim().replace(/\D/g, '').padStart(11, '0');
        const cursoAlvo = String(linha[2] || '').trim();

        return {
          lote_id: loteData.id,
          cpf: cpfBruto,
          nome_planilha: nomeBruto,
          curso_alvo: cursoAlvo,
          status: 'AGUARDANDO_ROBO'
        };
      });

      const { error: alunosError } = await supabase
        .from('alunos_dossie')
        .insert(insertsAlunos);

      if (alunosError) throw alunosError;
      
      alert(`Upload concluído! O "${nomeFinalDoLote}" já está na fila do robô.`);
      
      setNomeLote(''); // Limpa o campo de texto
      fetchLotes(); // Atualiza a tabela

    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      alert(`Erro ao processar a planilha: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusDisplay = (status: Lote['status']) => {
    switch (status) {
      case 'CONCLUIDO': return { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', text: 'Concluído' };
      case 'PROCESSANDO': return { icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />, color: 'text-blue-700 bg-blue-50 border-blue-200', text: 'Processando...' };
      case 'COM_ERRO': return { icon: <AlertCircle className="w-5 h-5 text-red-500" />, color: 'text-red-700 bg-red-50 border-red-200', text: 'Com Erro' };
      default: return { icon: <Clock className="w-5 h-5 text-amber-500" />, color: 'text-amber-700 bg-amber-50 border-amber-200', text: 'Pendente' };
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Lotes</h1>
        <p className="text-slate-500 mt-2">Nomeie seu lote, faça o upload da planilha e acompanhe a fila de processamento da IA.</p>
      </div>

      {/* ÁREA DE CONFIGURAÇÃO E UPLOAD */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* INPUT DE NOME DO LOTE */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Nome do Lote <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={nomeLote}
              onChange={(e) => setNomeLote(e.target.value)}
              placeholder="Ex: Licenciaturas - Março 2026"
              className="block w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-700 font-medium placeholder-slate-400"
              disabled={uploading}
            />
          </div>
        </div>

        {/* ÁREA DE DRAG & DROP / CLICK */}
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        
        <div 
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-slate-300 rounded-xl p-10 text-center transition-colors group ${uploading ? 'bg-slate-50 opacity-70 cursor-not-allowed' : 'hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer'}`}
        >
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-transform ${uploading ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:scale-110'}`}>
            {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {uploading ? 'A enviar planilha e processar alunos...' : 'Clique para selecionar a Planilha Excel'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Formato esperado: <span className="font-semibold">.XLSX</span> com colunas de Nome, CPF e Curso.
          </p>
        </div>
      </div>

      {/* FILA DE PROCESSAMENTO */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          Fila de Processamento
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : lotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">Nenhum lote encontrado na base de dados.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {lotes.map((lote) => {
              const statusInfo = getStatusDisplay(lote.status);
              return (
                <div key={lote.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      {statusInfo.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800">{lote.nome_lote}</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        Criado em: {new Date(lote.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export { BatchManagementView };