// app/page.tsx
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      
      <div className="mb-10 hover:scale-105 transition-transform duration-300">
        <Image
          src="/bikebayan-logo.svg"
          alt="BikeBayan"
          width={500}  
          height={150} 
          className="mx-auto"
          priority
        />
      </div>

      <p className="text-3xl md:text-4xl text-gray-800 mb-12 font-bold text-center tracking-tight">
        Mahal ang Gas, Bike na Lang!
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-6 w-full max-w-lg">
        <a
          href="/borrow"
          className="w-full sm:w-auto text-center bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg transition-all"
        >
          Borrow a Bike
        </a>
        <a
          href="/admin"
          className="w-full sm:w-auto text-center border-2 border-blue-600 text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all"
        >
          Admin Dashboard
        </a>
      </div>

      <p className="mt-16 text-gray-400 text-sm">
        © 2026 BikeBayan Team 13
      </p>
    </div>
  );
}