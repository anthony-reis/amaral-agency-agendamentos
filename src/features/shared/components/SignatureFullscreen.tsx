"use client";

import { useRef, useState, useEffect } from "react";
import { PenLine, X, RotateCcw, Check } from "lucide-react";

/**
 * Tela cheia de assinatura (canvas). Extraída do FinalizarAulaModal do
 * instrutor para ser reaproveitada nas solicitações do aluno.
 */
export function SignatureFullscreen({
  onConfirm,
  onCancel,
}: {
  onConfirm: (dataURL: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const isEmptyRef = useRef(true);
  // Pointer atualmente em traço — ignora um segundo dedo tocando ao mesmo tempo
  const activePointerIdRef = useRef<number | null>(null);
  // Expõe a última versão de resize() para ser chamada fora do efeito (ex: ao soltar o dedo)
  const resizeRef = useRef<() => void>(() => {});

  // Ajusta canvas ao tamanho do container.
  // Importante: atribuir canvas.width/height SEMPRE limpa o conteúdo do canvas,
  // mesmo quando o valor não muda. No Safari iOS o evento "resize" do window
  // dispara com frequência (barra de endereço recolhendo/aparecendo, inclusive
  // ao soltar o dedo da tela), então sem essas proteções a assinatura era
  // apagada sozinha. Por isso: (1) ignoramos resizes sem mudança real de
  // tamanho ou com o container ainda sem layout (0×0), (2) nunca resetamos o
  // canvas enquanto o usuário está desenhando, e (3) preservamos o traço já
  // feito quando o tamanho muda de verdade (ex: rotação de tela).
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      if (isDrawingRef.current) return;

      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const newWidth = Math.round(Math.min(width, 600));
      const newHeight = Math.round(Math.min(height, 300));
      if (canvas.width === newWidth && canvas.height === newHeight) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Preserva o desenho existente (canvas é pequeno — 600×300 — custo trivial)
      const hadContent = !isEmptyRef.current && canvas.width > 0 && canvas.height > 0;
      const snapshot = hadContent ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (snapshot) ctx.putImageData(snapshot, 0, 0);
    }
    resizeRef.current = resize;
    resize();
    window.addEventListener("resize", resize);

    // Trava o scroll/bounce do body enquanto a tela de assinatura está aberta.
    // Reduz a chance de a barra de endereço do Safari recolher/expandir (o que
    // dispara "resize") por causa de scroll/rubber-banding atrás da overlay.
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      window.removeEventListener("resize", resize);
      body.style.overflow = prevOverflow;
      body.style.overscrollBehavior = prevOverscroll;
      // Destrói o canvas ao desmontar para liberar memória imediatamente
      const canvas = canvasRef.current;
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    };
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
    // Ignora um segundo dedo tocando durante o traço (evita marcas/saltos indevidos)
    if (activePointerIdRef.current !== null) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    activePointerIdRef.current = e.pointerId;
    isDrawingRef.current = true;
    isEmptyRef.current = false;
    setIsEmpty(false);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;
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

  // Cobre pointerup, pointerleave e pointercancel (o iOS dispara "cancel" quando
  // um gesto do sistema — ex: swipe de voltar, Control Center — rouba o toque
  // no meio do traço, sem um "up" correspondente).
  function endStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== activePointerIdRef.current) return;
    e.preventDefault();
    activePointerIdRef.current = null;
    isDrawingRef.current = false;
    // Reconcilia qualquer resize real que tenha sido ignorado durante o traço
    requestAnimationFrame(() => resizeRef.current());
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isEmptyRef.current = true;
    setIsEmpty(true);
  }

  function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // JPEG 85% é suficiente para assinatura (fundo branco, sem transparência) e muito menor que PNG
    const dataURL = canvas.toDataURL("image/jpeg", 0.85);
    // Destrói o canvas antes de chamar onConfirm para liberar memória mais cedo
    canvas.width = 0;
    canvas.height = 0;
    onConfirm(dataURL);
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
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
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
