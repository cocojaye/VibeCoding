require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

function authenticateAdmin(req, res, next) {
  const token = req.cookies.admin_token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized access. Authentication token missing." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.admin = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(401).json({ error: "Unauthorized access. Invalid or expired token." });
  }
}

function generateReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "BK";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isValidBookingTime(timeStr) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(timeStr)) return false;

  const [hours, minutes] = timeStr.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  const minMinutes = 7 * 60;
  const maxMinutes = 17 * 60;

  return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
}

// Public API Routes
app.get("/api/services", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching services:", err.message);
    res.status(500).json({ error: "Failed to retrieve services." });
  }
});

app.post("/api/bookings", async (req, res) => {
  const { service_id, name, contact, email, booking_date, booking_time, guests, notes } = req.body;

  if (!service_id || !name || !contact || !email || !booking_date || !booking_time) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(booking_date);
  if (isNaN(selectedDate.getTime()) || selectedDate < today) {
    return res.status(400).json({ error: "Booking date cannot be in the past." });
  }

  if (!isValidBookingTime(booking_time)) {
    return res.status(400).json({ error: "Booking time must be between 07:00 and 17:00." });
  }

  const parsedGuests = parseInt(guests, 10);
  if (isNaN(parsedGuests) || parsedGuests < 1) {
    return res.status(400).json({ error: "Guests count must be at least 1." });
  }

  try {
    const reference = generateReference();

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          reference: reference,
          service_id: service_id,
          name: name,
          contact: contact,
          email: email,
          booking_date: booking_date,
          booking_time: booking_time,
          guests: parsedGuests,
          notes: notes || "",
          status: "pending"
        }
      ])
      .select("reference")
      .single();

    if (error) throw error;

    res.status(201).json({ reference: data.reference });
  } catch (err) {
    console.error("Error creating booking:", err.message);
    res.status(500).json({ error: "Failed to process booking." });
  }
});

app.get("/api/bookings/:reference", async (req, res) => {
  const { reference } = req.params;

  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name, price)")
      .eq("reference", reference.trim().toUpperCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.json(data);
  } catch (err) {
    console.error("Error fetching booking by reference:", err.message);
    res.status(500).json({ error: "Failed to retrieve booking details." });
  }
});

// Admin Auth Routes
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const { data: admin, error } = await supabase
      .from("admins")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error || !admin) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      jwtSecret,
      { expiresIn: "1d" }
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: "Login successful.", username: admin.username });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.json({ message: "Logged out successfully." });
});

// Admin Protected Routes
app.get("/api/admin/bookings", authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name, price)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching admin bookings:", err.message);
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
});

app.patch("/api/admin/bookings/:id/confirm", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", id)
      .select("*, services(name)")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error confirming booking:", err.message);
    res.status(500).json({ error: "Failed to confirm booking." });
  }
});

app.patch("/api/admin/bookings/:id/cancel", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("*, services(name)")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error cancelling booking:", err.message);
    res.status(500).json({ error: "Failed to cancel booking." });
  }
});

app.delete("/api/admin/bookings/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ message: "Booking deleted successfully." });
  } catch (err) {
    console.error("Error deleting booking:", err.message);
    res.status(500).json({ error: "Failed to delete booking." });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}