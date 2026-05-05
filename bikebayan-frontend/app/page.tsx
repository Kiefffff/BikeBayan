"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, MapPin, Clock, Bike, User, LogOut } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/bikebayan-logo.svg" alt="BikeBayan" width={120} height={36} />
          </Link>
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <span className="text-sm text-gray-600">Hi, {user.name}</span>
                {user.isAdmin && (
                  <Link href="/admin" className="text-purple-600 hover:text-purple-700 font-medium">
                    Admin
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-600 hover:text-red-600 font-medium transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium transition">
                <User className="w-4 h-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-3xl mx-auto">
          <Image src="/bikebayan-logo.svg" alt="BikeBayan" width={400} height={120} className="mx-auto mb-6" priority />
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Mahal ang Gas. Pero mas mahal kita.
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            National ID-verified bike sharing for Metro Manila. Secure, accessible, and accountable.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href={user ? "/borrow" : "/login"}
              className="group relative bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3"
            >
              <Bike className="w-6 h-6 group-hover:animate-bounce" /> 
              {user ? "Borrow a Bike" : "Login to Borrow"}
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Scan your National ID at any station to create an account
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why BikeBayan?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">National ID Verified</h3>
              <p className="text-gray-600 text-sm">Every rental is tied to your PhilSys ID. No anonymous borrowing.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Station Network</h3>
              <p className="text-gray-600 text-sm">Borrow at Station A, return at Station B. Real-time sync.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure & Accountable</h3>
              <p className="text-gray-600 text-sm">Smart locks, RFID validation, and automated deadline enforcement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t text-center text-gray-500 text-sm bg-white">
        <p>© 2026 BikeBayan • Team 13 | CS145 Project | University of the Philippines</p>
      </footer>
    </div>
  );
}