async function fetchServices() {
    const res = await fetch("/api/services");
    const services = await res.json();
    const list = document.getElementById("services-list");
    list.innerHTML = "";

    services.forEach(s => {
        const div = document.createElement("div");
        div.className = "service-card";
        div.innerHTML = `
            <h3>${s.name}</h3>
            <p>${s.description}</p>
            <p class="price">₱${parseFloat(s.price).toLocaleString()}</p>
            <button class="btn btn-primary" onclick="selectService(${s.id}, '${s.name}')">Book Now</button>
        `;
        list.appendChild(div);
    });
}

function selectService(id, name) {
    document.getElementById("services-view").style.display = "none";
    document.getElementById("booking-view").style.display = "block";
    document.getElementById("selected-service-title").innerText = `Book ${name}`;
    document.getElementById("service-id").value = id;
}

function showServices() {
    document.getElementById("booking-view").style.display = "none";
    document.getElementById("confirmation-view").style.display = "none";
    document.getElementById("services-view").style.display = "block";
    fetchServices();
}

document.getElementById("booking-form").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        service_id: document.getElementById("service-id").value,
        name: document.getElementById("name").value,
        contact: document.getElementById("contact").value,
        email: document.getElementById("email").value,
        booking_date: document.getElementById("date").value,
        booking_time: document.getElementById("time").value,
        notes: document.getElementById("notes").value
    };

    const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (result.reference) {
        document.getElementById("booking-view").style.display = "none";
        document.getElementById("confirmation-view").style.display = "block";
        document.getElementById("ref-number").innerText = result.reference;
    } else {
        alert("Error: " + result.error);
    }
};

fetchServices();
