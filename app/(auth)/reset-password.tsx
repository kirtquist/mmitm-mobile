import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { getAppTheme } from "../../constants/theme";
import { useAuthContext } from "../../hooks/use-auth-context";
import { updatePassword } from "../../lib/auth";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "../../lib/auth-schemas";
import { authHref, href } from "../../lib/router";

function getNextRoute(next: string | string[] | undefined) {
  return typeof next === "string" && next.length > 0 ? next : "/settings";
}

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  const { session, isLoading } = useAuthContext();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const nextRoute = getNextRoute(next);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(authHref("login", { next: nextRoute }));
    }
  }, [isLoading, nextRoute, session]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    const { error } = await updatePassword(data.password);
    if (error) {
      setError("root", { message: error.message });
      return;
    }

    router.replace(href(nextRoute));
  };

  if (isLoading || !session) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.screenBg }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.screenBg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Set a New Password</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Choose a new password for your account.
          </Text>

          {errors.root && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errors.root.message}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Password
                </Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="New password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                  autoComplete="new-password"
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.screenBg,
                      color: theme.text,
                    },
                  ]}
                />
                {errors.password && (
                  <Text style={styles.fieldError}>{errors.password.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Confirm Password
                </Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                  autoComplete="new-password"
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.screenBg,
                      color: theme.text,
                    },
                  ]}
                />
                {errors.confirmPassword && (
                  <Text style={styles.fieldError}>
                    {errors.confirmPassword.message}
                  </Text>
                )}
              </View>
            )}
          />

          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.accent, opacity: isSubmitting ? 0.7 : 1 },
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.iconOnColor} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.iconOnColor }]}>
                Update Password
              </Text>
            )}
          </Pressable>

          <Link
            href={authHref("login", { next: nextRoute })}
            asChild
          >
            <Pressable style={styles.secondaryLink}>
              <Text style={[styles.linkText, { color: theme.accent }]}>
                Back to sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 24 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  fieldError: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  button: { borderRadius: 10, alignItems: "center", paddingVertical: 14, marginBottom: 16 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  secondaryLink: { alignItems: "center" },
  linkText: { fontSize: 14, fontWeight: "600" },
});
