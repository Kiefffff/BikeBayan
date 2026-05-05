// app/borrow/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyOTP } from "@/lib/api";
import { Lock, CheckCircle, AlertCircle, Bike } from "lucide-react";
import Link from "next/link";

export default function BorrowPage() {
  const router = useRouter();
  const [step, setStep] = useState<"verify" | "success">("verify");
  const [uin, setUin] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check for existing session on load
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user.uin) {
          // Session valid - auto-skip to success
          setStep("success");
          setUin(user.uin);
        }
      } catch {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleVerify = async () => {
    const cleanUin = uin.replace(/\D/g, "");
    const cleanOtp = otp.replace(/\D/g, "");
    
    if (cleanUin.length !== 10 || cleanOtp.length !== 6) {
      setError("Enter valid 10-digit UIN and 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify using UIN + OTP (MOSIP flow)
      await verifyOTP(cleanUin, cleanOtp, "");
      
      // Store session in localStorage
      localStorage.setItem("user", JSON.stringify({ 
        uin: cleanUin,
        verified_at: new Date().toISOString()
      }));
      
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
    setUin("");
    setOtp("");
    setError("");
  };

  const isUinValid = uin.replace(/\D/g, "").length === 10;
  const isOtpValid = otp.replace(/\D/g, "").length === 6;
  const canSubmit = isUinValid && isOtpValid && !loading;

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center text-gray-600 mb-6">
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-center mb-2">🚲 Borrow a Bike</h1>
        <p className="text-gray-600 text-center mb-8">Enter your UIN and OTP</p>

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
              Verify Identity
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Enter the UIN shown on the station screen and the OTP sent to your email.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={uin}
                onChange={(e) => setUin(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="UIN (e.g., 7831465308)"
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
              className={`w-full mt-6 py-3 rounded-xl font-bold ${
                canSubmit 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? "Verifying..." : "Verify & Borrow"}
            </button>

            <button
              onClick={handleReset}
              className="w-full mt-3 text-gray-600 py-2 text-sm hover:text-gray-800"
            >
              Start Over
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Verified!</h2>
            <p className="text-gray-600 mb-4">
              Select a bike at the station to unlock.
            </p>
            
            <Link 
              href={`/borrow/select-bike?uin=${uin}`}
              className="block w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Bike className="w-5 h-5" />
              Select a Bike
            </Link>
            
            <button
              onClick={handleReset}
              className="w-full mt-3 text-gray-600 py-2 text-sm hover:text-gray-800"
            >
              Verify Another UIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}