import axiosClient from "./axiosClient";

export const getTeams = async () => {
  const response = await axiosClient.get("/teams");
  return response.data;
};
export const createTeam = async (name, logoFile, teamLeader) => {
  const formData = new FormData();
  formData.append("name", name);
  if (teamLeader) formData.append("teamLeader", teamLeader);
  if (logoFile) formData.append("logo", logoFile);
  const response = await axiosClient.post("/teams", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateTeam = async (id, teamData) => {
  const response = await axiosClient.put(`/teams/${id}`, teamData);
  return response.data;
};

export const uploadTeamLogo = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post(`/teams/${id}/logo`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteTeam = async (id) => {
  const response = await axiosClient.delete(`/teams/${id}`);
  return response.data;
};