import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTelegramWebAppData(initData: string, botToken: string): Promise<any> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const keys = Array.from(urlParams.keys()).sort();
  const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');
  
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const botTokenKey = await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(botToken));
  
  const finalKey = await crypto.subtle.importKey(
    "raw",
    botTokenKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", finalKey, new TextEncoder().encode(dataCheckString));
  
  const hashHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (hashHex === hash) {
    return JSON.parse(urlParams.get('user') || '{}');
  }
  return null;
}

async function verifyTelegramWidgetData(widgetData: any, botToken: string): Promise<any> {
  const { hash, ...data } = widgetData;
  const keys = Object.keys(data).sort();
  const dataCheckString = keys.map(k => `${k}=${data[k]}`).join('\n');
  
  const secretKeyHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(botToken));
  const secretKey = await crypto.subtle.importKey(
    "raw",
    secretKeyHash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(dataCheckString));
  const hashHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (hashHex === hash) {
    return data;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botToken = Deno.env.get('BOT_TOKEN');
    if (!botToken) throw new Error("BOT_TOKEN is not configured on the server");
    
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { initData, widgetData, action, otpCode, password } = body;

    // --- Action: send-delete-otp ---
    if (action === 'send-delete-otp') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error("Missing Authorization header");
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await adminSupabase.auth.getUser(token);
      if (userError || !user) throw new Error("Invalid JWT token: " + (userError?.message || "User not found"));

      // Query public user profile (resilient lookup)
      let { data: profile } = await adminSupabase.from('users')
        .select('user_id, telegram_id, settings')
        .or(`auth_id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      const telegramId = user.user_metadata?.telegram_id || profile?.telegram_id;
      if (!telegramId) throw new Error("Telegram account is not linked to this user");

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      const settings = profile?.settings || {};
      settings.delete_otp = { code, expires_at: expiresAt };

      if (profile) {
        const { error: updateErr } = await adminSupabase.from('users')
          .update({ settings })
          .eq('user_id', profile.user_id);
        if (updateErr) throw new Error("Failed to save verification code: " + updateErr.message);
      } else {
        // Auto-create user profile row if missing so we can store settings
        const { error: insertErr } = await adminSupabase.from('users').insert({
          user_id: user.id,
          auth_id: user.id,
          telegram_id: telegramId,
          role: 'user',
          settings: settings
        });
        if (insertErr) throw new Error("Failed to create user profile row: " + insertErr.message);
      }

      const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const text = `⚠️ Код для подтверждения удаления вашего аккаунта ICE LOGIX: ${code}\n\nЕсли вы не запрашивали этот код, просто проигнорируйте это сообщение. Код действителен в течение 5 минут.`;
      const tgRes = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: Number(telegramId),
          text: text
        })
      });
      const tgData = await tgRes.json();
      if (!tgData.ok) {
        throw new Error("Не удалось отправить сообщение в Telegram: " + (tgData.description || "ошибка бота"));
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Action: delete-account ---
    if (action === 'delete-account') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error("Missing Authorization header");
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await adminSupabase.auth.getUser(token);
      if (userError || !user) throw new Error("Invalid JWT token: " + (userError?.message || "User not found"));

      // Query public user profile
      const { data: profile } = await adminSupabase.from('users')
        .select('user_id, settings')
        .or(`auth_id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      const isTelegramUser = user.email?.startsWith('tg_') && user.email?.endsWith('@icelogix.by');
      if (isTelegramUser) {
        if (!otpCode) throw new Error("Требуется код подтверждения из Telegram");
        const deleteOtp = profile?.settings?.delete_otp;
        if (!deleteOtp || deleteOtp.code !== otpCode || Date.now() > deleteOtp.expires_at) {
          throw new Error("Неверный или истекший код подтверждения");
        }
      } else {
        if (!password) throw new Error("Требуется ввести пароль для подтверждения");
        const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey);
        const signInRes = await authClient.auth.signInWithPassword({ email: user.email!, password });
        if (signInRes.error) {
          throw new Error("Неверный пароль. Подтверждение отклонено.");
        }
      }

      // Proceed with cascading deletion if profile exists
      if (profile) {
        const publicUserId = profile.user_id;
        const tables = [
          'user_marketplace_whitelist',
          'wishlist',
          'cart',
          'user_views',
          'user_notifications',
          'recipients',
          'reviews',
          'orders'
        ];
        for (const table of tables) {
          try {
            await adminSupabase.from(table).delete().eq('user_id', publicUserId);
          } catch (e: any) {
            console.error(`Error deleting from table ${table}:`, e.message || e);
          }
        }
        // Delete user profile
        await adminSupabase.from('users').delete().eq('user_id', publicUserId);
      }

      // Delete auth user (always, even if public profile was missing)
      const { error: deleteErr } = await adminSupabase.auth.admin.deleteUser(user.id);
      if (deleteErr) throw deleteErr;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Default Action: Auth ---
    if (!initData && !widgetData) throw new Error("Missing auth payload");
    
    let user;
    if (initData) {
      user = await verifyTelegramWebAppData(initData, botToken);
    } else {
      user = await verifyTelegramWidgetData(widgetData, botToken);
    }
    
    if (!user || !user.id) throw new Error("Invalid Telegram signature");
    
    // Deterministic dummy credentials for Telegram Users
    const email = `tg_${user.id}@icelogix.by`;
    const passwordRaw = `tg_${user.id}_${botToken.substring(0, 15)}`;
    
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey);
    
    let sessionRes = await authClient.auth.signInWithPassword({ email, password: passwordRaw });
    
    if (sessionRes.error) {
      // User doesn't exist in Auth, create via Admin API
      const signUpRes = await adminSupabase.auth.admin.createUser({
        email,
        password: passwordRaw,
        email_confirm: true,
        user_metadata: { telegram_id: user.id, full_name: user.first_name }
      });
      if (signUpRes.error) throw signUpRes.error;
      
      // Retry sign in
      sessionRes = await authClient.auth.signInWithPassword({ email, password: passwordRaw });
      if (sessionRes.error) throw sessionRes.error;
      
      const newAuthId = sessionRes.data.user?.id;
      
      // ================== ACCOUNT MERGE LOGIC ==================
      // Check if the user already existed in `users` table via old `telegram_id` or `user_id`
      const { data: oldUser } = await adminSupabase.from('users')
        .select('*')
        .or(`user_id.eq.${user.id},telegram_id.eq.${user.id}`)
        .maybeSingle();
        
      if (oldUser) {
        // If old user exists, we attach the new auth_id to their existing profile
        await adminSupabase.from('users')
          .update({ auth_id: newAuthId, telegram_id: user.id })
          .eq('user_id', oldUser.user_id);
          
        // And delete the dummy profile that the `handle_new_user` trigger just created!
        await adminSupabase.from('users')
          .delete()
          .eq('auth_id', newAuthId)
          .neq('user_id', oldUser.user_id);
      } else {
        // Just update the newly created profile with telegram_id and explicit user_id
        await adminSupabase.from('users')
          .update({ telegram_id: user.id, user_id: user.id })
          .eq('auth_id', newAuthId);
      }
    } else {
      // They already existed in Auth. Just ensure their profile is up-to-date.
      const newAuthId = sessionRes.data.user?.id;
      // Also ensure we map them correctly in case of partial merge failure earlier
      const { data: oldUser } = await adminSupabase.from('users')
        .select('*')
        .or(`user_id.eq.${user.id},telegram_id.eq.${user.id}`)
        .maybeSingle();
        
      if (oldUser && (!oldUser.auth_id || oldUser.auth_id !== newAuthId)) {
        await adminSupabase.from('users')
          .update({ auth_id: newAuthId, telegram_id: user.id })
          .eq('user_id', oldUser.user_id);
          
        await adminSupabase.from('users')
          .delete()
          .eq('auth_id', newAuthId)
          .neq('user_id', oldUser.user_id);
      }
    }
    
    return new Response(JSON.stringify({ ok: true, session: sessionRes.data.session }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message || String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    });
  }
});
