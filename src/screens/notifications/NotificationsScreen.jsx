
import React from "react";

import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";

import {
  Bell,
  Check,
  Trash2,
  Heart,
  MapPin,
} from "lucide-react-native";

import { useNotifications } from "../../context/NotificationContext";

const API_URL = "http://192.168.8.5:8000";

const getImageUrl = (path) => {
  if (!path) return null;

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  return `${API_URL}/${path.replace(/^\/+/, "")}`;
};

const getRelativeTime = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();

  const diffSeconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000
  );

  if (diffSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(diffSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
};


const normalizeNotification = (notification) => {
  const data = notification?.data || notification || {};

  const user = data.user || {};
  const product = data.product || {};

  return {
    id: notification?.id || data.id,

    title: data.title || "New notification",

    message: data.message || "",

    type:
      data.type ||
      notification?.type ||
      null,

    created_at:
      notification?.created_at ||
      data.created_at ||
      new Date().toISOString(),

    read_at:
      notification?.read_at ||
      null,

    user: {
      id:
        user.id ||
        data.user_id ||
        null,

      name:
        user.name ||
        null,

      avatar:
        user.avatar ||
        null,
    },

    product: {
      id:
        product.id ||
        data.product_id ||
        null,

      name:
        product.name ||
        null,

      price:
        product.price ?? null,

      city:
        product.city || null,

      image:
        product.image || null,
    },
  };
};



export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  } = useNotifications();

  const renderNotification = ({ item }) => {
    const notification = normalizeNotification(item);

    const isUnread = !notification.read_at;

    const likerName =
      notification.user.name || "Unknown user";

    const likerAvatar = getImageUrl(
      notification.user.avatar
    );

    const productImage = getImageUrl(
      notification.product.image
    );

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (isUnread) {
            markAsRead(notification.id);
          }
        }}
        style={[
          styles.notification,
          isUnread && styles.unreadNotification,
        ]}
      >
        <View style={styles.avatarContainer}>
          {likerAvatar ? (
            <Image
              source={{ uri: likerAvatar }}
              style={styles.avatar}
            />
          ) : (
            <Text style={styles.avatarText}>
              {likerName !== "Unknown user"
                ? likerName.charAt(0).toUpperCase()
                : "?"}
            </Text>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Heart
                size={15}
                color="#EF4444"
                fill="#EF4444"
              />

              <Text style={styles.title}>
                {notification.title}
              </Text>
            </View>

            {isUnread && (
              <View style={styles.unreadDot} />
            )}
          </View>

          <Text style={styles.message}>
            <Text style={styles.likerName}>
              {likerName}
            </Text>{" "}
            liked your product
          </Text>

          {notification.product.id && (
            <View style={styles.productBox}>
              {productImage ? (
                <Image
                  source={{ uri: productImage }}
                  style={styles.productImage}
                />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Bell
                    size={20}
                    color="#CBD5E1"
                  />
                </View>
              )}

              <View style={styles.productInfo}>
                <Text
                  style={styles.productName}
                  numberOfLines={2}
                >
                  {notification.product.name ||
                    "Product"}
                </Text>

                {notification.product.price !==
                  null && (
                  <Text style={styles.productPrice}>
                    {notification.product.price} DH
                  </Text>
                )}

                {notification.product.city && (
                  <View style={styles.cityRow}>
                    <MapPin
                      size={11}
                      color="#94A3B8"
                    />

                    <Text style={styles.productCity}>
                      {notification.product.city}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <Text style={styles.date}>
            {getRelativeTime(
              notification.created_at
            )}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            deleteNotification(notification.id)
          }
          style={styles.deleteButton}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <Trash2
            size={18}
            color="#94A3B8"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>

          <Text style={styles.headerSubtitle}>
            {unreadCount === 0
              ? "You're all caught up"
              : `${unreadCount} unread`}
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={markAllAsRead}
            style={styles.markAllButton}
          >
            <Check
              size={16}
              color="#3D8B16"
            />

            <Text style={styles.markAllText}>
              Mark all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Bell
              size={42}
              color="#CBD5E1"
            />
          </View>

          <Text style={styles.emptyTitle}>
            No notifications
          </Text>

          <Text style={styles.emptyText}>
            You're all caught up.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },

  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
  },

  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D8B16",
  },

  list: {
    padding: 14,
    paddingBottom: 30,
  },

  notification: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },

  unreadNotification: {
    borderColor: "#B9FA3C",
    backgroundColor: "#FAFFF5",
  },

  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 11,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3D8B16",
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3D8B16",
    marginLeft: 7,
  },

  message: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },

  likerName: {
    fontWeight: "800",
    color: "#0F172A",
  },

  productBox: {
    marginTop: 11,
    padding: 8,
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  productImage: {
    width: 62,
    height: 62,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
  },

  productImagePlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  productInfo: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },

  productName: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    color: "#334155",
  },

  productPrice: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: "#3D8B16",
  },

  cityRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  productCity: {
    fontSize: 11,
    color: "#94A3B8",
  },

  date: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },

  deleteButton: {
    padding: 5,
    marginLeft: 5,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 14,
    color: "#94A3B8",
  },
});
