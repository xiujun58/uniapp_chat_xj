import { WS_HEARTBEAT_INTERVAL, WS_RECONNECT_DELAY } from '../config/chat';

class ChatSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.heartbeatInterval = options.heartbeatInterval || WS_HEARTBEAT_INTERVAL;
    this.reconnectDelay = options.reconnectDelay || WS_RECONNECT_DELAY;
    this.socketTask = null;
    this.connected = false;
    this.connecting = false;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.manualClose = false;
    this.listeners = new Set();
    this.queue = [];
  }

  connect() {
    if (this.connected || this.connecting) return;

    this.manualClose = false;
    this.connecting = true;
    this.socketTask = uni.connectSocket({
      url: this.url,
      complete: () => {}
    });

    this.socketTask.onOpen(() => {
      this.connecting = false;
      this.connected = true;
      this.flushQueue();
      this.startHeartbeat();
    });

    this.socketTask.onMessage((res) => {
      const parsed = this.safeJsonParse(res.data);
      this.listeners.forEach((cb) => cb(parsed));
    });

    this.socketTask.onError(() => {
      this.connected = false;
      this.connecting = false;
      this.stopHeartbeat();
      this.reconnect();
    });

    this.socketTask.onClose(() => {
      this.connected = false;
      this.connecting = false;
      this.stopHeartbeat();
      if (!this.manualClose) {
        this.reconnect();
      }
    });
  }

  disconnect() {
    this.manualClose = true;
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.socketTask) {
      this.socketTask.close({});
      this.socketTask = null;
    }
    this.connected = false;
    this.connecting = false;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  send(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    if (!this.connected || !this.socketTask) {
      this.queue.push(payload);
      return false;
    }

    this.socketTask.send({ data: payload });
    return true;
  }

  flushQueue() {
    if (!this.queue.length) return;
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach((msg) => this.send(msg));
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', ts: Date.now() });
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  reconnect() {
    if (this.manualClose || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
  }

  safeJsonParse(data) {
    if (typeof data !== 'string') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      return {
        type: 'text',
        content: data,
        from: 'other',
        ts: Date.now()
      };
    }
  }
}

const instances = {};

export function getChatSocket(url) {
  if (!instances[url]) {
    instances[url] = new ChatSocket(url);
  }
  return instances[url];
}
