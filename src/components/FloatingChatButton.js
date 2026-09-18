import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { MessageCircle } from "lucide-react-native";
import { navigationRef } from "../navigation/AppNavigator";

const SIZE = 62;

export default function FloatingChatButton() {
  const pan = useRef(new Animated.ValueXY()).current;

  const moved = useRef(false);

  const handlePress = () => {
    console.log("💬 Floating Chat pressed");

    if (navigationRef.isReady()) {
      navigationRef.navigate("ChatList");
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gesture) => {
        return (
          Math.abs(gesture.dx) > 5 ||
          Math.abs(gesture.dy) > 5
        );
      },

      onPanResponderGrant: () => {
        moved.current = false;

        pan.setOffset({
          x: pan.x.__getValue(),
          y: pan.y.__getValue(),
        });

        pan.setValue({
          x: 0,
          y: 0,
        });
      },

      onPanResponderMove: (_, gesture) => {
        if (
          Math.abs(gesture.dx) > 5 ||
          Math.abs(gesture.dy) > 5
        ) {
          moved.current = true;
        }

        pan.setValue({
          x: gesture.dx,
          y: gesture.dy,
        });
      },

      onPanResponderRelease: () => {
        pan.flattenOffset();

        if (!moved.current) {
          handlePress();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePress}
        style={styles.button}
      >
        <MessageCircle
          size={28}
          color="#050505"
          strokeWidth={2.5}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",

    right: 20,
    bottom: 100,

    width: SIZE,
    height: SIZE,

    zIndex: 99999,
    elevation: 99999,
  },

  button: {
    width: SIZE,
    height: SIZE,

    borderRadius: SIZE / 2,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#b8e601",

    elevation: 15,

    shadowColor: "#b8e601",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});