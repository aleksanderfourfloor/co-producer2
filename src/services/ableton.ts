import { Ableton } from "ableton-js";
import type { Note, NoteExtended } from "ableton-js/util/note";
import { EventEmitter } from "events";

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

export class AbletonService extends EventEmitter {
  private ableton: Ableton;
  private connected = false;
  private onConnectCb?: () => void;
  private onDisconnectCb?: () => void;
  private listenersSetup = false;

  constructor() {
    super();
    this.ableton = new Ableton({ logger: console });
  }

  // Lifecycle ────────────────────────────────────────

  async start(): Promise<void> {
    this.ableton.on("connect", () => {
      this.connected = true;
      console.log("[Ableton] Connected");
      this.setupSessionListeners();
      this.onConnectCb?.();
    });

    this.ableton.on("disconnect", () => {
      this.connected = false;
      this.listenersSetup = false;
      console.log("[Ableton] Disconnected");
      this.onDisconnectCb?.();
    });

    try {
      await this.ableton.start();
      this.connected = true;
      this.setupSessionListeners();
    } catch (err) {
      console.warn("[Ableton] Could not connect on start:", err);
    }
  }

  private async setupSessionListeners() {
    if (this.listenersSetup || !this.connected) return;
    this.listenersSetup = true;

    try {
      // Throttle the emit to avoid blasting the UI when many things change at once (e.g. loading a project)
      let emitTimeout: NodeJS.Timeout | null = null;
      const emitSessionChange = () => {
        if (emitTimeout) clearTimeout(emitTimeout);
        emitTimeout = setTimeout(() => {
          this.emit("session_changed");
        }, 300);
      };

      await this.ableton.song.addListener("tempo", emitSessionChange);
      await this.ableton.song.addListener("is_playing", emitSessionChange);
      await this.ableton.song.addListener("tracks", async (tracks) => {
        emitSessionChange();
        // Also listen to each track's name, mute, config, etc.
        for (const track of tracks) {
          try {
            await track.addListener("name", emitSessionChange);
            await track.addListener("mute", emitSessionChange);
            await track.addListener("solo", emitSessionChange);
          } catch (e) {
            // Ignore if listener attach fails for a track
          }
        }
      });
      console.log("[Ableton] Session listeners configured");
    } catch (err) {
      console.warn("[Ableton] Failed to setup some listeners:", err);
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
    
    try {
      await this.ableton.song.view.set("selected_track", track.raw.id);
    } catch(err) {
      console.warn("[Ableton] Could not auto-select new MIDI track")
    }

    // Find the index of the newly created track
    const allTracks = await this.ableton.song.get("tracks");
    const trackIndex = allTracks.findIndex((t) => t.raw.id === track.raw.id);
    return { index: trackIndex, name };
  }

  async createAudioTrack(index?: number): Promise<{ index: number; name: string }> {
    const track = await this.ableton.song.createAudioTrack(index);
    const name = await track.get("name");
    
    try {
      await this.ableton.song.view.set("selected_track", track.raw.id);
    } catch(err) {
      console.warn("[Ableton] Could not auto-select new audio track")
    }

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

  // Track Management ──────────────────────────────────

  private async getTrackByIndex(trackIndex: number) {
    const rawTracks = await this.ableton.song.get("tracks");
    const track = rawTracks[trackIndex];
    if (!track) throw new Error(`Track ${trackIndex} not found`);
    return track;
  }

  async renameTrack(trackIndex: number, name: string): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    await track.set("name", name);
  }

  async setTrackMute(trackIndex: number, mute: boolean): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    await track.set("mute", mute);
  }

  async setTrackSolo(trackIndex: number, solo: boolean): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    await track.set("solo", solo);
  }

  async selectTrack(trackIndex: number): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    await this.ableton.song.view.set("selected_track", track.raw.id);
  }

  async setTrackVolume(trackIndex: number, value: number): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    const mixer = await track.get("mixer_device");
    const volumeParam = await mixer.get("volume");
    await volumeParam.set("value", value);
  }

  async setTrackPanning(trackIndex: number, value: number): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    const mixer = await track.get("mixer_device");
    const panParam = await mixer.get("panning");
    await panParam.set("value", value);
  }

  async setTrackColor(trackIndex: number, colorIndex: number): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    await track.set("color_index", colorIndex);
  }

  async armTrack(trackIndex: number, arm: boolean): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    await track.set("arm", arm);
  }

  // Clip Management ──────────────────────────────────

  private async getClipFromSlot(trackIndex: number, clipSlotIndex: number) {
    const track = await this.getTrackByIndex(trackIndex);
    const clipSlots = await track.get("clip_slots");
    const slot = clipSlots[clipSlotIndex];
    if (!slot) throw new Error(`Clip slot ${clipSlotIndex} not found`);
    const hasClip = await slot.get("has_clip");
    if (!hasClip) throw new Error(`No clip in track ${trackIndex}, slot ${clipSlotIndex}`);
    const clip = await slot.get("clip");
    if (!clip) throw new Error("Could not get clip");
    return clip;
  }

  async renameClip(trackIndex: number, clipSlotIndex: number, name: string): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.set("name", name);
  }

  async fireClip(trackIndex: number, clipSlotIndex: number): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.fire();
  }

  async stopClip(trackIndex: number, clipSlotIndex: number): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.stop();
  }

  async setClipLooping(trackIndex: number, clipSlotIndex: number, looping: boolean): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.set("looping", looping);
  }

  // Scene Management ─────────────────────────────────

  async fireScene(sceneIndex: number): Promise<void> {
    const scenes = await this.ableton.song.get("scenes");
    const scene = scenes[sceneIndex];
    if (!scene) throw new Error(`Scene ${sceneIndex} not found`);
    await scene.fire();
  }

  async createScene(index?: number): Promise<{ index: number; name: string }> {
    const scene = await this.ableton.song.createScene(index);
    const name = await scene.get("name");
    const allScenes = await this.ableton.song.get("scenes");
    const sceneIndex = allScenes.findIndex((s) => s.raw.id === scene.raw.id);
    return { index: sceneIndex, name };
  }

  async deleteScene(sceneIndex: number): Promise<void> {
    await this.ableton.song.deleteScene(sceneIndex);
  }

  async duplicateScene(sceneIndex: number): Promise<void> {
    await this.ableton.song.duplicateScene(sceneIndex);
  }

  // Session Operations ───────────────────────────────

  async undo(): Promise<void> {
    await this.ableton.song.undo();
  }

  async redo(): Promise<void> {
    await this.ableton.song.redo();
  }

  async stopAllClips(): Promise<void> {
    await this.ableton.song.stopAllClips();
  }

  // ──────────────────────────────────────────────────────────────
  // Phase 1: Note Editing, Clip Properties, Session Settings
  // ──────────────────────────────────────────────────────────────

  async removeNotes(
    trackIndex: number,
    clipSlotIndex: number,
    fromTime: number,
    fromPitch: number,
    timeSpan: number,
    pitchSpan: number
  ): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.removeNotesExtended(fromTime, fromPitch, timeSpan, pitchSpan);
  }

  async replaceAllNotes(
    trackIndex: number,
    clipSlotIndex: number,
    notes: MidiNote[]
  ): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    // Clear existing notes then set new ones
    await clip.removeNotesExtended(0, 0, 9999, 128);
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
  }

  async quantizeClip(
    trackIndex: number,
    clipSlotIndex: number,
    grid: number,
    amount: number
  ): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.quantize(grid, amount);
  }

  async duplicateClipLoop(trackIndex: number, clipSlotIndex: number): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.duplicateLoop();
  }

  async setClipLoopPoints(
    trackIndex: number,
    clipSlotIndex: number,
    loopStart: number,
    loopEnd: number
  ): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.set("loop_start", loopStart);
    await clip.set("loop_end", loopEnd);
  }

  async setClipMarkers(
    trackIndex: number,
    clipSlotIndex: number,
    startMarker: number,
    endMarker: number
  ): Promise<void> {
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await clip.set("start_marker", startMarker);
    await clip.set("end_marker", endMarker);
  }

  async setGrooveAmount(amount: number): Promise<void> {
    await this.ableton.song.set("groove_amount", amount);
  }

  async setSwingAmount(amount: number): Promise<void> {
    await this.ableton.song.set("swing_amount", amount);
  }

  async setTimeSignature(numerator: number, denominator: number): Promise<void> {
    await this.ableton.song.set("signature_numerator", numerator);
    await this.ableton.song.set("signature_denominator", denominator);
  }

  // ──────────────────────────────────────────────────────────────
  // Phase 2: Sends, Arrangement, Audio Clips
  // ──────────────────────────────────────────────────────────────

  async getTrackSends(
    trackIndex: number
  ): Promise<{ index: number; name: string; value: number; min: number; max: number }[]> {
    const track = await this.getTrackByIndex(trackIndex);
    const mixer = await track.get("mixer_device");
    const sends = await mixer.get("sends");
    return Promise.all(
      sends.map(async (send, index) => ({
        index,
        name: await send.get("name"),
        value: await send.get("value"),
        min: await send.get("min"),
        max: await send.get("max"),
      }))
    );
  }

  async setTrackSendLevel(trackIndex: number, sendIndex: number, value: number): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    const mixer = await track.get("mixer_device");
    const sends = await mixer.get("sends");
    const send = sends[sendIndex];
    if (!send) throw new Error(`Send ${sendIndex} not found on track ${trackIndex}`);
    await send.set("value", value);
  }

  async setSongPosition(time: number): Promise<void> {
    await this.ableton.song.set("current_song_time", time);
  }

  async setArrangementLoop(enabled: boolean, start?: number, length?: number): Promise<void> {
    await this.ableton.song.set("loop", enabled);
    if (start !== undefined) await this.ableton.song.set("loop_start", start);
    if (length !== undefined) await this.ableton.song.set("loop_length", length);
  }

  async duplicateClipToArrangement(
    trackIndex: number,
    clipSlotIndex: number,
    time: number
  ): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    const clip = await this.getClipFromSlot(trackIndex, clipSlotIndex);
    await track.duplicateClipToArrangement(clip, time);
  }

  async createAudioClip(trackIndex: number, filePath: string, position: number): Promise<void> {
    const track = await this.getTrackByIndex(trackIndex);
    await track.createAudioClip(filePath, position);
  }
}
