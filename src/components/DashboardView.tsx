import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  GraduationCap, 
  Clock, 
  Zap, 
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

const data = [
  { name: '01/03', value: 400 },
  { name: '05/03', value: 300 },
  { name: '10/03', value: 600 },
  { name: '15/03', value: 800 },
  { name: '20/03', value: 500 },
  { name: '25/03', value: 900 },
  { name: '30/03', value: 1200 },
];

const metrics = [
  { label: 'Diplomas Emitidos (Mês)', value: '4.280', change: '+12%', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Economia de Horas (ROI)', value: '840h', change: '+18%', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Taxa de Sucesso IA', value: '98.4%', change: '+0.2%', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Alunos em Fila', value: '156', change: '-5%', icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
];

const recentBatches = [
  { id: 'LOTE-001', name: 'Engenharia de Software - 2023.2', date: '21/03/2024', status: 'completed', count: 120 },
  { id: 'LOTE-002', name: 'Medicina - Campus Central', date: '21/03/2024', status: 'processing', count: 45 },
  { id: 'LOTE-003', name: 'Direito - Noturno', date: '20/03/2024', status: 'error', count: 88 },
];

export function DashboardView() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500">Bem-vindo ao AutoCert AI. Aqui está o resumo das operações.</p>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", m.bg)}>
                <m.icon className={cn("w-6 h-6", m.color)} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {m.change}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-500 font-medium">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Volume de Emissões (30 dias)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Últimos Lotes Processados</h3>
          <button className="text-sm text-blue-600 font-medium hover:underline">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">ID do Lote</th>
                <th className="px-6 py-4 font-semibold">Nome do Lote</th>
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Alunos</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{batch.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{batch.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{batch.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{batch.count}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      batch.status === 'completed' && "bg-emerald-50 text-emerald-700",
                      batch.status === 'processing' && "bg-blue-50 text-blue-700",
                      batch.status === 'error' && "bg-red-50 text-red-700"
                    )}>
                      {batch.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {batch.status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {batch.status === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                      {batch.status === 'completed' && 'Concluído'}
                      {batch.status === 'processing' && 'Processando'}
                      {batch.status === 'error' && 'Com Erro'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
