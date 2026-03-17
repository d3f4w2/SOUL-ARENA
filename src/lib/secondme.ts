import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

const ACCESS_TOKEN_COOKIE = "soul_arena_secondme_access_token";
const REFRESH_TOKEN_COOKIE = "soul_arena_secondme_refresh_token";
const EXPIRES_AT_COOKIE = "soul_arena_secondme_expires_at";
const STATE_COOKIE = "soul_arena_secondme_state";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const REFRESH_WINDOW_MS = 60 * 1000;

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
  name?: string;
  avatarUrl?: string;
  email?: string;
  route?: string;
  bio?: string;
  [key: string]: unknown;
};

const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const now = () => Date.now();

const setSessionCookies = async (payload: TokenPayload) => {
  const cookieStore = await cookies();
  const expiresAt = now() + Math.max(payload.expiresIn - 30, 30) * 1000;

  cookieStore.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, payload.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  cookieStore.set(EXPIRES_AT_COOKIE, String(expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
};

export const clearSecondMeSession = async () => {
  const cookieStore = await cookies();

  for (const name of [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    EXPIRES_AT_COOKIE,
    STATE_COOKIE,
  ]) {
    cookieStore.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 0,
    });
  }
};

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

export const createSecondMeAuthUrl = async () => {
  const state = randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 10,
  });

  const params = new URLSearchParams({
    client_id: env.SECONDME_CLIENT_ID,
    redirect_uri: env.SECONDME_REDIRECT_URI,
    response_type: "code",
    state,
    scope: env.SECONDME_SCOPES.join(" "),
  });

  return `${env.SECONDME_OAUTH_URL}?${params.toString()}`;
};

export const exchangeCodeForSession = async (code: string) => {
  const payload = await exchangeForm(
    joinUrl(env.SECONDME_API_BASE_URL, "/api/oauth/token/code"),
    {
      grant_type: "authorization_code",
      code,
      redirect_uri: env.SECONDME_REDIRECT_URI,
      client_id: env.SECONDME_CLIENT_ID,
      client_secret: env.SECONDME_CLIENT_SECRET,
    },
  );

  await setSessionCookies(payload);
  return payload;
};

export const refreshSecondMeSession = async () => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const payload = await exchangeForm(
    joinUrl(env.SECONDME_API_BASE_URL, "/api/oauth/token/refresh"),
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.SECONDME_CLIENT_ID,
      client_secret: env.SECONDME_CLIENT_SECRET,
    },
  );

  await setSessionCookies(payload);
  return payload;
};

const getCookieSession = async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const expiresAt = Number(cookieStore.get(EXPIRES_AT_COOKIE)?.value ?? "0");
  const authState = cookieStore.get(STATE_COOKIE)?.value;

  return {
    accessToken,
    refreshToken,
    expiresAt,
    authState,
  };
};

export const getValidSecondMeAccessToken = async () => {
  const session = await getCookieSession();

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
    const refreshed = await refreshSecondMeSession();
    return refreshed.accessToken;
  }

  return session.accessToken ?? null;
};

export const getSecondMeSessionSnapshot = async () => {
  const session = await getCookieSession();

  return {
    authenticated: Boolean(session.accessToken || session.refreshToken),
    expiresAt: session.expiresAt || null,
  };
};

export const validateReturnedState = async (state: string | null) => {
  const session = await getCookieSession();

  if (!state || !session.authState) {
    return true;
  }

  return state === session.authState;
};

export const fetchSecondMeJson = async <T>(
  path: string,
  init?: RequestInit,
): Promise<SecondMeEnvelope<T>> => {
  const accessToken = await getValidSecondMeAccessToken();

  if (!accessToken) {
    throw new Error("UNAUTHORIZED");
  }

  const response = await fetch(joinUrl(env.SECONDME_API_BASE_URL, path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    const refreshed = await refreshSecondMeSession().catch(() => null);

    if (!refreshed) {
      throw new Error("UNAUTHORIZED");
    }

    const retry = await fetch(joinUrl(env.SECONDME_API_BASE_URL, path), {
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

export const fetchSecondMeStream = async (
  path: string,
  init?: RequestInit,
) => {
  const accessToken = await getValidSecondMeAccessToken();

  if (!accessToken) {
    throw new Error("UNAUTHORIZED");
  }

  return fetch(joinUrl(env.SECONDME_API_BASE_URL, path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
};
