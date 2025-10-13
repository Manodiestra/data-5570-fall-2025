import { View, Text, Button } from "react-native";
import { router } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold mb-2">Page Not Found</Text>
      <Text className="text-gray-600 mb-6">
        The page you’re looking for doesn’t exist.
      </Text>
      <Button title="Go Home" onPress={() => router.replace("/")} />
    </View>
  );
}
