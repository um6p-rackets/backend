import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { WsAuthService } from './ws-auth.service.js';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly wsAuth: WsAuthService) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const userId = await this.wsAuth.authenticate(socket);
      await socket.join(`user:${userId}`);
    } catch {
      socket.disconnect(true);
    }
  }

  sendToUser(userId: string, notification: unknown): void {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }
}