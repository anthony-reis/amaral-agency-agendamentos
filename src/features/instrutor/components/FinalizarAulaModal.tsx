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
  Check,
} from "lucide-react";
import { finalizarAula } from "../actions/minhasAulas";
import type { AulaInstrutor } from "../actions/minhasAulas";

interface Props {
  open: boolean;
  aula: AulaInstrutor;
  instructorName: string;
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

function SignatureFullscreen({
  onConfirm,
  onCancel,
}: {
  onConfirm: (dataURL: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Ajusta canvas ao tamanho do container
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const { width, height } = container.getBoundingClientRect();
      // Salva conteúdo atual antes de redimensionar
      const ctx = canvas.getContext("2d");
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = width;
      canvas.height = height;
      // Fundo branco
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (imageData) ctx.putImageData(imageData, 0, 0);
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setIsEmpty(false);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setIsDrawing(false);
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onConfirm(canvas.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={limpar}
            disabled={isEmpty}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar
          </button>
          <button
            onClick={confirmar}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Confirmar
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 shrink-0">
        <p className="text-xs text-slate-400 text-center">
          Assine no campo abaixo • Gire o dispositivo para mais espaço
        </p>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-white"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          style={{ display: "block" }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 opacity-20">
              <PenLine className="w-10 h-10 text-slate-400" />
              <p className="text-slate-400 text-sm font-medium">Assine aqui</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FinalizarAulaModal({
  open,
  aula,
  instructorName,
  onSuccess,
  onCancel,
}: Props) {
  const [signatureDataURL, setSignatureDataURL] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [assinaturaFullscreen, setAssinaturaFullscreen] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state quando modal abre/fecha
  useEffect(() => {
    if (open) {
      setFotoFile(null);
      setFotoPreview(null);
      setSignatureDataURL(null);
      setSignaturePreview(null);
      setAssinaturaFullscreen(false);
      setError(null);
      setIsPending(false);
    }
  }, [open]);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Foto muito grande. Máximo 10MB.");
      return;
    }
    setError(null);
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  function removerFoto() {
    setFotoFile(null);
    setFotoPreview(null);
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
    setIsPending(true);
    setError(null);

    try {
      const fotoFormData = new FormData();
      fotoFormData.append("foto", fotoFile);

      const result = await finalizarAula(
        aula.id,
        fotoFormData,
        signatureDataURL,
        instructorName,
        aula.autoescola_id,
      );

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

  const canFinalizar =
    fotoFile !== null && signatureDataURL !== null && !isPending;

  const categoriaLabel =
    aula.instructorCategory === "MOTO" || aula.instructorCategory === "A"
      ? "MOTOCICLETA"
      : aula.instructorCategory === "CARRO" || aula.instructorCategory === "B"
        ? "AUTOMÓVEL"
        : (aula.instructorCategory ?? "—");

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
                        <Camera className="w-6 h-6 text-[--p-text-3]" />
                        <span className="text-xs text-[--p-text-3]">
                          Toque para escolher ou tirar foto
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFotoChange}
                          disabled={isPending}
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
