import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import {
  clearSecondMeBindCodesForSlot,
  clearSecondMeSessionsForSlot,
  getLatestSecondMeBindCodeForSlot,
  getSecondMeBindCode,
  getSecondMeSessionForSlot,
  markSecondMeBindCodeUsed,
  saveSecondMeBindCode,
  saveSecondMeSession,
} from "@/lib/arena-store";
import type {
  ArenaParticipantSlot,
  SecondMeBindCodeRecord,
  SecondMeSessionRecord,
  SecondMeSessionSource,
} from "@/lib/arena-types";
import { getArenaSessionId } from "@/lib/arena-session";
import { env } from "@/lib/env";

const SECONDME_SLOTS = ["alpha", "beta"] as const;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const REFRESH_WINDOW_MS = 60 * 1000;
const SECURE_COOKIE = process.env.NODE_ENV === "production";
const SECONDME_BIND_TTL_MS = 10 * 60 * 1000;

type SecondMeEnvelope<T> = {
  code: number;
  message?: string;
  data?: T;
};

type TokenPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string;
  scope?: string[];
};

export type SecondMeUserInfo = {
  secondMeId?: string;
  id?: string;
  userId?: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string;
  email?: string;
  route?: string;
  bio?: string;
  selfIntroduction?: string;
  [key: string]: unknown;
};

export type SecondMeAuthSlot = (typeof SECONDME_SLOTS)[number];

type SecondMeSessionCookies = {
  accessToken?: string;
  authState?: string;
  expiresAt: number;
  refreshToken?: string;
  returnTo?: string;
};

type SecondMeActRequest = {
  actionControl: string;
  appId?: string;
  message: string;
  sessionId?: string;
  systemPrompt?: string;
};

type SecondMeCallbackContext =
  | {
      kind: "bind";
      bindCode: string;
    }
  | {
      kind: "slot";
      slot: SecondMeAuthSlot;
    };

const getSecondMeConfig = () => {
  if (
    !env.SECONDME_CLIENT_ID ||
    !env.SECONDME_CLIENT_SECRET ||
    !env.SECONDME_REDIRECT_URI ||
    !env.SECONDME_API_BASE_URL ||
    !env.SECONDME_OAUTH_URL
  ) {
    throw new Error("SecondMe is not configured");
  }

  return {
    apiBaseUrl: env.SECONDME_API_BASE_URL,
    clientId: env.SECONDME_CLIENT_ID,
    clientSecret: env.SECONDME_CLIENT_SECRET,
    oauthUrl: env.SECONDME_OAUTH_URL,
    redirectUri: env.SECONDME_REDIRECT_URI,
  };
};

const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const now = () => Date.now();

const toSlot = (slot?: ArenaParticipantSlot | null): SecondMeAuthSlot =>
  slot === "beta" ? "beta" : "alpha";

const accessTokenCookie = (slot: SecondMeAuthSlot) =>
  `soul_arena_secondme_${slot}_access_token`;
const refreshTokenCookie = (slot: SecondMeAuthSlot) =>
  `soul_arena_secondme_${slot}_refresh_token`;
const expiresAtCookie = (slot: SecondMeAuthSlot) =>
  `soul_arena_secondme_${slot}_expires_at`;
const stateCookie = (slot: SecondMeAuthSlot) =>
  `soul_arena_secondme_${slot}_state`;
const returnToCookie = (slot: SecondMeAuthSlot) =>
  `soul_arena_secondme_${slot}_return_to`;

const cookieOptions = {
  httpOnly: true,
  maxAge: COOKIE_MAX_AGE,
  path: "/",
  sameSite: "lax" as const,
  secure: SECURE_COOKIE,
};

const ephemeralCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 10,
  path: "/",
  sameSite: "lax" as const,
  secure: SECURE_COOKIE,
};

const normalizeReturnTo = (value?: string | null) =>
  value && value.startsWith("/") ? value : "/arena";

const createBindCodeValue = () =>
  randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

const parseAuthState = (
  state: string | null,
): { slot: SecondMeAuthSlot; value: string } => {
  if (!state) {
    return { slot: "alpha" as const, value: "" };
  }

  const [maybeSlot, ...rest] = state.split(":");
  if (
    (maybeSlot === "alpha" || maybeSlot === "beta") &&
    rest.length > 0
  ) {
    return {
      slot: maybeSlot,
      value: state,
    };
  }

  return { slot: "alpha" as const, value: state };
};

const parseCallbackState = (state: string | null): SecondMeCallbackContext => {
  if (state?.startsWith("bind:")) {
    const [, bindCode] = state.split(":");

    if (bindCode) {
      return {
        bindCode,
        kind: "bind",
      };
    }
  }

  return {
    kind: "slot",
    slot: parseAuthState(state).slot,
  };
};

const getCookieSession = async (
  slot: SecondMeAuthSlot,
): Promise<SecondMeSessionCookies> => {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get(accessTokenCookie(slot))?.value,
    authState: cookieStore.get(stateCookie(slot))?.value,
    expiresAt: Number(cookieStore.get(expiresAtCookie(slot))?.value ?? "0"),
    refreshToken: cookieStore.get(refreshTokenCookie(slot))?.value,
    returnTo: cookieStore.get(returnToCookie(slot))?.value,
  };
};

const clearCookie = async (name: string) => {
  const cookieStore = await cookies();
  cookieStore.set(name, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: SECURE_COOKIE,
  });
};

const clearSecondMeTransientCookies = async (slot: SecondMeAuthSlot) => {
  await clearCookie(stateCookie(slot));
  await clearCookie(returnToCookie(slot));
};

const setSessionCookies = async (
  slot: SecondMeAuthSlot,
  payload: TokenPayload,
) => {
  const cookieStore = await cookies();
  const expiresAt = now() + Math.max(payload.expiresIn - 30, 30) * 1000;

  cookieStore.set(accessTokenCookie(slot), payload.accessToken, cookieOptions);
  cookieStore.set(refreshTokenCookie(slot), payload.refreshToken, cookieOptions);
  cookieStore.set(expiresAtCookie(slot), String(expiresAt), cookieOptions);
};

const tokenPayloadToSessionInput = ({
  bindCode,
  payload,
  sessionId,
  slot,
  source,
}: {
  bindCode?: string | null;
  payload: TokenPayload;
  sessionId: string;
  slot: SecondMeAuthSlot;
  source: SecondMeSessionSource;
}) => ({
  accessToken: payload.accessToken,
  bindCode: bindCode ?? null,
  expiresAt: now() + Math.max(payload.expiresIn - 30, 30) * 1000,
  refreshToken: payload.refreshToken,
  sessionId,
  slot,
  source,
});

const exchangeForm = async (
  endpoint: string,
  params: Record<string, string>,
): Promise<TokenPayload> => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
    cache: "no-store",
  });

  const result = (await response.json()) as SecondMeEnvelope<TokenPayload>;

  if (!response.ok || result.code !== 0 || !result.data) {
    throw new Error(result.message ?? "SecondMe token request failed");
  }

  return result.data;
};

export const getSecondMeAuthSlots = () => [...SECONDME_SLOTS];

export const createSecondMeAuthUrl = async (
  slot: SecondMeAuthSlot = "alpha",
  returnTo?: string,
) => {
  const config = getSecondMeConfig();
  const authSlot = toSlot(slot);
  const state = `${authSlot}:${randomUUID()}`;
  const cookieStore = await cookies();

  cookieStore.set(stateCookie(authSlot), state, ephemeralCookieOptions);
  cookieStore.set(
    returnToCookie(authSlot),
    normalizeReturnTo(returnTo),
    ephemeralCookieOptions,
  );

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: env.SECONDME_SCOPES.join(" "),
    state,
  });

  return `${config.oauthUrl}?${params.toString()}`;
};

export const resolveSecondMeAuthSlotFromState = (
  state: string | null,
): SecondMeAuthSlot => {
  const context = parseCallbackState(state);
  return context.kind === "slot" ? context.slot : "alpha";
};

export const exchangeCodeForTokenPayload = async (code: string) => {
  const config = getSecondMeConfig();

  return exchangeForm(joinUrl(config.apiBaseUrl, "/api/oauth/token/code"), {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });
};

const refreshWithToken = async (refreshToken: string) => {
  const config = getSecondMeConfig();

  return exchangeForm(joinUrl(config.apiBaseUrl, "/api/oauth/token/refresh"), {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
};

const getStoredSecondMeSession = async (slot: SecondMeAuthSlot) => {
  const sessionId = await getArenaSessionId();

  return getSecondMeSessionForSlot({
    sessionId,
    slot,
  });
};

const saveStoredSecondMeSessionForTarget = async ({
  bindCode,
  payload,
  sessionId,
  slot,
  source,
}: {
  bindCode?: string | null;
  payload: TokenPayload;
  sessionId: string;
  slot: SecondMeAuthSlot;
  source: SecondMeSessionSource;
}) =>
  saveSecondMeSession(
    tokenPayloadToSessionInput({
      bindCode,
      payload,
      sessionId,
      slot,
      source,
    }),
  );

const refreshStoredSecondMeSession = async (
  session: SecondMeSessionRecord,
) => {
  const payload = await refreshWithToken(session.refreshToken);

  await saveStoredSecondMeSessionForTarget({
    bindCode: session.bindCode,
    payload,
    sessionId: session.sessionId,
    slot: session.slot,
    source: session.source,
  });

  return payload;
};

const assertSecondMeBindCodeUsable = (record: SecondMeBindCodeRecord | null) => {
  if (!record) {
    throw new Error("Invalid bind code");
  }

  if (record.usedAt) {
    throw new Error("Bind code has already been used");
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    throw new Error("Bind code has expired");
  }

  return record;
};

export const exchangeCodeForSession = async (
  code: string,
  slot: SecondMeAuthSlot = "alpha",
) => {
  const authSlot = toSlot(slot);
  const payload = await exchangeCodeForTokenPayload(code);
  const sessionId = await getArenaSessionId();

  await setSessionCookies(authSlot, payload);
  await saveStoredSecondMeSessionForTarget({
    payload,
    sessionId,
    slot: authSlot,
    source: "browser_oauth",
  });
  await clearSecondMeTransientCookies(authSlot);
  return payload;
};

export const refreshSecondMeSession = async (
  slot: SecondMeAuthSlot = "alpha",
) => {
  const authSlot = toSlot(slot);
  const storedSession = await getStoredSecondMeSession(authSlot);

  if (storedSession) {
    return refreshStoredSecondMeSession(storedSession);
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(refreshTokenCookie(authSlot))?.value;

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const payload = await refreshWithToken(refreshToken);

  await setSessionCookies(authSlot, payload);
  const sessionId = await getArenaSessionId();
  await saveStoredSecondMeSessionForTarget({
    payload,
    sessionId,
    slot: authSlot,
    source: "browser_oauth",
  });
  return payload;
};

export const clearSecondMeSession = async (slot?: SecondMeAuthSlot) => {
  const targets = slot ? [toSlot(slot)] : [...SECONDME_SLOTS];
  const sessionId = await getArenaSessionId();

  await Promise.all(
    targets.flatMap((target) => [
      clearCookie(accessTokenCookie(target)),
      clearCookie(refreshTokenCookie(target)),
      clearCookie(expiresAtCookie(target)),
      clearCookie(stateCookie(target)),
      clearCookie(returnToCookie(target)),
      clearSecondMeSessionsForSlot({
        sessionId,
        slot: target,
      }),
      clearSecondMeBindCodesForSlot({
        sessionId,
        slot: target,
      }),
    ]),
  );
};

export const createSecondMeBindCodeForSlot = async (
  slot: ArenaParticipantSlot,
) => {
  const authSlot = toSlot(slot);
  const sessionId = await getArenaSessionId();

  await clearSecondMeSessionsForSlot({
    sessionId,
    slot: authSlot,
  });
  await clearSecondMeBindCodesForSlot({
    sessionId,
    slot: authSlot,
  });

  return saveSecondMeBindCode({
    code: createBindCodeValue(),
    expiresAt: new Date(Date.now() + SECONDME_BIND_TTL_MS).toISOString(),
    sessionId,
    slot: authSlot,
  });
};

export const buildSecondMeBindAuthUrl = async (bindCode: string) => {
  const config = getSecondMeConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: env.SECONDME_SCOPES.join(" "),
    state: `bind:${bindCode}`,
  });

  return `${config.oauthUrl}?${params.toString()}`;
};

export const getSecondMeBindCodeRecord = async (code: string) =>
  getSecondMeBindCode(code);

export const getLatestSecondMeBindCodeForCurrentSession = async (
  slot: ArenaParticipantSlot,
) => {
  const sessionId = await getArenaSessionId();

  return getLatestSecondMeBindCodeForSlot({
    sessionId,
    slot: toSlot(slot),
  });
};

export const completeSecondMeBindCode = async (
  bindCodeValue: string,
  payload: TokenPayload,
) => {
  const bindCode = assertSecondMeBindCodeUsable(
    await getSecondMeBindCode(bindCodeValue),
  );

  await saveStoredSecondMeSessionForTarget({
    bindCode: bindCode.code,
    payload,
    sessionId: bindCode.sessionId,
    slot: bindCode.slot,
    source: "qr_bind",
  });
  await markSecondMeBindCodeUsed({
    code: bindCode.code,
    usedAt: new Date().toISOString(),
  });

  return bindCode;
};

export const resolveSecondMeCallbackContext = (
  state: string | null,
): SecondMeCallbackContext => parseCallbackState(state);

export const getValidSecondMeAccessToken = async (
  slot: SecondMeAuthSlot = "alpha",
) => {
  const authSlot = toSlot(slot);
  const storedSession = await getStoredSecondMeSession(authSlot);

  if (storedSession) {
    if (storedSession.expiresAt - now() > REFRESH_WINDOW_MS) {
      return storedSession.accessToken;
    }

    const refreshed = await refreshStoredSecondMeSession(storedSession).catch(
      () => null,
    );

    if (refreshed) {
      return refreshed.accessToken;
    }
  }

  const session = await getCookieSession(authSlot);

  if (!session.accessToken && !session.refreshToken) {
    return null;
  }

  if (
    session.accessToken &&
    session.expiresAt &&
    session.expiresAt - now() > REFRESH_WINDOW_MS
  ) {
    return session.accessToken;
  }

  if (session.refreshToken) {
    const refreshed = await refreshSecondMeSession(slot);
    return refreshed.accessToken;
  }

  return session.accessToken ?? null;
};

export const getSecondMeSessionSnapshot = async (
  slot: SecondMeAuthSlot = "alpha",
) => {
  const authSlot = toSlot(slot);
  const storedSession = await getStoredSecondMeSession(authSlot);

  if (storedSession) {
    return {
      authenticated: Boolean(
        storedSession.accessToken || storedSession.refreshToken,
      ),
      expiresAt: storedSession.expiresAt || null,
    };
  }

  const session = await getCookieSession(authSlot);

  return {
    authenticated: Boolean(session.accessToken || session.refreshToken),
    expiresAt: session.expiresAt || null,
  };
};

export const getSecondMeReturnTarget = async (
  slot: SecondMeAuthSlot = "alpha",
) => {
  const session = await getCookieSession(toSlot(slot));
  return normalizeReturnTo(session.returnTo);
};

export const validateReturnedState = async (
  slot: SecondMeAuthSlot,
  state: string | null,
) => {
  const session = await getCookieSession(toSlot(slot));

  if (!state || !session.authState) {
    return true;
  }

  return session.authState === state;
};

export const fetchSecondMeJsonForSlot = async <T>(
  slot: SecondMeAuthSlot,
  path: string,
  init?: RequestInit,
): Promise<SecondMeEnvelope<T>> => {
  const config = getSecondMeConfig();
  const accessToken = await getValidSecondMeAccessToken(slot);

  if (!accessToken) {
    throw new Error("UNAUTHORIZED");
  }

  const response = await fetch(joinUrl(config.apiBaseUrl, path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    const refreshed = await refreshSecondMeSession(slot).catch(() => null);

    if (!refreshed) {
      throw new Error("UNAUTHORIZED");
    }

    const retry = await fetch(joinUrl(config.apiBaseUrl, path), {
      ...init,
      headers: {
        Authorization: `Bearer ${refreshed.accessToken}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    return (await retry.json()) as SecondMeEnvelope<T>;
  }

  return (await response.json()) as SecondMeEnvelope<T>;
};

export const fetchSecondMeStreamForSlot = async (
  slot: SecondMeAuthSlot,
  path: string,
  init?: RequestInit,
) => {
  const config = getSecondMeConfig();
  const accessToken = await getValidSecondMeAccessToken(slot);

  if (!accessToken) {
    throw new Error("UNAUTHORIZED");
  }

  return fetch(joinUrl(config.apiBaseUrl, path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
};

const extractSecondMeStreamText = (payload: string) => {
  let combined = "";

  for (const rawLine of payload.split(/\r?\n/)) {
    if (!rawLine.startsWith("data:")) {
      continue;
    }

    const data = rawLine.slice(5).trim();

    if (!data || data === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const delta = parsed.choices?.[0]?.delta?.content;

      if (typeof delta === "string") {
        combined += delta;
      }
    } catch {
      combined += data;
    }
  }

  return combined.trim();
};

export const fetchSecondMeActForSlot = async <T>(
  slot: SecondMeAuthSlot,
  payload: SecondMeActRequest,
) => {
  const response = await fetchSecondMeStreamForSlot(
    slot,
    "/api/secondme/act/stream",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const body = await response.text();
  const content = extractSecondMeStreamText(body);

  if (!content) {
    throw new Error("SecondMe act stream returned empty content");
  }

  return JSON.parse(content) as T;
};

export const fetchSecondMeJson = async <T>(
  path: string,
  init?: RequestInit,
) => fetchSecondMeJsonForSlot<T>("alpha", path, init);

export const fetchSecondMeStream = async (
  path: string,
  init?: RequestInit,
) => fetchSecondMeStreamForSlot("alpha", path, init);
