const fileInput = document.getElementById("fileInput");
const clearButton = document.getElementById("clearButton");
const printButton = document.getElementById("printButton");
const cardLibrary = document.getElementById("cardLibrary");
const emptyState = document.getElementById("emptyState");
const printArea = document.getElementById("printArea");
const summaryText = document.getElementById("summaryText");
const statusLine = document.getElementById("statusLine");
const cardTemplate = document.getElementById("cardTemplate");
const sheetTemplate = document.getElementById("sheetTemplate");
const slotTemplate = document.getElementById("slotTemplate");
const cardSizeText = document.getElementById("cardSizeText");
const sheetText = document.getElementById("sheetText");
const editSizeButton = document.getElementById("editSizeButton");
const sizeEditor = document.getElementById("sizeEditor");
const cardWidthInput = document.getElementById("cardWidthInput");
const cardHeightInput = document.getElementById("cardHeightInput");
const resetSizeButton = document.getElementById("resetSizeButton");
const doneSizeButton = document.getElementById("doneSizeButton");
const editSheetButton = document.getElementById("editSheetButton");
const sheetEditor = document.getElementById("sheetEditor");
const sheetSizeSelect = document.getElementById("sheetSizeSelect");
const sheetOrientationSelect = document.getElementById("sheetOrientationSelect");
const doneSheetButton = document.getElementById("doneSheetButton");
const printPageStyle = document.createElement("style");

printPageStyle.id = "printPageStyle";
document.head.append(printPageStyle);

const cards = [];
const defaultCardSize = { width: 62, height: 87 };
const cardSize = { ...defaultCardSize };
const pageSizes = {
  a4: { name: "A4", cssName: "A4", width: 210, height: 297 },
  letter: { name: "US Letter", cssName: "letter", width: 215.9, height: 279.4 },
  legal: { name: "US Legal", cssName: "legal", width: 215.9, height: 355.6 },
  a5: { name: "A5", cssName: "A5", width: 148, height: 210 },
  a3: { name: "A3", cssName: "A3", width: 297, height: 420 }
};
let pageSize = pageSizes.a4;
let sheetOrientation = "portrait";
const pageMargin = 6;
let sheetLayout = calculateSheetLayout();

applyCardSize();

fileInput.addEventListener("change", () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = "";
});

clearButton.addEventListener("click", () => {
  for (const card of cards) {
    URL.revokeObjectURL(card.url);
  }

  cards.length = 0;
  render();
  setStatus("Cleared the card list.");
});

printButton.addEventListener("click", () => {
  if (cards.length === 0) {
    setStatus("Add at least one PNG or JPG before printing.");
    return;
  }

  applyPrintPageSize();
  window.print();
});

editSizeButton.addEventListener("click", () => {
  const isOpening = sizeEditor.hidden;
  sizeEditor.hidden = !isOpening;
  editSizeButton.setAttribute("aria-expanded", isOpening.toString());
  editSizeButton.textContent = isOpening ? "Hide" : "Edit";

  if (isOpening) {
    cardWidthInput.focus();
  }
});

cardWidthInput.addEventListener("input", () => updateCardSizeFromInputs(false));
cardHeightInput.addEventListener("input", () => updateCardSizeFromInputs(false));
cardWidthInput.addEventListener("change", () => updateCardSizeFromInputs(true));
cardHeightInput.addEventListener("change", () => updateCardSizeFromInputs(true));

resetSizeButton.addEventListener("click", () => {
  cardWidthInput.value = defaultCardSize.width.toString();
  cardHeightInput.value = defaultCardSize.height.toString();
  updateCardSizeFromInputs(true);
  setStatus("Reset card size to 62 mm x 87 mm.");
});

doneSizeButton.addEventListener("click", () => {
  sizeEditor.hidden = true;
  editSizeButton.setAttribute("aria-expanded", "false");
  editSizeButton.textContent = "Edit";
});

editSheetButton.addEventListener("click", () => {
  const isOpening = sheetEditor.hidden;
  sheetEditor.hidden = !isOpening;
  editSheetButton.setAttribute("aria-expanded", isOpening.toString());
  editSheetButton.textContent = isOpening ? "Hide" : "Edit";

  if (isOpening) {
    sheetSizeSelect.focus();
  }
});

sheetSizeSelect.addEventListener("change", () => {
  pageSize = pageSizes[sheetSizeSelect.value] ?? pageSizes.a4;
  applySheetSettings();
  setStatus(`Sheet set to ${pageSize.name}. The print dialog will be asked to use this page size.`);
});

sheetOrientationSelect.addEventListener("change", () => {
  sheetOrientation = sheetOrientationSelect.value === "landscape" ? "landscape" : "portrait";
  applySheetSettings();
  setStatus(`Sheet orientation set to ${sheetOrientation}.`);
});

doneSheetButton.addEventListener("click", () => {
  sheetEditor.hidden = true;
  editSheetButton.setAttribute("aria-expanded", "false");
  editSheetButton.textContent = "Edit";
});

function addFiles(files) {
  const images = files.filter(isSupportedImage);

  for (const file of images) {
    cards.push({
      id: crypto.randomUUID(),
      name: file.name,
      quantity: 1,
      url: URL.createObjectURL(file)
    });
  }

  render();

  if (images.length === 0 && files.length > 0) {
    setStatus("Only PNG and JPG files are supported.");
    return;
  }

  if (images.length > 0) {
    setStatus(`Added ${images.length} image ${images.length === 1 ? "file" : "files"}.`);
  }
}

function isSupportedImage(file) {
  const name = file.name.toLowerCase();
  return file.type === "image/png"
    || file.type === "image/jpeg"
    || name.endsWith(".png")
    || name.endsWith(".jpg")
    || name.endsWith(".jpeg");
}

function render() {
  renderLibrary();
  renderSheets();
  updateSummary();
}

function renderLibrary() {
  cardLibrary.replaceChildren();
  emptyState.hidden = cards.length > 0;

  for (const card of cards) {
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    const preview = node.querySelector("img");
    const name = node.querySelector("strong");
    const input = node.querySelector("input");
    const minus = node.querySelector(".qty-minus");
    const plus = node.querySelector(".qty-plus");
    const remove = node.querySelector(".remove-action");

    preview.src = card.url;
    preview.alt = card.name;
    name.textContent = card.name;
    input.value = card.quantity.toString();

    minus.addEventListener("click", () => setQuantity(card.id, card.quantity - 1));
    plus.addEventListener("click", () => setQuantity(card.id, card.quantity + 1));
    input.addEventListener("input", () => updateQuantityPreview(card.id, Number.parseInt(input.value, 10)));
    input.addEventListener("blur", () => {
      setQuantity(card.id, Number.parseInt(input.value, 10));
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
    remove.addEventListener("click", () => removeCard(card.id));

    cardLibrary.append(node);
  }
}

function renderSheets() {
  printArea.replaceChildren();

  const expandedCards = cards.flatMap((card) => Array.from({ length: card.quantity }, () => card));

  for (let index = 0; index < expandedCards.length; index += sheetLayout.cardsPerPage) {
    const sheet = sheetTemplate.content.firstElementChild.cloneNode(true);
    const grid = sheet.querySelector(".sheet-grid");
    const pageCards = expandedCards.slice(index, index + sheetLayout.cardsPerPage);

    for (const card of pageCards) {
      const slot = slotTemplate.content.firstElementChild.cloneNode(true);
      const image = slot.querySelector("img");
      image.src = card.url;
      image.alt = card.name;
      grid.append(slot);
    }

    printArea.append(sheet);
  }
}

function updateSummary() {
  const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
  const totalPages = Math.ceil(totalCards / sheetLayout.cardsPerPage);

  summaryText.textContent = `${totalCards} ${totalCards === 1 ? "card" : "cards"}, ${totalPages} ${totalPages === 1 ? "page" : "pages"}`;
  clearButton.disabled = cards.length === 0;
  printButton.disabled = totalCards === 0;
}

function updateCardSizeFromInputs(commitValue) {
  const effectivePageSize = getEffectivePageSize();
  const width = parseDimension(cardWidthInput.value, 10, effectivePageSize.width - pageMargin * 2);
  const height = parseDimension(cardHeightInput.value, 10, effectivePageSize.height - pageMargin * 2);

  if (width !== null) {
    cardSize.width = width;
  }

  if (height !== null) {
    cardSize.height = height;
  }

  if (commitValue) {
    cardSize.width = clampDimension(cardWidthInput.value, 10, effectivePageSize.width - pageMargin * 2, cardSize.width);
    cardSize.height = clampDimension(cardHeightInput.value, 10, effectivePageSize.height - pageMargin * 2, cardSize.height);
    cardWidthInput.value = formatDimension(cardSize.width);
    cardHeightInput.value = formatDimension(cardSize.height);
  }

  applyCardSize();
  renderSheets();
  updateSummary();
  setStatus(`Card size set to ${formatDimension(cardSize.width)} mm x ${formatDimension(cardSize.height)} mm.`);
}

function applySheetSettings() {
  const effectivePageSize = getEffectivePageSize();
  cardSize.width = Math.min(cardSize.width, effectivePageSize.width - pageMargin * 2);
  cardSize.height = Math.min(cardSize.height, effectivePageSize.height - pageMargin * 2);
  cardWidthInput.value = formatDimension(cardSize.width);
  cardHeightInput.value = formatDimension(cardSize.height);
  applyCardSize();
  renderSheets();
  updateSummary();
}

function applyCardSize() {
  const rootStyle = document.documentElement.style;
  const effectivePageSize = getEffectivePageSize();
  sheetLayout = calculateSheetLayout();
  const maxCardWidth = effectivePageSize.width - pageMargin * 2;
  const maxCardHeight = effectivePageSize.height - pageMargin * 2;

  rootStyle.setProperty("--card-width", `${formatDimension(cardSize.width)}mm`);
  rootStyle.setProperty("--card-height", `${formatDimension(cardSize.height)}mm`);
  rootStyle.setProperty("--page-width", `${formatDimension(effectivePageSize.width)}mm`);
  rootStyle.setProperty("--page-height", `${formatDimension(effectivePageSize.height)}mm`);
  rootStyle.setProperty("--page-width-mm", formatDimension(effectivePageSize.width));
  rootStyle.setProperty("--page-height-mm", formatDimension(effectivePageSize.height));
  rootStyle.setProperty("--page-preview-width", "100%");
  rootStyle.setProperty("--cards-per-row", sheetLayout.columns.toString());
  rootStyle.setProperty("--cards-per-column", sheetLayout.rows.toString());
  rootStyle.setProperty("--preview-grid-width", `${(sheetLayout.gridWidth / effectivePageSize.width) * 100}%`);
  rootStyle.setProperty("--preview-grid-ratio", `${sheetLayout.gridWidth} / ${sheetLayout.gridHeight}`);
  applyPrintPageSize();

  cardSizeText.textContent = `${formatDimension(cardSize.width)} mm x ${formatDimension(cardSize.height)} mm`;
  sheetText.textContent = `${pageSize.name} ${sheetOrientation}, ${sheetLayout.cardsPerPage} ${sheetLayout.cardsPerPage === 1 ? "card" : "cards"} per page`;
  cardWidthInput.max = formatDimension(maxCardWidth);
  cardHeightInput.max = formatDimension(maxCardHeight);
}

function applyPrintPageSize() {
  printPageStyle.textContent = `@page { size: ${pageSize.cssName} ${sheetOrientation}; margin: 0; }`;
}

function calculateSheetLayout() {
  const effectivePageSize = getEffectivePageSize();
  const printableWidth = effectivePageSize.width - pageMargin * 2;
  const printableHeight = effectivePageSize.height - pageMargin * 2;
  const columns = Math.max(1, Math.floor(printableWidth / cardSize.width));
  const rows = Math.max(1, Math.floor(printableHeight / cardSize.height));

  return {
    columns,
    rows,
    cardsPerPage: columns * rows,
    gridWidth: columns * cardSize.width,
    gridHeight: rows * cardSize.height
  };
}

function getEffectivePageSize() {
  if (sheetOrientation === "landscape") {
    return {
      width: pageSize.height,
      height: pageSize.width
    };
  }

  return pageSize;
}

function clampDimension(value, min, max, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed * 10) / 10));
}

function parseDimension(value, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(max, Math.max(min, parsed));
}

function formatDimension(value) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function setQuantity(id, value) {
  const card = cards.find((item) => item.id === id);
  if (!card) {
    return;
  }

  if (!Number.isFinite(value)) {
    value = 1;
  }

  card.quantity = Math.max(1, Math.min(999, value));
  render();
}

function updateQuantityPreview(id, value) {
  const card = cards.find((item) => item.id === id);
  if (!card) {
    return;
  }

  if (!Number.isFinite(value)) {
    return;
  }

  card.quantity = Math.max(1, Math.min(999, value));
  renderSheets();
  updateSummary();
}

function removeCard(id) {
  const index = cards.findIndex((item) => item.id === id);
  if (index === -1) {
    return;
  }

  const [card] = cards.splice(index, 1);
  URL.revokeObjectURL(card.url);
  render();
  setStatus(`Removed ${card.name}.`);
}

function setStatus(message) {
  statusLine.textContent = message;
}
