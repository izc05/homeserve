import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  CheckCircle2,
  Eraser,
  LoaderCircle,
  LockKeyhole,
  PenLine,
  ShieldCheck,
} from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  listWorkOrderSignatures,
  uploadTechnicianSignature,
  type WorkOrderSignature,
} from '../api/workOrderSignatureRepository';
import './TechnicianSignaturePanel.css';

export type TechnicianSignaturePanelProps = {
  tenantId: string;
  workOrderId: string;
  signerName: string;
  canEdit: boolean;
  client?: SupabaseClient;
};

function clearCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite utilizar el panel de firma.');
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = '#172033';
}

function canvasPoint(canvas: HTMLCanvasElement, event: ReactPointerEvent<HTMLCanvasElement>) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
  };
}

function canvasToPngFile(canvas: HTMLCanvasElement) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo preparar la firma para guardarla.'));
        return;
      }
      resolve(new File([blob], 'firma-tecnico.png', { type: 'image/png', lastModified: Date.now() }));
    }, 'image/png');
  });
}

function friendlySignatureError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  if (/^(Solo el técnico asignado|La firma técnica ya está registrada|No existe una intervención activa|La firma debe|La firma no puede|Indica el nombre)/i.test(message)) {
    return message;
  }
  return 'No se pudo guardar la firma. Comprueba la conexión y vuelve a intentarlo.';
}

function latestTechnicianSignature(signatures: WorkOrderSignature[]) {
  return [...signatures].reverse().find((signature) => signature.type === 'technician') ?? null;
}

export default function TechnicianSignaturePanel({
  tenantId,
  workOrderId,
  signerName,
  canEdit,
  client,
}: TechnicianSignaturePanelProps) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const query = useQuery({
    queryKey: ['work-order-signatures', workOrderId],
    queryFn: () => listWorkOrderSignatures(supabase, workOrderId),
    enabled: Boolean(workOrderId),
  });
  const signature = latestTechnicianSignature(query.data ?? []);

  useEffect(() => {
    if (!query.isLoading && !signature && canvasRef.current) clearCanvas(canvasRef.current);
  }, [query.isLoading, signature]);

  const mutation = useMutation({
    mutationFn: async () => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('El panel de firma no está disponible.');
      const file = await canvasToPngFile(canvas);
      return uploadTechnicianSignature(supabase, {
        tenantId,
        workOrderId,
        signerName,
        file,
      });
    },
    onSuccess: async () => {
      setConfirmed(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-order-signatures', workOrderId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-completion-support', workOrderId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-audit', tenantId] }),
      ]);
    },
  });

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canEdit || mutation.isPending || signature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.setPointerCapture(event.pointerId);
    const point = canvasPoint(canvas, event);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    setHasInk(true);
  };

  const continueDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = canvasPoint(canvas, event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drawingRef.current = false;
    canvas?.getContext('2d')?.closePath();
  };

  const reset = () => {
    if (!canvasRef.current || mutation.isPending) return;
    clearCanvas(canvasRef.current);
    setHasInk(false);
    setConfirmed(false);
  };

  return <section className="execution-card technician-signature-panel" aria-labelledby={`signature-title-${workOrderId}`}>
    <div className="execution-card-heading">
      <div className="execution-card-title">
        <span className="execution-card-icon" aria-hidden="true"><PenLine size={20} /></span>
        <div>
          <h2 id={`signature-title-${workOrderId}`}>Firma del técnico</h2>
          <p>Firma privada vinculada a esta intervención y protegida por los permisos de la OT.</p>
        </div>
      </div>
      <span className="private-evidence-badge"><ShieldCheck size={14} aria-hidden="true" /> Evidencia privada</span>
    </div>

    {query.isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={20} /> Comprobando firma…</div>}
    {query.error && <p className="execution-inline-error" role="alert"><AlertTriangle size={17} /> No se pudo consultar la firma técnica.</p>}

    {!query.isLoading && !query.error && signature && <div className="technician-signature-saved">
      <div className="technician-signature-preview">
        {signature.signedUrl
          ? <img alt={`Firma de ${signature.signerName}`} src={signature.signedUrl} />
          : <PenLine size={28} aria-hidden="true" />}
      </div>
      <div>
        <span className="technician-signature-success"><CheckCircle2 size={17} /> Firma registrada</span>
        <strong>{signature.signerName}</strong>
        <small>{signature.signedAt ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(signature.signedAt)) : 'Fecha registrada en auditoría'}</small>
        <p>La firma queda vinculada a la intervención y no se sobrescribe desde la aplicación.</p>
      </div>
    </div>}

    {!query.isLoading && !query.error && !signature && !canEdit && <p className="read-only-note"><LockKeyhole size={16} /> La firma solo está disponible para el técnico asignado mientras la OT está en curso.</p>}

    {!query.isLoading && !query.error && !signature && canEdit && <>
      <div className="technician-signature-canvas-wrap">
        <canvas
          aria-label="Zona para dibujar la firma del técnico"
          height={320}
          onPointerCancel={stopDrawing}
          onPointerDown={startDrawing}
          onPointerLeave={stopDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={stopDrawing}
          ref={canvasRef}
          role="img"
          width={900}
        />
        <span>Firma dentro del recuadro con el dedo, lápiz o ratón.</span>
      </div>

      <label className="completion-confirmation technician-signature-confirmation">
        <input checked={confirmed} disabled={!hasInk || mutation.isPending} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
        <span>Confirmo que esta es mi firma y que corresponde al trabajo realizado en esta OT.</span>
      </label>

      {mutation.error && <p className="execution-inline-error" role="alert"><AlertTriangle size={17} /> {friendlySignatureError(mutation.error)}</p>}

      <div className="completion-actions technician-signature-actions">
        <button className="secondary-button" disabled={!hasInk || mutation.isPending} onClick={reset} type="button"><Eraser size={17} /> Limpiar</button>
        <button className="primary-button" disabled={!hasInk || !confirmed || mutation.isPending} onClick={() => mutation.mutate()} type="button">
          {mutation.isPending ? <LoaderCircle className="spin" size={17} /> : <PenLine size={17} />} {mutation.isPending ? 'Guardando…' : 'Guardar firma'}
        </button>
      </div>
    </>}
  </section>;
}
