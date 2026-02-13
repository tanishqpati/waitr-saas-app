import crypto from "crypto";
import { getUpstashRedis, CART_PREFIX, CART_TTL_SEC } from "../../lib/upstash";

export type CartItem = { menu_item_id: string; quantity: number };

const CART_SESSION_COOKIE = "cart_session";

export function getOrCreateCartSessionId(req: { cookies?: Record<string, string> }, res: { cookie: (name: string, value: string, options: object) => void }): string {
  let id = req.cookies?.[CART_SESSION_COOKIE];
  if (!id) {
    id = crypto.randomUUID();
    res.cookie(CART_SESSION_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CART_TTL_SEC * 1000,
      path: "/",
    });
  }
  return id;
}

export async function getCart(sessionId: string): Promise<CartItem[]> {
  const redis = getUpstashRedis();
  if (!redis) return [];
  const key = `${CART_PREFIX}${sessionId}`;
  const raw = await redis.get(key);
  if (typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is CartItem =>
        x != null && typeof x === "object" && typeof (x as CartItem).menu_item_id === "string" && typeof (x as CartItem).quantity === "number"
    );
  } catch {
    return [];
  }
}

export async function setCart(sessionId: string, items: CartItem[]): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  const key = `${CART_PREFIX}${sessionId}`;
  if (items.length === 0) {
    await redis.del(key);
    return;
  }
  await redis.setex(key, CART_TTL_SEC, JSON.stringify(items));
}
