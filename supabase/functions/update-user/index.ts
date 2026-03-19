import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  user_id: string;
  email?: string;
  password?: string;
  nombre: string;
  apellido: string;
  role: "admin" | "registrador" | "tecnico" | "auditor";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify the requesting user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create client with user's token to verify they are admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the requesting user exists and get their ID
    const { data: { user: requestingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !requestingUser) {
      throw new Error("Usuario no autenticado");
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Solo los administradores pueden actualizar usuarios");
    }

    // Parse request body
    const { user_id, email, password, nombre, apellido, role }: UpdateUserRequest = await req.json();

    if (!user_id || !nombre || !apellido || !role) {
      throw new Error("user_id, nombre, apellido y role son requeridos");
    }

    // Update auth user if email or password provided
    const authUpdateData: { email?: string; password?: string } = {};
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;

    if (Object.keys(authUpdateData).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        authUpdateData
      );

      if (authUpdateError) {
        if (authUpdateError.message.includes("already been registered")) {
          throw new Error("Este correo ya está en uso por otro usuario");
        }
        throw new Error(`Error al actualizar credenciales: ${authUpdateError.message}`);
      }
    }

    // Update usuarios table
    const usuarioUpdateData: { nombre: string; apellido: string; email?: string } = {
      nombre,
      apellido,
    };
    if (email) usuarioUpdateData.email = email;

    const { error: profileError } = await supabaseAdmin
      .from("usuarios")
      .update(usuarioUpdateData)
      .eq("user_id", user_id);

    if (profileError) {
      throw new Error("Error al actualizar el perfil del usuario");
    }

    // Update user role
    const { error: roleUpdateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role })
      .eq("user_id", user_id);

    if (roleUpdateError) {
      throw new Error("Error al actualizar el rol del usuario");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuario actualizado correctamente",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
