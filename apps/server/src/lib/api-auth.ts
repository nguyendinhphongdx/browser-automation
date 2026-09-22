import { auth } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";

export interface RequestUser {
  id: string;
  role: string;
  email: string | null;
  name: string | null;
}

/**
 * Resolves the current user for an API route, accepting either auth
 * mechanism this app uses:
 *  1. Custom Bearer JWT (desktop app / standalone login) via
 *     `Authorization: Bearer <token>`.
 *  2. NextAuth session cookie (web app), via `auth()`.
 *
 * The Bearer token is checked first since it is the more explicit signal;
 * falling back to the session cookie lets same-origin web UI (e.g. the
 * admin panel) call these routes without having to manually attach a
 * token.
 */
export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const jwtUser = await getUserFromRequest(request);
  if (jwtUser) {
    return {
      id: jwtUser.id,
      role: jwtUser.role,
      email: jwtUser.email,
      name: jwtUser.name,
    };
  }

  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    };
  }

  return null;
}

type AuthResult =
  | { user: RequestUser; error?: undefined }
  | { user?: undefined; error: Response };

/** Same as `getRequestUser`, but returns a ready-to-return 401 when absent. */
export async function requireUser(request: Request): Promise<AuthResult> {
  const user = await getRequestUser(request);
  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

/** Same as `requireUser`, but also enforces `role === "ADMIN"` (403). */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const user = await getRequestUser(request);
  if (!user || user.role !== "ADMIN") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
