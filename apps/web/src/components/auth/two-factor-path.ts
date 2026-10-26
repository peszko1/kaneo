// A password or email code that needs a second factor returns this instead
// of a session.
export function needsTwoFactor(data: unknown) {
  return (
    typeof data === "object" &&
    data !== null &&
    "twoFactorRedirect" in data &&
    data.twoFactorRedirect === true
  );
}

export function buildTwoFactorPath(redirect: string | undefined) {
  const params = new URLSearchParams();
  if (redirect) params.set("redirect", redirect);
  const query = params.toString();
  return query ? `/auth/two-factor?${query}` : "/auth/two-factor";
}
