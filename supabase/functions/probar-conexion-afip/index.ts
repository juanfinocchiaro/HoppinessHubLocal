import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateWSAA, getLastVoucher } from "../_shared/wsaa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { branch_id } = await req.json();
    if (!branch_id) {
      return new Response(JSON.stringify({ error: "branch_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Leer config
    const { data: config, error: configError } = await supabase
      .from("afip_config")
      .select("*")
      .eq("branch_id", branch_id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "No hay configuración ARCA para esta sucursal ´${branch_id}´ ´${configError}´" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!config.certificado_crt || !config.private_key_enc || !config.point_of_sale) {
      await supabase
        .from("afip_config")
        .update({
          connection_status: "sin_configurar",
          last_error: "Falta certificado o punto de venta",
          last_verification: new Date().toISOString(),
        })
        .eq("branch_id", branch_id);

      return new Response(
        JSON.stringify({
          success: false,
          estado: "sin_configurar",
          mensaje: "Configuración incompleta. Cargá el certificado y la clave privada.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const esProduccion = !!config.is_production;

    if (!esProduccion) {
      // Simulación en homologación: siempre "conectado"
      await supabase
        .from("afip_config")
        .update({
          connection_status: "conectado",
          certificate_status: "conectado",
          last_error: null,
          last_verification: new Date().toISOString(),
        })
        .eq("branch_id", branch_id);

      return new Response(
        JSON.stringify({
          success: true,
          estado: "conectado",
          modo: "homologacion",
          mensaje: "Conexión simulada OK (modo homologación). Cuando cambies a producción, se verificará contra ARCA.",
          ultimos_numeros: {
            factura_a: config.last_invoice_number_a || 0,
            factura_b: config.last_invoice_number_b || 0,
            factura_c: config.last_invoice_number_c || 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === MODO PRODUCCIÓN: Conexión real con ARCA ===
    console.log("Probando conexión ARCA en modo PRODUCCIÓN...");

    // Decodificar clave privada (almacenada en base64)
    let clavePrivada: string;
    try {
      clavePrivada = atob(config.private_key_enc);
    } catch {
      clavePrivada = config.private_key_enc;
    }

    try {
      // 1. Autenticar contra WSAA
      console.log("Autenticando contra WSAA...");
      const credentials = await authenticateWSAA(config.certificado_crt, clavePrivada, "wsfe", esProduccion);
      console.log("WSAA autenticación exitosa");

      // 2. Consultar últimos comprobantes autorizados
      console.log("Consultando últimos comprobantes...");
      const [lastA, lastB, lastC] = await Promise.all([
        getLastVoucher(credentials, config.cuit, config.punto_venta, 1, esProduccion), // Factura A
        getLastVoucher(credentials, config.cuit, config.punto_venta, 6, esProduccion), // Factura B
        getLastVoucher(credentials, config.cuit, config.punto_venta, 11, esProduccion), // Factura C
      ]);

      console.log(`Últimos comprobantes: A=${lastA}, B=${lastB}, C=${lastC}`);

      // 3. Actualizar config con datos reales
      await supabase
        .from("afip_config")
        .update({
          connection_status: "conectado",
          certificate_status: "conectado",
          last_error: null,
          last_verification: new Date().toISOString(),
          last_invoice_number_a: lastA,
          last_invoice_number_b: lastB,
          last_invoice_number_c: lastC,
        })
        .eq("branch_id", branch_id);

      return new Response(
        JSON.stringify({
          success: true,
          estado: "conectado",
          modo: "produccion",
          mensaje: `Conexión con ARCA verificada exitosamente. Punto de venta ${config.punto_venta} operativo.`,
          ultimos_numeros: {
            factura_a: lastA,
            factura_b: lastB,
            factura_c: lastC,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (arcaError) {
      const errorMsg = arcaError instanceof Error ? arcaError.message : String(arcaError);
      console.error("Error de conexión ARCA:", errorMsg);

      await supabase
        .from("afip_config")
        .update({
          connection_status: "error",
          last_error: errorMsg.substring(0, 500),
          last_verification: new Date().toISOString(),
        })
        .eq("branch_id", branch_id);

      // Loguear error
      await supabase.from("afip_errores_log").insert({
        branch_id,
        error_type: "conexion_produccion",
        message: errorMsg.substring(0, 500),
      });

      return new Response(
        JSON.stringify({
          success: false,
          estado: "error",
          mensaje: `Error al conectar con ARCA: ${errorMsg}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    console.error("Error interno:", err);
    return new Response(JSON.stringify({ error: "Error interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
