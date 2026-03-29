import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, MessageCircle, Settings, Send, Clock, AlertTriangle, Save, Loader2, CheckCircle, Linkedin, Server, Lock, AtSign, Globe, Smartphone, Key, FileText, ListOrdered } from 'lucide-react';

export const CommunicationQueueView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  // Configurações do Motor, SMTP e WhatsApp
  const [config, setConfig] = useState({
    limiteDiario: 400,
    whatsappAtivo: false,
    assunto: '',
    corpo: '',
    smtpHost: '',
    smtpPort: 465,
    smtpUser: '',
    smtpPassword: '',
    waApiUrl: '',
    waToken: '',
    waTemplate: '',
    waVariaveis: '' // NOVO CAMPO PARA AS CHAVES {{1}}, {{2}}
  });

  // Métricas Simuladas da Fila
  const metricas = {
    enviadosHoje: 142,
    naFila: 38,
    erros: 0
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('config_sistema')
          .select('*')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setConfig({
            limiteDiario: data.limite_diario_email || 400,
            whatsappAtivo: data.whatsapp_ativo || false,
            assunto: data.email_assunto || '',
            corpo: data.email_corpo || '',
            smtpHost: data.smtp_host || '',
            smtpPort: data.smtp_port || 465,
            smtpUser: data.smtp_user || '',
            smtpPassword: data.smtp_password || '',
            waApiUrl: data.whatsapp_api_url || '',
            waToken: data.whatsapp_token || '',
            waTemplate: data.whatsapp_template_nome || '',
            waVariaveis: data.whatsapp_variaveis || ''
          });
        }
      } catch (error) {
        console.error('Erro ao buscar configurações de comunicação:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const { error } = await supabase
        .from('config_sistema')
        .update({
          limite_diario_email: config.limiteDiario,
          whatsapp_ativo: config.whatsappAtivo,
          email_assunto: config.assunto,
          email_corpo: config.corpo,
          smtp_host: config.smtpHost,
          smtp_port: config.smtpPort,
          smtp_user: config.smtpUser,
          smtp_password: config.smtpPassword,
          whatsapp_api_url: config.waApiUrl,
          whatsapp_token: config.waToken,
          whatsapp_template_nome: config.waTemplate,
          whatsapp_variaveis: config.waVariaveis,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;
      
      setSalvoSucesso(true);
      setTimeout(() => setSalvoSucesso(false), 3000);
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const percentualUso = Math.round((metricas.enviadosHoje / config.limiteDiario) * 100);

  if (loading) return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Mail className="w-8 h-8 text-blue-600" />
          Central de Comunicação
        </h1>
        <p className="text-slate-500 mt-2">Gira a fila de disparos, credenciais de e-mail e templates do WhatsApp API.</p>
      </div>

      {/* ─── PAINEL DE MÉTRICAS DA FILA ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Disparos Hoje</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{metricas.enviadosHoje} <span className="text-lg text-slate-400 font-medium">/ {config.limiteDiario}</span></h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Send className="w-6 h-6" /></div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${percentualUso > 90 ? 'bg-red-500' : percentualUso > 75 ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(percentualUso, 100)}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-right">{percentualUso}% da cota consumida</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Na Fila (Aguardando)</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{metricas.naFila}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-6 h-6" /></div>
          </div>
          <p className="text-sm text-slate-500 mt-4">Serão enviados conforme o limite diário.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Falhas de Envio</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{metricas.erros}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
          </div>
          <p className="text-sm text-slate-500 mt-4">Erro de autenticação ou contatos inválidos.</p>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-8">
        
        {/* ─── CONFIGURAÇÕES DO MOTOR (TETO DIÁRIO E WHATSAPP) ──────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <Settings className="w-6 h-6 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-800">Regras do Motor</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Teto Diário de E-mails (Anti-Spam)</label>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Proteja a reputação do seu domínio. Se a fila exceder este número, o robô pausará e retomará no dia seguinte às 00h01.
              </p>
              <input
                type="number" required min="10" max="10000"
                value={config.limiteDiario}
                onChange={(e) => setConfig({ ...config, limiteDiario: parseInt(e.target.value) || 0 })}
                className="w-full md:w-1/2 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-bold"
              />
            </div>

            <div className="border-l border-slate-100 pl-8 flex flex-col justify-center">
              <label className="block text-sm font-bold text-slate-700 mb-3">Notificações por WhatsApp</label>
              <div 
                onClick={() => setConfig({ ...config, whatsappAtivo: !config.whatsappAtivo })}
                className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors max-w-sm ${config.whatsappAtivo ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className={`w-6 h-6 ${config.whatsappAtivo ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-bold ${config.whatsappAtivo ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {config.whatsappAtivo ? 'API do WhatsApp Ativa' : 'WhatsApp Desativado'}
                    </p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${config.whatsappAtivo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.whatsappAtivo ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ─── CREDENCIAIS DE SERVIDOR (SMTP) ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <Server className="w-6 h-6 text-slate-600" />
              <h2 className="text-xl font-semibold text-slate-800">Servidor de E-mail (SMTP)</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Host SMTP</label>
                  <div className="relative">
                    <Globe className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text" required
                      value={config.smtpHost}
                      onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                      placeholder="ex: smtp.hostinger.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Porta SMTP</label>
                  <div className="relative">
                    <Server className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number" required
                      value={config.smtpPort}
                      onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) || 465 })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                      placeholder="465 ou 587"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Usuário de Autenticação (E-mail)</label>
                  <div className="relative">
                    <AtSign className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email" required
                      value={config.smtpUser}
                      onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                      placeholder="diplomas@suafaculdade.com"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Senha do E-mail (App Password)</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password" required
                      value={config.smtpPassword}
                      onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── CREDENCIAIS WHATSAPP API E MAPEAMENTO ─────────────────────────── */}
          <div className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden h-full flex flex-col ${!config.whatsappAtivo ? 'opacity-60 grayscale-[30%]' : 'border-emerald-200'}`}>
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <Smartphone className={`w-6 h-6 ${config.whatsappAtivo ? 'text-emerald-600' : 'text-slate-500'}`} />
              <h2 className="text-xl font-semibold text-slate-800">WhatsApp (Meta Cloud API)</h2>
            </div>
            
            <div className="p-6 space-y-5 flex-1">
              {!config.whatsappAtivo && (
                <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200 mb-2">
                  Ative no painel superior para habilitar estas configurações.
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Endpoint (URL da API)</label>
                <div className="relative">
                  <Globe className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url" disabled={!config.whatsappAtivo}
                    value={config.waApiUrl}
                    onChange={(e) => setConfig({ ...config, waApiUrl: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors disabled:bg-slate-100 text-sm"
                    placeholder="https://graph.facebook.com/v18.0/.../messages"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Token de Acesso</label>
                <div className="relative">
                  <Key className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password" disabled={!config.whatsappAtivo}
                    value={config.waToken}
                    onChange={(e) => setConfig({ ...config, waToken: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors disabled:bg-slate-100 text-sm"
                    placeholder="EAAGm0PX4ZC..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Template (Meta)</label>
                  <div className="relative">
                    <FileText className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text" disabled={!config.whatsappAtivo}
                      value={config.waTemplate}
                      onChange={(e) => setConfig({ ...config, waTemplate: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors disabled:bg-slate-100 font-mono text-sm"
                      placeholder="diploma_aprovado_v2"
                    />
                  </div>
                </div>

                <div className="col-span-2 bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-2">
                  <label className="block text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                    <ListOrdered className="w-4 h-4" /> Mapeamento de Variáveis {'{{1}}, {{2}}'}
                  </label>
                  <p className="text-xs text-emerald-700 mb-3 leading-relaxed">
                    Insira as variáveis na ordem exata que elas aparecem no seu template do WhatsApp, separadas por vírgula. Ex: <span className="font-mono bg-white px-1 rounded border border-emerald-200">[NOME_ALUNO], [LINK_DOCUMENTO], [LINK_HISTORICO]</span>
                  </p>
                  <input
                    type="text" disabled={!config.whatsappAtivo}
                    value={config.waVariaveis}
                    onChange={(e) => setConfig({ ...config, waVariaveis: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors disabled:bg-slate-100 font-mono text-sm text-emerald-900"
                    placeholder="[NOME_ALUNO], [LINK_DOCUMENTO]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TEMPLATE DE MENSAGEM (E-MAIL) ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-800">Layout do E-mail</h2>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assunto do E-mail</label>
                <input
                  type="text" required
                  value={config.assunto}
                  onChange={(e) => setConfig({ ...config, assunto: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Corpo da Mensagem (Texto Principal)</label>
                <textarea
                  required rows={6}
                  value={config.corpo}
                  onChange={(e) => setConfig({ ...config, corpo: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                ></textarea>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                  <Linkedin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Integração com LinkedIn:</strong> O botão "Adicionar ao Perfil" será anexado automaticamente no rodapé deste e-mail para que o aluno compartilhe o diploma registado.
                  </p>
                </div>
              </div>
            </div>

            {/* Dicionário de Variáveis */}
            <div className="bg-slate-800 rounded-xl p-5 text-slate-300 border border-slate-700 shadow-inner h-full">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-600 pb-2">Variáveis Dinâmicas</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Clique nos códigos abaixo para copiar e colar no texto do seu e-mail ou no mapeamento do WhatsApp. O robô vai substituí-los automaticamente pelos dados reais.
              </p>
              <ul className="space-y-3 text-sm font-mono">
                <li className="cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => navigator.clipboard.writeText('[NOME_ALUNO]')}>[NOME_ALUNO]</li>
                <li className="cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => navigator.clipboard.writeText('[CURSO]')}>[CURSO]</li>
                <li className="cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => navigator.clipboard.writeText('[LINK_DOCUMENTO]')}>[LINK_DOCUMENTO]</li>
                <li className="cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => navigator.clipboard.writeText('[LINK_HISTORICO]')}>[LINK_HISTORICO]</li>
                <li className="cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => navigator.clipboard.writeText('[CODIGO_MEC]')}>[CODIGO_MEC]</li>
              </ul>
            </div>
          </div>
        </div>

        {/* BOTÃO DE SALVAR */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" disabled={salvando} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-sm disabled:opacity-70"
          >
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : (salvoSucesso ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
            {salvando ? 'Salvando regras...' : (salvoSucesso ? 'Salvo com Sucesso!' : 'Salvar Configurações')}
          </button>
        </div>
      </form>
    </div>
  );
};