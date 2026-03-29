import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lock, Mail, Loader2, GraduationCap, UserCheck, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLoginSucesso: () => void;
}

const LoginView: React.FC<LoginProps> = ({ onLoginSucesso }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  
  // Estado para controlar se estamos no modo Login ou Primeiro Acesso
  const [isPrimeiroAcesso, setIsPrimeiroAcesso] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      if (isPrimeiroAcesso) {
        console.log(`🔍 [Primeiro Acesso] Verificando se o e-mail ${email} está na tabela de colaboradores...`);
        
        // 1. Verifica se o e-mail foi cadastrado por um Admin na "Lista VIP"
        const { data: colaborador, error: fetchError } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Erro ao consultar banco:', fetchError);
          throw new Error('Erro ao verificar autorização no sistema.');
        }

        if (!colaborador) {
          console.warn(`🚫 [Primeiro Acesso] O e-mail ${email} não foi encontrado na lista de permitidos.`);
          throw new Error('E-mail não autorizado. Solicite o seu acesso a um Administrador.');
        }

        console.log('✅ [Primeiro Acesso] E-mail liberado! A criar credenciais de acesso no Auth...');
        
        // 2. Cria o usuário no cofre de autenticação do Supabase (A senha é definida aqui)
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            throw new Error('Este e-mail já possui uma senha registada. Volte e faça o login normal.');
          }
          throw signUpError;
        }

        console.log('🎉 [Primeiro Acesso] Sucesso! Conta registada e sessão iniciada.');
        onLoginSucesso();

      } else {
        // Fluxo normal de Login
        console.log(`🔐 [Login] Tentando autenticar ${email}...`);
        
        const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });

        if (error) {
          console.warn('❌ [Login] Falha na autenticação:', error.message);
          throw new Error('E-mail ou palavra-passe incorretos.');
        }
        
        console.log('✅ [Login] Sucesso! Bem-vindo de volta.');
        onLoginSucesso();
      }
    } catch (err: any) {
      setErro(err.message || 'Ocorreu um erro inesperado.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl shadow-lg mb-4">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
          AutoCert
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Plataforma de Automação de Diplomas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200 relative overflow-hidden">
          
          {/* Barra superior de destaque para o Primeiro Acesso */}
          {isPrimeiroAcesso && (
            <div className="absolute top-0 left-0 w-full bg-emerald-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-wide">
              Modo de Primeiro Acesso
            </div>
          )}

          <div className={isPrimeiroAcesso ? "mt-4" : ""}>
            <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">
              {isPrimeiroAcesso ? 'Defina a sua Palavra-passe' : 'Acesse a sua conta'}
            </h3>

            <form className="space-y-5" onSubmit={handleAuth}>
              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <span className="mt-0.5 block">⚠️</span>
                  <span>{erro}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Email corporativo</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 border outline-none bg-slate-50 focus:bg-white transition-colors"
                    placeholder="seunome@faculdade.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  {isPrimeiroAcesso ? 'Crie a sua palavra-passe' : 'Palavra-passe'}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 border outline-none bg-slate-50 focus:bg-white transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                {isPrimeiroAcesso && <p className="text-xs text-slate-400 mt-1">Mínimo de 6 caracteres.</p>}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 transition-colors ${
                    isPrimeiroAcesso 
                      ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    isPrimeiroAcesso ? 'Salvar Palavra-passe & Entrar' : 'Entrar no Sistema'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6">
              {isPrimeiroAcesso ? (
                <button
                  type="button"
                  onClick={() => { setIsPrimeiroAcesso(false); setErro(''); }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para o Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsPrimeiroAcesso(true); setErro(''); }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 py-3 rounded-lg border border-blue-200 border-dashed"
                >
                  <UserCheck className="w-4 h-4" /> Primeiro Acesso? Configure a sua senha
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LoginView };