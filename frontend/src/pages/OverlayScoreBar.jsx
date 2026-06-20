import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLiveScore } from "../api/liveScoreApi";
import { getMatches } from "../api/matchApi";
import { getInnings } from "../api/inningsApi";
import { getTeams } from "../api/teamApi";
import { getPlayers } from "../api/playerApi";
import { 
  getSlides, 
  createSlide, 
  activateSlide, 
  deactivateAllSlides, 
  getActiveSlide, 
  deleteSlide,
  saveSlideLayout,
  updateSlide,
  getSlidesByMatch
} from "../api/overlaySlideApi";
import Sidebar from "../components/Sidebar";
import { getApiBaseUrl, getFullUrl } from "../utils/config";

const TEMPLATE_TYPES = [
  { value: "preview", label: "Match Preview 📋", title: "Match Preview" },
  { value: "toss", label: "Toss Decision 🪙", title: "Toss Decision" },
  { value: "result", label: "Match Result 🏆", title: "Match Result" },
  { value: "pom", label: "Player of the Match 🎖️", title: "Player of the Match" },
  { value: "general", label: "Broadcast Notice 📢", title: "Broadcast Notice" }
];

export default function OverlayScoreBar() {
  const [searchParams] = useSearchParams();
  const inningsIdParam = Number(searchParams.get("inningsId"));
  const obsMode = searchParams.get("obs") === "true";
  const urlTournamentName = searchParams.get("tournamentName") || "T10 LEAGUE";

  // Configuration states (for URL generator dashboard)
  const [matches, setMatches] = useState([]);
  const [innings, setInnings] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedInningsId, setSelectedInningsId] = useState(inningsIdParam || "");
  const [tournamentName, setTournamentName] = useState(urlTournamentName);

  // Live scoring state
  const [score, setScore] = useState(null);
  const [copied, setCopied] = useState(false);

  // Slide Deck configuration states
  const [slides, setSlides] = useState([]);
  const [newSlideTitle, setNewSlideTitle] = useState("");
  const [newSlideWidth, setNewSlideWidth] = useState(800);
  const [newSlideHeight, setNewSlideHeight] = useState(450);
  const [newSlideFile, setNewSlideFile] = useState(null);
  const [uploadingSlide, setUploadingSlide] = useState(false);

  // Selected slide for adjustment
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [adjustWidth, setAdjustWidth] = useState(800);
  const [adjustHeight, setAdjustHeight] = useState(450);

  // Active slide rendering states (for transparent fade transition)
  const [activeSlide, setActiveSlide] = useState(null);
  const [renderedSlide, setRenderedSlide] = useState(null);
  const [isSlideVisible, setIsSlideVisible] = useState(false);

  // Graphic designer & editor states
  const [activeTab, setActiveTab] = useState("add"); // "add" or "edit"
  const [editMatchSlides, setEditMatchSlides] = useState([]);
  const [editSelectedMatchId, setEditSelectedMatchId] = useState("");
  const [createSelectedMatchId, setCreateSelectedMatchId] = useState("");
  const [selectedTemplateType, setSelectedTemplateType] = useState("");
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [overlayElements, setOverlayElements] = useState([]);
  const [editSelectedSlide, setEditSelectedSlide] = useState(null);
  const [customText, setCustomText] = useState("");
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [draggingElementId, setDraggingElementId] = useState(null);

  // Slide metadata edit states (for full slide editing)
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [editSlideTitle, setEditSlideTitle] = useState("");
  const [editSlideWidth, setEditSlideWidth] = useState(800);
  const [editSlideHeight, setEditSlideHeight] = useState(450);
  const [editSlideFile, setEditSlideFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [savingSlide, setSavingSlide] = useState(false);

  // Load match players roster and slides when selected match changes in editor
  useEffect(() => {
    if (!editSelectedMatchId) {
      setMatchPlayers([]);
      setEditMatchSlides([]);
      setEditSelectedSlide(null);
      setIsEditingSlide(false);
      return;
    }
    const match = matches.find(m => m.id === Number(editSelectedMatchId));
    if (!match) return;

    const fetchPlayersAndSlides = async () => {
      try {
        // Load roster players
        const teamAPlayers = match.teamA?.id ? await getPlayers({ teamId: match.teamA.id }) : [];
        const teamBPlayers = match.teamB?.id ? await getPlayers({ teamId: match.teamB.id }) : [];
        
        const taggedA = teamAPlayers.map(p => ({ ...p, teamName: match.teamA.name }));
        const taggedB = teamBPlayers.map(p => ({ ...p, teamName: match.teamB.name }));
        setMatchPlayers([...taggedA, ...taggedB]);

        // Load match-specific slides
        const slideData = await getSlidesByMatch(Number(editSelectedMatchId));
        setEditMatchSlides(slideData);
        if (slideData.length > 0) {
          startEditingSlide(slideData[0]);
        } else {
          setEditSelectedSlide(null);
          setIsEditingSlide(false);
        }
      } catch (err) {
        console.error("Failed to load match players and slides", err);
      }
    };
    fetchPlayersAndSlides();
  }, [editSelectedMatchId, matches]);

  // Load custom elements when selected slide changes in editor
  useEffect(() => {
    if (!editSelectedSlide) {
      setOverlayElements([]);
      return;
    }
    if (editSelectedSlide.overlayLayout) {
      try {
        const parsed = JSON.parse(editSelectedSlide.overlayLayout);
        setOverlayElements(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Failed to parse slide layout", e);
        setOverlayElements([]);
      }
    } else {
      setOverlayElements([]);
    }
    setSelectedElementId(null);
  }, [editSelectedSlide]);

  useEffect(() => {
    loadTeams();
    loadSlides();
    if (!obsMode) {
      loadMatches();
      loadInnings();
    }
  }, []);

  // Poll score data for the active innings ID
  useEffect(() => {
    const activeInningsId = obsMode ? inningsIdParam : selectedInningsId;
    if (!activeInningsId) return;

    loadScore(activeInningsId);
    const interval = setInterval(() => loadScore(activeInningsId), 1000);
    return () => clearInterval(interval);
  }, [selectedInningsId, obsMode, inningsIdParam]);

  // Poll active slide details (runs on both OBS output and generator dashboard)
  useEffect(() => {
    loadActiveSlide();
    const interval = setInterval(loadActiveSlide, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle smooth slide fade transitions when active status changes
  useEffect(() => {
    if (activeSlide) {
      setRenderedSlide(activeSlide);
      const timer = setTimeout(() => setIsSlideVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsSlideVisible(false);
      const timer = setTimeout(() => setRenderedSlide(null), 500); // matches transition duration
      return () => clearTimeout(timer);
    }
  }, [activeSlide]);

  const loadTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Failed to load teams for overlay", error);
    }
  };

  const loadMatches = async () => {
    try {
      const data = await getMatches();
      setMatches(data);
    } catch (error) {
      console.error("Failed to load matches", error);
    }
  };

  const loadInnings = async () => {
    try {
      const data = await getInnings();
      setInnings(data);
    } catch (error) {
      console.error("Failed to load innings", error);
    }
  };

  const loadScore = async (id) => {
    try {
      const data = await getLiveScore(id);
      setScore(data);
    } catch (error) {
      console.error("Failed to load live score data", error);
    }
  };

  const loadSlides = async () => {
    try {
      const data = await getSlides();
      setSlides(data);
    } catch (error) {
      console.error("Failed to load slides", error);
    }
  };

  const loadActiveSlide = async () => {
    try {
      const data = await getActiveSlide();
      setActiveSlide(data);
    } catch (error) {
      console.error("Failed to load active slide", error);
    }
  };

  const generateTemplateBlob = (width, height, type) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (type === "toss") {
      grad.addColorStop(0, "#4f46e5"); // Indigo
      grad.addColorStop(1, "#06b6d4"); // Cyan
    } else if (type === "result") {
      grad.addColorStop(0, "#064e3b"); // Emerald dark
      grad.addColorStop(1, "#10b981"); // Emerald light
    } else if (type === "pom") {
      grad.addColorStop(0, "#7c2d12"); // Orange dark
      grad.addColorStop(1, "#f59e0b"); // Amber
    } else if (type === "preview") {
      grad.addColorStop(0, "#1e1b4b"); // Navy dark
      grad.addColorStop(1, "#312e81"); // Navy
    } else {
      // General Slate / Default
      grad.addColorStop(0, "#0f172a"); // Slate dark
      grad.addColorStop(1, "#1e293b"); // Slate
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    
    // Pattern: subtle diagonal lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 2;
    for (let i = -width; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }
    
    // Pattern: radial overlay shine
    const radialGrad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, width/1.5);
    radialGrad.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    radialGrad.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = type === "pom" ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    });
  };

  const getDefaultElementsForTemplate = (type) => {
    if (type === "preview") {
      return [
        {
          id: `el_preview_h_${Date.now()}`,
          text: " MATCH PREVIEW",
          x: 50,
          y: 20,
          fontSize: 24,
          color: "#facc15"
        },
        {
          id: `el_preview_vs_${Date.now()}`,
          text: "{match_name}",
          x: 50,
          y: 48,
          fontSize: 32,
          color: "#ffffff"
        },
        {
          id: `el_preview_venue_${Date.now()}`,
          text: " Venue: {venue}",
          x: 50,
          y: 72,
          fontSize: 18,
          color: "#cbd5e1"
        }
      ];
    }
    if (type === "toss") {
      return [
        {
          id: `el_toss_h_${Date.now()}`,
          text: " TOSS DECISION",
          x: 50,
          y: 20,
          fontSize: 24,
          color: "#ffffff"
        },
        {
          id: `el_toss_winner_${Date.now()}`,
          text: "{toss_winner}",
          x: 50,
          y: 45,
          fontSize: 32,
          color: "#facc15"
        },
        {
          id: `el_toss_decision_${Date.now()}`,
          text: "Won the Toss & Elected to Bat First",
          x: 50,
          y: 70,
          fontSize: 20,
          color: "#ffffff"
        }
      ];
    }
    if (type === "result") {
      return [
        {
          id: `el_result_h_${Date.now()}`,
          text: " MATCH RESULT",
          x: 50,
          y: 20,
          fontSize: 24,
          color: "#facc15"
        },
        {
          id: `el_result_status_${Date.now()}`,
          text: "{match_result}",
          x: 50,
          y: 50,
          fontSize: 32,
          color: "#ffffff"
        },
        {
          id: `el_result_footer_${Date.now()}`,
          text: "CONGRATULATIONS!",
          x: 50,
          y: 78,
          fontSize: 18,
          color: "#facc15"
        }
      ];
    }
    if (type === "pom") {
      return [
        {
          id: `el_pom_h_${Date.now()}`,
          text: " PLAYER OF THE MATCH",
          x: 50,
          y: 20,
          fontSize: 24,
          color: "#ffffff"
        },
        {
          id: `el_pom_name_${Date.now()}`,
          text: "{striker_name}",
          x: 50,
          y: 45,
          fontSize: 32,
          color: "#facc15"
        },
        {
          id: `el_pom_sub_${Date.now()}`,
          text: "Excellent Match-Winning Performance",
          x: 50,
          y: 68,
          fontSize: 18,
          color: "#ffffff"
        },
        {
          id: `el_pom_stats_${Date.now()}`,
          text: "Runs: {striker_runs} ({striker_balls})",
          x: 50,
          y: 84,
          fontSize: 16,
          color: "#cbd5e1"
        }
      ];
    }
    // General
    return [
      {
        id: `el_general_h_${Date.now()}`,
        text: " CHAMPION SPORTS",
        x: 50,
        y: 18,
        fontSize: 22,
        color: "#facc15"
      },
      {
        id: `el_general_title_${Date.now()}`,
        text: "BROADCAST NOTICE",
        x: 50,
        y: 48,
        fontSize: 28,
        color: "#ffffff"
      },
      {
        id: `el_general_desc_${Date.now()}`,
        text: "Live action will resume shortly...",
        x: 50,
        y: 72,
        fontSize: 18,
        color: "#cbd5e1"
      }
    ];
  };

  const handleCreateSlide = async () => {
    if (!newSlideTitle || !newSlideFile) {
      alert("Please provide a title name and slide image file.");
      return;
    }
    const targetMatchId = createSelectedMatchId ? String(createSelectedMatchId) : "";
    try {
      setUploadingSlide(true);
      const newSlide = await createSlide(
        newSlideTitle, 
        newSlideWidth, 
        newSlideHeight, 
        newSlideFile,
        createSelectedMatchId ? Number(createSelectedMatchId) : null
      );
      setNewSlideTitle("");
      setNewSlideWidth(800);
      setNewSlideHeight(450);
      setNewSlideFile(null);
      setCreateSelectedMatchId("");
      // Reset input element
      const fileInput = document.getElementById("slide-file-input");
      if (fileInput) fileInput.value = "";
      
      alert("Title card slide added successfully!");
      await loadSlides();
      if (targetMatchId) {
        setEditSelectedMatchId(targetMatchId);
        setActiveTab("edit");
        startEditingSlide(newSlide);
      }
    } catch (error) {
      console.error("Failed to upload slide", error);
      alert("Failed to create slide");
    } finally {
      setUploadingSlide(false);
    }
  };

  const handleCreateSlideFromTemplate = async () => {
    if (!newSlideTitle) {
      alert("Please enter a slide title.");
      return;
    }
    if (!selectedTemplateType) {
      alert("Please select a template type.");
      return;
    }
    const targetMatchId = createSelectedMatchId ? String(createSelectedMatchId) : "";
    
    try {
      setUploadingSlide(true);
      
      const blob = await generateTemplateBlob(newSlideWidth, newSlideHeight, selectedTemplateType);
      const file = new File([blob], `${selectedTemplateType}_bg.png`, { type: "image/png" });
      
      const newSlide = await createSlide(
        newSlideTitle, 
        newSlideWidth, 
        newSlideHeight, 
        file, 
        createSelectedMatchId ? Number(createSelectedMatchId) : null
      );
      
      const defaultElements = getDefaultElementsForTemplate(selectedTemplateType);
      await saveSlideLayout(newSlide.id, JSON.stringify(defaultElements));
      
      setNewSlideTitle("");
      setSelectedTemplateType("");
      setCreateSelectedMatchId("");
      
      alert(`Slide "${newSlide.title}" created successfully from template!`);
      
      await loadSlides();
      setEditSelectedMatchId(targetMatchId);
      setActiveTab("edit");
      startEditingSlide(newSlide);
    } catch (error) {
      console.error("Failed to create slide from template", error);
      alert("Failed to create template slide: " + error.message);
    } finally {
      setUploadingSlide(false);
    }
  };

  const handleCreateAllSlides = async () => {
    const targetMatchId = createSelectedMatchId ? String(createSelectedMatchId) : "";

    try {
      setUploadingSlide(true);
      let firstSlide = null;
      
      for (const t of TEMPLATE_TYPES) {
        let displayTitle = t.title;
        if (targetMatchId) {
          const match = matches.find(m => m.id === Number(targetMatchId));
          if (match) {
            displayTitle = `${t.title} - ${match.teamA?.name} vs ${match.teamB?.name}`;
          }
        }
        
        const blob = await generateTemplateBlob(newSlideWidth, newSlideHeight, t.value);
        const file = new File([blob], `${t.value}_bg.png`, { type: "image/png" });
        
        const newSlide = await createSlide(
          displayTitle, 
          newSlideWidth, 
          newSlideHeight, 
          file, 
          createSelectedMatchId ? Number(createSelectedMatchId) : null
        );
        
        const defaultElements = getDefaultElementsForTemplate(t.value);
        await saveSlideLayout(newSlide.id, JSON.stringify(defaultElements));
        
        if (!firstSlide) {
          firstSlide = newSlide;
        }
      }
      
      setCreateSelectedMatchId("");
      alert("All 5 template slides created successfully!");
      
      await loadSlides();
      if (targetMatchId) {
        setEditSelectedMatchId(targetMatchId);
        setActiveTab("edit");
        if (firstSlide) {
          startEditingSlide(firstSlide);
        }
      }
    } catch (error) {
      console.error("Failed to create all template slides", error);
      alert("Failed to create all template slides: " + error.message);
    } finally {
      setUploadingSlide(false);
    }
  };

  const handleActivateSlide = async (id, w, h) => {
    try {
      await activateSlide(id, w, h);
      loadActiveSlide();
    } catch (error) {
      console.error("Failed to activate slide", error);
    }
  };

  const handleDeactivateAll = async () => {
    try {
      await deactivateAllSlides();
      loadActiveSlide();
    } catch (error) {
      console.error("Failed to deactivate slides", error);
    }
  };

  const handleDeleteSlide = async (id) => {
    if (!window.confirm("Are you sure you want to delete this title card slide?")) return;
    try {
      await deleteSlide(id);
      if (selectedSlide && selectedSlide.id === id) {
        setSelectedSlide(null);
      }
      if (editSelectedSlide && editSelectedSlide.id === id) {
        setEditSelectedSlide(null);
        setIsEditingSlide(false);
      }
      await loadSlides();
      if (editSelectedMatchId) {
        const slideData = await getSlidesByMatch(Number(editSelectedMatchId));
        setEditMatchSlides(slideData);
      }
    } catch (error) {
      console.error("Failed to delete slide", error);
    }
  };

  const handlePointerDown = (e, id) => {
    e.preventDefault();
    setDraggingElementId(id);
  };

  const handlePointerMove = (e) => {
    if (!draggingElementId) return;
    const canvas = document.getElementById("slide-edit-canvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setOverlayElements(prev => prev.map(el => {
      if (el.id === draggingElementId) {
        return { ...el, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
      }
      return el;
    }));
  };

  const handlePointerUp = () => {
    setDraggingElementId(null);
  };

  const addPlayerPhotoElement = (player) => {
    const imgEl = {
      id: `el_${Date.now()}_img_${Math.random().toString(36).substr(2, 5)}`,
      type: "image",
      src: `${getApiBaseUrl()}/api/players/${player.id}/photo`,
      x: 50,
      y: 50,
      width: 80,
      height: 80,
      borderRadius: "50%"
    };
    setOverlayElements([...overlayElements, imgEl]);
  };

  const addTeamLogoElement = (team) => {
    const imgEl = {
      id: `el_${Date.now()}_img_${Math.random().toString(36).substr(2, 5)}`,
      type: "image",
      src: `${getApiBaseUrl()}/api/teams/${team.id}/logo`,
      x: 50,
      y: 50,
      width: 80,
      height: 80,
      borderRadius: "8px"
    };
    setOverlayElements([...overlayElements, imgEl]);
  };

  const addCustomTextElement = () => {
    if (!customText) return;
    const newEl = {
      id: `el_${Date.now()}`,
      text: customText,
      x: 50,
      y: 50,
      fontSize: 20,
      color: "#ffffff"
    };
    setOverlayElements([...overlayElements, newEl]);
    setCustomText("");
  };

  const updateElementText = (id, text) => {
    setOverlayElements(prev => prev.map(el => el.id === id ? { ...el, text } : el));
  };

  const updateElementStyle = (id, key, value) => {
    setOverlayElements(prev => prev.map(el => el.id === id ? { ...el, [key]: value } : el));
  };

  const deleteElement = (id) => {
    setOverlayElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleSaveLayout = async () => {
    if (!editSelectedSlide) return;
    try {
      const layoutJson = JSON.stringify(overlayElements);
      const updated = await saveSlideLayout(editSelectedSlide.id, layoutJson);
      
      setSlides(prev => prev.map(s => s.id === editSelectedSlide.id ? updated : s));
      setEditSelectedSlide(updated);
      
      alert("Custom graphic slide layout saved successfully!");
      await loadSlides();
      loadActiveSlide();
      if (editSelectedMatchId) {
        const slideData = await getSlidesByMatch(Number(editSelectedMatchId));
        setEditMatchSlides(slideData);
      }
    } catch (err) {
      console.error("Failed to save slide layout", err);
      alert("Failed to save slide layout");
    }
  };

  const handleSaveAndPublish = async () => {
    if (!editSelectedSlide) return;
    try {
      const layoutJson = JSON.stringify(overlayElements);
      const updated = await saveSlideLayout(editSelectedSlide.id, layoutJson);
      
      setSlides(prev => prev.map(s => s.id === editSelectedSlide.id ? updated : s));
      setEditSelectedSlide(updated);
      
      await activateSlide(updated.id, updated.width, updated.height);
      await loadSlides();
      loadActiveSlide();
      if (editSelectedMatchId) {
        const slideData = await getSlidesByMatch(Number(editSelectedMatchId));
        setEditMatchSlides(slideData);
      }
      
      alert("Custom graphic slide layout saved and published live to stream!");
    } catch (err) {
      console.error("Failed to save and publish", err);
      alert("Failed to save and publish");
    }
  };

  const handleCopyLink = () => {
    const obsUrl = `${window.location.origin}/overlay?inningsId=${selectedInningsId}&tournamentName=${encodeURIComponent(tournamentName)}&obs=true`;
    navigator.clipboard.writeText(obsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** Populate the edit metadata form when a slide is selected */
  const startEditingSlide = (slide) => {
    setEditSelectedSlide(slide);
    setEditSlideTitle(slide.title || "");
    setEditSlideWidth(slide.width || 800);
    setEditSlideHeight(slide.height || 450);
    setEditSelectedMatchId(slide.matchId ? String(slide.matchId) : "");
    setEditSlideFile(null);
    setEditImagePreview(null);
    setIsEditingSlide(false);
  };

  /** Handle new image file selection — create a local preview */
  const handleEditImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditSlideFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => setEditImagePreview(evt.target.result);
    reader.readAsDataURL(file);
  };

  /** Save slide metadata changes (title, dimensions, and optionally new background image) */
  const handleUpdateSlide = async () => {
    if (!editSelectedSlide) return;
    if (!editSlideTitle.trim()) { alert("Slide title cannot be empty."); return; }
    try {
      setSavingSlide(true);
      const updated = await updateSlide(
        editSelectedSlide.id,
        editSlideTitle.trim(),
        editSlideWidth,
        editSlideHeight,
        editSlideFile || null,
        editSelectedMatchId ? Number(editSelectedMatchId) : null
      );
      setSlides(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditSelectedSlide(updated);
      setEditSlideFile(null);
      setEditImagePreview(null);
      setIsEditingSlide(false);
      alert("✅ Slide updated successfully!");
      await loadSlides();
      if (editSelectedMatchId) {
        const slideData = await getSlidesByMatch(Number(editSelectedMatchId));
        setEditMatchSlides(slideData);
      }
    } catch (err) {
      console.error("Failed to update slide", err);
      alert("Failed to save slide changes.");
    } finally {
      setSavingSlide(false);
    }
  };

  const goldGradient = "linear-gradient(to bottom, #d97706 0%, #fef08a 50%, #d97706 100%)";
  const whiteGradient = "linear-gradient(to bottom, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)";

  // Map team names to their uploaded database logos (from active teams state)
  const battingTeamName = score?.battingTeam || "";
  const bowlingTeamName = score?.bowlingTeam || "";

  const battingTeamObj = teams.find((t) => t.name === battingTeamName || t.shortName === battingTeamName);
  const bowlingTeamObj = teams.find((t) => t.name === bowlingTeamName || t.shortName === bowlingTeamName);

  const battingLogo = battingTeamObj?.id ? getFullUrl(battingTeamObj.logoUrl) || `${getApiBaseUrl()}/api/teams/${battingTeamObj.id}/logo` : null;
  const bowlingLogo = bowlingTeamObj?.id ? getFullUrl(bowlingTeamObj.logoUrl) || `${getApiBaseUrl()}/api/teams/${bowlingTeamObj.id}/logo` : null;

  // Safe formatting values for display
  const strikerName = score?.striker ? `★ ${score.striker}` : "—";
  const strikerRunsStr = score?.strikerRuns !== undefined ? `${score.strikerRuns}` : "0";
  const strikerBallsStr = score?.strikerBalls !== undefined ? `${score.strikerBalls}` : "0";

  const nonStrikerName = score?.nonStriker ? score.nonStriker : "—";
  const nonStrikerRunsStr = score?.nonStrikerRuns !== undefined ? `${score.nonStrikerRuns}` : "0";
  const nonStrikerBallsStr = score?.nonStrikerBalls !== undefined ? `${score.nonStrikerBalls}` : "0";

  const bowlerName = score?.bowler ? score.bowler : "—";
  const bowlerWicketsStr = score?.bowlerWickets !== undefined ? `${score.bowlerWickets}` : "0";
  const bowlerRunsStr = score?.bowlerRuns !== undefined ? `${score.bowlerRuns}` : "0";
  const bowlerOversStr = score?.bowlerOvers !== undefined ? `${score.bowlerOvers}` : "0.0";

  const overlayHtml = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1000px",
        height: "70px",
        fontFamily: "'Outfit', 'Arial Black', 'Trebuchet MS', sans-serif",
        textTransform: "uppercase",
        userSelect: "none"
      }}
    >
      {/* Left Accents & Batting Team Logo */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: "3px", height: "64px", background: goldGradient, marginRight: "4px", borderRadius: "1px" }} />
        <div style={{ width: "62px", height: "62px", border: "2px solid #eab308", background: "rgba(15,23,42,0.95)", display: "flex", alignItems: "center", justify: "center", borderRadius: "10px" }}>
          {battingLogo ? (
            <img src={battingLogo} alt="batting logo" style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px" }} />
          ) : (
            <span style={{ fontSize: "1.2rem", fontWeight: "900", color: "#facc15" }}>
              {battingTeamName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ width: "6px", height: "64px", background: goldGradient, marginLeft: "6px", borderRadius: "1px" }} />
        <div style={{ width: "12px", height: "64px", background: goldGradient, marginLeft: "4px", borderRadius: "2px" }} />
      </div>

      {/* Middle Double-Tier Scoreboard Ticker */}
      <div
        style={{
          width: "740px",
          display: "flex",
          flexDirection: "column",
          border: "3px solid #1e293b",
          boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
          overflow: "hidden",
          borderRadius: "4px",
          margin: "0 8px"
        }}
      >
        {/* Top Tier (Team Name, Score, Overs, vs Opponent, Tournament Label) */}
        <div style={{ display: "flex", height: "35px", alignItems: "center" }}>
          <div
            style={{
              width: "140px",
              height: "100%",
              background: "linear-gradient(to bottom, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
              color: "#000",
              fontWeight: "900",
              fontSize: "17px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.05em"
            }}
          >
            {battingTeamName}
          </div>

          <div
            style={{
              width: "115px",
              height: "100%",
              background: "#111827",
              color: "#fff",
              fontWeight: "900",
              fontSize: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {score ? `${score.runs}-${score.wickets}` : "0-0"}
          </div>

          <div
            style={{
              width: "75px",
              height: "100%",
              background: whiteGradient,
              color: "#000",
              fontWeight: "900",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {score?.overs || "0.0"}
          </div>

          <div
            style={{
              width: "250px",
              height: "100%",
              background: "linear-gradient(to bottom, #f97316 0%, #ea580c 100%)",
              color: "#fff",
              fontWeight: "800",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.05em"
            }}
          >
            v {bowlingTeamName}
          </div>

          <div
            style={{
              flex: 1,
              height: "100%",
              background: "#090d16",
              color: "#f8fafc",
              fontWeight: "800",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.08em",
              borderLeft: "2px solid #1e293b"
            }}
          >
            {tournamentName}
          </div>
        </div>

        {/* Bottom Tier (Batsman 1, Batsman 2, Bowler details) */}
        <div
          style={{
            height: "30px",
            background: whiteGradient,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            borderTop: "1px solid #94a3b8"
          }}
        >
          <div
            style={{
              flex: 1,
              textAlign: "left",
              color: "#334155",
              fontWeight: "800",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem"
            }}
          >
            <span style={{ color: "#64748b", fontWeight: "600" }}>{nonStrikerName}</span>
            <span style={{ color: "#0f172a", fontWeight: "900" }}>{nonStrikerRunsStr}</span>
            <span style={{ color: "#64748b", fontSize: "11px", fontWeight: "700" }}>({nonStrikerBallsStr})</span>
          </div>

          <div
            style={{
              flex: 1.2,
              textAlign: "center",
              color: "#0f172a",
              fontWeight: "900",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.25rem",
              background: "rgba(99, 102, 241, 0.08)",
              height: "100%",
              borderLeft: "1px solid #cbd5e1",
              borderRight: "1px solid #cbd5e1"
            }}
          >
            <span style={{ color: "#4f46e5" }}>{strikerName}</span>
            <span style={{ fontWeight: "950", fontSize: "15px" }}>{strikerRunsStr}</span>
            <span style={{ color: "#4f46e5", fontSize: "11px", fontWeight: "800" }}>({strikerBallsStr})</span>
          </div>

          <div
            style={{
              flex: 1,
              textAlign: "right",
              color: "#334155",
              fontWeight: "800",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.25rem"
            }}
          >
            <span style={{ color: "#64748b", fontWeight: "600" }}>{bowlerName}</span>
            <span style={{ color: "#e11d48", fontWeight: "900" }}>{bowlerWicketsStr}-{bowlerRunsStr}</span>
            <span style={{ color: "#64748b", fontSize: "11px", fontWeight: "700" }}>({bowlerOversStr})</span>
          </div>
        </div>
      </div>

      {/* Right Accents & Bowling Team Logo */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: "12px", height: "64px", background: goldGradient, marginRight: "4px", borderRadius: "2px" }} />
        <div style={{ width: "6px", height: "64px", background: goldGradient, marginRight: "6px", borderRadius: "1px" }} />
        <div style={{ width: "62px", height: "62px", border: "2px solid #eab308", background: "rgba(15,23,42,0.95)", display: "flex", alignItems: "center", justify: "center", borderRadius: "10px" }}>
          {bowlingLogo ? (
            <img src={bowlingLogo} alt="bowling logo" style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px" }} />
          ) : (
            <span style={{ fontSize: "1.2rem", fontWeight: "900", color: "#facc15" }}>
              {bowlingTeamName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ width: "3px", height: "64px", background: goldGradient, marginLeft: "4px", borderRadius: "1px" }} />
      </div>
    </div>
  );

  // In OBS mode: Render BOTH the transparent scorebar at bottom AND the active custom graphics slide centered
  if (obsMode) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "transparent", pointerEvents: "none" }}>
        
        {/* Custom Slide Graphic Overlay (Centered in Viewport) */}
        {renderedSlide && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: `${renderedSlide.width || 800}px`,
              height: `${renderedSlide.height || 450}px`,
              transition: "opacity 0.5s ease-in-out",
              opacity: isSlideVisible ? 1 : 0,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
              borderRadius: "16px",
              border: "4px solid #1e293b",
              backgroundColor: "rgba(15,23,42,0.9)",
              overflow: "hidden"
            }}
          >
            <img
              src={`${getApiBaseUrl()}/api/overlay-slides/${renderedSlide.id}/image`}
              alt={renderedSlide.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none"
              }}
            />
            {/* Render saved overlay elements */}
            {(() => {
              if (!renderedSlide.overlayLayout) return null;
              try {
                const parsed = JSON.parse(renderedSlide.overlayLayout);
                if (!Array.isArray(parsed)) return null;
                return parsed.map((el) => (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 100,
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    {el.type === "image" ? (
                      <img 
                        src={el.src} 
                        alt="" 
                        style={{ 
                          width: `${el.width || 60}px`, 
                          height: `${el.height || 60}px`, 
                          objectFit: "cover", 
                          borderRadius: el.borderRadius || "50%", 
                          border: "2px solid #ffffff",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                          display: "block"
                        }} 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        style={{
                          color: el.color || "#ffffff",
                          fontSize: `${el.fontSize || 18}px`,
                          fontWeight: el.fontWeight || "bold",
                          whiteSpace: "nowrap",
                          textShadow: "2px 2px 4px rgba(0, 0, 0, 0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, -1px 1px 0 #000"
                        }}
                      >
                        {el.text}
                      </div>
                    )}
                  </div>
                ));
              } catch (e) {
                console.error("Error parsing overlay layout on stream", e);
                return null;
              }
            })()}
          </div>
        )}

        {/* Scorebar Banner at the Bottom */}
        <div style={{ position: "fixed", bottom: "40px", left: "50%", transform: "translateX(-50%)" }}>
          {overlayHtml}
        </div>

      </div>
    );
  }

  // In Config Mode: Render generator controls, instructions, slides manager, and checkerboard overlay preview
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        
        <div style={{ marginBottom: "2rem" }}>
          <h1>🎦 Stream Slides Manager</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Create, edit, and control custom graphic title card slides and template presentation slates directly on your live stream.
          </p>
        </div>

        {/* 2. Custom Title Cards / Graphic Slides Manager */}
        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🎬 Custom Graphic Title Cards
          </h2>

          {/* Sub-tab selection */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <button
              className="btn"
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.9rem",
                fontWeight: "700",
                backgroundColor: activeTab === "add" ? "var(--primary)" : "transparent",
                color: activeTab === "add" ? "#fff" : "var(--text-secondary)",
                border: activeTab === "add" ? "none" : "1px solid var(--border-light)",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onClick={() => setActiveTab("add")}
            >
              ➕ Add Slides
            </button>
            <button
              className="btn"
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.9rem",
                fontWeight: "700",
                backgroundColor: activeTab === "edit" ? "var(--primary)" : "transparent",
                color: activeTab === "edit" ? "#fff" : "var(--text-secondary)",
                border: activeTab === "edit" ? "none" : "1px solid var(--border-light)",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onClick={() => setActiveTab("edit")}
            >
              ✏️ Edit Slides
            </button>
          </div>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            {activeTab === "add" 
              ? "Upload custom image slides or generate graphic backgrounds from pre-seeded templates, adjust dimensions, and project them live on the stream."
              : "Select a match and slide background template, drag-and-drop match player labels, customize details, and publish updated slide graphic cards live on screen."
            }
          </p>

          {activeTab === "edit" ? (
            !editSelectedMatchId ? (
              <div 
                className="premium-card" 
                style={{ 
                  margin: "2rem auto", 
                  maxWidth: "500px", 
                  padding: "2.5rem 2rem", 
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  border: "1px solid var(--border-light)",
                  borderRadius: "16px",
                  boxShadow: "var(--shadow-lg)"
                }}
              >
                <div style={{ fontSize: "3rem" }}>🗂️</div>
                <div>
                  <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Select Match to Edit Slides</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.5" }}>
                    Select a match to access its custom graphics, templates, and overlay slides. All associated roster players will be imported for editing.
                  </p>
                </div>

                <div className="form-group" style={{ textAlign: "left", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Choose Match</label>
                  <select
                    className="form-select"
                    value={editSelectedMatchId}
                    onChange={(e) => setEditSelectedMatchId(e.target.value)}
                    style={{ fontSize: "1rem", padding: "0.75rem" }}
                  >
                    <option value="">Choose Match...</option>
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.teamA?.name} vs {m.teamB?.name} ({m.venue})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0.75rem 1.25rem", backgroundColor: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border-light)", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>🏏</span>
                    <div>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "bold", color: "var(--text-secondary)", display: "block" }}>Active Match Context</span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {(() => {
                          const m = matches.find(item => item.id === Number(editSelectedMatchId));
                          return m ? `${m.teamA?.name} vs ${m.teamB?.name} (${m.venue})` : "Selected Match";
                        })()}
                      </strong>
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setEditSelectedMatchId("")}
                    style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
                  >
                    ↩️ Change Match
                  </button>
                </div>

                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", width: "100%" }}>
                  
                  {/* Column 1: PPT-style vertical slide outline panel */}
                  <div 
                    style={{ 
                      flex: "0 0 220px", 
                      borderRight: "1px solid var(--border-light)", 
                      paddingRight: "1rem", 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "0.75rem",
                      maxHeight: "650px",
                      overflowY: "auto"
                    }}
                  >
                    <h3 style={{ fontSize: "0.9rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem 0" }}>
                      🎦 Slides Outline
                    </h3>
                    {slides.length === 0 ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "1rem", textAlign: "center", border: "1px dashed var(--border-light)", borderRadius: "8px" }}>
                        No slides created yet. Add some slides first!
                      </div>
                    ) : (
                      slides.map((s, index) => {
                        const isEditing = editSelectedSlide && editSelectedSlide.id === s.id;
                        const isLive = activeSlide && activeSlide.id === s.id;
                        
                        let slideElements = [];
                        if (s.overlayLayout) {
                          try {
                            slideElements = JSON.parse(s.overlayLayout);
                            if (!Array.isArray(slideElements)) slideElements = [];
                          } catch (e) {
                            slideElements = [];
                          }
                        }

                        return (
                          <div
                            key={s.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              width: "100%"
                            }}
                          >
                            <span style={{ fontSize: "0.85rem", fontWeight: "700", color: isEditing ? "var(--primary)" : "var(--text-secondary)", minWidth: "16px" }}>
                              {index + 1}
                            </span>
                            <div
                              onClick={() => startEditingSlide(s)}
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                padding: "6px",
                                borderRadius: "8px",
                                border: isEditing 
                                  ? "2px solid var(--primary)" 
                                  : isLive 
                                  ? "2px solid #10b981" 
                                  : "1px solid var(--border-light)",
                                backgroundColor: isEditing 
                                  ? "rgba(99, 102, 241, 0.04)" 
                                  : "var(--bg-card)",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                position: "relative",
                                overflow: "hidden"
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "120px" }}>
                                  {s.title}
                                </span>
                                {isLive && <span style={{ color: "#10b981" }}>LIVE</span>}
                              </div>
                              {/* Slide Thumbnail */}
                              <div style={{ 
                                width: "100%", 
                                height: "90px", 
                                borderRadius: "4px", 
                                overflow: "hidden", 
                                backgroundColor: "rgba(0,0,0,0.05)", 
                                border: "1px solid var(--border-light)",
                                position: "relative"
                              }}>
                                <img 
                                  src={`${getApiBaseUrl()}/api/overlay-slides/${s.id}/image`} 
                                  alt="" 
                                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                />
                                {/* Overlay elements preview inside thumbnail */}
                                {slideElements.map((el) => (
                                  <div
                                    key={el.id}
                                    style={{
                                      position: "absolute",
                                      left: `${el.x}%`,
                                      top: `${el.y}%`,
                                      transform: "translate(-50%, -50%)",
                                      pointerEvents: "none",
                                      zIndex: 5
                                    }}
                                  >
                                    {el.type === "image" ? (
                                      <div 
                                        style={{
                                          width: `${(el.width || 60) * 0.12}px`,
                                          height: `${(el.height || 60) * 0.12}px`,
                                          borderRadius: el.borderRadius || "50%",
                                          border: "0.5px solid #ffffff",
                                          backgroundColor: "#cbd5e1"
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          color: el.color || "#ffffff",
                                          fontSize: `${(el.fontSize || 18) * 0.22}px`,
                                          fontWeight: "bold",
                                          whiteSpace: "nowrap",
                                          lineHeight: 1,
                                          textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
                                        }}
                                      >
                                        {el.text}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Column 2: Designer Canvas Workspace */}
                  <div style={{ flex: "2 1 480px", borderRight: "1px solid var(--border-light)", paddingRight: "1rem" }}>
                    {editSelectedSlide ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "bold" }}>Designer Canvas</span>
                            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>{editSelectedSlide.title}</h3>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                              onClick={handleSaveLayout}
                            >
                              💾 Save Draft
                            </button>
                            <button
                              className="btn"
                              style={{
                                padding: "0.4rem 0.8rem",
                                fontSize: "0.8rem",
                                fontWeight: "700",
                                backgroundColor: "#10b981",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer"
                              }}
                              onClick={handleSaveAndPublish}
                            >
                              🚀 Save & Publish Live
                            </button>
                          </div>
                        </div>

                        {/* Interactive Canvas container */}
                        <div
                          style={{
                            width: "100%",
                            paddingTop: `${(editSelectedSlide.height / editSelectedSlide.width) * 100}%`,
                            position: "relative",
                            backgroundColor: "rgba(0, 0, 0, 0.2)",
                            border: "2px solid var(--primary)",
                            borderRadius: "12px",
                            overflow: "hidden"
                          }}
                        >
                          <img
                            src={`${getApiBaseUrl()}/api/overlay-slides/${editSelectedSlide.id}/image`}
                            alt={editSelectedSlide.title}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              pointerEvents: "none"
                            }}
                          />

                          {overlayElements.map((el) => {
                            const isSelected = selectedElementId === el.id;
                            return (
                              <div
                                key={el.id}
                                onPointerDown={(e) => {
                                  handlePointerDown(e, el.id);
                                  setSelectedElementId(el.id);
                                }}
                                style={{
                                  position: "absolute",
                                  left: `${el.x}%`,
                                  top: `${el.y}%`,
                                  transform: "translate(-50%, -50%)",
                                  cursor: "move",
                                  padding: "4px 8px",
                                  border: isSelected ? "1px dashed #ef4444" : "1px solid transparent",
                                  backgroundColor: isSelected ? "rgba(239, 68, 68, 0.15)" : "transparent",
                                  borderRadius: "4px",
                                  userSelect: "none",
                                  zIndex: 100,
                                  fontFamily: "'Outfit', sans-serif"
                                }}
                              >
                                {el.type === "image" ? (
                                  <img 
                                    src={el.src} 
                                    alt="" 
                                    style={{ 
                                      width: `${el.width || 60}px`, 
                                      height: `${el.height || 60}px`, 
                                      objectFit: "cover", 
                                      borderRadius: el.borderRadius || "50%", 
                                      border: "2px solid #ffffff",
                                      boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                                      display: "block"
                                    }} 
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      color: el.color || "#ffffff",
                                      fontSize: `${el.fontSize || 18}px`,
                                      fontWeight: el.fontWeight || "bold",
                                      whiteSpace: "nowrap",
                                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, -1px 1px 0 #000"
                                    }}
                                  >
                                    {el.text}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          💡 <b>How to design:</b> Drag elements on the graphic background above to place them. 
                          Click on an element to select it and edit its properties. Click <b>Save & Publish Live</b> to project it live.
                        </p>

                        {/* Canva-style properties editor */}
                        {selectedElementId && (
                          <div 
                            className="premium-card" 
                            style={{ 
                              padding: "1rem", 
                              display: "flex", 
                              gap: "1rem", 
                              alignItems: "center", 
                              flexWrap: "wrap",
                              border: "1px solid var(--primary)",
                              backgroundColor: "rgba(99, 102, 241, 0.03)",
                              marginTop: "0.5rem"
                            }}
                          >
                            <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--primary)", width: "100%" }}>⚙️ Canva Element Options</h4>
                            
                            {(() => {
                              const el = overlayElements.find(item => item.id === selectedElementId);
                              if (!el) return null;
                              if (el.type === "image") {
                                return (
                                  <>
                                    <div className="form-group" style={{ flex: 1, minWidth: "120px", marginBottom: 0 }}>
                                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Photo Size (px)</label>
                                      <input
                                        type="number"
                                        className="form-input"
                                        style={{ padding: "0.4rem" }}
                                        min="20"
                                        max="500"
                                        value={el.width || 60}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setOverlayElements(prev => prev.map(item => item.id === el.id ? { ...item, width: val, height: val } : item));
                                        }}
                                      />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, minWidth: "120px", marginBottom: 0 }}>
                                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Shape</label>
                                      <select
                                        className="form-select"
                                        style={{ padding: "0.4rem" }}
                                        value={el.borderRadius || "50%"}
                                        onChange={(e) => updateElementStyle(el.id, "borderRadius", e.target.value)}
                                      >
                                        <option value="50%">Circle</option>
                                        <option value="8px">Rounded Square</option>
                                        <option value="0%">Square</option>
                                      </select>
                                    </div>
                                    <button
                                      className="btn btn-danger"
                                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", alignSelf: "flex-end" }}
                                      onClick={() => deleteElement(selectedElementId)}
                                    >
                                      🗑️ Remove Photo
                                    </button>
                                  </>
                                );
                              }
                              return (
                                <>
                                  <div className="form-group" style={{ flex: 2, minWidth: "150px", marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Text</label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      style={{ padding: "0.4rem" }}
                                      value={el.text}
                                      onChange={(e) => updateElementText(selectedElementId, e.target.value)}
                                    />
                                  </div>

                                  <div className="form-group" style={{ flex: 1, minWidth: "80px", marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Size (px)</label>
                                    <input
                                      type="number"
                                      className="form-input"
                                      style={{ padding: "0.4rem" }}
                                      min="10"
                                      max="72"
                                      value={el.fontSize || 18}
                                      onChange={(e) => updateElementStyle(selectedElementId, "fontSize", Number(e.target.value))}
                                    />
                                  </div>

                                  <div className="form-group" style={{ flex: 1, minWidth: "100px", marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Color</label>
                                    <select
                                      className="form-select"
                                      style={{ padding: "0.4rem" }}
                                      value={el.color || "#ffffff"}
                                      onChange={(e) => updateElementStyle(selectedElementId, "color", e.target.value)}
                                    >
                                      <option value="#ffffff">White</option>
                                      <option value="#facc15">Yellow</option>
                                      <option value="#38bdf8">Sky Blue</option>
                                      <option value="#4ade80">Green</option>
                                      <option value="#000000">Black</option>
                                      <option value="#f87171">Red</option>
                                    </select>
                                  </div>

                                  <div className="form-group" style={{ flex: 1, minWidth: "100px", marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Font Weight</label>
                                    <select
                                      className="form-select"
                                      style={{ padding: "0.4rem" }}
                                      value={el.fontWeight || "bold"}
                                      onChange={(e) => updateElementStyle(selectedElementId, "fontWeight", e.target.value)}
                                    >
                                      <option value="bold">Bold</option>
                                      <option value="normal">Regular</option>
                                    </select>
                                  </div>

                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", alignSelf: "flex-end" }}
                                    onClick={() => deleteElement(selectedElementId)}
                                  >
                                    🗑️ Remove Text
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "350px",
                        border: "2px dashed var(--border-light)",
                        borderRadius: "12px",
                        color: "var(--text-muted)",
                        padding: "2rem",
                        textAlign: "center"
                      }}>
                        <span style={{ fontSize: "3rem", marginBottom: "1rem" }}>✏️</span>
                        <h3>Slide Canvas Editor</h3>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: "1 1 290px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="premium-card" style={{ padding: "1.25rem" }}>
                      <h4 style={{ fontSize: "0.95rem", color: "var(--primary)", marginBottom: "1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                        🏟️ Team Logos
                      </h4>
                      {(() => {
                        const selectedMatchObj = matches.find(m => m.id === Number(editSelectedMatchId));
                        const teamA = selectedMatchObj?.teamA;
                        const teamB = selectedMatchObj?.teamB;
                        if (!teamA && !teamB) {
                          return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>No team logos found.</div>;
                        }
                        return (
                          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center" }}>
                            {teamA && (
                              <div 
                                onClick={() => editSelectedSlide && addTeamLogoElement(teamA)}
                                style={{ cursor: editSelectedSlide ? "pointer" : "not-allowed", textAlign: "center" }}
                                title={editSelectedSlide ? `Import ${teamA.name} Logo` : "Select a slide first"}
                              >
                                <img 
                                  src={`${getApiBaseUrl()}/api/teams/${teamA.id}/logo`} 
                                  alt={teamA.name} 
                                  style={{ width: "70px", height: "70px", objectFit: "contain", borderRadius: "8px", border: "2px solid var(--border-light)", padding: "4px", backgroundColor: "#fff", boxShadow: "var(--shadow-sm)" }}
                                />
                                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: "700" }}>{teamA.name}</div>
                              </div>
                            )}
                            {teamB && (
                              <div 
                                onClick={() => editSelectedSlide && addTeamLogoElement(teamB)}
                                style={{ cursor: editSelectedSlide ? "pointer" : "not-allowed", textAlign: "center" }}
                                title={editSelectedSlide ? `Import ${teamB.name} Logo` : "Select a slide first"}
                              >
                                <img 
                                  src={`${getApiBaseUrl()}/api/teams/${teamB.id}/logo`} 
                                  alt={teamB.name} 
                                  style={{ width: "70px", height: "70px", objectFit: "contain", borderRadius: "8px", border: "2px solid var(--border-light)", padding: "4px", backgroundColor: "#fff", boxShadow: "var(--shadow-sm)" }}
                                />
                                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: "700" }}>{teamB.name}</div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="premium-card" style={{ padding: "1.25rem" }}>
                      <h4 style={{ fontSize: "0.95rem", color: "var(--primary)", marginBottom: "0.75rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                        👤 Player Photos
                      </h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                        Click a photo to import it onto the slide layout.
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: "0.75rem", maxHeight: "350px", overflowY: "auto", paddingRight: "0.5rem" }}>
                        {matchPlayers.length === 0 ? (
                          <div style={{ gridColumn: "1/-1", padding: "1rem", textAlign: "center", border: "1px dashed var(--border-light)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            No players found in this match roster.
                          </div>
                        ) : (
                          matchPlayers.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => editSelectedSlide && addPlayerPhotoElement(player)}
                              style={{ 
                                cursor: editSelectedSlide ? "pointer" : "not-allowed",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center"
                              }}
                              title={editSelectedSlide ? `Import ${player.name} (${player.teamName})` : "Select a slide first"}
                            >
                              <img 
                                src={`${getApiBaseUrl()}/api/players/${player.id}/photo`} 
                                alt={player.name} 
                                style={{ width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-light)", boxShadow: "var(--shadow-sm)" }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : (
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", width: "100%" }}>
              {/* Left Column: Import from Computer Form */}
              <div style={{ flex: "1 1 380px", borderRight: "1px solid var(--border-light)", paddingRight: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--primary)" }}>
                  📁 Import Slide from Computer
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                  Select an image graphic file from your computer (PNG/JPG) to import it as a slide.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: "700" }}>Associate with Match (Optional)</label>
                    <select
                      className="form-select"
                      value={createSelectedMatchId}
                      onChange={(e) => setCreateSelectedMatchId(e.target.value)}
                    >
                      <option value="">None / Global (Generic)</option>
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.teamA?.name} vs {m.teamB?.name} ({m.venue})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Slide Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. RCB vs CSK Lineup Card"
                    value={newSlideTitle}
                    onChange={(e) => setNewSlideTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: "700" }}>Width (px)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newSlideWidth}
                      onChange={(e) => setNewSlideWidth(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: "700" }}>Height (px)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newSlideHeight}
                      onChange={(e) => setNewSlideHeight(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700" }}>Select Image File</label>
                  <input
                    type="file"
                    id="slide-file-input"
                    className="form-input"
                    style={{ padding: "0.4rem" }}
                    accept="image/*"
                    onChange={(e) => setNewSlideFile(e.target.files[0])}
                  />
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", padding: "0.85rem", marginTop: "0.5rem", fontWeight: "700" }} 
                  onClick={handleCreateSlide}
                  disabled={uploadingSlide}
                >
                  {uploadingSlide ? "Importing Slide..." : "💾 Import & Create Slide"}
                </button>
              </div>
            </div>

                {/* Right Column: All Added Slides Deck */}
                <div style={{ flex: "2 1 500px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <h3 style={{ fontSize: "1.05rem", color: "var(--primary)", margin: 0 }}>🗂️ All Added Slides</h3>
                    {activeSlide && (
                      <button className="btn btn-danger" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }} onClick={handleDeactivateAll}>
                        🚫 Clear Active Graphic
                      </button>
                    )}
                  </div>

                  {slides.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", border: "2px dashed var(--border-light)", borderRadius: "12px", color: "var(--text-muted)" }}>
                      No slide graphics configured yet. Generate templates or upload custom slides on the left!
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem", maxHeight: "650px", overflowY: "auto", paddingRight: "0.5rem" }}>
                      {slides.map((slide) => {
                        const isActive = activeSlide && activeSlide.id === slide.id;
                        return (
                          <div 
                            key={slide.id} 
                            style={{ 
                              display: "flex", 
                              flexDirection: "column",
                              gap: "0.75rem", 
                              padding: "1rem", 
                              border: isActive 
                                ? "2px solid #10b981" 
                                : "1px solid var(--border-light)", 
                              borderRadius: "12px", 
                              backgroundColor: isActive 
                                ? "rgba(16, 185, 129, 0.05)" 
                                : "var(--bg-card)",
                              position: "relative",
                              transition: "all 0.2s ease",
                              boxShadow: isActive ? "0 4px 12px rgba(16, 185, 129, 0.15)" : "none"
                            }}
                          >
                            {/* Slide Thumbnail */}
                            <div style={{ width: "100%", height: "130px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border-light)", backgroundColor: "rgba(0,0,0,0.05)", position: "relative" }}>
                              <img 
                                src={`${getApiBaseUrl()}/api/overlay-slides/${slide.id}/image`} 
                                alt={slide.title} 
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                              {isActive && (
                                <span style={{ position: "absolute", top: "8px", left: "8px", backgroundColor: "#10b981", color: "#fff", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", fontWeight: "800", letterSpacing: "0.05em" }}>
                                  LIVE
                                </span>
                              )}
                            </div>
                            
                            {/* Title & Dimension info */}
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>{slide.title}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                Size: {slide.width}x{slide.height}px
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                                {slide.matchId 
                                  ? `Match: ${matches.find(m => m.id === slide.matchId) 
                                      ? `${matches.find(m => m.id === slide.matchId).teamA?.name} vs ${matches.find(m => m.id === slide.matchId).teamB?.name}` 
                                      : `Match ID: ${slide.matchId}`}`
                                  : "Global Slide"
                                }
                              </div>
                            </div>

                            {/* Actions on the card */}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem" }}>
                              {isActive ? (
                                <button
                                  className="btn"
                                  style={{
                                    flex: 1,
                                    padding: "0.4rem 0.75rem",
                                    backgroundColor: "#ef4444",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                  }}
                                  onClick={handleDeactivateAll}
                                >
                                  🚫 Clear
                                </button>
                              ) : (
                                <button
                                  className="btn"
                                  style={{
                                    flex: 1,
                                    padding: "0.4rem 0.75rem",
                                    backgroundColor: "#10b981",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                  }}
                                  onClick={() => handleActivateSlide(slide.id, slide.width, slide.height)}
                                >
                                  🚀 Go Live
                                </button>
                              )}

                              <button
                                className="btn btn-danger"
                                style={{
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  fontWeight: "700",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem"
                                }}
                                onClick={() => handleDeleteSlide(slide.id)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          }
        </div>

        {/* 3. Live Ticker & Slides Viewport Preview */}
        {selectedInningsId && (
          <div className="premium-card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>👁️ Live Viewport Preview</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Renders both scorebar and active card graphic layout inside a simulated 1920x1080 transparent viewport.
            </p>
            
            <div 
              style={{ 
                height: "350px", 
                borderRadius: "12px", 
                backgroundColor: "#1e293b",
                backgroundImage: "radial-gradient(#334155 1px, transparent 0)",
                backgroundSize: "24px 24px",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                border: "1px solid var(--border-light)"
              }}
            >
              {/* Overlay preview container (centered card slide) */}
              {renderedSlide && (
                <div
                  style={{
                    position: "absolute",
                    top: "40%",
                    left: "50%",
                    transform: "translate(-50%, -50%) scale(0.4)", // scaled down to fit preview
                    width: `${renderedSlide.width || 800}px`,
                    height: `${renderedSlide.height || 450}px`,
                    transition: "opacity 0.5s ease-in-out",
                    opacity: isSlideVisible ? 1 : 0,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
                    borderRadius: "16px",
                    border: "4px solid #1e293b",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    overflow: "hidden"
                  }}
                >
                  <img
                    src={`${getApiBaseUrl()}/api/overlay-slides/${renderedSlide.id}/image`}
                    alt={renderedSlide.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      pointerEvents: "none"
                    }}
                  />
                  {/* Render saved overlay elements in live viewport preview */}
                  {(() => {
                    if (!renderedSlide.overlayLayout) return null;
                    try {
                      const parsed = JSON.parse(renderedSlide.overlayLayout);
                      if (!Array.isArray(parsed)) return null;
                      return parsed.map((el) => (
                        <div
                          key={el.id}
                          style={{
                            position: "absolute",
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            transform: "translate(-50%, -50%)",
                            zIndex: 100,
                            fontFamily: "'Outfit', sans-serif"
                          }}
                        >
                          {el.type === "image" ? (
                            <img 
                              src={el.src} 
                              alt="" 
                              style={{ 
                                width: `${el.width || 60}px`, 
                                height: `${el.height || 60}px`, 
                                objectFit: "cover", 
                                borderRadius: el.borderRadius || "50%", 
                                border: "1px solid #ffffff",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                                display: "block"
                              }} 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div
                              style={{
                                color: el.color || "#ffffff",
                                fontSize: `${el.fontSize || 18}px`,
                                fontWeight: el.fontWeight || "bold",
                                whiteSpace: "nowrap",
                                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, -1px 1px 0 #000"
                              }}
                            >
                              {el.text}
                            </div>
                          )}
                        </div>
                      ));
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              )}

              {/* Overlay score bar preview container (positioned at bottom, scaled to fit) */}
              <div style={{ position: "absolute", bottom: "15px", transform: "scale(0.8)" }}>
                {score ? overlayHtml : <span style={{ color: "#94a3b8", fontWeight: "600" }}>Connecting to live score feed...</span>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}