import { useState, useRef, useCallback, useEffect } from "react";
import {
  deactivateAllSlides,
  activateSlide,
  saveCanvasLayout,
} from "../api/overlaySlideApi";
import { getContentByKey, updateContentByKey } from "../api/contentApi";
import { getApiBaseUrl } from "../utils/config";

/**
 * OBSCanvasPanel – A full broadcast canvas preview panel for the Dashboard.
 *
 * Renders a 16:9 OBS preview with draggable elements:
 *  - Scorecard tile (live scores)
 *  - Image/file upload elements
 *  - Text label elements
 *
 * Props:
 *  matches, innings, slides, activeSlide, scorecardData, liveMatchId, liveInningsId
 *  onPublish(matchId, inningsId) — called when Confirm Go Live is clicked
 *  onClear() — called when Clear All is clicked
 */
export default function OBSCanvasPanel({
  matches = [],
  innings = [],
  slides = [],
  activeSlide = null,
  scorecardData = null,
  liveMatchId = "",
  liveInningsId = "",
  onPublish,
  onClear,
}) {
  // Canvas elements: each has { id, type, x, y, width?, height?, text?, color?, fontSize?, src?, file?, label? }
  const [elements, setElements] = useState([]);
  const [dragging, setDragging] = useState(null); // { id, startX, startY, origX, origY }
  const [selectedId, setSelectedId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [imageCache, setImageCache] = useState({}); // id -> data URL for uploaded images

  // Scorecard tile config
  const [showScorecardTile, setShowScorecardTile] = useState(false);
  const [scorecardTilePos, setScorecardTilePos] = useState({ x: 5, y: 75 }); // percent

  // Local selected match/innings for live publishing
  const [localMatchId, setLocalMatchId] = useState(liveMatchId || "");
  const [localInningsId, setLocalInningsId] = useState(liveInningsId || "");

  // Selected slide for overlay
  const [selectedSlideId, setSelectedSlideId] = useState("");

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync from parent
  useEffect(() => {
    setLocalMatchId(liveMatchId || "");
    setLocalInningsId(liveInningsId || "");
  }, [liveMatchId, liveInningsId]);

  // ——— Drag logic ———
  const getCanvasPos = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * 1000) / 10,
      y: Math.round(((clientY - rect.top) / rect.height) * 1000) / 10,
    };
  }, []);

  const handleCanvasPointerMove = useCallback(
    (e) => {
      if (!dragging) return;
      e.preventDefault();
      const { x, y } = getCanvasPos(e.clientX, e.clientY);
      if (dragging.id === "__scorecard__") {
        setScorecardTilePos({
          x: Math.max(0, Math.min(85, x)),
          y: Math.max(0, Math.min(85, y)),
        });
      } else {
        setElements((prev) =>
          prev.map((el) =>
            el.id === dragging.id
              ? { ...el, x: Math.max(0, Math.min(95, x)), y: Math.max(0, Math.min(95, y)) }
              : el
          )
        );
      }
    },
    [dragging, getCanvasPos]
  );

  const handleCanvasPointerUp = useCallback(() => setDragging(null), []);

  const startDrag = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ id });
    setSelectedId(id === "__scorecard__" ? "__scorecard__" : id);
  };

  // ——— Add elements ———
  const addTextElement = () => {
    const el = {
      id: `txt_${Date.now()}`,
      type: "text",
      x: 50,
      y: 50,
      text: "New Label",
      color: "#ffffff",
      fontSize: 22,
      fontWeight: "bold",
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const elId = `img_${Date.now()}`;
    reader.onload = (evt) => {
      setImageCache((prev) => ({ ...prev, [elId]: evt.target.result }));
      setElements((prev) => [
        ...prev,
        {
          id: elId,
          type: "image",
          x: 50,
          y: 50,
          label: file.name,
          src: evt.target.result,
          imgWidth: 25, // % of canvas width
        },
      ]);
      setSelectedId(elId);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ——— Delete ———
  const deleteElement = (id) => {
    if (id === "__scorecard__") {
      setShowScorecardTile(false);
      if (selectedId === "__scorecard__") setSelectedId(null);
    } else {
      setElements((prev) => prev.filter((el) => el.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const clearAll = async () => {
    setElements([]);
    setShowScorecardTile(false);
    setSelectedId(null);
    setSelectedSlideId("");
    try { await deactivateAllSlides(); } catch (e) { console.error(e); }
    if (onClear) onClear();
  };

  // ——— Confirm / Go Live ———
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // Activate selected slide if any
      if (selectedSlideId) {
        await activateSlide(Number(selectedSlideId));
      } else {
        await deactivateAllSlides();
      }
      // Publish live match if scorecard tile is shown
      if (showScorecardTile && localMatchId && localInningsId) {
        if (onPublish) await onPublish(localMatchId, localInningsId);
      }
      alert("✅ Layout confirmed and live on stream!");
    } catch (err) {
      console.error("Confirm error:", err);
      alert("Failed to go live. Check console for details.");
    } finally {
      setConfirming(false);
    }
  };

  // ——— Selected element property editor ———
  const updateElement = (id, key, value) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, [key]: value } : el))
    );
  };

  const selectedEl = selectedId && selectedId !== "__scorecard__"
    ? elements.find((el) => el.id === selectedId)
    : null;

  const liveMatch = matches.find((m) => m.id === Number(localMatchId));

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        padding: "1.5rem",
        marginBottom: "2rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "800" }}>
            📡 OBS Broadcast Canvas
          </h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Drag elements to position them. Click Confirm to go live on stream.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-danger"
            style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}
            onClick={clearAll}
          >
            🗑️ Clear All
          </button>
          <button
            className="btn btn-success"
            style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem", fontWeight: "700" }}
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? "Publishing..." : "✅ Confirm Go Live"}
          </button>
        </div>
      </div>

      {/* Two-column layout: Controls | Canvas */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* ——— Left: Controls Panel ——— */}
        <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Scorecard Tile */}
          <div
            style={{
              padding: "0.85rem",
              background: "var(--bg-app)",
              borderRadius: "10px",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.6rem", color: "var(--primary)" }}>
              🏏 Scorecard Tile
            </div>
            {!showScorecardTile ? (
              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.4rem", fontSize: "0.8rem" }}
                onClick={() => setShowScorecardTile(true)}
              >
                ➕ Add to Canvas
              </button>
            ) : (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  Select Match & Innings:
                </div>
                <select
                  className="form-select"
                  style={{ padding: "0.35rem", fontSize: "0.75rem", marginBottom: "0.4rem" }}
                  value={localMatchId}
                  onChange={(e) => { setLocalMatchId(e.target.value); setLocalInningsId(""); }}
                >
                  <option value="">Choose Match</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.teamA?.name} vs {m.teamB?.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  style={{ padding: "0.35rem", fontSize: "0.75rem", marginBottom: "0.5rem" }}
                  value={localInningsId}
                  disabled={!localMatchId}
                  onChange={(e) => setLocalInningsId(e.target.value)}
                >
                  <option value="">Choose Innings</option>
                  {innings
                    .filter((i) => i.match?.id === Number(localMatchId))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.battingTeam?.name} Inns #{i.inningsNumber}
                      </option>
                    ))}
                </select>
                <button
                  className="btn btn-danger"
                  style={{ width: "100%", padding: "0.35rem", fontSize: "0.75rem" }}
                  onClick={() => deleteElement("__scorecard__")}
                >
                  ✕ Remove Tile
                </button>
              </div>
            )}
          </div>

          {/* Image / File Upload */}
          <div
            style={{
              padding: "0.85rem",
              background: "var(--bg-app)",
              borderRadius: "10px",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.6rem", color: "var(--primary)" }}>
              🖼️ Image / File
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <button
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.4rem", fontSize: "0.8rem" }}
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload Image
            </button>
          </div>

          {/* Text Labels */}
          <div
            style={{
              padding: "0.85rem",
              background: "var(--bg-app)",
              borderRadius: "10px",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.6rem", color: "var(--primary)" }}>
              🔤 Text Label
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.4rem", fontSize: "0.8rem" }}
              onClick={addTextElement}
            >
              ➕ Add Text Label
            </button>
          </div>

          {/* Active Title Card */}
          <div
            style={{
              padding: "0.85rem",
              background: "var(--bg-app)",
              borderRadius: "10px",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.6rem", color: "var(--primary)" }}>
              🎬 Title Card Overlay
            </div>
            <select
              className="form-select"
              style={{ padding: "0.35rem", fontSize: "0.75rem" }}
              value={selectedSlideId}
              onChange={(e) => setSelectedSlideId(e.target.value)}
            >
              <option value="">None (clean feed)</option>
              {slides.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Property editor for selected element */}
          {selectedEl && (
            <div
              style={{
                padding: "0.85rem",
                background: "rgba(99,102,241,0.05)",
                borderRadius: "10px",
                border: "1px solid var(--primary)",
              }}
            >
              <div style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.6rem", color: "var(--primary)" }}>
                ✏️ Edit Selected
              </div>
              {selectedEl.type === "text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: "0.35rem", fontSize: "0.8rem" }}
                    value={selectedEl.text}
                    onChange={(e) => updateElement(selectedEl.id, "text", e.target.value)}
                    placeholder="Label text"
                  />
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: "0.35rem", fontSize: "0.75rem", width: "70px" }}
                      min={10}
                      max={80}
                      value={selectedEl.fontSize}
                      onChange={(e) => updateElement(selectedEl.id, "fontSize", Number(e.target.value))}
                      title="Font size"
                    />
                    <input
                      type="color"
                      style={{ width: "40px", height: "32px", border: "none", cursor: "pointer", borderRadius: "4px" }}
                      value={selectedEl.color}
                      onChange={(e) => updateElement(selectedEl.id, "color", e.target.value)}
                      title="Text color"
                    />
                  </div>
                  <select
                    className="form-select"
                    style={{ padding: "0.35rem", fontSize: "0.75rem" }}
                    value={selectedEl.fontWeight || "bold"}
                    onChange={(e) => updateElement(selectedEl.id, "fontWeight", e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="900">Extra Bold</option>
                  </select>
                </div>
              )}
              {selectedEl.type === "image" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Size (% canvas width)
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    value={selectedEl.imgWidth || 25}
                    onChange={(e) => updateElement(selectedEl.id, "imgWidth", Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {selectedEl.imgWidth || 25}%
                  </span>
                </div>
              )}
              <button
                className="btn btn-danger"
                style={{ width: "100%", padding: "0.35rem", fontSize: "0.75rem", marginTop: "0.5rem" }}
                onClick={() => deleteElement(selectedEl.id)}
              >
                🗑️ Delete Element
              </button>
            </div>
          )}
        </div>

        {/* ——— Right: OBS Preview Canvas ——— */}
        <div style={{ flex: "1 1 400px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            16:9 Broadcast Preview
          </div>

          <div
            ref={canvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: "56.25%", // 16:9
              background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1a1a2e 100%)",
              borderRadius: "12px",
              border: "2px solid #334155",
              boxShadow: "0 0 0 1px #1e293b, 0 8px 32px rgba(0,0,0,0.5)",
              overflow: "hidden",
              cursor: dragging ? "grabbing" : "default",
              userSelect: "none",
            }}
            onClick={() => setSelectedId(null)}
          >
            {/* Camera feed placeholder grid */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.02) 59px, rgba(255,255,255,0.02) 60px),
                  repeating-linear-gradient(90deg, transparent, transparent 99px, rgba(255,255,255,0.02) 99px, rgba(255,255,255,0.02) 100px)
                `,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.08)", fontSize: "0.7rem", fontWeight: "600", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                📷 Camera Feed
              </div>
            </div>

            {/* Active Title Card Slide overlay */}
            {selectedSlideId && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <img
                  src={`${getApiBaseUrl()}/api/overlay-slides/${selectedSlideId}/image?t=${Date.now()}`}
                  alt="title card"
                  style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain", opacity: 0.85 }}
                />
              </div>
            )}

            {/* Image elements */}
            {elements.filter((el) => el.type === "image").map((el) => (
              <div
                key={el.id}
                onPointerDown={(e) => startDrag(e, el.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                style={{
                  position: "absolute",
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  width: `${el.imgWidth || 25}%`,
                  outline: selectedId === el.id ? "2px dashed #6366f1" : "2px solid transparent",
                  borderRadius: "4px",
                }}
              >
                <img
                  src={el.src}
                  alt={el.label}
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: "4px" }}
                  draggable={false}
                />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "none",
                    color: "#fff",
                    fontSize: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Text elements */}
            {elements.filter((el) => el.type === "text").map((el) => (
              <div
                key={el.id}
                onPointerDown={(e) => startDrag(e, el.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                style={{
                  position: "absolute",
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  color: el.color || "#fff",
                  fontSize: `${el.fontSize || 22}px`,
                  fontWeight: el.fontWeight || "bold",
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: "2px 2px 6px rgba(0,0,0,0.9), -1px -1px 0 #000",
                  whiteSpace: "nowrap",
                  padding: "2px 6px",
                  outline: selectedId === el.id ? "1px dashed #6366f1" : "1px solid transparent",
                  borderRadius: "3px",
                  background: selectedId === el.id ? "rgba(99,102,241,0.15)" : "transparent",
                }}
              >
                {el.text}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "none",
                    color: "#fff",
                    fontSize: "9px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Scorecard Tile */}
            {showScorecardTile && (
              <div
                onPointerDown={(e) => startDrag(e, "__scorecard__")}
                onClick={(e) => { e.stopPropagation(); setSelectedId("__scorecard__"); }}
                style={{
                  position: "absolute",
                  left: `${scorecardTilePos.x}%`,
                  top: `${scorecardTilePos.y}%`,
                  cursor: "grab",
                  minWidth: "220px",
                  outline: selectedId === "__scorecard__" ? "2px dashed #10b981" : "2px solid rgba(16,185,129,0.4)",
                  borderRadius: "6px",
                  overflow: "hidden",
                  fontFamily: "'Outfit', 'Arial Black', sans-serif",
                  textTransform: "uppercase",
                  fontSize: "10px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                }}
              >
                {/* Score bar preview */}
                <div style={{ background: "#111827", padding: "5px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ background: "#fbbf24", color: "#000", fontWeight: "900", padding: "2px 6px", borderRadius: "3px", fontSize: "9px" }}>
                    {liveMatch ? liveMatch.teamA?.name?.toUpperCase() : "TEAM A"}
                  </div>
                  <div style={{ color: "#fff", fontWeight: "900", fontSize: "12px" }}>
                    {scorecardData?.batting?.[0]?.runs ?? 0}-{scorecardData?.batting?.filter(b => b.out)?.length ?? 0}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "9px" }}>LIVE</div>
                  <div style={{ marginLeft: "auto", color: "#f97316", fontWeight: "700", fontSize: "9px" }}>
                    vs {liveMatch ? liveMatch.teamB?.name?.toUpperCase() : "TEAM B"}
                  </div>
                </div>
                <div style={{ background: "#1e293b", padding: "3px 8px", color: "#94a3b8", fontSize: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span>🏏 Scorecard Live</span>
                  <span>Drag to reposition</span>
                </div>
                {/* Delete button */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); deleteElement("__scorecard__"); }}
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "none",
                    color: "#fff",
                    fontSize: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Corner labels */}
            <div style={{ position: "absolute", top: "6px", left: "8px", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontWeight: "600", letterSpacing: "0.05em" }}>
              OBS PREVIEW
            </div>
            <div style={{ position: "absolute", top: "6px", right: "8px", fontSize: "0.6rem", color: "#10b981", fontWeight: "700" }}>
              ● LIVE
            </div>
          </div>

          {/* Canvas hint */}
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem", textAlign: "center" }}>
            💡 Drag elements to position them on canvas. Use ✕ to remove. Click <b>Confirm Go Live</b> to broadcast.
          </p>
        </div>
      </div>
    </div>
  );
}
