// src/screens/settings/SettingsScreen.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { changeAppLanguage } from '../../i18n';
import { ArrowLeft } from 'lucide-react-native';

const LANGUAGES = [
  { code: 'en', labelKey: 'settings.english' },
  { code: 'fr', labelKey: 'settings.french' },
  { code: 'ar', labelKey: 'settings.arabic' },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();

  const handleLanguageChange = async (lng) => {
    await changeAppLanguage(lng);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#15803D" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      {/* Language selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.buttonsRow}>
          {LANGUAGES.map(({ code, labelKey }) => (
            <TouchableOpacity
              key={code}
              style={[
                styles.langBtn,
                i18n.language === code && styles.langBtnActive,
              ]}
              onPress={() => handleLanguageChange(code)}
            >
              <Text
                style={[
                  styles.langBtnText,
                  i18n.language === code && styles.langBtnTextActive,
                ]}
              >
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const GREEN = '#15803D';
const INACTIVE = '#94A3B8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: GREEN,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: GREEN,
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: INACTIVE,
    borderRadius: 6,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: GREEN,
  },
  langBtnText: {
    color: '#fff',
    fontWeight: '500',
  },
  langBtnTextActive: {
    color: '#fff',
  },
});
