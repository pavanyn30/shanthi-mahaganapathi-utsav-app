import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  QrCode,
  Copy,
  CheckCircle2,
  ExternalLink,
  Upload,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Download,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  settingsQuery,
  validateUTR,
  generateReferenceNo,
  buildUPIPayDeepLink,
  formatCurrency,
} from "@/lib/festival";

export type ManualUPIPaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  donorName: string;
  email: string;
  phone: string;
  message?: string;
  isAnonymous?: boolean;
  type?: "donation" | "registration";
  eventId?: string;
  onSuccess: (receiptData: {
    referenceNo: string;
    utrNumber: string;
    amount: number;
    submittedAt: string;
    status: string;
    donorName: string;
    email: string;
    phone: string;
  }) => void;
};

export function ManualUPIPaymentModal({
  open,
  onOpenChange,
  amount,
  donorName,
  email,
  phone,
  message = "",
  isAnonymous = false,
  type = "donation",
  eventId,
  onSuccess,
}: ManualUPIPaymentModalProps) {
  const { user } = useSession();
  const { data: settings } = useQuery(settingsQuery);

  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const upiId = settings?.upi_id || "ganapathimandal@upi";
  const merchantName = settings?.merchant_name || "Sri Ganapathi Mandal Trust";
  const qrUrl =
    settings?.upi_qr_url ||
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(buildUPIPayDeepLink(upiId, merchantName, amount))}`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = "Ganapathi_Festival_UPI_QR.png";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const utrValidation = validateUTR(utrNumber);
    if (!utrValidation.valid) {
      toast.error(utrValidation.error || "Please enter a valid UTR number.");
      return;
    }

    const cleanUtr = utrValidation.formatted;
    setSubmitting(true);

    try {
      // 1. Duplicate UTR check
      const { data: existingDonation } = await supabase
        .from("donations")
        .select("id, reference_no, status")
        .eq("utr_number", cleanUtr)
        .neq("status", "rejected")
        .maybeSingle();

      if (existingDonation) {
        setSubmitting(false);
        toast.error(
          `This UTR (${cleanUtr}) has already been submitted under Reference #${existingDonation.reference_no || "existing"}.`,
        );
        return;
      }

      // 2. Upload screenshot if present
      let screenshotUrl: string | null = null;
      if (screenshotFile) {
        setUploadingScreenshot(true);
        const fileExt = screenshotFile.name.split(".").pop();
        const filePath = `${type}s/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, screenshotFile, { upsert: true });

        if (uploadError) {
          console.warn("Storage upload fallback error:", uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("payment-proofs")
            .getPublicUrl(filePath);
          screenshotUrl = publicUrlData?.publicUrl || null;
        }
        setUploadingScreenshot(false);
      }

      // 3. Generate Reference Number
      const refNo = generateReferenceNo(type === "donation" ? "DON" : "REG");
      const submittedTime = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      if (type === "donation") {
        const { error: insertError } = await supabase.from("donations").insert({
          user_id: user?.id || null,
          donor_name: donorName,
          email: email || null,
          phone: phone || null,
          amount: amount,
          message: message || null,
          is_anonymous: isAnonymous,
          reference_no: refNo,
          utr_number: cleanUtr,
          screenshot_url: screenshotUrl,
          payment_method: "upi",
          status: "pending_verification",
        });

        if (insertError) {
          if (insertError.code === "23505" || insertError.message.includes("unique")) {
            toast.error("This UTR has already been submitted.");
          } else {
            toast.error(`Error saving payment: ${insertError.message}`);
          }
          setSubmitting(false);
          return;
        }
      } else if (type === "registration" && eventId) {
        const { error: regInsertError } = await supabase.from("registrations").insert({
          event_id: eventId,
          user_id: user?.id || "guest",
          full_name: donorName,
          email: email || null,
          phone: phone,
          pass_code: refNo,
          reference_no: refNo,
          utr_number: cleanUtr,
          screenshot_url: screenshotUrl,
          payment_method: "upi",
          payment_status: "pending_verification",
          status: "pending",
        });

        if (regInsertError) {
          toast.error(`Error saving registration: ${regInsertError.message}`);
          setSubmitting(false);
          return;
        }
      }

      setSubmitting(false);
      onOpenChange(false);

      // Trigger success screen callback
      onSuccess({
        referenceNo: refNo,
        utrNumber: cleanUtr,
        amount: amount,
        submittedAt: submittedTime,
        status: "Pending Verification",
        donorName: donorName,
        email: email,
        phone: phone,
      });

      toast.success("Payment submitted successfully for verification!");
    } catch (err: any) {
      setSubmitting(false);
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const deepLink = buildUPIPayDeepLink(upiId, merchantName, amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border border-amber-500/30">
        <DialogHeader className="gradient-temple px-6 py-5 text-temple-foreground border-b border-amber-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display text-white">
                  Manual UPI Payment
                </DialogTitle>
                <DialogDescription className="text-xs text-amber-100/90">
                  Scan QR code or pay to UPI ID &amp; enter UTR
                </DialogDescription>
              </div>
            </div>
            <Badge className="rounded-full bg-amber-500/20 text-amber-100 border border-amber-400/30 text-xs px-3 py-1 font-bold">
              ₹{amount.toLocaleString("en-IN")}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmitPayment} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* QR Code & Receiver Card */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 dark:bg-stone-900/60 p-4 text-center space-y-3">
            <div className="relative inline-block mx-auto rounded-2xl bg-white p-3 shadow-md border border-amber-200">
              <img
                src={qrUrl}
                alt="UPI Payment QR Code"
                className="h-44 w-44 object-contain mx-auto rounded-lg"
              />
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full bg-white dark:bg-stone-900 text-[10px] shadow-sm font-semibold border-amber-400 flex items-center gap-1"
                  onClick={handleDownloadQR}
                >
                  <Download className="h-3 w-3 text-amber-600" /> Save QR
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Receiver / Merchant Name
              </p>
              <p className="font-display font-extrabold text-sm text-foreground">{merchantName}</p>
            </div>

            {/* UPI ID Copy Bar */}
            <div className="flex items-center gap-2 rounded-xl bg-background border border-border p-2">
              <div className="min-w-0 flex-1 text-left px-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">UPI ID</p>
                <p className="truncate font-mono font-bold text-xs text-primary">{upiId}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={copiedUpi ? "default" : "secondary"}
                className="rounded-lg text-xs font-semibold shrink-0"
                onClick={handleCopyUPI}
              >
                {copiedUpi ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy ID
                  </>
                )}
              </Button>
            </div>

            {/* Open in UPI App Deep Link */}
            <a
              href={deepLink}
              target="_self"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-saffron px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-warm transition-transform active:scale-98"
            >
              <ExternalLink className="h-4 w-4" /> Open in UPI App (GPay / PhonePe / Paytm)
            </a>
          </div>

          {/* Payment Instructions */}
          <div className="rounded-xl bg-secondary/60 p-3 text-xs space-y-1.5 border border-border/60">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> How to
              complete payment:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed pl-1">
              <li>Scan the QR code or copy the UPI ID above.</li>
              <li>
                Pay exact amount of{" "}
                <span className="font-bold text-foreground">₹{amount.toLocaleString("en-IN")}</span>{" "}
                in your UPI app.
              </li>
              <li>
                Copy the 12 to 30 character{" "}
                <span className="font-bold text-foreground">UTR / Ref No.</span> from your payment
                receipt.
              </li>
              <li>Paste the UTR number below and submit for verification.</li>
            </ol>
          </div>

          {/* UTR Input Field */}
          <div className="space-y-2">
            <Label
              htmlFor="utr_input"
              className="text-xs font-bold flex items-center justify-between"
            >
              <span>
                UTR / Transaction Reference Number <span className="text-destructive">*</span>
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                12-30 Chars
              </Badge>
            </Label>
            <Input
              id="utr_input"
              type="text"
              placeholder="e.g. 423612345678 or UPI1234567890"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
              className="font-mono text-sm uppercase tracking-wider rounded-xl border-amber-500/40 focus:border-amber-500 focus:ring-amber-500"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Enter the UTR/Transaction Reference Number from your UPI app (GPay, PhonePe, Paytm,
              BHIM).
            </p>
          </div>

          {/* Optional Screenshot Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center justify-between">
              <span>
                Payment Screenshot{" "}
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </span>
              <span className="text-[10px] text-muted-foreground">Max 5MB</span>
            </Label>

            {screenshotPreview ? (
              <div className="relative rounded-xl border border-border p-2 bg-secondary/40 flex items-center gap-3">
                <img
                  src={screenshotPreview}
                  alt="Payment Proof Preview"
                  className="h-14 w-14 object-cover rounded-lg border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{screenshotFile?.name}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Ready to upload</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    setScreenshotFile(null);
                    setScreenshotPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-secondary/30 p-4 text-center transition-colors hover:bg-secondary/60">
                <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                <span className="text-xs font-semibold text-foreground">
                  Upload payment screenshot
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  PNG, JPG or WebP up to 5MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full font-semibold"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-full gradient-saffron text-primary-foreground font-bold shadow-warm flex items-center justify-center gap-2"
              disabled={submitting || !utrNumber.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Submit Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
