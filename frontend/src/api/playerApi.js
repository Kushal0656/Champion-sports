import axiosClient from "./axiosClient";

export const getPlayers = async (params = {}) => {
  const response = await axiosClient.get("/players", { params });
  return response.data;
};

export const createPlayer = async (player) => {
  const response = await axiosClient.post(
    "/players",
    player
  );
  return response.data;
};

export const uploadPlayerPhoto = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post(`/players/${id}/photo`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const assignPlayerTeam = async (playerId, teamId) => {
  const response = await axiosClient.put(`/players/${playerId}/assign-team/${teamId}`);
  return response.data;
};

export const removePlayerTeam = async (playerId) => {
  const response = await axiosClient.put(`/players/${playerId}/remove-team`);
  return response.data;
};

export const deletePlayer = async (id) => {
  const response = await axiosClient.delete(`/players/${id}`);
  return response.data;
};