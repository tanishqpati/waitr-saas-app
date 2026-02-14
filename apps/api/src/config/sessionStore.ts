import Redis from "ioredis";
import { config } from "./env";

const REFRESH_PREFIX = "waitr:refresh:";
const REFRESH_TTL_SEC = 14 * 24 * 60 * 60; // 14 days in seconds

export interface SessionStore {
  set(jti: string, userId: string, ttlSeconds?: number): Promise<void>;
  get(jti: string): Promise<string | null>;
  delete(jti: string): Promise<void>;
  /** Ping for health check. No-op for in-memory; throws if Redis unreachable. */
  ping(): Promise<void>;
}

const memory = new Map<string, { userId: string; timeout: ReturnType<typeof setTimeout> }>();

export const memoryStore: SessionStore = {
  async set(jti: string, userId: string, ttlSeconds: number = REFRESH_TTL_SEC) {
    const key = REFRESH_PREFIX + jti;
    const existing = memory.get(key);
    if (existing) clearTimeout(existing.timeout);
    const timeout = setTimeout(() => memory.delete(key), ttlSeconds * 1000);
    memory.set(key, { userId, timeout });
  },
  async get(jti: string) {
    const entry = memory.get(REFRESH_PREFIX + jti);
    return entry ? entry.userId : null;
  },
  async delete(jti: string) {
    const key = REFRESH_PREFIX + jti;
    const existing = memory.get(key);
    if (existing) clearTimeout(existing.timeout);
    memory.delete(key);
  },
  async ping() {
    /* in-memory: always healthy */
  },
};

function createRedisStore(): SessionStore {
  const redis = new Redis(config.redisUrl!, { maxRetriesPerRequest: null });
  return {
    async set(jti: string, userId: string, ttlSeconds: number = REFRESH_TTL_SEC) {
      await redis.setex(REFRESH_PREFIX + jti, ttlSeconds, userId);
    },
    async get(jti: string) {
      const v = await redis.get(REFRESH_PREFIX + jti);
      return v ?? null;
    },
    async delete(jti: string) {
      await redis.del(REFRESH_PREFIX + jti);
    },
    async ping() {
      await redis.ping();
    },
  };
}

let store: SessionStore = memoryStore;

if (config.redisUrl) {
  store = createRedisStore();
}

export const sessionStore: SessionStore = store;
