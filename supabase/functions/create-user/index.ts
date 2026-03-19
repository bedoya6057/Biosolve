import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  role: "admin" | "registrador" | "tecnico";
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
      throw new Error("Solo los administradores pueden crear usuarios");
    }

    // Parse request body
    const { email, password, nombre, apellido, role }: CreateUserRequest = await req.json();

    if (!email || !password || !nombre || !apellido || !role) {
      throw new Error("Todos los campos son requeridos");
    }

    // Create the new user using admin API (doesn't sign them in)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        throw new Error("Este correo ya está registrado");
      }
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Error al crear el usuario");
    }

    // Create usuario profile
    const { error: profileError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        user_id: newUser.user.id,
        nombre,
        apellido,
        email,
      });

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Error al crear el perfil del usuario");
    }

    // Create user role
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role,
      });

    if (roleInsertError) {
      // Rollback: delete user and profile if role creation fails
      await supabaseAdmin.from("usuarios").delete().eq("user_id", newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Error al asignar el rol del usuario");
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          nombre,
          apellido,
          role,
        },
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
