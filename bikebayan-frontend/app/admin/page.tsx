"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStations } from "@/lib/api";
import { Bike, AlertTriangle, Users, MapPin, RefreshCw, Flag, Lock, LogOut } from "lucide-react";
import Link from "next/link";

const ADMIN_EMAIL = "admin@bikebayan.ph";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([
    { id: 1, bike_id: 101, issue: "Broken brake", reported_by: "user_123", status: "pending" },
  ]);

  // Check if admin on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const userData = JSON.parse(storedUser);
    if (userData.email !== ADMIN_EMAIL) {
      router.push("/");
      return;
    }

    setUser(userData);
    fetchStations();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const fetchStations = async () => {
    setLoading(true);
    try {
      const data = await getStations();
      setStations(data.stations || []);
    } catch {
      console.error("Failed to fetch stations");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-blue-600">
              ← Back to Home
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
        {/* Stats Overview */}
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
              <p className="text-gray-500">Loading stations...</p>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      report.status === "pending" ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {report.status}
                    </span>
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