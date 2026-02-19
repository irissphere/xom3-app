"use client";

import { useRef, useState, useEffect } from "react";
import { OperatorPanelFrame, PanelError, PanelEmpty, PostureChip } from "../../operator/dashboard/components/OperatorDashboardPanelKit";
import "./PostComposerPanel.css";

// --- Panel Types ---
interface PostComposerPanelProps {
  onPostScheduled?: (postId: string) => void;
  defaultPlatforms?: string[];
}

interface ComposerState {
  content: string;
  platforms: string[];
  scheduleType: "now" | "scheduled";
  scheduledAt: string | null;
  media: (File | { url: string; type: string })[];
  posting: boolean;
}

interface VideoGenerationState {
  script: string;
  style: string;
  voice: string;
  aspectRatio: string;
  duration: number;
  generating: boolean;
  jobId: string | null;
  previewUrl: string | null;
  cost: number;
}

interface AvatarGenerationState {
  script: string;
  voiceId: string;
  faceId: string;
  style: string;
  aspectRatio: string;
  enhanceFace: boolean;
  generating: boolean;
  jobId: string | null;
  previewUrl: string | null;
  cost: number;
}

type ComposerMode = "text" | "ai-video" | "ai-avatar";

const PLATFORMS = [
  { id: "twitter", name: "X/Twitter", icon: "𝕏", maxLength: 280, color: "#000" },
  { id: "facebook", name: "Facebook", icon: "f", maxLength: 63206, color: "#1877f2" },
  { id: "instagram", name: "Instagram", icon: "📷", maxLength: 2200, color: "#e4405f" },
  { id: "linkedin", name: "LinkedIn", icon: "in", maxLength: 3000, color: "#0a66c2" },
  { id: "tiktok", name: "TikTok", icon: "♪", maxLength: 2200, color: "#000" },
  { id: "youtube", name: "YouTube", icon: "▶", maxLength: 5000, color: "#FF0000" },
];

// --- Main Panel Component ---
export default function PostComposerPanel({ onPostScheduled, defaultPlatforms }: PostComposerPanelProps) {
  const [mode, setMode] = useState<ComposerMode>("text");
  const [state, setState] = useState<ComposerState>({
    content: "",
    platforms: defaultPlatforms && defaultPlatforms.length > 0 ? defaultPlatforms : ["twitter"],
    scheduleType: "now",
    scheduledAt: null,
    media: [],
    posting: false,
  });
  const [videoState, setVideoState] = useState<VideoGenerationState>({
    script: "",
    style: "social",
    voice: "nova",
    aspectRatio: "9:16",
    duration: 60,
    generating: false,
    jobId: null,
    previewUrl: null,
    cost: 0,
  });
  const [avatarState, setAvatarState] = useState<AvatarGenerationState>({
    script: "",
    voiceId: "",
    faceId: "",
    style: "social",
    aspectRatio: "9:16",
    enhanceFace: true,
    generating: false,
    jobId: null,
    previewUrl: null,
    cost: 0,
  });
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [availableFaces, setAvailableFaces] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // -- Load cost estimates on mount --
  useEffect(() => {
    loadCostEstimates();
  }, []);

  // -- Load avatar profiles --
  useEffect(() => {
    if (mode === "ai-avatar") {
      loadAvatarProfiles();
    }
  }, [mode]);

  const loadAvatarProfiles = async () => {
    try {
      // Load voices
      const voicesResp = await fetch("/api/avatar/voices");
      if (voicesResp.ok) {
        const voicesData = await voicesResp.json();
        setAvailableVoices(voicesData.voices || []);
      }

      // Load faces
      const facesResp = await fetch("/api/avatar/faces");
      if (facesResp.ok) {
        const facesData = await facesResp.json();
        setAvailableFaces(facesData.faces || []);
      }
    } catch (err) {
      console.error("Failed to load avatar profiles:", err);
    }
  };

  // -- Platform toggling logic --
  const togglePlatform = (id: string) => {
    setState((s) => {
      const platforms = s.platforms.includes(id)
        ? s.platforms.filter((p) => p !== id)
        : [...s.platforms, id];
      return { ...s, platforms };
    });
  };

  // -- Character count --
  const activePlatforms = PLATFORMS.filter((p) => state.platforms.includes(p.id));
  const maxLength = Math.min(...activePlatforms.map((p) => p.maxLength));
  const charCount = state.content.length;
  const charLimitOver = charCount > maxLength;

  // -- Handle media upload (placeholder logic) --
  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setState((s) => ({ ...s, media: Array.from(e.target.files) }));
  };

  // -- AI Video Generation --
  const generateAiVideo = async () => {
    if (!videoState.script.trim()) return;
    setVideoState((s) => ({ ...s, generating: true, jobId: null, previewUrl: null }));
    setError(null);

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: videoState.script,
          style: videoState.style,
          voice: videoState.voice,
          aspectRatio: videoState.aspectRatio,
          duration: videoState.duration,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate video");

      setVideoState((s) => ({
        ...s,
        generating: false,
        jobId: data.jobId,
        cost: data.estimatedCost.cents,
      }));

      // Start polling for status
      pollVideoStatus(data.jobId);
    } catch (err: any) {
      setError(err.message || "Failed to generate video");
      setVideoState((s) => ({ ...s, generating: false }));
    }
  };

  // -- Load cost estimates --
  const loadCostEstimates = async () => {
    try {
      const videoResp = await fetch("/api/video/generate?action=cost&scriptLength=500&duration=60");
      if (videoResp.ok) {
        const videoData = await videoResp.json();
        setVideoState((s) => ({ ...s, cost: videoData.estimate.userCharge.cents }));
      }

      const avatarResp = await fetch("/api/avatar/generate?action=cost");
      if (avatarResp.ok) {
        const avatarData = await avatarResp.json();
        setAvatarState((s) => ({ ...s, cost: avatarData.pricing.perVideo.cents }));
      }
    } catch (err) {
      console.error("Failed to load cost estimates:", err);
    }
  };

  // -- AI Avatar Generation --
  const generateAiAvatar = async () => {
    if (!avatarState.script.trim() || !avatarState.voiceId || !avatarState.faceId) return;
    setAvatarState((s) => ({ ...s, generating: true, jobId: null, previewUrl: null }));
    setError(null);

    try {
      const response = await fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: avatarState.script,
          voiceId: avatarState.voiceId,
          faceId: avatarState.faceId,
          style: avatarState.style,
          aspectRatio: avatarState.aspectRatio,
          enhanceFace: avatarState.enhanceFace,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate avatar");

      setAvatarState((s) => ({
        ...s,
        generating: false,
        jobId: data.jobId,
        cost: data.estimatedCost.cents,
      }));

      // Start polling for status
      pollAvatarStatus(data.jobId);
    } catch (err: any) {
      setError(err.message || "Failed to generate avatar");
      setAvatarState((s) => ({ ...s, generating: false }));
    }
  };

  // -- Status Polling --
  const pollVideoStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/video/status/${jobId}`);
        const data = await response.json();

        if (data.status === "completed" && data.videoUrl) {
          setVideoState((s) => ({ ...s, previewUrl: data.videoUrl }));
          // Auto-attach to media
          setState((s) => ({ ...s, media: [...s.media, { url: data.videoUrl, type: 'video' } as any] }));
          return;
        } else if (data.status === "failed") {
          setError("Video generation failed");
          return;
        }

        // Continue polling
        setTimeout(poll, 3000);
      } catch (err) {
        console.error("Status poll error:", err);
        setTimeout(poll, 5000);
      }
    };
    poll();
  };

  const pollAvatarStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/avatar/status?jobId=${jobId}`);
        const data = await response.json();

        if (data.status === "completed" && data.videoUrl) {
          setAvatarState((s) => ({ ...s, previewUrl: data.videoUrl }));
          // Auto-attach to media
          setState((s) => ({ ...s, media: [...s.media, { url: data.videoUrl, type: 'video' } as any] }));
          return;
        } else if (data.status === "failed") {
          setError("Avatar generation failed");
          return;
        }

        // Continue polling
        setTimeout(poll, 3000);
      } catch (err) {
        console.error("Status poll error:", err);
        setTimeout(poll, 5000);
      }
    };
    poll();
  };

  // -- Handle form post --
  const handleSchedule = async () => {
    setError(null);
    setState((s) => ({ ...s, posting: true }));

    const postData = {
      content: state.content,
      platforms: state.platforms,
      scheduleType: state.scheduleType,
      scheduledAt: state.scheduledAt,
      media: state.media.map(m => {
        if (typeof m === 'object' && 'url' in m) {
          return { url: m.url, type: m.type };
        }
        return m; // File object
      }),
      mode: mode,
      videoJobId: mode === "ai-video" ? videoState.jobId : null,
      avatarJobId: mode === "ai-avatar" ? avatarState.jobId : null,
    };

    let resp: Response;
    try {
      resp = await fetch("/api/broadcast/post/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to schedule post");

      // Reset state
      setState((s) => ({ ...s, posting: false, content: "", media: [] }));
      setVideoState((s) => ({ ...s, script: "", jobId: null, previewUrl: null }));
      setAvatarState((s) => ({ ...s, script: "", jobId: null, previewUrl: null }));

      if (onPostScheduled && data?.postId) onPostScheduled(data.postId);
    } catch (err: any) {
      setError(err.message || "Failed to schedule post");
      setState((s) => ({ ...s, posting: false }));
    }
  };

  // -- UI Render --
  return (
    <OperatorPanelFrame
      title="Post Composer"
      hint={`Platforms: ${state.platforms.map((id) => PLATFORMS.find((p) => p.id === id)?.name).join(", ")}`}
      right={null}
    >
      <div className="post-composer-content">
        {/* Mode Tabs */}
        <div className="post-composer-tabs">
          {[
            { id: "text", label: "Text Post", icon: "📝" },
            { id: "ai-video", label: "AI Video", icon: "🎬" },
            { id: "ai-avatar", label: "AI Avatar", icon: "🎭" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`post-composer-tab ${mode === tab.id ? 'active' : ''}`}
              onClick={() => setMode(tab.id as ComposerMode)}
              disabled={state.posting}
              type="button"
            >
              <span className="post-composer-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        {/* Platforms selector */}
        <div className="post-composer-platforms">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              className={`post-composer-platform-btn ${state.platforms.includes(p.id) ? 'active' : ''}`}
              type="button"
              onClick={() => togglePlatform(p.id)}
              disabled={state.posting}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore - Dynamic CSS variable requires inline style
              style={{ '--platform-color': p.color } as React.CSSProperties}
              title={p.name}
            >
              <span className="post-composer-platform-icon">{p.icon}</span>
            </button>
          ))}
        </div>

        {/* Content based on mode */}
        {mode === "text" && (
          <>
            {/* Content editor */}
            <div className="post-composer-section">
              <textarea
                className={`xom3-mono post-composer-textarea ${charLimitOver ? 'error' : ''}`}
                rows={4}
                placeholder="Compose your post..."
                value={state.content}
                onChange={(e) => setState((s) => ({ ...s, content: e.target.value }))}
                maxLength={Math.max(...PLATFORMS.map((p) => p.maxLength))}
                disabled={state.posting}
                aria-label="Post content"
              />
              <div className="post-composer-textarea-footer">
                <span className={`post-composer-char-count ${charLimitOver ? 'over-limit' : ''}`}>
                  Character count: {charCount}/{maxLength}
                  {charLimitOver && "Over platform limit"}
                </span>
                <button
                  className="xom3-btn post-composer-ai-assist-btn"
                  type="button"
                  onClick={() => alert("AI Assist coming soon")}
                  disabled={state.posting}
                >
                  AI Assist
                </button>
              </div>
            </div>
          </>
        )}

        {mode === "ai-video" && (
          <>
            {/* AI Video Generation */}
            <div className="post-composer-content">
              <div className="post-composer-section">
                <label htmlFor="video-script" className="post-composer-label">Script</label>
                <textarea
                  id="video-script"
                  className="xom3-mono post-composer-textarea"
                  rows={6}
                  placeholder="Write your video script..."
                  value={videoState.script}
                  onChange={(e) => setVideoState((s) => ({ ...s, script: e.target.value }))}
                  maxLength={5000}
                  disabled={videoState.generating}
                />
                <div className="post-composer-char-count">
                  {videoState.script.length}/5000 characters
                </div>
              </div>

              <div className="post-composer-controls">
                <div className="post-composer-section">
                  <label htmlFor="video-style" className="post-composer-label">Style</label>
                  <select
                    id="video-style"
                    className="post-composer-select"
                    value={videoState.style}
                    onChange={(e) => setVideoState((s) => ({ ...s, style: e.target.value }))}
                    disabled={videoState.generating}
                  >
                    <option value="social">Social</option>
                    <option value="minimal">Minimal</option>
                    <option value="bold">Bold</option>
                    <option value="corporate">Corporate</option>
                    <option value="energetic">Energetic</option>
                    <option value="cinematic">Cinematic</option>
                  </select>
                </div>

                <div className="post-composer-section">
                  <label htmlFor="video-voice" className="post-composer-label">Voice</label>
                  <select
                    id="video-voice"
                    className="post-composer-select"
                    value={videoState.voice}
                    onChange={(e) => setVideoState((s) => ({ ...s, voice: e.target.value }))}
                    disabled={videoState.generating}
                  >
                    <option value="nova">Nova (Female)</option>
                    <option value="alloy">Alloy (Neutral)</option>
                    <option value="echo">Echo (Male)</option>
                    <option value="fable">Fable (British)</option>
                    <option value="onyx">Onyx (Deep)</option>
                    <option value="shimmer">Shimmer (Warm)</option>
                  </select>
                </div>

                <div className="post-composer-section">
                  <label htmlFor="video-aspect" className="post-composer-label">Aspect Ratio</label>
                  <select
                    id="video-aspect"
                    className="post-composer-select"
                    value={videoState.aspectRatio}
                    onChange={(e) => setVideoState((s) => ({ ...s, aspectRatio: e.target.value }))}
                    disabled={videoState.generating}
                  >
                    <option value="9:16">9:16 (Mobile)</option>
                    <option value="16:9">16:9 (Desktop)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:5">4:5 (Portrait)</option>
                  </select>
                </div>
              </div>

              <div className="post-composer-duration-control">
                <label htmlFor="video-duration" className="post-composer-label">
                  Duration: {videoState.duration}s
                </label>
                <input
                  id="video-duration"
                  type="range"
                  min="15"
                  max="180"
                  value={videoState.duration}
                  onChange={(e) => setVideoState((s) => ({ ...s, duration: parseInt(e.target.value) }))}
                  disabled={videoState.generating}
                  className="post-composer-duration-slider"
                />
                <div className="post-composer-cost">
                  Cost: ${(videoState.cost / 100).toFixed(2)}
                </div>
              </div>

              {videoState.previewUrl && (
                <div className="post-composer-video-preview">
                  <video
                    src={videoState.previewUrl}
                    controls
                    aria-label="Generated video preview"
                  />
                </div>
              )}

              <button
                className={`post-composer-generate-btn ${videoState.generating ? 'generating' : 'ready'}`}
                type="button"
                onClick={generateAiVideo}
                disabled={!videoState.script.trim() || videoState.generating}
              >
                {videoState.generating ? "Generating..." : "Generate AI Video"}
              </button>
            </div>
          </>
        )}

        {mode === "ai-avatar" && (
          <>
            {/* AI Avatar Generation */}
            <div className="post-composer-content">
              <div className="post-composer-section">
                <label htmlFor="avatar-script" className="post-composer-label">Script</label>
                <textarea
                  id="avatar-script"
                  className="xom3-mono post-composer-textarea"
                  rows={4}
                  placeholder="Write your avatar script..."
                  value={avatarState.script}
                  onChange={(e) => setAvatarState((s) => ({ ...s, script: e.target.value }))}
                  maxLength={3000}
                  disabled={avatarState.generating}
                />
                <div className="post-composer-char-count">
                  {avatarState.script.length}/3000 characters
                </div>
              </div>

              <div className="post-composer-controls">
                <div className="post-composer-section">
                  <label htmlFor="avatar-voice" className="post-composer-label">Voice Profile</label>
                  <select
                    id="avatar-voice"
                    className="post-composer-select"
                    value={avatarState.voiceId}
                    onChange={(e) => setAvatarState((s) => ({ ...s, voiceId: e.target.value }))}
                    disabled={avatarState.generating}
                  >
                    <option value="">Select Voice Profile</option>
                    {availableVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="post-composer-section">
                  <label htmlFor="avatar-face" className="post-composer-label">Face Profile</label>
                  <select
                    id="avatar-face"
                    className="post-composer-select"
                    value={avatarState.faceId}
                    onChange={(e) => setAvatarState((s) => ({ ...s, faceId: e.target.value }))}
                    disabled={avatarState.generating}
                  >
                    <option value="">Select Face Profile</option>
                    {availableFaces.map((face) => (
                      <option key={face.id} value={face.id}>
                        {face.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="post-composer-section">
                  <label htmlFor="avatar-aspect" className="post-composer-label">Aspect Ratio</label>
                  <select
                    id="avatar-aspect"
                    className="post-composer-select"
                    value={avatarState.aspectRatio}
                    onChange={(e) => setAvatarState((s) => ({ ...s, aspectRatio: e.target.value }))}
                    disabled={avatarState.generating}
                  >
                    <option value="9:16">9:16 (Mobile)</option>
                    <option value="16:9">16:9 (Desktop)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:5">4:5 (Portrait)</option>
                  </select>
                </div>
              </div>

              <div className="post-composer-checkbox-group">
                <label htmlFor="avatar-enhance" className="post-composer-label">
                  <input
                    id="avatar-enhance"
                    type="checkbox"
                    checked={avatarState.enhanceFace}
                    onChange={(e) => setAvatarState((s) => ({ ...s, enhanceFace: e.target.checked }))}
                    disabled={avatarState.generating}
                    className="post-composer-checkbox"
                  />
                  Enhance Face Quality
                </label>
                <div className="post-composer-cost">
                  Cost: ${(avatarState.cost / 100).toFixed(2)}
                </div>
              </div>

              {avatarState.previewUrl && (
                <div className="post-composer-video-preview">
                  <video
                    src={avatarState.previewUrl}
                    controls
                    aria-label="Generated avatar video preview"
                  />
                </div>
              )}

              <button
                className={`post-composer-generate-btn ${avatarState.generating ? 'generating' : 'ready'}`}
                type="button"
                onClick={generateAiAvatar}
                disabled={!avatarState.script.trim() || !avatarState.voiceId || !avatarState.faceId || avatarState.generating}
              >
                {avatarState.generating ? "Generating..." : "Generate AI Avatar"}
              </button>
            </div>
          </>
        )}

        {/* Media uploader (only for text mode) */}
        {mode === "text" && (
          <div className="post-composer-media-upload">
            <input
              type="file"
              ref={fileRef}
              multiple
              accept="image/*,video/*"
              className="post-composer-hidden-file-input"
              onChange={handleMedia}
              disabled={state.posting}
              aria-label="Upload media files"
            />
            <button
              className="post-composer-media-btn"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={state.posting}
            >
              Attach Media
            </button>
            {state.media.length > 0 && (
              <span className="post-composer-media-count">{state.media.length} media attached</span>
            )}
          </div>
        )}

        {/* Generated video attachment info */}
        {(mode === "ai-video" || mode === "ai-avatar") && (
          <div className="post-composer-media-indicator">
            <span className="post-composer-media-indicator-text">
              📹 AI Video will be attached automatically
            </span>
          </div>
        )}

        {/* Schedule picker */}
        <div className="post-composer-schedule-options">
          <label className="post-composer-radio-group">
            <input
              type="radio"
              name="pst-sched"
              checked={state.scheduleType === "now"}
              onChange={() => setState((s) => ({ ...s, scheduleType: "now", scheduledAt: null }))}
              disabled={state.posting}
            />
            <span>Post now</span>
          </label>
          <label className="post-composer-radio-group">
            <input
              type="radio"
              name="pst-sched"
              checked={state.scheduleType === "scheduled"}
              onChange={() => setState((s) => ({ ...s, scheduleType: "scheduled", scheduledAt: s.scheduledAt || new Date().toISOString().slice(0, 16) }))}
              disabled={state.posting}
            />
            <span>Schedule for later</span>
          </label>
          {state.scheduleType === "scheduled" && (
            <input
              type="datetime-local"
              value={state.scheduledAt || ""}
              onChange={(e) => setState((s) => ({ ...s, scheduledAt: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              step="60"
              className="post-composer-datetime-input"
              disabled={state.posting}
              required
              aria-label="Schedule post date and time"
            />
          )}
        </div>

        {/* Preview */}
        <div className="post-composer-preview">
          <div className="post-composer-preview-tabs">
            <span>Preview:</span>
            {activePlatforms.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreviewIdx(idx)}
                className={`post-composer-preview-tab ${previewIdx === idx ? 'active' : ''}`}
                disabled={state.posting}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore - Dynamic CSS variable requires inline style
                style={{
                  '--preview-color': p.color
                } as React.CSSProperties}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className={`post-composer-preview-content ${!state.content ? 'empty' : ''}`}>
            <span className="post-composer-preview-icon">{activePlatforms[previewIdx]?.icon} </span>
            {state.content || <span className="xom3-subtle">Your post preview will appear here...</span>}
            {charCount > activePlatforms[previewIdx]?.maxLength && (
              <span className="post-composer-over-limit">
                Over limit for {activePlatforms[previewIdx].name}: {charCount}/{activePlatforms[previewIdx].maxLength}
              </span>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && <PanelError label="Post scheduling error" error={error} />}

        {/* Actions */}
        <div className="post-composer-actions">
          <button
            type="button"
            onClick={handleSchedule}
            className={`post-composer-schedule-btn ${state.posting ? 'posting' : ''}`}
            disabled={
              state.posting ||
              state.platforms.length === 0 ||
              (mode === "text" && (!state.content.trim() || charLimitOver)) ||
              (mode === "ai-video" && !videoState.previewUrl) ||
              (mode === "ai-avatar" && !avatarState.previewUrl)
            }
          >
            {state.posting ? "Posting..." : "Schedule Post"}
          </button>
        </div>
      </div>
    </OperatorPanelFrame>
  );
}





