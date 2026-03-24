import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  IRemoteAudioTrack,
  UID,
  ConnectionState,
  NetworkQuality,
} from 'agora-rtc-sdk-ng';

/**
 * Configuration options for Agora RTC client
 */
export interface AgoraConfig {
  appId: string;
  mode?: 'rtc' | 'live';
  codec?: 'vp8' | 'vp9' | 'h264';
}

/**
 * Options for joining a channel
 */
export interface JoinChannelOptions {
  token: string;
  channelName: string;
  uid?: UID;
}

/**
 * Connection state information
 */
export interface ConnectionStateInfo {
  state: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
}

/**
 * Event callbacks for Agora manager
 */
export interface AgoraEventCallbacks {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onUserJoined?: (uid: UID) => void;
  onUserLeft?: (uid: UID) => void;
  onUserPublished?: (uid: UID, mediaType: 'audio' | 'video') => void;
  onUserUnpublished?: (uid: UID, mediaType: 'audio' | 'video') => void;
  onNetworkQuality?: (quality: NetworkQuality) => void;
  onError?: (error: Error) => void;
}

/**
 * Agora Conversational AI Manager
 * 
 * Manages Agora RTC client for voice communication in the medication reminder app.
 * Handles initialization, channel joining, audio track management, and connection state.
 * 
 * @example
 * ```typescript
 * const manager = new AgoraConvoAIManager({
 *   appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!
 * });
 * 
 * await manager.joinChannel({
 *   token: 'your-token',
 *   channelName: 'medication-reminder',
 *   uid: 123
 * });
 * ```
 */
export class AgoraConvoAIManager {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: ILocalAudioTrack | null = null;
  private remoteAudioTracks: Map<UID, IRemoteAudioTrack> = new Map();
  private currentChannel: string | null = null;
  private currentUid: UID | null = null;
  private eventCallbacks: AgoraEventCallbacks = {};

  /**
   * Creates an instance of AgoraConvoAIManager
   * 
   * @param config - Configuration object containing Agora App ID and optional settings
   */
  constructor(private config: AgoraConfig) {
    if (!config.appId) {
      throw new Error('Agora App ID is required');
    }
  }

  /**
   * Initializes the Agora RTC client
   * 
   * Creates a new RTC client instance with the specified mode and codec.
   * Should be called before joining any channel.
   * 
   * @returns Promise that resolves when client is initialized
   */
  async initialize(): Promise<void> {
    try {
      // Create RTC client with configuration
      // Mode 'rtc' is for real-time communication (1-to-1 or small group)
      // Codec 'vp8' is recommended for voice communication
      this.client = AgoraRTC.createClient({
        mode: this.config.mode || 'rtc',
        codec: this.config.codec || 'vp8',
      });

      // Set up event listeners
      this.setupEventListeners();

      console.log('Agora RTC client initialized successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Failed to initialize Agora RTC client:', err);
      throw err;
    }
  }

  /**
   * Joins a voice channel with authentication token
   * 
   * This method:
   * 1. Ensures client is initialized
   * 2. Joins the specified channel with token
   * 3. Creates and publishes local microphone audio track
   * 4. Sets up remote user event handling
   * 
   * @param options - Join channel options including token, channel name, and optional UID
   * @returns Promise that resolves when successfully joined and audio track is published
   * @throws Error if client is not initialized or join fails
   */
  async joinChannel(options: JoinChannelOptions): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    try {
      const { token, channelName, uid = 0 } = options;

      // Validate required parameters
      if (!token) {
        throw new Error('Token is required to join channel');
      }
      if (!channelName) {
        throw new Error('Channel name is required');
      }

      // Join the channel
      // uid: 0 means Agora will assign a UID automatically
      const assignedUid = await this.client.join(
        this.config.appId,
        channelName,
        token,
        uid
      );

      this.currentChannel = channelName;
      this.currentUid = assignedUid;

      console.log(`Joined channel: ${channelName} with UID: ${assignedUid}`);

      // Create and publish local microphone audio track
      await this.setupLocalAudioTrack();

      console.log('Successfully joined channel and published audio track');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Failed to join channel:', err);
      this.eventCallbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Sets up local microphone audio track
   * 
   * Creates a microphone audio track, enables it, and publishes it to the channel.
   * This allows the user's voice to be transmitted to other participants.
   * 
   * @private
   * @returns Promise that resolves when audio track is created and published
   */
  private async setupLocalAudioTrack(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Create microphone audio track
      // This will request microphone permission from the user
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard', // Optimized for voice/speech
      });

      // Enable the audio track (microphone is active)
      await this.localAudioTrack.setEnabled(true);

      // Publish the audio track to the channel
      await this.client.publish(this.localAudioTrack);

      console.log('Local audio track created and published');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Failed to setup local audio track:', err);
      
      // Clean up on failure
      if (this.localAudioTrack) {
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }
      
      throw err;
    }
  }

  /**
   * Leaves the current voice channel and cleans up resources
   * 
   * This method:
   * 1. Stops and closes local audio track
   * 2. Unpublishes local track from channel
   * 3. Leaves the channel
   * 4. Cleans up remote audio tracks
   * 
   * @returns Promise that resolves when successfully left the channel
   */
  async leaveChannel(): Promise<void> {
    if (!this.client) {
      console.warn('Client not initialized, nothing to leave');
      return;
    }

    try {
      // Stop and close local audio track
      if (this.localAudioTrack) {
        await this.localAudioTrack.setEnabled(false);
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      // Unpublish local track if published
      if (this.client.localTracks.length > 0) {
        await this.client.unpublish();
      }

      // Leave the channel
      await this.client.leave();

      // Clean up remote tracks
      this.remoteAudioTracks.forEach((track) => {
        track.stop();
      });
      this.remoteAudioTracks.clear();

      console.log(`Left channel: ${this.currentChannel}`);

      this.currentChannel = null;
      this.currentUid = null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Failed to leave channel:', err);
      this.eventCallbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Sets up event listeners for RTC client events
   * 
   * Handles connection state changes, user join/leave events,
   * remote audio track publishing/unpublishing, and network quality.
   * 
   * @private
   */
  private setupEventListeners(): void {
    if (!this.client) {
      return;
    }

    // Connection state change
    this.client.on('connection-state-change', (curState: ConnectionState, revState: ConnectionState) => {
      console.log(`Connection state changed: ${revState} -> ${curState}`);
      this.eventCallbacks.onConnectionStateChange?.(curState);
    });

    // User joined the channel
    this.client.on('user-joined', (user: { uid: UID }) => {
      console.log(`User joined: ${user.uid}`);
      this.eventCallbacks.onUserJoined?.(user.uid);
    });

    // User left the channel
    this.client.on('user-left', (user: { uid: UID }) => {
      console.log(`User left: ${user.uid}`);
      
      // Clean up remote track if exists
      const remoteTrack = this.remoteAudioTracks.get(user.uid);
      if (remoteTrack) {
        remoteTrack.stop();
        this.remoteAudioTracks.delete(user.uid);
      }
      
      this.eventCallbacks.onUserLeft?.(user.uid);
    });

    // Remote user published audio/video
    this.client.on('user-published', async (user: { uid: UID }, mediaType: 'audio' | 'video') => {
      console.log(`User ${user.uid} published ${mediaType}`);
      
      try {
        // Subscribe to the remote user's track
        await this.client!.subscribe(user, mediaType);

        if (mediaType === 'audio') {
          const remoteAudioTrack = user.audioTrack as IRemoteAudioTrack;
          if (remoteAudioTrack) {
            // Play the remote audio track
            remoteAudioTrack.play();
            this.remoteAudioTracks.set(user.uid, remoteAudioTrack);
            console.log(`Playing remote audio from user ${user.uid}`);
          }
        }

        this.eventCallbacks.onUserPublished?.(user.uid, mediaType);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Failed to subscribe to user ${user.uid}:`, err);
        this.eventCallbacks.onError?.(err);
      }
    });

    // Remote user unpublished audio/video
    this.client.on('user-unpublished', (user: { uid: UID }, mediaType: 'audio' | 'video') => {
      console.log(`User ${user.uid} unpublished ${mediaType}`);
      
      if (mediaType === 'audio') {
        const remoteTrack = this.remoteAudioTracks.get(user.uid);
        if (remoteTrack) {
          remoteTrack.stop();
          this.remoteAudioTracks.delete(user.uid);
        }
      }

      this.eventCallbacks.onUserUnpublished?.(user.uid, mediaType);
    });

    // Network quality update
    this.client.on('network-quality', (quality: NetworkQuality) => {
      this.eventCallbacks.onNetworkQuality?.(quality);
    });

    // Exception/error handling
    this.client.on('exception', (event: { code: number; msg: string; uid: UID }) => {
      const error = new Error(`Agora exception: ${event.msg} (code: ${event.code})`);
      console.error('Agora exception:', event);
      this.eventCallbacks.onError?.(error);
    });
  }

  /**
   * Registers event callbacks
   * 
   * @param callbacks - Object containing callback functions for various events
   */
  setEventCallbacks(callbacks: AgoraEventCallbacks): void {
    this.eventCallbacks = { ...this.eventCallbacks, ...callbacks };
  }

  /**
   * Gets the current connection state
   * 
   * @returns Connection state information object
   */
  getConnectionState(): ConnectionStateInfo {
    if (!this.client) {
      return {
        state: 'DISCONNECTED' as ConnectionState,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
      };
    }

    const state = this.client.connectionState;
    return {
      state,
      isConnected: state === 'CONNECTED',
      isConnecting: state === 'CONNECTING',
      isDisconnected: state === 'DISCONNECTED',
    };
  }

  /**
   * Enables or disables the local microphone
   * 
   * @param enabled - Whether to enable (true) or disable (false) the microphone
   * @returns Promise that resolves when microphone state is updated
   */
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.localAudioTrack) {
      throw new Error('No local audio track. Join a channel first.');
    }

    try {
      await this.localAudioTrack.setEnabled(enabled);
      console.log(`Microphone ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Failed to toggle microphone:', err);
      throw err;
    }
  }

  /**
   * Gets the current channel name
   * 
   * @returns Current channel name or null if not in a channel
   */
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Gets the current user ID
   * 
   * @returns Current UID or null if not in a channel
   */
  getCurrentUid(): UID | null {
    return this.currentUid;
  }

  /**
   * Checks if currently in a channel
   * 
   * @returns True if connected to a channel, false otherwise
   */
  isInChannel(): boolean {
    return this.currentChannel !== null && this.getConnectionState().isConnected;
  }

  /**
   * Gets the number of remote users in the channel
   * 
   * @returns Number of remote users
   */
  getRemoteUserCount(): number {
    return this.remoteAudioTracks.size;
  }

  /**
   * Destroys the client and cleans up all resources
   * 
   * Should be called when the manager is no longer needed.
   * 
   * @returns Promise that resolves when cleanup is complete
   */
  async destroy(): Promise<void> {
    try {
      await this.leaveChannel();
      
      if (this.client) {
        // Remove all event listeners
        this.client.removeAllListeners();
        this.client = null;
      }

      console.log('Agora manager destroyed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Error during destroy:', err);
      throw err;
    }
  }
}

export default AgoraConvoAIManager;

