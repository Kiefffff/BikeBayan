"use client"; 

import { useState, useEffect } from "react";
import { getStations } from "@/lib/api";
import { Bike, AlertTriangle, Users, MapPin, RefreshCw, Flag, Lock, LogOut } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// 🔐 Hardcoded admin password
const ADMIN_PASSWORD = "RafaButt67";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([
    { id: 1, bike_id: 101, issue: "Broken brake", reported_by: "user_123", status: "pending" },
  ]);

  // Check auth on load
  useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
      fetchStations();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("admin_authenticated", "true");
      setPasswordError("");
      fetchStations();
    } else {
      setPasswordError("Incorrect password");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_authenticated");
    setPassword("");
  };

  const fetchStations = async () => {
    setLoading(true);
    try {
      const data = await getStations();
      setStations(data.stations || []);
    } catch {
      setError("Failed to fetch stations");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = (reportId: number) => {
    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, status: "resolved" } : r
    ));
  };

  // 🔐 LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-gray-600 text-sm mt-2">Enter password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {passwordError}
              </div>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="Enter admin password"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
            >
              Login
            </button>
            <Link href="/" className="block text-center text-gray-600 hover:text-gray-800 text-sm">
              ← Back to Home
            </Link>
          </form>
        </div>
      </div>
    );
  }

  // ✅ ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-blue-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">🔧 Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchStations} 
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <Bike className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stations.reduce((acc, s) => acc + (s.total_capacity || 0), 0)}</p>
                <p className="text-xs text-gray-500">Total Bikes</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stations.length}</p>
                <p className="text-xs text-gray-500">Stations</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{flaggedUsers.length}</p>
                <p className="text-xs text-gray-500">Flagged Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === "pending").length}</p>
                <p className="text-xs text-gray-500">Pending Reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Station Status */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Station Status
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stations.map(station => (
                  <div key={station.id} className="p-4 rounded-xl border">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold">{station.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        (station.available_slots || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {(station.available_slots || 0)} available
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Capacity: {station.total_capacity}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reports */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Damage Reports
            </h2>
          </div>
          <div className="p-6">
            {reports.length === 0 ? (
              <p className="text-gray-500">No reports yet.</p>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-xl">
                    <div>
                      <p className="font-medium">Bike #{report.bike_id}</p>
                      <p className="text-sm text-gray-600">{report.issue}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        report.status === "pending" ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {report.status}
                      </span>
                      {report.status === "pending" && (
                        <button 
                          onClick={() => handleResolveReport(report.id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Flagged Users */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-600" />
              Flagged Users
            </h2>
          </div>
          <div className="p-6">
            {flaggedUsers.length === 0 ? (
              <p className="text-gray-500">No flagged users.</p>
            ) : (
              <div className="space-y-3">
                {flaggedUsers.map((user, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-red-50">
                    <p className="font-medium">UIN: {user.uin}</p>
                    <p className="text-sm text-gray-600">Flagged: {new Date(user.flagged_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}