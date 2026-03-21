import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Clock, Shield, FileSignature, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const historyData = [
  { 
    id: 'TRK-9921', 
    studentName: 'Ana Beatriz Silva', 
    cpf: '455.***.***-01', 
    course: 'Direito', 
    status: 'Assinado Digitalmente',
    timeline: [
      { time: '10:00', event: 'Upload do Lote', details: 'Lote LOTE-001 processado por Admin.' },
      { time: '10:05', event: 'Análise OCR', details: 'Google Vision detectou 100% de nitidez nos documentos.' },
      { time: '10:06', event: 'Parecer Gemini IA', details: 'Aprovado sem ressalvas. Dados conferem com a base acadêmica.' },
      { time: '10:15', event: 'Assinatura Digital', details: 'Certificado emitido com selo de autenticidade MEC.' },
    ]
  },
  { 
    id: 'TRK-9922', 
    studentName: 'Carlos Eduardo Lima', 
    cpf: '112.***.***-44', 
    course: 'Engenharia Civil', 
    status: 'Aguardando Auditoria',
    timeline: []
  },
  { 
    id: 'TRK-9923', 
    studentName: 'Mariana Costa', 
    cpf: '882.***.***-12', 
    course: 'Psicologia', 
    status: 'Assinado Digitalmente',
    timeline: []
  },
];

export function HistoryView() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Histórico & Compliance</h1>
        <p className="text-slate-500">Rastreabilidade total exigida pelo MEC para diplomas digitais.</p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou curso..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
          <Filter className="w-4 h-4" />
          Filtros Avançados
        </button>
        <button className="bg-slate-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-colors">
          Exportar Relatório
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold w-10"></th>
              <th className="px-6 py-4 font-semibold">ID Rastreio</th>
              <th className="px-6 py-4 font-semibold">Aluno</th>
              <th className="px-6 py-4 font-semibold">CPF</th>
              <th className="px-6 py-4 font-semibold">Curso</th>
              <th className="px-6 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historyData.map((row) => (
              <React.Fragment key={row.id}>
                <tr 
                  className={cn(
                    "hover:bg-slate-50 transition-colors cursor-pointer",
                    expandedRow === row.id && "bg-blue-50/30"
                  )}
                  onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                >
                  <td className="px-6 py-4">
                    {expandedRow === row.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{row.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.studentName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.cpf}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.course}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      row.status === 'Assinado Digitalmente' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}>
                      {row.status}
                    </span>
                  </td>
                </tr>
                {expandedRow === row.id && (
                  <tr>
                    <td colSpan={6} className="px-12 py-8 bg-slate-50/50">
                      <div className="max-w-3xl">
                        <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                          Trilha de Auditoria (Compliance MEC)
                        </h4>
                        <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                          {row.timeline.length > 0 ? row.timeline.map((item, idx) => (
                            <div key={idx} className="relative pl-8">
                              <div className="absolute left-0 top-1.5 w-6 h-6 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center z-10">
                                {idx === 3 ? <FileSignature className="w-3 h-3 text-blue-600" /> : <CheckCircle className="w-3 h-3 text-blue-600" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-400">{item.time}</span>
                                <span className="text-sm font-bold text-slate-900">{item.event}</span>
                                <span className="text-sm text-slate-500">{item.details}</span>
                              </div>
                            </div>
                          )) : (
                            <div className="flex items-center gap-3 text-slate-400 italic text-sm">
                              <Clock className="w-4 h-4" />
                              Processamento em andamento...
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
