// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Shield, MapPin, Clock, Bike, Flag } from "lucide-react";
import { getStations } from "@/lib/api";

export default function Home() {
  const [hasSession, setHasSession] = useState(false);
  const [stations, setStations] = useState<any[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user.email && user.verified_at && user.email !== "admin@bikebayan.ph") {
          setHasSession(true);
        }
      } catch {
        localStorage.removeItem("user");
      }
    }

    const fetchLiveStations = async () => {
      try {
        const data = await getStations();
        setStations(data.stations || []);
      } catch (err) {
        console.error("Failed to load stations:", err);
      } finally {
        setLoadingStations(false);
      }
    };

    fetchLiveStations();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/bikebayan-logo.svg" alt="BikeBayan" width={120} height={36} />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/report"
              className="text-black hover:text-red-600 font-medium text-sm flex items-center gap-1 transition-colors"
            >
              <Flag className="w-4 h-4" />
              Report Issue
            </Link>
            {/*
            <Link
              href="/admin/login"
              className="text-black hover:text-purple-600 font-medium text-sm flex items-center gap-1 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
            */}
          </div>
        </div>
      </nav>

      <section className="py-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-3xl mx-auto">
          <Image src="/bikebayan-logo.svg" alt="BikeBayan" width={400} height={120} className="mx-auto mb-6" priority />
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Iwas Trapik, Iwas Gastos.
          </h1>
          <p className="text-lg text-black mb-10">
            National ID-verified bike sharing for Metro Manila. Secure, accessible, and accountable.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/borrow"
              className="group relative bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3"
            >
              <Bike className="w-6 h-6 group-hover:animate-bounce" />
              {hasSession ? "Continue Borrowing" : "Borrow a Bike"}
            </Link>
            <Link
              href="/report"
              className="group border-2 border-red-200 text-red-600 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-3"
            >
              <Flag className="w-6 h-6" />
              Report an Issue
            </Link>
          </div>

          <p className="text-sm text-black mt-6">
            Scan National ID at station • Enter email + OTP to unlock
          </p>
        </div>
      </section>

      <section className="py-12 px-4 bg-white border-t border-b">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2 text-black">
            <MapPin className="w-6 h-6 text-blue-600" />
            Live Station Availability
          </h2>
          
          {loadingStations ? (
            <div className="flex justify-center items-center py-8">
              <span className="animate-pulse text-black font-medium">Checking live stations...</span>
            </div>
          ) : stations.length === 0 ? (
            <p className="text-center text-black">No stations are currently online.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {stations.map(station => {
                const isAvailable = (station.available_slots || 0) > 0;
                return (
                  <div key={station.id} className="p-5 rounded-2xl border bg-gray-50 flex justify-between items-center hover:shadow-md transition border-gray-200">
                    <div>
                      <h3 className="font-bold text-black text-lg">{station.name}</h3>
                      <p className="text-sm text-black mt-0.5">Capacity: {station.total_capacity || 0} docks</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
                        isAvailable 
                          ? "bg-green-100 text-green-700 ring-1 ring-green-500/20" 
                          : "bg-red-100 text-red-700 ring-1 ring-red-500/20"
                      }`}>
                        <Bike className="w-4 h-4" />
                        {station.available_slots || 0} Left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-black">Why BikeBayan?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-black">National ID Verified</h3>
              <p className="text-black text-sm">Every rental is tied to your PhilSys ID. No anonymous borrowing.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-black">Multi-Station Network</h3>
              <p className="text-black text-sm">Borrow at Station A, return at Station B. Real-time sync.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-black">Secure & Accountable</h3>
              <p className="text-black text-sm">Smart locks, RFID validation, and automated deadline enforcement.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t text-center text-black text-sm bg-white">
        <p>© 2026 BikeBayan • Team 13 | CS145 Project | University of the Philippines</p>
      </footer>
    </div>
  );
}