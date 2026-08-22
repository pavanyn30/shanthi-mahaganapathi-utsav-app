import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  HandHeart,
  CheckCircle2,
  ShieldCheck,
  Heart,
  Download,
  Share2,
  QrCode,
  Sparkles,
  Lock,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  ExternalLink,
  FileText,
  BadgeAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession, stringToUuid } from "@/hooks/use-session";
import { formatCurrency, settingsQuery, validateUTR, Donation } from "@/lib/festival";
import { sendDonationReceiptEmail } from "@/lib/email-service";
import { ManualUPIPaymentModal } from "@/components/features/payments/ManualUPIPaymentModal";

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate & Support — Ganapathi Festival 2026" },
      {
        name: "description",
        content:
          "Contribute to daily Annadana, Mahapooja, decorations and cultural programmes via Manual UPI or Gateway.",
      },
      { property: "og:title", content: "Donate & Support — Ganapathi Festival 2026" },
      {
        property: "og:description",
        content: "Manual UPI & Razorpay payment gateway for Ganapathi Seva.",
      },
    ],
  }),
  component: DonatePage,
});

const PRESETS = [1, 101, 501, 1001, 2501, 5001];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function downloadDonationInvoicePDF(receipt: {
  donorName: string;
  email: string;
  phone: string;
  amount: number;
  paymentId: string;
  date: string;
  utrNumber?: string;
  referenceNo?: string;
}) {
  const refNo =
    receipt.referenceNo ||
    `GPDT-2026-${receipt.paymentId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6)
      .padStart(6, "0")
      .toUpperCase()}`;
  const txnId = receipt.utrNumber
    ? `UTR: ${receipt.utrNumber}`
    : `TXN${receipt.paymentId
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-10)
        .toUpperCase()}`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to download your invoice PDF.");
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Ganapathi Donation Receipt - ${refNo}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Great+Vibes&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 portrait; margin: 6mm; }
      * { box-sizing: border-box; }
      body {
        font-family: 'Outfit', sans-serif;
        color: #1c1917;
        background: #fbf9f5;
        margin: 0;
        padding: 16px;
        display: flex;
        justify-content: center;
      }
      .receipt-card {
        width: 100%;
        max-width: 760px;
        background: #fffdfa;
        border: 12px solid #ea580c;
        padding: 24px;
        position: relative;
        box-shadow: 0 10px 30px rgba(154, 52, 18, 0.15);
      }
      .inner-border {
        border: 2px double #d97706;
        padding: 28px 24px;
        position: relative;
        background: radial-gradient(circle at center, rgba(254, 243, 199, 0.25) 0%, transparent 75%);
        overflow: hidden;
      }
      .watermark-img {
        position: absolute;
        top: 52%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 380px;
        height: 380px;
        opacity: 0.08;
        pointer-events: none;
        z-index: 0;
        object-fit: contain;
      }
      .content-layer {
        position: relative;
        z-index: 1;
      }
      .header-section { text-align: center; margin-bottom: 16px; }
      .arch-logo {
        display: inline-block;
        border: 2px solid #d97706;
        border-radius: 999px 999px 0 0;
        padding: 10px 24px 6px 24px;
        background: #fff7ed;
      }
      .trust-name {
        font-family: 'Cinzel', serif;
        font-size: 18px;
        font-weight: 800;
        color: #800000;
        letter-spacing: 2.5px;
        margin: 4px 0 0 0;
        text-transform: uppercase;
      }
      .trust-motto { font-size: 11px; color: #78350f; letter-spacing: 1px; margin-top: 1px; }
      .main-title {
        font-family: 'Cinzel', serif;
        font-size: 38px;
        font-weight: 900;
        color: #800000;
        letter-spacing: 5px;
        margin: 14px 0 0 0;
        text-transform: uppercase;
      }
      .sub-title { font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700; color: #b45309; letter-spacing: 3px; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 13px; margin-top: 16px; }
      .meta-item { display: flex; align-items: center; }
      .label-span { font-weight: 700; color: #44403c; width: 120px; }
      .val-span { font-weight: 600; color: #1c1917; flex: 1; }
      .status-pill { background: #16a34a; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 12px; border-radius: 9999px; }
      .dotted-hr { border-top: 2px dotted #cbd5e1; margin: 18px 0; }
      .details-grid { display: flex; flex-direction: column; gap: 10px; }
      .detail-row { display: flex; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #f5f5f4; font-size: 14px; }
      .detail-label { font-weight: 700; color: #44403c; width: 140px; }
      .amount-val { font-family: 'Cinzel', serif; font-size: 24px; font-weight: 800; color: #800000; }
      .thank-you-box { text-align: center; margin-top: 24px; }
      .thank-you-title { font-family: 'Great Vibes', cursive; font-size: 56px; color: #800000; margin: 0; }
      .thank-you-sub { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; color: #44403c; letter-spacing: 2px; }
      .disclaimer-bar { background: #ffffff; border: 1px solid #fed7aa; border-radius: 9999px; padding: 8px 18px; font-size: 11px; color: #78350f; text-align: center; margin-top: 16px; }
      @media print { body { padding: 0; background: none; } .receipt-card { box-shadow: none; border-width: 4px; } }
    </style>
  </head>
  <body>
    <div class="receipt-card">
      <div class="inner-border">
        <img src="/ganapathi-watermark.png" class="watermark-img" alt="Ganapathi Watermark" />
        <div class="content-layer">
          <div class="header-section">
            <div class="arch-logo">
              <div class="trust-name">GANAPATHI SEVA TRUST</div>
              <div class="trust-motto">Devotion | Service | Dedication</div>
            </div>
            <h1 class="main-title">GANAPATHI</h1>
            <div class="sub-title">OFFICIAL DONATION RECEIPT</div>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><span class="label-span">Reference No:</span><span class="val-span">${refNo}</span></div>
            <div class="meta-item"><span class="label-span">Date &amp; Time:</span><span class="val-span">${receipt.date}</span></div>
            <div class="meta-item"><span class="label-span">Reference/UTR:</span><span class="val-span">${txnId}</span></div>
            <div class="meta-item"><span class="label-span">Status:</span><span class="val-span"><span class="status-pill">✓ RECEIVED</span></span></div>
          </div>
          <div class="dotted-hr"></div>
          <div class="details-grid">
            <div class="detail-row"><span class="detail-label">Donor Name:</span><span class="val-span">${receipt.donorName}</span></div>
            <div class="detail-row"><span class="detail-label">Mobile Number:</span><span class="val-span">${receipt.phone || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Email Address:</span><span class="val-span">${receipt.email || "N/A"}</span></div>
            <div class="detail-row"><span class="detail-label">Seva Purpose:</span><span class="val-span">Ganapathi Festival Celebration &amp; Annadana</span></div>
            <div class="detail-row"><span class="detail-label">Amount Paid:</span><span class="amount-val">₹ ${receipt.amount.toLocaleString("en-IN")}.00</span></div>
          </div>
          <div class="thank-you-box">
            <h3 class="thank-you-title">Thank You</h3>
            <div class="thank-you-sub">FOR YOUR GENEROUS DEVOTIONAL CONTRIBUTION</div>
          </div>
          <div class="disclaimer-bar">
            📄 Official computer-generated receipt for Sri Ganapathi Mandal Trust. Tax-exempt Seva confirmation.
          </div>
        </div>
      </div>
    </div>
    <script>
      window.onload = function() { setTimeout(function() { window.print(); }, 400); };
    </script>
  </body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function DonatePage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);

  const [amount, setAmount] = useState<number>(1001);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Manual UPI Modal state
  const [manualUpiModalOpen, setManualUpiModalOpen] = useState(false);

  // Instant Pending Confirmation Modal state
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    referenceNo: string;
    utrNumber: string;
    amount: number;
    submittedAt: string;
    status: string;
    donorName: string;
    email: string;
    phone: string;
  } | null>(null);

  // Success Verified Receipt state
  const [successReceipt, setSuccessReceipt] = useState<{
    donorName: string;
    email: string;
    phone: string;
    amount: number;
    paymentId: string;
    date: string;
    referenceNo?: string;
    utrNumber?: string;
  } | null>(null);

  // History & Resubmit State
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [resubmitItem, setResubmitItem] = useState<Donation | null>(null);
  const [newUtrInput, setNewUtrInput] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  // Fetch User's Donations (Logged in or Searched)
  const { data: userDonations = [], refetch: refetchDonations } = useQuery({
    queryKey: ["user-donations", user?.id, historySearchQuery],
    queryFn: async () => {
      let query = supabase.from("donations").select("*").order("created_at", { ascending: false });

      if (historySearchQuery.trim()) {
        const q = historySearchQuery.trim();
        query = query.or(
          `reference_no.ilike.%${q}%,utr_number.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
        );
      } else if (user?.id) {
        const validUuid = stringToUuid(user.id);
        if (validUuid && user.email) {
          query = query.or(`user_id.eq.${validUuid},email.ilike.${user.email}`);
        } else if (validUuid) {
          query = query.eq("user_id", validUuid);
        } else if (user.email) {
          query = query.eq("email", user.email);
        }
      } else {
        return [];
      }

      const { data } = await query;
      return (data || []) as unknown as Donation[];
    },
  });

  // Enable Realtime Sync on User Donations
  useEffect(() => {
    const channel = supabase
      .channel("public:donations_user_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, () => {
        refetchDonations();
        qc.invalidateQueries({ queryKey: ["user-donations"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchDonations, qc]);

  // Auto-prefill email/name if logged in
  useEffect(() => {
    if (user && user.email) {
      setEmail((prev) => prev || user.email || "");
    }
  }, [user]);

  const handlePresetClick = (p: number) => {
    setAmount(p);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    }
  };

  const validateForm = (): number | null => {
    const finalAmount = customAmount ? Number(customAmount) : amount;
    if (!name.trim()) {
      toast.error("Please enter your name");
      return null;
    }
    if (!phone.trim() || !/^[0-9+\s-]{8,15}$/.test(phone.trim())) {
      toast.error("Please enter a valid mobile number");
      return null;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address for receipt");
      return null;
    }
    if (isNaN(finalAmount) || finalAmount < 1) {
      toast.error("Please enter a valid donation amount");
      return null;
    }
    return finalAmount;
  };

  const handleOpenManualUPIModal = () => {
    const validAmount = validateForm();
    if (validAmount) {
      setManualUpiModalOpen(true);
    }
  };

  const handleResubmitUTRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitItem) return;

    const utrVal = validateUTR(newUtrInput);
    if (!utrVal.valid) {
      toast.error(utrVal.error || "Invalid UTR");
      return;
    }

    setResubmitting(true);
    try {
      const { error } = await supabase
        .from("donations")
        .update({
          utr_number: utrVal.formatted,
          status: "pending_verification",
          admin_notes: null,
        } as any)
        .eq("id", resubmitItem.id);

      if (error) {
        toast.error(`Resubmission failed: ${error.message}`);
      } else {
        toast.success("New UTR submitted successfully! Under verification.");
        setResubmitItem(null);
        setNewUtrInput("");
        refetchDonations();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resubmit UTR.");
    } finally {
      setResubmitting(false);
    }
  };

  const finalAmount = customAmount ? Number(customAmount) : amount;
  const isDonateEnabled = settings?.manual_upi_enabled !== false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-12">
      <div className="text-center space-y-3">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-saffron text-primary-foreground shadow-warm">
          <HandHeart className="h-8 w-8" />
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Support Ganapathi Festival
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Your contribution supports daily Maha Aarti, Annadana Mahaprasadam distribution, pandal
          decorations, and cultural programmes.
        </p>
      </div>

      {!isDonateEnabled ? (
        <div className="card-premium p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto border-amber-500/30">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <HandHeart className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground">
            Donations Currently Disabled
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Online Seva payments and donations are currently turned off by the festival administration committee. Please check back later or contact the mandal directly.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-full">
          {/* Donation Form Card - Full Width 100% */}
          <div className="card-premium p-6 sm:p-8 space-y-6 w-full max-w-full">
            {/* Preset Selection */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Contribution Amount
              </Label>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={amount === p && !customAmount ? "default" : "outline"}
                    className={`rounded-full px-5 py-2 text-sm font-bold ${
                      amount === p && !customAmount
                        ? "gradient-saffron text-primary-foreground border-transparent shadow-warm"
                        : ""
                    }`}
                    onClick={() => handlePresetClick(p)}
                  >
                    {formatCurrency(p)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom_amount" className="text-xs font-bold">
                  Custom Amount (₹)
                </Label>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                  No minimum limit — Pay ₹1 or more 🪔
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-2.5 font-bold text-muted-foreground">₹</span>
                <Input
                  id="custom_amount"
                  type="number"
                  min={1}
                  step="any"
                  value={customAmount}
                  placeholder={`Selected: ₹${amount}`}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-8 rounded-2xl font-bold text-base border-amber-500/30"
                />
              </div>
            </div>

            {/* Donor Personal Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-bold">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  className="rounded-2xl"
                  placeholder="e.g. Ananya Sharma"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-xs font-bold">
                  Mobile Number *
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  maxLength={15}
                  className="rounded-2xl"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs font-bold">
                Email Address (For Official Receipt) *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="rounded-2xl"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message" className="text-xs font-bold">
                Devotional Message / Prayer (Optional)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={200}
                className="rounded-2xl"
                placeholder="e.g. Ganapathi Bappa Morya! Bless our family with health and prosperity."
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              <Label htmlFor="anonymous" className="text-xs font-medium cursor-pointer">
                Hide my name on public donor wall (Anonymous Seva)
              </Label>
            </div>

            {/* Payment Actions */}
            <div className="space-y-3 pt-2">
              <Button
                type="button"
                className="w-full rounded-full gradient-saffron text-primary-foreground font-bold shadow-warm text-base py-6 flex items-center justify-center gap-2"
                onClick={handleOpenManualUPIModal}
              >
                <QrCode className="h-5 w-5" /> Pay via Manual UPI QR / App (
                {formatCurrency(finalAmount)})
              </Button>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground border-t border-border/60 pt-4">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Dynamic Receiver UPI
              </span>
              <span>·</span>
              <span>Instant UTR Verification</span>
              <span>·</span>
              <span>PDF Tax Receipt</span>
            </div>
          </div>
        </div>
      )}

      {/* Manual UPI Payment Modal Component */}
      <ManualUPIPaymentModal
        open={manualUpiModalOpen}
        onOpenChange={setManualUpiModalOpen}
        amount={finalAmount}
        donorName={name.trim() || "Devotee"}
        email={email.trim()}
        phone={phone.trim()}
        message={message.trim()}
        isAnonymous={isAnonymous}
        type="donation"
        onSuccess={(confirmData) => {
          setPendingConfirmation(confirmData);
          refetchDonations();
        }}
      />

      {/* Instant Pending Confirmation Dialog */}
      {pendingConfirmation && (
        <Dialog open={!!pendingConfirmation} onOpenChange={() => setPendingConfirmation(null)}>
          <DialogContent className="max-w-md p-6 rounded-3xl text-center space-y-5 border border-amber-500/40">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-sm">
              <Clock className="h-8 w-8 text-amber-600 animate-pulse" />
            </div>

            <div>
              <Badge className="rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400 px-3 py-1 font-bold text-xs">
                ⏳ Payment Pending Verification
              </Badge>
              <h2 className="mt-3 text-xl font-bold font-display text-foreground">
                Thank you! Payment Details Submitted
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your payment details have been submitted successfully and are under review by our
                admin team.
              </p>
            </div>

            <div className="rounded-2xl bg-secondary/60 p-4 space-y-2 text-left text-xs border border-border">
              <div className="flex justify-between border-b border-border/60 pb-1.5">
                <span className="font-semibold text-muted-foreground">Reference Number:</span>
                <span className="font-bold font-mono text-primary">
                  {pendingConfirmation.referenceNo}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-1.5">
                <span className="font-semibold text-muted-foreground">Submitted Amount:</span>
                <span className="font-bold text-foreground">
                  ₹{pendingConfirmation.amount.toLocaleString("en-IN")}.00
                </span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-1.5">
                <span className="font-semibold text-muted-foreground">UTR Reference:</span>
                <span className="font-mono font-bold text-foreground">
                  {pendingConfirmation.utrNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">Submitted At:</span>
                <span className="text-foreground">{pendingConfirmation.submittedAt}</span>
              </div>
            </div>

            <Button
              className="w-full rounded-full gradient-saffron text-primary-foreground font-bold shadow-warm"
              onClick={() => setPendingConfirmation(null)}
            >
              Done &amp; View Donation History
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* User Donation History & Status Tracker Section */}
      <div className="card-premium p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Donation History &amp; Receipt Status
            </h2>
            <p className="text-xs text-muted-foreground">
              Track verification status or download PDF receipts for your Seva contributions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search UTR, Ref #, Email..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-full"
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full shrink-0"
              onClick={() => refetchDonations()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {userDonations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs rounded-2xl bg-secondary/30 border border-dashed p-6">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 text-amber-500" />
            <p className="font-semibold">No donations found.</p>
            <p className="mt-0.5">Submit a donation above or search by your email / UTR number.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userDonations.map((d) => {
              const isReceived = d.status === "received" || d.status === "approved";
              const isPending = d.status === "pending_verification" || d.status === "pending";
              const isRejected = d.status === "rejected";

              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        ₹{d.amount.toLocaleString("en-IN")}
                      </span>
                      {d.reference_no && (
                        <Badge variant="outline" className="font-mono text-[10px] rounded-full">
                          #{d.reference_no}
                        </Badge>
                      )}
                      {isReceived && (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                          ✓ Received &amp; Verified
                        </Badge>
                      )}
                      {isPending && (
                        <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400 text-[10px] font-bold rounded-full">
                          ⏳ Pending Verification
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge variant="destructive" className="text-[10px] font-bold rounded-full">
                          ✕ Rejected
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        Donor: <span className="font-semibold text-foreground">{d.donor_name}</span>
                        {d.utr_number && (
                          <>
                            {" "}
                            · UTR: <span className="font-mono font-semibold">{d.utr_number}</span>
                          </>
                        )}
                      </p>
                      <p className="text-[11px]">
                        Date:{" "}
                        {new Date(d.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {isRejected && d.admin_notes && (
                        <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" /> Admin Note: {d.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isReceived && (
                      <Button
                        size="sm"
                        className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs"
                        onClick={() =>
                          downloadDonationInvoicePDF({
                            donorName: d.donor_name,
                            email: d.email || "",
                            phone: d.phone || "",
                            amount: d.amount,
                            paymentId: d.payment_id || d.utr_number || d.id,
                            date: new Date(d.created_at).toLocaleString("en-IN"),
                            referenceNo: d.reference_no || undefined,
                            utrNumber: d.utr_number || undefined,
                          })
                        }
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF Receipt
                      </Button>
                    )}

                    {isRejected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-amber-500 text-amber-700 dark:text-amber-400 text-xs font-bold"
                        onClick={() => {
                          setResubmitItem(d);
                          setNewUtrInput(d.utr_number || "");
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Resubmit UTR
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resubmit UTR Dialog */}
      {resubmitItem && (
        <Dialog open={!!resubmitItem} onOpenChange={() => setResubmitItem(null)}>
          <DialogContent className="max-w-md p-6 rounded-3xl space-y-4 border border-amber-500/40">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Resubmit UTR for Verification</DialogTitle>
              <DialogDescription className="text-xs">
                Update UTR for donation reference{" "}
                <span className="font-mono font-bold text-primary">
                  #{resubmitItem.reference_no}
                </span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResubmitUTRSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resubmit_utr_input" className="text-xs font-bold">
                  New UTR Number *
                </Label>
                <Input
                  id="resubmit_utr_input"
                  value={newUtrInput}
                  onChange={(e) => setNewUtrInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 423612345678"
                  className="font-mono uppercase tracking-wider text-sm rounded-xl"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setResubmitItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full gradient-saffron text-primary-foreground font-bold"
                  disabled={resubmitting}
                >
                  {resubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit Corrected UTR"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Legacy/Online Razorpay Success Receipt Dialog if triggered */}
      {successReceipt && (
        <Dialog open={!!successReceipt} onOpenChange={() => setSuccessReceipt(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 border-[10px] border-amber-600 bg-[#fffdfa] rounded-3xl text-stone-800">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-black text-rose-900">Donation Verified</h2>
              <Button
                className="rounded-full gradient-saffron text-primary-foreground font-bold"
                onClick={() => downloadDonationInvoicePDF(successReceipt)}
              >
                Download Receipt PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
