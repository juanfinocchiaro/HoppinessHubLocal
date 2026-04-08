import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { branch_id } = await req.json();
    if (!branch_id) {
      return new Response(JSON.stringify({ error: "branch_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config, error: cfgError } = await supabase
      .from("mercadopago_config")
      .select("access_token")
      .eq("branch_id", branch_id)
      .single();

    if (cfgError || !config?.access_token) {
      return new Response(
        JSON.stringify({ error: "No access token configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Test the access token by fetching user info
    const mpRes = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${config.access_token}` },
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      await supabase
        .from("mercadopago_config")
        .update({
          connection_status: "error",
          last_test: new Date().toISOString(),
          last_test_ok: false,
        })
        .eq("branch_id", branch_id);

      return new Response(
        JSON.stringify({ error: "Invalid access token", detail: mpData }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await supabase
      .from("mercadopago_config")
      .update({
        connection_status: "conectado",
        collector_id: String(mpData.id),
        last_test: new Date().toISOString(),
        last_test_ok: true,
      })
      .eq("branch_id", branch_id);

    return new Response(
      JSON.stringify({
        ok: true,
        collector_id: mpData.id,
        nickname: mpData.nickname,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
