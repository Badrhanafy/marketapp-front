import React from "react";

import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { NotificationProvider } from "./src/context/NotificationContext";
import './src/i18n'; 
export default function App() {
  return (
 <AuthProvider>
  <NotificationProvider>
    <AppNavigator />
  </NotificationProvider>
</AuthProvider>
  );
}