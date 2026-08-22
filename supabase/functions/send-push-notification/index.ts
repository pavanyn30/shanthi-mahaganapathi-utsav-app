import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, message, url, icon, created_by } = await req.json();

    if (!title || typeof title !== "string" || !message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Title and message are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ONESIGNAL_APP_ID =
      Deno.env.get("ONESIGNAL_APP_ID") || "def559e2-60c1-4fc0-ba35-9402e4c1b63c";
    const ONESIGNAL_REST_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") || "";

    const cleanTitle = title.trim().slice(0, 200);
    const cleanMessage = message.trim().slice(0, 1000);
    const targetUrl = typeof url === "string" && url.trim() ? url.trim() : "https://shanthimahaganapathi-2026.web.app";
    const targetIcon = typeof icon === "string" && icon.trim() ? icon.trim() : "https://shanthimahaganapathi-2026.web.app/favicon.png";

    // OneSignal REST API Payload
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      isAndroid: true,
      isIos: true,
      isAnyWeb: true,
      headings: { en: cleanTitle },
      contents: { en: cleanMessage },
      web_url: targetUrl,
      data: {
        target_route: "/notifications",
        launch_url: "/notifications",
      },
      chrome_web_icon: targetIcon,
      chrome_web_image: targetIcon,
      small_icon: "ic_stat_onesignal_default",
      large_icon: targetIcon,
      android_accent_color: "FF6B00",
      priority: 10,
    };

    const osAuthHeader = ONESIGNAL_REST_KEY.startsWith("os_v2_")
      ? `Key ${ONESIGNAL_REST_KEY}`
      : `Basic ${ONESIGNAL_REST_KEY}`;

    let osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: osAuthHeader,
      },
      body: JSON.stringify(payload),
    });

    let osData = await osResponse.json();

    if (!osResponse.ok && (osData?.errors?.[0]?.includes("Invalid") || osData?.errors?.[0]?.includes("auth"))) {
      osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      osData = await osResponse.json();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://btuvycmteycrvflaxhgc.supabase.co";
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const recipientsCount = osData?.recipients || 0;

    const { data: dbData, error: dbError } = await supabase
      .from("notifications")
      .insert({
        title: cleanTitle,
        message: cleanMessage,
        url: targetUrl,
        icon: targetIcon,
        sent_count: recipientsCount,
        created_by: created_by || null,
      })
      .select("*")
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification: dbData,
        onesignal_id: osData?.id,
        recipients: recipientsCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
