"use client";
import { useState } from "react";

export default function BorrowPage() {
  const [step, setStep] = useState(1);
  const [uin, setUin] = useState("");
  const [otp, setOtp] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">🚲 Borrow a Bike</h1>
        
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium mb-2">National ID Number</label>
            <input
              type="text"
              value={uin}
              onChange={(e) => setUin(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4"
              placeholder="Enter your National ID"
            />
            <button
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold"
            >
              Scan ID & Send OTP
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="block text-sm font-medium mb-2">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4"
              placeholder="6-digit OTP"
              maxLength={6}
            />
            <div className="space-y-2">
              <button
                onClick={() => setStep(3)}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-bold"
              >
                Verify & Continue
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full bg-gray-300 py-2 rounded-lg"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <p className="text-lg mb-4">Verified! Choose a bike:</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">🚲</div>
                <div className="font-bold">Bike #1</div>
                <div className="text-sm text-green-600">Available</div>
              </button>
              <button className="p-4 border-2 border-gray-300 rounded-lg">
                <div className="text-2xl mb-2">🚲</div>
                <div className="font-bold">Bike #2</div>
                <div className="text-sm text-green-600">Available</div>
              </button>
            </div>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg font-bold">
              Unlock Bike
            </button>
          </div>
        )}
      </div>
    </div>
  );
}