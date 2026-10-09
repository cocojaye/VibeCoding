const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function createAdmin() {
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_USERNAME,
    ADMIN_PASSWORD
  } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error("Error: Missing required environment variables in .env file.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const { data, error } = await supabase
      .from("admins")
      .insert([
        {
          username: ADMIN_USERNAME,
          password_hash: hashedPassword
        }
      ])
      .select();

    if (error) {
      if (error.code === "23505") {
        console.log(`Admin user "${ADMIN_USERNAME}" already exists.`);
      } else {
        throw error;
      }
    } else {
      console.log(`Admin user "${ADMIN_USERNAME}" created successfully.`);
    }
  } catch (err) {
    console.error("An unexpected error occurred:", err.message);
    process.exit(1);
  }
}

createAdmin();
