import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

const ROOM_PREFIX = "restaurant:";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_restaurant", (restaurantId: string) => {
      if (typeof restaurantId === "string" && restaurantId) {
        socket.join(ROOM_PREFIX + restaurantId);
      }
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function roomForRestaurant(restaurantId: string): string {
  return ROOM_PREFIX + restaurantId;
}
