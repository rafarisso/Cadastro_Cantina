const TERM_VERSION = "v1.0-2026-01-18";
const TERM_TEMPLATE = `TERMO DE AUTORIZACAO PARA COMPRAS FATURADAS (POS-PAGAS) - CANTINA ORION

IDENTIFICACAO DO RESPONSAVEL LEGAL: {RESP_NOME}, CPF {RESP_CPF}, residente e domiciliado em {RESP_ENDERECO}.
IDENTIFICACAO DO ALUNO: {ALUNO_NOME}, matriculado no COLEGIO ORION.
IDENTIFICACAO DA CANTINA: CANTINA ORION, inscrita no CNPJ 25.354.981/0001-04.

1. OBJETO
O presente termo tem por objeto a autorizacao expressa do RESPONSAVEL LEGAL para que o ALUNO realize compras faturadas (pos-pagas) na CANTINA ORION.

2. TERCEIRIZACAO E AUSENCIA DE VINCULO
A CANTINA ORION e uma operacao terceirizada e independente, sem vinculo administrativo/financeiro com o COLEGIO ORION, que nao integra o presente instrumento nem responde por cobrancas.

3. RESPONSABILIDADE PELOS CONSUMOS
O RESPONSAVEL LEGAL assume total e exclusiva responsabilidade pelo pagamento de todas as compras realizadas pelo ALUNO, inclusive taxas, tarifas e encargos aplicaveis.

4. INADIMPLENCIA
Em caso de atraso superior a 30 (trinta) dias, a CANTINA ORION podera emitir boleto, realizar cobranca administrativa e adotar as medidas judiciais cabiveis para a recuperacao do credito, nos termos da legislacao vigente.

5. BASE LEGAL E TRATAMENTO DE DADOS
O RESPONSAVEL LEGAL reconhece que o tratamento dos dados pessoais atende as finalidades de cadastro, controle financeiro, prevencao a fraudes e cobranca administrativa/judicial, nos termos da LGPD (Lei 13.709/2018). Em caso de inadimplemento, aplicam-se os artigos 389, 395 e 397 do Codigo Civil.

6. DECLARACAO DE VERACIDADE
O RESPONSAVEL LEGAL declara que todas as informacoes fornecidas sao verdadeiras e atualizadas, responsabilizando-se por eventual omissao ou inexatidao.

7. EVIDENCIAS E ASSINATURA ELETRONICA
As partes reconhecem como validas as evidencias eletronicas, incluindo assinatura desenhada, registro de data/hora do aceite, endereco IP, user-agent e versao deste termo.

8. FORO
Fica eleito o foro da Comarca de Sao Paulo/SP para dirimir quaisquer duvidas oriundas deste termo.
`;

const form = document.getElementById("wizardForm");
const steps = Array.from(document.querySelectorAll(".step"));
const stepIndicators = Array.from(document.querySelectorAll(".step-indicator"));
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const stepLabel = document.getElementById("stepLabel");
const formMessage = document.getElementById("formMessage");
const termTextEl = document.getElementById("termText");
const reviewBox = document.getElementById("reviewBox");
const successBox = document.getElementById("successBox");
const acceptCheckbox = document.getElementById("accept_term");
const acceptError = document.getElementById("accept_error");
const signatureCanvas = document.getElementById("signatureCanvas");
const signatureError = document.getElementById("signature_error");
const clearSignatureBtn = document.getElementById("clearSignature");

const fields = {
  respName: document.getElementById("resp_name"),
  respCpf: document.getElementById("resp_cpf"),
  respBirth: document.getElementById("resp_birth"),
  respEmail: document.getElementById("resp_email"),
  respPhone1: document.getElementById("resp_phone1"),
  respPhone2: document.getElementById("resp_phone2"),
  respCep: document.getElementById("resp_cep"),
  respStreet: document.getElementById("resp_street"),
  respNumber: document.getElementById("resp_number"),
  respNeighborhood: document.getElementById("resp_neighborhood"),
  respCity: document.getElementById("resp_city"),
  respState: document.getElementById("resp_state"),
  respComplement: document.getElementById("resp_complement"),
  studentName: document.getElementById("student_name"),
  studentClass: document.getElementById("student_class"),
  studentPeriod: document.getElementById("student_period"),
  studentSchool: document.getElementById("student_school"),
};

let currentStep = 0;
const signatureState = {
  isDrawing: false,
  hasSignature: false,
};

const signatureContext = signatureCanvas.getContext("2d");
const supportsPointerEvents = "PointerEvent" in window;

const onlyDigits = (value) => (value || "").replace(/\D/g, "");

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const formatPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatCep = (value) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidCpf = (value) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
};

const isValidPhone = (value) => {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
};

const isValidCep = (value) => onlyDigits(value).length === 8;

const escapeHtml = (value) =>
  (value || "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])
  );

const buildAddressString = (guardian) => {
  const parts = [];
  if (guardian.address_street) {
    const number = guardian.address_number ? `, ${guardian.address_number}` : "";
    const complement = guardian.address_complement ? ` - ${guardian.address_complement}` : "";
    parts.push(`${guardian.address_street}${number}${complement}`);
  }
  if (guardian.address_neighborhood) {
    parts.push(guardian.address_neighborhood);
  }
  const cityState = [guardian.address_city, guardian.address_state].filter(Boolean).join("/");
  if (cityState) {
    parts.push(cityState);
  }
  if (guardian.cep) {
    parts.push(`CEP ${formatCep(guardian.cep)}`);
  }
  return parts.join(" - ");
};

const buildTermText = (guardian, student) => {
  const address = buildAddressString(guardian);
  return TERM_TEMPLATE.replaceAll("{RESP_NOME}", guardian.full_name || "")
    .replaceAll("{RESP_CPF}", formatCpf(guardian.cpf || ""))
    .replaceAll("{RESP_ENDERECO}", address || "")
    .replaceAll("{ALUNO_NOME}", student.full_name || "");
};

const setMessage = (text, type = "") => {
  formMessage.textContent = text;
  formMessage.classList.remove("is-error", "is-success");
  if (type === "error") formMessage.classList.add("is-error");
  if (type === "success") formMessage.classList.add("is-success");
};

const clearErrors = (stepEl) => {
  stepEl.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });
  stepEl.querySelectorAll(".field").forEach((field) => field.classList.remove("has-error"));
};

const setFieldError = (input, message) => {
  const wrapper = input.closest(".field");
  if (!wrapper) return;
  wrapper.classList.add("has-error");
  const errorEl = wrapper.querySelector(".field-error");
  if (errorEl) errorEl.textContent = message;
};

const getGuardianData = () => ({
  full_name: fields.respName.value.trim(),
  cpf: fields.respCpf.value.trim(),
  birth_date: fields.respBirth.value,
  email: fields.respEmail.value.trim(),
  phone_primary: fields.respPhone1.value.trim(),
  phone_secondary: fields.respPhone2.value.trim(),
  cep: fields.respCep.value.trim(),
  address_street: fields.respStreet.value.trim(),
  address_number: fields.respNumber.value.trim(),
  address_complement: fields.respComplement.value.trim(),
  address_neighborhood: fields.respNeighborhood.value.trim(),
  address_city: fields.respCity.value.trim(),
  address_state: fields.respState.value.trim(),
});

const getStudentData = () => ({
  full_name: fields.studentName.value.trim(),
  class_room: fields.studentClass.value.trim(),
  period: fields.studentPeriod.value,
  school_name: fields.studentSchool.value.trim() || "Colégio Órion",
});

const updateTermText = () => {
  const guardian = getGuardianData();
  const student = getStudentData();
  const term = buildTermText(guardian, student);
  termTextEl.textContent = term;
  return term;
};

const updateReview = () => {
  const guardian = getGuardianData();
  const student = getStudentData();
  const address = buildAddressString(guardian);

  reviewBox.innerHTML = `
    <div class="review-section">
      <h3>Responsável</h3>
      <p><strong>Nome:</strong> ${escapeHtml(guardian.full_name)}</p>
      <p><strong>CPF:</strong> ${escapeHtml(formatCpf(guardian.cpf))}</p>
      <p><strong>Data de nascimento:</strong> ${escapeHtml(guardian.birth_date)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(guardian.email)}</p>
      <p><strong>Telefones:</strong> ${escapeHtml(formatPhone(guardian.phone_primary))} / ${escapeHtml(
    formatPhone(guardian.phone_secondary)
  )}</p>
      <p><strong>Endereço:</strong> ${escapeHtml(address)}</p>
    </div>
    <div class="review-section">
      <h3>Aluno</h3>
      <p><strong>Nome:</strong> ${escapeHtml(student.full_name)}</p>
      <p><strong>Turma:</strong> ${escapeHtml(student.class_room)}</p>
      <p><strong>Período:</strong> ${escapeHtml(student.period)}</p>
      <p><strong>Escola:</strong> ${escapeHtml(student.school_name)}</p>
    </div>
    <div class="review-section">
      <h3>Termo</h3>
      <p><strong>Versão:</strong> ${TERM_VERSION}</p>
      <p><strong>Assinatura:</strong> ${signatureState.hasSignature ? "capturada" : "pendente"}</p>
    </div>
  `;
};

const validateStep = (index) => {
  const stepEl = steps[index];
  clearErrors(stepEl);
  acceptError.textContent = "";
  signatureError.textContent = "";
  let isValid = true;
  let firstInvalid = null;

  if (index === 0) {
    if (!fields.respName.value.trim()) {
      setFieldError(fields.respName, "Informe o nome completo.");
      firstInvalid = firstInvalid || fields.respName;
      isValid = false;
    }
    if (!isValidCpf(fields.respCpf.value)) {
      setFieldError(fields.respCpf, "CPF inválido.");
      firstInvalid = firstInvalid || fields.respCpf;
      isValid = false;
    }
    if (!fields.respBirth.value) {
      setFieldError(fields.respBirth, "Informe a data de nascimento.");
      firstInvalid = firstInvalid || fields.respBirth;
      isValid = false;
    }
    if (!isValidEmail(fields.respEmail.value)) {
      setFieldError(fields.respEmail, "E-mail inválido.");
      firstInvalid = firstInvalid || fields.respEmail;
      isValid = false;
    }
    if (!isValidPhone(fields.respPhone1.value)) {
      setFieldError(fields.respPhone1, "Telefone inválido.");
      firstInvalid = firstInvalid || fields.respPhone1;
      isValid = false;
    }
    if (!isValidPhone(fields.respPhone2.value)) {
      setFieldError(fields.respPhone2, "Telefone inválido.");
      firstInvalid = firstInvalid || fields.respPhone2;
      isValid = false;
    }
    if (
      isValidPhone(fields.respPhone1.value) &&
      isValidPhone(fields.respPhone2.value) &&
      onlyDigits(fields.respPhone1.value) === onlyDigits(fields.respPhone2.value)
    ) {
      setFieldError(fields.respPhone2, "O telefone secundário deve ser diferente do principal.");
      firstInvalid = firstInvalid || fields.respPhone2;
      isValid = false;
    }
    if (!isValidCep(fields.respCep.value)) {
      setFieldError(fields.respCep, "CEP inválido.");
      firstInvalid = firstInvalid || fields.respCep;
      isValid = false;
    }
    if (!fields.respStreet.value.trim()) {
      setFieldError(fields.respStreet, "Informe a rua.");
      firstInvalid = firstInvalid || fields.respStreet;
      isValid = false;
    }
    if (!fields.respNumber.value.trim()) {
      setFieldError(fields.respNumber, "Informe o número.");
      firstInvalid = firstInvalid || fields.respNumber;
      isValid = false;
    }
    if (!fields.respNeighborhood.value.trim()) {
      setFieldError(fields.respNeighborhood, "Informe o bairro.");
      firstInvalid = firstInvalid || fields.respNeighborhood;
      isValid = false;
    }
    if (!fields.respCity.value.trim()) {
      setFieldError(fields.respCity, "Informe a cidade.");
      firstInvalid = firstInvalid || fields.respCity;
      isValid = false;
    }
    if (!/^[A-Za-z]{2}$/.test(fields.respState.value.trim())) {
      setFieldError(fields.respState, "Informe a UF com 2 letras.");
      firstInvalid = firstInvalid || fields.respState;
      isValid = false;
    }
  }

  if (index === 1) {
    if (!fields.studentName.value.trim()) {
      setFieldError(fields.studentName, "Informe o nome do aluno.");
      firstInvalid = firstInvalid || fields.studentName;
      isValid = false;
    }
    if (!fields.studentClass.value.trim()) {
      setFieldError(fields.studentClass, "Informe a turma/sala.");
      firstInvalid = firstInvalid || fields.studentClass;
      isValid = false;
    }
    if (!fields.studentPeriod.value) {
      setFieldError(fields.studentPeriod, "Selecione o período.");
      firstInvalid = firstInvalid || fields.studentPeriod;
      isValid = false;
    }
  }

  if (index === 2) {
    if (!acceptCheckbox.checked) {
      acceptError.textContent = "Você precisa aceitar o termo.";
      isValid = false;
    }
    if (!signatureState.hasSignature) {
      signatureError.textContent = "Assinatura obrigatória para continuar.";
      isValid = false;
    }
  }

  if (!isValid && firstInvalid) {
    firstInvalid.focus();
  }

  return isValid;
};

const validateAll = () => {
  for (let i = 0; i < 3; i += 1) {
    if (!validateStep(i)) {
      showStep(i);
      return false;
    }
  }
  return true;
};

const showStep = (index) => {
  currentStep = index;
  steps.forEach((step, idx) => {
    step.classList.toggle("active", idx === index);
  });
  stepIndicators.forEach((indicator, idx) => {
    indicator.classList.toggle("active", idx === index);
  });
  stepLabel.textContent = `Etapa ${index + 1} de ${steps.length}`;
  prevBtn.disabled = index === 0;
  nextBtn.style.display = index === steps.length - 1 ? "none" : "inline-flex";
  submitBtn.style.display = index === steps.length - 1 ? "inline-flex" : "none";

  if (index === 2) updateTermText();
  if (index === 3) updateReview();
};

const resizeCanvas = () => {
  const rect = signatureCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const snapshot = signatureState.hasSignature ? signatureCanvas.toDataURL("image/png") : null;

  signatureCanvas.width = rect.width * ratio;
  signatureCanvas.height = rect.height * ratio;
  signatureContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  signatureContext.lineWidth = 2;
  signatureContext.lineCap = "round";
  signatureContext.lineJoin = "round";
  signatureContext.strokeStyle = "#2a2018";

  if (snapshot) {
    const img = new Image();
    img.onload = () => {
      signatureContext.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = snapshot;
  } else {
    signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  }
};

const getCanvasPoint = (event) => {
  const rect = signatureCanvas.getBoundingClientRect();
  let clientX = event.clientX;
  let clientY = event.clientY;

  if (event.touches && event.touches[0]) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches[0]) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
};

const preventSignatureDefault = (event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

const startSignature = (event) => {
  preventSignatureDefault(event);
  const point = getCanvasPoint(event);
  signatureState.isDrawing = true;
  signatureState.hasSignature = true;
  signatureError.textContent = "";
  signatureContext.beginPath();
  signatureContext.moveTo(point.x, point.y);

  if (event.pointerId !== undefined && signatureCanvas.setPointerCapture) {
    signatureCanvas.setPointerCapture(event.pointerId);
  }
};

const drawSignature = (event) => {
  if (!signatureState.isDrawing) return;
  preventSignatureDefault(event);
  const point = getCanvasPoint(event);
  signatureContext.lineTo(point.x, point.y);
  signatureContext.stroke();
};

const endSignature = (event) => {
  if (!signatureState.isDrawing) return;
  preventSignatureDefault(event);
  signatureState.isDrawing = false;

  if (event.pointerId !== undefined && signatureCanvas.releasePointerCapture) {
    signatureCanvas.releasePointerCapture(event.pointerId);
  }
};

const clearSignature = () => {
  signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureState.isDrawing = false;
  signatureState.hasSignature = false;
  signatureError.textContent = "";
};

let lastCepLookup = "";
let cepLookupToken = 0;

const lookupCep = async (cep) => {
  const token = ++cepLookupToken;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("CEP");
    const data = await response.json();
    if (token !== cepLookupToken) return;
    if (data.erro) {
      setFieldError(fields.respCep, "CEP não encontrado.");
      return;
    }
    fields.respStreet.value = data.logradouro || fields.respStreet.value;
    fields.respNeighborhood.value = data.bairro || fields.respNeighborhood.value;
    fields.respCity.value = data.localidade || fields.respCity.value;
    fields.respState.value = (data.uf || fields.respState.value).toUpperCase();
  } catch (error) {
    if (token !== cepLookupToken) return;
    setFieldError(fields.respCep, "Não foi possível consultar o CEP.");
  }
};

fields.respCpf.addEventListener("blur", () => {
  fields.respCpf.value = formatCpf(fields.respCpf.value);
  updateTermText();
});

fields.respPhone1.addEventListener("blur", () => {
  fields.respPhone1.value = formatPhone(fields.respPhone1.value);
});

fields.respPhone2.addEventListener("blur", () => {
  fields.respPhone2.value = formatPhone(fields.respPhone2.value);
});

fields.respCep.addEventListener("input", () => {
  const digits = onlyDigits(fields.respCep.value).slice(0, 8);
  fields.respCep.value = formatCep(digits);

  if (digits.length === 8 && digits !== lastCepLookup) {
    lastCepLookup = digits;
    lookupCep(digits);
  }
});

fields.respCep.addEventListener("blur", () => {
  fields.respCep.value = formatCep(fields.respCep.value);
});

fields.respState.addEventListener("input", () => {
  fields.respState.value = fields.respState.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
});

[fields.respName, fields.respStreet, fields.respNumber, fields.respNeighborhood, fields.respCity, fields.studentName].forEach(
  (field) => field.addEventListener("input", updateTermText)
);

[fields.studentClass, fields.studentPeriod].forEach((field) =>
  field.addEventListener("change", updateTermText)
);

nextBtn.addEventListener("click", () => {
  setMessage("");
  if (validateStep(currentStep)) {
    showStep(currentStep + 1);
  } else {
    setMessage("Revise os campos obrigatórios antes de continuar.", "error");
  }
});

prevBtn.addEventListener("click", () => {
  setMessage("");
  showStep(Math.max(0, currentStep - 1));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  if (!validateAll()) {
    setMessage("Revise as etapas antes de enviar.", "error");
    return;
  }

  const guardian = getGuardianData();
  const student = getStudentData();
  const termText = updateTermText();
  const payload = {
    guardian,
    student,
    term_version: TERM_VERSION,
    term_text: termText,
    signature_data_url: signatureCanvas.toDataURL("image/png"),
  };

  try {
    form.classList.add("is-loading");
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const response = await fetch("/api/submit-authorization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Não foi possível enviar. Tente novamente.");
    }

    form.reset();
    clearSignature();
    successBox.hidden = false;
    successBox.innerHTML = `
      <h3>Autorização enviada com sucesso!</h3>
      <p>Seu termo assinado foi registrado. Guarde o comprovante em PDF.</p>
      <p><a href="${data.document_url}" target="_blank" rel="noopener">Baixar comprovante (PDF)</a></p>
    `;
    setMessage("Envio concluído.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    form.classList.remove("is-loading");
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar autorização";
  }
});

if (supportsPointerEvents) {
  signatureCanvas.addEventListener("pointerdown", startSignature);
  signatureCanvas.addEventListener("pointermove", drawSignature);
  signatureCanvas.addEventListener("pointerup", endSignature);
  signatureCanvas.addEventListener("pointerleave", endSignature);
  signatureCanvas.addEventListener("pointercancel", endSignature);
} else {
  signatureCanvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    startSignature(event);
  });
  signatureCanvas.addEventListener("mousemove", drawSignature);
  window.addEventListener("mouseup", endSignature);

  signatureCanvas.addEventListener("touchstart", startSignature, { passive: false });
  signatureCanvas.addEventListener("touchmove", drawSignature, { passive: false });
  window.addEventListener("touchend", endSignature, { passive: false });
  window.addEventListener("touchcancel", endSignature, { passive: false });
}
clearSignatureBtn.addEventListener("click", clearSignature);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateTermText();
showStep(0);
