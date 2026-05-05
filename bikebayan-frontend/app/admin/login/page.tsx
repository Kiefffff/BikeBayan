"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock } from "lucide-react";
import Link from "next/link";

const ADMIN_EMAIL = "admin@bikebayan.ph";
const ADMIN_PASSWORD = "RafaBike67";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail !== ADMIN_EMAIL) {
      setError("Admin access only. Use admin@bikebayan.ph");
      return;
    }
    
    if (password !== ADMIN_PASSWORD) {
      setError("Invalid password");
      setPassword("");
      return;
    }

    setLoading(true);
    setError("");

    // Simulate a small delay for better UX
    setTimeout(() => {
      // Store admin session
      localStorage.setItem("user", JSON.stringify({
        email: ADMIN_EMAIL,
        isAdmin: true,
        logged_in_at: new Date().toISOString()
      }));
      
      // Redirect to admin dashboard
      router.push("/admin");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center text-gray-600 mb-6">
          ← Back to Home
        </Link>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-center">
          <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-purple-900">Admin Access</h1>
          <p className="text-sm text-purple-700">BikeBayan Management Dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-purple-600" />
            Admin Login
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Enter admin credentials to access the dashboard.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border rounded-xl bg-gray-50"
                  placeholder="admin@bikebayan.ph"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full mt-6 py-3 rounded-xl font-bold ${
                loading || !email || !password
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {loading ? "Logging in..." : "Access Admin Dashboard"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/borrow" className="text-sm text-gray-600 hover:text-gray-800">
              Not admin? Borrow a bike →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}