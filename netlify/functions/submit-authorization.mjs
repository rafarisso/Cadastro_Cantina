import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "cantina-termos";

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const onlyDigits = (value) => (value || "").replace(/\D/g, "");

const requireFields = (obj, fields) =>
  fields.filter((field) => obj?.[field] === undefined || obj?.[field] === null || obj?.[field] === "");

const wrapText = (text, font, size, maxWidth) => {
  const paragraphs = text.split("\n");
  const lines = [];

  paragraphs.forEach((paragraph, idx) => {
    if (!paragraph.trim()) {
      lines.push("");
      return;
    }
    const words = paragraph.split(/\s+/);
    let line = "";

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line) lines.push(line);
    if (idx < paragraphs.length - 1) lines.push("");
  });

  return lines;
};

const buildPdf = async ({
  guardian,
  student,
  termText,
  signatureDataUrl,
  acceptedAt,
  ip,
  userAgent,
  termVersion,
  termHash,
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize = [595.28, 841.89];
  const margin = 48;
  const lineHeight = 14;
  const maxWidth = pageSize[0] - margin * 2;

  let page = pdfDoc.addPage(pageSize);
  let y = page.getHeight() - margin;

  const addPage = () => {
    page = pdfDoc.addPage(pageSize);
    y = page.getHeight() - margin;
  };

  const drawLine = (text, options = {}) => {
    if (y < margin + lineHeight) addPage();
    page.drawText(text, {
      x: margin,
      y,
      size: options.size || 11,
      font: options.font || font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= options.lineHeight || lineHeight;
  };

  const drawParagraph = (text, options = {}) => {
    const lines = wrapText(text, options.font || font, options.size || 11, maxWidth);
    lines.forEach((line) => {
      if (!line) {
        y -= lineHeight;
        return;
      }
      drawLine(line, options);
    });
  };

  drawLine("COMPROVANTE DE AUTORIZACAO DE COMPRAS FATURADAS", {
    font: fontBold,
    size: 16,
    lineHeight: 22,
  });
  drawLine(`Emitido em: ${acceptedAt}`, { size: 10 });
  y -= 8;

  drawLine("DADOS DO RESPONSAVEL", { font: fontBold, size: 12, lineHeight: 18 });
  drawParagraph(`Nome: ${guardian.full_name}`);
  drawParagraph(`CPF: ${guardian.cpf}`);
  drawParagraph(`Nascimento: ${guardian.birth_date}`);
  drawParagraph(`E-mail: ${guardian.email}`);
  drawParagraph(`Telefone principal: ${guardian.phone_primary}`);
  drawParagraph(`Telefone secundario: ${guardian.phone_secondary}`);
  drawParagraph(`Endereco: ${guardian.address}`);
  y -= 6;

  drawLine("DADOS DO ALUNO", { font: fontBold, size: 12, lineHeight: 18 });
  drawParagraph(`Nome: ${student.full_name}`);
  drawParagraph(`Turma/Sala: ${student.class_room}`);
  drawParagraph(`Periodo: ${student.period}`);
  drawParagraph(`Escola: ${student.school_name}`);
  y -= 6;

  drawLine("TERMO CONTRATUAL", { font: fontBold, size: 12, lineHeight: 18 });
  drawParagraph(termText);
  y -= 6;

  if (signatureDataUrl) {
    const signatureBase64 = signatureDataUrl.split(",")[1];
    const signatureBytes = Buffer.from(signatureBase64, "base64");
    let signatureImage;
    try {
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    } catch (error) {
      signatureImage = await pdfDoc.embedJpg(signatureBytes);
    }

    const imageDims = signatureImage.scale(1);
    const maxImageWidth = 220;
    const maxImageHeight = 90;
    const scale = Math.min(maxImageWidth / imageDims.width, maxImageHeight / imageDims.height, 1);
    const drawWidth = imageDims.width * scale;
    const drawHeight = imageDims.height * scale;

    if (y < margin + drawHeight + 40) addPage();
    drawLine("ASSINATURA ELETRONICA", { font: fontBold, size: 12, lineHeight: 18 });
    page.drawImage(signatureImage, {
      x: margin,
      y: y - drawHeight,
      width: drawWidth,
      height: drawHeight,
    });
    y -= drawHeight + 18;
  }

  drawLine("EVIDENCIAS", { font: fontBold, size: 12, lineHeight: 18 });
  drawParagraph(`Data/hora do aceite (ISO): ${acceptedAt}`);
  drawParagraph(`IP: ${ip}`);
  drawParagraph(`User-Agent: ${userAgent}`);
  drawParagraph(`Versao do termo: ${termVersion}`);
  drawParagraph(`Hash SHA-256: ${termHash}`);

  return pdfDoc.save();
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "Metodo nao permitido." });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { message: "Variaveis de ambiente do Supabase nao configuradas." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return jsonResponse(400, { message: "Payload invalido." });
  }

  const missingGuardian = requireFields(payload.guardian, [
    "full_name",
    "cpf",
    "birth_date",
    "email",
    "phone_primary",
    "phone_secondary",
    "cep",
    "address_street",
    "address_number",
    "address_neighborhood",
    "address_city",
    "address_state",
  ]);

  const missingStudent = requireFields(payload.student, ["full_name", "class_room", "period"]);

  if (!payload.guardian || !payload.student || missingGuardian.length || missingStudent.length) {
    return jsonResponse(400, { message: "Campos obrigatorios ausentes." });
  }

  if (!payload.term_text || !payload.term_version || !payload.signature_data_url) {
    return jsonResponse(400, { message: "Termo ou assinatura ausentes." });
  }

  const cpf = onlyDigits(payload.guardian.cpf);
  const phonePrimary = onlyDigits(payload.guardian.phone_primary);
  const phoneSecondary = onlyDigits(payload.guardian.phone_secondary);
  const cep = onlyDigits(payload.guardian.cep);

  if (cpf.length !== 11) {
    return jsonResponse(400, { message: "CPF invalido." });
  }
  if (![10, 11].includes(phonePrimary.length) || ![10, 11].includes(phoneSecondary.length)) {
    return jsonResponse(400, { message: "Telefone invalido." });
  }
  if (phonePrimary === phoneSecondary) {
    return jsonResponse(400, { message: "Telefones nao podem ser iguais." });
  }
  if (cep.length !== 8) {
    return jsonResponse(400, { message: "CEP invalido." });
  }
  if (!/^[A-Za-z]{2}$/.test(payload.guardian.address_state)) {
    return jsonResponse(400, { message: "UF invalida." });
  }
  if (!['manha', 'tarde'].includes(payload.student.period)) {
    return jsonResponse(400, { message: "Periodo invalido." });
  }
  if (!payload.signature_data_url.startsWith("data:image/")) {
    return jsonResponse(400, { message: "Assinatura invalida." });
  }

  const acceptedAt = new Date().toISOString();
  const termHash = crypto
    .createHash("sha256")
    .update(`${payload.term_text}|${cpf}|${payload.student.full_name}|${acceptedAt}`)
    .digest("hex");

  const headers = event.headers || {};
  const clientIp =
    headers["x-nf-client-connection-ip"] ||
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["client-ip"] ||
    headers["x-real-ip"] ||
    "unknown";

  const userAgent = headers["user-agent"] || "unknown";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  const guardianPayload = {
    full_name: payload.guardian.full_name.trim(),
    cpf,
    birth_date: payload.guardian.birth_date,
    email: payload.guardian.email.trim().toLowerCase(),
    phone_primary: phonePrimary,
    phone_secondary: phoneSecondary,
    cep,
    address_street: payload.guardian.address_street.trim(),
    address_number: payload.guardian.address_number.trim(),
    address_complement: payload.guardian.address_complement?.trim() || null,
    address_neighborhood: payload.guardian.address_neighborhood.trim(),
    address_city: payload.guardian.address_city.trim(),
    address_state: payload.guardian.address_state.trim().toUpperCase(),
    updated_at: new Date().toISOString(),
  };

  const { data: guardianData, error: guardianError } = await supabase
    .from("guardians")
    .upsert(guardianPayload, { onConflict: "cpf" })
    .select("id")
    .single();

  if (guardianError) {
    console.error("Guardian upsert error", guardianError);
    return jsonResponse(500, { message: "Erro ao salvar o responsavel." });
  }

  const studentPayload = {
    guardian_id: guardianData.id,
    full_name: payload.student.full_name.trim(),
    class_room: payload.student.class_room.trim(),
    period: payload.student.period,
    school_name: payload.student.school_name?.trim() || "Colégio Órion",
  };

  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .upsert(studentPayload, { onConflict: "guardian_id,full_name,class_room,period" })
    .select("id")
    .single();

  if (studentError) {
    console.error("Student upsert error", studentError);
    return jsonResponse(500, { message: "Erro ao salvar o aluno." });
  }

  const { data: activeAuthorization, error: activeError } = await supabase
    .from("authorizations")
    .select("id")
    .eq("student_id", studentData.id)
    .eq("status", "active")
    .maybeSingle();

  if (activeError) {
    console.error("Authorization lookup error", activeError);
    return jsonResponse(500, { message: "Erro ao validar autorizacao existente." });
  }

  if (activeAuthorization) {
    return jsonResponse(409, { message: "Ja existe uma autorizacao ativa para este aluno." });
  }

  const authorizationPayload = {
    guardian_id: guardianData.id,
    student_id: studentData.id,
    term_version: payload.term_version,
    term_text: payload.term_text,
    signature_data_url: payload.signature_data_url,
    term_hash_sha256: termHash,
    accepted_at: acceptedAt,
    accepted_ip: clientIp,
    accepted_user_agent: userAgent,
  };

  const { data: authorizationData, error: authorizationError } = await supabase
    .from("authorizations")
    .insert(authorizationPayload)
    .select("id")
    .single();

  if (authorizationError) {
    console.error("Authorization insert error", authorizationError);
    return jsonResponse(500, { message: "Erro ao registrar autorizacao." });
  }

  const address = `${guardianPayload.address_street}, ${guardianPayload.address_number}` +
    `${guardianPayload.address_complement ? ` - ${guardianPayload.address_complement}` : ""}` +
    ` - ${guardianPayload.address_neighborhood} - ${guardianPayload.address_city}/${guardianPayload.address_state}` +
    ` - CEP ${guardianPayload.cep}`;

  let pdfBytes;
  try {
    pdfBytes = await buildPdf({
      guardian: {
        full_name: guardianPayload.full_name,
        cpf: guardianPayload.cpf,
        birth_date: guardianPayload.birth_date,
        email: guardianPayload.email,
        phone_primary: guardianPayload.phone_primary,
        phone_secondary: guardianPayload.phone_secondary,
        address,
      },
      student: {
        full_name: studentPayload.full_name,
        class_room: studentPayload.class_room,
        period: studentPayload.period,
        school_name: studentPayload.school_name,
      },
      termText: payload.term_text,
      signatureDataUrl: payload.signature_data_url,
      acceptedAt,
      ip: clientIp,
      userAgent,
      termVersion: payload.term_version,
      termHash,
    });
  } catch (error) {
    console.error("PDF generation error", error);
    return jsonResponse(500, { message: "Erro ao gerar PDF." });
  }

  const storagePath = `${cpf}/${authorizationData.id}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error("Storage upload error", uploadError);
    return jsonResponse(500, { message: "Erro ao salvar PDF." });
  }

  const { error: documentError } = await supabase.from("documents").insert({
    authorization_id: authorizationData.id,
    storage_bucket: SUPABASE_BUCKET,
    storage_path: storagePath,
  });

  if (documentError) {
    console.error("Document insert error", documentError);
    return jsonResponse(500, { message: "Erro ao registrar documento." });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (signedUrlError) {
    console.error("Signed URL error", signedUrlError);
    return jsonResponse(500, { message: "Erro ao gerar link do PDF." });
  }

  await supabase.from("audit_logs").insert({
    event_type: "authorization_created",
    entity_id: authorizationData.id,
    meta_json: {
      guardian_id: guardianData.id,
      student_id: studentData.id,
      storage_path: storagePath,
      ip: clientIp,
      user_agent: userAgent,
    },
  });

  return jsonResponse(200, {
    success: true,
    authorization_id: authorizationData.id,
    document_url: signedUrlData?.signedUrl,
  });
};
