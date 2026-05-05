import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, router, useLocalSearchParams } from "expo-router";
import React from "react";
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
import { getAuthErrorMessage, signInWithEmail } from "../../lib/auth";
import { loginSchema, type LoginInput } from "../../lib/auth-schemas";
import { authHref, href } from "../../lib/router";

function getNextRoute(next: string | string[] | undefined) {
  return typeof next === "string" && next.length > 0 ? next : "/settings";
}

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = getAppTheme(colorScheme === "dark");
  const { next } = useLocalSearchParams<{ next?: string }>();
  const nextRoute = getNextRoute(next);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    const { error } = await signInWithEmail(data.email, data.password);
    if (error) {
      setError("root", { message: getAuthErrorMessage(error) });
      return;
    }

    router.replace(href(nextRoute));
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
          <Text style={[styles.title, { color: theme.text }]}>Sign In</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Sign in to save favorite meeting spots.
          </Text>

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
                  placeholder="Password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                  autoComplete="password"
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

          <Link
            href={authHref("forgot-password", { next: nextRoute })}
            asChild
          >
            <Pressable style={styles.linkWrap}>
              <Text style={[styles.linkText, { color: theme.accent }]}>
                Forgot password?
              </Text>
            </Pressable>
          </Link>

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
                Sign In
              </Text>
            )}
          </Pressable>

          <Link
            href={authHref("signup", { next: nextRoute })}
            asChild
          >
            <Pressable style={styles.secondaryLink}>
              <Text style={[styles.linkText, { color: theme.accent }]}>
                Create account
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
  linkWrap: { alignSelf: "flex-end", marginBottom: 24 },
  button: { borderRadius: 10, alignItems: "center", paddingVertical: 14, marginBottom: 16 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  secondaryLink: { alignItems: "center" },
  linkText: { fontSize: 14, fontWeight: "600" },
});
