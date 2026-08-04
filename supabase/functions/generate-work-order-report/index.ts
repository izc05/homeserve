import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const REPORT_BUCKET = "ot-reports";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REPORT_PHOTOS = 8;

type JsonRecord = Record<string, unknown>;
type ReportType = "provisional" | "final";
type ReportBrandKey = "isivoltpro" | "homeserve-demo";
type PdfColor = [number, number, number];
type ReportBrand = {
  productName: string;
  wordmark: Array<{ text: string; accent?: boolean }>;
  footer: string;
  primary: PdfColor;
  accent: PdfColor;
  pale: PdfColor;
};

const REPORT_BRANDS: Record<ReportBrandKey, ReportBrand> = {
  isivoltpro: {
    productName: "IsiVoltPro OT",
    wordmark: [{ text: "ISI" }, { text: "VOLT", accent: true }, { text: "PRO" }, { text: " OT", accent: true }],
    footer: "IsiVoltPro OT - Documento privado y versionado",
    primary: [0.05, 0.15, 0.24],
    accent: [0.08, 0.48, 0.68],
    pale: [0.94, 0.97, 0.98],
  },
  "homeserve-demo": {
    productName: "HomeServe OT Demo",
    wordmark: [{ text: "HOME" }, { text: "SERVE", accent: true }, { text: " OT DEMO" }],
    footer: "HomeServe OT Demo - Documento demostrativo y versionado",
    primary: [0.25, 0.05, 0.07],
    accent: [0.89, 0.02, 0.07],
    pale: [1.0, 0.94, 0.95],
  },
};

type ReservedReport = {
  id: string;
  tenant_id: string;
  ot_id: string;
  version: number;
  filename: string;
  bucket: string;
  path: string;
  tipo: ReportType;
  generated_at?: string;
};

type ReportData = {
  report: ReservedReport;
  order: JsonRecord;
  tenant: JsonRecord;
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

function json(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function rawText(value: unknown, fallback = "-") {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value);
  return normalized || fallback;
}

function pdfText(value: unknown, fallback = "-") {
  return rawText(value, fallback)
    .replaceAll("€", "EUR")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "?");
}

function dateTime(value: unknown) {
  if (!value) return "-";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(parsed);
}

function safeError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : error instanceof Error
      ? error.message
      : String(error || "");
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

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of value.replaceAll("\r", "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = word;
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function maybeOne(client: SupabaseClient, table: string, id: unknown) {
  if (!id) return null;
  const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as JsonRecord | null;
}

async function loadReportData(client: SupabaseClient, report: ReservedReport): Promise<ReportData> {
  const { data: order, error: orderError } = await client.from("ordenes_trabajo").select("*").eq("id", report.ot_id).single();
  if (orderError || !order) throw orderError ?? new Error("La OT no existe");
  const workOrder = order as JsonRecord;

  const [tenant, clientRow, site, location, asset, technician, visitResult, checklistResult, photosResult, signaturesResult, reviewResult] = await Promise.all([
    maybeOne(client, "tenants", report.tenant_id),
    maybeOne(client, "clientes", workOrder.cliente_id),
    maybeOne(client, "instalaciones", workOrder.instalacion_id),
    maybeOne(client, "ubicaciones", workOrder.ubicacion_id),
    maybeOne(client, "activos", workOrder.activo_id),
    maybeOne(client, "profiles", workOrder.assigned_to),
    client.from("ot_visitas").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("ot_checklist_respuestas").select("*").eq("ot_id", report.ot_id).order("seccion_orden", { ascending: true }).order("orden", { ascending: true }),
    client.from("ot_fotos").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: true }),
    client.from("ot_firmas").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: true }),
    client.from("ot_revisiones_admin").select("*").eq("ot_id", report.ot_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const firstError = [visitResult.error, checklistResult.error, photosResult.error, signaturesResult.error, reviewResult.error].find(Boolean);
  if (firstError) throw firstError;
  if (!tenant) throw new Error("La organización de la OT no existe");

  return {
    report,
    order: workOrder,
    tenant,
    client: clientRow,
    site,
    location,
    asset,
    technician,
    visit: visitResult.data as JsonRecord | null,
    checklist: (checklistResult.data ?? []) as JsonRecord[],
    photos: (photosResult.data ?? []) as JsonRecord[],
    signatures: (signaturesResult.data ?? []) as JsonRecord[],
    review: reviewResult.data as JsonRecord | null,
  };
}

async function embedStoredImage(document: PDFDocument, client: SupabaseClient, bucket: unknown, path: unknown): Promise<PDFImage | null> {
  const bucketName = rawText(bucket, "");
  const objectPath = rawText(path, "");
  if (!bucketName || !objectPath) return null;
  const { data, error } = await client.storage.from(bucketName).download(objectPath);
  if (error || !data || data.size < 1 || data.size > MAX_IMAGE_BYTES) return null;

  const bytes = new Uint8Array(await data.arrayBuffer());
  const mime = data.type.toLowerCase();
  try {
    if (mime.includes("png") || objectPath.toLowerCase().endsWith(".png")) return await document.embedPng(bytes);
    if (mime.includes("jpeg") || mime.includes("jpg") || /\.jpe?g$/i.test(objectPath)) return await document.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
}

async function buildPdf(data: ReportData, client: SupabaseClient) {
  const document = await PDFDocument.create();
  const brandKey: ReportBrandKey = data.tenant.branding_key === "homeserve-demo" ? "homeserve-demo" : "isivoltpro";
  const brand = REPORT_BRANDS[brandKey];
  document.setTitle(`${pdfText(data.order.codigo_ot)} - Informe ${data.report.tipo}`);
  document.setAuthor(brand.productName);
  document.setCreator(brand.productName);
  document.setProducer(`${brand.productName} - Supabase Edge Functions`);

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(...brand.primary);
  const blue = rgb(...brand.accent);
  const pale = rgb(...brand.pale);
  const grey = rgb(0.40, 0.46, 0.50);
  const red = rgb(0.68, 0.15, 0.12);

  let page: PDFPage;
  let y = 0;

  const newPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 12, width: PAGE_WIDTH, height: 12, color: blue });
    let brandX = MARGIN;
    for (const segment of brand.wordmark) {
      const segmentColor = segment.accent ? blue : navy;
      page.drawText(segment.text, { x: brandX, y: PAGE_HEIGHT - 44, size: 15, font: bold, color: segmentColor });
      brandX += bold.widthOfTextAtSize(segment.text, 15);
    }
    const kind = data.report.tipo === "final" ? "INFORME FINAL" : "INFORME PROVISIONAL";
    page.drawText(kind, { x: PAGE_WIDTH - MARGIN - 132, y: PAGE_HEIGHT - 43, size: 9.5, font: bold, color: data.report.tipo === "final" ? navy : red });
    y = PAGE_HEIGHT - 74;
  };

  const ensure = (height: number) => {
    if (y - height < 62) newPage();
  };

  const paragraph = (value: unknown, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const size = options.size ?? 9.2;
    const font = options.font ?? regular;
    const gap = options.gap ?? 3;
    const lines = wrap(pdfText(value), font, size, CONTENT_WIDTH);
    ensure(lines.length * (size + gap) + 4);
    for (const line of lines) {
      page.drawText(line || " ", { x: MARGIN, y, size, font, color: options.color ?? navy });
      y -= size + gap;
    }
  };

  const section = (title: string) => {
    ensure(34);
    y -= 4;
    page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_WIDTH, height: 23, color: pale });
    page.drawRectangle({ x: MARGIN, y: y - 7, width: 4, height: 23, color: blue });
    page.drawText(pdfText(title).toUpperCase(), { x: MARGIN + 11, y, size: 9.5, font: bold, color: navy });
    y -= 28;
  };

  const field = (label: string, value: unknown, x: number, width: number) => {
    page.drawText(pdfText(label).toUpperCase(), { x, y, size: 6.7, font: bold, color: grey });
    const lines = wrap(pdfText(value), regular, 8.8, width).slice(0, 3);
    lines.forEach((line, index) => page.drawText(line, { x, y: y - 12 - index * 10, size: 8.8, font: regular, color: navy }));
  };

  newPage();
  page.drawText(pdfText(data.order.codigo_ot), { x: MARGIN, y, size: 22, font: bold, color: navy });
  const version = `Version ${data.report.version}`;
  page.drawText(version, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(version, 9), y: y + 3, size: 9, font: bold, color: blue });
  y -= 29;
  paragraph(data.order.titulo, { size: 12.5, font: bold, gap: 4 });
  y -= 4;
  paragraph(`Generado: ${dateTime(data.report.generated_at ?? new Date().toISOString())}`, { size: 7.8, color: grey });
  y -= 16;

  ensure(110);
  const column = (CONTENT_WIDTH - 18) / 3;
  field("Cliente", data.client?.nombre, MARGIN, column);
  field("Instalacion", data.site?.nombre, MARGIN + column + 9, column);
  field("Ubicacion", data.location?.nombre ?? data.site?.direccion, MARGIN + (column + 9) * 2, column);
  y -= 52;
  field("Tecnico", data.technician?.nombre, MARGIN, column);
  field("Prioridad", data.order.prioridad, MARGIN + column + 9, column);
  field("Estado", data.order.estado, MARGIN + (column + 9) * 2, column);
  y -= 58;

  section("Datos de la intervencion");
  paragraph(`Tipo: ${rawText(data.order.tipo_ot_detalle ?? data.order.tipo_ot ?? data.order.tipo)}`, { font: bold });
  paragraph(`Direccion: ${rawText(data.site?.direccion)}`);
  paragraph(`Equipo: ${rawText(data.asset?.nombre)} - ${rawText(data.asset?.marca)} ${rawText(data.asset?.modelo)} - Ref. ${rawText(data.asset?.referencia)}`);
  paragraph(`Inicio: ${dateTime(data.visit?.fecha_inicio)} - Finalizacion: ${dateTime(data.visit?.fecha_fin)}`);

  section("Trabajo solicitado");
  paragraph(data.order.trabajo_solicitado ?? data.order.descripcion ?? "Sin descripcion registrada.");
  if (data.order.instrucciones_tecnico) {
    y -= 4;
    paragraph("Instrucciones tecnicas", { font: bold, color: blue });
    paragraph(data.order.instrucciones_tecnico);
  }
  if (data.order.riesgos_precauciones) {
    y -= 4;
    paragraph("Riesgos y precauciones", { font: bold, color: red });
    paragraph(data.order.riesgos_precauciones);
  }

  section("Resultado tecnico");
  paragraph(data.visit?.trabajo_realizado ?? data.order.trabajo_realizado ?? "Sin resumen tecnico registrado.");
  for (const [label, value] of [
    ["Diagnostico", data.visit?.diagnostico],
    ["Pruebas realizadas", data.visit?.pruebas_realizadas],
    ["Recomendaciones", data.visit?.recomendaciones],
    ["Trabajo pendiente", data.visit?.trabajo_pendiente],
  ] as const) {
    if (!value) continue;
    y -= 4;
    paragraph(label, { font: bold, color: blue });
    paragraph(value);
  }

  section("Checklist");
  if (!data.checklist.length) {
    paragraph("No hay puntos de checklist registrados.", { color: grey });
  } else {
    for (const [index, item] of data.checklist.entries()) {
      const point = pdfText(item.punto ?? item.titulo, `Punto ${index + 1}`);
      const result = pdfText(item.resultado, "Pendiente");
      const observation = pdfText(item.observaciones, "");
      const height = observation ? 50 : 36;
      ensure(height + 6);
      page.drawRectangle({ x: MARGIN, y: y - height + 11, width: CONTENT_WIDTH, height, borderColor: rgb(0.82, 0.87, 0.89), borderWidth: 0.7 });
      page.drawText(`${index + 1}.`, { x: MARGIN + 8, y, size: 8.2, font: bold, color: blue });
      wrap(point, bold, 8.2, CONTENT_WIDTH - 125).slice(0, 2).forEach((line, lineIndex) => page.drawText(line, { x: MARGIN + 27, y: y - lineIndex * 10, size: 8.2, font: bold, color: navy }));
      page.drawText(result, { x: PAGE_WIDTH - MARGIN - Math.min(105, regular.widthOfTextAtSize(result, 8.2)), y, size: 8.2, font: bold, color: result.toLowerCase() === "ko" ? red : blue });
      if (observation) wrap(`Observacion: ${observation}`, regular, 7.5, CONTENT_WIDTH - 35).slice(0, 2).forEach((line, lineIndex) => page.drawText(line, { x: MARGIN + 27, y: y - 22 - lineIndex * 9, size: 7.5, font: regular, color: grey }));
      y -= height + 5;
    }
  }

  section("Evidencias fotograficas");
  const reportPhotos = data.photos.slice(0, MAX_REPORT_PHOTOS);
  if (!reportPhotos.length) {
    paragraph("No hay fotografias vinculadas a esta intervencion.", { color: grey });
  } else {
    let embedded = 0;
    for (const photo of reportPhotos) {
      const image = await embedStoredImage(document, client, photo.bucket ?? "ot-photos", photo.path);
      if (!image) continue;
      const scale = Math.min(CONTENT_WIDTH / image.width, 330 / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      ensure(height + 42);
      page.drawImage(image, { x: MARGIN + (CONTENT_WIDTH - width) / 2, y: y - height, width, height });
      y -= height + 12;
      embedded += 1;
      paragraph(`Foto ${embedded} - ${rawText(photo.categoria ?? photo.tipo)}${photo.comentario ? ` - ${rawText(photo.comentario)}` : ""}`, { size: 7.8, color: grey });
      y -= 8;
    }
    if (!embedded) paragraph("Las fotografias registradas no pudieron incorporarse al documento.", { color: grey });
  }

  section("Firma tecnica");
  const signature = data.signatures.find((item) => item.tipo === "tecnico") ?? null;
  if (!signature) {
    paragraph("No se ha registrado firma tecnica.", { color: grey });
  } else {
    const image = await embedStoredImage(document, client, signature.bucket ?? "ot-signatures", signature.path);
    if (image) {
      const scale = Math.min(220 / image.width, 82 / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      ensure(height + 45);
      page.drawImage(image, { x: MARGIN, y: y - height, width, height });
      page.drawLine({ start: { x: MARGIN, y: y - height - 4 }, end: { x: MARGIN + 235, y: y - height - 4 }, thickness: 0.6, color: grey });
      y -= height + 17;
    }
    paragraph(`Firmado por: ${rawText(signature.firmante_nombre ?? data.technician?.nombre)}`, { font: bold });
    paragraph(`Fecha de firma: ${dateTime(signature.signed_at ?? signature.created_at)}`, { size: 7.8, color: grey });
  }

  if (data.report.tipo === "final") {
    section("Validacion administrativa");
    paragraph(`Decision: ${rawText(data.review?.decision, "Validada")}`, { font: bold, color: blue });
    paragraph(data.review?.notas ?? "Sin notas adicionales.");
    paragraph(`Fecha de revision: ${dateTime(data.review?.created_at)}`, { size: 7.8, color: grey });
  }

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_WIDTH - MARGIN, y: 42 }, thickness: 0.6, color: rgb(0.82, 0.86, 0.88) });
    currentPage.drawText(brand.footer, { x: MARGIN, y: 27, size: 7.1, font: regular, color: grey });
    const label = `Pagina ${index + 1} de ${pages.length}`;
    currentPage.drawText(label, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 7.1), y: 27, size: 7.1, font: regular, color: grey });
  });

  return document.save({ useObjectStreams: true });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json(405, { error: "Metodo no permitido" });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json(401, { error: "Debes iniciar sesión" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { error: "La funcion no esta configurada" });

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
    if (userError || !userData.user) return json(401, { error: "La sesion no es valida" });

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
    const checksum = await sha256(pdfBytes);

    const { error: uploadError } = await serviceClient.storage.from(REPORT_BUCKET).upload(reserved.path, pdfBytes, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) throw uploadError;
    uploadedPath = reserved.path;

    const { data: completed, error: completeError } = await serviceClient.rpc("complete_work_order_report", {
      report_uuid: reserved.id,
      mime_type_text: "application/pdf",
      size_bytes_value: pdfBytes.byteLength,
      checksum_text: checksum,
    });
    if (completeError || !completed) throw completeError ?? new Error("No se pudo completar el informe");

    return json(200, {
      report: completed as unknown as JsonRecord,
      message: reportType === "final" ? "Informe final generado" : "Informe provisional generado",
    });
  } catch (error) {
    if (uploadedPath) await serviceClient.storage.from(REPORT_BUCKET).remove([uploadedPath]);
    if (reserved?.id) {
      await serviceClient.rpc("fail_work_order_report", {
        report_uuid: reserved.id,
        reason_text: safeError(error),
      });
    }
    return json(400, { error: safeError(error) });
  }
});
