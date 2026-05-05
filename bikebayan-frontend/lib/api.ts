// lib/api.ts
import axios from 'axios';

const API_BASE = "http://54.255.202.140:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// 🔐 Auth
export const generateOTP = async (uin: string) => {
  const res = await api.post("/api/auth/generate-otp", { uin, channel: "email" });
  return res.data;
};

// MOSIP OTP Verification (Email + OTP)
export const verifyOTP = async (email: string, otp: string) => {
  const res = await api.post("/api/auth/verify-otp", { email, otp });
  return res.data; // { success: true, uin: "...", ... }
};

// 👤 User Status
export const getUserStatus = async (uin: number) => {
  const res = await api.get(`/api/users/${uin}/status`);
  return res.data;
};

// 🏢 Stations & Bikes
export const getStations = async () => {
  const res = await api.get("/api/stations");
  return res.data;
};

export const getStationBikes = async (stationId: number) => {
  const res = await api.get(`/api/stations/${stationId}/bikes`);
  return res.data;
};

// 🚲 Rentals
export const borrowBike = async (userUin: number, bikeId: number, startStationId: number) => {
  const res = await api.post("/api/rentals/borrow", {
    user_uin: userUin,
    bike_id: bikeId,
    start_station_id: startStationId
  });
  return res.data;
};

export const returnBike = async (userUin: number, bikeId: number, endStationId: number) => {
  const res = await api.post("/api/rentals/return", {
    user_uin: userUin,
    bike_id: bikeId,
    end_station_id: endStationId
  });
  return res.data;
};