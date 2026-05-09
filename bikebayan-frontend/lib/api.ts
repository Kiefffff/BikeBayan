// lib/api.ts
import axios from 'axios';

const API_BASE = "http://54.255.202.140:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export const generateOTP = async (uin: string) => {
  const res = await api.post("/api/auth/generate-otp", { uin, channel: "email" });
  return res.data;
};

export const verifyOTP = async (email: string, otp: string) => {
  const res = await api.post("/api/auth/verify-otp", { email, otp });
  return res.data; // { success: true, uin: "...", ... }
};

export const getStations = async () => {
  const res = await api.get("/api/stations");
  return res.data;
};

export const getStationBikes = async (stationId: number) => {
  const res = await api.get("/api/stations/${stationId}/bikes");
  return res.data;
};

export const submitReport = async (email: string, body: string) => {
  const res = await api.post("/api/reports/submit", { email, body });
  return res.data;
}