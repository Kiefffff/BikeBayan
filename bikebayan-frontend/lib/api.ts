// lib/api.ts
import axios from 'axios';

const API_BASE = "http://54.255.202.140:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// 🔐 Auth (already working)
export const generateOTP = async (uin: string) => {
  const res = await api.post("/api/auth/generate-otp", { uin, channel: "email" });
  return res.data;
};

export const verifyOTP = async (uin: string, otp: string, transactionId: string) => {
  const res = await api.post("/api/auth/verify-otp", { uin, otp, transaction_id: transactionId });
  return res.data;
};

//  Stations & Bikes
export const getStations = async () => {
  const res = await api.get("/api/stations");
  return res.data; // [{ id, name, total_capacity, available_slots }, ...]
};

export const getStationBikes = async (stationId: number) => {
  const res = await api.get(`/api/stations/${stationId}/bikes`);
  return res.data; // [{ id, status, current_slot_id }, ...]
};

// 🚲 Rentals
export const borrowBike = async (userUin: number, bikeId: number, startStationId: number) => {
  const res = await api.post("/api/rentals/borrow", {
    user_uin: userUin,
    bike_id: bikeId,
    start_station_id: startStationId
  });
  return res.data; // { success: true, rental_id: number, end_time: string }
};

export const returnBike = async (userUin: number, bikeId: number, endStationId: number) => {
  const res = await api.post("/api/rentals/return", {
    user_uin: userUin,
    bike_id: bikeId,
    end_station_id: endStationId
  });
  return res.data; // { success: true, is_overdue: boolean, penalty_fee: number }
};

//  User Status
export const getUserStatus = async (uin: number) => {
  const res = await api.get(`/api/users/${uin}/status`);
  return res.data; // { uin, status: "CLEAR"|"BORROWING"|"LIABLE", active_rental?: {...} }
};