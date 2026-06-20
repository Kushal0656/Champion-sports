import axiosClient from "./axiosClient";

export const getAssets = async (type = "") => {
  const url = type ? `/overlay-studio/assets?type=${type}` : "/overlay-studio/assets";
  const response = await axiosClient.get(url);
  return response.data;
};

export const uploadAsset = async (name, type, file) => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("type", type);
  formData.append("file", file);

  const response = await axiosClient.post("/overlay-studio/assets", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteAsset = async (id) => {
  const response = await axiosClient.delete(`/overlay-studio/assets/${id}`);
  return response.data;
};

export const getScenes = async () => {
  const response = await axiosClient.get("/overlay-studio/scenes");
  return response.data;
};

export const getActiveScene = async () => {
  const response = await axiosClient.get("/overlay-studio/scenes/active");
  return response.data;
};

export const createScene = async (id, name) => {
  const params = new URLSearchParams();
  params.append("id", id);
  params.append("name", name);
  const response = await axiosClient.post("/overlay-studio/scenes", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};

export const deleteScene = async (id) => {
  const response = await axiosClient.delete(`/overlay-studio/scenes/${id}`);
  return response.data;
};

export const updateDraftLayout = async (id, layout) => {
  const params = new URLSearchParams();
  params.append("layout", layout);
  const response = await axiosClient.put(`/overlay-studio/scenes/${id}/draft`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};

export const publishScene = async (id, matchId = 0) => {
  const response = await axiosClient.post(`/overlay-studio/scenes/${id}/publish?matchId=${matchId}`);
  return response.data;
};

export const activateScene = async (id, matchId = 0) => {
  const response = await axiosClient.post(`/overlay-studio/scenes/${id}/activate?matchId=${matchId}`);
  return response.data;
};

export const triggerAnimation = async (animationType, matchId = 0, meta = "") => {
  const response = await axiosClient.post(
    `/overlay-studio/scenes/trigger-animation?animationType=${animationType}&matchId=${matchId}&meta=${encodeURIComponent(meta)}`
  );
  return response.data;
};

export const getTemplates = async () => {
  const response = await axiosClient.get("/overlay-studio/templates");
  return response.data;
};

export const saveTemplate = async (name, layoutJson) => {
  const params = new URLSearchParams();
  params.append("name", name);
  params.append("layoutJson", layoutJson);
  const response = await axiosClient.post("/overlay-studio/templates", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await axiosClient.delete(`/overlay-studio/templates/${id}`);
  return response.data;
};

export const uploadSceneVideo = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post(`/overlay-studio/scenes/${id}/video`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteSceneVideo = async (id) => {
  const response = await axiosClient.delete(`/overlay-studio/scenes/${id}/video`);
  return response.data;
};

export const updateSceneName = async (id, name) => {
  const params = new URLSearchParams();
  params.append("name", name);
  const response = await axiosClient.put(`/overlay-studio/scenes/${id}/name`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};

export const importSlidesForMatch = async (matchId) => {
  const response = await axiosClient.post(`/overlay-studio/scenes/import-slides?matchId=${matchId}`);
  return response.data;
};
