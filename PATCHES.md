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

## v1.8.4

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

## v1.8.6 — adaptive capture source

- Firefox throttles requestVideoFrameCallback to ~40 ms (25 Hz) on every
  version since rVFC shipped — Bugzilla 1935256, still unfixed. Videos above
  25 fps lose frames with pure rVFC capture (this also vindicates the
  upstream rVFC→rAF switch, at least on Firefox).
- The capture loop now detects throttling at runtime via
  metadata.presentedFrames jumps between callbacks; after 5 detected skips
  the video permanently switches to rAF-driven capture. rVFC (with exact
  expectedDisplayTime pacing) stays active where it behaves per spec.
- Verified empirically on Firefox 155 / Windows (144 Hz display): a real webm
  clip presenting ~52 fps got rVFC callbacks at only 24.4 Hz (median interval
  41.7 ms, presentedFrames delta=2 on 94/97 callbacks); the adaptive fallback
  tripped within ~5 skips and capture continued at display rate (144 Hz).
  Synthetic captureStream sources are NOT throttled — the bug is specific to
  the decoded-video (MediaDecoder/MSE) path, i.e. real YouTube content.

## v1.8.7 — rVFC path removed (current)

- Empirical testing (Firefox 155, real webm video) showed rVFC is throttled
  to ~24 Hz on real decoded content anyway, so the adaptive detection always
  ended up switching to rAF in practice. Removed the rVFC path and the
  throttle detection entirely: capture always runs on rAF at display rate,
  with async createImageBitmap keeping it off the main thread. Fewer states,
  never under-samples.
- Upstream PR branch rebuilt as two clean commits (capture rework + measure
  rewrite) and force-pushed to PR #6; PR description updated.

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

## Upstream PR

Submitted to Trogen898/Frame-Sync: <https://github.com/Trogen898/Frame-Sync/pull/6>
(branch `pr/firefox-sync-fixes`, 5 commits based on upstream `main`).
Fork/backup: <https://github.com/mera9595790-create/Frame-Sync>
