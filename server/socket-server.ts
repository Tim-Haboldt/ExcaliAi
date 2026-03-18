import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { unsealData } from "iron-session";
import { parse as parseCookie } from "cookie";
import dotenv from "dotenv";
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    SocketSessionData,
    Collaborator,
} from "./socket-events";

dotenv.config();

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters.");
}

const COOKIE_NAME = "excali-ai-session";
const PORT = Number(process.env.SOCKET_PORT ?? 3001);

interface SocketData extends SocketSessionData {
    currentProjectId: string | null;
}

type AppServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
>;
type AppSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
>;

const projectRooms = new Map<string, Map<string, Collaborator>>();

function getCollaboratorList(projectId: string): Collaborator[] {
    const room = projectRooms.get(projectId);
    if (!room) {
        return [];
    }

    const uniqueByAccount = new Map<string, Collaborator>();
    for (const collaborator of room.values()) {
        const existing = uniqueByAccount.get(collaborator.accountId);
        if (!existing || (collaborator.pointer && !existing.pointer)) {
            uniqueByAccount.set(collaborator.accountId, collaborator);
        }
    }

    return Array.from(uniqueByAccount.values());
}

function broadcastPresence(socketIoServer: AppServer, projectId: string) {
    const collaborators = getCollaboratorList(projectId);
    socketIoServer.to(projectId).emit("presence:update", collaborators);
}

function removeFromCurrentProject(
    socket: AppSocket,
    socketIoServer: AppServer,
) {
    const previousProjectId = socket.data.currentProjectId;
    if (!previousProjectId) {
        return;
    }

    socket.leave(previousProjectId);

    const room = projectRooms.get(previousProjectId);
    if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
            projectRooms.delete(previousProjectId);
        }
    }

    socket.data.currentProjectId = null;
    broadcastPresence(socketIoServer, previousProjectId);
}

const httpServer = createServer();

const socketIoServer: AppServer = new Server(httpServer, {
    cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        credentials: true,
    },
});

socketIoServer.use(async (socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) {
            next(new Error("No session cookie"));

            return;
        }

        const cookies = parseCookie(cookieHeader);
        const sealedSession = cookies[COOKIE_NAME];
        if (!sealedSession) {
            next(new Error("No session cookie"));

            return;
        }

        const session = await unsealData<SocketSessionData>(sealedSession, {
            password: SESSION_SECRET,
        });

        if (!session.accountId || !session.username) {
            next(new Error("Invalid session"));

            return;
        }

        socket.data = {
            accountId: session.accountId,
            username: session.username,
            currentProjectId: null,
        };
        next();
    } catch {
        next(new Error("Authentication failed"));
    }
});

socketIoServer.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.data.username} (${socket.id})`);

    socket.on("project:join", (projectId, callback) => {
        removeFromCurrentProject(socket, socketIoServer);

        socket.join(projectId);
        socket.data.currentProjectId = projectId;

        if (!projectRooms.has(projectId)) {
            projectRooms.set(projectId, new Map());
        }

        const room = projectRooms.get(projectId)!;
        room.set(socket.id, {
            socketId: socket.id,
            accountId: socket.data.accountId,
            username: socket.data.username,
            pointer: null,
            button: "up",
        });

        broadcastPresence(socketIoServer, projectId);
        callback({ success: true });
    });

    socket.on("project:leave", () => {
        removeFromCurrentProject(socket, socketIoServer);
    });

    socket.on("canvas:update", (payload) => {
        const projectId = socket.data.currentProjectId;
        if (!projectId) {
            return;
        }

        socket.to(projectId).emit("canvas:remote-update", {
            elements: payload.elements,
            senderId: socket.data.accountId,
        });
    });

    socket.on("cursor:move", (payload) => {
        const projectId = socket.data.currentProjectId;
        if (!projectId) {
            return;
        }

        const room = projectRooms.get(projectId);
        const collaborator = room?.get(socket.id);
        if (collaborator) {
            collaborator.pointer = payload.pointer;
            collaborator.button = payload.button;
        }

        socket.to(projectId).emit("cursor:update", {
            senderId: socket.data.accountId,
            username: socket.data.username,
            pointer: payload.pointer,
            button: payload.button,
        });
    });

    socket.on("chat:message", (payload) => {
        const projectId = socket.data.currentProjectId;
        if (!projectId) {
            return;
        }

        socket.to(projectId).emit("chat:remote-message", {
            message: payload.message,
            senderId: socket.data.accountId,
        });
    });

    socket.on("disconnect", () => {
        console.log(
            `[socket] disconnected: ${socket.data.username} (${socket.id})`,
        );
        removeFromCurrentProject(socket, socketIoServer);
    });
});

httpServer.listen(PORT, () => {
    console.log(`[socket] server listening on port ${PORT}`);
});
