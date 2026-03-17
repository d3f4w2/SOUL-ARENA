const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

const parseScopes = (value: string | undefined) =>
  (value ?? "user.info,user.info.shades,user.info.softmemory,chat,note.add,voice")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

export const env = {
  SECONDME_CLIENT_ID: required(
    process.env.SECONDME_CLIENT_ID,
    "SECONDME_CLIENT_ID",
  ),
  SECONDME_CLIENT_SECRET: required(
    process.env.SECONDME_CLIENT_SECRET,
    "SECONDME_CLIENT_SECRET",
  ),
  SECONDME_REDIRECT_URI: required(
    process.env.SECONDME_REDIRECT_URI,
    "SECONDME_REDIRECT_URI",
  ),
  SECONDME_API_BASE_URL: required(
    process.env.SECONDME_API_BASE_URL,
    "SECONDME_API_BASE_URL",
  ),
  SECONDME_OAUTH_URL: required(
    process.env.SECONDME_OAUTH_URL,
    "SECONDME_OAUTH_URL",
  ),
  SECONDME_SCOPES: parseScopes(process.env.SECONDME_SCOPES),
  ZHIHU_APP_KEY: required(process.env.ZHIHU_APP_KEY, "ZHIHU_APP_KEY"),
  ZHIHU_APP_SECRET: required(
    process.env.ZHIHU_APP_SECRET,
    "ZHIHU_APP_SECRET",
  ),
  ZHIHU_OPENAPI_BASE_URL: required(
    process.env.ZHIHU_OPENAPI_BASE_URL,
    "ZHIHU_OPENAPI_BASE_URL",
  ),
} as const;
