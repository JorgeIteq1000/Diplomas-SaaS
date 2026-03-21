import React, { useState } from 'react';
import { Upload, FileType, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const activeBatches = [
  { id: 'LOTE-002', name: 'Medicina - Campus Central', progress: 45, total: 100, startTime: '10:30' },
  { id: 'LOTE-004', name: 'Arquitetura - 2024.1', progress: 12, total: 80, startTime: '11:15' },
];

export function BatchManagementView() {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Lotes</h1>
        <p className="text-slate-500">Suba novos documentos e acompanhe a fila de processamento.</p>
      </header>

      {/* Upload Area */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-200",
          isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-400"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
      >
        <div className="bg-blue-600 p-4 rounded-full mb-6 shadow-lg shadow-blue-200">
          <Upload className="text-white w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Arraste seus arquivos aqui</h3>
        <p className="text-slate-500 text-center max-w-md mb-8">
          Envie o arquivo <span className="font-semibold text-slate-700">.ZIP</span> com os documentos (RG, Certidões) e a planilha <span className="font-semibold text-slate-700">.XLSX</span> com os dados dos alunos.
        </p>
        <div className="flex gap-4">
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Selecionar Arquivos
          </button>
          <button className="bg-white text-slate-700 border border-slate-200 px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors">
            Ver Modelos (.xlsx)
          </button>
        </div>
      </div>

      {/* Active Batches */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Processando Agora
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{activeBatches.length}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBatches.map((batch) => (
            <div key={batch.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <FileType className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{batch.name}</h4>
                    <p className="text-xs text-slate-500">Iniciado às {batch.startTime}</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Progresso</span>
                  <span className="text-blue-600 font-bold">{batch.progress}/{batch.total} alunos</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(batch.progress / batch.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                IA analisando documentos de identificação...
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
