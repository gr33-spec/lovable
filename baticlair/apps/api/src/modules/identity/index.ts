export { IdentityModule } from "./identity.module.js";
export type { AuthenticatedUser } from "./authenticated-user.js";
export { CurrentUser } from "./http/current-user.decorator.js";
export { Public, API_KEY_HEADER, hashApiKey, type ApiKeyContext, type RequestWithUser } from "./http/session.guard.js";
export { AUTH_BASE_PATH, type Auth } from "./infrastructure/auth.js";
