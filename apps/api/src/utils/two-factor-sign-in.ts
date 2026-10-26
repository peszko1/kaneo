import { eq } from "drizzle-orm";
import type { twoFactor } from "better-auth/plugins";
import db from "../database";
import { userTable } from "../database/schema";

type TwoFactorPlugin = ReturnType<typeof twoFactor>;

// The plugin asks for the second factor only after a password sign-in. An
// email code would skip it, so it gets the same challenge.
export function challengeEmailCodeSignIn(plugin: TwoFactorPlugin) {
  const [signIn, ...rest] = plugin.hooks.after;
  if (!signIn) throw new Error("two-factor plugin has no sign-in hook");
  return {
    ...plugin,
    hooks: {
      ...plugin.hooks,
      after: [
        {
          ...signIn,
          matcher: (context: Parameters<typeof signIn.matcher>[0]) =>
            signIn.matcher(context) || context.path === "/sign-in/email-otp",
        },
        ...rest,
      ],
    },
  } satisfies TwoFactorPlugin;
}

// A magic link signs in on a redirect that cannot show a code step, so
// accounts with two-factor do not get one.
export async function hasTwoFactor(email: string) {
  const [user] = await db
    .select({ enabled: userTable.twoFactorEnabled })
    .from(userTable)
    .where(eq(userTable.email, email.toLowerCase()))
    .limit(1);
  return user?.enabled === true;
}
