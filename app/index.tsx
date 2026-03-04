import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/stores/authStore";

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router.replace]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.black} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
});
