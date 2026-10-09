require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!username) throw new Error("Missing required environment variable: ADMIN_USERNAME");
  if (!password) throw new Error("Missing required environment variable: ADMIN_PASSWORD");
  if (!supabaseUrl) throw new Error("Missing required environment variable: SUPABASE_URL");
  if (!supabaseKey) throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: existingAdmin, error: checkError } = await supabase
      .from("admins")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing admin:", checkError.message);
      process.exit(1);
    }

    if (existingAdmin) {
      console.log(`Admin user "${username}" already exists in the database.`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { error: insertError } = await supabase
      .from("admins")
      .insert([{ username: username, password_hash: passwordHash }]);

    if (insertError) {
      console.error("Failed to create admin:", insertError.message);
      process.exit(1);
    }

    console.log(`Successfully created admin user: ${username}`);
  } catch (err) {
    console.error("Unexpected error during admin creation:", err.message);
    process.exit(1);
  }
}

createAdmin();