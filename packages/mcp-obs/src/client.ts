import type { LiveContextReader } from "@clober/shared";
import {
  EventSubscription,
  type OBSRequestTypes,
  type OBSResponseTypes,
  OBSWebSocket,
} from "obs-websocket-js";

/** The part of obs-websocket-js the tools use; tests inject a fake. */
export interface ObsRequester {
  call<T extends keyof OBSRequestTypes>(
    type: T,
    data?: OBSRequestTypes[T],
  ): Promise<OBSResponseTypes[T]>;
}

/** The part of OBSWebSocket the client uses, so tests can drive events. */
export interface ObsSocket extends ObsRequester {
  connect(
    url?: string,
    password?: string,
    params?: { eventSubscriptions?: number },
  ): Promise<unknown>;
  disconnect(): Promise<void>;
  on(event: string, listener: (data: never) => void): unknown;
}

export interface ObsClientOptions {
  url: string;
  password?: string | undefined;
  socket?: ObsSocket;
  onStatus?: (connected: boolean) => void;
  /** Delays in ms between reconnection attempts: 1 s doubling up to 30 s. */
  backoffMs?: { min: number; max: number };
}

/**
 * Connection to obs-websocket v5 with automatic reconnection and a scene cache
 * kept up to date by events (no polling).
 */
export class ObsClient implements ObsRequester, LiveContextReader {
  private readonly socket: ObsSocket;
  private readonly backoff: { min: number; max: number };
  private sceneNames: string[] = [];
  private current: string | null = null;
  private connected = false;
  private stopped = false;
  private retryTimer: NodeJS.Timeout | undefined;
  private nextDelay: number;

  constructor(private readonly options: ObsClientOptions) {
    this.socket = options.socket ?? (new OBSWebSocket() as unknown as ObsSocket);
    this.backoff = options.backoffMs ?? { min: 1_000, max: 30_000 };
    this.nextDelay = this.backoff.min;
    this.socket.on("ConnectionClosed", () => this.handleClosed());
    this.socket.on("SceneListChanged", () => void this.refreshScenes());
    this.socket.on("SceneNameChanged", () => void this.refreshScenes());
    this.socket.on("CurrentProgramSceneChanged", (data: { sceneName: string }) => {
      this.current = data.sceneName;
    });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  scenes(): readonly string[] {
    return this.sceneNames;
  }

  currentScene(): string | null {
    return this.current;
  }

  /** Starts connecting; resolves after the first attempt, successful or not. */
  async start(): Promise<void> {
    this.stopped = false;
    await this.attempt();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    await this.socket.disconnect();
  }

  call<T extends keyof OBSRequestTypes>(
    type: T,
    data?: OBSRequestTypes[T],
  ): Promise<OBSResponseTypes[T]> {
    if (!this.connected) return Promise.reject(new Error("OBS is not connected"));
    return this.socket.call(type, data);
  }

  private async attempt(): Promise<void> {
    try {
      await this.socket.connect(this.options.url, this.options.password, {
        eventSubscriptions: EventSubscription.General | EventSubscription.Scenes,
      });
      this.connected = true;
      this.nextDelay = this.backoff.min;
      await this.refreshScenes();
      this.options.onStatus?.(true);
    } catch {
      this.scheduleRetry();
    }
  }

  private handleClosed(): void {
    const was = this.connected;
    this.connected = false;
    if (was) this.options.onStatus?.(false);
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    // A failed connect can both reject and emit ConnectionClosed: schedule once.
    if (this.stopped || this.retryTimer) return;
    const delay = this.nextDelay;
    this.nextDelay = Math.min(this.nextDelay * 2, this.backoff.max);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.attempt();
    }, delay);
  }

  private async refreshScenes(): Promise<void> {
    const list = await this.socket.call("GetSceneList");
    // OBS lists scenes bottom-up; keep the order shown in the OBS UI.
    this.sceneNames = list.scenes.map((s) => String(s.sceneName)).reverse();
    this.current = list.currentProgramSceneName;
  }
}
