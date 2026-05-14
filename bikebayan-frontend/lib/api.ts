// lib/api.ts
import axios from 'axios';

const API_BASE = "https://minds-consecutive-asus-lewis.trycloudflare.com";

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
  const res = await api.get(`/api/stations/${stationId}/bikes`);
  return res.data;
};

export const getReports = async () => {
  const res = await api.get("/api/reports");
  return res.data;
};

export const updateReport = async (
  reportId: number,
  payload: { rental_id: number; email: string; body: string; resolved: boolean }
) => {
  const res = await api.patch(`/api/reports/${reportId}`, payload);
  return res.data;
};
 
export const deleteReport = async (reportId: number) => {
  await api.delete(`/api/reports/${reportId}`);
};
 
export const submitReport = async (email: string, body: string) => {
  const res = await api.post("/api/reports/submit", { email, body });
  return res.data;
};

export const getActiveRentals = async () => {
  const res = await api.get("/api/rentals/active");
  return res.data; // { active_rentals: [...] }
};

export const getFlaggedUsers = async () => {
  const res = await api.get("/api/users/flagged");
  return res.data; // { flagged_users: [...] }
};

export const clearFlaggedUser = async (uin: number) => {
  const res = await api.post(`/api/users/${uin}/clear`);
  return res.data;
};