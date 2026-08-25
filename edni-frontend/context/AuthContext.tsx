"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
  degree: string;
  yearOfStudy: string;
  gpa: number;
  semester: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  loginAsGuest: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const login = useCallback((userData: User) => {
    setUser(userData);
    setIsGuest(false);
    localStorage.setItem("edni_user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem("edni_user");
    localStorage.removeItem("edni_access");
    localStorage.removeItem("edni_refresh");
  }, []);

  const loginAsGuest = useCallback(() => {
    const guestUser: User = {
      id: "guest_" + Date.now(),
      firstName: "Guest",
      lastName: "User",
      email: "guest@demo.edni",
      institution: "Demo University",
      degree: "Demo",
      yearOfStudy: "Year 1",
      gpa: 3.5,
      semester: "Fall",
    };
    setUser(guestUser);
    setIsGuest(true);
    localStorage.setItem("edni_user", JSON.stringify(guestUser));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      loginAsGuest,
      isGuest,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}