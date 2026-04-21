import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Tag,
  PauseCircle,
  Play,
  Trash2,
  Pause,
  Ban,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import * as XLSX from "xlsx";

interface Lote {
  id: string;
  nome_lote: string;
  status:
    | "PENDENTE"
    | "PROCESSANDO"
    | "CONCLUIDO"
    | "COM_ERRO"
    | "PAUSADO"
    | "CANCELADO";
  data_criacao: string;
}

const BatchManagementView: React.FC = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [nomeLote, setNomeLote] = useState("");
  const [iniciarEsteira, setIniciarEsteira] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLotes = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const { data, error } = await supabase
        .from("lotes")
        .select("*")
        .order("data_criacao", { ascending: false });

      if (error) throw error;
      if (data) setLotes(data as Lote[]);
    } catch (error) {
      console.error("❌ Erro ao buscar lotes:", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotes();

    const inscricaoLotes = supabase
      .channel("observador-lotes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lotes" },
        () => {
          fetchLotes(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inscricaoLotes);
    };
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][];

      if (data.length <= 1) {
        throw new Error("A planilha está vazia ou sem o cabeçalho correto.");
      }

      // ─── MAPEAMENTO INTELIGENTE DE COLUNAS ───
      const headers = data[0].map((h) =>
        String(h || "")
          .toLowerCase()
          .trim(),
      );
      const idxNome = headers.findIndex(
        (h) => h.includes("nome") || h.includes("aluno"),
      );
      const idxCpf = headers.findIndex(
        (h) => h.includes("cpf") || h.includes("documento"),
      );
      const idxCurso = headers.findIndex((h) => h.includes("curso"));
      const idxEmail = headers.findIndex((h) => h.includes("mail"));
      const idxTel = headers.findIndex(
        (h) =>
          h.includes("telefon") ||
          h.includes("whatsapp") ||
          h.includes("celular"),
      );

      if (idxNome === -1 || idxCpf === -1) {
        throw new Error(
          'As colunas "Nome" e "CPF" são obrigatórias na primeira linha.',
        );
      }

      const linhasValidas = data
        .slice(1)
        .filter((row) => row[idxCpf] && row[idxNome]);

      if (linhasValidas.length === 0) {
        throw new Error("Nenhum aluno válido encontrado na planilha.");
      }

      // Consulta de Duplicidade
      const cpfsNaPlanilha = linhasValidas.map((linha) =>
        String(linha[idxCpf] || "")
          .trim()
          .replace(/\D/g, "")
          .padStart(11, "0"),
      );
      const { data: dbAlunos, error: dbError } = await supabase
        .from("alunos_dossie")
        .select("cpf, curso_alvo, lotes(nome_lote)")
        .in("cpf", cpfsNaPlanilha);

      if (dbError) throw dbError;

      const nomeFinalDoLote =
        nomeLote.trim() !== ""
          ? nomeLote.trim()
          : `Lote - ${new Date().toLocaleString("pt-BR")}`;
      const statusLoteInicial = iniciarEsteira ? "PENDENTE" : "PAUSADO";

      const { data: loteData, error: loteError } = await supabase
        .from("lotes")
        .insert([{ nome_lote: nomeFinalDoLote, status: statusLoteInicial }])
        .select()
        .single();

      if (loteError) throw loteError;

      const insertsAlunos = linhasValidas.map((linha) => {
        const nomeBruto = String(linha[idxNome] || "").trim();
        const cpfBruto = String(linha[idxCpf] || "")
          .trim()
          .replace(/\D/g, "")
          .padStart(11, "0");
        const cursoAlvo = String(
          linha[idxCurso !== -1 ? idxCurso : 2] || "",
        ).trim();

        // Puxa o E-mail e Telefone (Limpando formatações)
        const email =
          idxEmail !== -1 && linha[idxEmail]
            ? String(linha[idxEmail]).trim()
            : null;
        const telefone =
          idxTel !== -1 && linha[idxTel]
            ? String(linha[idxTel]).replace(/\D/g, "")
            : null;

        const duplicado = dbAlunos?.find(
          (alunoDb) =>
            alunoDb.cpf === cpfBruto &&
            alunoDb.curso_alvo?.toLowerCase().trim() ===
              cursoAlvo.toLowerCase().trim(),
        );

        if (duplicado) {
          const nomeLoteAntigo =
            (duplicado.lotes as any)?.nome_lote || "Desconhecido";
          return {
            lote_id: loteData.id,
            cpf: cpfBruto,
            nome_planilha: nomeBruto,
            curso_alvo: cursoAlvo,
            email: email,
            telefone: telefone,
            status: "REPROVADO_IA",
            motivo_reprovacao: `🚨 DUPLICIDADE DETECTADA: O aluno já foi certificado no curso "${cursoAlvo}" no lote "${nomeLoteAntigo}".`,
          };
        }

        return {
          lote_id: loteData.id,
          cpf: cpfBruto,
          nome_planilha: nomeBruto,
          curso_alvo: cursoAlvo,
          email: email,
          telefone: telefone,
          status: iniciarEsteira ? "AGUARDANDO_ROBO" : "PAUSADO",
        };
      });

      const { error: alunosError } = await supabase
        .from("alunos_dossie")
        .insert(insertsAlunos);
      if (alunosError) throw alunosError;

      alert(
        iniciarEsteira
          ? `Upload concluído! O lote já está na fila de processamento.`
          : `Lote salvo como Pausado com sucesso!`,
      );

      setNomeLote("");
      fetchLotes();
    } catch (error: any) {
      alert(`Erro ao processar a planilha: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── AÇÕES DE CONTROLE DE ESTEIRA ─────────────────────────────────────────

  const handleDarPlayLote = async (loteId: string) => {
    try {
      await supabase
        .from("lotes")
        .update({ status: "PENDENTE" })
        .eq("id", loteId);
      await supabase
        .from("alunos_dossie")
        .update({ status: "AGUARDANDO_ROBO" })
        .eq("lote_id", loteId)
        .eq("status", "PAUSADO");
      fetchLotes();
    } catch (error) {
      console.error("Erro ao iniciar lote:", error);
    }
  };

  const handlePausarLote = async (loteId: string) => {
    if (
      !window.confirm(
        "Pausar este lote de emergência? O robô vai parar de puxar novos alunos desta lista.",
      )
    )
      return;
    try {
      await supabase
        .from("lotes")
        .update({ status: "PAUSADO" })
        .eq("id", loteId);
      await supabase
        .from("alunos_dossie")
        .update({ status: "PAUSADO" })
        .eq("lote_id", loteId)
        .eq("status", "AGUARDANDO_ROBO");
      fetchLotes();
    } catch (error) {
      console.error("Erro ao pausar lote:", error);
    }
  };

  const handleCancelarLote = async (loteId: string) => {
    if (
      !window.confirm(
        "CUIDADO: Tem a certeza que deseja CANCELAR este lote permanentemente? Os alunos não serão mais processados.",
      )
    )
      return;
    try {
      await supabase
        .from("lotes")
        .update({ status: "CANCELADO" })
        .eq("id", loteId);
      // Cancela todos os alunos que ainda estavam aguardando ou pausados
      await supabase
        .from("alunos_dossie")
        .update({ status: "CANCELADO" })
        .eq("lote_id", loteId)
        .in("status", ["AGUARDANDO_ROBO", "PAUSADO"]);
      fetchLotes();
    } catch (error) {
      console.error("Erro ao cancelar lote:", error);
    }
  };

  const getStatusDisplay = (status: Lote["status"]) => {
    switch (status) {
      case "CONCLUIDO":
        return {
          icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          text: "Concluído",
        };
      case "PROCESSANDO":
        return {
          icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
          color: "text-blue-700 bg-blue-50 border-blue-200",
          text: "Processando...",
        };
      case "COM_ERRO":
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          color: "text-red-700 bg-red-50 border-red-200",
          text: "Com Erro",
        };
      case "PAUSADO":
        return {
          icon: <PauseCircle className="w-5 h-5 text-amber-500" />,
          color: "text-amber-700 bg-amber-50 border-amber-200",
          text: "Pausado",
        };
      case "CANCELADO":
        return {
          icon: <Ban className="w-5 h-5 text-slate-500" />,
          color: "text-slate-700 bg-slate-100 border-slate-300",
          text: "Cancelado",
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-blue-500" />,
          color: "text-blue-700 bg-blue-50 border-blue-200",
          text: "Pendente",
        };
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Gestão de Lotes
        </h1>
        <p className="text-slate-500 mt-2">
          Faça o upload de planilhas e controle a esteira de processamento do
          robô.
        </p>
      </div>

      {/* ÁREA DE CONFIGURAÇÃO E UPLOAD */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nome do Lote{" "}
              <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Tag className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={nomeLote}
                onChange={(e) => setNomeLote(e.target.value)}
                placeholder="Ex: Pedagogia - Lote 01"
                disabled={uploading}
                className="block w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-700 font-medium"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Fluxo de Produção
            </label>
            <div
              onClick={() => !uploading && setIniciarEsteira(!iniciarEsteira)}
              className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${iniciarEsteira ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
            >
              <div>
                <p
                  className={`text-sm font-bold ${iniciarEsteira ? "text-emerald-700" : "text-slate-600"}`}
                >
                  {iniciarEsteira
                    ? "Ligar Esteira Imediatamente"
                    : "Salvar Lote Pausado"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {iniciarEsteira
                    ? "O robô vai iniciar assim que fizer o upload."
                    : "Você precisará dar o Play para iniciar."}
                </p>
              </div>
              <div
                className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${iniciarEsteira ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${iniciarEsteira ? "translate-x-5" : "translate-x-0"}`}
                />
              </div>
            </div>
          </div>
        </div>

        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-slate-300 rounded-xl p-10 text-center transition-colors group ${uploading ? "bg-slate-50 opacity-70 cursor-not-allowed" : "hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer"}`}
        >
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-transform ${uploading ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:scale-110"}`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {uploading
              ? "A enviar para a esteira..."
              : "Clique para selecionar a Planilha Excel"}
          </h3>
        </div>
      </div>

      {/* FILA DE PROCESSAMENTO */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" /> Fila de Processamento
        </h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : lotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">Nenhum lote encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {lotes.map((lote) => {
              const statusInfo = getStatusDisplay(lote.status);
              return (
                <div
                  key={lote.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      {statusInfo.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800">
                        {lote.nome_lote}
                      </h4>
                      <p className="text-sm text-slate-500 mt-1">
                        Criado em:{" "}
                        {new Date(lote.data_criacao).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </span>

                    {/* AÇÕES DA ESTEIRA */}
                    <div className="flex items-center gap-2 ml-2 border-l pl-4 border-slate-200">
                      {lote.status === "PAUSADO" && (
                        <button
                          onClick={() => handleDarPlayLote(lote.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-100 bg-emerald-50 rounded-lg transition-colors"
                          title="Retomar Processamento"
                        >
                          <Play className="w-5 h-5 fill-current" />
                        </button>
                      )}

                      {(lote.status === "PENDENTE" ||
                        lote.status === "PROCESSANDO") && (
                        <button
                          onClick={() => handlePausarLote(lote.id)}
                          className="p-2 text-amber-600 hover:bg-amber-100 bg-amber-50 rounded-lg transition-colors"
                          title="Pausar Lote (Emergência)"
                        >
                          <Pause className="w-5 h-5 fill-current" />
                        </button>
                      )}

                      {["PENDENTE", "PROCESSANDO", "PAUSADO"].includes(
                        lote.status,
                      ) && (
                        <button
                          onClick={() => handleCancelarLote(lote.id)}
                          className="p-2 text-red-600 hover:bg-red-100 bg-red-50 rounded-lg transition-colors"
                          title="Cancelar Lote"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
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
