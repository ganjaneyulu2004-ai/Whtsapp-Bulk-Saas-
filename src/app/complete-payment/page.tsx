"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Info,
  CreditCard,
  Zap,
  Lock
} from "lucide-react";
import { PlanConfig, TopUpPack, SUBSCRIPTION_PLANS, CREDIT_TOPUP_PACKS } from "@/config/plans";

function CompletePaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedType = searchParams.get("type"); // "topup" | "plan"
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState<"plan" | "topup">(preselectedType === "topup" ? "topup" : "plan");
  const [plans, setPlans] = useState<PlanConfig[]>(SUBSCRIPTION_PLANS);
  const [topUpPacks, setTopUpPacks] = useState<TopUpPack[]>(CREDIT_TOPUP_PACKS);

  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    price: number;
    messages?: number;
    credits?: number;
    type: "PLAN" | "TOPUP";
  }>({
    id: "growth",
    name: "Growth",
    price: 2499,
    messages: 10000,
    type: "PLAN",
  });

  const [upiId, setUpiId] = useState("9390487233@ybl");
  const [payeeName, setPayeeName] = useState("Ibrain Labs");
  const [paymentPhone, setPaymentPhone] = useState("+919390487233");
  const [razorpayKeyId, setRazorpayKeyId] = useState("rzp_live_Tm5fsJVpQaPb5t");
  const [metaNote, setMetaNote] = useState("WhatsApp messaging quota is included in your plan. If your limit is reached, top-up credits to continue sending.");

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [upiLink, setUpiLink] = useState<string>("");

  // Step 3 Form State: Manual UPI fallback
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
  const [submittingManual, setSubmittingManual] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamically load Razorpay Checkout script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, []);

  // Fetch plans & UPI config from API
  useEffect(() => {
    fetch("/api/subscription/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data?.plans) setPlans(data.plans);
        if (data?.topUpPacks) setTopUpPacks(data.topUpPacks);
        if (data?.upiId) setUpiId(data.upiId);
        if (data?.payeeName) setPayeeName(data.payeeName);
        if (data?.paymentPhone) setPaymentPhone(data.paymentPhone);
        if (data?.razorpayKeyId) setRazorpayKeyId(data.razorpayKeyId);
        if (data?.metaNote) setMetaNote(data.metaNote);
      })
      .catch(() => {});
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

  // Generate UPI QR Code whenever plan changes
  useEffect(() => {
    if (!selectedItem) return;

    const username = session?.user?.username || "customer";
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      payeeName
    )}&am=${selectedItem.price}&cu=INR&tn=OfferBlast-${selectedItem.name}-${username}`;

    setUpiLink(uri);

    QRCode.toDataURL(uri, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [selectedItem, upiId, payeeName, session]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Screenshot file size must be under 5 MB.");
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  // ==========================================
  // REAL-TIME RAZORPAY CHECKOUT HANDLER
  // ==========================================
  const handleRazorpayPayment = async () => {
    if (!selectedItem) return;
    setRazorpayLoading(true);
    setError(null);

    try {
      // 1. Create order on backend
      const res = await fetch("/api/payment/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          itemType: selectedItem.type,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to initialize Razorpay payment order.");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId || razorpayKeyId || "rzp_live_Tm5fsJVpQaPb5t",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "OfferBlast by iBrainLabs",
        description: `${selectedItem.name} (${selectedItem.type === "TOPUP" ? "Credits Pack" : "SaaS Subscription"})`,
        image: "/brand/ibrainlabs-logo.png",
        order_id: orderData.orderId,
        prefill: {
          name: payerName || session?.user?.name || "Customer",
          email: payerEmail || session?.user?.email || "",
          contact: payerMobile || session?.user?.mobile || "",
        },
        theme: {
          color: "#4338ca", // Brand Indigo/Purple
        },
        handler: async function (response: any) {
          // 3. Verify signature on backend
          try {
            const verifyRes = await fetch("/api/payment/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                itemId: selectedItem.id,
                itemType: selectedItem.type,
                payerName,
                payerMobile,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setSuccessMessage(verifyData.message || "Payment verified! Your account is now Active.");
              fireSmallConfetti();
              setTimeout(() => {
                router.replace("/?payment_success=true");
              }, 1200);
            } else {
              setError(verifyData.error || "Payment verification failed.");
            }
          } catch (verErr: any) {
            setError(verErr.message || "Failed to verify payment with server.");
          } finally {
            setRazorpayLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setRazorpayLoading(false);
          },
        },
      };

      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          setError(`Payment failed: ${resp.error?.description || "Transaction declined by bank."}`);
          setRazorpayLoading(false);
        });
        rzp.open();
      } else {
        throw new Error("Razorpay SDK is loading. Please wait 2 seconds and try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong initializing Razorpay.");
      setRazorpayLoading(false);
    }
  };

  // Manual UPI Submission (Fallback)
  const handleManualUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUtr = utrNumber.replace(/[^a-zA-Z0-9]/g, "").trim();
    if (cleanUtr.length < 8) {
      setError("Please enter a valid UPI reference / UTR number (at least 8 characters).");
      return;
    }

    if (!screenshot) {
      setError("Please attach a screenshot of your successful UPI payment.");
      return;
    }

    setSubmittingManual(true);

    try {
      const formData = new FormData();
      formData.append("plan", selectedItem.name);
      formData.append("amount", String(selectedItem.price));
      formData.append("payerName", payerName.trim() || session?.user?.name || "");
      formData.append("businessName", businessName.trim() || session?.user?.businessName || "");
      formData.append("payerEmail", payerEmail.trim() || session?.user?.email || "");
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
        setError(data.error || "Failed to submit payment verification.");
        setSubmittingManual(false);
        return;
      }

      fireSmallConfetti();
      router.push("/payment-pending");
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setSubmittingManual(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-3 sm:px-6 space-y-8">
      {/* Brand Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-3">
          <Image
            src="/brand/ibrainlabs-logo.png"
            alt="iBrainLabs"
            width={180}
            height={50}
            className="h-9 w-auto object-contain mx-auto"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
          Complete Your OfferBlast Subscription
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
          Official Meta WhatsApp Cloud API bulk messaging platform. Choose your package and activate instantly.
        </p>
      </div>

      {session?.user?.role === "ADMIN" && (
        <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <div>
              <p className="font-heading font-bold text-sm">Super Admin Notice</p>
              <p className="text-xs text-amber-800">You are logged in as Master Admin. You have unrestricted lifetime access and do not need to buy a plan. (The plans below are for client billing).</p>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs"
          >
            Go to Admin Dashboard →
          </Link>
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Package Selection Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("plan");
              const defaultPlan = plans.find((p) => p.popular) || plans[0];
              setSelectedItem({
                id: defaultPlan.id,
                name: defaultPlan.name,
                price: defaultPlan.price,
                messages: defaultPlan.messages,
                type: "PLAN",
              });
            }}
            className={`px-5 py-2.5 rounded-xl font-heading text-xs font-bold transition-all cursor-pointer ${
              activeTab === "plan"
                ? "bg-white text-brand-purple shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📅 Monthly Subscription Plans
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("topup");
              const defaultTopup = topUpPacks[0];
              setSelectedItem({
                id: defaultTopup.id,
                name: defaultTopup.name,
                price: defaultTopup.price,
                credits: defaultTopup.credits,
                type: "TOPUP",
              });
            }}
            className={`px-5 py-2.5 rounded-xl font-heading text-xs font-bold transition-all cursor-pointer ${
              activeTab === "topup"
                ? "bg-white text-brand-purple shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚡ Credit Top-Up Packs (Add-on)
          </button>
        </div>
      </div>

      {/* STEP 1: CHOOSE PLAN OR TOP-UP */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-heading font-bold text-sm">
            1
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900">
              {activeTab === "plan" ? "Select Your Monthly Plan" : "Select Your Message Credit Pack"}
            </h2>
            <p className="text-xs text-slate-500">
              {activeTab === "plan"
                ? "Full features included in every plan. Choose based on your monthly message volume."
                : "Packs start from 1,000 credits. Never expire and top up your message wallet instantly."}
            </p>
          </div>
        </div>

        {activeTab === "plan" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => {
              const isSelected = selectedItem.id === p.id && selectedItem.type === "PLAN";
              return (
                <div
                  key={p.id}
                  onClick={() =>
                    setSelectedItem({
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      messages: p.messages,
                      type: "PLAN",
                    })
                  }
                  className={`relative rounded-2xl p-6 cursor-pointer transition-all border-2 flex flex-col justify-between ${
                    isSelected
                      ? "border-brand-purple bg-purple-50/50 shadow-md scale-[1.01]"
                      : "border-slate-200 bg-white hover:border-brand-purple/40 hover:bg-slate-50/50"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 right-6 bg-brand-purple text-white text-[10px] font-heading font-bold px-3 py-1 rounded-full shadow-xs">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-heading font-bold text-slate-900">{p.name}</h3>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-brand-purple bg-brand-purple" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 min-h-[32px] mb-4">{p.description}</p>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-heading font-extrabold text-brand-purple">
                        ₹{p.price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/{p.period}</span>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-700 pt-4 border-t border-slate-100">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      className={`w-full py-2.5 rounded-xl font-heading font-semibold text-xs transition-colors ${
                        isSelected
                          ? "bg-brand-purple text-white shadow-xs"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected ? "Selected Plan ✓" : "Choose " + p.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topUpPacks.map((pack) => {
              const isSelected = selectedItem.id === pack.id && selectedItem.type === "TOPUP";
              return (
                <div
                  key={pack.id}
                  onClick={() =>
                    setSelectedItem({
                      id: pack.id,
                      name: pack.name,
                      price: pack.price,
                      credits: pack.credits,
                      type: "TOPUP",
                    })
                  }
                  className={`relative rounded-2xl p-5 cursor-pointer transition-all border-2 flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/50 shadow-md scale-[1.01]"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/50"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      Best Value
                    </span>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Credit Pack
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>

                    <div className="text-xl font-heading font-black text-slate-900 mt-2">
                      +{pack.credits.toLocaleString("en-IN")} Credits
                    </div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      ₹{pack.price.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-medium">
                      Rate: {pack.perMessageRate} / message
                    </div>

                    <ul className="space-y-1.5 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Instant Wallet Top-up</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Full AI & Analytics Access</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>No Expiry Date</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {isSelected ? "Selected ✓" : "Select Pack"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Meta Official Cloud API Notice Card */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-brand-purple shrink-0" />
            <span>{metaNote}</span>
          </div>
          <a
            href="https://business.facebook.com/billing_hub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-brand-purple font-bold hover:underline shrink-0"
          >
            <span>Manage Meta Card &amp; Billing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* STEP 2: PAYMENT METHOD (RAZORPAY INSTANT + MANUAL UPI) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-heading font-bold text-sm shrink-0">
            2
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900">
              Step 2: Choose Payment Method
            </h2>
            <p className="text-xs text-slate-500">
              Pay ₹{selectedItem.price.toLocaleString("en-IN")} securely for {selectedItem.name}.
            </p>
          </div>
        </div>

        {/* ⭐ PRIMARY RECOMMENDED: RAZORPAY INSTANT AUTO-ACTIVATION */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl relative overflow-hidden border border-indigo-800/50">
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-purple/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/30">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Recommended • 1-Second Instant Activation
              </div>
              <h3 className="text-2xl font-extrabold font-heading text-white tracking-tight">
                Pay with Razorpay Gateway
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Supports Google Pay, PhonePe, Paytm, CRED, All UPI Apps, Debit/Credit Cards (Visa, Mastercard, RuPay) &amp; NetBanking. No waiting for manual approval!
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:items-end gap-2">
              <div className="text-2xl sm:text-3xl font-black text-white">
                ₹{selectedItem.price.toLocaleString("en-IN")}
              </div>
              <button
                type="button"
                onClick={handleRazorpayPayment}
                disabled={razorpayLoading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {razorpayLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Opening Gateway...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-950" />
                    <span>Pay ₹{selectedItem.price.toLocaleString("en-IN")} with Razorpay Now</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ALTERNATIVE: MANUAL DIRECT UPI TRANSFER */}
        <details className="pt-2 group">
          <summary className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-2 list-none select-none">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Or pay via Direct UPI QR &amp; manual UTR verification</span>
            <span className="text-[10px] text-slate-400 ml-1 group-open:rotate-180 transition-transform">▼</span>
          </summary>

          <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex flex-col items-center text-center">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-[220px]">
                  {qrCodeUrl ? (
                    <Image
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      width={200}
                      height={200}
                      className="rounded-xl mx-auto"
                      priority
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1.5">
                    Scan with PhonePe, GPay, Paytm
                  </span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">UPI ID</span>
                    <div className="text-xs font-bold text-slate-800">{upiId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(upiId, "upiId")}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    {copiedField === "upiId" ? "Copied!" : "Copy"}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Phone Number</span>
                    <div className="text-xs font-bold text-slate-800">{paymentPhone} ({payeeName})</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentPhone, "phone")}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    {copiedField === "phone" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleManualUpiSubmit} className="space-y-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    12-Digit UTR Number *
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 509812345678"
                    maxLength={20}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Payment Screenshot *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-purple file:text-white cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingManual}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
              >
                {submittingManual ? "Submitting..." : "Submit Manual UTR Verification"}
              </button>
            </form>
          </div>
        </details>
      </section>
    </div>
  );
}

export default function CompletePaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
        </div>
      }
    >
      <CompletePaymentContent />
    </Suspense>
  );
}
