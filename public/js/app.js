// Global Toast Handler
function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Helpers
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPeso(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}

function setFieldError(fieldId, errorMsg) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (errorEl) {
    if (errorMsg) {
      errorEl.textContent = errorMsg;
      errorEl.classList.add("visible");
    } else {
      errorEl.textContent = "";
      errorEl.classList.remove("visible");
    }
  }
}

function clearAllErrors(form) {
  const errors = form.querySelectorAll(".field-error");
  errors.forEach((el) => {
    el.textContent = "";
    el.classList.remove("visible");
  });
}

function setButtonLoading(btn, isLoading, originalText) {
  if (isLoading) {
    btn.disabled = true;
    btn.setAttribute("data-original-text", btn.textContent);
    btn.textContent = "Processing...";
  } else {
    btn.disabled = false;
    btn.textContent = btn.getAttribute("data-original-text") || originalText;
  }
}