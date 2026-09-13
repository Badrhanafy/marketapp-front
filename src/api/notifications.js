import api from "./client";

/*
|--------------------------------------------------------------------------
| Get Notifications
|--------------------------------------------------------------------------
*/

export const getNotifications = async (page = 1) => {
  const response = await api.get("/notifications", {
    params: {
      page,
    },
  });

  return response.data;
};


/*
|--------------------------------------------------------------------------
| Mark One Notification As Read
|--------------------------------------------------------------------------
*/

export const markNotificationAsRead = async (notificationId) => {
  const response = await api.post(
    `/notifications/${notificationId}/read`
  );

  return response.data;
};


/*
|--------------------------------------------------------------------------
| Mark All Notifications As Read
|--------------------------------------------------------------------------
*/

export const markAllNotificationsAsRead = async () => {
  const response = await api.post(
    "/notifications/read-all"
  );

  return response.data;
};


/*
|--------------------------------------------------------------------------
| Delete Notification
|--------------------------------------------------------------------------
*/

export const deleteNotification = async (notificationId) => {
  const response = await api.delete(
    `/notifications/${notificationId}`
  );

  return response.data;
};