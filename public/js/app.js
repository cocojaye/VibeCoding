document.addEventListener("DOMContentLoaded", () => {
  loadServices();
  
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("booking-date").setAttribute("min", today);

  document.getElementById("booking-form").addEventListener("submit", handleBookingSubmit);
  document.getElementById("lookup-form").addEventListener("submit", handleLookupSubmit);
});

function switchTab(tabId) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  
  const activeBtn = Array.from(document.querySelectorAll(".tab-btn")).find(btn => 
    btn.getAttribute("onclick").includes(tabId)
  );
  if (activeBtn) activeBtn.classList.add("active");
}

async function loadServices() {
  try {
    const res = await fetch("/api/services");
    const services = await res.json();

    const servicesList = document.getElementById("services-list");
    const serviceSelect = document.getElementById("service-select");

    servicesList.innerHTML = "";
    serviceSelect.innerHTML = '<option value="">-- Choose a Service --</option>';

    services.forEach(service => {
      const card = document.createElement("div");
      card.className = "service-card";
      card.innerHTML = `
        <div>
          <h3>${escapeHtml(service.name)}</h3>
          <p>${escapeHtml(service.description)}</p>
        </div>
        <div class="price">₱${parseFloat(service.price).toFixed(2)}</div>
      `;
      servicesList.appendChild(card);

      const option = document.createElement("option");
      option.value = service.id;
      option.textContent = `${service.name} (₱${parseFloat(service.price).toFixed(2)})`;
      serviceSelect.appendChild(option);
    });
  } catch (err) {
    document.getElementById("services-list").innerHTML = "<p>Failed to load services.</p>";
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();

  const payload = {
    service_id: document.getElementById("service-select").value,
    name: document.getElementById("client-name").value,
    contact: document.getElementById("client-contact").value,
    email: document.getElementById("client-email").value,
    booking_date: document.getElementById("booking-date").value,
    booking_time: document.getElementById("booking-time").value,
    guests: document.getElementById("booking-guests").value,
    notes: document.getElementById("booking-notes").value
  };

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to submit booking.");
      return;
    }

    document.getElementById("booking-form").style.display = "none";
    document.getElementById("booking-confirmation").style.display = "block";
    document.getElementById("conf-ref").textContent = data.reference;

    document.getElementById("conf-details").innerHTML = `
      <p><strong>Client Name:</strong> ${escapeHtml(data.name)}</p>
      <p><strong>Service:</strong> ${escapeHtml(data.services ? data.services.name : "")}</p>
      <p><strong>Price:</strong> ₱${parseFloat(data.services ? data.services.price : 0).toFixed(2)}</p>
      <p><strong>Schedule:</strong> ${data.booking_date} at ${data.booking_time}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${data.status}">${data.status}</span></p>
    `;
  } catch (err) {
    alert("An error occurred while placing the booking.");
  }
}

function resetBookingForm() {
  document.getElementById("booking-form").reset();
  document.getElementById("booking-form").style.display = "block";
  document.getElementById("booking-confirmation").style.display = "none";
}

async function handleLookupSubmit(e) {
  e.preventDefault();
  const ref = document.getElementById("lookup-ref").value;
  const resultDiv = document.getElementById("lookup-result");

  resultDiv.innerHTML = "<p>Searching...</p>";

  try {
    const res = await fetch(`/api/bookings/search?reference=${encodeURIComponent(ref)}`);
    const data = await res.json();

    if (!res.ok) {
      resultDiv.innerHTML = `<p style="color: #ef4444;">${escapeHtml(data.error)}</p>`;
      return;
    }

    resultDiv.innerHTML = `
      <div class="service-card" style="border-left-color: var(--primary-blue);">
        <h3>Reference: ${escapeHtml(data.reference)}</h3>
        <p><strong>Service:</strong> ${escapeHtml(data.services ? data.services.name : "N/A")}</p>
        <p><strong>Client Name:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(data.contact)} (${escapeHtml(data.email)})</p>
        <p><strong>Schedule:</strong> ${data.booking_date} at ${data.booking_time}</p>
        <p><strong>Devices:</strong> ${data.guests}</p>
        <p><strong>Notes:</strong> ${escapeHtml(data.notes || "None")}</p>
        <p style="margin-top: 10px;"><strong>Status:</strong> <span class="status-badge status-${data.status}">${data.status}</span></p>
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = "<p style='color: #ef4444;'>Failed to search booking.</p>";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}