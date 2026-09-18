// src/context/ThemeContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

const THEME_KEY = '@app_theme';

export function ThemeProvider({ children }) {
  const systemTheme = Appearance.getColorScheme() || 'light';

  const [theme, setTheme] = useState(systemTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);

      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.log('❌ Failed to load theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    setTheme(newTheme);

    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (error) {
      console.log('❌ Failed to save theme:', error);
    }
  };

  const colors =
    theme === 'dark'
      ? {
          background: '#020617',
          surface: '#0F172A',
          surfaceSecondary: '#1E293B',
          text: '#F8FAFC',
          textSecondary: '#CBD5E1',
          border: '#334155',
          primary: '#15803D',
          icon: '#22C55E',
          inactive: '#475569',
        }
      : {
          background: '#FFFFFF',
          surface: '#F8FAFC',
          surfaceSecondary: '#F1F5F9',
          text: '#0F172A',
          textSecondary: '#64748B',
          border: '#E2E8F0',
          primary: '#15803D',
          icon: '#15803D',
          inactive: '#94A3B8',
        };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        isDark: theme === 'dark',
        toggleTheme,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}