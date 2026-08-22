import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery, FestivalSettings } from "@/lib/festival";
import { compressAndConvertToWebP, CompressedImageResult } from "@/lib/image-optimizer";
import { uploadMediaToStorageCDN } from "@/lib/utils/fast-media-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  ExternalLink,
  Shield,
  Smartphone,
  Info,
} from "lucide-react";
import splashImgDefault from "@/assets/pavonix-splash.png";

export function SplashScreenAdminTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading: isSettingsLoading } = useQuery(settingsQuery);

  const [enabled, setEnabled] = useState<boolean>(true);
  const [splashUrl, setSplashUrl] = useState<string>("");
  const [redirectUrl, setRedirectUrl] = useState<string>("https://pyn-technologies.web.app/");
  const [duration, setDuration] = useState<number>(3000);

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<CompressedImageResult | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [testPreviewOpen, setTestPreviewOpen] = useState<boolean>(false);

  // Sync component state when settings load
  useEffect(() => {
    if (settings) {
      if (settings.splash_screen_enabled !== undefined) {
        setEnabled(settings.splash_screen_enabled);
      }
      if (settings.splash_screen_url !== undefined && settings.splash_screen_url !== null) {
        setSplashUrl(settings.splash_screen_url);
      }
      if (settings.splash_screen_redirect_url) {
        setRedirectUrl(settings.splash_screen_redirect_url);
      }
      if (settings.splash_screen_duration) {
        setDuration(settings.splash_screen_duration);
      }
    }
  }, [settings]);

  // Handle device file upload with WebP compression & CDN upload
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, etc.)");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      // 1. Convert & Compress to WebP
      const optResult = await compressAndConvertToWebP(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.88,
        format: "webp",
      });

      // 2. Upload WebP binary directly to Supabase Storage CDN
      const storageRes = await uploadMediaToStorageCDN(
        optResult.file,
        `splash_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`
      );

      const finalUrl = storageRes.success && storageRes.url ? storageRes.url : optResult.dataUrl;

      setSplashUrl(finalUrl);
      setUploadResult(optResult);

      const savings = Math.round(
        ((optResult.originalSize - optResult.compressedSize) / optResult.originalSize) * 100
      );
      toast.success(
        `Splash screen image uploaded! ${savings > 0 ? `Optimized by ${savings}%` : ""}`
      );
    } catch (err: any) {
      console.error("Upload splash screen error:", err);
      toast.error("Failed to upload image from device. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const deleteOldSplashFromStorage = async (oldUrl: string | null | undefined) => {
    if (!oldUrl || !oldUrl.includes("supabase.co/storage")) return;
    try {
      const match = oldUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match && match[1] && match[2]) {
        const bucketName = match[1];
        const filePath = decodeURIComponent(match[2]);
        console.log(`Cleaning up old splash screen file [${bucketName}]: ${filePath}`);
        await supabase.storage.from(bucketName).remove([filePath]);
      }
    } catch (err) {
      console.warn("Failed to delete old splash screen file from storage:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetId = settings?.id ?? 1;
      const oldSplashUrl = settings?.splash_screen_url;
      const newSplashUrl = splashUrl.trim() || null;

      // If user provided a NEW splash image different from the old one, clean up the old file
      if (oldSplashUrl && oldSplashUrl !== newSplashUrl) {
        await deleteOldSplashFromStorage(oldSplashUrl);
      }

      const { error } = await supabase.from("festival_settings").upsert({
        id: targetId,
        splash_screen_enabled: enabled,
        splash_screen_url: newSplashUrl,
        splash_screen_redirect_url: redirectUrl.trim() || "https://pyn-technologies.web.app/",
        splash_screen_duration: duration,
      } as any);

      if (error) {
        throw error;
      }

      // Sync local storage for instant offline / cold launch hydration
      if (typeof window !== "undefined") {
        localStorage.setItem("custom_splash_enabled", String(enabled));
        if (newSplashUrl) {
          localStorage.setItem("custom_splash_url", newSplashUrl);
        } else {
          localStorage.removeItem("custom_splash_url");
        }
        localStorage.setItem(
          "custom_splash_redirect",
          redirectUrl.trim() || "https://pyn-technologies.web.app/"
        );
      }

      toast.success("Splash Screen updated & old image deleted from storage!");
      qc.invalidateQueries({ queryKey: ["festival-settings"] });
    } catch (err: any) {
      console.error("Failed to save splash screen settings:", err);
      toast.error(err.message || "Failed to save splash screen settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    const oldSplashUrl = settings?.splash_screen_url || splashUrl;
    if (oldSplashUrl) {
      await deleteOldSplashFromStorage(oldSplashUrl);
    }

    setSplashUrl("");
    setEnabled(true);
    setRedirectUrl("https://pyn-technologies.web.app/");
    setDuration(3000);
    setUploadResult(null);

    // Save reset state directly to database
    try {
      const targetId = settings?.id ?? 1;
      await supabase.from("festival_settings").upsert({
        id: targetId,
        splash_screen_enabled: true,
        splash_screen_url: null,
        splash_screen_redirect_url: "https://pyn-technologies.web.app/",
        splash_screen_duration: 3000,
      } as any);

      if (typeof window !== "undefined") {
        localStorage.removeItem("custom_splash_url");
        localStorage.setItem("custom_splash_enabled", "true");
        localStorage.setItem("custom_splash_redirect", "https://pyn-technologies.web.app/");
      }
      qc.invalidateQueries({ queryKey: ["festival-settings"] });
    } catch (e) {
      console.warn("Failed to reset splash screen in DB:", e);
    }

    toast.info("Reset to default splash poster & removed custom image file.");
  };

  const previewImage = splashUrl.trim() || splashImgDefault;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Welcome Experience
            </div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-amber-500" />
              Splash Screen Manager
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Control the opening splash screen poster, duration, and click destination displayed
              when users open the app on mobile devices.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestPreviewOpen(true)}
              className="rounded-full text-xs gap-1.5 border-amber-500/30 hover:bg-amber-500/10"
            >
              <Play className="h-3.5 w-3.5 text-amber-500" />
              <span>Test Live Preview</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls & Upload (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Toggle Card */}
          <div className="card-premium p-5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  Enable Splash Screen Overlay
                </span>
                <Badge
                  variant={enabled ? "default" : "secondary"}
                  className={
                    enabled
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : ""
                  }
                >
                  {enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Show the mobile splash screen when users open the site for the first time in a session.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Device Upload Area */}
          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-amber-500" />
                Upload Splash Screen Poster from Device
              </h3>
              {splashUrl && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs text-muted-foreground hover:text-amber-500 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Use Default
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-secondary/20 hover:bg-secondary/40 p-6 text-center transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 cursor-pointer opacity-0 z-10"
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  <p className="text-xs font-semibold text-foreground">
                    Compressing WebP &amp; Uploading to CDN...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Click to choose file or drag &amp; drop here
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Supports PNG, JPG, WebP (Optimized for full-screen phone portrait)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadResult && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Compressed to WebP: {(uploadResult.compressedSize / 1024).toFixed(1)} KB (Saved{" "}
                  {Math.round(
                    ((uploadResult.originalSize - uploadResult.compressedSize) /
                      uploadResult.originalSize) *
                      100
                  )}
                  %)
                </span>
              </div>
            )}

            {/* Direct URL Input */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <Label htmlFor="splash_url" className="text-xs font-semibold">
                Or Paste Image URL Directly
              </Label>
              <div className="flex gap-2">
                <Input
                  id="splash_url"
                  value={splashUrl}
                  onChange={(e) => setSplashUrl(e.target.value)}
                  placeholder="https://example.com/poster.png or Supabase CDN URL"
                  className="rounded-xl text-xs"
                />
                {splashUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSplashUrl("")}
                    className="text-xs shrink-0 rounded-xl"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Settings Card */}
          <div className="card-premium p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-amber-500" />
              Duration &amp; Link Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="splash_duration" className="text-xs">
                  Display Duration
                </Label>
                <select
                  id="splash_duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={2000}>2.0 Seconds (Fast)</option>
                  <option value={3000}>3.0 Seconds (Recommended)</option>
                  <option value={4000}>4.0 Seconds</option>
                  <option value={5000}>5.0 Seconds (Long)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="splash_redirect" className="text-xs">
                  On Click Redirect Target URL
                </Label>
                <Input
                  id="splash_redirect"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://pyn-technologies.web.app/"
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSave}
            disabled={saving || isSettingsLoading}
            className="w-full rounded-full gradient-saffron text-primary-foreground font-bold py-3 shadow-md"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
              </span>
            ) : (
              "Save & Apply Splash Screen Live"
            )}
          </Button>
        </div>

        {/* Right Column: Live Phone Mockup Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-amber-500" />
                Live Mobile Preview
              </h3>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                Mobile Overlay
              </Badge>
            </div>

            {/* Mobile Frame Container */}
            <div className="mx-auto w-[240px] sm:w-[260px] h-[480px] rounded-[36px] border-4 border-stone-800 bg-stone-950 p-2 shadow-2xl relative overflow-hidden flex flex-col justify-between select-none">
              {/* Phone Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-stone-900 rounded-b-xl z-30" />

              {/* Screen Content */}
              <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-[#000c24] flex items-center justify-center">
                {/* Skip button mockup */}
                <div className="absolute top-3 right-3 z-20 text-[10px] font-bold text-white/90 bg-stone-900/90 px-2.5 py-1 rounded-full border border-white/20">
                  Skip &rarr;
                </div>

                {/* Poster image */}
                <img
                  src={previewImage}
                  alt="Splash Poster Preview"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Home indicator bar */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/40 rounded-full z-30 pointer-events-none" />
            </div>

            <div className="text-center text-[11px] text-muted-foreground leading-relaxed">
              Preview of mobile welcome poster. Click target links to:{" "}
              <span className="font-mono text-foreground font-semibold break-all">
                {redirectUrl || "https://pyn-technologies.web.app/"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Live Preview Modal Overlay */}
      {testPreviewOpen && (
        <div
          className="fixed inset-0 z-[100000] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setTestPreviewOpen(false)}
        >
          <div className="relative w-full max-w-sm h-[85vh] max-h-[640px] rounded-3xl overflow-hidden bg-[#000c24] border border-white/20 shadow-2xl">
            <button
              type="button"
              onClick={() => setTestPreviewOpen(false)}
              className="absolute top-4 right-4 z-50 text-xs font-bold text-white bg-stone-900/90 px-4 py-2 rounded-full border border-white/30 shadow-lg hover:bg-stone-800"
            >
              Close Test Preview &times;
            </button>

            <a
              href={redirectUrl || "https://pyn-technologies.web.app/"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full block"
            >
              <img
                src={previewImage}
                alt="Live Splash Test"
                className="w-full h-full object-cover object-center"
              />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
