import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  PDFDocument,
  StandardFonts,
  cmyk,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const REPORT_BUCKET = "ot-reports";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REPORT_PHOTOS = 8;

type ReportType = "provisional" | "final";
type JsonRecord = Record<string, unknown>;

type ReservedReport = {
  id: string;
  tenant_id: string;
  ot_id: string;
  version: number;
  filename: string;
  bucket: string;
  path: string;
  tipo: ReportType;
};

type ReportData = {
  report: ReservedReport;
  order: JsonRecord;
  client: JsonRecord | null;
  site: JsonRecord | null;
  location: JsonRecord | null;
  asset: JsonRecord | null;
  technician: JsonRecord | null;
  visit: JsonRecord | null;
  checklist: JsonRecord[];
  photos: JsonRecord[];
  signatures: JsonRecord[];
  review: JsonRecord | null;
};

function response(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(value: unknown, fallback = "—") {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value);
  return normalized || fallback;
}

function dateTime(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(date);
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/^(La OT|El informe|Solo un responsable|No tienes permiso|Debes iniciar sesión)/i.test(message)) return message;
  return "No se pudo generar el informe PDF.";
}

function requireUuid(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error("La OT indicada no es válida");
  }
  return normalized;
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = value.replaceAll("\r", "").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else if (line) {
        lines.push(line);
        line = word;
      } else {
        let fragment = "";
        for (const character of word) {
          const candidateFragment = fragment + character;
          if (font.widthOfTextAtSize(candidateFragment, size) > maxWidth && fragment) {
            lines.push(fragment);
            fragment = character;
          } else {
            fragment = candidateFragment;
          }
        }
        line = fragment;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function loadReportData(service: ReturnType<typeof createClient>, report: ReservedReport): Promise<ReportData> {
  const { data: order, error: orderError } = await service
    .from("ordenes_trabajo")
    .select("*")
    .eq("id", report.ot_id)
    .single();
  if (orderError || !order) throw orderError ?? new Error("La OT no existe");

  const [clientResult, siteResult, locationResult, assetResult, technicianResult, visitResult, checklistResult, photosResult, signaturesResult, reviewResult] = await Promise.all([
    order.cliente_id
      ? service.from("clientes").select("*").eq("id", order.cliente_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.instalacion_id
      ? service.from("instalaciones").select("*").eq("id", order.instalacion_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.ubicacion_id
      ? service.from("ubicaciones").select("*").eq("id", order.ubicacion_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.activo_id
      ? service.from("activos").select("*").eq("id", order.activo_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.assigned_to
      ? service.from("profiles").select("id,nombre,email,telefono").eq("id", order.assigned_to).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    service.from("ot_visitas").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    service.from("ot_checklist_respuestas").select("*").eq("ot_id", report.ot_id).order("seccion_orden", { ascending: true }).order("orden", { ascending: true }),
    service.from("ot_fotos").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: true }),
    service.from("ot_firmas").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: true }),
    service.from("ot_revisiones_admin").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const possibleErrors = [clientResult.error, siteResult.error, locationResult.error, assetResult.error, technicianResult.error, visitResult.error, checklistResult.error, photosResult.error, signaturesResult.error, reviewResult.error].filter(Boolean);
  if (possibleErrors.length) throw possibleErrors[0];

  return {
    report,
    order,
    client: clientResult.data,
    site: siteResult.data,
    location: locationResult.data,
    asset: assetResult.data,
    technician: technicianResult.data,
    visit: visitResult.data,
    checklist: checklistResult.data ?? [],
    photos: photosResult.data ?? [],
    signatures: signaturesResult.data ?? [],
    review: reviewResult.data,
  };
}

async function downloadImage(service: ReturnType<typeof createClient>, bucket: string, path: string) {
  const { data, error } = await service.storage.from(bucket).download(path);
  if (error || !data) return null;
  if (data.size < 1 || data.size > MAX_IMAGE_BYTES) return null;
  const mime = data.type.toLowerCase();
  if (!mime.includes("png") && !mime.includes("jpeg") && !mime.includes("jpg")) return null;
  return { bytes: new Uint8Array(await data.arrayBuffer()), mime };
}

async function embedImage(document: PDFDocument, service: ReturnType<typeof createClient>, bucket: string, path: string): Promise<PDFImage | null> {
  const image = await downloadImage(service, bucket, path);
  if (!image) return null;
  try {
    return image.mime.includes("png") ? await document.embedPng(image.bytes) : await document.embedJpg(image.bytes);
  } catch {
    return null;
  }
}

async function buildPdf(data: ReportData, service: ReturnType<typeof createClient>) {
  const document = await PDFDocument.create();
  document.setTitle(`${text(data.order.codigo_ot)} · Informe ${data.report.tipo}`);
  document.setAuthor("IsiVoltPro OT");
  document.setCreator("IsiVoltPro OT");
  document.setProducer("IsiVoltPro OT · Supabase Edge Function");
  document.setSubject("Informe de orden de trabajo");

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const brand = rgb(0.05, 0.15, 0.25);
  const accent = rgb(0.12, 0.52, 0.72);
  const light = rgb(0.94, 0.97, 0.98);
  const muted = rgb(0.38, 0.44, 0.49);
  const danger = cmyk(0, 0.82, 0.76, 0.16);

  let page: PDFPage;
  let y = 0;

  const addPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 13, width: PAGE_WIDTH, height: 13, color: accent });
    page.drawText("ISIVOLTPRO", { x: MARGIN, y: PAGE_HEIGHT - 47, size: 16, font: bold, color: brand });
    page.drawText("OT", { x: MARGIN + 91, y: PAGE_HEIGHT - 47, size: 16, font: bold, color: accent });
    page.drawText(data.report.tipo === "final" ? "INFORME FINAL" : "INFORME PROVISIONAL", {
      x: PAGE_WIDTH - MARGIN - 140,
      y: PAGE_HEIGHT - 45,
      size: 10,
      font: bold,
      color: data.report.tipo === "final" ? brand : danger,
    });
    y = PAGE_HEIGHT - 78;
  };

  const ensure = (height: number) => {
    if (y - height < 64) addPage();
  };

  const drawLines = (value: string, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; width?: number; gap?: number } = {}) => {
    const size = options.size ?? 9.5;
    const selectedFont = options.font ?? regular;
    const indent = options.indent ?? 0;
    const width = options.width ?? CONTENT_WIDTH - indent;
    const gap = options.gap ?? 3;
    const lines = wrapText(value, selectedFont, size, width);
    ensure(lines.length * (size + gap) + 4);
    for (const line of lines) {
      page.drawText(line || " ", { x: MARGIN + indent, y, size, font: selectedFont, color: options.color ?? brand });
      y -= size + gap;
    }
    return lines.length;
  };

  const section = (title: string) => {
    ensure(35);
    y -= 4;
    page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_WIDTH, height: 24, color: light });
    page.drawRectangle({ x: MARGIN, y: y - 7, width: 4, height: 24, color: accent });
    page.drawText(title.toUpperCase(), { x: MARGIN + 12, y, size: 10, font: bold, color: brand });
    y -= 29;
  };

  const labelValue = (label: string, value: unknown, x: number, width: number) => {
    page.drawText(label.toUpperCase(), { x, y, size: 6.8, font: bold, color: muted });
    const lines = wrapText(text(value), regular, 9, width);
    let localY = y - 13;
    for (const line of lines.slice(0, 3)) {
      page.drawText(line, { x, y: localY, size: 9, font: regular, color: brand });
      localY -= 11;
    }
  };

  addPage();
  page.drawText(text(data.order.codigo_ot), { x: MARGIN, y, size: 24, font: bold, color: brand });
  page.drawText(`Versión ${data.report.version}`, { x: PAGE_WIDTH - MARGIN - 74, y: y + 4, size: 10, font: bold, color: accent });
  y -= 31;
  drawLines(text(data.order.titulo), { size: 13, font: bold, color: brand, gap: 4 });
  y -= 5;
  page.drawText(`Generado: ${dateTime(data.report.generated_at ?? new Date().toISOString())}`, { x: MARGIN, y, size: 8, font: regular, color: muted });
  y -= 28;

  ensure(86);
  const columnWidth = (CONTENT_WIDTH - 18) / 3;
  labelValue("Cliente", data.client?.nombre, MARGIN, columnWidth);
  labelValue("Instalación", data.site?.nombre, MARGIN + columnWidth + 9, columnWidth);
  labelValue("Ubicación", data.location?.nombre ?? data.site?.direccion, MARGIN + (columnWidth + 9) * 2, columnWidth);
  y -= 54;
  labelValue("Técnico", data.technician?.nombre, MARGIN, columnWidth);
  labelValue("Prioridad", data.order.prioridad, MARGIN + columnWidth + 9, columnWidth);
  labelValue("Estado", data.order.estado, MARGIN + (columnWidth + 9) * 2, columnWidth);
  y -= 58;

  section("Datos de la intervención");
  drawLines(`Tipo: ${text(data.order.tipo_ot_detalle ?? data.order.tipo_ot ?? data.order.tipo)}`, { font: bold });
  drawLines(`Dirección: ${text(data.site?.direccion)}`);
  drawLines(`Equipo: ${text(data.asset?.nombre)} · ${text(data.asset?.marca)} ${text(data.asset?.modelo)} · Ref. ${text(data.asset?.referencia)}`);
  drawLines(`Inicio: ${dateTime(data.visit?.fecha_inicio)} · Finalización: ${dateTime(data.visit?.fecha_fin)}`);
  y -= 8;

  section("Trabajo solicitado");
  drawLines(text(data.order.trabajo_solicitado ?? data.order.descripcion, "Sin descripción registrada."));
  if (data.order.instrucciones_tecnico) {
    y -= 6;
    drawLines("Instrucciones técnicas", { font: bold, color: accent });
    drawLines(text(data.order.instrucciones_tecnico));
  }
  if (data.order.riesgos_precauciones) {
    y -= 6;
    drawLines("Riesgos y precauciones", { font: bold, color: danger });
    drawLines(text(data.order.riesgos_precauciones));
  }

  section("Resultado técnico");
  drawLines(text(data.visit?.trabajo_realizado ?? data.order.trabajo_realizado, "Sin resumen técnico registrado."));
  const resultItems = [
    ["Diagnóstico", data.visit?.diagnostico],
    ["Pruebas realizadas", data.visit?.pruebas_realizadas],
    ["Recomendaciones", data.visit?.recomendaciones],
    ["Trabajo pendiente", data.visit?.trabajo_pendiente],
  ] as const;
  for (const [label, value] of resultItems) {
    if (!value) continue;
    y -= 6;
    drawLines(label, { font: bold, color: accent });
    drawLines(text(value));
  }

  section("Checklist");
  if (data.checklist.length === 0) {
    drawLines("No hay puntos de checklist registrados.", { color: muted });
  } else {
    for (const [index, item] of data.checklist.entries()) {
      const point = text(item.punto ?? item.titulo, `Punto ${index + 1}`);
      const result = text(item.resultado, "Pendiente");
      const observation = text(item.observaciones, "");
      const blockHeight = observation ? 52 : 38;
      ensure(blockHeight);
      page.drawRectangle({ x: MARGIN, y: y - blockHeight + 12, width: CONTENT_WIDTH, height: blockHeight, borderColor: rgb(0.84, 0.88, 0.9), borderWidth: 0.7 });
      page.drawText(`${index + 1}.`, { x: MARGIN + 8, y, size: 8.5, font: bold, color: accent });
      const pointLines = wrapText(point, bold, 8.5, CONTENT_WIDTH - 120);
      pointLines.slice(0, 2).forEach((line, lineIndex) => page.drawText(line, { x: MARGIN + 27, y: y - lineIndex * 10, size: 8.5, font: bold, color: brand }));
      page.drawText(result, { x: PAGE_WIDTH - MARGIN - Math.min(112, regular.widthOfTextAtSize(result, 8.5)), y, size: 8.5, font: bold, color: result.toLowerCase() === "ko" ? danger : accent });
      if (observation) {
        const observationLines = wrapText(`Observación: ${observation}`, regular, 7.8, CONTENT_WIDTH - 35);
        observationLines.slice(0, 2).forEach((line, lineIndex) => page.drawText(line, { x: MARGIN + 27, y: y - 23 - lineIndex * 9, size: 7.8, font: regular, color: muted }));
      }
      y -= blockHeight + 5;
    }
  }

  const reportPhotos = data.photos.slice(0, MAX_REPORT_PHOTOS);
  section("Evidencias fotográficas");
  if (reportPhotos.length === 0) {
    drawLines("No hay fotografías vinculadas a esta intervención.", { color: muted });
  } else {
    for (const [index, item] of reportPhotos.entries()) {
      const image = await embedImage(document, service, text(item.bucket, "ot-photos"), text(item.path, ""));
      if (!image) continue;
      const availableWidth = CONTENT_WIDTH;
      const maxHeight = 350;
      const scale = Math.min(availableWidth / image.width, maxHeight / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      ensure(height + 38);
      page.drawImage(image, { x: MARGIN + (CONTENT_WIDTH - width) / 2, y: y - height, width, height });
      y -= height + 13;
      drawLines(`Foto ${index + 1} · ${text(item.categoria ?? item.tipo)}${item.comentario ? ` · ${text(item.comentario)}` : ""}`, { size: 8, color: muted });
      y -= 10;
    }
  }

  section("Firma técnica");
  const technicianSignature = data.signatures.find((item) => item.tipo === "tecnico") ?? null;
  if (!technicianSignature) {
    drawLines("No se ha registrado firma técnica.", { color: muted });
  } else {
    const signature = await embedImage(document, service, text(technicianSignature.bucket, "ot-signatures"), text(technicianSignature.path, ""));
    if (signature) {
      const scale = Math.min(220 / signature.width, 85 / signature.height, 1);
      const width = signature.width * scale;
      const height = signature.height * scale;
      ensure(height + 44);
      page.drawImage(signature, { x: MARGIN, y: y - height, width, height });
      page.drawLine({ start: { x: MARGIN, y: y - height - 4 }, end: { x: MARGIN + 240, y: y - height - 4 }, thickness: 0.6, color: muted });
      y -= height + 18;
    }
    drawLines(`Firmado por: ${text(technicianSignature.firmante_nombre ?? data.technician?.nombre)}`, { font: bold });
    drawLines(`Fecha de firma: ${dateTime(technicianSignature.signed_at ?? technicianSignature.created_at)}`, { size: 8, color: muted });
  }

  if (data.report.tipo === "final") {
    section("Validación administrativa");
    drawLines(`Decisión: ${text(data.review?.decision, "Validada")}`, { font: bold, color: accent });
    drawLines(text(data.review?.notas, "Sin notas adicionales."));
    drawLines(`Fecha de revisión: ${dateTime(data.review?.created_at)}`, { size: 8, color: muted });
  }

  const pages = document.getPages();
  for (const [index, currentPage] of pages.entries()) {
    currentPage.drawLine({ start: { x: MARGIN, y: 43 }, end: { x: PAGE_WIDTH - MARGIN, y: 43 }, thickness: 0.6, color: rgb(0.82, 0.86, 0.88) });
    currentPage.drawText("IsiVoltPro OT · Documento privado y versionado", { x: MARGIN, y: 28, size: 7.3, font: regular, color: muted });
    const pageLabel = `Página ${index + 1} de ${pages.length}`;
    currentPage.drawText(pageLabel, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageLabel, 7.3), y: 28, size: 7.3, font: regular, color: muted });
  }

  return document.save({ useObjectStreams: true });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "Método no permitido" });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return response(401, { error: "Debes iniciar sesión" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return response(500, { error: "La función no está configurada" });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let reserved: ReservedReport | null = null;
  let uploadedPath: string | null = null;

  try {
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return response(401, { error: "La sesión no es válida" });

    const body = await request.json() as JsonRecord;
    const workOrderId = requireUuid(body.workOrderId);
    const reportType: ReportType = body.reportType === "final" ? "final" : "provisional";

    const { data: reservationData, error: reservationError } = await userClient.rpc("reserve_work_order_report", {
      work_order_uuid: workOrderId,
      report_type_text: reportType,
    });
    if (reservationError || !reservationData) throw reservationError ?? new Error("No se pudo reservar el informe");
    reserved = reservationData as ReservedReport;

    const reportData = await loadReportData(serviceClient, reserved);
    const pdfBytes = await buildPdf(reportData, serviceClient);
    const checksum = await sha256Hex(pdfBytes);

    const { error: uploadError } = await serviceClient.storage.from(REPORT_BUCKET).upload(reserved.path, pdfBytes, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) throw uploadError;
    uploadedPath = reserved.path;

    const { data: completed, error: completeError } = await userClient.rpc("complete_work_order_report", {
      report_uuid: reserved.id,
      mime_type_text: "application/pdf",
      size_bytes_value: pdfBytes.byteLength,
      checksum_text: checksum,
    });
    if (completeError || !completed) throw completeError ?? new Error("No se pudo completar el informe");

    return response(200, {
      report: completed,
      message: reportType === "final" ? "Informe final generado" : "Informe provisional generado",
    });
  } catch (error) {
    if (uploadedPath) await serviceClient.storage.from(REPORT_BUCKET).remove([uploadedPath]);
    if (reserved?.id) {
      await userClient.rpc("fail_work_order_report", {
        report_uuid: reserved.id,
        reason_text: safeError(error),
      });
    }
    return response(400, { error: safeError(error) });
  }
});
