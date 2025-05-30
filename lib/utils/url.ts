export function getBaseUrl(): string {
  // En producción siempre usar la URL de Vercel
  if (typeof window !== "undefined") {
    // En el cliente, detectar si estamos en producción
    if (
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("v0-angular-compras-del-mes")
    ) {
      return "https://v0-angular-compras-del-mes.vercel.app"
    }
  }

  // En desarrollo o server-side
  if (process.env.NODE_ENV === "production") {
    return "https://v0-angular-compras-del-mes.vercel.app"
  }

  return "http://localhost:3000"
}

export function getResetPasswordUrl(): string {
  return `${getBaseUrl()}/reset-password`
}
