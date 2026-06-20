import axiosClient from "./axiosClient";

export const getSlides = async () => {
  const response = await axiosClient.get("/overlay-slides");
  return response.data;
};

export const createSlide = async (title, width, height, file, matchId = null) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("width", width);
  formData.append("height", height);
  if (matchId !== null && matchId !== undefined) formData.append("matchId", matchId);
  formData.append("file", file);

  const response = await axiosClient.post("/overlay-slides", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/** Full update: title, dimensions, and optionally a new background image */
export const updateSlide = async (id, title, width, height, file = null, matchId = null) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("width", width);
  formData.append("height", height);
  if (matchId !== null && matchId !== undefined) formData.append("matchId", matchId);
  if (file) formData.append("file", file);

  const response = await axiosClient.put(`/overlay-slides/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/** Metadata-only update: title and dimensions, no image replacement */
export const updateSlideTitle = async (id, title, width, height, matchId = null) => {
  const params = new URLSearchParams();
  params.append("title", title);
  params.append("width", width);
  params.append("height", height);
  if (matchId !== null && matchId !== undefined) params.append("matchId", matchId);
  const response = await axiosClient.put(`/overlay-slides/${id}/title`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};

export const getSlidesByMatch = async (matchId) => {
  const response = await axiosClient.get(`/overlay-slides/match/${matchId}`);
  return response.data;
};

export const activateSlide = async (id, width, height) => {
  let url = `/overlay-slides/${id}/activate`;
  const params = [];
  if (width !== undefined && width !== null) params.push(`width=${width}`);
  if (height !== undefined && height !== null) params.push(`height=${height}`);
  if (params.length > 0) url += `?${params.join("&")}`;

  const response = await axiosClient.post(url);
  return response.data;
};

export const deactivateAllSlides = async () => {
  const response = await axiosClient.post("/overlay-slides/deactivate");
  return response.data;
};

export const getActiveSlide = async () => {
  const response = await axiosClient.get("/overlay-slides/active");
  return response.data;
};

export const deleteSlide = async (id) => {
  const response = await axiosClient.delete(`/overlay-slides/${id}`);
  return response.data;
};

export const saveSlideLayout = async (id, layout) => {
  const params = new URLSearchParams();
  params.append("layout", layout);
  const response = await axiosClient.post(`/overlay-slides/${id}/layout`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};

/** Save the full OBS canvas layout JSON */
export const saveCanvasLayout = async (id, layout) => {
  const params = new URLSearchParams();
  params.append("layout", layout);
  const response = await axiosClient.post(`/overlay-slides/${id}/canvas-layout`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};
