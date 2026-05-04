// app/setup/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function SetupPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"token" | "password" | "success">("token");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerifyToken = async () => {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("http://54.255.202.140:8000/api/verify/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "temp" }) // Just validate token
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Invalid token");
      }
      
      setStep("password");
    } catch (err: any) {
      setError(err.message || "Invalid or expired token");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("http://54.255.202.140:8000/api/verify/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to set password");
      }
      
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">Setup Your Account</h1>
        <p className="text-gray-600 text-center mb-6">
          {step === "token" && "Enter the code from the station"}
          {step === "password" && "Create your password"}
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {step === "token" && (
          <>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl mb-4 text-center text-lg tracking-wider"
              placeholder="Enter code (e.g., abc123)"
              maxLength={8}
            />
            <button
              onClick={handleVerifyToken}
              disabled={loading || token.length < 6}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:bg-gray-300"
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </>
        )}

        {step === "password" && (
          <>
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="New password"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="Confirm password"
              />
            </div>
            <button
              onClick={handleSetPassword}
              disabled={loading}
              className="w-full mt-6 bg-green-600 text-white py-3 rounded-xl font-bold disabled:bg-gray-300"
            >
              {loading ? "Setting password..." : "Set Password"}
            </button>
          </>
        )}

        {step === "success" && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Account Ready!</h2>
            <p className="text-gray-600 mb-6">
              You can now login with your email and password.
            </p>
            <Link 
              href="/login"
              className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}