// src/screens/settings/SettingsScreen.jsx

import React, { useState } from 'react';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Share,
  Linking,
  Alert,
  I18nManager,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import {
  ArrowLeft,
  ChevronRight,
  Sun,
  Moon,
  Check,
  Globe,
  ShieldCheck,
  Mail,
  BookOpen,
  Share2,
} from 'lucide-react-native';

import { changeAppLanguage } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';

import {
  InstagramIcon,
  YoutubeIcon,
  FacebookIcon,
  XIcon,
  LinkedinIcon,
  WhatsappIcon,
} from '../../components/BrandIcons';

import HowToUseModal from './HowToUseModal';

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */

import APP_LOGO from '../../../assets/images/transparent.png';
import bgpattern from '../../../assets/images/patternsettings.jpg';

const APP_NAME = 'Your App';
const APP_VERSION = '1.0.0';

const SHARE_URL =
  'https://play.google.com/store/apps/details?id=com.yourapp';
const PRIVACY_URL = 'https://yourdomain.com/privacy';
const CONTACT_EMAIL = 'support@yourdomain.com';

const SOCIAL_LINKS = [
  {
    key: 'instagram',
    label: 'Instagram',
    translationKey: 'settings.social.instagram',
    Icon: InstagramIcon,
    url: 'https://instagram.com/yourapp',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    translationKey: 'settings.social.youtube',
    Icon: YoutubeIcon,
    url: 'https://youtube.com/@yourapp',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    translationKey: 'settings.social.facebook',
    Icon: FacebookIcon,
    url: 'https://facebook.com/yourapp',
  },
  {
    key: 'twitter',
    label: 'X',
    translationKey: 'settings.social.twitter',
    Icon: XIcon,
    url: 'https://x.com/yourapp',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    translationKey: 'settings.social.linkedin',
    Icon: LinkedinIcon,
    url: 'https://linkedin.com/company/yourapp',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    translationKey: 'settings.social.whatsapp',
    Icon: WhatsappIcon,
    url: 'https://wa.me/212600000000',
  },
];

const LANGUAGES = [
  {
    code: 'en',
    labelKey: 'settings.languages.en',
    fallback: 'English',
  },
  {
    code: 'fr',
    labelKey: 'settings.languages.fr',
    fallback: 'Français',
  },
  {
    code: 'ar',
    labelKey: 'settings.languages.ar',
    fallback: 'العربية',
  },
];

const BRAND = {
  dark: '#0B3D2E',
  deep: '#072A20',
  mid: '#1B6B50',
  soft: '#DCEBE4',
  white: '#FFFFFF',
};

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                           */
/* -------------------------------------------------------------------------- */

function Directional({ children }) {
  return (
    <View style={I18nManager.isRTL ? styles.flipX : null}>
      {children}
    </View>
  );
}

function SectionLabel({ children, color }) {
  return (
    <Text style={[styles.sectionLabel, { color }]}>
      {children}
    </Text>
  );
}

function Tile({
  Icon,
  title,
  subtitle,
  onPress,
  filled,
  colors,
  isDark,
}) {
  const titleColor = filled ? BRAND.white : colors.text;
  const subColor = filled
    ? 'rgba(255,255,255,0.75)'
    : colors.textSecondary;

  const iconBg = filled
    ? BRAND.white
    : isDark
    ? BRAND.dark
    : BRAND.soft;
  const iconColor = filled
    ? BRAND.dark
    : isDark
    ? BRAND.white
    : BRAND.dark;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.tile,
        filled
          ? {
              backgroundColor: BRAND.dark,
              borderColor: isDark
                ? 'rgba(255,255,255,0.12)'
                : BRAND.dark,
            }
          : {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
        !filled && !isDark && styles.shadow,
      ]}
    >
      <View style={styles.tileTop}>
        <View
          style={[
            styles.tileIcon,
            { backgroundColor: iconBg },
          ]}
        >
          <Icon
            size={22}
            color={iconColor}
            strokeWidth={2.2}
          />
        </View>

        <Directional>
          <ChevronRight
            size={20}
            color={subColor}
            strokeWidth={2.2}
          />
        </Directional>
      </View>

      <Text
        style={[styles.tileTitle, { color: titleColor }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        style={[styles.tileSubtitle, { color: subColor }]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();

  const { colors, isDark, toggleTheme } = useTheme();

  const [howToOpen, setHowToOpen] = useState(false);

  const currentLang = (i18n.language || 'en').split('-')[0];
  const tint = isDark ? BRAND.white : BRAND.dark;
  const tintBg = isDark ? BRAND.dark : BRAND.soft;

  /* ------------------------------- actions ------------------------------ */

  const handleLanguageChange = async (lng) => {
    if (lng === currentLang) return;
    await changeAppLanguage(lng);
  };

  const openUrl = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(
        t(
          'settings.errors.linkTitle',
          'Something went wrong'
        ),
        t(
          'settings.errors.linkMessage',
          'We could not open this link.'
        )
      );
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('settings.share.message', {
          defaultValue: 'Check out {{name}}: {{url}}',
          name: APP_NAME,
          url: SHARE_URL,
        }),
      });
    } catch (e) {
      // user dismissed the sheet
    }
  };

  /* ------------------------------- render ------------------------------- */

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ------------------------------ Header ------------------------------ */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.circleBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              !isDark && styles.shadow,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Back')}
          >
            <Directional>
              <ArrowLeft
                size={22}
                color={colors.icon}
                strokeWidth={2.2}
              />
            </Directional>
          </TouchableOpacity>

          <Text
            style={[styles.title, { color: colors.text }]}
          >
            {t('settings.title', 'Settings')}
          </Text>

          <TouchableOpacity
            onPress={handleShare}
            style={[
              styles.circleBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              !isDark && styles.shadow,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t(
              'settings.share.buttonLabel',
              'Share the app'
            )}
          >
            <Share2
              size={20}
              color={colors.icon}
              strokeWidth={2.2}
            />
          </TouchableOpacity>
        </View>

        {/* ------------------------------- Hero ------------------------------- */}
        <View style={styles.hero}>
          <View
            pointerEvents="none"
            style={[
              styles.blob,
              styles.blobStart,
              { backgroundColor: BRAND.dark },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.blob,
              styles.blobEnd,
              { backgroundColor: BRAND.mid },
            ]}
          />

          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              !isDark && styles.shadow,
            ]}
          >
            <Image
              source={APP_LOGO}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text
            style={[styles.appName, { color: colors.text }]}
          >
            {t('settings.appName', APP_NAME)}
          </Text>

          <Text
            style={[
              styles.tagline,
              { color: colors.textSecondary },
            ]}
          >
            {t(
              'settings.tagline',
              'Everything you need, in one place.'
            )}
          </Text>
        </View>

        {/* ---------------------------- Social grid --------------------------- */}
        <View
          style={[
            styles.socialCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            !isDark && styles.shadow,
          ]}
        >
          {SOCIAL_LINKS.map(
            ({ key, label, translationKey, Icon, url }) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.7}
                onPress={() => openUrl(url)}
                style={styles.socialItem}
                accessibilityRole="link"
                accessibilityLabel={t(
                  translationKey,
                  label
                )}
              >
                <View
                  style={[
                    styles.socialCircle,
                    { backgroundColor: tintBg },
                  ]}
                >
                  <Icon
                    size={22}
                    color={tint}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  style={[
                    styles.socialLabel,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {t(translationKey, label)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* --------------------------- Preferences ---------------------------- */}
        <SectionLabel color={colors.text}>
          {t(
            'settings.sections.preferences',
            'Preferences'
          )}
        </SectionLabel>

        {/* Dark mode */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            !isDark && styles.shadow,
          ]}
        >
          <View style={styles.row}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: tintBg },
              ]}
            >
              {isDark ? (
                <Moon
                  size={21}
                  color={BRAND.white}
                  strokeWidth={2}
                />
              ) : (
                <Sun
                  size={21}
                  color={BRAND.dark}
                  strokeWidth={2}
                />
              )}
            </View>

            <View style={styles.rowText}>
              <Text
                style={[
                  styles.rowTitle,
                  { color: colors.text },
                ]}
              >
                {t('settings.darkMode.title', 'Dark Mode')}
              </Text>
              <Text
                style={[
                  styles.rowSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {isDark
                  ? t(
                      'settings.darkMode.enabled',
                      'Dark theme enabled'
                    )
                  : t(
                      'settings.darkMode.disabled',
                      'Light theme enabled'
                    )}
              </Text>
            </View>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: colors.inactive,
                true: BRAND.mid,
              }}
              thumbColor={BRAND.white}
              ios_backgroundColor={colors.inactive}
              accessibilityLabel={t(
                'settings.darkMode.title',
                'Dark Mode'
              )}
            />
          </View>
        </View>

        {/* Language */}
        <View
          style={[
            styles.card,
            styles.cardSpaced,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            !isDark && styles.shadow,
          ]}
        >
          <View style={styles.row}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: tintBg },
              ]}
            >
              <Globe
                size={21}
                color={tint}
                strokeWidth={2}
              />
            </View>

            <View style={styles.rowText}>
              <Text
                style={[
                  styles.rowTitle,
                  { color: colors.text },
                ]}
              >
                {t('settings.language.title', 'Language')}
              </Text>
              <Text
                style={[
                  styles.rowSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t(
                  'settings.language.hint',
                  'Choose your app language'
                )}
              </Text>
            </View>
          </View>

          <View style={styles.chips}>
            {LANGUAGES.map(
              ({ code, labelKey, fallback }) => {
                const active = currentLang === code;

                return (
                  <TouchableOpacity
                    key={code}
                    activeOpacity={0.8}
                    onPress={() =>
                      handleLanguageChange(code)
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: active,
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? BRAND.dark
                          : colors.surfaceSecondary,
                        borderColor: active
                          ? BRAND.dark
                          : colors.border,
                      },
                    ]}
                  >
                    {active && (
                      <Check
                        size={15}
                        color={BRAND.white}
                        strokeWidth={3}
                        style={styles.chipCheck}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? BRAND.white
                            : colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t(labelKey, fallback)}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>

        {/* ------------------------ Help & information ------------------------ */}
        <SectionLabel color={colors.text}>
          {t(
            'settings.sections.helpInfo',
            'Help & information'
          )}
        </SectionLabel>

        <View style={styles.tilesRow}>
          <Tile
            filled
            Icon={BookOpen}
            title={t(
              'settings.howToUse.title',
              'How to use'
            )}
            subtitle={t(
              'settings.howToUse.subtitle',
              'Quick guide'
            )}
            onPress={() => setHowToOpen(true)}
            colors={colors}
            isDark={isDark}
          />

     <Tile
  Icon={ShieldCheck}
  title={t('settings.privacy.title', 'Privacy Policy')}
  subtitle={t('settings.privacy.subtitle', 'Your data, your rules')}
  onPress={() => navigation.navigate('PrivacyPolicy')}
  colors={colors}
  isDark={isDark}
/>
        </View>

        {/* ------------------------------ Contact ----------------------------- */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            openUrl(`mailto:${CONTACT_EMAIL}`)
          }
          accessibilityRole="button"
          style={[
            styles.card,
            styles.contactRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            !isDark && styles.shadow,
          ]}
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: tintBg },
            ]}
          >
            <Mail size={21} color={tint} strokeWidth={2} />
          </View>

          <View style={styles.rowText}>
            <Text
              style={[
                styles.rowTitle,
                { color: colors.text },
              ]}
            >
              {t(
                'settings.contact.title',
                'Contact us'
              )}
            </Text>
            <Text
              style={[
                styles.rowSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              {t(
                'settings.contact.email',
                CONTACT_EMAIL
              )}
            </Text>
          </View>

          <Directional>
            <ChevronRight
              size={20}
              color={colors.textSecondary}
              strokeWidth={2.2}
            />
          </Directional>
        </TouchableOpacity>

        {/* --------------------------- Share CTA ----------------------------- */}
        <View style={styles.cta}>
          <View
            pointerEvents="none"
            style={styles.ctaCircleBig}
          />
          <View
            pointerEvents="none"
            style={styles.ctaCircleSmall}
          />

          <Text style={styles.ctaEyebrow}>
            {t(
              'settings.share.eyebrow',
              'Spread the word'
            )}
          </Text>

          <Text style={styles.ctaTitle}>
            {t(
              'settings.share.title',
              'Share the app with friends'
            )}
          </Text>

          <Text style={styles.ctaText}>
            {t(
              'settings.share.text',
              'One tap to send them the download link.'
            )}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleShare}
            accessibilityRole="button"
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>
              {t(
                'settings.share.cta',
                'Share now'
              )}
            </Text>
            <Share2
              size={18}
              color={BRAND.dark}
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>

        {/* ------------------------------ Footer ------------------------------ */}
        <Text
          style={[
            styles.footer,
            { color: colors.textSecondary },
          ]}
        >
          © {new Date().getFullYear()}{' '}
          {t('settings.appName', APP_NAME)}.{' '}
          {t(
            'settings.footer.rights',
            'All rights reserved.'
          )}
          {'\n'}
          {t('settings.footer.version', 'Version')}{' '}
          {APP_VERSION}
        </Text>
      </ScrollView>

      {/* ------------------------------------------------------------------ */}
      {/*  Interactive "How to use" tour                                      */}
      {/* ------------------------------------------------------------------ */}
      <HowToUseModal
        visible={howToOpen}
        onClose={() => setHowToOpen(false)}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },

  flipX: { transform: [{ scaleX: -1 }] },

  shadow: {
    shadowColor: '#0B3D2E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },

  /* HERO */

  hero: {
    alignItems: 'center',
    marginHorizontal: -20,
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },

  blob: {
    position: 'absolute',
    width: 130,
    height: 190,
    borderRadius: 48,
  },

  blobStart: {
    start: -84,
    top: 34,
    transform: [{ rotate: '14deg' }],
  },

  blobEnd: {
    end: -84,
    top: 74,
    transform: [{ rotate: '-16deg' }],
  },

  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: { width: 68, height: 68 },

  appName: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: '800',
  },

  tagline: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },

  /* SOCIAL */

  socialCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 26,
  },

  socialItem: {
    width: '33.3333%',
    alignItems: 'center',
    paddingVertical: 10,
  },

  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  socialLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },

  /* SECTION */

  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  /* CARD */

  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },

  cardSpaced: {
    marginTop: 12,
    marginBottom: 26,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowText: {
    flex: 1,
    marginStart: 13,
    marginEnd: 8,
  },

  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },

  rowSubtitle: { fontSize: 13 },

  /* CHIPS */

  chips: {
    flexDirection: 'row',
    marginTop: 16,
  },

  chip: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    paddingHorizontal: 6,
  },

  chipCheck: { marginEnd: 6 },

  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* TILES */

  tilesRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 12,
  },

  tile: {
    flex: 1,
    marginHorizontal: 6,
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    justifyContent: 'space-between',
  },

  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },

  tileSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
  },

  /* CONTACT */

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },

  /* CTA */

  cta: {
    backgroundColor: BRAND.dark,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
  },

  ctaCircleBig: {
    position: 'absolute',
    end: -50,
    top: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: BRAND.mid,
    opacity: 0.55,
  },

  ctaCircleSmall: {
    position: 'absolute',
    end: 40,
    bottom: -40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: BRAND.deep,
    opacity: 0.7,
  },

  ctaEyebrow: {
    color: '#9FD6BE',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },

  ctaTitle: {
    color: BRAND.white,
    fontSize: 21,
    fontWeight: '800',
    maxWidth: '80%',
  },

  ctaText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: '80%',
  },

  ctaBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 18,
  },

  ctaBtnText: {
    color: BRAND.dark,
    fontSize: 15,
    fontWeight: '700',
    marginEnd: 10,
  },

  /* FOOTER */

  footer: {
    marginTop: 22,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});