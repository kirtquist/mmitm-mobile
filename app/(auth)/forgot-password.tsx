import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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
import { resetPasswordForEmail } from "../../lib/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../../lib/auth-schemas";
import { authHref } from "../../lib/router";

function getNextRoute(next: string | string[] | undefined) {
  return typeof next === "string" && next.length > 0 ? next : "/settings";
}

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  const { next } = useLocalSearchParams<{ next?: string }>();
  const nextRoute = getNextRoute(next);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    const { error } = await resetPasswordForEmail(data.email);
    if (error) {
      setError("root", { message: error.message });
      return;
    }
    setSent(true);
  };

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
          <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Enter your email and we&apos;ll send you a reset link.
          </Text>

          {sent ? (
            <>
              <Text style={styles.successText}>
                Reset link sent. Check your email to continue.
              </Text>
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
            </>
          ) : (
            <>
              {errors.root && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errors.root.message}</Text>
                </View>
              )}

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      style={[
                        styles.input,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.screenBg,
                          color: theme.text,
                        },
                      ]}
                    />
                    {errors.email && (
                      <Text style={styles.fieldError}>{errors.email.message}</Text>
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
                    Send Reset Link
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
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  successText: {
    color: "#15803d",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  button: { borderRadius: 10, alignItems: "center", paddingVertical: 14, marginBottom: 16 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  secondaryLink: { alignItems: "center" },
  linkText: { fontSize: 14, fontWeight: "600" },
});
