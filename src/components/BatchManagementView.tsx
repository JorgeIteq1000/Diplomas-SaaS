import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLotes = async () => {
    try {
      setLoading(true);
      console.log('🔄 A buscar lotes na base de dados...');
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      
      if (data) {
        console.log(`✅ ${data.length} lotes encontrados!`, data);
        setLotes(data as Lote[]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar lotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotes();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`📂 Ficheiro selecionado: ${file.name}`);
    setUploading(true);

    try {
      // 1. Ler o ficheiro Excel
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Converter para JSON (esperamos um array de arrays para ignorar o cabeçalho facilmente)
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Filtrar linhas vazias e remover o cabeçalho (índice 0)
      const linhasValidas = data.filter(row => row.length >= 3);
      if (linhasValidas.length <= 1) {
        throw new Error('A planilha parece estar vazia ou não tem as colunas corretas (Nome, CPF, Curso).');
      }
      const alunosParaProcessar = linhasValidas.slice(1); // Ignora a linha 1 (cabeçalhos)
      
      console.log(`📊 Planilha lida com sucesso. Encontrados ${alunosParaProcessar.length} alunos.`);

      // 2. Criar o Registo do Lote na tabela 'lotes'
      const nomeDoLote = `Lote Automático - ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT')}`;
      console.log(`📦 A criar o lote: ${nomeDoLote}`);
      
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .insert([{ nome_lote: nomeDoLote, status: 'PENDENTE' }])
        .select()
        .single();

      if (loteError) throw loteError;
      console.log('✅ Lote criado com sucesso! ID:', loteData.id);

      // 3. Inserir os alunos na tabela 'alunos_dossie'
      const insertsAlunos = alunosParaProcessar.map(linha => {
        // Assume que a estrutura do Excel é: [Nome, CPF, Curso]
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

      console.log('⏳ A enviar lista de alunos para a base de dados...', insertsAlunos);
      const { error: alunosError } = await supabase
        .from('alunos_dossie')
        .insert(insertsAlunos);

      if (alunosError) throw alunosError;
      
      console.log('🚀 Sucesso absoluto! Alunos na fila de espera.');
      alert('Upload concluído com sucesso! Os alunos estão na fila.');
      
      // Atualizar a tabela visual no ecrã
      fetchLotes();

    } catch (error: any) {
      console.error('❌ Erro catastrófico no upload:', error);
      alert(`Erro ao processar o ficheiro: ${error.message}`);
    } finally {
      setUploading(false);
      // Limpar o input para permitir enviar o mesmo ficheiro novamente
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
        <p className="text-slate-500 mt-2">Faça o upload da planilha e acompanhe a fila de processamento da IA.</p>
      </div>

      {/* ÁREA DE UPLOAD FUNCIONAL */}
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      
      <div 
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white transition-colors group ${uploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-6 group-hover:scale-110 transition-transform">
          {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-semibold text-slate-700 mb-2">
          {uploading ? 'A ler e gravar alunos...' : 'Clique para selecionar o ficheiro Excel'}
        </h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Faça o upload da <span className="font-semibold text-slate-700">Planilha .XLSX</span> de alunos para disparar o robô.
        </p>
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
                      <h4 className="text-lg font-medium text-slate-900">{lote.nome_lote}</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        Criado em: {new Date(lote.data_criacao).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}>
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