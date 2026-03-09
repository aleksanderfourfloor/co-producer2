# Techno Track Recipe
**Genre:** Techno
**Tempo:** 128 - 135 BPM

When asked to create a Techno track, follow these steps exactly:

## Context
Techno relies on a driving 4/4 rhythm, a relentless sub-bass, and evolving, hypnotic elements.

## Track Structure to Create

### 1. Kick (Drums)
* **Action:** Create a MIDI track, rename to "Kick".
* **Instrument:** Load a full drum kit like the 909 Core Kit. **Always pass the new `track_index` parameter to `load_device`!** Example path: `["Drum Rack", "Kit-909"]`
* **MIDI Pattern:** Create a 1-bar clip. C1 on beats 0, 1, 2, 3. Velocities ~110.

### 2. Sub Bass (Instrument)
* **Action:** Create a MIDI track, rename to "Sub Bass".
* **Instrument:** Load a Bass synth preset. **Always pass the `track_index` to `load_device`!**
* **MIDI Pattern:** Create a 1-bar clip. Notes on off-beats (0.5, 1.5, 2.5, 3.5) in octaves C1-C2.

### 3. Hats & Percussion (Drums)
* **Action:** Create a MIDI track, rename to "Percussion".
* **Instrument:** Load a full drum kit (e.g., `["Drum Rack", "Kit-909"]`). **Always pass the `track_index` to `load_device`!** Do NOT load a single hat sample into a Drum Rack track unless you know what you are doing.
* **MIDI Pattern:** Create a 1-bar clip.
  * Open Hi-Hat (A#1) on off-beats (0.5, 1.5, 2.5, 3.5).
  * Closed hats (F#1) on 16th notes with low velocity.

### 4. Synth/Stab (Instrument)
* **Action:** Create a MIDI track, rename to "Synth Stab".
* **Instrument:** Load a Stab or Keys preset. **Always pass the `track_index` to `load_device`!**
* **MIDI Pattern:** Create a 2-bar clip. Syncopated minor chord stabs.

### 5. Return / Effects
* **Action:** Set track send levels to Return A for the Stab and Percussion tracks.

## Important Directives
* **CRITICAL**: The `load_device` tool now has a `track_index` parameter. **You MUST provide it** for every instrument you load to prevent instruments from loading onto the wrong track!
* Do not stop midway. Complete all 4 tracks.
