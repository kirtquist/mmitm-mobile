import type { Href } from "expo-router";

type AuthRouteName =
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password"
  | "redirect";

type RouteParamValue = string | number | boolean | null | undefined;

export function href(route: string): Href {
  return route as Href;
}

export function authHref(
  route: AuthRouteName,
  params?: Record<string, RouteParamValue>
): Href {
  const query = params
    ? Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        )
        .join("&")
    : "";

  return `/(auth)/${route}${query ? `?${query}` : ""}` as Href;
}
