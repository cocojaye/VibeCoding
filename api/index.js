const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Auth Middleware ---
const authenticateAdmin = (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Routes ---

// 1. Get Services
app.get("/api/services", async (req, res) => {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 2. Create Booking
app.post("/api/bookings", async (req, res) => {
  const { service_id, name, contact, email, booking_date, booking_time, guests, notes } = req.body;
  const reference = "REF-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const { data, error } = await supabase
    .from("bookings")
    .insert([
      { reference, service_id, name, contact, email, booking_date, booking_time, guests, notes }
    ])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Booking submitted", reference: reference });
});

// 3. Admin Login
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return res.status(401).json({ error: "Invalid credentials" });

  const validPassword = await bcrypt.compare(password, data.password_hash);
  if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: data.id, username: data.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.cookie("adminToken", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
  res.json({ message: "Login successful" });
});

// 4. Admin: View Bookings
app.get("/api/admin/bookings", authenticateAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(name)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 5. Admin: Update Booking Status (Confirm/Cancel)
app.patch("/api/admin/bookings/:id", authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `Booking status updated to ${status}` });
});

// 6. Admin: Delete Booking
app.delete("/api/admin/bookings/:id", authenticateAdmin, async (req, res) => {
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Booking deleted" });
});

// 7. Admin Logout
app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("adminToken");
  res.json({ message: "Logged out" });
});

// Handle SPA routing for admin (optional, but good for public/admin)
app.get("/admin*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
