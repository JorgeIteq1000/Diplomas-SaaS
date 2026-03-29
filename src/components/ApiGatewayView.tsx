import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Webhook, Key, Copy, Plus, Trash2, Activity, Code, Loader2, CheckCircle, Zap } from 'lucide-react';

interface WebhookOutbound {
  id: string;
  url: string;
  evento: string;
  ativo: boolean;
  criado_em: string;
}

export const ApiGatewayView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Estados de Inbound (Entrada)
  const [apiToken, setApiToken] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Estados de Outbound (Saída)
  const [webhooks, setWebhooks] = useState<WebhookOutbound[]>([]);
  const [novaUrl, setNovaUrl] = useState('');
  const [novoEvento, setNovoEvento] = useState('DIPLOMA_REGISTRADO');

  const fetchGatewayData = async () => {
    try {
      setLoading(true);
      console.log('🔌 [Gateway] Buscando configurações de API e Webhooks do banco...');
      
      // 1. Busca o Token da tabela config_sistema
      const { data: configData, error: configError } = await supabase
        .from('config_sistema')
        .select('api_token')
        .eq('id', 1)
        .single();
        
      if (configError) throw configError;
      if (configData?.api_token) setApiToken(configData.api_token);

      // 2. Busca todos os webhooks cadastrados
      const { data: hooksData, error: hooksError } = await supabase
        .from('webhooks_outbound')
        .select('*')
        .order('criado_em', { ascending: false });

      if (hooksError) throw hooksError;
      setWebhooks(hooksData as WebhookOutbound[]);
      
    } catch (error) {
      console.error('❌ [Gateway] Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGatewayData();
  }, []);

  const handleCopiarToken = () => {
    navigator.clipboard.writeText(apiToken);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    console.log('📋 [Gateway] Token copiado para a área de transferência.');
  };

  const handleGerarNovoToken = async () => {
    if(!window.confirm('Atenção: Gerar um novo Token invalidará o antigo imediatamente. As integrações atuais (TOTVS, ERP) pararão de funcionar até serem atualizadas. Deseja continuar?')) return;
    
    console.log('🔄 [Gateway] Gerando e salvando novo token de API...');
    const novoToken = `sk_live_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    
    try {
      const { error } = await supabase
        .from('config_sistema')
        .update({ api_token: novoToken })
        .eq('id', 1);

      if (error) throw error;
      setApiToken(novoToken);
      alert('Token de segurança atualizado com sucesso!');
    } catch (error: any) {
      console.error('❌ [Gateway] Erro ao renovar token:', error);
      alert(`Erro ao renovar token: ${error.message}`);
    }
  };

  const handleAdicionarWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaUrl) return;

    setSalvando(true);
    console.log(`📡 [Gateway] Adicionando novo webhook para o evento: ${novoEvento}`);
    
    try {
      const { data, error } = await supabase
        .from('webhooks_outbound')
        .insert([{ url: novaUrl, evento: novoEvento }])
        .select()
        .single();
      
      if (error) throw error;
      
      setWebhooks([data as WebhookOutbound, ...webhooks]);
      setNovaUrl('');
      console.log('✅ [Gateway] Webhook adicionado com sucesso no banco!');
    } catch (error: any) {
      console.error('❌ [Gateway] Erro ao adicionar webhook:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverWebhook = async (id: string) => {
    if(!window.confirm('Remover este Webhook? A sua aplicação deixará de receber estes avisos.')) return;
    
    console.log(`🗑️ [Gateway] Removendo webhook ID: ${id}`);
    try {
      const { error } = await supabase.from('webhooks_outbound').delete().eq('id', id);
      if (error) throw error;
      
      setWebhooks(webhooks.filter(w => w.id !== id));
      console.log('✅ [Gateway] Webhook removido do banco.');
    } catch (error: any) {
      console.error('❌ [Gateway] Erro ao remover webhook:', error);
      alert(`Erro ao remover: ${error.message}`);
    }
  };

  const traduzirEvento = (evento: string) => {
    switch (evento) {
      case 'DIPLOMA_REGISTRADO': return { texto: 'Diploma Registrado com Sucesso', cor: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'ERRO_AUDITORIA': return { texto: 'Erro na Mesa de Auditoria (Fraude/Ilegível)', cor: 'bg-red-100 text-red-700 border-red-200' };
      case 'LOTE_CONCLUIDO': return { texto: 'Lote de Produção Finalizado', cor: 'bg-blue-100 text-blue-700 border-blue-200' };
      default: return { texto: evento, cor: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  if (loading) return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          Gateway Universal (API & Webhooks)
        </h1>
        <p className="text-slate-500 mt-2">Conecte o AutoCert ao seu ERP, TOTVS, Lyceum ou CRM de forma instantânea e agnóstica.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* ─── COLUNA 1: INBOUND (ENTRADA DE DADOS VIA API) ────────────────── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-800">API de Entrada (Inbound)</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm text-slate-600 leading-relaxed">
                Utilize este <strong>Bearer Token</strong> para autenticar as requisições do seu sistema acadêmico direto para a nossa esteira de produção. Nunca compartilhe esta chave.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seu Token de Produção</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 block px-4 py-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-sm overflow-hidden text-ellipsis">
                    {apiToken}
                  </code>
                  <button 
                    onClick={handleCopiarToken}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border border-indigo-200"
                    title="Copiar Token"
                  >
                    {copiado ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-3 text-right">
                  <button onClick={handleGerarNovoToken} className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
                    Gerar nova chave (Revogar atual)
                  </button>
                </div>
              </div>

              {/* Exemplo de Código para o TI da Faculdade brilhar os olhos */}
              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" /> Exemplo de Integração (cURL)
                </label>
                <div className="bg-slate-800 rounded-xl p-4 overflow-x-auto border border-slate-700 shadow-inner">
                  <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                    <span className="text-pink-400">curl</span> -X POST https://api.autocert.com/v1/dossie \<br/>
                    &nbsp;&nbsp;-H <span className="text-emerald-300">"Authorization: Bearer {apiToken.substring(0,10)}..."</span> \<br/>
                    &nbsp;&nbsp;-H <span className="text-emerald-300">"Content-Type: application/json"</span> \<br/>
                    &nbsp;&nbsp;-d <span className="text-amber-300">'{'{'}"nome": "Jorge", "cpf": "12345678900", "curso": "Direito"{'}'}'</span>
                  </pre>
                </div>
                <p className="text-xs text-slate-400 mt-2">* Ao disparar, o aluno entra automaticamente na fila com status AGUARDANDO_ROBO.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLUNA 2: OUTBOUND (SAÍDA VIA WEBHOOKS) ─────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Webhook className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-800">Webhooks (Eventos de Saída)</h2>
              </div>
            </div>

            {/* Formulário de Novo Webhook */}
            <form onSubmit={handleAdicionarWebhook} className="p-6 border-b border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Adicionar Novo Gatilho
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">URL de Destino (Endpoint)</label>
                  <input
                    type="url" required
                    value={novaUrl} onChange={e => setNovaUrl(e.target.value)}
                    placeholder="https://seu-crm.com/api/receber"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  />
                </div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Evento (Quando disparar?)</label>
                    <select
                      value={novoEvento} onChange={e => setNovoEvento(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-slate-700"
                    >
                      <option value="DIPLOMA_REGISTRADO">✅ Quando Diploma for Registrado</option>
                      <option value="ERRO_AUDITORIA">🚨 Quando cair na Mesa de Auditoria</option>
                      <option value="LOTE_CONCLUIDO">📦 Quando um Lote inteiro finalizar</option>
                    </select>
                  </div>
                  <button 
                    type="submit" disabled={salvando}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 h-[42px]"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar
                  </button>
                </div>
              </div>
            </form>

            {/* Lista de Webhooks Ativos */}
            <div className="p-6 flex-1 bg-slate-50/30">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Endpoints Configurados ({webhooks.length})</h3>
              
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  Nenhum webhook configurado.
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map(hook => {
                    const info = traduzirEvento(hook.evento);
                    return (
                      <div key={hook.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-4">
                        <div className="overflow-hidden flex-1">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border mb-2 ${info.cor}`}>
                            {info.texto}
                          </span>
                          <p className="text-sm font-mono text-slate-600 truncate" title={hook.url}>
                            {hook.url}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRemoverWebhook(hook.id)}
                          className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
                          title="Remover Integração"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};