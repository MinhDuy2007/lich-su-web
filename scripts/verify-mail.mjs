import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testEmail = process.env.MAIL_TEST_EMAIL;

  if (!url || !anonKey || !serviceKey) {
    console.error("THIEU_SUPABASE_ENV");
    return 1;
  }

  const admin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const usersResult = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1
  });
  if (usersResult.error) {
    console.error("SUPABASE_AUTH_MAIL_FAIL", usersResult.error.message);
    return 1;
  }

  if (!testEmail) {
    console.log("SUPABASE_AUTH_MAIL_OK");
    console.log("MAIL_TEST_EMAIL_KHONG_DAT, bo qua buoc gui email thu");
    return 0;
  }

  const anon = createClient(url, anonKey);
  const otpResult = await anon.auth.signInWithOtp({
    email: testEmail,
    options: {
      shouldCreateUser: false
    }
  });

  if (otpResult.error) {
    console.error("SUPABASE_AUTH_MAIL_FAIL", otpResult.error.message);
    return 1;
  }

  console.log("SUPABASE_AUTH_MAIL_OK");
  console.log(`TEST_EMAIL=${testEmail}`);
  console.log("OTP_DA_DUOC_GOI_GUI_TU_SUPABASE_AUTH");
  return 0;
}

const code = await main();
if (code !== 0) {
  process.exitCode = code;
}
