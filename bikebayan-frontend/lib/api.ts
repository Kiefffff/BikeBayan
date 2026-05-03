// lib/api.ts
import axios from 'axios';

const API_BASE = "http://54.255.202.140:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});


// 🔐 AUTHENTICATION (MOSIP OTP)
export const generateOTP = async (uin: string) => {
  const res = await api.post("/api/auth/generate-otp", { uin, channel: "email" });
  return res.data; // { success: true, transaction_id: "..." }
};

export const verifyOTP = async (email: string, otp: string) => {
  const res = await api.post("/api/auth/verify-otp", { email, otp });
  return res.data; // { success: true, auth_token: "..." }
};

// 🚲 ESP LOCK FUNCTIONS

// 1. stationUpdate() - ESP sends slot RFID data
export const stationUpdate = async (station_ID: number, slots: Record<string, string | null>) => {
  const res = await api.post("/api/bikes/station-update", { station_ID, slots });
  return res.data; // Plain text: "1" = success, "-1" = error
};

// 2. userStatusCheck() - Check user status
export const userStatusCheck = async (uin: number) => {
  const res = await api.post("/api/bikes/user-status", { uin });
  return res.data; // Plain text: "Borrowing" | "Cleared" | "Flagged" | "-1"
};

// 3. setUserBorrowing() - Mark user as borrowing
export const setUserBorrowing = async (uin: number, bike_id: number, station_ID: number) => {
  const res = await api.post("/api/bikes/set-borrowing", { 
    uin, 
    bike_id, 
    station_ID 
  });
  return res.data; // Plain text: "1" = success, "-1" = error
};

// 4. userBikeCheck() - Get bike RFID associated with user
export const userBikeCheck = async (uin: number, rfid: string) => {
  const res = await api.post("/api/bikes/user-bike-check", { uin, rfid });
  return res.data; // Plain text: bike_id or "-1"
};

// 5. setUserReturned() - Mark user as returned/cleared
export const setUserReturned = async (uin: number, station_ID: number) => {
  const res = await api.post("/api/bikes/set-returned", { uin, station_ID });
  return res.data; // Plain text: "1" = success, "-1" = error
};

// 🏢 STATIONS & BIKES 

export const getStations = async () => {
  const res = await api.get("/api/stations");
  return res.data; // { stations: [...] }
};

export const getStationBikes = async (station_id: number) => {
  const res = await api.get(`/api/stations/${station_id}/bikes`);
  return res.data; // { bikes: [...] }
};


// 🚲 RENTALS (
export const borrowBike = async (user_uin: number, bike_id: number, slot_id: number, start_station_id: number) => {
  const res = await api.post("/api/rentals/borrow", {
    user_uin,
    bike_id,
    slot_id,
    start_station_id
  });
  return res.data; // { message: "Borrow successful", rental: {...} }
};

export const returnBike = async (user_uin: number, bike_id: number, slot_id: number, end_station_id: number) => {
  const res = await api.post("/api/rentals/return", {
    user_uin,
    bike_id,
    slot_id,
    end_station_id
  });
  return res.data; // { message: "Return successful", new_slot: ... }
};

export const getUserStatus = async (uin: number) => {
  const res = await api.get(`/api/users/${uin}/status`);
  return res.data; // { status: "Borrowing" | "Cleared" | "Flagged" }
};