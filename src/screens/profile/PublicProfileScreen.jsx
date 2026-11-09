
import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Alert,
    Linking,
    Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ArrowLeft,
    BadgeCheck,
    MapPin,
    Mail,
    Phone,
    MessageCircle,
    Share2,
    UserRound,
    RefreshCw,
} from "lucide-react-native";

import api from "../../api/client";
import { useTheme } from "../../context/ThemeContext";

const GREEN = "#16A34A";

// Replace with your actual public domain / deep link.
const PUBLIC_PROFILE_BASE_URL = "http://192.168.8.28:8000/u";

export default function PublicProfileScreen({ navigation, route }) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const userId = route?.params?.userId;

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);

    const primary = isDark ? "#22C55E" : GREEN;

    const theme = {
        background: colors.background,
        surface: colors.surface,
        text: colors.text,
        muted: colors.textSecondary,
        border: colors.border,
        soft: isDark
            ? "rgba(34,197,94,0.13)"
            : "#F0FDF4",
    };

    const fetchProfile = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Public endpoint: must not require authentication.
            const response = await api.get(
                `/users/${userId}/public-profile`
            );

            setProfile(response.data?.user || response.data);
        } catch (error) {
            console.log(
                "PUBLIC PROFILE ERROR:",
                error.response?.data || error.message
            );
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleCall = async () => {
        if (!profile?.phone) return;

        try {
            await Linking.openURL(`tel:${profile.phone}`);
        } catch {
            Alert.alert("Error", "Unable to open phone application.");
        }
    };

    const handleEmail = async () => {
        if (!profile?.email) return;

        try {
            await Linking.openURL(`mailto:${profile.email}`);
        } catch {
            Alert.alert("Error", "Unable to open email application.");
        }
    };

    const handleShare = async () => {
        if (!profile?.id) return;

        const link = `${PUBLIC_PROFILE_BASE_URL}/${profile.id}`;

        try {
            await Share.share({
                message: `Check out ${profile.name}'s profile on SOUMA:\n${link}`,
                url: link,
            });
        } catch (error) {
            console.log("SHARE ERROR:", error.message);
        }
    };

    const handleChat = async () => {
        if (!profile?.id || chatLoading) return;

        try {
            setChatLoading(true);

            // Create or retrieve existing buyer/seller conversation.
            const response = await api.post("/conversations", {
                seller_id: profile.id,
            });

            const conversation =
                response.data?.conversation || response.data;

            if (!conversation?.id) {
                throw new Error("Conversation ID not found");
            }

            navigation.navigate("Chat", {
                conversationId: conversation.id,
                conversation,
                otherUser: profile,
            });
        } catch (error) {
            console.log(
                "START CHAT ERROR:",
                error.response?.data || error.message
            );

            Alert.alert(
                "Error",
                error.response?.data?.message ||
                "Could not start conversation."
            );
        } finally {
            setChatLoading(false);
        }
    };

    const initial = profile?.name?.charAt(0)?.toUpperCase() || "U";

    if (loading) {
        return (
            <View style={[
                styles.center,
                { backgroundColor: theme.background }
            ]}>
                <ActivityIndicator size="large" color={primary} />
                <Text style={[styles.loadingText, { color: theme.muted }]}>
                    Loading profile...
                </Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[
                styles.center,
                { backgroundColor: theme.background }
            ]}>
                <UserRound size={45} color={theme.muted} />
                <Text style={[styles.errorTitle, { color: theme.text }]}>
                    Profile not found
                </Text>
                <TouchableOpacity
                    onPress={fetchProfile}
                    style={[styles.retryButton, { backgroundColor: primary }]}
                >
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Try again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[
            styles.container,
            { backgroundColor: theme.background }
        ]}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={theme.background}
            />

            {/* Header */}
            <View style={[
                styles.header,
                {
                    paddingTop: insets.top + 8,
                    borderBottomColor: theme.border,
                }
            ]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.iconButton, { backgroundColor: theme.soft }]}
                >
                    <ArrowLeft size={21} color={primary} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    Public Profile
                </Text>

                <TouchableOpacity
                    onPress={handleShare}
                    style={[styles.iconButton, { backgroundColor: theme.soft }]}
                >
                    <Share2 size={19} color={primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + 30 }
                ]}
            >
                {/* Profile identity */}
                <View style={styles.identity}>
                    <View style={[
                        styles.avatarRing,
                        { backgroundColor: theme.soft, borderColor: primary }
                    ]}>
                        <View style={[styles.avatar, { backgroundColor: primary }]}>
                            <Text style={styles.avatarText}>{initial}</Text>
                        </View>
                    </View>

                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: theme.text }]}>
                            {profile.name || "SOUMA User"}
                        </Text>
                        {profile.is_verified && (
                            <BadgeCheck size={21} color={primary} />
                        )}
                    </View>

                    <View style={styles.publicBadge}>
                        <View style={[styles.onlineDot, { backgroundColor: primary }]} />
                        <Text style={[styles.publicBadgeText, { color: primary }]}>
                            SOUMA MEMBER
                        </Text>
                    </View>

                    {profile.city ? (
                        <View style={styles.cityRow}>
                            <MapPin size={15} color={theme.muted} />
                            <Text style={[styles.cityText, { color: theme.muted }]}>
                                {profile.city}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Contact information */}
                <View style={[
                    styles.infoCard,
                    {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                    }
                ]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Contact information
                    </Text>

                    {profile.email ? (
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={handleEmail}
                        >
                            <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                                <Mail size={19} color={primary} />
                            </View>

                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: theme.muted }]}>
                                    Email address
                                </Text>
                                <Text
                                    style={[styles.infoValue, { color: theme.text }]}
                                    numberOfLines={1}
                                >
                                    {profile.email}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ) : null}

                    {profile.phone ? (
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={handleCall}
                        >
                            <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                                <Phone size={19} color={primary} />
                            </View>

                            <View style={styles.infoContent}>
                                <Text style={[styles.infoLabel, { color: theme.muted }]}>
                                    Phone number
                                </Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>
                                    {profile.phone}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ) : null}

                    {!profile.email && !profile.phone ? (
                        <Text style={[styles.emptyInfo, { color: theme.muted }]}>
                            No public contact information available.
                        </Text>
                    ) : null}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={chatLoading}
                        onPress={handleChat}
                        style={[styles.chatButton, { backgroundColor: primary }]}
                    >
                        {chatLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <MessageCircle size={20} color="#FFFFFF" />
                                <Text style={styles.buttonText}>Send Message</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {profile.phone ? (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleCall}
                            style={[
                                styles.callButton,
                                {
                                    borderColor: primary,
                                    backgroundColor: theme.soft,
                                }
                            ]}
                        >
                            <Phone size={19} color={primary} />
                            <Text style={[styles.callText, { color: primary }]}>
                                Call Seller
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Share */}
                <TouchableOpacity
                    onPress={handleShare}
                    style={styles.shareLink}
                >
                    <Share2 size={16} color={theme.muted} />
                    <Text style={[styles.shareText, { color: theme.muted }]}>
                        Share this profile with others
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.footer, { color: theme.muted }]}>
                    SOUMA · Buy & Sell with confidence
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    loadingText: { fontSize: 14, marginTop: 8 },
    errorTitle: { fontSize: 19, fontWeight: "800" },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 17, fontWeight: "800" },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    content: { paddingHorizontal: 20 },
    identity: {
        alignItems: "center",
        paddingTop: 38,
        paddingBottom: 30,
    },
    avatarRing: {
        width: 116,
        height: 116,
        borderRadius: 58,
        borderWidth: 3,
        alignItems: "center",
        justifyContent: "center",
    },
    avatar: {
        width: 98,
        height: 98,
        borderRadius: 49,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#FFFFFF",
        fontSize: 40,
        fontWeight: "900",
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginTop: 17,
    },
    name: { fontSize: 24, fontWeight: "900" },
    publicBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#16A34A12",
    },
    onlineDot: { width: 7, height: 7, borderRadius: 4 },
    publicBadgeText: {
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 1,
    },
    cityRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 13,
    },
    cityText: { fontSize: 13, fontWeight: "600" },

    infoCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 19,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingVertical: 13,
    },
    infoIcon: {
        width: 43,
        height: 43,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, fontWeight: "600" },
    infoValue: { fontSize: 14, fontWeight: "700", marginTop: 4 },
    emptyInfo: { fontSize: 13, paddingVertical: 12 },

    actions: { gap: 12, marginTop: 25 },
    chatButton: {
        height: 55,
        borderRadius: 17,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
    callButton: {
        height: 53,
        borderRadius: 17,
        borderWidth: 1.5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    callText: { fontSize: 15, fontWeight: "800" },

    shareLink: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginTop: 25,
        padding: 10,
    },
    shareText: { fontSize: 13, fontWeight: "600" },
    footer: {
        textAlign: "center",
        marginTop: 24,
        fontSize: 11,
        fontWeight: "600",
    },
    retryButton: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 13,
    },
});
