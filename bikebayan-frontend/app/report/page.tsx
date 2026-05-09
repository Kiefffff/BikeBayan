"use client";
import { useState } from "react";
import { submitReport } from "@/lib/api";
import { Mail, FileText, Send, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function ReportPage() {
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "duplicate" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    email.includes("@") && body.trim().length >= 10 && !loading;

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setErrorMsg("");

    try {
      await submitReport(email.trim().toLowerCase(), body.trim());
      setResult("success");
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 409) {
        setResult("duplicate");
      } else if (status === 404) {
        setResult("error");
        setErrorMsg(detail || "User or rental not found.");
      } else {
        setResult("error");
        setErrorMsg(detail || "Could not submit report. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setErrorMsg("");
    setBody("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center text-gray-600 mb-6">
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-center mb-2">🚲 Report an Issue</h1>
        <p className="text-gray-600 text-center mb-8">
          Let us know about a problem with your rental
        </p>

        {/* Success */}
        {result === "success" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Report Submitted</h2>
            <p className="text-gray-600 mb-6">
              We've received your report and will look into it shortly.
            </p>
            <button
              onClick={handleReset}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
            >
              Submit Another Report
            </button>
          </div>
        )}

        {/* Duplicate */}
        {result === "duplicate" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Report Already Exists</h2>
            <p className="text-gray-600 mb-6">
              There's already an open report for your current rental. We'll resolve
              it before a new one can be submitted.
            </p>
            <button
              onClick={handleReset}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Error */}
        {result === "error" && (
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Submission Failed</h2>
            <p className="text-gray-600 mb-6">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Form */}
        {result === null && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Report Details
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              We'll look up your latest rental automatically using your email.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe the issue with your bike or rental..."
                  rows={5}
                  maxLength={1000}
                  disabled={loading}
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {body.trim().length < 10
                    ? `${10 - body.trim().length} more characters needed`
                    : `${body.length}/1000`}
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                canSubmit
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
