import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, Shield, User, UserPlus, Trash2, Loader2, Mail } from 'lucide-react';

interface Colaborador {
  id: string;
  email: string;
  perfil: 'ADMIN' | 'COLABORADOR';
  criado_em: string;
}

export const TeamManagementView: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Estados do formulário
  const [novoEmail, setNovoEmail] = useState('');
  const [novoPerfil, setNovoPerfil] = useState<'ADMIN' | 'COLABORADOR'>('COLABORADOR');

  const fetchEquipe = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setColaboradores(data as Colaborador[]);
    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipe();
  }, []);

  const handleAdicionarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail) return;

    try {
      setSalvando(true);
      const { error } = await supabase
        .from('colaboradores')
        .insert([{ email: novoEmail.toLowerCase(), perfil: novoPerfil }]);

      if (error) {
        if (error.code === '23505') throw new Error('Este e-mail já está cadastrado na equipe.');
        throw error;
      }

      alert('Colaborador adicionado com sucesso! Ele já terá o acesso restrito configurado quando fizer o login.');
      setNovoEmail('');
      setNovoPerfil('COLABORADOR');
      fetchEquipe();
    } catch (error: any) {
      alert(`Erro ao adicionar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverColaborador = async (id: string, email: string) => {
    if (!window.confirm(`Tem a certeza que deseja remover o acesso de ${email}?`)) return;
    try {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id);
      if (error) throw error;
      fetchEquipe();
    } catch (error: any) {
      alert(`Erro ao remover: ${error.message}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[80vh]"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Equipe</h1>
        <p className="text-slate-500 mt-2">Adicione colaboradores e controle o nível de acesso ao sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO */}
        <div className="lg:col-span-1">
          <form onSubmit={handleAdicionarColaborador} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" /> Novo Membro
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email" 
                    required
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="joao@faculdade.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nível de Acesso</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setNovoPerfil('COLABORADOR')}
                    className={`px-3 py-2 border rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${novoPerfil === 'COLABORADOR' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    <User className="w-4 h-4" /> Operação
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNovoPerfil('ADMIN')}
                    className={`px-3 py-2 border rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${novoPerfil === 'ADMIN' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    <Shield className="w-4 h-4" /> Admin
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {novoPerfil === 'ADMIN' ? '👑 Admins têm acesso ao Centro de Custos e Equipe.' : '👷 Operação apenas processa lotes e audita documentos.'}
                </p>
              </div>

              <button 
                type="submit" 
                disabled={salvando}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar Membro'}
              </button>
            </div>
          </form>
        </div>

        {/* COLUNA DIREITA: LISTA DE USUÁRIOS */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Users className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-800">Membros Ativos ({colaboradores.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {colaboradores.map(colab => (
                <div key={colab.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${colab.perfil === 'ADMIN' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {colab.perfil === 'ADMIN' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{colab.email}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Adicionado em {new Date(colab.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${colab.perfil === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {colab.perfil}
                    </span>
                    <button 
                      onClick={() => handleRemoverColaborador(colab.id, colab.email)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover Acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};