// app/borrow/page.tsx
"use client";
import { useState } from "react";
import { verifyOTP, getUserStatus } from "@/lib/api";
import { Mail, Lock, CheckCircle, AlertCircle, Bike } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BorrowPage() {
  const [step, setStep] = useState<"verify" | "success">("verify");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [uin, setUin] = useState<string>(""); // Store UIN after verification
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.replace(/\D/g, "");
    
    if (!cleanEmail.includes("@") || cleanOtp.length !== 6) {
      setError("Enter a valid email and 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify OTP - backend returns UIN on success
      const result = await verifyOTP(cleanEmail, cleanOtp);
      
      // Store UIN for redirect (backend should return it, or we fetch it)
      // For now, we'll fetch it separately if needed
      if (result.uin) {
        setUin(result.uin.toString());
      }
      
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("verify");
    setEmail("");
    setOtp("");
    setUin("");
    setError("");
  };

  const isEmailValid = email.trim().includes("@");
  const isOtpValid = otp.replace(/\D/g, "").length === 6;
  const canSubmit = isEmailValid && isOtpValid && !loading;

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center text-gray-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-center mb-2">🚲 Borrow a Bike</h1>
        <p className="text-gray-600 text-center mb-8">National ID Verified • Metro Manila</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        )}

        {step === "verify" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-blue-600" />
              Verify Your Identity
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              After scanning your National ID at the station, enter the email and OTP you received.
            </p>

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="your@email.com"
                disabled={loading}
              />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-3 border rounded-xl text-center text-2xl tracking-widest font-mono"
                placeholder="••••••"
                maxLength={6}
                disabled={loading}
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={!canSubmit}
              className={`w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center ${
                canSubmit 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? "Verifying..." : "Verify & Proceed"}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Didn't receive an OTP? Scan your National ID at the station first.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Verification Complete!</h2>
            <p className="text-gray-600 mb-4">
              Your identity is confirmed. Select a bike to continue.
            </p>
            
            {/* Redirect to bike selection with params */}
            <Link 
              href={`/borrow/select-bike?station=1${uin ? `&uin=${uin}` : ''}`} 
              className="block w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Bike className="w-5 h-5" />
              Select a Bike
            </Link>
            
            <button
              onClick={handleReset}
              className="w-full mt-3 text-gray-600 py-2 text-sm hover:text-gray-800"
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}