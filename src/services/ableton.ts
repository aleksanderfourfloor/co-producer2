import { Ableton } from "ableton-js";
import type { Note, NoteExtended } from "ableton-js/util/note";

// ── Types ──────────────────────────────────────────────────────

export interface SessionInfo {
  tempo: number;
  isPlaying: boolean;
  signature_numerator: number;
  signature_denominator: number;
  tracks: TrackSummary[];
}

export interface TrackSummary {
  index: number;
  name: string;
  type: "midi" | "audio" | "return" | "master";
  isMuted: boolean;
  isSoloed: boolean;
}

export interface TrackDetail extends TrackSummary {
  volume: number;
  panning: number;
  devices: DeviceInfo[];
  clipSlots: ClipSlotInfo[];
}

export interface DeviceInfo {
  name: string;
  type: string;
  isActive: boolean;
}

export interface ClipSlotInfo {
  index: number;
  hasClip: boolean;
  clipName?: string;
  clipLength?: number;
  isPlaying?: boolean;
}

export interface MidiNote {
  pitch: number;       // 0-127
  start_time: number;  // beats
  duration: number;    // beats
  velocity: number;    // 0-127
  mute: boolean;
}

// ── Ableton Service ────────────────────────────────────────────

export class AbletonService {
  private ableton: Ableton;
  private connected = false;
  private onConnectCb?: () => void;
  private onDisconnectCb?: () => void;

  constructor() {
    this.ableton = new Ableton({ logger: console });
  }

  // Lifecycle ────────────────────────────────────────

  async start(): Promise<void> {
    this.ableton.on("connect", () => {
      this.connected = true;
      console.log("[Ableton] Connected");
      this.onConnectCb?.();
    });

    this.ableton.on("disconnect", () => {
      this.connected = false;
      console.log("[Ableton] Disconnected");
      this.onDisconnectCb?.();
    });

    try {
      await this.ableton.start();
      this.connected = true;
    } catch (err) {
      console.warn("[Ableton] Could not connect on start:", err);
    }
  }

  async close(): Promise<void> {
    await this.ableton.close();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onConnectionChange(onConnect: () => void, onDisconnect: () => void): void {
    this.onConnectCb = onConnect;
    this.onDisconnectCb = onDisconnect;
  }

  // Session Info ─────────────────────────────────────

  async getSessionInfo(): Promise<SessionInfo> {
    const [tempo, isPlaying, sigNum, sigDenom] = await Promise.all([
      this.ableton.song.get("tempo"),
      this.ableton.song.get("is_playing"),
      this.ableton.song.get("signature_numerator"),
      this.ableton.song.get("signature_denominator"),
    ]);

    const rawTracks = await this.ableton.song.get("tracks");
    const tracks: TrackSummary[] = await Promise.all(
      rawTracks.map(async (track, index) => {
        const name = await track.get("name");
        const isMuted = await track.get("mute");
        const soloVal = await track.get("solo");
        const hasMidiInput = await track.get("has_midi_input");
        return {
          index,
          name,
          type: hasMidiInput ? ("midi" as const) : ("audio" as const),
          isMuted,
          isSoloed: Boolean(soloVal),
        };
      })
    );

    return {
      tempo,
      isPlaying,
      signature_numerator: sigNum,
      signature_denominator: sigDenom,
      tracks,
    };
  }

  // Track Details ────────────────────────────────────

  async getTrackDetails(trackIndex: number): Promise<TrackDetail> {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);

    const [name, isMuted, soloVal, hasMidiInput] = await Promise.all([
      track.get("name"),
      track.get("mute"),
      track.get("solo"),
      track.get("has_midi_input"),
    ]);

    // Get mixer device for volume/pan
    const mixer = await track.get("mixer_device");
    const volumeParam = await mixer.get("volume");
    const panParam = await mixer.get("panning");
    const volume = await volumeParam.get("value");
    const panning = await panParam.get("value");

    // Get devices
    const rawDevices = await track.get("devices");
    const devices: DeviceInfo[] = await Promise.all(
      rawDevices.map(async (device) => ({
        name: await device.get("name"),
        type: await device.get("type") as unknown as string,
        isActive: await device.get("is_active"),
      }))
    );

    // Get clip slots (first 16)
    const rawClipSlots = await track.get("clip_slots");
    const clipSlots: ClipSlotInfo[] = await Promise.all(
      rawClipSlots.slice(0, 16).map(async (slot, index) => {
        const hasClip = await slot.get("has_clip");
        let clipInfo: Partial<ClipSlotInfo> = {};
        if (hasClip) {
          const clip = await slot.get("clip");
          if (clip) {
            clipInfo = {
              clipName: await clip.get("name"),
              clipLength: await clip.get("length"),
              isPlaying: await clip.get("is_playing"),
            };
          }
        }
        return { index, hasClip, ...clipInfo };
      })
    );

    return {
      index: trackIndex,
      name,
      type: hasMidiInput ? "midi" : "audio",
      isMuted,
      isSoloed: Boolean(soloVal),
      volume,
      panning,
      devices,
      clipSlots,
    };
  }

  // Transport ────────────────────────────────────────

  async play(): Promise<void> {
    await this.ableton.song.set("is_playing", true);
  }

  async stop(): Promise<void> {
    await this.ableton.song.set("is_playing", false);
  }

  async setTempo(bpm: number): Promise<void> {
    if (bpm < 20 || bpm > 999) throw new Error("Tempo must be between 20 and 999 BPM");
    await this.ableton.song.set("tempo", bpm);
  }

  // Track Creation ────────────────────────────────────

  async createMidiTrack(index?: number): Promise<{ index: number; name: string }> {
    const track = await this.ableton.song.createMidiTrack(index);
    const name = await track.get("name");
    // Find the index of the newly created track
    const allTracks = await this.ableton.song.get("tracks");
    const trackIndex = allTracks.findIndex((t) => t.raw.id === track.raw.id);
    return { index: trackIndex, name };
  }

  async createAudioTrack(index?: number): Promise<{ index: number; name: string }> {
    const track = await this.ableton.song.createAudioTrack(index);
    const name = await track.get("name");
    const allTracks = await this.ableton.song.get("tracks");
    const trackIndex = allTracks.findIndex((t) => t.raw.id === track.raw.id);
    return { index: trackIndex, name };
  }

  async createReturnTrack(): Promise<{ name: string }> {
    const track = await this.ableton.song.createReturnTrack();
    const name = await track.get("name");
    return { name };
  }

  async deleteTrack(trackIndex: number): Promise<void> {
    await this.ableton.song.deleteTrack(trackIndex);
  }

  async duplicateTrack(trackIndex: number): Promise<void> {
    await this.ableton.song.duplicateTrack(trackIndex);
  }

  // Browser / Device Loading ─────────────────────────
  // Note: ableton-js doesn't expose `browser` on its public API,
  // so we use the low-level getProp/sendCommand protocol directly.

  private async browserGetProp(prop: string): Promise<any> {
    // Matches: Namespace.get(prop) → ableton.getProp(ns, nsid, prop, cache)
    return this.ableton.getProp("browser", undefined, prop, true);
  }

  private async browserGetChildren(itemId: string): Promise<any[]> {
    // Matches: BrowserItem → Namespace("browser-item", itemId).get("children")
    return this.ableton.getProp("browser-item", itemId, "children", true);
  }

  private async browserLoadItem(itemId: string): Promise<any> {
    // Matches: Browser.loadItem() → sendCommand("load_item", { id: item.raw.id })
    return this.ableton.sendCommand({
      ns: "browser",
      name: "load_item",
      args: { id: itemId },
    });
  }

  async browseCategory(
    category: "instruments" | "audio_effects" | "midi_effects" | "drums" | "sounds" | "samples"
  ): Promise<{ name: string; is_loadable: boolean; is_folder: boolean; id: string }[]> {
    const items = await this.browserGetProp(category);
    if (!Array.isArray(items)) return [];
    return items.map((item: any) => ({
      name: item.name,
      is_loadable: item.is_loadable ?? false,
      is_folder: item.is_folder ?? false,
      id: item.id,
    }));
  }

  async browsePath(
    category: "instruments" | "audio_effects" | "midi_effects" | "drums" | "sounds" | "samples",
    path: string[]
  ): Promise<{ name: string; is_loadable: boolean; is_folder: boolean; id: string }[]> {
    let items = await this.browserGetProp(category);
    if (!Array.isArray(items)) return [];

    for (const segment of path) {
      const match = items.find(
        (item: any) => item.name?.toLowerCase() === segment.toLowerCase()
      );
      if (!match) throw new Error(`Could not find "${segment}" in browser path`);
      items = await this.browserGetChildren(match.id);
      if (!Array.isArray(items)) return [];
    }

    return items.map((item: any) => ({
      name: item.name,
      is_loadable: item.is_loadable ?? false,
      is_folder: item.is_folder ?? false,
      id: item.id,
    }));
  }

  async loadBrowserItem(
    category: "instruments" | "audio_effects" | "midi_effects" | "drums" | "sounds" | "samples",
    path: string[]
  ): Promise<string> {
    let items = await this.browserGetProp(category);
    if (!Array.isArray(items)) throw new Error("Could not access browser");

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      const match = items.find(
        (item: any) => item.name?.toLowerCase() === segment.toLowerCase()
      );
      if (!match) {
        const available = items.map((item: any) => item.name).join(", ");
        throw new Error(`Could not find "${segment}" in browser. Available: ${available}`);
      }

      if (i < path.length - 1) {
        items = await this.browserGetChildren(match.id);
        if (!Array.isArray(items)) throw new Error(`Could not browse into "${segment}"`);
      } else {
        if (match.is_loadable) {
          await this.browserLoadItem(match.id);
          return match.name;
        }
        // It's a folder — try to load a default child
        const children = await this.browserGetChildren(match.id);
        if (Array.isArray(children)) {
          const loadable = children.find((c: any) => c.is_loadable);
          if (loadable) {
            await this.browserLoadItem(loadable.id);
            return loadable.name;
          }
        }
        throw new Error(`"${segment}" is a folder. Browse into it to see available presets.`);
      }
    }

    throw new Error("Empty path provided");
  }

  // Device Parameters ────────────────────────────────

  async getDeviceParameters(
    trackIndex: number,
    deviceIndex: number
  ): Promise<{ name: string; value: number; min: number; max: number }[]> {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);

    const devices = await track.get("devices");
    const device = devices[deviceIndex];
    if (!device) throw new Error(`Device ${deviceIndex} not found on track ${trackIndex}`);

    const params = await device.get("parameters");
    return Promise.all(
      params.map(async (p) => ({
        name: await p.get("name"),
        value: await p.get("value"),
        min: await p.get("min"),
        max: await p.get("max"),
      }))
    );
  }

  async setDeviceParameter(
    trackIndex: number,
    deviceIndex: number,
    parameterName: string,
    value: number
  ): Promise<void> {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);

    const devices = await track.get("devices");
    const device = devices[deviceIndex];
    if (!device) throw new Error(`Device ${deviceIndex} not found on track ${trackIndex}`);

    const params = await device.get("parameters");
    for (const param of params) {
      const name = await param.get("name");
      if (name.toLowerCase() === parameterName.toLowerCase()) {
        await param.set("value", value);
        return;
      }
    }
    throw new Error(`Parameter "${parameterName}" not found on device ${deviceIndex}`);
  }

  async deleteDevice(trackIndex: number, deviceIndex: number): Promise<void> {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);
    await track.deleteDevice(deviceIndex);
  }

  // MIDI Clip Operations ─────────────────────────────

  async getClipNotes(trackIndex: number, clipSlotIndex: number): Promise<MidiNote[]> {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);

    const clipSlots = await track.get("clip_slots");
    const slot = clipSlots[clipSlotIndex];
    if (!slot) throw new Error(`Clip slot ${clipSlotIndex} not found`);

    const hasClip = await slot.get("has_clip");
    if (!hasClip) throw new Error(`No clip in track ${trackIndex}, slot ${clipSlotIndex}`);

    const clip = await slot.get("clip");
    if (!clip) throw new Error("Could not get clip");

    // Use getNotesExtended (Ableton 11+) — falls back to getNotes
    try {
      const notes: NoteExtended[] = await clip.getNotesExtended(0, 0, 9999, 128);
      return notes.map((n) => ({
        pitch: n.pitch,
        start_time: n.start_time,
        duration: n.duration,
        velocity: n.velocity,
        mute: n.mute ?? false,
      }));
    } catch {
      // Fallback for Ableton 10
      const notes: Note[] = await clip.getNotes(0, 0, 9999, 128);
      return notes.map((n) => ({
        pitch: n.pitch,
        start_time: n.time,
        duration: n.duration,
        velocity: n.velocity,
        mute: n.muted ?? false,
      }));
    }
  }

  async createMidiClip(
    trackIndex: number,
    clipSlotIndex: number,
    lengthBeats: number,
    notes: MidiNote[]
  ): Promise<string> {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);

    const hasMidiInput = await track.get("has_midi_input");
    if (!hasMidiInput) throw new Error(`Track ${trackIndex} is not a MIDI track`);

    const clipSlots = await track.get("clip_slots");
    const slot = clipSlots[clipSlotIndex];
    if (!slot) throw new Error(`Clip slot ${clipSlotIndex} not found`);

    // Create the clip using the typed method
    await slot.createClip(lengthBeats);

    const clip = await slot.get("clip");
    if (!clip) throw new Error("Failed to create clip");

    // Add notes — convert our format to ableton-js Note format
    if (notes.length > 0) {
      const abletonNotes: Note[] = notes.map((n) => ({
        pitch: n.pitch,
        time: n.start_time,
        duration: n.duration,
        velocity: n.velocity,
        muted: n.mute ?? false,
      }));

      await clip.setNotes(abletonNotes);
    }

    const clipName = `Co-Producer Clip ${clipSlotIndex + 1}`;
    await clip.set("name", clipName);

    return clipName;
  }

  async addNotesToClip(
    trackIndex: number,
    clipSlotIndex: number,
    notes: MidiNote[]
  ): Promise<void> {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);

    const clipSlots = await track.get("clip_slots");
    const slot = clipSlots[clipSlotIndex];
    if (!slot) throw new Error(`Clip slot ${clipSlotIndex} not found`);

    const hasClip = await slot.get("has_clip");
    if (!hasClip) throw new Error(`No clip in track ${trackIndex}, slot ${clipSlotIndex}`);

    const clip = await slot.get("clip");
    if (!clip) throw new Error("Could not get clip");

    const abletonNotes: Note[] = notes.map((n) => ({
      pitch: n.pitch,
      time: n.start_time,
      duration: n.duration,
      velocity: n.velocity,
      muted: n.mute ?? false,
    }));

    await clip.setNotes(abletonNotes);
  }
}
