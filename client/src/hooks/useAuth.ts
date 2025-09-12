import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthData {
  user: User;
  token: string;
}

export function useAuth() {
  const [authData, setAuthData] = useState<AuthData | null>(() => {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setAuthData(data);
    localStorage.setItem('auth', JSON.stringify(data));
  };

  const logout = () => {
    setAuthData(null);
    localStorage.removeItem('auth');
  };

  return {
    user: authData?.user,
    token: authData?.token,
    isAuthenticated: !!authData,
    login,
    logout,
  };
}
