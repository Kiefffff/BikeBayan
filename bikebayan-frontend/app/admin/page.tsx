// app/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStations, getReports, updateReport, deleteReport, getActiveRentals, getFlaggedUsers, clearFlaggedUser } from "@/lib/api";
import {
  Bike, AlertTriangle, Users, MapPin, RefreshCw, LogOut,
  Flag, CheckCircle, Clock, ChevronDown, ChevronUp,
  Pencil, Trash2, X, Save, Activity, UserCheck
} from "lucide-react";
import Link from "next/link";

const ADMIN_EMAIL = "admin@bikebayan.ph";

const formatPHTime = (dateStr: string, options: Intl.DateTimeFormatOptions) =>
  new Date(dateStr).toLocaleString("en-PH", { timeZone: "Asia/Manila", ...options });

type Report = {
  id: number;
  rental_id: number;
  email: string;
  body: string;
  resolved: boolean;
  created_at: string;
};

type EditState = {
  body: string;
  resolved: boolean;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeRentals, setActiveRentals] = useState<any[]>([]);
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([]);
  
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingActiveRentals, setLoadingActiveRentals] = useState(true);
  const [loadingFlaggedUsers, setLoadingFlaggedUsers] = useState(true);
  
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  const [editingReport, setEditingReport] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ body: "", resolved: false });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const [clearingUin, setClearingUin] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) { router.push("/admin/login"); return; }
    try {
      const userData = JSON.parse(storedUser);
      if (userData.email !== ADMIN_EMAIL) { router.push("/"); return; }
      setUser(userData);
      fetchAllData();
    } catch {
      localStorage.removeItem("user");
      router.push("/admin/login");
    }
  }, [router]);

  const fetchAllData = () => {
    fetchStations();
    fetchReports();
    fetchActiveRentals();
    fetchFlaggedUsersList();
  };

  const fetchStations = async () => {
    setLoadingStations(true);
    try {
      const data = await getStations();
      setStations(data.stations || []);
    } catch (err) {
      console.error("Failed to fetch stations:", err);
    } finally {
      setLoadingStations(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const data = await getReports();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchActiveRentals = async () => {
    setLoadingActiveRentals(true);
    try {
      const data = await getActiveRentals();
      setActiveRentals(data.active_rentals || []);
    } catch (err) {
      console.error("Failed to fetch active rentals:", err);
    } finally {
      setLoadingActiveRentals(false);
    }
  };

  const fetchFlaggedUsersList = async () => {
    setLoadingFlaggedUsers(true);
    try {
      const data = await getFlaggedUsers();
      setFlaggedUsers(data.flagged_users || []);
    } catch (err) {
      console.error("Failed to fetch flagged users:", err);
    } finally {
      setLoadingFlaggedUsers(false);
    }
  };

  const handleClearUser = async (uin: number) => {
    if (!confirm(`Are you sure you want to clear User ${uin}? This will allow them to borrow bikes again.`)) return;
    setClearingUin(uin);
    try {
      await clearFlaggedUser(uin);
      // Remove them from the list instantly
      setFlaggedUsers(prev => prev.filter(u => u.uin !== uin));
    } catch (err) {
      alert("Failed to clear user. Please try again.");
      console.error(err);
    } finally {
      setClearingUin(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/admin/login");
  };

  const startEdit = (report: Report) => {
    setEditingReport(report.id);
    setEditState({ body: report.body, resolved: report.resolved ?? false });
    setExpandedReport(report.id);
    setSaveError("");
  };

  const cancelEdit = () => {
    setEditingReport(null);
    setSaveError("");
  };

  const handleSave = async (report: Report) => {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await updateReport(report.id, {
        rental_id: report.rental_id,
        email: report.email,
        body: editState.body,
        resolved: editState.resolved,
      });
      setReports(prev =>
        prev.map(r => r.id === report.id ? { ...r, ...updated.report } : r)
      );
      setEditingReport(null);
    } catch (err: any) {
      // The detail field might be an object (e.g. Pydantic validation error array)
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setSaveError(detail);
      } else if (Array.isArray(detail)) {
        setSaveError(detail.map((d: any) => d.msg).join(", "));
      } else {
        setSaveError("Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reportId: number) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(reportId);
    try {
      await deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (expandedReport === reportId) setExpandedReport(null);
    } catch (err) {
      console.error("Failed to delete report:", err);
    } finally {
      setDeleting(null);
    }
  };

  const pendingCount = reports.filter(r => !r.resolved).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-black">Checking admin access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-black hover:text-blue-600">← Back to Home</Link>
            <h1 className="text-xl font-bold text-black">🔧 Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAllData}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 ${(loadingStations || loadingReports || loadingActiveRentals || loadingFlaggedUsers) ? "animate-spin" : ""}`} />
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
        {/* Admin Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-purple-800">
            👋 Welcome, Admin • Signed in as <strong className="text-black">{user.email}</strong>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <Bike className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-black">{stations.reduce((acc, s) => acc + (s.available_slots || 0), 0)}</p>
                <p className="text-xs text-black">Docked Bikes</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-black">{activeRentals.length}</p>
                <p className="text-xs text-black">In Use</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-black">{loadingFlaggedUsers ? "—" : flaggedUsers.length}</p>
                <p className="text-xs text-black">Flagged Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-black">{loadingReports ? "—" : pendingCount}</p>
                <p className="text-xs text-black">Pending Reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Station Status & Docked Bikes */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2 text-black">
              <MapPin className="w-5 h-5 text-blue-600" />
              Station Status
            </h2>
          </div>
          <div className="p-6">
            {loadingStations ? (
              <p className="text-black">Loading stations...</p>
            ) : stations.length === 0 ? (
              <p className="text-black">No stations found.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {stations.map(station => (
                  <div key={station.id} className="p-5 rounded-xl border bg-gray-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-black">{station.name}</h3>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        (station.available_slots || 0) > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {station.available_slots || 0} / {station.total_capacity || 0} slots full
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-black mb-2 font-medium uppercase tracking-wider">Currently Docked Bikes:</p>
                      <div className="flex flex-wrap gap-2">
                        {station.docked_bikes && station.docked_bikes.length > 0 ? (
                          station.docked_bikes.map((bikeId: number) => (
                            <span key={bikeId} className="px-2 py-1 bg-white shadow-sm text-black text-xs rounded-md border flex items-center gap-1.5">
                              <Bike className="w-3 h-3 text-blue-500"/>
                              Bike #{bikeId}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-black italic">Station is currently empty.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Bikes Currently In Use */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2 text-black">
              <Activity className="w-5 h-5 text-purple-600" />
              Bikes Currently In Use
            </h2>
          </div>
          <div className="p-6">
            {loadingActiveRentals ? (
              <p className="text-black">Loading active rentals...</p>
            ) : activeRentals.length === 0 ? (
              <div className="text-center py-6">
                <Bike className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-black font-medium">No bikes are currently being ridden.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRentals.map(rental => (
                  <div key={rental.id} className="p-4 rounded-xl border border-purple-100 bg-purple-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-purple-900 flex items-center gap-2 text-black">
                        <Bike className="w-4 h-4" />
                        Bike #{rental.bike_id}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                        On the road
                      </span>
                    </div>
                    
                    <div className="bg-white p-3 rounded-lg border border-purple-100">
                      <p className="text-sm text-black mb-1">
                        <span className="font-medium text-black">Rider UIN:</span> {rental.user_uin}
                      </p>
                      <p className="text-xs text-black">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Started: {formatPHTime(rental.start_time, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. NEW: Flagged Users */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2 text-black">
              <Users className="w-5 h-5 text-yellow-600" />
              Flagged Users (Late Returns)
            </h2>
          </div>
          <div className="p-6">
            {loadingFlaggedUsers ? (
              <p className="text-black">Loading flagged users...</p>
            ) : flaggedUsers.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-black font-medium">All good! No flagged users right now.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flaggedUsers.map(flaggedUser => (
                  <div key={flaggedUser.uin} className="p-4 rounded-xl border border-yellow-200 bg-yellow-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-yellow-900 flex items-center gap-2 text-black">
                          <Users className="w-4 h-4" />
                          UIN: {flaggedUser.uin}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                          Flagged
                        </span>
                      </div>
                      <p className="text-sm text-black mb-4">
                        This user exceeded the 3-hour limit and is currently locked out of the system.
                      </p>
                    </div>
                    <button
                      onClick={() => handleClearUser(flaggedUser.uin)}
                      disabled={clearingUin === flaggedUser.uin}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      {clearingUin === flaggedUser.uin ? "Clearing..." : "Clear User"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Reports Section */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 text-black">
              <Flag className="w-5 h-5 text-red-500" />
              Reports
              {!loadingReports && (
                <span className="ml-2 text-sm font-normal text-black">
                  {pendingCount} open · {reports.length - pendingCount} resolved
                </span>
              )}
            </h2>
          </div>

          <div className="divide-y">
            {loadingReports ? (
              <p className="p-6 text-black">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="p-6 text-black">No reports yet.</p>
            ) : (
              reports.map(report => {
                const isExpanded = expandedReport === report.id;
                const isEditing = editingReport === report.id;

                return (
                  <div key={report.id} className="p-4 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                        className="flex items-start gap-3 text-left flex-1 min-w-0"
                      >
                        <span className="mt-0.5 shrink-0">
                          {report.resolved
                            ? <CheckCircle className="w-5 h-5 text-green-500" />
                            : <Clock className="w-5 h-5 text-yellow-500" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              report.resolved
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {report.resolved ? "Resolved" : "Open"}
                            </span>
                            <span className="text-xs text-black">
                              Rental #{report.rental_id}
                            </span>
                          </div>
                          <p className="text-sm text-black truncate mt-0.5">{report.body}</p>
                        </div>
                        <span className="shrink-0 text-black mt-0.5">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(report)}
                            className="p-1.5 text-black hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deleting === report.id}
                          className="p-1.5 text-black hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 ml-8 space-y-3">
                        {report.created_at && (
                          <p className="text-xs text-black">
                            Submitted {formatPHTime(report.created_at, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}

                        {isEditing ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-black mb-1">Description</label>
                              <textarea
                                value={editState.body}
                                onChange={e => setEditState(s => ({ ...s, body: e.target.value }))}
                                rows={4}
                                className="w-full px-3 py-2 border rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`resolved-${report.id}`}
                                checked={editState.resolved}
                                onChange={e => setEditState(s => ({ ...s, resolved: e.target.checked }))}
                                className="w-4 h-4 accent-green-600"
                              />
                              <label htmlFor={`resolved-${report.id}`} className="text-sm text-black">
                                Mark as resolved
                              </label>
                            </div>

                            {saveError && (
                              <p className="text-xs text-red-600">{saveError}</p>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSave(report)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {saving ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-black text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-black bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">
                            {report.body}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}