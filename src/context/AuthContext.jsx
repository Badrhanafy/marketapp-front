import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  login as loginApi,
  register as registerApi,
  getUser,
  logout as logoutApi,
} from "../api/auth";

import {
  saveToken,
  getToken,
  removeToken,
} from "../storage/token";

/* import {
  connectReverb,
  disconnectReverb,
} from "../services/reverb"; */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Login
  |--------------------------------------------------------------------------
  */

  const login = async (email, password) => {
    const data = await loginApi(email, password);

    await saveToken(data.token);

    setToken(data.token);
    setUser(data.user);

    return data;
  };


  /*
  |--------------------------------------------------------------------------
  | Register
  |--------------------------------------------------------------------------
  */

  const register = async (formData) => {
    const data = await registerApi(formData);

    if (data.token) {
      await saveToken(data.token);

      setToken(data.token);
      setUser(data.user);
    }

    return data;
  };


  /*
  |--------------------------------------------------------------------------
  | Update User
  |--------------------------------------------------------------------------
  */

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };


  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const logout = async () => {
    try {
      if (token) {
        await logoutApi(token);
      }
    } finally {
      await removeToken();

      setToken(null);
      setUser(null);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | Restore Session
  |--------------------------------------------------------------------------
  */

  const restoreSession = async () => {
/*     const storedToken = await getToken();

console.log("🔐 AUTH TOKEN:", storedToken); */
    try {
      const storedToken = await getToken();

      if (!storedToken) {
        setLoading(false);
        return;
      }

      const data = await getUser(storedToken);

      setToken(storedToken);
      setUser(data.user);

    } catch (error) {

      console.log(
        "RESTORE SESSION ERROR:",
        error.response?.data ||
          error.message
      );

      await removeToken();

      setToken(null);
      setUser(null);

    } finally {
      setLoading(false);
    }
  };

/* useEffect(() => {
  if (!user?.id || !token) {
    disconnectReverb();
    return;
  }

  connectReverb(user.id, (notification) => {
    console.log("🔔 APP NOTIFICATION:", notification);

    // هنا من بعد نربطو notification state
    // و NotificationsScreen
  });

  return () => {
    disconnectReverb();
  };
}, [user?.id, token]); */
  /*
  |--------------------------------------------------------------------------
  | Restore on App Start
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    restoreSession();
  }, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  return useContext(AuthContext);
};