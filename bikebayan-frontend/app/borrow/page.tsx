// app/borrow/page.tsx
"use client";
import { useState } from "react";
import { generateOTP, verifyOTP, getUserStatus } from "@/lib/api";
import { Mail, Lock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BorrowPage() {
  const [step, setStep] = useState<"id" | "otp" | "success">("id");
  const [uin, setUin] = useState("");
  const [otp, setOtp] = useState("");
  const [transactionId, setTransactionId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // STEP 1: Scan ID & Send OTP
  const handleSendOTP = async () => {
    if (!uin.trim() || uin.length < 6) {
      setError("Please enter a valid National ID number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      // Check if user is already borrowing
      const status = await getUserStatus(uin);
      
      // FIX 2: Changed to "Borrowing" to match your Supabase database exactly
      if (status.status === "Borrowing") {
        throw new Error("You already have an active rental. Please return the bike first.");
      }

      // Send OTP via EC2 backend
      const response = await generateOTP(uin);
      setTransactionId(response.transaction_id);
      setStep("otp");
      setSuccessMsg("OTP sent to your registered email!");
    } catch (err: any) {
      setError(err.message || "Failed to generate OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError("Please enter the complete 6-digit numeric OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyOTP(uin, otp, transactionId);
      setStep("success");
      setSuccessMsg("Identity verified successfully!");
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please check your email and try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("id");
    setUin("");
    setOtp("");
    setTransactionId("");
    setError("");
    setSuccessMsg("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full">

        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 font-medium transition">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚲 Borrow a Bike</h1>
          <p className="text-gray-600">National ID Verified • Metro Manila</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-sm">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded shadow-sm">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
              <p className="text-green-800 font-medium">{successMsg}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Enter National ID */}
        {step === "id" && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              Step 1: Scan National ID
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Enter your PhilSys National ID number to receive a secure OTP.
            </p>
            
            <input
              type="text"
              value={uin}
              onChange={(e) => setUin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg tracking-wider"
              placeholder="Enter National ID Number"
              disabled={loading}
            />

            <button
              onClick={handleSendOTP}
              disabled={loading || !uin.trim()}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {loading ? (
                <span className="animate-spin mr-2">⏳</span>
              ) : null}
              {loading ? "Sending OTP..." : "Send OTP to Email"}
            </button>
          </div>
        )}

        {/* STEP 2: Enter OTP */}
        {step === "otp" && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-blue-600" />
              Step 2: Verify OTP
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Enter the 6-digit code sent to your registered email address.
            </p>

            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
              className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl text-center tracking-[0.5em] font-mono"
              placeholder="••••••"
              maxLength={6}
              disabled={loading}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                {loading ? "Verifying..." : "Verify & Proceed"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OTP Verified → Ready for Bike Selection */}
        {step === "success" && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your identity has been verified via MOSIP. You may now select a bike from the available stations.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => alert("Bike selection flow coming next! (We'll build this after OTP)")}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Select a Bike
              </button>
              <button
                onClick={handleReset}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}