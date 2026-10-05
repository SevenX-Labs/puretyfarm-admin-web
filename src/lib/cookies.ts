/**
 * Client-side Cookie Management Utilities
 * Follows SameSite=Lax and Path=/ conventions for edge route protection.
 */

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = encodeURIComponent(name) + "=";
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }
  return null;
}

export function setCookie(
  name: string,
  value: string,
  days = 7,
  options?: { sameSite?: "Lax" | "Strict" | "None"; secure?: boolean }
): void {
  if (typeof document === "undefined") return;

  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }

  const isSecure =
    options?.secure ??
    (typeof window !== "undefined" && window.location.protocol === "https:");
  const sameSite = options?.sameSite ?? "Lax";
  const secureFlag = isSecure ? "; Secure" : "";

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}${expires}; path=/; SameSite=${sameSite}${secureFlag}`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(
    name
  )}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax`;
}
