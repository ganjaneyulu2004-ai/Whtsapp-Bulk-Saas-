"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import QRCode from "qrcode";
import { fireSmallConfetti } from "@/lib/confetti";
import { 
  Check, 
  Copy, 
  ExternalLink, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Info
} from "lucide-react";
import { PlanConfig } from "@/config/plans";

export default function CompletePaymentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [upiId, setUpiId] = useState("9876543210@ybl");
  const [payeeName, setPayeeName] = useState("iBrainLabs");
  const [paymentPhone, setPaymentPhone] = useState("+919876543210");
  const [metaNote, setMetaNote] = useState("WhatsApp (Meta) message charges are separate.");

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [upiLink, setUpiLink] = useState<string>("");

  // Step 3 Form State: Billing details & Payment verification
  const [payerName, setPayerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerMobile, setPayerMobile] = useState("");
  const [payerGst, setPayerGst] = useState("");
  const [payerCity, setPayerCity] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Load plans & UPI details
  useEffect(() => {
    fetch("/api/subscription/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data?.plans) {
          setPlans(data.plans);
          // Default to popular (Growth) or first plan
          const popular = data.plans.find((p: PlanConfig) => p.popular) || data.plans[0];
          setSelectedPlan(popular);
        }
        if (data?.upiId) setUpiId(data.upiId);
        if (data?.payeeName) setPayeeName(data.payeeName);
        if (data?.paymentPhone) setPaymentPhone(data.paymentPhone);
        if (data?.metaNote) setMetaNote(data.metaNote);
        setLoadingPlans(false);
      })
      .catch(() => setLoadingPlans(false));
  }, []);

  // Pre-fill user details from session
  useEffect(() => {
    if (session?.user) {
      if (session.user.name && !payerName) setPayerName(session.user.name);
      if (session.user.mobile && !payerMobile) setPayerMobile(session.user.mobile);
      if (session.user.businessName && !businessName) setBusinessName(session.user.businessName);
      if (session.user.email && !payerEmail) setPayerEmail(session.user.email);
    }
  }, [session]);

  // Generate UPI QR Code whenever plan or UPI details change
  useEffect(() => {
    if (!selectedPlan) return;

    const username = session?.user?.username || "customer";
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      payeeName
    )}&am=${selectedPlan.price}&cu=INR&tn=iBrainLabs-${selectedPlan.name}-${username}`;

    setUpiLink(uri);

    QRCode.toDataURL(uri, {
      width: 280,
      margin: 2,
      color: {
        dark: "#2B2350", // Brand navy text, NOT black
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [selectedPlan, upiId, payeeName, session]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Screenshot must be less than 5 MB");
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPlan) return setError("Please select a plan");
    if (!utrNumber.trim()) return setError("Please enter your 12-digit UTR / Transaction ID");
    
    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length < 6 || cleanUtr.length > 20) {
      return setError("Please enter a valid 12-digit UTR number");
    }

    if (!screenshot) return setError("Please upload a payment screenshot (max 5 MB)");

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("plan", selectedPlan.name);
      formData.append("amount", String(selectedPlan.price));
      formData.append("payerName", payerName.trim() || session?.user?.name || "Customer");
      formData.append("businessName", businessName.trim() || session?.user?.businessName || "");
      formData.append("payerEmail", payerEmail.trim());
      formData.append("payerMobile", payerMobile.trim() || session?.user?.mobile || "");
      formData.append("payerGst", payerGst.trim());
      formData.append("payerCity", payerCity.trim());
      formData.append("utrNumber", cleanUtr);
      formData.append("screenshot", screenshot);

      const res = await fetch("/api/subscription/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit payment verification");
        setSubmitting(false);
        return;
      }

      // Small celebration confetti
      fireSmallConfetti();

      // Navigate to /payment-pending
      router.push("/payment-pending");
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4">
      {/* Brand Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-block bg-white p-3.5 rounded-2xl border border-brand-soft shadow-xs mb-3">
          <Image
            src="/brand/ibrainlabs-logo.png"
            alt="iBrainLabs"
            width={180}
            height={50}
            className="h-10 w-auto object-contain mx-auto"
            priority
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-text-main">
          Complete Your Subscription
        </h1>
        <p className="text-slate-muted text-sm sm:text-base mt-2">
          Activate your WhatsApp Marketing engine with a quick direct UPI transfer.
        </p>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Step Flow */}
      <div className="space-y-10">
        
        {/* STEP 1: CHOOSE PLAN */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-heading font-bold text-sm">
              1
            </span>
            <div>
              <h2 className="text-xl font-heading font-bold text-text-main">
                Step 1: Choose Your Plan
              </h2>
              <p className="text-xs text-slate-muted">
                Select the package tailored to your customer outreach volume.
              </p>
            </div>
          </div>

          {loadingPlans ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((p) => {
                const isSelected = selectedPlan?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    className={`relative rounded-2xl p-6 cursor-pointer transition-all border-2 flex flex-col justify-between ${
                      isSelected
                        ? "border-brand-purple bg-brand-50/60 shadow-lg shadow-brand-purple/10 scale-[1.02]"
                        : "border-brand-soft bg-white hover:border-brand-purple/40 hover:bg-brand-50/20"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 right-6 bg-brand-purple text-white text-[11px] font-heading font-bold px-3 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-heading font-bold text-text-main">
                          {p.name}
                        </h3>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-brand-purple bg-brand-purple" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>

                      <p className="text-xs text-slate-muted min-h-[32px] mb-4">
                        {p.description}
                      </p>

                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-3xl sm:text-4xl font-heading font-extrabold text-brand-purple">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-slate-muted font-medium">/{p.period}</span>
                      </div>

                      <ul className="space-y-2.5 text-xs text-text-main pt-4 border-t border-brand-soft/70">
                        {p.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-brand-soft">
                      <button
                        type="button"
                        className={`w-full py-2.5 rounded-xl font-heading font-semibold text-xs transition-colors ${
                          isSelected
                            ? "bg-brand-purple text-white shadow-xs"
                            : "bg-brand-soft/80 text-text-main hover:bg-brand-soft"
                        }`}
                      >
                        {isSelected ? "Selected Plan ✓" : "Select " + p.name}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Meta Note */}
          <div className="mt-6 p-3.5 rounded-2xl bg-brand-light border border-brand-soft flex items-center gap-2.5 text-xs text-slate-muted">
            <Info className="w-4 h-4 text-brand-purple shrink-0" />
            <span>{metaNote}</span>
          </div>
        </section>

        {/* STEP 2: PAY VIA UPI */}
        {selectedPlan && (
          <section className="bg-white rounded-3xl p-5 sm:p-8 border border-brand-soft shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-heading font-bold text-sm shrink-0">
                2
              </span>
              <div>
                <h2 className="text-xl font-heading font-bold text-text-main">
                  Step 2: Pay via UPI
                </h2>
                <p className="text-xs text-slate-muted">
                  Instant mobile payment via PhonePe, Google Pay, Paytm, or scan QR.
                </p>
              </div>
            </div>

            {/* Mobile First: Instant Pay with UPI App Banner (High priority on phones) */}
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-purple to-brand-blue text-white shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-brand-100 uppercase tracking-wider block">
                    Paying on your phone?
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold font-heading mt-0.5">
                    ₹{selectedPlan.price.toLocaleString("en-IN")}
                    <span className="text-xs font-normal text-brand-100 ml-2">({selectedPlan.name} Plan)</span>
                  </div>
                </div>

                {/* Primary Mobile Action Button */}
                <a
                  href={upiLink}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-brand-50 text-brand-purple font-heading font-bold text-sm shadow-lg flex items-center justify-center gap-2.5 transition active:scale-95"
                >
                  <Smartphone className="w-4 h-4 text-brand-purple" />
                  <span>Pay with any UPI App</span>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </a>
              </div>

              {/* Instant App Specific Launchers */}
              <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-brand-100/90 font-medium">Or choose your app:</span>
                <a
                  href={`phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${selectedPlan.price}&cu=INR`}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center gap-1.5 transition"
                >
                  <span>🟣 PhonePe</span>
                </a>
                <a
                  href={`tez://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${selectedPlan.price}&cu=INR`}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center gap-1.5 transition"
                >
                  <span>🔵 Google Pay</span>
                </a>
                <a
                  href={`paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${selectedPlan.price}&cu=INR`}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center gap-1.5 transition"
                >
                  <span>🔷 Paytm</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* QR Code Display (Great for Desktop / Paying from another phone) */}
              <div className="lg:col-span-5 flex flex-col items-center text-center">
                <div className="p-4 bg-white rounded-3xl border-2 border-brand-soft shadow-md relative w-full max-w-[280px]">
                  {qrCodeUrl ? (
                    <Image
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      width={250}
                      height={250}
                      className="rounded-2xl mx-auto w-full h-auto"
                      priority
                    />
                  ) : (
                    <div className="w-[240px] h-[240px] flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
                    </div>
                  )}
                  <div className="mt-3 text-[11px] font-heading font-semibold text-slate-muted">
                    Scan with any UPI Scanner
                  </div>
                </div>
              </div>

              {/* Payment Details Card */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1-Tap Copy Amount Row */}
                <div className="p-4 rounded-2xl border border-brand-soft bg-brand-light/60 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-muted uppercase">
                      Exact Amount
                    </span>
                    <span className="font-heading font-bold text-brand-purple text-lg sm:text-xl">
                      ₹{selectedPlan.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(selectedPlan.price), "amount")}
                    className="px-3 py-1.5 rounded-xl border border-brand-soft bg-white text-brand-purple hover:bg-brand-50 text-xs font-heading font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedField === "amount" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Amount</span>
                      </>
                    )}
                  </button>
                </div>

                {/* UPI ID Row */}
                <div className="p-4 rounded-2xl border border-brand-soft bg-white flex items-center justify-between">
                  <div className="overflow-hidden mr-2">
                    <span className="block text-[11px] font-semibold text-slate-muted uppercase">
                      UPI ID / VPA
                    </span>
                    <span className="font-heading font-bold text-text-main text-sm sm:text-base break-all">
                      {upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(upiId, "upiId")}
                    className="px-3.5 py-1.5 rounded-xl border border-brand-soft text-brand-purple hover:bg-brand-50 text-xs font-heading font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedField === "upiId" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Phone Number Row */}
                <div className="p-4 rounded-2xl border border-brand-soft bg-white flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-muted uppercase">
                      Pay to Phone Number
                    </span>
                    <span className="font-heading font-bold text-text-main text-sm sm:text-base">
                      {paymentPhone} ({payeeName})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentPhone, "phone")}
                    className="px-3.5 py-1.5 rounded-xl border border-brand-soft text-brand-purple hover:bg-brand-50 text-xs font-heading font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedField === "phone" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: CONFIRM PAYMENT FORM */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-heading font-bold text-sm">
              3
            </span>
            <div>
              <h2 className="text-xl font-heading font-bold text-text-main">
                Step 3: Submit Payment Verification
              </h2>
              <p className="text-xs text-slate-muted">
                Enter your transaction 12-digit UTR and attach the payment screenshot for instant admin approval.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Billing Details Header */}
            <div className="border-b border-brand-soft pb-2 mb-4">
              <h3 className="font-heading font-bold text-sm text-text-main uppercase tracking-wider">
                Billing Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full px-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Sri Balaji Silks"
                  className="w-full px-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full px-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={payerMobile}
                  onChange={(e) => setPayerMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>

              {/* GST Number (optional) */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  GST Number (Optional)
                </label>
                <input
                  type="text"
                  value={payerGst}
                  onChange={(e) => setPayerGst(e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full px-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={payerCity}
                  onChange={(e) => setPayerCity(e.target.value)}
                  placeholder="e.g. Vijayawada or Hyderabad"
                  className="w-full px-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>
            </div>

            {/* Payment Proof Header */}
            <div className="border-b border-brand-soft pb-2 pt-2">
              <h3 className="font-heading font-bold text-sm text-text-main uppercase tracking-wider">
                Payment Verification Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* UTR / Transaction ID */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  UTR / UPI Transaction ID (12 Digits) *
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 509812345678"
                  maxLength={20}
                  className="w-full px-4 py-3 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-semibold tracking-wider placeholder:text-slate-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
                <span className="text-[11px] text-slate-muted mt-1 block">
                  Find this in your UPI app payment details screen.
                </span>
              </div>

              {/* Payment Screenshot Upload */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
                  Payment Screenshot (Max 5 MB, JPG/PNG) *
                </label>
                <div className="relative border-2 border-dashed border-brand-soft rounded-2xl p-4 text-center bg-brand-light/50 hover:bg-brand-light transition-colors">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleScreenshotChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex flex-col items-center">
                    <Upload className="w-6 h-6 text-brand-purple mb-1" />
                    <span className="text-xs font-heading font-semibold text-text-main">
                      {screenshot ? screenshot.name : "Click or drag screenshot here"}
                    </span>
                    <span className="text-[10px] text-slate-muted mt-0.5">
                      Clear view showing amount and UTR number
                    </span>
                  </div>
                </div>

                {screenshotPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-brand-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotPreview}
                        alt="Screenshot Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Screenshot attached
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-brand-soft">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-8 rounded-2xl bg-brand-gradient hover:opacity-95 text-white font-heading font-bold text-base shadow-lg shadow-brand-purple/20 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting Payment Details...</span>
                  </>
                ) : (
                  <>
                    <span>I have paid – Submit for Verification</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

      </div>

      {/* Sticky Mobile Pay Bar for 1-Tap Payment on smartphones */}
      {selectedPlan && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-brand-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider block">
              {selectedPlan.name} Plan
            </span>
            <span className="text-xl font-heading font-extrabold text-brand-purple">
              ₹{selectedPlan.price.toLocaleString("en-IN")}
            </span>
          </div>

          <a
            href={upiLink}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white font-heading font-bold text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Pay via UPI App</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      )}
    </div>
  );
}
