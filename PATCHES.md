# Frame Sync — patched fork

Fork of [Trogen898/Frame-Sync](https://github.com/Trogen898/Frame-Sync) (MPL 2.0),
patched for Firefox to fix Bluetooth audio/video desync without stutter.

Upstream version: 1.8.1

## v1.8.2 — initial performance patch

- Capture loop switched from `requestAnimationFrame` to
  `requestVideoFrameCallback` (rVFC fires exactly once per presented video
  frame; rAF capture was out of phase with the video and caused judder).
  rAF kept as a fallback for Firefox < 132.
- Adaptive ring buffer (fps × delay + margin) instead of a fixed 60
  full-resolution canvases (~2 GB at 4K upstream).
- Buffer/overlay canvases sized to the on-screen size × devicePixelRatio,
  not to the full stream resolution.
- Original `<video>` hidden (opacity 0) while the opaque overlay is up.
- Capture/draw rAF loops now terminate on Deactivate (upstream leaked a
  spinning loop per video element on SPA sites like YouTube).

## v1.8.3

- Listen for the HTMLVideoElement `resize` event (fires on
  videoWidth/videoHeight change, e.g. YouTube quality switch) — rebuild
  canvas sizes and flush stale frames. ResizeObserver alone missed this
  because the CSS box does not change.
- Measure page: mic requested before AudioContext creation (BT A2DP→HFP
  profile switch stalls output), silent-oscillator warm-up until
  `currentTime` advances, beep scheduled at an exact context time, record
  until 5 s of real samples, mic processing (NS/AEC/AGC) disabled,
  guaranteed cleanup.

## v1.8.4 — current stable

- Reworked frame capture: async `createImageBitmap(video, {resizeWidth,
  resizeHeight})` ring instead of synchronous main-thread
  `drawImage(video → canvas)` (the main source of residual judder at high
  resolutions). Falls back to plain bitmaps, then to pooled canvas capture
  (DRM etc.), and deactivates itself on persistent capture failure.
- Monotonic "most recent due frame" presentation (no back-and-forth
  between neighbouring frames).
- Overlay hides the live video only after the first delayed frame is drawn
  (no black flash on start/seek).
- Auto Measure rewritten as a continuous multi-frequency test: rotating
  tones (base ×1/×1.25/×0.8/×1.6, clamped 200–3400 Hz), per-block context
  timestamps, Goertzel detection with adaptive noise floor, warm-up beep
  excluded, live median/min/max, waveform with play/heard markers.
  Note: measured value includes mic input-path latency (+~20–40 ms typical).

## Known limitation

Firefox native Picture-in-Picture renders decoded frames in a separate
browser window, bypassing the page DOM — the delay overlay cannot reach it
and PiP shows unsynchronized video. Only a media-pipeline-level fix
(e.g. hooking `IAudioClock::GetPosition` like
[gurux13/chrome-audio-delay](https://github.com/gurux13/chrome-audio-delay)
does for Chromium) would cover PiP.

A v1.8.5 attempt (disable native PiP while delay is active + "Open in Mini
Window" popup button) did not work reliably and lives on the
`v1.8.5-miniwindow` branch for future debugging.

## Install (temporary)

`about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select
`manifest.json`. Removed on browser restart.
