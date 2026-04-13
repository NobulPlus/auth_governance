export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/requests", "/reviews", "/users", "/audit"],
};

