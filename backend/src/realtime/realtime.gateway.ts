import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { SessionStatus } from '../sessions/entities/session.entity';

@WebSocketGateway({
  path: '/api/realtime/ws',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private realtimeService: RealtimeService,
    private sessionsService: SessionsService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: WebSocket, ...args: any[]) {
    const clientId = this.getClientId(client);
    this.logger.log(`[WS] Connection attempt from client ${clientId}`);

    try {
      // Extract token from query string
      // The URL is available from the upgrade request, not directly on client
      const request = args[0] as any; // The HTTP upgrade request
      const urlString = request?.url || client.url || '';
      
      if (!urlString) {
        this.logger.warn(`[WS] ${clientId} - No URL found in connection`);
        client.close(1008, 'Policy Violation: Invalid connection');
        return;
      }
      
      const url = new URL(urlString, 'ws://localhost');
      console.log('url', url);
      // const token= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjM2OTQ4MTUsImV4cCI6MTc2MzY5NjYxNX0.eS5TF-dxdRcD8YY9-qvbC9oCOGRJmBgyoXn5ZZrgn1w"
      const token = url.searchParams.get('token');

      this.logger.debug(`[WS] ${clientId} - URL: ${url} Token present: ${token ? 'true' : 'false'}`);

      if (!token) {
        this.logger.warn(`[WS] ${clientId} - Connection rejected: Missing token`);
        client.close(1008, 'Policy Violation: Missing token');
        return;
      }

      // Verify token
      let payload;
      try {
        payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
        });
        this.logger.debug(`[WS] ${clientId} - Token verified for user: ${payload.sub}`);
      } catch (error) {
        this.logger.warn(`[WS] ${clientId} - Token verification failed: ${error.message}`);
        client.close(1008, 'Policy Violation: Invalid token');
        return;
      }

      if (payload.type !== 'access') {
        this.logger.warn(`[WS] ${clientId} - Connection rejected: Invalid token type (expected 'access', got '${payload.type}')`);
        client.close(1008, 'Policy Violation: Invalid token');
        return;
      }

      const userId = payload.sub;
      const user = await this.usersService.findById(userId);

      if (!user || !user.isActive) {
        this.logger.warn(`[WS] ${clientId} - Connection rejected: User ${userId} not found or inactive`);
        client.close(1008, 'Policy Violation: User not found or inactive');
        return;
      }

      // Get query parameters
      const sessionId = url.searchParams.get('session_id');
      const patientId = url.searchParams.get('patient_id');
      const patientName = url.searchParams.get('patient_name');
      const patientEntityId = url.searchParams.get('patient_entity_id');

      this.logger.debug(`[WS] ${clientId} - Query params: session_id=${sessionId}, patient_id=${patientId}, patient_name=${patientName}, patient_entity_id=${patientEntityId}`);

      // Get or create session
      let session;
      if (sessionId) {
        session = await this.sessionsService.findById(parseInt(sessionId));
        if (!session || session.userId !== userId) {
          this.logger.warn(`[WS] ${clientId} - Session ${sessionId} not found or not owned by user ${userId}`);
          client.close(1008, 'Policy Violation: Session not found or not owned by user');
          return;
        }
        this.logger.log(`[WS] ${clientId} - Resuming existing session ${session.id}`);
      } else {
        const sessionData: any = {
          userId,
          patientId: patientId || null,
          patientName: patientName || null,
          status: SessionStatus.ACTIVE,
        };
        
        // Add patientEntityId if provided
        if (patientEntityId) {
          sessionData.patientEntityId = parseInt(patientEntityId);
        }
        
        session = await this.sessionsService.create(sessionData);
        this.logger.log(`[WS] ${clientId} - Created new session ${session.id} for user ${userId}`);
      }

      // Store user and session info on client
      (client as any).userId = userId;
      (client as any).sessionId = session.id;
      (client as any).user = user;
      (client as any).connectedAt = new Date();
      (client as any).clientId = clientId;

      // Initialize AssemblyAI connection
      try {
        this.logger.debug(`[WS] ${clientId} - Initializing AssemblyAI session...`);
        const assemblyaiSessionId = await this.realtimeService.initializeSession(
          client,
          session.id,
        );

        // Send session started message
        const sessionStartedMsg = {
          type: 'session_started',
          session_id: session.id,
          assemblyai_session_id: assemblyaiSessionId,
        };
        client.send(JSON.stringify(sessionStartedMsg));
        this.logger.debug(`[WS] ${clientId} - Sent session_started message`);

        this.logger.log(
          `[WS] ${clientId} - ✅ Connected successfully: User ${userId} (${user.email}), Session ${session.id}, AssemblyAI Session ${assemblyaiSessionId}`,
        );
      } catch (error) {
        this.logger.error(`[WS] ${clientId} - Failed to initialize AssemblyAI: ${error.message}`, error.stack);
        client.send(
          JSON.stringify({
            type: 'error',
            message: error.message || 'Failed to connect to transcription service',
          }),
        );
        client.close(1011, 'Internal Error');
      }
    } catch (error) {
      this.logger.error(`[WS] ${clientId} - Connection error: ${error.message}`, error.stack);
      client.close(1008, 'Policy Violation: Invalid token');
    }
  }

  async handleDisconnect(client: WebSocket) {
    const clientId = (client as any).clientId || this.getClientId(client);
    const userId = (client as any).userId;
    const sessionId = (client as any).sessionId;
    const connectedAt = (client as any).connectedAt;

    if (sessionId) {
      const duration = connectedAt
        ? Math.round((Date.now() - connectedAt.getTime()) / 1000)
        : 0;

      this.logger.log(
        `[WS] ${clientId} - Disconnecting: User ${userId}, Session ${sessionId}, Duration: ${duration}s`,
      );

      try {
        // Update session status
        await this.sessionsService.updateStatus(
          sessionId,
          SessionStatus.ENDED,
          new Date(),
        );
        this.logger.debug(`[WS] ${clientId} - Session ${sessionId} marked as ended`);

        // Cleanup AssemblyAI connection
        await this.realtimeService.cleanupSession(client);
        this.logger.debug(`[WS] ${clientId} - AssemblyAI session cleaned up`);
      } catch (error) {
        this.logger.error(`[WS] ${clientId} - Error during disconnect cleanup: ${error.message}`);
      }
    } else {
      this.logger.warn(`[WS] ${clientId} - Disconnected without active session`);
    }

    this.logger.log(`[WS] ${clientId} - ✅ Disconnected`);
  }

  private getClientId(client: WebSocket): string {
    if ((client as any).clientId) {
      return (client as any).clientId;
    }
    // Generate a short ID for logging
    const id = Math.random().toString(36).substring(2, 9);
    (client as any).clientId = id;
    return id;
  }

  // Note: WebSocket binary messages are handled in handleConnection
  // The @SubscribeMessage decorator is for JSON messages
  // Binary audio data is handled directly in the connection handler
}

