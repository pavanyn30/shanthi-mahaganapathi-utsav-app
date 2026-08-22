import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  QrCode,
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery, FestivalSettings } from "@/lib/festival";

export function PaymentSettingsTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery(settingsQuery);

  const [upiId, setUpiId] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [manualUpiEnabled, setManualUpiEnabled] = useState(true);
  const [qrUrl, setQrUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setUpiId(settings.upi_id || "ganapathimandal@upi");
      setMerchantName(settings.merchant_name || "Sri Ganapathi Mandal Trust");
      setManualUpiEnabled(settings.manual_upi_enabled ?? true);
      setQrUrl(settings.upi_qr_url || "");
    }
  }, [settings]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("QR Code image must be less than 5MB.");
      return;
    }

    setUploadingQr(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `qr_codes/admin_upi_qr_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error(`Error uploading QR image: ${uploadError.message}`);
        setUploadingQr(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(filePath);
      const publicUrl = publicUrlData?.publicUrl;

      if (publicUrl) {
        setQrUrl(publicUrl);
        toast.success("UPI QR Code uploaded successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload QR Code image.");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      toast.error("UPI ID is required.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("festival_settings")
        .update({
          upi_id: upiId.trim(),
          merchant_name: merchantName.trim() || "Sri Ganapathi Mandal Trust",
          manual_upi_enabled: manualUpiEnabled,
          upi_qr_url: qrUrl.trim() || null,
        } as any)
        .eq("id", settings?.id ?? 1);

      if (error) {
        toast.error(`Error saving settings: ${error.message}`);
      } else {
        toast.success("Payment Settings updated & synced live!");
        qc.invalidateQueries({ queryKey: ["festival-settings"] });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
          Payment Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage dynamic Manual UPI payment details, receiver merchant name, and active QR code.
        </p>
      </div>

      <form onSubmit={handleSaveSettings}>
        <Card className="border border-border shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-secondary/40 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-saffron text-primary-foreground shadow-warm">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">UPI Payment Gateway Configuration</CardTitle>
                  <CardDescription>
                    Configure receiver UPI credentials shown on donation &amp; event checkout.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2">
                <Label htmlFor="manual_upi_toggle" className="text-xs font-bold cursor-pointer">
                  Manual UPI Payments
                </Label>
                <Switch
                  id="manual_upi_toggle"
                  checked={manualUpiEnabled}
                  onCheckedChange={setManualUpiEnabled}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Receiver UPI ID */}
              <div className="space-y-2">
                <Label htmlFor="admin_upi_id" className="text-xs font-bold">
                  Receiver UPI ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="admin_upi_id"
                  type="text"
                  placeholder="e.g. ganapathimandal@upi or 9886012345@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  The primary UPI Virtual Payment Address (VPA) where devotees transfer donations.
                </p>
              </div>

              {/* Merchant / Receiver Name */}
              <div className="space-y-2">
                <Label htmlFor="admin_merchant_name" className="text-xs font-bold">
                  Merchant / Receiver Display Name
                </Label>
                <Input
                  id="admin_merchant_name"
                  type="text"
                  placeholder="e.g. Sri Ganapathi Mandal Trust"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Official title displayed inside UPI apps (GPay, PhonePe, Paytm).
                </p>
              </div>
            </div>

            {/* QR Code Upload Section */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-bold block">UPI QR Code Image</Label>

              <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-start">
                <div className="rounded-2xl border border-border bg-secondary/30 p-3 text-center space-y-2">
                  {qrUrl ? (
                    <div className="relative group">
                      <img
                        src={qrUrl}
                        alt="Current Admin UPI QR"
                        className="h-40 w-40 object-contain mx-auto rounded-xl bg-white p-2 border shadow-xs"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-40 mx-auto rounded-xl bg-secondary flex flex-col items-center justify-center text-muted-foreground border">
                      <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
                      <span className="text-[10px]">No Custom QR</span>
                      <span className="text-[9px] text-muted-foreground">(Auto-Generated)</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qr_url_input" className="text-xs font-semibold">
                      QR Image Public URL
                    </Label>
                    <Input
                      id="qr_url_input"
                      type="url"
                      placeholder="https://..."
                      value={qrUrl}
                      onChange={(e) => setQrUrl(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl gradient-saffron px-4 py-2 text-xs font-bold text-primary-foreground shadow-warm">
                      {uploadingQr ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" /> Upload New QR Image
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        disabled={uploadingQr}
                        className="hidden"
                      />
                    </label>

                    {qrUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setQrUrl("")}
                      >
                        Reset to Auto QR
                      </Button>
                    )}
                  </div>

                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-300">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3.5 w-3.5" /> Instant Live Sync
                    </p>
                    Changes saved here reflect immediately on all user donation pages without
                    requiring site restart.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-secondary/20 border-t border-border/60 p-4 flex justify-between items-center">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Real-time database sync active
            </p>
            <Button
              type="submit"
              className="rounded-full gradient-saffron text-primary-foreground font-bold px-6 shadow-warm flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Payment Settings
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
