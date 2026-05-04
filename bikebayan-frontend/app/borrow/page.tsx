"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyOTP, getUserStatus, borrowBike } from "@/lib/api";
import { Mail, Lock, CheckCircle, AlertCircle, Bike, LogOut } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BorrowPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<"otp" | "success">("otp");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      // Not logged in → redirect to login
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleVerify = async () => {
    const cleanOtp = otp.replace(/\D/g, "");
    
    if (cleanOtp.length !== 6) {
      setError("Enter a valid 6-digit OTP");
      return;
    }

    if (!user?.uin) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify OTP using logged-in user's UIN
      await verifyOTP(user.uin, cleanOtp, ""); // transactionId if needed
      
      // Optional: Check user status
      const status = await getUserStatus(user.uin);
      if (status.status === "Borrowing") {
        throw new Error("You already have an active rental.");
      }
      
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const isOtpValid = otp.replace(/\D/g, "").length === 6;
  const canSubmit = isOtpValid && !loading;

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Header with logout */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center text-sm text-red-600 hover:text-red-700"
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </button>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">🚲 Borrow a Bike</h1>
        <p className="text-gray-600 text-center mb-8">
          Welcome, {user.name} • UIN: {user.uin}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        )}

        {step === "otp" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-blue-600" />
              Verify with OTP
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Enter the 6-digit OTP sent to <strong>{user.email}</strong>
            </p>

            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-4 py-3 border rounded-xl text-center text-2xl tracking-widest font-mono"
              placeholder="••••••"
              maxLength={6}
              disabled={loading}
            />

            <button
              onClick={handleVerify}
              disabled={!canSubmit}
              className={`w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center ${
                canSubmit 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? "Verifying..." : "Verify & Borrow"}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Didn't receive OTP?{" "}
              <button 
                onClick={async () => {
                  try {
                    await fetch("http://54.255.202.140:8000/api/auth/generate-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ uin: user.uin, channel: "email" })
                    });
                    alert("OTP resent!");
                  } catch {
                    alert("Failed to resend OTP");
                  }
                }}
                className="text-blue-600 hover:underline"
              >
                Resend
              </button>
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Ready to Borrow!</h2>
            <p className="text-gray-600 mb-4">
              Select a bike at the station to unlock.
            </p>
            
            <Link 
              href={`/borrow/select-bike?station=1&uin=${user.uin}`} 
              className="block w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Bike className="w-5 h-5" />
              Select a Bike
            </Link>
            
            <button
              onClick={() => {
                setStep("otp");
                setOtp("");
                setError("");
              }}
              className="w-full mt-3 text-gray-600 py-2 text-sm hover:text-gray-800"
            >
              Back to OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}