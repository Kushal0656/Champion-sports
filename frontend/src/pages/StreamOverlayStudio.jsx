import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { getMatches } from "../api/matchApi";
import { getTeams } from "../api/teamApi";
import { getPlayers } from "../api/playerApi";
import {
  getAssets,
  uploadAsset,
  deleteAsset,
  getScenes,
  updateDraftLayout,
  publishScene,
  activateScene,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  uploadSceneVideo,
  deleteSceneVideo,
  updateSceneName,
  createScene,
  deleteScene,
  importSlidesForMatch
} from "../api/streamStudioApi";
import { getSlidesByMatch } from "../api/overlaySlideApi";
import axiosClient from "../api/axiosClient";
import { getApiBaseUrl, getWsBaseUrl } from "../utils/config";

export default function StreamOverlayStudio() {
  // Matches, Teams, Players for setup & configurations
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Asset Upload States
  const [assets, setAssets] = useState([]);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("SPONSOR_IMAGE");
  const [assetFile, setAssetFile] = useState(null);
  const [isAssetDragging, setIsAssetDragging] = useState(false);

  // Scene & Editor Layout States
  const [scenes, setScenes] = useState([]);
  const [activeScene, setActiveScene] = useState(null);
  const [elements, setElements] = useState([]); // Draft layout elements
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [renameText, setRenameText] = useState("");
  const [newSceneName, setNewSceneName] = useState("");
  const [newSceneVideoFile, setNewSceneVideoFile] = useState(null);
  const [newTemplateImportName, setNewTemplateImportName] = useState("");
  const [newTemplateLayoutFile, setNewTemplateLayoutFile] = useState(null);

  const handleCreateScene = async (e) => {
    e.preventDefault();
    if (!newSceneName.trim()) {
      alert("Please enter a scene name.");
      return;
    }
    if (!newSceneVideoFile) {
      alert("Please select a video file for the scene background.");
      return;
    }

    const name = newSceneName.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    try {
      alert(`Creating scene "${name}" and uploading video background... Please wait.`);
      const newScene = await createScene(id, name);
      const updatedScene = await uploadSceneVideo(newScene.id, newSceneVideoFile);
      setScenes(prev => [...prev, updatedScene]);
      await handleSceneSelect(updatedScene);
      setNewSceneName("");
      setNewSceneVideoFile(null);
      const videoInput = document.getElementById("new-scene-video-input");
      if (videoInput) videoInput.value = "";
      alert(`Scene "${name}" created and video background uploaded successfully!`);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        alert("A scene with this name/ID already exists. Please choose a different name.");
      } else {
        alert("Failed to create scene with video.");
      }
    }
  };

  const handleDeleteScene = async () => {
    if (!activeScene) return;
    if (!window.confirm(`Are you sure you want to permanently delete the scene "${activeScene.name}"? This cannot be undone.`)) return;
    
    try {
      await deleteScene(activeScene.id);
      const remainingScenes = scenes.filter(s => s.id !== activeScene.id);
      setScenes(remainingScenes);
      if (remainingScenes.length > 0) {
        const nextScene = remainingScenes[0];
        setActiveScene(nextScene);
        setRenameText(nextScene.name);
        try {
          setElements(JSON.parse(nextScene.draftLayout || "[]"));
        } catch (e) {
          setElements([]);
        }
      } else {
        setActiveScene(null);
        setRenameText("");
        setElements([]);
      }
      alert("Scene deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete scene.");
    }
  };

  const handleExportLayout = () => {
    if (!activeScene) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(elements, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeScene.name.toLowerCase().replace(/\s+/g, "_")}_layout.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportSceneLayout = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          setElements(parsed);
          alert("Scene layout imported successfully to active draft!");
        } else {
          alert("Invalid file format. The file must contain a JSON array of layout elements.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse the layout file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCreateTemplateFromFile = async (e) => {
    e.preventDefault();
    if (!newTemplateImportName.trim()) {
      alert("Please enter a template name.");
      return;
    }
    if (!newTemplateLayoutFile) {
      alert("Please select a template layout JSON file.");
      return;
    }

    const name = newTemplateImportName.trim();
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          const saved = await saveTemplate(name, JSON.stringify(parsed));
          setTemplates(prev => [...prev, saved]);
          setNewTemplateImportName("");
          setNewTemplateLayoutFile(null);
          const layoutInput = document.getElementById("new-template-layout-input");
          if (layoutInput) layoutInput.value = "";
          alert(`Template "${name}" created and layout saved successfully!`);
        } else {
          alert("Invalid file format. The file must contain a JSON array of layout elements.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse the layout file.");
      }
    };
    reader.readAsText(newTemplateLayoutFile);
  };

  const handleRenameScene = async () => {
    if (!activeScene || !renameText.trim()) return;
    try {
      const updated = await updateSceneName(activeScene.id, renameText.trim());
      setActiveScene(updated);
      setScenes(prev => prev.map(s => s.id === activeScene.id ? updated : s));
      alert("Scene renamed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to rename scene.");
    }
  };

  const handleSceneVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeScene) return;
    try {
      alert("Uploading scene background video... Please wait.");
      const updated = await uploadSceneVideo(activeScene.id, file);
      setActiveScene(updated);
      setScenes(prev => prev.map(s => s.id === activeScene.id ? updated : s));
      alert("Background video uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload background video.");
    }
  };

  const handleRemoveSceneVideo = async () => {
    if (!activeScene) return;
    if (!window.confirm("Are you sure you want to remove the background video?")) return;
    try {
      const updated = await deleteSceneVideo(activeScene.id);
      setActiveScene(updated);
      setScenes(prev => prev.map(s => s.id === activeScene.id ? updated : s));
      alert("Background video removed successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to remove background video.");
    }
  };

  // Template States
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [importMatchId, setImportMatchId] = useState("");
  const [templateMatchId, setTemplateMatchId] = useState("");
  const [templateSlides, setTemplateSlides] = useState([]);

  useEffect(() => {
    if (!templateMatchId) {
      setTemplateSlides([]);
      return;
    }
    const fetchTemplateSlides = async () => {
      try {
        const data = await getSlidesByMatch(Number(templateMatchId));
        setTemplateSlides(data);
      } catch (err) {
        console.error("Failed to load match slides for templates", err);
      }
    };
    fetchTemplateSlides();
  }, [templateMatchId]);

  const handleApplySlideAsTemplate = (slide) => {
    const bgImgEl = {
      id: `slide_bg_${slide.id}`,
      type: "image",
      name: "Background",
      imageUrl: `${getApiBaseUrl()}/api/overlay-slides/${slide.id}/image`,
      x: 50,
      y: 50,
      width: slide.width || 800,
      height: slide.height || 450,
      rotation: 0,
      zIndex: 1,
      locked: false,
      visible: true
    };
    
    let slideElements = [];
    if (slide.overlayLayout) {
      try {
        slideElements = JSON.parse(slide.overlayLayout);
        if (!Array.isArray(slideElements)) slideElements = [];
      } catch (e) {
        console.error("Failed to parse slide overlay layout", e);
      }
    }
    
    const updatedElements = slideElements.map(el => {
      const mapped = { ...el, locked: false };
      if (el.type === "image") {
        mapped.assetId = null;
        mapped.imageUrl = el.src || el.imageUrl;
      }
      return mapped;
    });
    
    const combined = [bgImgEl, ...updatedElements];
    setElements(combined);
    alert(`Slide "${slide.title}" applied to draft canvas workspace!`);
  };

  const handleAddSceneElementsToCanvas = (scene) => {
    try {
      const sceneElements = JSON.parse(scene.draftLayout || "[]");
      if (!Array.isArray(sceneElements) || sceneElements.length === 0) {
        alert("This scene has no elements to add.");
        return;
      }
      const updatedElements = sceneElements.map(el => ({
        ...el,
        locked: false,
        id: `el_imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      }));
      setElements(prev => [...prev, ...updatedElements]);
      alert(`Imported ${updatedElements.length} elements to current canvas!`);
    } catch (e) {
      console.error(e);
      alert("Failed to parse scene elements.");
    }
  };

  const handleAddSlideElementsToCanvas = (slide) => {
    const bgImgEl = {
      id: `slide_bg_${slide.id}_${Date.now()}`,
      type: "image",
      name: `Background (${slide.title})`,
      imageUrl: `${getApiBaseUrl()}/api/overlay-slides/${slide.id}/image`,
      x: 50,
      y: 50,
      width: slide.width || 800,
      height: slide.height || 450,
      rotation: 0,
      zIndex: 1,
      locked: false,
      visible: true
    };
    
    let slideElements = [];
    if (slide.overlayLayout) {
      try {
        slideElements = JSON.parse(slide.overlayLayout);
        if (!Array.isArray(slideElements)) slideElements = [];
      } catch (e) {
        console.error("Failed to parse slide overlay layout", e);
      }
    }
    
    const updatedElements = slideElements.map(el => {
      const mapped = { ...el, locked: false };
      if (el.type === "image") {
        mapped.assetId = null;
        mapped.imageUrl = el.src || el.imageUrl;
      }
      return mapped;
    });
    
    setElements(prev => [...prev, bgImgEl, ...updatedElements]);
    alert(`Slide "${slide.title}" elements added to current canvas!`);
  };

  const handleAddTemplateElementsToCanvas = (layoutJson) => {
    try {
      const templateElements = JSON.parse(layoutJson || "[]");
      if (!Array.isArray(templateElements) || templateElements.length === 0) {
        alert("This template has no elements to add.");
        return;
      }
      const updatedElements = templateElements.map(el => ({
        ...el,
        locked: false,
        id: `el_imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      }));
      setElements(prev => [...prev, ...updatedElements]);
      alert(`Added ${updatedElements.length} elements to the canvas!`);
    } catch (e) {
      console.error(e);
      alert("Failed to parse template elements.");
    }
  };

  // Setup Wizard Modal State
  const [showMatchPickerModal, setShowMatchPickerModal] = useState(() => {
    return !localStorage.getItem("selected_studio_match_id");
  });
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardTournament, setWizardTournament] = useState("Vibrant T20 Trophy");
  const [wizardMatchName, setWizardMatchName] = useState("Qualifier 1");
  const [wizardTeamA, setWizardTeamA] = useState("");
  const [wizardTeamB, setWizardTeamB] = useState("");
  const [wizardVenue, setWizardVenue] = useState("Wankhede Stadium, Mumbai");
  const [wizardDate, setWizardDate] = useState("2026-06-15");
  const [wizardTossWinner, setWizardTossWinner] = useState("");
  const [wizardXI_A, setWizardXI_A] = useState("");
  const [wizardXI_B, setWizardXI_B] = useState("");
  const [wizardTourneyLogo, setWizardTourneyLogo] = useState(null);
  const [wizardLogoA, setWizardLogoA] = useState(null);
  const [wizardLogoB, setWizardLogoB] = useState(null);

  const [score, setScore] = useState(null);

  // Editor interaction refs & variables
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const dragInfoRef = useRef({ type: null, elId: null, startX: 0, startY: 0, startElX: 0, startElY: 0, startElW: 0, startElH: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth || 800;
      const containerHeight = container.clientHeight || 450;
      const scaleX = containerWidth / 1920;
      const scaleY = containerHeight / 1080;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale > 0 ? newScale : 1);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    const timer = setTimeout(updateScale, 100);

    return () => {
      window.removeEventListener("resize", updateScale);
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [isFullscreenPreview]);

  const normalizeScore = (rawScore) => {
    if (!rawScore) return null;
    const match = rawScore.match;
    const liveInfo = rawScore.liveInfo;
    if (match || liveInfo) {
      const activeInningsNum = match?.currentInnings || 1;
      const activeInnings = activeInningsNum === 2 ? rawScore.innings2 : rawScore.innings1;
      let runs = activeInnings?.runs ?? 0;
      let overs = activeInnings?.overs ?? 0;
      let balls = activeInnings?.balls ?? 0;
      let totalBalls = overs * 6 + balls;
      let runRate = totalBalls > 0 ? ((runs / totalBalls) * 6).toFixed(2) : "0.00";
      return {
        inningsId: activeInnings?.id,
        battingTeam: activeInnings?.battingTeam?.name ?? match?.teamA?.name ?? "TEAM A",
        bowlingTeam: activeInnings?.bowlingTeam?.name ?? match?.teamB?.name ?? "TEAM B",
        runs: runs,
        wickets: activeInnings?.wickets ?? 0,
        overs: `${overs}.${balls}`,
        runRate: runRate,
        requiredRunRate: "0.00",
        striker: liveInfo?.strikerName ?? "Striker",
        strikerId: liveInfo?.strikerId,
        strikerRuns: liveInfo?.strikerStats?.runsScored ?? 0,
        strikerBalls: liveInfo?.strikerStats?.ballsFaced ?? 0,
        nonStriker: liveInfo?.nonStrikerName ?? "Non-Striker",
        nonStrikerId: liveInfo?.nonStrikerId,
        nonStrikerRuns: liveInfo?.nonStrikerStats?.runsScored ?? 0,
        nonStrikerBalls: liveInfo?.nonStrikerStats?.ballsFaced ?? 0,
        bowler: liveInfo?.bowlerName ?? "Bowler",
        bowlerId: liveInfo?.bowlerId,
        bowlerRuns: liveInfo?.bowlerStats?.runsConceded ?? 0,
        bowlerWickets: liveInfo?.bowlerStats?.wicketsTaken ?? 0,
        bowlerOvers: liveInfo?.bowlerStats?.oversBowled ?? "0.0",
        tournamentName: match?.tournament?.name ?? "Tournament",
        venue: match?.venue ?? "Venue",
        matchName: match ? `${match.teamA?.name} vs ${match.teamB?.name}` : "Match",
        tossWinner: match?.tossWinner?.name ?? "",
        matchResult: match?.status === "COMPLETED" ? (match.winner ? `${match.winner.name} won` : "Match Tied") : "Live Match",
        partnershipRuns: 0,
        partnershipBalls: 0,
        liveInfo: liveInfo
      };
    }
    return {
      ...rawScore,
      runRate: rawScore.runRate ?? rawScore.currentRunRate ?? "0.00",
      strikerId: rawScore.strikerId,
      nonStrikerId: rawScore.nonStrikerId,
      bowlerId: rawScore.bowlerId
    };
  };

  const fetchScoreState = async (mId) => {
    if (!mId) return;
    try {
      const response = await axiosClient.get(`/scoring/${mId}/state`);
      setScore(normalizeScore(response.data));
    } catch (e) {
      console.error("Failed to fetch score state", e);
    }
  };

  useEffect(() => {
    if (!selectedMatch?.id) {
      setScore(null);
      return;
    }
    fetchScoreState(selectedMatch.id);
    const ws = new WebSocket(`${getWsBaseUrl()}/ws-score`);
    ws.onopen = () => {
      console.log("Overlay Studio WS connected");
    };
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "SCORE_UPDATE" && Number(payload.matchId) === Number(selectedMatch.id)) {
          const normalized = normalizeScore(payload.data);
          setScore(normalized);
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };
    ws.onerror = (err) => {
      console.error("WS error", err);
    };
    ws.onclose = () => {
      console.log("WS closed");
    };
    return () => {
      ws.close();
    };
  }, [selectedMatch?.id]);

  // When selectedMatch changes, auto-sync templateMatchId and importMatchId
  useEffect(() => {
    if (selectedMatch?.id) {
      setTemplateMatchId(String(selectedMatch.id));
      setImportMatchId(String(selectedMatch.id));
    }
  }, [selectedMatch?.id]);

  // Handle match selection from the entry modal
  const handleSelectMatchForStudio = (match) => {
    setSelectedMatch(match);
    localStorage.setItem("selected_studio_match_id", String(match.id));
    setWizardTournament(match.tournament?.name || "T20 Championship");
    setWizardMatchName(`${match.teamA?.name || "Team A"} vs ${match.teamB?.name || "Team B"}`);
    setWizardTeamA(match.teamA?.name || "");
    setWizardTeamB(match.teamB?.name || "");
    setWizardVenue(match.venue || "");
    setWizardDate(match.matchDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
    setWizardTossWinner(match.tossWinner || "");
    setShowMatchPickerModal(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const ms = await getMatches();
      setMatches(ms);
      
      const savedMatchId = localStorage.getItem("selected_studio_match_id");
      if (savedMatchId) {
        const found = ms.find(m => String(m.id) === String(savedMatchId));
        if (found) {
          setSelectedMatch(found);
          setWizardTournament(found.tournament?.name || "T20 Championship");
          setWizardMatchName(`${found.teamA?.name || "Team A"} vs ${found.teamB?.name || "Team B"}`);
          setWizardTeamA(found.teamA?.name || "");
          setWizardTeamB(found.teamB?.name || "");
          setWizardVenue(found.venue || "");
          setWizardDate(found.matchDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
          setWizardTossWinner(found.tossWinner || "");
          setShowMatchPickerModal(false);
        } else {
          setShowMatchPickerModal(true);
        }
      }

      const ts = await getTeams();
      setTeams(ts);
      
      const scns = await getScenes();
      setScenes(scns);
      
      const active = scns.find(s => s.active) || scns[0];
      if (active) {
        setActiveScene(active);
        setRenameText(active.name || "");
        const parsed = JSON.parse(active.draftLayout || "[]");
        setElements(parsed);
      }

      loadAssets();
      loadTemplates();
    } catch (err) {
      console.error("Failed to load overlay studio data", err);
    }
  };

  const loadAssets = async () => {
    try {
      const data = await getAssets();
      setAssets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Switch scene editor view and automatically go live / play on OBS
  const handleSceneSelect = async (scene) => {
    // Save current scene layout before switching
    if (activeScene) {
      await updateDraftLayout(activeScene.id, JSON.stringify(elements));
    }
    
    setActiveScene(scene);
    setRenameText(scene.name || "");
    setSelectedElementId(null);
    try {
      const parsed = JSON.parse(scene.draftLayout || "[]");
      setElements(parsed);
    } catch (e) {
      setElements([]);
    }

    // Auto-activate to play on OBS
    try {
      await activateScene(scene.id, selectedMatch?.id || 0);
      setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, active: true } : { ...s, active: false }));
    } catch (err) {
      console.error("Failed to auto-activate scene on OBS:", err);
    }
  };

  // Switch which scene is LIVE on stream
  const handleActivateScene = async (sceneId) => {
    try {
      await activateScene(sceneId, selectedMatch?.id || 0);
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, active: true } : { ...s, active: false }));
      alert(`Scene "${sceneId}" is now LIVE on stream!`);
    } catch (err) {
      console.error(err);
    }
  };

  // Save changes to draft
  const handleSaveDraft = async () => {
    if (!activeScene) return;
    try {
      const layoutJson = JSON.stringify(elements);
      const updated = await updateDraftLayout(activeScene.id, layoutJson);
      setScenes(prev => prev.map(s => s.id === activeScene.id ? updated : s));
      alert("Draft layout saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save draft.");
    }
  };

  // Publish draft layout to live
  const handlePublishLive = async () => {
    if (!activeScene) return;
    try {
      // 1. Save draft first
      const layoutJson = JSON.stringify(elements);
      await updateDraftLayout(activeScene.id, layoutJson);
      
      // 2. Publish
      const updated = await publishScene(activeScene.id, selectedMatch?.id || 0);
      setScenes(prev => prev.map(s => s.id === activeScene.id ? updated : s));
      alert(`Published changes successfully! Live overlay for "${activeScene.name}" is updated.`);
    } catch (err) {
      console.error(err);
      alert("Failed to publish live.");
    }
  };

  // Add a new element to the editor
  const handleAddElement = (type) => {
    const defaultStyles = {
      color: "#ffffff",
      fontSize: "18px",
      fontWeight: "bold",
      fontFamily: "Outfit, sans-serif",
      backgroundColor: "rgba(15,23,42,0.9)",
      borderRadius: "8px",
      padding: "10px",
      border: "2px solid #6366f1",
      textAlign: "center"
    };

    let newEl = {
      id: `el_${Date.now()}`,
      type,
      text: "",
      x: 50,
      y: 50,
      width: 250,
      height: 60,
      rotation: 0,
      zIndex: elements.length + 10,
      locked: false,
      visible: true,
      animation: "", // None
      style: defaultStyles
    };

    if (type === "text") {
      newEl.text = "Double click to edit text";
    } else if (type === "scoreboard") {
      newEl.width = 1000;
      newEl.height = 70;
      newEl.y = 85;
    } else if (type === "mini_scoreboard") {
      newEl.width = 300;
      newEl.height = 120;
      newEl.x = 20;
      newEl.y = 75;
    } else if (type === "toss_card" || type === "result_card" || type === "innings_break_card" || type === "pom_card") {
      newEl.width = 500;
      newEl.height = 300;
    } else if (type === "sponsor_banner") {
      newEl.width = 728;
      newEl.height = 90;
      newEl.y = 90;
    } else if (type === "watermark") {
      newEl.width = 150;
      newEl.height = 40;
      newEl.x = 88;
      newEl.y = 8;
      newEl.text = "LIVE HD";
    } else if (type === "batsman_card") {
      newEl.width = 300;
      newEl.height = 180;
    } else if (type === "bowler_card") {
      newEl.width = 300;
      newEl.height = 120;
    } else if (type === "match_info_card") {
      newEl.width = 300;
      newEl.height = 140;
    } else if (type === "video") {
      newEl.width = 400;
      newEl.height = 225;
    }

    setElements([...elements, newEl]);
    setSelectedElementId(newEl.id);
  };

  // Pointer Down handler on the element or handles
  const handleElementPointerDown = (e, el, actionType) => {
    if (el.locked && actionType === "drag") return;
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    dragInfoRef.current = {
      type: actionType,
      elId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      startElX: el.x,
      startElY: el.y,
      startElW: el.width || 200,
      startElH: el.height || 60
    };

    setSelectedElementId(el.id);
    setDragging(true);
    
    // Add global listeners for pointermove and pointerup
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
  };

  const handleGlobalPointerMove = (e) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const info = dragInfoRef.current;
    const deltaX = e.clientX - info.startX;
    const deltaY = e.clientY - info.startY;

    if (info.type === "drag") {
      // Calculate percent movement
      const percentDeltaX = (deltaX / rect.width) * 100;
      const percentDeltaY = (deltaY / rect.height) * 100;

      let newX = info.startElX + percentDeltaX;
      let newY = info.startElY + percentDeltaY;

      if (snapToGrid) {
        newX = Math.round(newX / 2) * 2;
        newY = Math.round(newY / 2) * 2;
      }

      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      setElements(prev => prev.map(el => {
        if (el.id === info.elId) {
          return { ...el, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 };
        }
        return el;
      }));
    } else if (info.type === "resize") {
      let newW = info.startElW + (deltaX / scale);
      let newH = info.startElH + (deltaY / scale);

      if (snapToGrid) {
        newW = Math.round(newW / 10) * 10;
        newH = Math.round(newH / 10) * 10;
      }

      newW = Math.max(40, newW);
      newH = Math.max(20, newH);

      setElements(prev => prev.map(el => {
        if (el.id === info.elId) {
          return { ...el, width: newW, height: newH };
        }
        return el;
      }));
    }
  };

  const handleGlobalPointerUp = () => {
    setDragging(false);
    window.removeEventListener("pointermove", handleGlobalPointerMove);
    window.removeEventListener("pointerup", handleGlobalPointerUp);
  };

  // Keyboard navigation & delete support
  const handleKeyDown = (e) => {
    if (!selectedElementId) return;
    const target = elements.find(el => el.id === selectedElementId);
    if (!target || target.locked) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      // Don't delete if user is editing inputs
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return;
      }
      setElements(prev => prev.filter(el => el.id !== selectedElementId));
      setSelectedElementId(null);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, elements]);

  // Handle asset file upload
  const handleAssetUpload = async (e) => {
    e.preventDefault();
    if (!assetFile || !assetName.trim()) {
      alert("Provide an asset name and select a file.");
      return;
    }

    try {
      const added = await uploadAsset(assetName.trim(), assetType, assetFile);
      setAssets([...assets, added]);
      setAssetName("");
      setAssetFile(null);
      // Reset file input
      const fileInput = document.getElementById("asset-picker");
      if (fileInput) fileInput.value = "";
      alert("Asset uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload asset.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsAssetDragging(true);
  };

  const handleDragLeave = () => {
    setIsAssetDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsAssetDragging(false);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Bulk upload loop
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = file.name.split(".")[0];
        // Guess asset type from name or default to SPONSOR_IMAGE
        let type = "SPONSOR_IMAGE";
        if (name.toLowerCase().includes("logo")) type = "TEAM_LOGO";
        if (name.toLowerCase().includes("banner")) type = "TEAM_BANNER";
        if (name.toLowerCase().includes("player")) type = "PLAYER_PHOTO";

        await uploadAsset(name, type, file);
      }
      loadAssets();
      alert("Bulk upload completed successfully!");
    } catch (err) {
      console.error(err);
      alert("Errors occurred during bulk upload.");
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm("Delete this asset?")) return;
    try {
      await deleteAsset(id);
      setAssets(assets.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Set selected element's image source to clicked asset
  const handleAssetSelect = (asset) => {
    if (!selectedElementId) return;
    setElements(prev => prev.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, type: "image", assetId: asset.id, imageUrl: null };
      }
      return el;
    }));
  };

  // Setup Wizard Logic
  const handlePreFillMatch = (matchId) => {
    const match = matches.find(m => m.id === Number(matchId));
    if (!match) return;
    setSelectedMatch(match);
    setWizardTournament(match.tournament?.name || "T20 Championship");
    setWizardMatchName(`${match.teamA?.name || "Team A"} vs ${match.teamB?.name || "Team B"}`);
    setWizardTeamA(match.teamA?.name || "");
    setWizardTeamB(match.teamB?.name || "");
    setWizardVenue(match.venue || "");
    setWizardDate(match.matchDate?.split("T")[0] || "2026-06-15");
    setWizardTossWinner(match.tossWinner || "");
  };

  const handleWizardSubmit = async () => {
    try {
      let uploadedLogoTourney = null;
      let uploadedLogoA = null;
      let uploadedLogoB = null;

      if (wizardTourneyLogo) {
        uploadedLogoTourney = await uploadAsset(wizardTournament + " Logo", "TOURNAMENT_LOGO", wizardTourneyLogo);
      }
      if (wizardLogoA) {
        uploadedLogoA = await uploadAsset(wizardTeamA + " Logo", "TEAM_LOGO", wizardLogoA);
      }
      if (wizardLogoB) {
        uploadedLogoB = await uploadAsset(wizardTeamB + " Logo", "TEAM_LOGO", wizardLogoB);
      }

      // Automatically reload assets
      loadAssets();

      // Seed canvas layout with team logo elements
      const newItems = [];
      if (uploadedLogoA) {
        newItems.push({
          id: `el_logo_a_${Date.now()}_a`,
          type: "image",
          x: 10,
          y: 85,
          width: 60,
          height: 60,
          rotation: 0,
          zIndex: 15,
          locked: false,
          visible: true,
          assetId: uploadedLogoA.id,
          animation: "fade"
        });
      }
      if (uploadedLogoB) {
        newItems.push({
          id: `el_logo_b_${Date.now()}_b`,
          type: "image",
          x: 90,
          y: 85,
          width: 60,
          height: 60,
          rotation: 0,
          zIndex: 15,
          locked: false,
          visible: true,
          assetId: uploadedLogoB.id,
          animation: "fade"
        });
      }
      if (newItems.length > 0) {
        setElements(prev => [...prev, ...newItems]);
      }

      alert("Match setup successfully completed! Logos have been uploaded and added to the visual workspace.");
      setShowSetupModal(false);
      setWizardStep(1);
      setWizardTourneyLogo(null);
      setWizardLogoA(null);
      setWizardLogoB(null);
    } catch (err) {
      console.error("Wizard setup file upload error", err);
      alert("Setup completed, but some file uploads failed.");
      setShowSetupModal(false);
      setWizardStep(1);
    }
  };

  // Templates
  const handleApplyTemplate = (layoutStr) => {
    try {
      const parsed = JSON.parse(layoutStr);
      if (Array.isArray(parsed)) {
        setElements(parsed);
        alert("Template applied to workspace draft canvas!");
      }
    } catch (e) {
      alert("Failed to parse template layout.");
    }
  };

  const handleSaveCustomTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert("Enter a template name.");
      return;
    }
    try {
      const layoutJson = JSON.stringify(elements);
      const saved = await saveTemplate(newTemplateName.trim(), layoutJson);
      setTemplates([...templates, saved]);
      setNewTemplateName("");
      alert("Custom template saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save template.");
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportSlides = async () => {
    if (!importMatchId) {
      alert("Please select a match to import slides from.");
      return;
    }
    try {
      const response = await importSlidesForMatch(Number(importMatchId));
      alert(`Successfully imported ${response.length} match slides as scenes!`);
      const scns = await getScenes();
      setScenes(scns);
      setImportMatchId("");
    } catch (err) {
      console.error("Failed to import slides", err);
      alert("Failed to import slides: " + (err.response?.data?.message || err.message));
    }
  };



  // Selected element helper variables
  const selectedEl = elements.find(el => el.id === selectedElementId);

  return (
    <div className="app-container">
      <style>{`
        /* Scoreboard Styling */
        .broadcast-scoreboard {
          display: flex;
          align-items: center;
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid #eab308;
          border-radius: 12px;
          height: 60px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          font-family: 'Outfit', sans-serif;
          text-transform: uppercase;
        }
        .logo-box {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.9);
          border-radius: 8px;
          margin: 0 8px;
        }
        .logo-box img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 4px;
        }
        .logo-box span {
          font-size: 1.25rem;
          font-weight: 900;
          color: #facc15;
        }
        .ticker-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 12px;
          overflow: hidden;
        }
        .ticker-top {
          display: flex;
          align-items: center;
          height: 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ticker-team {
          color: #fbbf24;
          font-weight: 800;
          font-size: 1.1rem;
          margin-right: 12px;
        }
        .ticker-score {
          color: #ffffff;
          font-weight: 900;
          font-size: 1.3rem;
          margin-right: 12px;
        }
        .ticker-overs {
          color: #e2e8f0;
          font-weight: 600;
          font-size: 0.85rem;
          background: rgba(255, 255, 255, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 12px;
        }
        .ticker-vs {
          color: #ea580c;
          font-weight: 800;
          font-size: 0.9rem;
          margin-right: auto;
        }
        .ticker-tourney {
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .ticker-bottom {
          display: flex;
          align-items: center;
          height: 26px;
          font-size: 0.8rem;
          color: #cbd5e1;
          gap: 16px;
        }
        .ticker-batsman {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ticker-batsman .name {
          color: #a5b4fc;
          font-weight: 700;
        }
        .ticker-batsman .runs {
          color: #ffffff;
          font-weight: 800;
        }
        .ticker-batsman .balls {
          color: #94a3b8;
          font-size: 0.75rem;
        }
        .ticker-bowler {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ticker-bowler .name {
          color: #94a3b8;
          font-weight: 600;
        }
        .ticker-bowler .wickets-runs {
          color: #f43f5e;
          font-weight: 800;
        }
        .ticker-bowler .overs {
          font-size: 0.75rem;
        }
      `}</style>
      <Sidebar />

      {/* ═══════════════════════════════════════════════════════════
          MATCH PICKER MODAL — shown on studio entry
      ═══════════════════════════════════════════════════════════ */}
      {showMatchPickerModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(5, 7, 20, 0.92)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-light)",
            borderRadius: "20px",
            padding: "2.5rem",
            width: "min(90vw, 680px)",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            {/* Header */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎨</div>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800" }}>Stream Overlay Studio</h2>
              <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 0 0", fontSize: "0.95rem" }}>
                Select a match to load its live scorecard and templates
              </p>
            </div>

            {/* Match grid */}
            {matches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
                <div>Loading matches...</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
                {matches.map(m => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMatchForStudio(m)}
                    style={{
                      background: "var(--bg-app)",
                      border: "2px solid var(--border-light)",
                      borderRadius: "12px",
                      padding: "1rem 1.25rem",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "rgba(99,102,241,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.background = "var(--bg-app)"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--primary)", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: "20px", textTransform: "uppercase" }}>
                        {m.status || "Upcoming"}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>#{m.id}</span>
                    </div>
                    <div style={{ fontWeight: "800", fontSize: "1rem", color: "var(--text-primary)" }}>
                      {m.teamA?.name || "TBA"} <span style={{ color: "var(--primary)" }}>vs</span> {m.teamB?.name || "TBA"}
                    </div>
                    {m.tournament?.name && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>🏆 {m.tournament.name}</div>
                    )}
                    {m.venue && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>📍 {m.venue}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Skip option */}
            <div style={{ textAlign: "center" }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                onClick={() => setShowMatchPickerModal(false)}
              >
                Skip — Enter Studio without selecting a match
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="main-content" 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "1.5rem",
          maxWidth: isFullscreenPreview ? "none" : undefined,
          width: isFullscreenPreview ? "100%" : undefined,
          padding: isFullscreenPreview ? "1rem" : undefined
        }}
      >
        
        {/* Top Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>🎨 Stream Overlay Studio</h1>
            {/* Active match indicator */}
            {selectedMatch ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "0.85rem", background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)", padding: "2px 10px", borderRadius: "20px", fontWeight: "700" }}>
                  🔴 LIVE MATCH
                </span>
                <span style={{ fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" }}>
                  {selectedMatch.teamA?.name} vs {selectedMatch.teamB?.name}
                </span>
                {selectedMatch.tournament?.name && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>· {selectedMatch.tournament.name}</span>
                )}
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "3px 10px", minHeight: "auto" }}
                  onClick={() => setShowMatchPickerModal(true)}
                >
                  🔄 Change Match
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: "600", animation: "pulse 1.5s infinite" }}>
                  ⚠️ No match selected
                </span>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: "0.75rem", padding: "3px 10px", minHeight: "auto" }}
                  onClick={() => setShowMatchPickerModal(true)}
                >
                  🏏 Select Match
                </button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary" onClick={handlePublishLive} style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff" }}>
                🚀 Publish Live Overlay
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>🔗 OBS Browser Link:</span>
              <code style={{ color: "var(--primary)", fontWeight: "700" }}>
                {window.location.origin}/overlay/{activeScene?.id || "live-match"}?matchId={selectedMatch?.id || 0}
              </code>
              <button
                className="btn btn-secondary"
                style={{ padding: "2px 6px", fontSize: "0.7rem", minHeight: "auto", marginLeft: "4px" }}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/overlay/${activeScene?.id || "live-match"}?matchId=${selectedMatch?.id || 0}`);
                  alert("OBS Browser Source URL copied to clipboard!");
                }}
              >
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>


        {/* Central Workspace */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isFullscreenPreview ? "1fr" : "250px 1fr 320px",
          gap: "1.5rem",
          height: isFullscreenPreview ? "calc(100vh - 100px)" : "calc(100vh - 180px)",
          minHeight: isFullscreenPreview ? "500px" : "650px",
          transition: "grid-template-columns 0.3s ease"
        }}>
          
          {/* LEFT PANEL: Scenes & Prebuilt Templates */}
          {!isFullscreenPreview && (
            <div className="premium-card" style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* OBS Scenes List */}
            <div>
              <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                🎬 OBS Scenes
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {scenes.map(s => {
                  const isSelected = activeScene?.id === s.id;
                  const isLive = s.active;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSceneSelect(s)}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-md)",
                        background: isSelected ? "var(--primary-light)" : "transparent",
                        border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "var(--transition)"
                      }}
                    >
                      <span style={{ fontWeight: isSelected ? "700" : "500", color: isSelected ? "var(--primary)" : "var(--text-primary)" }}>
                        {s.name}
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSceneElementsToCanvas(s);
                          }}
                          style={{ padding: "2px 6px", fontSize: "0.7rem", minHeight: "auto", border: "1px solid var(--border-light)", backgroundColor: "var(--bg-card)" }}
                          title="Import all elements of this scene to the current canvas"
                        >
                          ➕ Add
                        </button>
                        {isLive ? (
                          <span className="badge badge-danger" style={{ fontSize: "0.6rem", padding: "2px 6px" }}>LIVE</span>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateScene(s.id);
                            }}
                            style={{ padding: "2px 6px", fontSize: "0.7rem", minHeight: "auto" }}
                          >
                            Go Live
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Create Scene Form */}
              <form onSubmit={handleCreateScene} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>➕ Create New Scene</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: "600", color: "var(--text-secondary)" }}>Scene Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Toss Scene"
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                    className="form-input"
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.5rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: "600", color: "var(--text-secondary)" }}>Video Background</label>
                  <input
                    type="file"
                    id="new-scene-video-input"
                    accept="video/*"
                    onChange={(e) => setNewSceneVideoFile(e.target.files[0])}
                    style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem", fontSize: "0.8rem", minHeight: "auto", marginTop: "0.25rem", background: "linear-gradient(135deg, #10b981, #059669)", border: "none" }}
                >
                  Create Scene
                </button>
              </form>

              {/* Import Scene Layout File */}
              <div style={{ marginTop: "0.5rem" }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSceneLayout}
                  style={{ display: "none" }}
                  id="scene-layout-file-picker"
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => document.getElementById("scene-layout-file-picker").click()}
                  style={{ fontSize: "0.75rem", padding: "0.4rem 0.5rem", width: "100%", whiteSpace: "nowrap" }}
                >
                  📂 Import Scene Layout (.json)
                </button>
              </div>
            </div>

            {/* Layout Templates */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem", margin: 0 }}>
                📋 Templates
              </h3>

              {/* Match Slides — auto-synced from globally selected match */}
              <div style={{ padding: "0.6rem 0.75rem", background: "rgba(99,102,241,0.06)", borderRadius: "8px", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--primary)", marginBottom: "1px" }}>🏏 MATCH SLIDES</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    {selectedMatch ? `${selectedMatch.teamA?.name} vs ${selectedMatch.teamB?.name}` : "No match selected"}
                  </div>
                </div>
                <button
                  style={{ fontSize: "0.7rem", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: "700", whiteSpace: "nowrap" }}
                  onClick={() => setShowMatchPickerModal(true)}
                >
                  Change ↗
                </button>
              </div>

              {templateMatchId && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.75rem" }}>
                  <h4 style={{ fontSize: "0.8rem", fontWeight: "700", margin: "0.25rem 0", color: "var(--text-primary)" }}>Match Slides</h4>
                  {templateSlides.length === 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "center", padding: "0.5rem" }}>
                      No slides found for this match.
                    </div>
                  ) : (
                    templateSlides.map(slide => (
                      <div
                        key={slide.id}
                        onClick={() => handleApplySlideAsTemplate(slide)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px",
                          borderRadius: "6px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <img
                          src={`${getApiBaseUrl()}/api/overlay-slides/${slide.id}/image`}
                          alt=""
                          style={{ width: "40px", height: "25px", objectFit: "contain", borderRadius: "3px", backgroundColor: "#fff", border: "1px solid #cbd5e1", flexShrink: 0 }}
                        />
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, marginRight: "4px" }}>
                          {slide.title}
                        </span>
                        <button
                          className="btn btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSlideElementsToCanvas(slide);
                          }}
                          style={{ padding: "2px 4px", fontSize: "0.7rem", minHeight: "auto", display: "flex", alignItems: "center", gap: "2px", backgroundColor: "var(--primary-light)", color: "var(--primary)", border: "1px solid var(--primary)" }}
                          title="Import slide elements into current canvas"
                        >
                          ➕ Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto" }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: "700", margin: "0.25rem 0", color: "var(--text-primary)" }}>General Templates</h4>
                {templates.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      fontSize: "0.85rem",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <span style={{ fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "4px" }}>
                      {t.name}
                    </span>
                    <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleApplyTemplate(t.layoutJson)}
                        style={{ padding: "2px 4px", fontSize: "0.7rem", minHeight: "auto" }}
                        title="Replace canvas with this template"
                      >
                        Apply
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAddTemplateElementsToCanvas(t.layoutJson)}
                        style={{ padding: "2px 4px", fontSize: "0.7rem", minHeight: "auto", background: "linear-gradient(135deg, #10b981, #059669)", border: "none" }}
                        title="Add template elements into current canvas"
                      >
                        ➕ Add
                      </button>
                      {!t.prebuilt && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteTemplate(t.id)}
                          style={{ padding: "2px 4px", fontSize: "0.7rem", minHeight: "auto", background: "none", color: "red", border: "none" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OBS URLs info */}
            <div style={{ marginTop: "auto", padding: "0.75rem", borderRadius: "8px", background: "#f1f5f9", fontSize: "0.8rem", border: "1px dashed #cbd5e1" }}>
              <strong style={{ display: "block", marginBottom: "4px" }}>OBS Browser Source URL</strong>
              <code style={{ wordBreak: "break-all", color: "var(--primary)", fontSize: "0.75rem" }}>
                {window.location.origin}/overlay/{activeScene?.id || "live-match"}?matchId={selectedMatch?.id || 0}
              </code>
            </div>

          </div>
          )}

          {/* MIDDLE AREA: Visual Design Canvas & Elements Toolbox */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Canvas controls header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 1rem", background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="snap-grid"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                />
                <label htmlFor="snap-grid" style={{ fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>Grid Snap</label>

                <button
                  className="btn"
                  onClick={() => handleAddElement("scoreboard")}
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.75rem",
                    backgroundColor: "#e0e7ff",
                    color: "#4f46e5",
                    border: "1px solid #c7d2fe",
                    fontWeight: "700",
                    marginLeft: "1rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px"
                  }}
                >
                  ➕ Add Scorecard
                </button>

                <button
                  className="btn"
                  onClick={() => setIsFullscreenPreview(prev => !prev)}
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.75rem",
                    backgroundColor: isFullscreenPreview ? "var(--primary)" : "var(--bg-card)",
                    color: isFullscreenPreview ? "white" : "var(--text-primary)",
                    border: "1px solid var(--border-light)",
                    fontWeight: "700",
                    marginLeft: "1.25rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px"
                  }}
                >
                  {isFullscreenPreview ? "🗗 Restore Panels" : "🖥️ Maximize Preview"}
                </button>
              </div>

              <button
                className="btn"
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all elements? This will give you a blank workspace canvas.")) {
                    setElements([]);
                    setSelectedElementId(null);
                  }
                }}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  backgroundColor: "#fee2e2",
                  color: "#ef4444",
                  border: "1px solid #fca5a5",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px"
                }}
              >
                🧹 Clear Canvas
              </button>
            </div>

            {/* Figma-like visual canvas wrapper */}
            <div
              ref={containerRef}
              style={{
                flex: 1,
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-inner)",
                position: "relative",
                overflow: "hidden",
                background: "#090d16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "400px"
              }}
            >
              <div
                ref={canvasRef}
                style={{
                  width: "1920px",
                  height: "1080px",
                  position: "relative",
                  background: "repeating-conic-gradient(#f8fafc 0% 25%, #ffffff 0% 50%) 50% / 24px 24px",
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                  flexShrink: 0,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                  borderRadius: "8px"
                }}
                onClick={() => setSelectedElementId(null)}
              >
                <div style={{ position: "absolute", top: 12, left: 12, fontSize: "0.75rem", background: "rgba(15,23,42,0.85)", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontWeight: "700", zIndex: 100 }}>
                  🎥 Live Canvas Preview (Aspect Ratio 16:9) | Editing Draft of "{activeScene?.name}"
                </div>

                {activeScene?.videoFileName && (
                  <video
                    src={`${getApiBaseUrl()}/api/overlay-studio/scenes/${activeScene.id}/video`}
                    key={activeScene.videoFileName}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      pointerEvents: "none",
                      zIndex: 0
                    }}
                  />
                )}

                {/* RENDER ELEMENTS ON CANVAS */}
                {elements.map((el) => {
                  const isSelected = el.id === selectedElementId;
                  const srcUrl = el.assetId ? `${getApiBaseUrl()}/api/overlay-studio/assets/${el.assetId}/file` : el.imageUrl;

                  return (
                    <div
                      key={el.id}
                      style={{
                        position: "absolute",
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                        zIndex: el.zIndex || 10,
                        width: `${el.width}px`,
                        height: `${el.height}px`,
                        boxShadow: isSelected ? "0 0 0 2px var(--primary), 0 0 0 4px rgba(99,102,241,0.2)" : "none",
                        borderRadius: "4px",
                        cursor: el.locked ? "not-allowed" : "move",
                        outline: "none"
                      }}
                      onPointerDown={(e) => handleElementPointerDown(e, el, "drag")}
                      onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                    >
                      {/* Render visual wrapper based on card type */}
                      <div style={{ width: "100%", height: "100%", opacity: el.visible ? 1 : 0.3, pointerEvents: "none" }}>
                        
                        {/* Scoreboard */}
                        {el.type === "scoreboard" && (() => {
                          const battingTeamName = score?.battingTeam || selectedMatch?.teamA?.name || wizardTeamA || "Toss";
                          const bowlingTeamName = score?.bowlingTeam || selectedMatch?.teamB?.name || wizardTeamB || "Opponent";
                          const battingTeamObj = teams.find((t) => t.name === battingTeamName || t.shortName === battingTeamName);
                          const bowlingTeamObj = teams.find((t) => t.name === bowlingTeamName || t.shortName === bowlingTeamName);
                          const battingLogo = battingTeamObj?.id ? `${getApiBaseUrl()}/api/teams/${battingTeamObj.id}/logo` : null;
                          const bowlingLogo = bowlingTeamObj?.id ? `${getApiBaseUrl()}/api/teams/${bowlingTeamObj.id}/logo` : null;

                          return (
                            <div className="broadcast-scoreboard" style={{ width: "100%", height: "100%" }}>
                              {/* Left Accent & Batting Logo */}
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <div style={{ width: "4px", height: "50px", background: "linear-gradient(to bottom, #d97706, #fef08a, #d97706)", borderRadius: "2px" }} />
                                <div className="logo-box">
                                  {battingLogo ? (
                                    <img src={battingLogo} alt="batting team" />
                                  ) : (
                                    <span>{battingTeamName.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                              </div>

                              {/* Score Ticker */}
                              <div className="ticker-main">
                                <div className="ticker-top">
                                  <div className="ticker-team">{battingTeamName}</div>
                                  <div className="ticker-score">{score ? `${score.runs}-${score.wickets}` : "142-3"}</div>
                                  <div className="ticker-overs">{score?.overs || "12.4"} OVERS</div>
                                  <div className="ticker-vs">v {bowlingTeamName}</div>
                                  <div className="ticker-tourney">{score?.tournamentName || selectedMatch?.tournament?.name || wizardTournament || "LIVE BROADCAST"}</div>
                                </div>
                                <div className="ticker-bottom">
                                  <div className="ticker-batsman" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    {score?.strikerId && (
                                      <img 
                                        src={`${getApiBaseUrl()}/api/players/${score.strikerId}/photo`} 
                                        alt="" 
                                        style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", border: "1px solid #fbbf24" }} 
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    )}
                                    <span className="name">{score?.striker ? `★ ${score.striker}` : "★ Striker"}</span>
                                    <span className="runs">{score?.strikerRuns ?? 38}</span>
                                    <span className="balls">({score?.strikerBalls ?? 24})</span>
                                  </div>
                                  <div className="ticker-batsman" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    {score?.nonStrikerId && (
                                      <img 
                                        src={`${getApiBaseUrl()}/api/players/${score.nonStrikerId}/photo`} 
                                        alt="" 
                                        style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", border: "1px solid #cbd5e1" }} 
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    )}
                                    <span className="name">{score?.nonStriker || "Non-Striker"}</span>
                                    <span className="runs">{score?.nonStrikerRuns ?? 12}</span>
                                    <span className="balls">({score?.nonStrikerBalls ?? 9})</span>
                                  </div>
                                  <div className="ticker-bowler">
                                    <span className="name">{score?.bowler || "Bowler"}</span>
                                    <span className="wickets-runs">{score?.bowlerWickets ?? 2}-{score?.bowlerRuns ?? 18}</span>
                                    <span className="overs">({score?.bowlerOvers ?? "2.4"})</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Accent & Bowling Logo */}
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <div className="logo-box">
                                  {bowlingLogo ? (
                                    <img src={bowlingLogo} alt="bowling team" />
                                  ) : (
                                    <span>{bowlingTeamName.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div style={{ width: "4px", height: "50px", background: "linear-gradient(to bottom, #d97706, #fef08a, #d97706)", borderRadius: "2px" }} />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Mini IPL */}
                        {el.type === "mini_scoreboard" && (
                          <div style={{
                            background: "#0f172a", borderLeft: "4px solid #6366f1", borderRadius: "6px", height: "100%", padding: "6px 10px", color: "#fff", fontSize: "0.75rem", fontFamily: "Outfit", display: "flex", flexDirection: "column", justify: "space-between"
                          }}>
                            <div style={{ display: "flex", justify: "space-between", fontWeight: "900" }}>
                              <span style={{ color: "#facc15" }}>{score?.battingTeam || selectedMatch?.teamA?.name || "BATTING"}</span>
                              <span>{score ? `${score.runs}/${score.wickets} (${score.overs})` : "142/3 (12.4)"}</span>
                            </div>
                            <div style={{ color: "#94a3b8" }}>CRR {score?.runRate || "11.21"}</div>
                          </div>
                        )}

                        {/* Toss Card */}
                        {el.type === "toss_card" && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Outfit" }}>
                            <div style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff", fontWeight: "800", padding: "6px", textAlign: "center", fontSize: "0.8rem" }}>🪙 TOSS DECISION</div>
                            <div style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", justify: "center", flex: 1 }}>
                              <div style={{ fontWeight: "900", color: "#6366f1" }}>{score?.tossWinner || selectedMatch?.tossWinner || wizardTeamA || "Team A"}</div>
                              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Won the Toss & Elected to Bat</div>
                            </div>
                          </div>
                        )}

                        {/* Result Card */}
                        {el.type === "result_card" && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Outfit" }}>
                            <div style={{ background: "linear-gradient(90deg, #10b981, #059669)", color: "#fff", fontWeight: "800", padding: "6px", textAlign: "center", fontSize: "0.8rem" }}>🏆 MATCH RESULT</div>
                            <div style={{ padding: "16px", textAlign: "center", display: "flex", flexDirection: "column", justify: "center", flex: 1 }}>
                              <div style={{ fontWeight: "900", color: "#10b981" }}>{score?.matchResult || (selectedMatch?.winner ? `${selectedMatch.winner.name} Won` : `${wizardTeamA || "Team A"} Won`)}</div>
                              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{selectedMatch?.resultMargin || "by 45 runs"}</div>
                            </div>
                          </div>
                        )}

                        {/* Batsmen Card */}
                        {el.type === "batsman_card" && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Outfit" }}>
                            <div style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff", fontWeight: "800", padding: "6px", textAlign: "center", fontSize: "0.75rem" }}>🏏 BATSMEN STATUS</div>
                            <div style={{ padding: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem", justifyContent: "center" }}>
                              <div style={{ display: "flex", justify: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>★ {score?.striker || "Striker Batsman"}</span>
                                <span style={{ fontWeight: "800", color: "#6366f1" }}>{score?.strikerRuns ?? 38} ({score?.strikerBalls ?? 24})</span>
                              </div>
                              <div style={{ display: "flex", justify: "space-between" }}>
                                <span style={{ color: "#475569" }}>{score?.nonStriker || "Non-Striker Batsman"}</span>
                                <span style={{ color: "#475569" }}>{score?.nonStrikerRuns ?? 12} ({score?.nonStrikerBalls ?? 9})</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bowler Card */}
                        {el.type === "bowler_card" && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Outfit" }}>
                            <div style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff", fontWeight: "800", padding: "6px", textAlign: "center", fontSize: "0.75rem" }}>🥎 CURRENT BOWLER</div>
                            <div style={{ padding: "12px", flex: 1, display: "flex", alignItems: "center", justify: "space-between", fontSize: "0.8rem" }}>
                              <span style={{ fontWeight: "700", color: "#0f172a" }}>{score?.bowler || "Bowler"}</span>
                              <span style={{ fontWeight: "800", color: "#f43f5e" }}>
                                {score?.bowlerWickets ?? 2} - {score?.bowlerRuns ?? 18}
                                <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "4px" }}>({score?.bowlerOvers ?? "2.4"} Ov)</span>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Match Info Card */}
                        {el.type === "match_info_card" && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Outfit" }}>
                            <div style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff", fontWeight: "800", padding: "6px", textAlign: "center", fontSize: "0.75rem" }}>📊 MATCH INFO</div>
                            <div style={{ padding: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.75rem" }}>
                              <div>📍 Venue: {score?.venue || selectedMatch?.venue || wizardVenue || "Stadium"}</div>
                              <div>🏆 Tourney: {score?.tournamentName || selectedMatch?.tournament?.name || wizardTournament || "League"}</div>
                              <div style={{ display: "flex", justify: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "4px", marginTop: "4px" }}>
                                <span>CRR: {score?.runRate || "8.42"}</span>
                                <span>RRR: {score?.requiredRunRate || "9.15"}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Video Clip Slot */}
                        {el.type === "video" && (
                          <div style={{
                            width: "100%", height: "100%", background: "#1e1e38", color: "#fbbf24", border: "2px solid #6366f1", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "800", flexDirection: "column", gap: "4px"
                          }}>
                            <span>📹 Video Slot</span>
                            {srcUrl && <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>Asset Linked</span>}
                          </div>
                        )}

                        {/* Text/General default visualizer */}
                        {el.type !== "scoreboard" && el.type !== "mini_scoreboard" && el.type !== "toss_card" && el.type !== "result_card" && el.type !== "batsman_card" && el.type !== "bowler_card" && el.type !== "match_info_card" && el.type !== "video" && (
                          <div style={{
                            color: el.style?.color || "#ffffff",
                            fontSize: el.style?.fontSize || "16px",
                            fontWeight: "bold",
                            backgroundColor: el.style?.backgroundColor || "rgba(15,23,42,0.85)",
                            borderRadius: el.style?.borderRadius || "6px",
                            border: isSelected ? "2px solid var(--primary)" : el.style?.border || "1px solid #4f46e5",
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "6px"
                          }}>
                            {el.type === "image" ? (
                              srcUrl ? <img src={srcUrl} alt="Visual Element" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🖼️ Image Block"
                            ) : (
                              el.text || `[${el.type.toUpperCase()}]`
                            )}
                          </div>
                        )}

                      </div>

                      {/* ─── Selection overlay controls (shown when element is selected) ─── */}
                      {isSelected && (
                        <>
                          {/* ✕ Delete button — top-right */}
                          <div
                            title="Delete element"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setElements(prev => prev.filter(e2 => e2.id !== el.id));
                              setSelectedElementId(null);
                            }}
                            style={{
                              position: "absolute",
                              top: 0,
                              right: 0,
                              transform: `translate(50%, -50%) scale(${1 / scale})`,
                              transformOrigin: "center center",
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              background: "#ef4444",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: "900",
                              cursor: "pointer",
                              zIndex: 200,
                              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                              lineHeight: 1,
                              userSelect: "none"
                            }}
                          >
                            ✕
                          </div>

                          {/* Type label — top-left */}
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              transform: `translate(0, -100%) scale(${1 / scale})`,
                              transformOrigin: "bottom left",
                              background: "var(--primary)",
                              color: "#fff",
                              fontSize: "9px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              zIndex: 200,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                              pointerEvents: "none",
                              marginBottom: "2px"
                            }}
                          >
                            {el.type?.replace(/_/g, " ")}
                          </div>

                          {/* Resize handle — bottom-right (only when not locked) */}
                          {!el.locked && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                transform: `translate(50%, 50%) scale(${1 / scale})`,
                                transformOrigin: "center center",
                                width: "14px",
                                height: "14px",
                                backgroundColor: "var(--primary)",
                                border: "2px solid #ffffff",
                                borderRadius: "50%",
                                cursor: "se-resize",
                                zIndex: 200,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                              }}
                              onPointerDown={(e) => handleElementPointerDown(e, el, "resize")}
                            />
                          )}
                        </>
                      )}

                      {/* Lock Indicator */}
                      {el.locked && (
                        <div style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          transform: `translate(50%, -50%) scale(${1 / scale})`,
                          transformOrigin: "center center",
                          background: "#ef4444",
                          color: "#fff",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          zIndex: 200
                        }}>
                          🔒
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Editor Properties panel */}
          {!isFullscreenPreview && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
              
              {/* PROPERTIES SECTION */}
              <div className="premium-card" style={{ flex: 1, padding: "1.25rem", overflowY: "auto" }}>
                <h3 style={{ fontSize: "1.05rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", justify: "space-between" }}>
                  <span>⚙️ Adjust Element</span>
                  {selectedEl && (
                    <span style={{ fontSize: "0.72rem", fontWeight: "700", background: "var(--primary-light)", color: "var(--primary)", padding: "2px 8px", borderRadius: "20px", textTransform: "uppercase" }}>
                      {selectedEl.type?.replace(/_/g, " ")}
                    </span>
                  )}
                </h3>

                {!selectedEl && (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 1rem", fontSize: "0.85rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👆</div>
                    <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>No element selected</div>
                    <div>Click any element on the canvas to select it and adjust its properties here</div>
                  </div>
                )}

                {selectedEl ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem" }}>
                    
                    {/* Element Lock & Visibility */}
                    <div style={{ display: "flex", gap: "1.5rem", background: "var(--bg-app)", padding: "0.5rem", borderRadius: "8px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: "700", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedEl.locked || false}
                          onChange={(e) => {
                            setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, locked: e.target.checked } : el));
                          }}
                        />
                        🔒 Lock
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: "700", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedEl.visible ?? true}
                          onChange={(e) => {
                            setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, visible: e.target.checked } : el));
                          }}
                        />
                        👁️ Visible
                      </label>
                    </div>

                    {/* Positioning Sliders */}
                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.25rem" }}>↔️ Position Left/Right (X)</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        style={{ width: "100%", accentColor: "var(--primary)" }}
                        value={selectedEl.x}
                        onChange={(e) => {
                          setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, x: Number(e.target.value) } : el));
                        }}
                      />
                    </div>

                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.25rem" }}>↕️ Position Up/Down (Y)</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        style={{ width: "100%", accentColor: "var(--primary)" }}
                        value={selectedEl.y}
                        onChange={(e) => {
                          setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, y: Number(e.target.value) } : el));
                        }}
                      />
                    </div>

                    {/* Resize Sliders */}
                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.25rem" }}>📐 Adjust Width</span>
                      <input
                        type="range"
                        min="20"
                        max="1500"
                        step="5"
                        style={{ width: "100%", accentColor: "var(--primary)" }}
                        value={selectedEl.width || 200}
                        onChange={(e) => {
                          setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, width: Number(e.target.value) } : el));
                        }}
                      />
                    </div>

                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.25rem" }}>📐 Adjust Height</span>
                      <input
                        type="range"
                        min="20"
                        max="1000"
                        step="5"
                        style={{ width: "100%", accentColor: "var(--primary)" }}
                        value={selectedEl.height || 60}
                        onChange={(e) => {
                          setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, height: Number(e.target.value) } : el));
                        }}
                      />
                    </div>

                    {/* Rotation Slider */}
                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.25rem" }}>🔄 Rotate Angle ({selectedEl.rotation || 0}°)</span>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        style={{ width: "100%", accentColor: "var(--primary)" }}
                        value={selectedEl.rotation || 0}
                        onChange={(e) => {
                          setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, rotation: Number(e.target.value) } : el));
                        }}
                      />
                    </div>

                    {/* Opacity Slider */}
                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.25rem" }}>💧 Transparency / Opacity</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        style={{ width: "100%", accentColor: "var(--primary)" }}
                        value={selectedEl.opacity ?? 1}
                        onChange={(e) => {
                          setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, opacity: Number(e.target.value) } : el));
                        }}
                      />
                    </div>

                    {/* Layer Adjustment / Front-Back */}
                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.4rem" }}>🥞 Layer Hierarchy</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.4rem", fontSize: "0.75rem", flex: 1, minHeight: "auto" }}
                          onClick={() => {
                            setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, zIndex: (el.zIndex || 10) + 1 } : el));
                          }}
                        >
                          🔺 Bring Forward
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.4rem", fontSize: "0.75rem", flex: 1, minHeight: "auto" }}
                          onClick={() => {
                            setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, zIndex: Math.max(1, (el.zIndex || 10) - 1) } : el));
                          }}
                        >
                          🔻 Send Backward
                        </button>
                      </div>
                    </div>

                    {/* Crop / Aspect Ratio Presets */}
                    <div>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "0.4rem" }}>✂️ Crop Aspect Ratio Preset</span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px", fontSize: "0.7rem", minHeight: "auto" }}
                          onClick={() => {
                            const side = Math.min(selectedEl.width || 200, selectedEl.height || 200);
                            setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, width: side, height: side } : el));
                          }}
                        >
                          1:1 Square
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px", fontSize: "0.7rem", minHeight: "auto" }}
                          onClick={() => {
                            const w = selectedEl.width || 320;
                            const h = Math.round((w / 16) * 9);
                            setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, width: w, height: h } : el));
                          }}
                        >
                          16:9 Land
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px", fontSize: "0.7rem", minHeight: "auto" }}
                          onClick={() => {
                            const w = selectedEl.width || 180;
                            const h = Math.round((w / 9) * 16);
                            setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, width: w, height: h } : el));
                          }}
                        >
                          9:16 Port
                        </button>
                      </div>
                    </div>

                    {/* Edit Custom Text */}
                    {selectedEl.type !== "scoreboard" && selectedEl.type !== "mini_scoreboard" && selectedEl.type !== "batsman_card" && selectedEl.type !== "bowler_card" && selectedEl.type !== "match_info_card" && (
                      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: "0.75rem" }}>Display Text</label>
                          <textarea
                            className="form-input"
                            rows={2}
                            style={{ padding: "0.4rem", resize: "vertical" }}
                            value={selectedEl.text || ""}
                            onChange={(e) => {
                              setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, text: e.target.value } : el));
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.75rem" }}>Font Size ({selectedEl.style?.fontSize || "16px"})</label>
                            <input
                              type="range"
                              min="10"
                              max="80"
                              step="1"
                              style={{ width: "100%", accentColor: "var(--primary)" }}
                              value={parseInt(selectedEl.style?.fontSize) || 16}
                              onChange={(e) => {
                                const val = `${e.target.value}px`;
                                setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, style: { ...el.style, fontSize: val } } : el));
                              }}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.75rem" }}>Text Color</label>
                            <input
                              type="color"
                              style={{ padding: "0", height: "28px", width: "100%", border: "1px solid var(--border-light)" }}
                              value={selectedEl.style?.color || "#ffffff"}
                              onChange={(e) => {
                                setElements(prev => prev.map(el => el.id === selectedEl.id ? { ...el, style: { ...el.style, color: e.target.value } } : el));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Danger Delete */}
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        setElements(prev => prev.filter(el => el.id !== selectedEl.id));
                        setSelectedElementId(null);
                      }}
                      style={{ marginTop: "0.5rem", padding: "0.5rem", fontSize: "0.8rem", backgroundColor: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5" }}
                    >
                      🗑️ Delete Element
                    </button>

                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem" }}>
                    Select an element on the canvas to start crop, edit, resize adjustments.
                  </div>
                )}
              </div>

              {/* LAYERS MANAGER CARD */}
              <div className="premium-card" style={{ flex: 1, padding: "1.25rem", display: "flex", flexDirection: "column", minHeight: "280px", marginTop: "1rem" }}>
                <h3 style={{ fontSize: "1.05rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", justify: "space-between" }}>
                  <span>📁 Canvas Elements / Layers</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({elements.length})</span>
                </h3>
                
                {elements.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem 1rem", fontSize: "0.85rem", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span>No elements added yet</span>
                    <span style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Use toolbar above canvas to add elements</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto", flex: 1, maxHeight: "250px" }}>
                    {elements.map((el) => {
                      const isSelected = el.id === selectedElementId;
                      return (
                        <div
                          key={el.id}
                          onClick={() => setSelectedElementId(el.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "8px",
                            background: isSelected ? "var(--primary-light)" : "var(--bg-app)",
                            border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border-light)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            fontSize: "0.8rem"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span>{el.type === "scoreboard" ? "📺" : el.type === "mini_scoreboard" ? "📱" : el.type === "text" ? "✍️" : "🖼️"}</span>
                            <span style={{ fontWeight: isSelected ? "700" : "500", color: isSelected ? "var(--primary)" : "var(--text-primary)", textTransform: "capitalize" }}>
                              {el.type?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {/* Toggle visibility */}
                            <button
                              title="Toggle Visibility"
                              onClick={(e) => {
                                e.stopPropagation();
                                setElements(prev => prev.map(item => item.id === el.id ? { ...item, visible: !item.visible } : item));
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: el.visible ? 1 : 0.4 }}
                            >
                              {el.visible ? "👁️" : "🙈"}
                            </button>
                            {/* Toggle Lock */}
                            <button
                              title="Toggle Lock"
                              onClick={(e) => {
                                e.stopPropagation();
                                setElements(prev => prev.map(item => item.id === el.id ? { ...item, locked: !item.locked } : item));
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: el.locked ? 1 : 0.4 }}
                            >
                              {el.locked ? "🔒" : "🔓"}
                            </button>
                            {/* Delete element */}
                            <button
                              title="Delete Element"
                              onClick={(e) => {
                                e.stopPropagation();
                                setElements(prev => prev.filter(item => item.id !== el.id));
                                if (isSelected) setSelectedElementId(null);
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "#ef4444" }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SETUP WIZARD DIALOG MODAL */}
      {showSetupModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15,23,42,0.6)", zIndex: 10000, display: "flex", alignItems: "center", justify: "center"
        }}>
          <div className="premium-card" style={{ width: "550px", maxWidth: "90%", padding: "2rem", overflow: "hidden" }}>
            <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>🏏 Stream Setup Wizard</span>
              <button onClick={() => setShowSetupModal(false)} style={{ border: "none", background: "none", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
            </h2>

            {/* Step 1: Pre-fill from existing matches */}
            {wizardStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  To save time, select an existing scheduled match to pre-fill the wizard setup details.
                </p>
                <div className="form-group">
                  <label className="form-label">Pre-fill From Scheduled Match</label>
                  <select
                    className="form-select"
                    onChange={(e) => handlePreFillMatch(e.target.value)}
                  >
                    <option value="">Choose Match...</option>
                    {matches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.teamA?.name} vs {m.teamB?.name} ({m.venue})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button className="btn btn-primary" onClick={() => setWizardStep(2)}>
                    Next Step ➡️
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Match Metadata */}
            {wizardStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Tournament Branding Name</label>
                    <input type="text" className="form-input" value={wizardTournament} onChange={(e) => setWizardTournament(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tournament Logo (Optional)</label>
                    <input type="file" style={{ fontSize: "0.8rem" }} onChange={(e) => setWizardTourneyLogo(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Match Title Name</label>
                  <input type="text" className="form-input" value={wizardMatchName} onChange={(e) => setWizardMatchName(e.target.value)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Venue Location</label>
                    <input type="text" className="form-input" value={wizardVenue} onChange={(e) => setWizardVenue(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Match Date</label>
                    <input type="date" className="form-input" value={wizardDate} onChange={(e) => setWizardDate(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: "flex", justify: "space-between", marginTop: "1.5rem" }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(1)}>
                    ⬅️ Back
                  </button>
                  <button className="btn btn-primary" onClick={() => setWizardStep(3)}>
                    Next Step ➡️
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Rosters & Toss */}
            {wizardStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Team A Name</label>
                    <input type="text" className="form-input" value={wizardTeamA} onChange={(e) => setWizardTeamA(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team A Logo (Optional)</label>
                    <input type="file" style={{ fontSize: "0.8rem" }} onChange={(e) => setWizardLogoA(e.target.files?.[0] || null)} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Team B Name</label>
                    <input type="text" className="form-input" value={wizardTeamB} onChange={(e) => setWizardTeamB(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team B Logo (Optional)</label>
                    <input type="file" style={{ fontSize: "0.8rem" }} onChange={(e) => setWizardLogoB(e.target.files?.[0] || null)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Toss Winner Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Team A" value={wizardTossWinner} onChange={(e) => setWizardTossWinner(e.target.value)} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Playing XI Team A (comma separated)</label>
                    <textarea className="form-input" rows={3} placeholder="Player 1, Player 2..." value={wizardXI_A} onChange={(e) => setWizardXI_A(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Playing XI Team B (comma separated)</label>
                    <textarea className="form-input" rows={3} placeholder="Player 1, Player 2..." value={wizardXI_B} onChange={(e) => setWizardXI_B(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: "flex", justify: "space-between", marginTop: "1.5rem" }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(2)}>
                    ⬅️ Back
                  </button>
                  <button className="btn btn-success" onClick={handleWizardSubmit}>
                    ✅ Complete Setup
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
