"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Camera,
  PenLine,
  Trash2,
  X,
  RotateCcw,
  User,
  Calendar,
  Clock,
  Car,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import type { AulaInstrutor } from "../actions/minhasAulas";
import { SignatureFullscreen } from "@/features/shared/components/SignatureFullscreen";
import { compressImage } from "@/lib/compressImage";

interface Props {
  open: boolean;
  aula: AulaInstrutor;
  instructorName: string;
  onSuccess: (id: string) => void;
  onCancel: () => void;
  registrarKm?: boolean;
}

export function FinalizarAulaModal({
  open,
  aula,
  instructorName,
  onSuccess,
  onCancel,
  registrarKm = false,
}: Props) {
  const [signatureDataURL, setSignatureDataURL] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [assinaturaFullscreen, setAssinaturaFullscreen] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kmFinal, setKmFinal] = useState('');
  const previewUrlRef = useRef<string | null>(null);

  // Clear memory on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Reset state quando modal abre/fecha
  useEffect(() => {
    if (open) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setFotoFile(null);
      setFotoPreview(null);
      setSignatureDataURL(null);
      setSignaturePreview(null);
      setAssinaturaFullscreen(false);
      setError(null);
      setIsPending(false);
      setIsCompressing(false);
      setKmFinal('');
    }
  }, [open]);

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    try {
      setError(null);
      setIsCompressing(true);
      
      const compressedFile = await compressImage(file);
      
      setFotoFile(compressedFile);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      
      const objectUrl = URL.createObjectURL(compressedFile);
      previewUrlRef.current = objectUrl;
      setFotoPreview(objectUrl);
      
    } catch (err) {
      console.error(err);
      setError("Erro ao processar a imagem. Tente novamente.");
    } finally {
      setIsCompressing(false);
    }
  }

  function removerFoto() {
    setFotoFile(null);
    setFotoPreview(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function handleSignatureConfirmed(dataURL: string) {
    setSignatureDataURL(dataURL);
    setSignaturePreview(dataURL);
    setAssinaturaFullscreen(false);
  }

  function removerAssinatura() {
    setSignatureDataURL(null);
    setSignaturePreview(null);
  }

  async function handleFinalizar() {
    if (!fotoFile || !signatureDataURL) return;

    // Valida KM final se feature ativa
    if (registrarKm && aula.km_inicial != null) {
      const kmNum = parseInt(kmFinal, 10);
      if (!kmFinal || isNaN(kmNum) || kmNum < 0) {
        setError('Informe o KM final do veículo.');
        return;
      }
      if (kmNum < aula.km_inicial) {
        setError(`KM final (${kmNum}) não pode ser menor que o KM inicial (${aula.km_inicial}).`);
        return;
      }
    }

    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("agendamento_id", aula.id);
      formData.append("instructor_name", instructorName);
      formData.append("autoescola_id", aula.autoescola_id);
      formData.append("signatureDataURL", signatureDataURL);
      formData.append("foto", fotoFile);
      if (registrarKm && aula.km_inicial != null && kmFinal) {
        formData.append("km_final", kmFinal);
      }

      // Libera a memória das imagens imediatamente após montar o FormData
      // (o FormData já tem referência ao blob/string — não precisa manter nos states)
      setSignatureDataURL(null);
      setSignaturePreview(null);
      setFotoFile(null);
      setFotoPreview(null);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      const res = await fetch("/api/finalizar-aula", { method: "POST", body: formData });
      const result = await res.json();

      if (result.success) {
        onSuccess(aula.id);
      } else {
        setError(result.error ?? "Erro ao finalizar aula.");
        setIsPending(false);
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setIsPending(false);
    }
  }

  const needsKmFinal = registrarKm && aula.km_inicial != null;
  const kmFinalNum = kmFinal !== '' ? parseInt(kmFinal, 10) : null;
  const kmFinalInvalido = needsKmFinal && kmFinalNum !== null && aula.km_inicial != null && kmFinalNum < aula.km_inicial;
  const canFinalizar =
    fotoFile !== null &&
    signatureDataURL !== null &&
    !isPending &&
    !isCompressing &&
    (!needsKmFinal || (kmFinal !== '' && !kmFinalInvalido));

  const categoriaLabel = aula.instructorCategory ?? "—";

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-40"
              onClick={!isPending ? onCancel : undefined}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 flex items-start justify-center z-50 p-3 overflow-y-auto"
            >
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] w-full max-w-md shadow-2xl my-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[--p-border]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[--p-text-1] text-base">
                        Finalizar Aula
                      </h3>
                      <p className="text-xs text-[--p-text-3]">
                        Foto e assinatura obrigatórias
                      </p>
                    </div>
                  </div>
                  {!isPending && (
                    <button
                      onClick={onCancel}
                      className="text-[--p-text-3] hover:text-[--p-text-1] transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="px-5 py-4 space-y-5">
                  {/* Dados da aula */}
                  <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-3">
                    <p className="text-[10px] font-bold text-[--p-text-3] uppercase tracking-wider mb-2">
                      Informações da Aula
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="col-span-2 flex items-center gap-2 text-[--p-text-1] font-semibold">
                        <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="uppercase truncate">
                          {aula.student_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[--p-text-3]">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{aula.date.split("-").reverse().join("/")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[--p-text-3]">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{aula.time_slot}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-[--p-text-3]">
                        <Car className="w-3.5 h-3.5 shrink-0" />
                        <span>{categoriaLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* KM Final — só visível se registrar_km ativo e aula tem km_inicial */}
                  {needsKmFinal && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-violet-400" />
                        <p className="text-sm font-semibold text-[--p-text-1]">
                          KM Final <span className="text-red-400">*</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-[--p-bg-base] rounded-xl border border-[--p-border] p-3">
                        <div className="text-xs text-[--p-text-3]">
                          Inicial: <span className="font-bold text-[--p-text-2]">{aula.km_inicial?.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="KM atual"
                            value={kmFinal}
                            onChange={(e) => { setKmFinal(e.target.value); setError(null); }}
                            disabled={isPending}
                            className="w-full px-3 py-2 text-lg font-bold text-center rounded-lg bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 disabled:opacity-50 transition"
                          />
                        </div>
                      </div>
                      {kmFinalInvalido && (
                        <p className="text-xs text-red-400 mt-1 font-semibold">
                          KM final não pode ser menor que o inicial ({aula.km_inicial?.toLocaleString('pt-BR')})
                        </p>
                      )}
                      {!kmFinalInvalido && kmFinal !== '' && kmFinalNum !== null && aula.km_inicial != null && kmFinalNum > aula.km_inicial && (
                        <p className="text-xs text-violet-400 mt-1">
                          {kmFinalNum - aula.km_inicial} km rodados
                        </p>
                      )}
                    </div>
                  )}

                  {/* Foto */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <p className="text-sm font-semibold text-[--p-text-1]">
                        Foto do Instrutor com Aluno{" "}
                        <span className="text-red-400">*</span>
                      </p>
                    </div>

                    {fotoPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-[--p-border]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fotoPreview}
                          alt="Preview"
                          className="w-full max-h-40 object-cover"
                        />
                        <button
                          onClick={removerFoto}
                          disabled={isPending}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[--p-border] rounded-xl p-5 cursor-pointer hover:border-blue-400 hover:bg-blue-500/5 transition-colors">
                        {isCompressing ? (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                            <span className="text-xs text-[--p-text-3]">
                              Processando imagem...
                            </span>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-[--p-text-3]" />
                            <span className="text-xs text-[--p-text-3]">
                              Toque para tirar foto
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFotoChange}
                          disabled={isPending || isCompressing}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Assinatura */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <PenLine className="w-4 h-4 text-indigo-400" />
                      <p className="text-sm font-semibold text-[--p-text-1]">
                        Assinatura do Aluno{" "}
                        <span className="text-red-400">*</span>
                      </p>
                    </div>

                    {signaturePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-[--p-border] bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signaturePreview}
                          alt="Assinatura"
                          className="w-full max-h-20 object-contain"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={() => setAssinaturaFullscreen(true)}
                            disabled={isPending}
                            className="bg-slate-700 hover:bg-slate-600 text-white rounded-full p-1 transition-colors"
                            title="Refazer assinatura"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={removerAssinatura}
                            disabled={isPending}
                            className="bg-red-500 hover:bg-red-400 text-white rounded-full p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssinaturaFullscreen(true)}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[--p-border] rounded-xl p-5 hover:border-indigo-400 hover:bg-indigo-500/5 transition-colors"
                      >
                        <Maximize2 className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-medium text-[--p-text-2]">
                          Abrir Tela de Assinatura
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Erro */}
                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">{error}</p>
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={onCancel}
                      disabled={isPending}
                      className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleFinalizar}
                      disabled={!canFinalizar}
                      className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Finalizar Aula
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tela cheia de assinatura */}
      <AnimatePresence>
        {assinaturaFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60]"
          >
            <SignatureFullscreen
              onConfirm={handleSignatureConfirmed}
              onCancel={() => setAssinaturaFullscreen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
