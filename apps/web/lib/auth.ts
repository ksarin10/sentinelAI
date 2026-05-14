"use client";

import { apiRequest } from "./api";
import type { AuthResponse } from "./types";

const tokenKey = "sentinelai.accessToken";
const userKey = "sentinelai.userEmail";
const projectKey = "sentinelai.projectId";

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(tokenKey);
}

export function saveSession(auth: AuthResponse) {
  window.localStorage.setItem(tokenKey, auth.accessToken);
  window.localStorage.setItem(userKey, auth.user.email);
}

export function clearSession() {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(userKey);
  window.localStorage.removeItem(projectKey);
}

export function getUserEmail() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(userKey);
}

export function getSelectedProjectId() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(projectKey);
}

export function saveSelectedProjectId(projectId: string) {
  window.localStorage.setItem(projectKey, projectId);
}

export async function login(email: string, password: string) {
  const auth = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password }
  });
  saveSession(auth);
  return auth;
}

export async function register(email: string, password: string, name?: string) {
  const auth = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email, password, name: name || undefined }
  });
  saveSession(auth);
  return auth;
}
