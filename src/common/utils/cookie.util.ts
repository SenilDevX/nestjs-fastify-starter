import type { FastifyReply } from 'fastify';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const TEMP_TOKEN_MAX_AGE = 5 * 60; // 5 minutes

const baseCookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
};

export const setAccessTokenCookie = (reply: FastifyReply, token: string) => {
  reply.setCookie('access_token', token, {
    ...baseCookieOptions,
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
};

export const setRefreshTokenCookie = (reply: FastifyReply, token: string) => {
  reply.setCookie('refresh_token', token, {
    ...baseCookieOptions,
    path: '/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
};

export const setTempTokenCookie = (reply: FastifyReply, token: string) => {
  reply.setCookie('temp_token', token, {
    ...baseCookieOptions,
    path: '/auth/2fa',
    maxAge: TEMP_TOKEN_MAX_AGE,
  });
};

export const clearAuthCookies = (reply: FastifyReply) => {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/auth' });
  reply.clearCookie('temp_token', { path: '/auth/2fa' });
};
