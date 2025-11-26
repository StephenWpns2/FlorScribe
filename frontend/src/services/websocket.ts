export class WebSocketClient {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private token: string;
  private queryParams: Record<string, string>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    baseUrl: string,
    token: string,
    queryParams: Record<string, string> = {}
  ) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.queryParams = queryParams;
  }

  connect(
    onMessage: (data: Record<string, unknown>) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ): void {
    // Build query string with token and other params
    // Token MUST be first to ensure it's always present
    const params = new URLSearchParams();
    
    // Always append token first (required for authentication)
    if (!this.token) {
      console.error('WebSocket: No token provided! Connection will fail.');
      throw new Error('WebSocket token is required');
    }
    params.append('token', this.token);
    
    // Add other query parameters
    Object.entries(this.queryParams).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });

    const wsUrl = `${this.baseUrl}?${params.toString()}`;
    console.log('Connecting to WebSocket:', wsUrl);
    console.log('WebSocket URL params:', {
      token: 'present',
      ...this.queryParams,
    });
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data.type, data);
        
        if (data.type === 'error') {
          console.error('WebSocket error message:', data.message);
        }
        
        if (data.text) {
          console.log('TRANSCRIPT:', data.text);
        }
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error event:', error);
      // The error event doesn't provide much info, but the onclose will have the details
      if (onError) {
        onError(error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed', {
        code: event.code,
        reason: event.reason || 'No reason provided',
        wasClean: event.wasClean,
        reconnectAttempt: this.reconnectAttempts + 1,
      });

      // Don't reconnect if:
      // - Close code 1008 (Policy Violation) - authentication/authorization error
      // - Close code 1000 (Normal Closure) - intentional close
      // - Close code 1001 (Going Away) - server going down
      // - Close code 1011 (Internal Error) - server error
      const shouldNotReconnect = [1000, 1001, 1008, 1011].includes(event.code);

      if (shouldNotReconnect) {
        console.error('WebSocket closed with error code, not reconnecting:', event.code, event.reason);
        if (onClose) {
          onClose();
        }
        return;
      }

      if (onClose) {
        onClose();
      }

      // Attempt to reconnect for other close codes
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => {
          this.connect(onMessage, onError, onClose);
        }, 1000 * this.reconnectAttempts);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };
  }

  send(data: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

