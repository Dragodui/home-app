import { Stack, useRouter } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import { Button, EmptyState, Screen } from "@/components/ui";
import { useI18n } from "@/stores/i18nStore";

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t.notFound.title }} />
      <Screen width="sm">
        <EmptyState
          icon={CircleAlert}
          title={t.notFound.message}
          action={<Button title={t.notFound.goHome} onPress={() => router.replace("/")} />}
        />
      </Screen>
    </>
  );
}
