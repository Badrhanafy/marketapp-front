// src/screens/settings/PrivacyPolicyScreen.jsx

import React, {
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  Linking,
  Animated,
  Easing,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  User,
  Building2,
  Calendar,
  ChevronRight,
} from 'lucide-react-native';

import { useTheme } from '../../context/ThemeContext';

const BRAND = {
  dark: '#0B3D2E',
  deep: '#072A20',
  mid: '#1B6B50',
  soft: '#DCEBE4',
  accent: '#2F855A',
  white: '#FFFFFF',
};

const PRIVACY_CONTACT_EMAIL = 'support@yourdomain.com';
const DEVELOPER_NAME = 'Your Name or Company';
const APP_NAME = 'Market App';
const LAST_UPDATED = 'September 21, 2026';

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

/**
 * Smoothly animated collapsible.
 *  - Body is always mounted (so it can be measured) and clipped by an
 *    animated `maxHeight`.
 *  - A hidden off-screen copy of the content is used purely for `onLayout`
 *    measurement, so nested collapsibles measure correctly even when the
 *    parent is closed.
 */
function Collapsible({
  header,
  children,
  defaultOpen = false,
  colors,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [contentHeight, setContentHeight] = useState(0);

  // 0 = closed, 1 = open. Drives every animated value below.
  const progress = useRef(
    new Animated.Value(defaultOpen ? 1 : 0)
  ).current;

  // Cache of the natural expanded height so we can interpolate to it.
  const measuredRef = useRef(0);

  const toggle = useCallback(() => {
    Animated.timing(progress, {
      toValue: open ? 0 : 1,
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false, // height requires JS driver
    }).start();

    setOpen((o) => !o);
  }, [open, progress]);

  const onMeasure = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - measuredRef.current) > 1) {
      measuredRef.current = h;
      setContentHeight(h);
    }
  }, []);

  const animatedHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight || 1],
  });

  const animatedOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.6, 1],
  });

  const animatedTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  const animatedRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View
      style={[
        styles.collapsibleWrap,
        { borderColor: colors.border },
      ]}
    >
      {/* ---------- Header row ---------- */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.collapsibleHeader}
      >
        <View style={styles.collapsibleHeaderLeft}>
          {header}
        </View>

        <Directional>
          <Animated.View
            style={{ transform: [{ rotate: animatedRotate }] }}
          >
            <ChevronRight
              size={20}
              color={colors.textSecondary}
              strokeWidth={2.4}
            />
          </Animated.View>
        </Directional>
      </TouchableOpacity>

      {/* ---------- Animated body ---------- */}
      <Animated.View
        style={[
          styles.collapsibleBody,
          {
            maxHeight: animatedHeight,
            opacity: animatedOpacity,
            transform: [{ translateY: animatedTranslateY }],
          },
        ]}
      >
        <View style={styles.collapsibleBodyInner}>
          {children}
        </View>
      </Animated.View>

      {/* ---------- Off-screen measurer ---------- */}
      <View pointerEvents="none" style={styles.measureHost}>
        <View style={styles.measureInner} onLayout={onMeasure}>
          {children}
        </View>
      </View>
    </View>
  );
}

/**
 * Numbered top-level section header. Used inside `Collapsible.header`.
 */
function SectionHeader({ index, title, colors }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View
        style={[
          styles.sectionIndex,
          {
            borderColor: BRAND.mid,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.sectionIndexText,
            { color: BRAND.mid },
          ]}
        >
          {index}
        </Text>
      </View>

      <Text
        style={[
          styles.sectionTitle,
          { color: colors.text },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  );
}

/**
 * Subsection header used inside nested collapsibles.
 */
function SubSectionHeader({ title, colors }) {
  return (
    <View style={styles.subHeaderRow}>
      <View
        style={[
          styles.subBullet,
          { backgroundColor: BRAND.mid },
        ]}
      />
      <Text
        style={[
          styles.subTitle,
          { color: colors.text },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  );
}

function P({ children, colors, style }) {
  return (
    <Text
      style={[
        styles.paragraph,
        { color: colors.textSecondary },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

function Bullet({ children, colors }) {
  return (
    <View style={styles.bulletRow}>
      <View
        style={[
          styles.bulletMarker,
          {
            borderColor: BRAND.mid,
            backgroundColor: colors.surface,
          },
        ]}
      />
      <Text
        style={[
          styles.bulletText,
          { color: colors.textSecondary },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function Divider({ colors }) {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border },
      ]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const openEmail = async () => {
    try {
      await Linking.openURL(
        `mailto:${PRIVACY_CONTACT_EMAIL}`
      );
    } catch (e) {
      // silently ignore
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      edges={['top', 'left', 'right']}
    >
      {/* ------------------------------ Header ------------------------------ */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
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
          style={[
            styles.headerTitle,
            { color: colors.text },
          ]}
          numberOfLines={1}
        >
          {t(
            'settings.privacy.title',
            'Privacy Policy'
          )}
        </Text>

        <View style={styles.headerBtn} />
      </View>

      {/* ------------------------------ Content ----------------------------- */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ---------- Document title block ---------- */}
        <View style={styles.docHeader}>
          <View
            style={[
              styles.docBadge,
              { backgroundColor: BRAND.soft },
            ]}
          >
            <ShieldCheck
              size={16}
              color={BRAND.dark}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.docBadgeText,
                { color: BRAND.dark },
              ]}
            >
              {t(
                'privacy.badge',
                'OFFICIAL DOCUMENT'
              )}
            </Text>
          </View>

          <Text
            style={[
              styles.docTitle,
              { color: colors.text },
            ]}
          >
            {t(
              'settings.privacy.title',
              'Privacy Policy'
            )}
          </Text>

          <Text
            style={[
              styles.docApp,
              { color: colors.textSecondary },
            ]}
          >
            {t('settings.appName', APP_NAME)}
          </Text>

          <View style={styles.docMeta}>
            <Calendar
              size={13}
              color={colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.docMetaText,
                { color: colors.textSecondary },
              ]}
            >
              {t(
                'privacy.lastUpdated',
                'Last updated'
              )}
              {'  ·  '}
              {t(
                'privacy.lastUpdatedDate',
                LAST_UPDATED
              )}
            </Text>
          </View>
        </View>

        <Divider colors={colors} />

        {/* ---------- Intro ---------- */}
        <P colors={colors}>
          {t(
            'privacy.welcome',
            'Welcome to Market App.'
          )}
        </P>

        <P colors={colors}>
          {t(
            'privacy.about',
            'Market App is a marketplace application that allows users to discover products, publish listings, communicate with sellers and buyers, save products, and discover products based on location.'
          )}
        </P>

        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: isDark
                ? 'rgba(47,133,90,0.12)'
                : BRAND.soft,
              borderColor: BRAND.mid,
            },
          ]}
        >
          <Text
            style={[
              styles.noticeText,
              {
                color: isDark
                  ? colors.text
                  : BRAND.dark,
              },
            ]}
          >
            {t(
              'privacy.consent',
              'By using Market App, you acknowledge that you have read and understood this Privacy Policy.'
            )}
          </Text>
        </View>

        {/* ============================================================= */}
        {/* 1. Information We Collect (nested subsections)                */}
        {/* ============================================================= */}
        <Collapsible
          defaultOpen
          colors={colors}
          header={
            <SectionHeader
              index="1"
              title={t(
                'privacy.sections.collect.title',
                'Information We Collect'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.collect.intro',
              'Depending on how you use the application, we may collect the following information.'
            )}
          </P>

          {/* 1.1 */}
          <Collapsible
            colors={colors}
            header={
              <SubSectionHeader
                title={t(
                  'privacy.sections.collect.account.title',
                  '1.1 Account Information'
                )}
                colors={colors}
              />
            }
          >
            <P colors={colors}>
              {t(
                'privacy.sections.collect.account.intro',
                'When you create an account, we may collect:'
              )}
            </P>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.account.name',
                'Name'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.account.email',
                'Email address'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.account.password',
                'Password or authentication credentials'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.account.profile',
                'Profile information'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.account.id',
                'User account identifier'
              )}
            </Bullet>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.account.note',
                'Passwords are not stored in plain text. Authentication information is handled using appropriate security mechanisms.'
              )}
            </P>
          </Collapsible>

          {/* 1.2 */}
          <Collapsible
            colors={colors}
            header={
              <SubSectionHeader
                title={t(
                  'privacy.sections.collect.product.title',
                  '1.2 Product Information'
                )}
                colors={colors}
              />
            }
          >
            <P colors={colors}>
              {t(
                'privacy.sections.collect.product.intro',
                'When you publish a product, we may collect:'
              )}
            </P>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.name',
                'Product name'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.description',
                'Description'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.price',
                'Price'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.category',
                'Category'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.condition',
                'Product condition'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.status',
                'Product status'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.images',
                'Product images'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.location',
                'Product location'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.product.coords',
                'Latitude and longitude associated with the listing'
              )}
            </Bullet>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.product.note',
                'This information is used to display your listing to other users.'
              )}
            </P>
          </Collapsible>

          {/* 1.3 */}
          <Collapsible
            colors={colors}
            header={
              <SubSectionHeader
                title={t(
                  'privacy.sections.collect.location.title',
                  '1.3 Location Information'
                )}
                colors={colors}
              />
            }
          >
            <P colors={colors}>
              {t(
                'privacy.sections.collect.location.intro',
                "Market App may request access to your device's location when you use location-based features."
              )}
            </P>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.location.usedFor',
                'Location may be used to:'
              )}
            </P>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.location.near',
                'Display products near you'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.location.discover',
                'Help you discover nearby listings'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.location.set',
                'Set the location of a product you are selling'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.location.map',
                'Provide map and location-related functionality'
              )}
            </Bullet>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.location.permission',
                'Location access is requested only when required by a feature that you choose to use.'
              )}
            </P>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.location.control',
                'You can control location permissions through your device settings.'
              )}
            </P>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.location.background',
                'Market App does not require continuous background location tracking for its normal marketplace functionality.'
              )}
            </P>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.location.personal',
                'Location data is considered personal data and should be disclosed according to the actual location functionality implemented by the application.'
              )}
            </P>
          </Collapsible>

          {/* 1.4 */}
          <Collapsible
            colors={colors}
            header={
              <SubSectionHeader
                title={t(
                  'privacy.sections.collect.messages.title',
                  '1.4 Messages and Conversations'
                )}
                colors={colors}
              />
            }
          >
            <P colors={colors}>
              {t(
                'privacy.sections.collect.messages.intro',
                'When you use the chat functionality, we process information necessary to provide messaging between users, including:'
              )}
            </P>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.messages.ids',
                'Sender and recipient identifiers'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.messages.content',
                'Message content'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.messages.conv',
                'Conversation information'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.messages.timestamps',
                'Message timestamps'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.messages.read',
                'Read status'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.messages.product',
                'Product information attached to a message, when applicable'
              )}
            </Bullet>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.messages.note',
                'Messages are used to provide communication between marketplace users.'
              )}
            </P>
          </Collapsible>

          {/* 1.5 */}
          <Collapsible
            colors={colors}
            header={
              <SubSectionHeader
                title={t(
                  'privacy.sections.collect.media.title',
                  '1.5 Images and Media'
                )}
                colors={colors}
              />
            }
          >
            <P colors={colors}>
              {t(
                'privacy.sections.collect.media.intro',
                'When you upload product images or a profile image, those files may be stored on our servers and displayed to other users according to the functionality of the application.'
              )}
            </P>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.media.warning',
                'You should avoid uploading personal, confidential, financial, or sensitive information in product images or messages.'
              )}
            </P>
          </Collapsible>

          {/* 1.6 */}
          <Collapsible
            colors={colors}
            header={
              <SubSectionHeader
                title={t(
                  'privacy.sections.collect.notifications.title',
                  '1.6 Notifications'
                )}
                colors={colors}
              />
            }
          >
            <P colors={colors}>
              {t(
                'privacy.sections.collect.notifications.intro',
                'Market App may process notification-related information to provide notifications such as:'
              )}
            </P>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.notifications.messages',
                'New messages'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.notifications.likes',
                'Product likes'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.notifications.activity',
                'Marketplace activity'
              )}
            </Bullet>
            <Bullet colors={colors}>
              {t(
                'privacy.sections.collect.notifications.other',
                'Other relevant application notifications'
              )}
            </Bullet>
            <P colors={colors}>
              {t(
                'privacy.sections.collect.notifications.control',
                'You can control notification permissions through your device settings.'
              )}
            </P>
          </Collapsible>
        </Collapsible>

        {/* ============================================================= */}
        {/* 2. How We Use                                                 */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="2"
              title={t(
                'privacy.sections.use.title',
                'How We Use Your Information'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.use.intro',
              'We use collected information to:'
            )}
          </P>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.account',
              'Create and manage your account'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.auth',
              'Authenticate users'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.display',
              'Display marketplace products'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.publish',
              'Allow users to publish and manage listings'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.near',
              'Show products near a selected location'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.comm',
              'Enable communication between buyers and sellers'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.notify',
              'Send relevant notifications'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.likes',
              'Process likes and other marketplace interactions'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.security',
              'Maintain application security'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.prevent',
              'Detect and prevent misuse of the service'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.improve',
              'Improve the reliability and functionality of the application'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.use.support',
              'Provide customer support'
            )}
          </Bullet>
          <P colors={colors}>
            {t(
              'privacy.sections.use.note',
              'We do not use your personal information for purposes that are incompatible with the purposes described in this Privacy Policy.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 3. Shared                                                     */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="3"
              title={t(
                'privacy.sections.shared.title',
                'Information Shared With Other Users'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.shared.intro',
              'Some information is intentionally visible to other Market App users.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.shared.publish',
              'For example, when you publish a product, other users may be able to see:'
            )}
          </P>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.shared.name',
              'Your public profile name'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.shared.avatar',
              'Profile image, if provided'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.shared.product',
              'Product information'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.shared.images',
              'Product images'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.shared.location',
              'Product location or approximate listing location'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.shared.status',
              'Product status'
            )}
          </Bullet>
          <P colors={colors}>
            {t(
              'privacy.sections.shared.messages',
              'Messages you send through the chat feature are shared with the users participating in that conversation.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.shared.warning',
              'You should therefore avoid including private or sensitive information in public listings or messages.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 4. Service Providers                                          */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="4"
              title={t(
                'privacy.sections.providers.title',
                'Service Providers'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.providers.intro',
              'Market App may use third-party infrastructure and service providers to operate the application, such as:'
            )}
          </P>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.providers.hosting',
              'Cloud/server hosting'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.providers.db',
              'Database infrastructure'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.providers.storage',
              'File and image storage'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.providers.realtime',
              'Realtime communication services'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.providers.push',
              'Push notification services'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.providers.auth',
              'Authentication and security infrastructure'
            )}
          </Bullet>
          <P colors={colors}>
            {t(
              'privacy.sections.providers.note',
              'These providers may process information only as necessary to provide their services to the application.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.providers.noSell',
              'We do not sell your personal information.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 5. Security                                                   */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="5"
              title={t(
                'privacy.sections.security.title',
                'Data Security'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.security.intro',
              'We take reasonable technical and organizational measures to protect your information against unauthorized access, loss, misuse, alteration, or disclosure.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.security.measures',
              'Security measures may include:'
            )}
          </P>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.security.auth',
              'Secure authentication'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.security.api',
              'Protected API communication'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.security.access',
              'Access controls'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.security.server',
              'Server-side authorization'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.security.password',
              'Secure password storage'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.security.controlled',
              'Controlled access to user data'
            )}
          </Bullet>
          <P colors={colors}>
            {t(
              'privacy.sections.security.noGuarantee',
              'However, no internet-based service can guarantee absolute security.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.security.responsibility',
              'You are responsible for keeping your account credentials confidential and for notifying us if you believe your account has been compromised.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 6. Retention                                                  */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="6"
              title={t(
                'privacy.sections.retention.title',
                'Data Retention'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.retention.intro',
              'We retain personal information only for as long as reasonably necessary to:'
            )}
          </P>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.retention.services',
              "Provide the application's services"
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.retention.account',
              'Maintain your account'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.retention.marketplace',
              'Provide marketplace functionality'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.retention.legal',
              'Meet legal or security requirements'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.retention.disputes',
              'Resolve disputes'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.retention.fraud',
              'Prevent fraud or abuse'
            )}
          </Bullet>
          <P colors={colors}>
            {t(
              'privacy.sections.retention.note',
              'When information is no longer required, it may be deleted or anonymized, subject to applicable legal and operational requirements.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 7. Deletion                                                   */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="7"
              title={t(
                'privacy.sections.deletion.title',
                'Account and Data Deletion'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.deletion.request',
              'You may request deletion of your Market App account and associated personal information.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.deletion.process',
              'When an account deletion request is processed, we will delete or anonymize associated personal information where required and where retention is not necessary for legitimate legal or security purposes.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.deletion.contact',
              'If account deletion is not yet available directly inside the application, users may contact us using the contact information provided below to request deletion.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.deletion.play',
              'Google Play requires apps that support account creation to provide users with a clear way to request account deletion and deletion of associated data.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 8. Rights                                                     */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="8"
              title={t(
                'privacy.sections.rights.title',
                'Your Privacy Rights'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.rights.intro',
              'Depending on the laws applicable to you, you may have rights regarding your personal information, including:'
            )}
          </P>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.rights.know',
              'The right to know what information is collected'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.rights.access',
              'The right to access your personal information'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.rights.correct',
              'The right to correct inaccurate information'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.rights.delete',
              'The right to request deletion of your information'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.rights.restrict',
              'The right to restrict certain processing'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.rights.object',
              'The right to object to certain processing'
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              'privacy.sections.rights.withdraw',
              'The right to withdraw consent where processing is based on consent'
            )}
          </Bullet>
          <P colors={colors}>
            {t(
              'privacy.sections.rights.gdpr',
              'For users covered by the GDPR, these rights can include access, rectification, erasure, restriction, portability, and objection, subject to applicable conditions and exceptions.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 9. Children                                                   */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="9"
              title={t(
                'privacy.sections.children.title',
                "Children's Privacy"
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.children.intro',
              'Market App is not intended to knowingly collect personal information from children in violation of applicable laws.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.children.contact',
              'If you believe that a child has provided personal information without appropriate authorization, please contact us so that we can review and take appropriate action.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 10. Cookies                                                   */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="10"
              title={t(
                'privacy.sections.cookies.title',
                'Cookies and Similar Technologies'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.cookies.intro',
              'The Market App mobile application does not intentionally use cookies for advertising purposes.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.cookies.tech',
              'Our servers or technical infrastructure may use necessary technologies such as authentication tokens, session information, logs, or similar mechanisms required to operate and secure the service.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 11. Changes                                                   */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="11"
              title={t(
                'privacy.sections.changes.title',
                'Changes to This Privacy Policy'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.changes.intro',
              'We may update this Privacy Policy from time to time.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.changes.date',
              'When changes are made, we will update the Last Updated date at the beginning of this document.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.changes.notice',
              'For significant changes, we may provide additional notice through the application or another appropriate communication method.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.changes.review',
              'We encourage users to review this Privacy Policy periodically.'
            )}
          </P>
        </Collapsible>

        {/* ============================================================= */}
        {/* 12. Contact                                                   */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="12"
              title={t(
                'privacy.sections.contact.title',
                'Contact Us'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.contact.intro',
              'If you have questions about this Privacy Policy, your personal information, or a request to access, correct, or delete your information, please contact us:'
            )}
          </P>

          <View
            style={[
              styles.contactList,
              { borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openEmail}
              accessibilityRole="button"
              style={[
                styles.contactRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <Mail
                size={18}
                color={BRAND.mid}
                strokeWidth={2.2}
              />
              <View style={styles.contactBody}>
                <Text
                  style={[
                    styles.contactLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t(
                    'privacy.sections.contact.privacyContact',
                    'Privacy Contact'
                  )}
                </Text>
                <Text
                  style={[
                    styles.contactValue,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {PRIVACY_CONTACT_EMAIL}
                </Text>
              </View>
            </TouchableOpacity>

            <View
              style={[
                styles.contactRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <Building2
                size={18}
                color={BRAND.mid}
                strokeWidth={2.2}
              />
              <View style={styles.contactBody}>
                <Text
                  style={[
                    styles.contactLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t(
                    'privacy.sections.contact.developer',
                    'Developer / Company'
                  )}
                </Text>
                <Text
                  style={[
                    styles.contactValue,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {DEVELOPER_NAME}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.contactRow,
                styles.contactRowLast,
              ]}
            >
              <User
                size={18}
                color={BRAND.mid}
                strokeWidth={2.2}
              />
              <View style={styles.contactBody}>
                <Text
                  style={[
                    styles.contactLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t(
                    'privacy.sections.contact.app',
                    'Application'
                  )}
                </Text>
                <Text
                  style={[
                    styles.contactValue,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {t('settings.appName', APP_NAME)}
                </Text>
              </View>
            </View>
          </View>
        </Collapsible>

        {/* ============================================================= */}
        {/* 13. Acceptance                                                */}
        {/* ============================================================= */}
        <Collapsible
          colors={colors}
          header={
            <SectionHeader
              index="13"
              title={t(
                'privacy.sections.acceptance.title',
                'Acceptance'
              )}
              colors={colors}
            />
          }
        >
          <P colors={colors}>
            {t(
              'privacy.sections.acceptance.intro',
              'By using Market App, you acknowledge that you have read and understood this Privacy Policy.'
            )}
          </P>
          <P colors={colors}>
            {t(
              'privacy.sections.acceptance.disagree',
              'If you do not agree with this Privacy Policy, please stop using the application.'
            )}
          </P>
        </Collapsible>

        {/* ---------- Footer ---------- */}
        <Divider colors={colors} />

        <Text
          style={[
            styles.footer,
            { color: colors.textSecondary },
          ]}
        >
          {t('settings.appName', APP_NAME)}
          {'  ·  '}
          {t('privacy.lastUpdated', 'Last updated')}
          {' '}
          {t(
            'privacy.lastUpdatedDate',
            LAST_UPDATED
          )}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  flipX: { transform: [{ scaleX: -1 }] },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },

  /* --------------------------- HEADER --------------------------- */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* --------------------------- DOC HEADER --------------------------- */

  docHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },

  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },

  docBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  docTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  docApp: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },

  docMetaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  /* --------------------------- DIVIDER --------------------------- */

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },

  /* --------------------------- NOTICE BOX --------------------------- */

  noticeBox: {
    borderStartWidth: 3,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 8,
  },

  noticeText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '600',
  },

  /* --------------------------- COLLAPSIBLE --------------------------- */

  collapsibleWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
  },

  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 60,
  },

  collapsibleHeaderLeft: {
    flex: 1,
    marginEnd: 10,
  },

  collapsibleBody: {
    overflow: 'hidden',
  },

  collapsibleBodyInner: {
    paddingBottom: 8,
  },

  /* Off-screen measurer: absolute + opacity 0 so it's laid out
     at full width but never visible to the user. */
  measureHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },

  measureInner: {
    // Intentionally empty — layout reports natural height.
  },

  /* --------------------------- SECTION HEADER --------------------------- */

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },

  sectionIndexText: {
    fontSize: 13,
    fontWeight: '800',
  },

  sectionTitle: {
    flex: 1,
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  /* --------------------------- SUB HEADER --------------------------- */

  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  subBullet: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    marginEnd: 8,
  },

  subTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  /* --------------------------- TEXT --------------------------- */

  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
    textAlign: 'left',
  },

  /* --------------------------- BULLETS --------------------------- */

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingStart: 4,
  },

  bulletMarker: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
    borderWidth: 1.2,
    marginTop: 8,
    marginEnd: 10,
  },

  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },

  /* --------------------------- CONTACT LIST --------------------------- */

  contactList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  contactRowLast: {
    borderBottomWidth: 0,
  },

  contactBody: {
    flex: 1,
  },

  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },

  contactValue: {
    fontSize: 14.5,
    fontWeight: '600',
  },

  /* --------------------------- FOOTER --------------------------- */

  footer: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});