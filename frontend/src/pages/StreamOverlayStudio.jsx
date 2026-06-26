import { useEffect, useState, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { getMatches } from "../api/matchApi";
import { getTeams } from "../api/teamApi";
import { getAssets, uploadAsset, deleteAsset } from "../api/streamStudioApi";
import {
  getSlidesByMatch,
  createSlide,
  deleteSlide,
  saveSlideLayout,
  updateSlideTitle,
} from "../api/overlaySlideApi";
import { getApiBaseUrl } from "../utils/config";
import axiosClient from "../api/axiosClient";

/* ─── tiny helpers ─── */
const uid = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const CANVAS_W = 1920;
const CANVAS_H = 1080;

export default function StreamOverlayStudio() {
  /* ── data ── */
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [slides, setSlides] = useState([]);
  const [assets, setAssets] = useState([]);

  /* ── UI mode ── */
  const [mode, setMode] = useState("slides"); // 'slides' | 'editor'
  const [activeSlide, setActiveSlide] = useState(null);

  /* ── canvas elements ── */
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [snapGrid, setSnapGrid] = useState(true);

  /* ── canvas scale ── */
  const canvasWrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);

  /* ── drag state ── */
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  /* ── crop / adjust ── */
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 100, h: 100 });

  /* ── modals ── */
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [newSlideName, setNewSlideName] = useState("");
  const [newSlideBg, setNewSlideBg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assetUploadFile, setAssetUploadFile] = useState(null);
  const [assetUploadName, setAssetUploadName] = useState("");

  /* ── selected element computed ── */
  const selectedEl = elements.find((e) => e.id === selectedId) || null;

  /* ════════════════════════════════════════════
     BOOT
  ════════════════════════════════════════════ */
  useEffect(() => {
    (async () => {
      const ms = await getMatches().catch(() => []);
      setMatches(ms);
      loadAssets();
      const savedId = localStorage.getItem("oss_match_id");
      if (savedId) {
        const found = ms.find((m) => String(m.id) === savedId);
        if (found) selectMatch(found, ms);
        else setShowMatchModal(true);
      } else {
        setShowMatchModal(true);
      }
    })();
  }, []);

  const loadAssets = async () => {
    const data = await getAssets().catch(() => []);
    setAssets(data);
  };

  /* ════════════════════════════════════════════
     MATCH SELECTION — clear everything old
  ════════════════════════════════════════════ */
  const selectMatch = async (match, matchList) => {
    // Clear old state immediately
    setElements([]);
    setSelectedId(null);
    setActiveSlide(null);
    setMode("slides");
    setCropMode(false);

    setSelectedMatch(match);
    localStorage.setItem("oss_match_id", String(match.id));
    setShowMatchModal(false);

    // Load slides for this match
    const sl = await getSlidesByMatch(match.id).catch(() => []);
    setSlides(sl);
  };

  /* ════════════════════════════════════════════
     CANVAS SCALING
  ════════════════════════════════════════════ */
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const update = () => {
      const { clientWidth: w, clientHeight: h } = el;
      const sx = w / CANVAS_W;
      const sy = h / CANVAS_H;
      setScale(Math.min(sx, sy, 1));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, [mode]);

  /* ════════════════════════════════════════════
     OPEN SLIDE IN EDITOR
  ════════════════════════════════════════════ */
  const openSlideInEditor = (slide) => {
    setActiveSlide(slide);
    setSelectedId(null);
    setCropMode(false);
    let parsed = [];
    try { parsed = JSON.parse(slide.overlayLayout || "[]"); } catch (_) {}
    setElements(Array.isArray(parsed) ? parsed : []);
    setMode("editor");
  };

  /* ════════════════════════════════════════════
     CREATE NEW SLIDE
  ════════════════════════════════════════════ */
  const handleCreateSlide = async () => {
    if (!newSlideName.trim()) { alert("Enter a slide name."); return; }
    if (!selectedMatch) { alert("Select a match first."); return; }
    setIsSaving(true);
    try {
      // We need a background file. If none provided, create a transparent 1x1 PNG blob.
      let fileToSend = newSlideBg;
      if (!fileToSend) {
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_W; canvas.height = CANVAS_H;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
        fileToSend = new File([blob], "bg.png", { type: "image/png" });
      }
      const slide = await createSlide(
        newSlideName.trim(),
        CANVAS_W, CANVAS_H,
        fileToSend,
        selectedMatch.id
      );
      const newSlides = [...slides, slide];
      setSlides(newSlides);
      setShowCreateModal(false);
      setNewSlideName("");
      setNewSlideBg(null);

      // Auto-import team logos + names into this slide
      const initElements = buildTeamElements(selectedMatch);
      await saveSlideLayout(slide.id, JSON.stringify(initElements));
      const refreshed = { ...slide, overlayLayout: JSON.stringify(initElements) };
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? refreshed : s)));
      openSlideInEditor(refreshed);
    } catch (err) {
      console.error(err);
      alert("Failed to create slide.");
    } finally { setIsSaving(false); }
  };

  const buildTeamElements = (match) => {
    const base = getApiBaseUrl();
    const els = [];
    const aId = match?.teamA?.id;
    const bId = match?.teamB?.id;
    const aName = match?.teamA?.name || "Team A";
    const bName = match?.teamB?.name || "Team B";

    // Team A logo
    if (aId) els.push({
      id: uid(), type: "image", name: `${aName} Logo`,
      imageUrl: `${base}/api/teams/${aId}/logo`,
      x: 60, y: 350, width: 220, height: 220,
      rotation: 0, opacity: 1, zIndex: 10, locked: false, visible: true,
    });

    // Team B logo
    if (bId) els.push({
      id: uid(), type: "image", name: `${bName} Logo`,
      imageUrl: `${base}/api/teams/${bId}/logo`,
      x: 1640, y: 350, width: 220, height: 220,
      rotation: 0, opacity: 1, zIndex: 10, locked: false, visible: true,
    });

    // VS text
    els.push({
      id: uid(), type: "text", name: "VS",
      text: "VS",
      x: 860, y: 420, width: 200, height: 120,
      rotation: 0, opacity: 1, zIndex: 11, locked: false, visible: true,
      style: { color: "#facc15", fontSize: "96px", fontWeight: "900", fontFamily: "Outfit, sans-serif", textAlign: "center" },
    });

    // Team A name
    els.push({
      id: uid(), type: "text", name: `${aName} Name`,
      text: aName,
      x: 20, y: 620, width: 560, height: 80,
      rotation: 0, opacity: 1, zIndex: 11, locked: false, visible: true,
      style: { color: "#ffffff", fontSize: "48px", fontWeight: "800", fontFamily: "Outfit, sans-serif", textAlign: "center" },
    });

    // Team B name
    els.push({
      id: uid(), type: "text", name: `${bName} Name`,
      text: bName,
      x: 1340, y: 620, width: 560, height: 80,
      rotation: 0, opacity: 1, zIndex: 11, locked: false, visible: true,
      style: { color: "#ffffff", fontSize: "48px", fontWeight: "800", fontFamily: "Outfit, sans-serif", textAlign: "center" },
    });

    // Match info
    const dateStr = match?.matchDate
      ? new Date(match.matchDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "";
    els.push({
      id: uid(), type: "text", name: "Match Info",
      text: `${match?.venue || ""}\n${dateStr}`,
      x: 660, y: 820, width: 600, height: 100,
      rotation: 0, opacity: 1, zIndex: 11, locked: false, visible: true,
      style: { color: "#94a3b8", fontSize: "32px", fontWeight: "600", fontFamily: "Outfit, sans-serif", textAlign: "center" },
    });

    return els;
  };

  /* ════════════════════════════════════════════
     SAVE LAYOUT
  ════════════════════════════════════════════ */
  const handleSave = async () => {
    if (!activeSlide) return;
    setIsSaving(true);
    try {
      await saveSlideLayout(activeSlide.id, JSON.stringify(elements));
      const updated = { ...activeSlide, overlayLayout: JSON.stringify(elements) };
      setActiveSlide(updated);
      setSlides((prev) => prev.map((s) => (s.id === activeSlide.id ? updated : s)));
      // Brief flash
      const btn = document.getElementById("oss-save-btn");
      if (btn) { btn.textContent = "✓ Saved!"; setTimeout(() => { if (btn) btn.textContent = "💾 Save"; }, 1500); }
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally { setIsSaving(false); }
  };

  /* ════════════════════════════════════════════
     DELETE SLIDE
  ════════════════════════════════════════════ */
  const handleDeleteSlide = async (slide, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete slide "${slide.title}"?`)) return;
    try {
      await deleteSlide(slide.id);
      const remaining = slides.filter((s) => s.id !== slide.id);
      setSlides(remaining);
      if (activeSlide?.id === slide.id) {
        setActiveSlide(null);
        setElements([]);
        setMode("slides");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete slide.");
    }
  };

  /* ════════════════════════════════════════════
     CANVAS DRAG / RESIZE
  ════════════════════════════════════════════ */
  const onPointerDown = useCallback((e, el, action) => {
    if (el.locked && action === "drag") return;
    e.stopPropagation();
    setSelectedId(el.id);
    setIsDragging(true);
    dragRef.current = {
      action, elId: el.id,
      startX: e.clientX, startY: e.clientY,
      startElX: el.x, startElY: el.y,
      startElW: el.width, startElH: el.height,
    };
    const onMove = (ev) => {
      const info = dragRef.current;
      if (!info) return;
      const dx = ev.clientX - info.startX;
      const dy = ev.clientY - info.startY;
      if (info.action === "drag") {
        const pxPctX = (dx / scale) / CANVAS_W * 100;
        const pxPctY = (dy / scale) / CANVAS_H * 100;
        let nx = info.startElX + pxPctX;
        let ny = info.startElY + pxPctY;
        if (snapGrid) { nx = Math.round(nx / 0.5) * 0.5; ny = Math.round(ny / 0.5) * 0.5; }
        nx = Math.max(0, Math.min(95, nx));
        ny = Math.max(0, Math.min(95, ny));
        setElements((prev) => prev.map((el2) => el2.id === info.elId ? { ...el2, x: nx, y: ny } : el2));
      } else if (info.action === "resize") {
        let nw = Math.max(40, info.startElW + dx / scale);
        let nh = Math.max(20, info.startElH + dy / scale);
        if (snapGrid) { nw = Math.round(nw / 10) * 10; nh = Math.round(nh / 10) * 10; }
        setElements((prev) => prev.map((el2) => el2.id === info.elId ? { ...el2, width: nw, height: nh } : el2));
      }
    };
    const onUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [scale, snapGrid]);

  /* ── keyboard delete ── */
  useEffect(() => {
    const handler = (e) => {
      if (!selectedId) return;
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]);

  /* ════════════════════════════════════════════
     ADD ELEMENTS
  ════════════════════════════════════════════ */
  const addElement = (type) => {
    const base = {
      id: uid(), type, x: 10, y: 10, width: 300, height: 80,
      rotation: 0, opacity: 1, zIndex: elements.length + 10,
      locked: false, visible: true,
    };
    if (type === "text") {
      base.text = "Double-click to edit";
      base.style = {
        color: "#ffffff", fontSize: "36px", fontWeight: "700",
        fontFamily: "Outfit, sans-serif", textAlign: "center",
        backgroundColor: "transparent",
      };
    } else if (type === "rect") {
      base.width = 400; base.height = 120;
      base.style = { backgroundColor: "rgba(99,102,241,0.85)", borderRadius: "12px", border: "2px solid #6366f1" };
    } else if (type === "image") {
      base.width = 200; base.height = 200;
      base.imageUrl = "";
    } else if (type === "scoreboard") {
      base.width = 900; base.height = 80; base.x = 5; base.y = 5;
    }
    setElements((prev) => [...prev, base]);
    setSelectedId(base.id);
  };

  /* ════════════════════════════════════════════
     UPDATE SELECTED ELEMENT
  ════════════════════════════════════════════ */
  const updateEl = (patch) => {
    setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, ...patch } : el));
  };
  const updateElStyle = (patch) => {
    setElements((prev) => prev.map((el) =>
      el.id === selectedId ? { ...el, style: { ...(el.style || {}), ...patch } } : el
    ));
  };

  /* ════════════════════════════════════════════
     ASSET UPLOAD
  ════════════════════════════════════════════ */
  const handleAssetUpload = async () => {
    if (!assetUploadFile || !assetUploadName.trim()) { alert("Provide name and file."); return; }
    const uploaded = await uploadAsset(assetUploadName.trim(), "SPONSOR_IMAGE", assetUploadFile);
    setAssets((prev) => [...prev, uploaded]);
    setAssetUploadName(""); setAssetUploadFile(null);
  };

  const applyAssetToElement = (asset) => {
    if (!selectedId) { alert("Select an image element first."); return; }
    const base = getApiBaseUrl();
    updateEl({ imageUrl: `${base}/api/overlay-studio/assets/${asset.id}/file`, assetId: asset.id });
    setShowAssetPicker(false);
  };

  /* ════════════════════════════════════════════
     RENDER ELEMENT ON CANVAS
  ════════════════════════════════════════════ */
  const renderElement = (el) => {
    const isSelected = el.id === selectedId;
    const left = `${el.x}%`;
    const top = `${el.y}%`;
    const style = {
      position: "absolute",
      left, top,
      width: el.width,
      height: el.height,
      transform: `rotate(${el.rotation || 0}deg)`,
      opacity: el.opacity ?? 1,
      zIndex: el.zIndex || 1,
      cursor: el.locked ? "default" : "move",
      outline: isSelected ? "2px solid #6366f1" : "none",
      outlineOffset: "2px",
      userSelect: "none",
      boxSizing: "border-box",
      display: el.visible === false ? "none" : undefined,
    };

    let inner = null;
    if (el.type === "text") {
      inner = (
        <div
          style={{
            width: "100%", height: "100%", display: "flex",
            alignItems: "center", justifyContent: "center",
            whiteSpace: "pre-wrap", overflow: "hidden",
            ...(el.style || {}),
          }}
          suppressContentEditableWarning
          contentEditable={isSelected}
          onBlur={(e) => updateEl({ text: e.currentTarget.innerText })}
          dangerouslySetInnerHTML={isSelected ? undefined : { __html: el.text || "" }}
        >
          {isSelected ? el.text : undefined}
        </div>
      );
    } else if (el.type === "image") {
      inner = el.imageUrl ? (
        <img
          src={el.imageUrl}
          alt=""
          style={{
            width: "100%", height: "100%",
            objectFit: "contain",
            borderRadius: el.style?.borderRadius || "0",
            pointerEvents: "none",
          }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(99,102,241,0.15)", border: "2px dashed #6366f1",
          borderRadius: "8px", color: "#6366f1", fontSize: "14px", fontWeight: "600",
        }}>
          🖼 Click to set image
        </div>
      );
    } else if (el.type === "rect") {
      inner = <div style={{ width: "100%", height: "100%", ...(el.style || {}) }} />;
    } else if (el.type === "scoreboard") {
      inner = (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          background: "rgba(15,23,42,0.95)", border: "2px solid #eab308",
          borderRadius: "12px", padding: "0 16px", gap: "16px",
          fontFamily: "Outfit, sans-serif",
        }}>
          <span style={{ color: "#facc15", fontWeight: "900", fontSize: "22px" }}>
            {selectedMatch?.teamA?.name?.substring(0, 3).toUpperCase() || "TMA"}
          </span>
          <span style={{ color: "#fff", fontWeight: "900", fontSize: "28px" }}>0/0</span>
          <span style={{ color: "#94a3b8", fontSize: "16px" }}>0.0 ov</span>
          <span style={{ color: "#ef4444", fontWeight: "800", fontSize: "18px", margin: "0 8px" }}>VS</span>
          <span style={{ color: "#facc15", fontWeight: "900", fontSize: "22px" }}>
            {selectedMatch?.teamB?.name?.substring(0, 3).toUpperCase() || "TMB"}
          </span>
        </div>
      );
    }

    return (
      <div
        key={el.id}
        style={style}
        onPointerDown={(e) => onPointerDown(e, el, "drag")}
        onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); setCropMode(false); }}
      >
        {inner}
        {/* Resize handle */}
        {isSelected && !el.locked && (
          <>
            <div
              onPointerDown={(e) => onPointerDown(e, el, "resize")}
              style={{
                position: "absolute", right: -6, bottom: -6,
                width: 14, height: 14, background: "#6366f1",
                border: "2px solid #fff", borderRadius: "3px",
                cursor: "se-resize", zIndex: 999,
              }}
            />
            {/* Rotation handle */}
            <div style={{
              position: "absolute", top: -24, left: "50%",
              transform: "translateX(-50%)",
              width: 14, height: 14, background: "#f59e0b",
              border: "2px solid #fff", borderRadius: "50%",
              cursor: "crosshair", zIndex: 999,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "8px",
            }}>↻</div>
          </>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════════
     JSX
  ════════════════════════════════════════════ */
  return (
    <div className="app-container" style={{ overflow: "hidden" }}>
      <style>{`
        .oss-panel { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; }
        .oss-slide-thumb { cursor: pointer; border-radius: 8px; border: 2px solid transparent; transition: all 0.18s; overflow: hidden; background: #0f172a; }
        .oss-slide-thumb:hover { border-color: #6366f1; transform: translateY(-2px); }
        .oss-slide-thumb.active { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.25); }
        .oss-tool-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-light); background: transparent; color: var(--text-primary); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; }
        .oss-tool-btn:hover { background: rgba(99,102,241,0.1); border-color: #6366f1; color: #6366f1; }
        .oss-tool-btn.active { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #6366f1; }
        .oss-prop-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .oss-prop-label { font-size: 0.72rem; color: var(--text-secondary); font-weight: 600; min-width: 56px; }
        .oss-prop-input { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-light); background: var(--bg-app); color: var(--text-primary); font-size: 0.8rem; }
        .oss-section-title { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin: 12px 0 6px 0; }
        .oss-match-card { padding: 12px 16px; border-radius: 10px; background: var(--bg-app); border: 2px solid var(--border-light); cursor: pointer; transition: all 0.18s; }
        .oss-match-card:hover { border-color: #6366f1; background: rgba(99,102,241,0.07); transform: translateY(-2px); }
      `}</style>

      <Sidebar />

      {/* ── MATCH PICKER MODAL ── */}
      {showMatchModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(5,7,20,0.9)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-light)",
            borderRadius: "20px", padding: "2.5rem",
            width: "min(90vw, 720px)", maxHeight: "85vh", overflowY: "auto",
            display: "flex", flexDirection: "column", gap: "1.5rem",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎨</div>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800" }}>Stream Overlay Studio</h2>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>
                Select a match to begin. Team logos & info will auto-import.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: "0.75rem" }}>
              {matches.map((m) => (
                <div key={m.id} className="oss-match-card" onClick={() => selectMatch(m, matches)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: "700", padding: "2px 8px",
                      borderRadius: "20px", background: "rgba(99,102,241,0.12)", color: "#6366f1",
                    }}>{m.status || "SCHEDULED"}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>#{m.id}</span>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "1rem", marginBottom: "3px" }}>
                    {m.teamA?.name || "TBA"} <span style={{ color: "#6366f1" }}>vs</span> {m.teamB?.name || "TBA"}
                  </div>
                  {m.venue && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>📍 {m.venue}</div>}
                </div>
              ))}
            </div>
            {selectedMatch && (
              <div style={{ textAlign: "center" }}>
                <button className="btn btn-secondary" style={{ fontSize: "0.85rem" }}
                  onClick={() => setShowMatchModal(false)}>
                  Keep: {selectedMatch.teamA?.name} vs {selectedMatch.teamB?.name}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE SLIDE MODAL ── */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(5,7,20,0.85)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-light)",
            borderRadius: "16px", padding: "2rem", width: "min(90vw, 480px)",
            display: "flex", flexDirection: "column", gap: "1.25rem",
          }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800" }}>✨ Create New Slide</h3>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "6px" }}>Slide Name</label>
              <input
                className="form-input" value={newSlideName}
                onChange={(e) => setNewSlideName(e.target.value)}
                placeholder="e.g. Match Intro, Toss Card..."
                style={{ width: "100%", boxSizing: "border-box" }}
                onKeyDown={(e) => e.key === "Enter" && handleCreateSlide()}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                Background Image <span style={{ color: "var(--text-muted)", fontWeight: "400" }}>(optional — defaults to dark)</span>
              </label>
              <input type="file" accept="image/*"
                onChange={(e) => setNewSlideBg(e.target.files[0])}
                style={{ fontSize: "0.8rem" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setNewSlideName(""); setNewSlideBg(null); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateSlide} disabled={isSaving}>
                {isSaving ? "⏳ Creating..." : "✨ Create & Edit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSET PICKER MODAL ── */}
      {showAssetPicker && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9997,
          background: "rgba(5,7,20,0.85)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-light)",
            borderRadius: "16px", padding: "2rem", width: "min(90vw, 640px)",
            maxHeight: "80vh", overflowY: "auto",
            display: "flex", flexDirection: "column", gap: "1rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>🖼 Asset Library</h3>
              <button className="btn btn-secondary" style={{ padding: "4px 10px" }} onClick={() => setShowAssetPicker(false)}>✕ Close</button>
            </div>
            {/* Upload new */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "12px", background: "var(--bg-app)", borderRadius: "8px" }}>
              <input className="form-input" style={{ flex: 1 }} placeholder="Asset name..." value={assetUploadName}
                onChange={(e) => setAssetUploadName(e.target.value)} />
              <input type="file" accept="image/*" style={{ flex: 1.5, fontSize: "0.78rem" }}
                onChange={(e) => setAssetUploadFile(e.target.files[0])} />
              <button className="btn btn-primary" style={{ padding: "6px 14px", whiteSpace: "nowrap" }}
                onClick={handleAssetUpload}>Upload</button>
            </div>
            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: "10px" }}>
              {assets.map((a) => (
                <div key={a.id} onClick={() => applyAssetToElement(a)}
                  style={{
                    cursor: "pointer", border: "2px solid var(--border-light)",
                    borderRadius: "8px", overflow: "hidden", transition: "all 0.15s",
                    background: "#0f172a",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#6366f1"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-light)"}
                >
                  <img src={`${getApiBaseUrl()}/api/overlay-studio/assets/${a.id}/file`}
                    alt={a.name}
                    style={{ width: "100%", height: "90px", objectFit: "contain", padding: "6px" }}
                    onError={(e) => { e.target.src = ""; e.target.style.display = "none"; }}
                  />
                  <div style={{ padding: "4px 6px", fontSize: "0.72rem", fontWeight: "600", color: "var(--text-secondary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {a.name}
                  </div>
                </div>
              ))}
              {assets.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No assets yet. Upload one above.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MAIN LAYOUT
      ════════════════════════════════════════════ */}
      <div className="main-content" style={{ padding: "1rem", height: "100vh", display: "flex", flexDirection: "column", gap: "0", overflow: "hidden" }}>

        {/* ── TOP BAR ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 16px", background: "var(--bg-card)",
          border: "1px solid var(--border-light)", borderRadius: "12px",
          marginBottom: "10px", flexShrink: 0, flexWrap: "wrap",
        }}>
          {/* Studio title */}
          <span style={{ fontWeight: "900", fontSize: "1.1rem", marginRight: "4px" }}>🎨 Overlay Studio</span>

          {/* Match selector */}
          <button
            className="oss-tool-btn"
            onClick={() => setShowMatchModal(true)}
            style={{ maxWidth: "300px" }}
          >
            🏏 {selectedMatch
              ? `${selectedMatch.teamA?.name} vs ${selectedMatch.teamB?.name}`
              : "Select Match"}
            <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>↓</span>
          </button>

          <div style={{ flex: 1 }} />

          {mode === "slides" && (
            <>
              <button className="oss-tool-btn active" onClick={() => { setShowCreateModal(true); }}>
                ✨ Create Slide
              </button>
            </>
          )}

          {mode === "editor" && (
            <>
              {/* Add element tools */}
              <button className="oss-tool-btn" onClick={() => addElement("text")} title="Add text block">T Text</button>
              <button className="oss-tool-btn" onClick={() => addElement("rect")} title="Add rectangle">▬ Shape</button>
              <button className="oss-tool-btn" onClick={() => addElement("image")} title="Add image">🖼 Image</button>
              <button className="oss-tool-btn" onClick={() => addElement("scoreboard")} title="Add scoreboard">📊 Score</button>

              {/* Snap grid */}
              <button
                className={`oss-tool-btn ${snapGrid ? "active" : ""}`}
                onClick={() => setSnapGrid((v) => !v)}
                title="Toggle snap to grid"
              >
                ⊞ Snap
              </button>

              <div style={{ width: 1, height: 24, background: "var(--border-light)", margin: "0 4px" }} />

              {/* Back to slides */}
              <button className="oss-tool-btn" onClick={() => { setMode("slides"); setSelectedId(null); }}>
                ← Slides
              </button>

              {/* Save */}
              <button
                id="oss-save-btn"
                className="btn btn-primary"
                style={{ padding: "6px 18px", fontSize: "0.82rem" }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "⏳" : "💾 Save"}
              </button>
            </>
          )}
        </div>

        {/* ── 3-PANEL WORKSPACE ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: mode === "editor" ? "220px 1fr 260px" : "220px 1fr",
          gap: "10px",
          flex: 1,
          minHeight: 0,
        }}>

          {/* ══ LEFT: SLIDE LIST ══ */}
          <div className="oss-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "6px" }}>
                📑 Slides
              </div>
              {selectedMatch && (
                <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-primary)" }}>
                  {selectedMatch.teamA?.name} vs {selectedMatch.teamB?.name}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
              {slides.length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  {selectedMatch ? "No slides yet.\nClick ✨ Create Slide to start." : "Select a match first."}
                </div>
              )}
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className={`oss-slide-thumb ${activeSlide?.id === slide.id ? "active" : ""}`}
                  onClick={() => openSlideInEditor(slide)}
                  style={{ marginBottom: "10px", position: "relative" }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#0f172a" }}>
                    <img
                      src={`${getApiBaseUrl()}/api/overlay-slides/${slide.id}/image`}
                      alt={slide.title}
                      style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    {/* Edit overlay on hover */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(99,102,241,0.75)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: 0, transition: "opacity 0.18s",
                      fontSize: "0.85rem", fontWeight: "700", color: "#fff",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                    >
                      ✏️ Edit
                    </div>
                  </div>
                  {/* Slide name + delete */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 8px",
                  }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {slide.title}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSlide(slide, e)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "0.75rem", padding: "2px 4px", flexShrink: 0 }}
                      title="Delete slide"
                    >🗑</button>
                  </div>
                </div>
              ))}

              {/* Add slide shortcut */}
              {selectedMatch && (
                <div
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    border: "2px dashed var(--border-light)", borderRadius: "8px",
                    padding: "1rem", textAlign: "center", cursor: "pointer",
                    color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "600",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  + New Slide
                </div>
              )}
            </div>
          </div>

          {/* ══ CENTER: CANVAS ══ */}
          <div className="oss-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {mode === "slides" ? (
              /* SLIDES OVERVIEW MODE */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", gap: "1.5rem" }}>
                <div style={{ fontSize: "4rem" }}>🎨</div>
                <div style={{ textAlign: "center" }}>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "1.5rem" }}>
                    {selectedMatch
                      ? `${selectedMatch.teamA?.name} vs ${selectedMatch.teamB?.name}`
                      : "Select a Match"}
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
                    {slides.length > 0
                      ? `${slides.length} slide${slides.length !== 1 ? "s" : ""} — click a slide on the left to edit`
                      : selectedMatch
                        ? "No slides yet. Click ✨ Create Slide to get started."
                        : "Click 'Select Match' in the top bar to begin."}
                  </p>
                </div>
                {selectedMatch && (
                  <button className="btn btn-primary" style={{ padding: "10px 28px" }}
                    onClick={() => setShowCreateModal(true)}>
                    ✨ Create First Slide
                  </button>
                )}
                {/* Slide grid preview */}
                {slides.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "12px", width: "100%", maxHeight: "400px", overflowY: "auto" }}>
                    {slides.map((slide) => (
                      <div
                        key={slide.id}
                        className="oss-slide-thumb"
                        onClick={() => openSlideInEditor(slide)}
                        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
                      >
                        <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#0f172a" }}>
                          <img
                            src={`${getApiBaseUrl()}/api/overlay-slides/${slide.id}/image`}
                            alt={slide.title}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        </div>
                        <div style={{ padding: "8px 10px", fontSize: "0.82rem", fontWeight: "700" }}>{slide.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* EDITOR MODE */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Slide name bar */}
                <div style={{
                  padding: "8px 14px", borderBottom: "1px solid var(--border-light)",
                  display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
                }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>Editing:</span>
                  <span style={{ fontWeight: "800", fontSize: "0.9rem" }}>{activeSlide?.title}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                    {CANVAS_W} × {CANVAS_H} · {(scale * 100).toFixed(0)}% zoom
                  </span>
                </div>

                {/* Canvas wrapper */}
                <div
                  ref={canvasWrapRef}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#0a0e1a", overflow: "hidden", position: "relative",
                  }}
                  onClick={() => { setSelectedId(null); setCropMode(false); }}
                >
                  {/* The actual canvas */}
                  <div
                    ref={canvasRef}
                    style={{
                      position: "relative",
                      width: CANVAS_W,
                      height: CANVAS_H,
                      transform: `scale(${scale})`,
                      transformOrigin: "center center",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#0f172a",
                      boxShadow: "0 0 60px rgba(0,0,0,0.8)",
                    }}
                  >
                    {/* Background image */}
                    {activeSlide && (
                      <img
                        src={`${getApiBaseUrl()}/api/overlay-slides/${activeSlide.id}/image`}
                        alt="bg"
                        style={{
                          position: "absolute", inset: 0, width: "100%", height: "100%",
                          objectFit: "cover", pointerEvents: "none",
                        }}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    )}
                    {/* Elements */}
                    {elements.map(renderElement)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT: PROPERTIES PANEL (editor mode only) ══ */}
          {mode === "editor" && (
            <div className="oss-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                  Properties
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
                {!selectedEl ? (
                  <div>
                    {/* No element selected — show add panel */}
                    <p className="oss-section-title">Add Elements</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {[
                        { label: "T  Text Block", type: "text" },
                        { label: "▬  Shape / Box", type: "rect" },
                        { label: "🖼  Image", type: "image" },
                        { label: "📊  Scoreboard", type: "scoreboard" },
                      ].map(({ label, type }) => (
                        <button key={type} className="oss-tool-btn"
                          style={{ justifyContent: "flex-start", padding: "8px 12px" }}
                          onClick={() => addElement(type)}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <p className="oss-section-title" style={{ marginTop: "16px" }}>Team Assets</p>
                    {selectedMatch && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[selectedMatch.teamA, selectedMatch.teamB].filter(Boolean).map((team) => (
                          <button key={team.id} className="oss-tool-btn"
                            style={{ justifyContent: "flex-start" }}
                            onClick={() => {
                              const el = {
                                id: uid(), type: "image", name: `${team.name} Logo`,
                                imageUrl: `${getApiBaseUrl()}/api/teams/${team.id}/logo`,
                                x: 10, y: 10, width: 150, height: 150,
                                rotation: 0, opacity: 1, zIndex: elements.length + 10,
                                locked: false, visible: true,
                              };
                              setElements((p) => [...p, el]);
                              setSelectedId(el.id);
                            }}>
                            🏏 {team.name} Logo
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="oss-section-title" style={{ marginTop: "16px" }}>Layers</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "180px", overflowY: "auto" }}>
                      {[...elements].reverse().map((el) => (
                        <div key={el.id}
                          onClick={() => setSelectedId(el.id)}
                          style={{
                            padding: "5px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem",
                            background: el.id === selectedId ? "rgba(99,102,241,0.15)" : "var(--bg-app)",
                            border: el.id === selectedId ? "1px solid #6366f1" : "1px solid transparent",
                            display: "flex", alignItems: "center", gap: "6px",
                          }}>
                          <span>{el.type === "text" ? "T" : el.type === "image" ? "🖼" : el.type === "rect" ? "▬" : "📊"}</span>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {el.name || el.text?.slice(0, 20) || el.type}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setElements((p) => p.filter((x) => x.id !== el.id)); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "0.72rem" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Element selected */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "800", textTransform: "capitalize" }}>
                        {selectedEl.type}
                      </span>
                      <button
                        onClick={() => { setElements((p) => p.filter((e) => e.id !== selectedId)); setSelectedId(null); }}
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "0.75rem" }}>
                        🗑 Remove
                      </button>
                    </div>

                    {/* Position */}
                    <p className="oss-section-title">📐 Position & Size</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                      {[
                        { label: "X %", key: "x" }, { label: "Y %", key: "y" },
                        { label: "W px", key: "width" }, { label: "H px", key: "height" },
                        { label: "Rotate", key: "rotation" },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "2px" }}>{label}</div>
                          <input type="number" className="oss-prop-input"
                            value={Math.round((selectedEl[key] || 0) * 10) / 10}
                            onChange={(e) => updateEl({ [key]: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Opacity / Adjust */}
                    <p className="oss-section-title">🎨 Adjust</p>
                    <div className="oss-prop-row">
                      <span className="oss-prop-label">Opacity</span>
                      <input type="range" min="0" max="1" step="0.05"
                        value={selectedEl.opacity ?? 1}
                        onChange={(e) => updateEl({ opacity: parseFloat(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", minWidth: "30px" }}>
                        {Math.round((selectedEl.opacity ?? 1) * 100)}%
                      </span>
                    </div>

                    {/* Lock / Visible */}
                    <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                      <button className={`oss-tool-btn ${selectedEl.locked ? "active" : ""}`}
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => updateEl({ locked: !selectedEl.locked })}>
                        {selectedEl.locked ? "🔒 Locked" : "🔓 Lock"}
                      </button>
                      <button className={`oss-tool-btn ${selectedEl.visible === false ? "" : "active"}`}
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => updateEl({ visible: selectedEl.visible === false ? true : false })}>
                        {selectedEl.visible === false ? "👁‍🗨 Show" : "👁 Visible"}
                      </button>
                    </div>

                    {/* Z-Index */}
                    <div className="oss-prop-row">
                      <span className="oss-prop-label">Layer</span>
                      <button className="oss-tool-btn" style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => updateEl({ zIndex: (selectedEl.zIndex || 1) + 1 })}>↑ Forward</button>
                      <button className="oss-tool-btn" style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => updateEl({ zIndex: Math.max(1, (selectedEl.zIndex || 1) - 1) })}>↓ Back</button>
                    </div>

                    {/* Text-specific */}
                    {selectedEl.type === "text" && (
                      <>
                        <p className="oss-section-title">✍️ Text Style</p>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Color</span>
                          <input type="color" value={selectedEl.style?.color || "#ffffff"}
                            onChange={(e) => updateElStyle({ color: e.target.value })}
                            style={{ width: "36px", height: "28px", border: "none", borderRadius: "4px", cursor: "pointer" }} />
                          <input type="color" value={selectedEl.style?.backgroundColor?.replace(/rgba?\([^)]+\)/, "#000000") || "#000000"}
                            onChange={(e) => updateElStyle({ backgroundColor: e.target.value })}
                            style={{ width: "36px", height: "28px", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            title="Background color" />
                        </div>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Size</span>
                          <input type="number" className="oss-prop-input"
                            value={parseInt(selectedEl.style?.fontSize) || 36}
                            onChange={(e) => updateElStyle({ fontSize: `${e.target.value}px` })} />
                          <select className="oss-prop-input" style={{ flex: 1.5 }}
                            value={selectedEl.style?.fontWeight || "700"}
                            onChange={(e) => updateElStyle({ fontWeight: e.target.value })}>
                            <option value="400">Regular</option>
                            <option value="600">Semi Bold</option>
                            <option value="700">Bold</option>
                            <option value="900">Black</option>
                          </select>
                        </div>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Align</span>
                          {["left", "center", "right"].map((a) => (
                            <button key={a} className={`oss-tool-btn ${selectedEl.style?.textAlign === a ? "active" : ""}`}
                              style={{ flex: 1, justifyContent: "center", padding: "4px" }}
                              onClick={() => updateElStyle({ textAlign: a })}>
                              {a === "left" ? "⬅" : a === "center" ? "↔" : "➡"}
                            </button>
                          ))}
                        </div>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Font</span>
                          <select className="oss-prop-input"
                            value={selectedEl.style?.fontFamily || "Outfit, sans-serif"}
                            onChange={(e) => updateElStyle({ fontFamily: e.target.value })}>
                            <option value="Outfit, sans-serif">Outfit</option>
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="monospace">Monospace</option>
                          </select>
                        </div>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Radius</span>
                          <input type="number" className="oss-prop-input"
                            value={parseInt(selectedEl.style?.borderRadius) || 0}
                            onChange={(e) => updateElStyle({ borderRadius: `${e.target.value}px` })} />
                        </div>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Padding</span>
                          <input type="number" className="oss-prop-input"
                            value={parseInt(selectedEl.style?.padding) || 0}
                            onChange={(e) => updateElStyle({ padding: `${e.target.value}px` })} />
                        </div>
                      </>
                    )}

                    {/* Image-specific */}
                    {selectedEl.type === "image" && (
                      <>
                        <p className="oss-section-title">🖼 Image</p>
                        <button className="oss-tool-btn" style={{ width: "100%", justifyContent: "center", marginBottom: "6px" }}
                          onClick={() => { setShowAssetPicker(true); }}>
                          📂 Choose from Assets
                        </button>
                        <div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "2px" }}>Or paste URL</div>
                          <input className="oss-prop-input" style={{ width: "100%", boxSizing: "border-box" }}
                            placeholder="https://..." value={selectedEl.imageUrl || ""}
                            onChange={(e) => updateEl({ imageUrl: e.target.value })} />
                        </div>
                        <div className="oss-prop-row" style={{ marginTop: "8px" }}>
                          <span className="oss-prop-label">Radius</span>
                          <input type="range" min="0" max="50" value={parseInt(selectedEl.style?.borderRadius) || 0}
                            onChange={(e) => updateEl({ style: { ...(selectedEl.style || {}), borderRadius: `${e.target.value}%` } })}
                            style={{ flex: 1 }} />
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", minWidth: "28px" }}>
                            {parseInt(selectedEl.style?.borderRadius) || 0}%
                          </span>
                        </div>

                        {/* Crop */}
                        <p className="oss-section-title">✂️ Crop</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                          {[
                            { label: "Crop X", key: "cropX" }, { label: "Crop Y", key: "cropY" },
                            { label: "Crop W", key: "cropW" }, { label: "Crop H", key: "cropH" },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "2px" }}>{label} %</div>
                              <input type="number" min="0" max="100" className="oss-prop-input"
                                value={selectedEl[key] ?? (key.includes("W") || key.includes("H") ? 100 : 0)}
                                onChange={(e) => updateEl({ [key]: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          ))}
                        </div>
                        <button className="oss-tool-btn" style={{ width: "100%", justifyContent: "center", marginTop: "6px" }}
                          onClick={() => updateEl({ cropX: 0, cropY: 0, cropW: 100, cropH: 100 })}>
                          ↺ Reset Crop
                        </button>
                      </>
                    )}

                    {/* Rect-specific */}
                    {selectedEl.type === "rect" && (
                      <>
                        <p className="oss-section-title">▬ Shape Style</p>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Fill</span>
                          <input type="color"
                            value={selectedEl.style?.backgroundColor?.replace(/rgba?\([^)]+\)/, "#6366f1") || "#6366f1"}
                            onChange={(e) => updateElStyle({ backgroundColor: e.target.value })}
                            style={{ width: "36px", height: "28px", border: "none", borderRadius: "4px", cursor: "pointer" }} />
                          <input type="color"
                            value={selectedEl.style?.borderColor || "#6366f1"}
                            onChange={(e) => updateElStyle({ borderColor: e.target.value })}
                            style={{ width: "36px", height: "28px", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            title="Border color" />
                        </div>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Radius</span>
                          <input type="range" min="0" max="50" value={parseInt(selectedEl.style?.borderRadius) || 0}
                            onChange={(e) => updateElStyle({ borderRadius: `${e.target.value}px` })}
                            style={{ flex: 1 }} />
                        </div>
                        <div className="oss-prop-row">
                          <span className="oss-prop-label">Border</span>
                          <input type="number" min="0" max="20" className="oss-prop-input"
                            value={parseInt(selectedEl.style?.borderWidth) || 0}
                            onChange={(e) => updateElStyle({ borderWidth: `${e.target.value}px`, borderStyle: "solid" })} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
