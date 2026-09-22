import React from "react";

import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { NotificationProvider } from "./src/context/NotificationContext";
import './src/i18n'; 
import { ThemeProvider } from "./src/context/ThemeContext";
export default function App() {
  return (
 <AuthProvider>
  <ThemeProvider>
  <NotificationProvider>
    <AppNavigator />
  </NotificationProvider>
  </ThemeProvider>
</AuthProvider>
  );
}