"use strict";

const STORAGE_KEY = "labopharma-v1";
const LOW_STOCK_LIMIT = 10;
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const currencyFormatter = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });
const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

const seedMaterials = [
  ["MP001", "Amoxicilline trihydrate", "Importée", 24],
  ["MP002", "Cellulose microcristalline", "Locale", 38],
  ["MP003", "Ibuprofène poudre", "Importée", 18],
  ["MP004", "Saccharose", "Locale", 52],
  ["MP005", "Paracétamol poudre", "Importée", 31],
  ["MP006", "Amidon de maïs", "Locale", 27],
  ["MP007", "Diclofénac sodique", "Importée", 16],
  ["MP008", "Chlorure de sodium", "Locale", 45],
  ["MP009", "Métronidazole poudre", "Importée", 21],
  ["MP010", "Stéarate de magnésium", "Locale", 12]
].map(([code, name, origin, stock]) => ({ id: code, code, name, origin, stock }));

const seedMedicines = [
  ["MED001", "Amoxicilline 500 mg", "Antibiotique à base d'amoxicilline.", "Comprimé", 45, [["MP001", .5, 3], ["MP002", .08, 2], ["MP010", .01, 2]]],
  ["MED002", "Sirop pédiatrique ibuprofène", "Suspension orale pédiatrique.", "Sirop", 38.5, [["MP003", .1, 5], ["MP004", 1.5, 3], ["MP008", .02, 2]]],
  ["MED003", "Paracétamol 1000 mg", "Comprimé antalgique et antipyrétique.", "Comprimé", 22, [["MP005", 1, 3], ["MP006", .12, 2], ["MP010", .015, 2]]],
  ["MED004", "Gel diclofénac 1 %", "Gel à usage cutané.", "Gel", 67, [["MP007", .1, 4], ["MP008", .04, 2]]],
  ["MED005", "Poudre de réhydratation orale", "Poudre à diluer pour solution orale.", "Poudre", 15, [["MP004", 2.7, 2], ["MP008", .35, 2]]],
  ["MED006", "Métronidazole 250 mg", "Comprimé à base de métronidazole.", "Comprimé", 30, [["MP009", .25, 3], ["MP002", .1, 2], ["MP010", .01, 2]]]
].map(([code, name, description, form, ppm, recipe]) => ({
  id: code,
  code,
  name,
  description,
  form,
  ppm,
  recipe: recipe.map(([materialId, dosage, lossRate]) => ({ materialId, dosage, lossRate }))
}));

function createInitialState() {
  return {
    medicines: seedMedicines,
    materials: seedMaterials,
    lots: [],
    movements: [],
    finishedStock: Object.fromEntries(seedMedicines.map((medicine) => [medicine.id, 0]))
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialState();
    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.medicines) || !Array.isArray(parsed.materials) ||
        !Array.isArray(parsed.lots) || !Array.isArray(parsed.movements) ||
        typeof parsed.finishedStock !== "object" || parsed.finishedStock === null) {
      throw new Error("Les données sauvegardées ne correspondent pas au format attendu.");
    }
    return parsed;
  } catch (error) {
    console.error("Impossible de lire les données LaboPharma :", error);
    showToast("Les données enregistrées sont illisibles. Exportez ou effacez le stockage local avant de continuer.", true);
    return createInitialState();
  }
}

let state = loadState();
let toastTimer;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Impossible d'enregistrer les données LaboPharma :", error);
    showToast("Enregistrement impossible dans ce navigateur. Vérifiez les paramètres de stockage.", true);
    return false;
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3500);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : dateFormatter.format(date);
}

function medicineById(id) {
  return state.medicines.find((medicine) => medicine.id === id);
}

function materialById(id) {
  return state.materials.find((material) => material.id === id);
}

function emptyRow(columns, message) {
  return `<tr><td class="empty-cell" colspan="${columns}">${escapeHtml(message)}</td></tr>`;
}

function renderDashboard() {
  document.getElementById("stat-medicaments").textContent = state.medicines.length;
  document.getElementById("stat-matieres").textContent = state.materials.length;
  document.getElementById("stat-lots").textContent = state.lots.length;
  document.getElementById("stat-unites").textContent = formatNumber(
    state.lots.reduce((sum, lot) => sum + Number(lot.quantity), 0)
  );
  document.getElementById("today-label").textContent = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(new Date());

  const recent = [...state.lots].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  document.getElementById("recent-lots").innerHTML = recent.length ? recent.map((lot) => {
    const medicine = medicineById(lot.medicationId);
    return `<tr><td class="table-code">${escapeHtml(lot.code)}</td><td>${escapeHtml(medicine ? medicine.name : lot.medicationId)}</td><td>${formatDate(lot.date)}</td><td>${formatNumber(lot.quantity)}</td><td><span class="status ${lot.status === "Terminé" ? "done" : ""}">${escapeHtml(lot.status)}</span></td></tr>`;
  }).join("") : emptyRow(5, "Aucun lot lancé pour le moment.");

  const low = state.materials.filter((material) => Number(material.stock) < LOW_STOCK_LIMIT);
  document.getElementById("low-stock-list").innerHTML = low.length
    ? low.map((material) => `<div class="stock-warning"><div><b>${escapeHtml(material.name)}</b><small>${escapeHtml(material.code)}</small></div><strong>${formatNumber(material.stock)} kg</strong></div>`).join("")
    : `<div class="stock-ok">✓ Tous les stocks sont au-dessus de 10 kg.</div>`;
}

function renderMedicineTable() {
  const search = document.getElementById("medicament-search").value.trim().toLocaleLowerCase("fr");
  const list = state.medicines.filter((medicine) =>
    `${medicine.code} ${medicine.name} ${medicine.form}`.toLocaleLowerCase("fr").includes(search)
  );
  document.getElementById("medicament-count").textContent = `${state.medicines.length} référence${state.medicines.length === 1 ? "" : "s"}`;
  document.getElementById("medicament-rows").innerHTML = list.length ? list.map((medicine) => {
    const composition = (medicine.recipe || []).map((item) => materialById(item.materialId)?.name || item.materialId).join(", ");
    return `<tr><td class="table-code">${escapeHtml(medicine.code)}</td><td><span class="table-primary">${escapeHtml(medicine.name)}</span></td><td>${escapeHtml(medicine.form)}</td><td>${currencyFormatter.format(Number(medicine.ppm))}</td><td>${escapeHtml(composition || "Non définie")}</td><td><div class="row-actions"><button class="row-action" type="button" data-edit-medicine="${escapeHtml(medicine.id)}">Modifier</button><button class="row-action danger" type="button" data-delete-medicine="${escapeHtml(medicine.id)}">Supprimer</button></div></td></tr>`;
  }).join("") : emptyRow(6, "Aucun médicament ne correspond à la recherche.");
}

function renderMaterialTable() {
  const search = document.getElementById("matiere-search").value.trim().toLocaleLowerCase("fr");
  const list = state.materials.filter((material) =>
    `${material.code} ${material.name} ${material.origin}`.toLocaleLowerCase("fr").includes(search)
  );
  document.getElementById("matiere-count").textContent = `${state.materials.length} référence${state.materials.length === 1 ? "" : "s"}`;
  document.getElementById("matiere-rows").innerHTML = list.length ? list.map((material) => {
    const low = Number(material.stock) < LOW_STOCK_LIMIT;
    return `<tr><td class="table-code">${escapeHtml(material.code)}</td><td><span class="table-primary">${escapeHtml(material.name)}</span></td><td>${escapeHtml(material.origin)}</td><td>${formatNumber(material.stock)} kg</td><td><div class="row-actions"><button class="row-action" type="button" data-edit-material="${escapeHtml(material.id)}">Modifier</button><button class="row-action danger" type="button" data-delete-material="${escapeHtml(material.id)}">Supprimer</button></div></td></tr>`;
  }).join("") : emptyRow(5, "Aucune matière première ne correspond à la recherche.");
}

function renderLotTable() {
  const search = document.getElementById("lot-search").value.trim().toLocaleLowerCase("fr");
  const sorted = [...state.lots].sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code));
  const list = sorted.filter((lot) => {
    const medicine = medicineById(lot.medicationId);
    return `${lot.code} ${medicine?.name || lot.medicationId} ${lot.date} ${lot.status}`.toLocaleLowerCase("fr").includes(search);
  });
  document.getElementById("lot-count").textContent = `${state.lots.length} lot${state.lots.length === 1 ? "" : "s"}`;
  document.getElementById("lot-rows").innerHTML = list.length ? list.map((lot) => {
    const medicine = medicineById(lot.medicationId);
    const action = lot.status === "En cours"
      ? `<button class="row-action" type="button" data-complete-lot="${escapeHtml(lot.id)}">Terminer</button>`
      : "—";
    return `<tr><td class="table-code">${escapeHtml(lot.code)}</td><td>${escapeHtml(medicine ? medicine.name : lot.medicationId)}</td><td>${formatDate(lot.date)}</td><td>${formatNumber(lot.quantity)} unités</td><td><span class="status ${lot.status === "Terminé" ? "done" : ""}">${escapeHtml(lot.status)}</span></td><td>${action}</td></tr>`;
  }).join("") : emptyRow(6, "Aucun lot ne correspond à la recherche.");
}

function renderStocks() {
  document.getElementById("stock-material-rows").innerHTML = state.materials.length
    ? [...state.materials].sort((a, b) => Number(a.stock) - Number(b.stock)).map((material) => {
      const low = Number(material.stock) < LOW_STOCK_LIMIT;
      return `<tr><td class="table-code">${escapeHtml(material.code)}</td><td>${escapeHtml(material.name)}</td><td>${formatNumber(material.stock)} kg</td><td><span class="level ${low ? "low" : ""}">${low ? "Stock bas" : "Disponible"}</span></td></tr>`;
    }).join("")
    : emptyRow(4, "Aucune matière première enregistrée.");

  document.getElementById("stock-medication-rows").innerHTML = state.medicines.length
    ? state.medicines.map((medicine) => `<tr><td class="table-code">${escapeHtml(medicine.code)}</td><td>${escapeHtml(medicine.name)}</td><td>${formatNumber(state.finishedStock[medicine.id] || 0)} unités</td><td>${escapeHtml(medicine.form)}</td></tr>`).join("")
    : emptyRow(4, "Aucun médicament enregistré.");

  const movements = [...state.movements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  document.getElementById("movement-count").textContent = `${movements.length} mouvement${movements.length === 1 ? "" : "s"}`;
  document.getElementById("movement-rows").innerHTML = movements.length ? movements.map((movement) => {
    const date = new Date(movement.createdAt);
    const dateText = Number.isNaN(date.getTime()) ? escapeHtml(movement.createdAt) : new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
    const isOut = movement.direction ? movement.direction === "out" : movement.kind === "Consommation";
    return `<tr><td>${dateText}</td><td>${escapeHtml(movement.kind)}</td><td class="table-code">${escapeHtml(movement.reference)}</td><td>${escapeHtml(movement.detail)}</td><td class="${isOut ? "movement-out" : "movement-in"}">${isOut ? "−" : "+"}${formatNumber(movement.quantity)} ${escapeHtml(movement.unit)}</td></tr>`;
  }).join("") : emptyRow(5, "Aucun mouvement de stock enregistré.");
}

function renderProductionSelect(selectedId = "") {
  const select = document.getElementById("production-medication");
  select.innerHTML = `<option value="">Choisir un médicament</option>` + state.medicines.map((medicine) =>
    `<option value="${escapeHtml(medicine.id)}" ${medicine.id === selectedId ? "selected" : ""}>${escapeHtml(medicine.code)} — ${escapeHtml(medicine.name)}</option>`
  ).join("");
  updateProductionPreview();
}

function renderAll() {
  renderDashboard();
  renderMedicineTable();
  renderMaterialTable();
  renderLotTable();
  renderStocks();
  renderProductionSelect(document.getElementById("production-medication").value);
}

function showView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    const active = view.id === `view-${viewName}`;
    view.classList.toggle("is-visible", active);
    view.hidden = !active;
  });
  document.querySelectorAll(".nav-link").forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (viewName === "production") renderProductionSelect(document.getElementById("production-medication").value);
}

function setFormVisible(formId, visible) {
  const panel = document.getElementById(`${formId}-panel`);
  const form = document.getElementById(formId);
  panel.hidden = !visible;
  if (!visible) {
    form.reset();
    form.elements.editingId.value = "";
    if (formId === "medicament-form") document.getElementById("recipe-rows").innerHTML = "";
  }
  if (visible) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeRecipeRow(item = {}) {
  const options = state.materials.map((material) =>
    `<option value="${escapeHtml(material.id)}" ${material.id === item.materialId ? "selected" : ""}>${escapeHtml(material.code)} — ${escapeHtml(material.name)}</option>`
  ).join("");
  const row = document.createElement("div");
  row.className = "recipe-row";
  row.innerHTML = `<label>Matière première<select name="recipeMaterial" required><option value="">Choisir une matière</option>${options}</select></label>
    <label>Dosage (g / unité)<input name="recipeDosage" type="number" min="0.001" step="0.001" required placeholder="0,500" value="${item.dosage ? escapeHtml(item.dosage) : ""}"></label>
    <label>Taux de perte (%)<input name="recipeLoss" type="number" min="0" max="100" step="0.1" required placeholder="3" value="${item.lossRate !== undefined ? escapeHtml(item.lossRate) : "0"}"></label>
    <button class="icon-button remove-recipe" type="button" aria-label="Supprimer cette matière">×</button>`;
  row.querySelector(".remove-recipe").addEventListener("click", () => row.remove());
  return row;
}

function getRecipeFromForm() {
  const rows = [...document.querySelectorAll("#recipe-rows .recipe-row")];
  const recipe = rows.map((row) => ({
    materialId: row.querySelector('[name="recipeMaterial"]').value,
    dosage: Number(row.querySelector('[name="recipeDosage"]').value),
    lossRate: Number(row.querySelector('[name="recipeLoss"]').value)
  }));
  if (!recipe.length) {
    throw new Error("Ajoutez au moins une matière première à la composition.");
  }
  if (recipe.some((item) => !item.materialId || !Number.isFinite(item.dosage) || item.dosage <= 0 || !Number.isFinite(item.lossRate) || item.lossRate < 0 || item.lossRate > 100)) {
    throw new Error("Vérifiez les matières, dosages et taux de perte de la composition.");
  }
  if (new Set(recipe.map((item) => item.materialId)).size !== recipe.length) {
    throw new Error("Une matière première ne peut apparaître qu'une fois dans la composition.");
  }
  return recipe;
}

function fillMedicineForm(medicine) {
  const form = document.getElementById("medicament-form");
  form.elements.editingId.value = medicine.id;
  form.elements.code.value = medicine.code;
  form.elements.name.value = medicine.name;
  form.elements.description.value = medicine.description || "";
  form.elements.form.value = medicine.form;
  form.elements.ppm.value = medicine.ppm;
  document.getElementById("recipe-rows").replaceChildren(...(medicine.recipe || []).map(makeRecipeRow));
  document.getElementById("medicament-form-title").textContent = "Modifier un médicament";
  setFormVisible("medicament-form", true);
}

function fillMaterialForm(material) {
  const form = document.getElementById("matiere-form");
  form.elements.editingId.value = material.id;
  form.elements.code.value = material.code;
  form.elements.name.value = material.name;
  form.elements.origin.value = material.origin;
  form.elements.stock.value = material.stock;
  document.getElementById("matiere-form-title").textContent = "Modifier une matière première";
  setFormVisible("matiere-form", true);
}

function isDuplicateCode(items, code, editingId) {
  return items.some((item) => item.code.toLocaleLowerCase("fr") === code.toLocaleLowerCase("fr") && item.id !== editingId);
}

function handleMedicineSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const id = String(data.get("editingId") || "");
  const code = String(data.get("code")).trim();
  if (isDuplicateCode(state.medicines, code, id)) {
    showToast("Ce code médicament est déjà utilisé.", true);
    return;
  }
  try {
    const recipe = getRecipeFromForm();
    const medicine = {
      id: id || code,
      code,
      name: String(data.get("name")).trim(),
      description: String(data.get("description")).trim(),
      form: String(data.get("form")),
      ppm: Number(data.get("ppm")),
      recipe
    };
    if (id) state.medicines = state.medicines.map((item) => item.id === id ? medicine : item);
    else {
      state.medicines.push(medicine);
      state.finishedStock[medicine.id] = 0;
    }
    if (!saveState()) return;
    setFormVisible("medicament-form", false);
    document.getElementById("medicament-form-title").textContent = "Ajouter un médicament";
    renderAll();
    showToast(id ? "Médicament modifié." : "Médicament ajouté.");
  } catch (error) {
    showToast(error.message, true);
  }
}

function handleMaterialSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const id = String(data.get("editingId") || "");
  const code = String(data.get("code")).trim();
  if (isDuplicateCode(state.materials, code, id)) {
    showToast("Ce code matière première est déjà utilisé.", true);
    return;
  }
  const material = {
    id: id || code,
    code,
    name: String(data.get("name")).trim(),
    origin: String(data.get("origin")),
    stock: Number(data.get("stock"))
  };
  if (id) {
    const previous = materialById(id);
    const difference = material.stock - Number(previous.stock);
    state.materials = state.materials.map((item) => item.id === id ? material : item);
    if (difference !== 0) state.movements.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      kind: difference > 0 ? "Approvisionnement" : "Ajustement",
      direction: difference > 0 ? "in" : "out",
      reference: material.code,
      detail: difference > 0 ? "Ajustement de stock" : "Ajustement manuel de stock",
      quantity: Math.abs(difference),
      unit: "kg"
    });
  } else {
    state.materials.push(material);
    state.movements.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      kind: "Approvisionnement",
      direction: "in",
      reference: material.code,
      detail: "Stock initial",
      quantity: material.stock,
      unit: "kg"
    });
  }
  if (!saveState()) return;
  setFormVisible("matiere-form", false);
  document.getElementById("matiere-form-title").textContent = "Ajouter une matière première";
  renderAll();
  showToast(id ? "Matière première modifiée." : "Matière première ajoutée.");
}

function requiredMaterials(medicine, quantity) {
  return (medicine.recipe || []).map((item) => {
    const material = materialById(item.materialId);
    const netKg = quantity * item.dosage / 1000;
    const totalKg = netKg * (1 + item.lossRate / 100);
    return { material, item, netKg, totalKg };
  });
}

function updateProductionPreview() {
  const medicationId = document.getElementById("production-medication").value;
  const quantity = Number(document.querySelector('#production-form [name="quantity"]').value);
  const preview = document.getElementById("production-preview");
  const medicine = medicineById(medicationId);
  if (!medicine || !Number.isFinite(quantity) || quantity < 1) {
    preview.innerHTML = "";
    return;
  }
  const requirements = requiredMaterials(medicine, quantity);
  if (!requirements.length) {
    preview.innerHTML = `<p class="preview-empty">Aucune composition n'est définie pour ce médicament. Ajoutez ses matières et dosages avant de lancer un lot.</p>`;
    return;
  }
  preview.innerHTML = `<div class="preview-card"><h3>Consommation estimée pour ${formatNumber(quantity)} unités</h3><div class="preview-list">${requirements.map(({ material, item, totalKg }) => {
    const available = material ? Number(material.stock) : 0;
    const enough = material && available >= totalKg;
    return `<span class="preview-item">${escapeHtml(material?.name || item.materialId)} : <b>${formatNumber(totalKg)} kg</b> (${formatNumber(item.dosage)} g/u + ${formatNumber(item.lossRate)} % perte) · ${enough ? `${formatNumber(available)} kg disponibles` : "stock insuffisant"}</span>`;
  }).join("")}</div></div>`;
}

function handleProductionSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const medicine = medicineById(String(data.get("medicationId")));
  const quantity = Number(data.get("quantity"));
  const date = String(data.get("date"));
  if (!medicine) {
    showToast("Sélectionnez un médicament valide.", true);
    return;
  }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    showToast("La quantité doit être un nombre entier supérieur à zéro.", true);
    return;
  }
  const requirements = requiredMaterials(medicine, quantity);
  if (!requirements.length || requirements.some(({ material }) => !material)) {
    showToast("Ce médicament ne possède pas de composition complète.", true);
    return;
  }
  const shortages = requirements.filter(({ material, totalKg }) => Number(material.stock) + Number.EPSILON < totalKg);
  if (shortages.length) {
    showToast(`Stock insuffisant : ${shortages.map(({ material }) => material.name).join(", ")}.`, true);
    return;
  }

  const lotId = crypto.randomUUID();
  const code = `LOT-${String(state.lots.length + 1).padStart(4, "0")}`;
  requirements.forEach(({ material, totalKg, item }) => {
    material.stock = Number((Number(material.stock) - totalKg).toFixed(6));
    state.movements.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      kind: "Consommation",
      direction: "out",
      reference: material.code,
      detail: `${code} — ${medicine.code} (${formatNumber(item.dosage)} g/u, perte ${formatNumber(item.lossRate)} %)`,
      quantity: totalKg,
      unit: "kg"
    });
  });
  state.lots.push({ id: lotId, code, medicationId: medicine.id, date, quantity, status: "En cours" });
  state.finishedStock[medicine.id] = Number(state.finishedStock[medicine.id] || 0) + quantity;
  if (!saveState()) return;
  form.reset();
  document.getElementById("production-preview").innerHTML = "";
  renderAll();
  showToast(`${code} lancé : ${formatNumber(quantity)} unités de ${medicine.name}.`);
}

function deleteMedicine(id) {
  const medicine = medicineById(id);
  if (!medicine) return;
  if (state.lots.some((lot) => lot.medicationId === id)) {
    showToast("Impossible de supprimer un médicament associé à un lot de production.", true);
    return;
  }
  if (!window.confirm(`Supprimer le médicament « ${medicine.name} » ?`)) return;
  state.medicines = state.medicines.filter((item) => item.id !== id);
  delete state.finishedStock[id];
  if (!saveState()) return;
  renderAll();
  showToast("Médicament supprimé.");
}

function deleteMaterial(id) {
  const material = materialById(id);
  if (!material) return;
  if (state.medicines.some((medicine) => (medicine.recipe || []).some((item) => item.materialId === id))) {
    showToast("Impossible de supprimer une matière utilisée dans une composition.", true);
    return;
  }
  if (!window.confirm(`Supprimer la matière première « ${material.name} » ?`)) return;
  state.materials = state.materials.filter((item) => item.id !== id);
  if (!saveState()) return;
  renderAll();
  showToast("Matière première supprimée.");
}

function completeLot(id) {
  const lot = state.lots.find((item) => item.id === id);
  if (!lot || lot.status !== "En cours") return;
  lot.status = "Terminé";
  if (!saveState()) return;
  renderAll();
  showToast(`${lot.code} marqué comme terminé.`);
}

function exportHistory() {
  const rows = [["Date", "Type", "Référence", "Détail", "Variation", "Unité"]];
  [...state.movements].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((movement) => {
    const direction = movement.direction ? movement.direction === "out" : movement.kind === "Consommation";
    rows.push([movement.createdAt, movement.kind, movement.reference, movement.detail, `${direction ? "-" : "+"}${movement.quantity}`, movement.unit]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  link.download = "historique-stocks-labopharma.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));
document.querySelectorAll("[data-form]").forEach((button) => button.addEventListener("click", () => {
  const formId = button.dataset.form;
  if (formId === "medicament-form") document.getElementById("medicament-form-title").textContent = "Ajouter un médicament";
  if (formId === "matiere-form") document.getElementById("matiere-form-title").textContent = "Ajouter une matière première";
  setFormVisible(formId, true);
}));
document.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", () => {
  const formId = button.dataset.cancel;
  setFormVisible(formId, false);
  if (formId === "medicament-form") document.getElementById("medicament-form-title").textContent = "Ajouter un médicament";
  if (formId === "matiere-form") document.getElementById("matiere-form-title").textContent = "Ajouter une matière première";
}));
document.getElementById("medicament-form").addEventListener("submit", handleMedicineSubmit);
document.getElementById("matiere-form").addEventListener("submit", handleMaterialSubmit);
document.getElementById("production-form").addEventListener("submit", handleProductionSubmit);
document.getElementById("add-ingredient").addEventListener("click", () => {
  if (!state.materials.length) {
    showToast("Ajoutez d'abord une matière première.", true);
    return;
  }
  document.getElementById("recipe-rows").append(makeRecipeRow());
});
document.getElementById("medicament-search").addEventListener("input", renderMedicineTable);
document.getElementById("matiere-search").addEventListener("input", renderMaterialTable);
document.getElementById("lot-search").addEventListener("input", renderLotTable);
document.getElementById("production-medication").addEventListener("change", updateProductionPreview);
document.querySelector('#production-form [name="quantity"]').addEventListener("input", updateProductionPreview);
document.getElementById("export-history").addEventListener("click", exportHistory);
document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const editMedicineButton = target.closest("[data-edit-medicine]");
  const deleteMedicineButton = target.closest("[data-delete-medicine]");
  const editMaterialButton = target.closest("[data-edit-material]");
  const deleteMaterialButton = target.closest("[data-delete-material]");
  const completeLotButton = target.closest("[data-complete-lot]");
  if (editMedicineButton) {
    const medicine = medicineById(editMedicineButton.dataset.editMedicine);
    if (medicine) fillMedicineForm(medicine);
  } else if (deleteMedicineButton) deleteMedicine(deleteMedicineButton.dataset.deleteMedicine);
  else if (editMaterialButton) {
    const material = materialById(editMaterialButton.dataset.editMaterial);
    if (material) fillMaterialForm(material);
  } else if (deleteMaterialButton) deleteMaterial(deleteMaterialButton.dataset.deleteMaterial);
  else if (completeLotButton) completeLot(completeLotButton.dataset.completeLot);
});

document.querySelector('#production-form [name="date"]').value = new Date().toISOString().slice(0, 10);
renderAll();
