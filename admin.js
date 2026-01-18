import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm";

// Public config: admin panel uses anon key only.
const config = window.__SUPABASE_CONFIG__ || {};
const SUPABASE_URL = (config.url || "").trim();
const SUPABASE_ANON_KEY = (config.anonKey || "").trim();

const loginView = document.getElementById("loginView");
const deniedView = document.getElementById("deniedView");
const adminView = document.getElementById("adminView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");
const deniedLogout = document.getElementById("deniedLogout");
const appStatus = document.getElementById("appStatus");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const tableBody = document.getElementById("tableBody");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const totalCount = document.getElementById("totalCount");
const detailsModal = document.getElementById("detailsModal");
const closeModal = document.getElementById("closeModal");
const detailVersion = document.getElementById("detailVersion");
const detailHash = document.getElementById("detailHash");
const detailAcceptedAt = document.getElementById("detailAcceptedAt");
const detailIp = document.getElementById("detailIp");
const detailAgent = document.getElementById("detailAgent");
const detailTerm = document.getElementById("detailTerm");

let currentItems = [];
let currentSession = null;

const showView = (view) => {
  loginView.hidden = view !== "login";
  deniedView.hidden = view !== "denied";
  adminView.hidden = view !== "admin";
  logoutBtn.hidden = view !== "admin";
};

const setStatus = (message, type = "") => {
  appStatus.textContent = message;
  appStatus.classList.remove("is-error", "is-success");
  if (type === "error") appStatus.classList.add("is-error");
  if (type === "success") appStatus.classList.add("is-success");
};

const setLoginMessage = (message, type = "") => {
  loginMessage.textContent = message;
  loginMessage.classList.remove("is-error");
  if (type === "error") loginMessage.classList.add("is-error");
};

const setLoading = (isLoading) => {
  loadingState.hidden = !isLoading;
};

const formatCpf = (value) => {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

const setField = (el, value) => {
  if (!el) return;
  const isTerm = el.id === "detailTerm";
  const textValue =
    value === null || value === undefined || value === "" ? (isTerm ? "" : "-") : String(value);

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    el.value = textValue;
  } else {
    el.textContent = textValue;
  }
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  setStatus("Configure SUPABASE_URL e SUPABASE_ANON_KEY no admin.html.", "error");
  loginForm.querySelector("button[type='submit']").disabled = true;
}

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const getSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
};

const getAccessToken = async () => {
  const session = await getSession();
  return session?.access_token || null;
};

const checkAdminRole = async (session) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data?.role) {
    return false;
  }
  return data.role === "admin";
};

const renderTable = (items, total) => {
  tableBody.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("tr");
    const guardian = item.guardian || {};
    const student = item.student || {};

    const columns = [
      formatDateTime(item.accepted_at),
      guardian.full_name || "-",
      formatCpf(guardian.cpf || ""),
      student.full_name || "-",
      student.class_room || "-",
      student.period || "-",
    ];

    columns.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${item.status}`;
    badge.textContent = item.status === "revoked" ? "revogado" : "ativo";
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    actionCell.className = "actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "action-btn";
    detailsBtn.dataset.action = "details";
    detailsBtn.dataset.id = item.id;
    detailsBtn.textContent = "Detalhes";
    actionCell.appendChild(detailsBtn);

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "action-btn";
    downloadBtn.dataset.action = "download";
    downloadBtn.dataset.id = item.id;
    downloadBtn.textContent = "Baixar PDF";
    actionCell.appendChild(downloadBtn);

    if (item.status === "active") {
      const revokeBtn = document.createElement("button");
      revokeBtn.type = "button";
      revokeBtn.className = "action-btn danger";
      revokeBtn.dataset.action = "revoke";
      revokeBtn.dataset.id = item.id;
      revokeBtn.textContent = "Revogar";
      actionCell.appendChild(revokeBtn);
    }

    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });

  emptyState.hidden = items.length !== 0;
  totalCount.textContent = (total ?? items.length).toString();
};

const openDetails = (item) => {
  setField(detailVersion, item.term_version);
  setField(detailHash, item.term_hash_sha256);
  setField(detailAcceptedAt, formatDateTime(item.accepted_at));
  setField(detailIp, item.accepted_ip);
  setField(detailAgent, item.accepted_user_agent);
  setField(detailTerm, item.term_text);
  detailsModal.hidden = false;
};

const closeDetails = () => {
  detailsModal.hidden = true;
};

const fetchList = async () => {
  const token = await getAccessToken();
  if (!token) {
    setStatus("Sessao expirada. Entre novamente.", "error");
    showView("login");
    return;
  }

  setLoading(true);
  emptyState.hidden = true;
  setStatus("", "");

  const query = searchInput.value.trim();
  const url = new URL("/api/admin-list", window.location.origin);
  if (query) url.searchParams.set("q", query);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      await supabase.auth.signOut();
      setStatus("Sessao expirada. Entre novamente.", "error");
      showView("login");
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Erro ao carregar lista.");
    }

    currentItems = data.items || [];
    renderTable(currentItems, data.total);
  } catch (error) {
    setStatus(error.message || "Erro ao carregar lista.", "error");
  } finally {
    setLoading(false);
  }
};

const downloadPdf = async (authorizationId) => {
  const token = await getAccessToken();
  if (!token) {
    setStatus("Sessao expirada. Entre novamente.", "error");
    showView("login");
    return;
  }

  const url = new URL("/api/admin-pdf-link", window.location.origin);
  url.searchParams.set("authorization_id", authorizationId);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      await supabase.auth.signOut();
      setStatus("Sessao expirada. Entre novamente.", "error");
      showView("login");
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Erro ao gerar link do PDF.");
    }

    if (data.signed_url) {
      window.open(data.signed_url, "_blank", "noopener");
    } else {
      throw new Error("Link do PDF indisponivel.");
    }
  } catch (error) {
    setStatus(error.message || "Erro ao gerar link do PDF.", "error");
  }
};

const revokeAuthorization = async (authorizationId) => {
  const confirmRevoke = window.confirm("Tem certeza que deseja revogar esta autorizacao?");
  if (!confirmRevoke) return;

  const { error } = await supabase
    .from("authorizations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", authorizationId);

  if (error) {
    setStatus("Nao foi possivel revogar a autorizacao.", "error");
    return;
  }

  setStatus("Autorizacao revogada.", "success");
  fetchList();
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginMessage("");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!supabase) return;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setLoginMessage("Nao foi possivel autenticar. Verifique email e senha.", "error");
    return;
  }

  currentSession = data.session;
  setLoginMessage("");
  setStatus("Autenticado com sucesso.", "success");
  const isAdmin = await checkAdminRole(currentSession);

  if (!isAdmin) {
    showView("denied");
    return;
  }

  showView("admin");
  fetchList();
});

logoutBtn.addEventListener("click", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  showView("login");
  setStatus("Sessao encerrada.");
});

deniedLogout.addEventListener("click", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  showView("login");
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  fetchList();
});

refreshBtn.addEventListener("click", () => {
  fetchList();
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const authorizationId = button.dataset.id;
  const item = currentItems.find((row) => row.id === authorizationId);

  if (action === "details" && item) {
    openDetails(item);
  }

  if (action === "download") {
    downloadPdf(authorizationId);
  }

  if (action === "revoke") {
    revokeAuthorization(authorizationId);
  }
});

closeModal.addEventListener("click", closeDetails);
detailsModal.addEventListener("click", (event) => {
  if (event.target === detailsModal) closeDetails();
});

const init = async () => {
  if (!supabase) {
    showView("login");
    return;
  }

  const session = await getSession();
  currentSession = session;

  if (!session) {
    showView("login");
    return;
  }

  const isAdmin = await checkAdminRole(session);
  if (!isAdmin) {
    showView("denied");
    return;
  }

  showView("admin");
  fetchList();
};

init();
