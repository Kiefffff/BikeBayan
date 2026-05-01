// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Shield, MapPin, Clock, Bike } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/bikebayan-logo.svg" alt="BikeBayan" width={120} height={36} />
          </Link>
          <div className="flex gap-6">
            <Link href="/borrow" className="text-gray-600 hover:text-blue-600 font-medium transition">Borrow</Link>
            <Link href="/admin" className="text-gray-600 hover:text-blue-600 font-medium transition">Admin</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <Image src="/bikebayan-logo.svg" alt="BikeBayan" width={400} height={120} className="mx-auto mb-6" priority />
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Mahal ang Gas. Pero mas mahal kita.
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            National ID-verified bike sharing for Metro Manila. Secure, accessible, and accountable.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/borrow" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2">
              <Bike className="w-5 h-5" /> Borrow a Bike
            </Link>
            <Link href="/admin" className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition flex items-center justify-center gap-2">
              Admin Dashboard
            </Link>
          </div>
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
              <p className="text-gray-600 text-sm leading-relaxed">
                Every rental is tied to your PhilSys ID. No anonymous borrowing, maximum accountability.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Station Network</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Borrow at Station A, return at Station B. Real-time inventory sync across the city.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure & Accountable</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Smart locks, RFID validation, and automated deadline enforcement prevent loss and misuse.
              </p>
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