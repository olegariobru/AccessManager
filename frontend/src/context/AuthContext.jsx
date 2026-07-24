import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("accessmanager:user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  function login(userData, token) {
    localStorage.setItem("accessmanager:user", JSON.stringify(userData));
    localStorage.setItem("accessmanager:token", token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("accessmanager:user");
    localStorage.removeItem("accessmanager:token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}