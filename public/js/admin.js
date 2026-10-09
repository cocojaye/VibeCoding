document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  document.getElementById("admin-login-form").addEventListener("submit", handleLogin);
});

async function checkAuth() {
  try {
    const res = await fetch("/api/admin/check");
    const data = await res.json();

    if (res.ok && data.authenticated) {
      showDashboard(data.user.username);
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("login-section").classList.add("active");
  document.getElementById("dashboard-section").classList.remove("active");
}

function showDashboard(username) {
  document.getElementById("login-section").classList.remove("active");
  document.getElementById("dashboard-section").classList.add("active");
  document.getElementById("admin-welcome").textContent = `Logged in as: ${username}`;
  loadAdminBookings();
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("admin-username").value;
  const password = document.getElementById("admin-password").value;
  const errorDiv = document.getElementById("login-error");

  errorDiv.textContent = "";

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorDiv.textContent = data.error || "Login failed.";
      return;
    }

    showDashboard(data.username);
  } catch (err) {
    errorDiv.textContent = "An error occurred during login.";
  }
}

async function handleLogout() {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
    showLogin();
  } catch (err) {
    alert("Error logging out.");
  }
}

async function loadAdminBookings() {
  const tbody = document.getElementById("bookings-table-body");
  try {
    const res = await fetch("/api/admin/bookings");
    const bookings = await res.json();

    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7" style="color: #ef4444;">${escapeHtml(bookings.error)}</td></tr>`;
      return;
    }

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No bookings found.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    bookings.forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(b.reference)}</strong></td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.contact)}<br><small>${escapeHtml(b.email)}</small></td>
        <td>${escapeHtml(b.services ? b.services.name : "N/A")}</td>
        <td>${b.booking_date}<br><small>${b.booking_time}</small></td>
        <td><span class="status-badge status-${b.status}">${b.status}</span></td>
        <td>
          <div class="action-btns">
            ${b.status === "pending" ? `<button onclick="updateStatus('${b.id}', 'confirmed')" class="btn" style="background:#10b981;">Confirm</button>` : ""}
            ${b.status !== "cancelled" ? `<button onclick="updateStatus('${b.id}', 'cancelled')" class="btn" style="background:#f59e0b;">Cancel</button>` : ""}
            <button onclick="deleteBooking('${b.id}')" class="btn btn-danger">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7">Failed to load bookings.</td></tr>';
  }
}

async function updateStatus(id, newStatus) {
  if (!confirm(`Are you sure you want to mark this booking as ${newStatus}?`)) return;

  try {
    const res = await fetch(`/api/admin/bookings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      loadAdminBookings();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to update status.");
    }
  } catch (err) {
    alert("Error updating booking status.");
  }
}

async function deleteBooking(id) {
  if (!confirm("Are you sure you want to permanently delete this booking?")) return;

  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      loadAdminBookings();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete booking.");
    }
  } catch (err) {
    alert("Error deleting booking.");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}