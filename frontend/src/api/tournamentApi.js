import axiosClient from "./axiosClient";

export const getTournaments = async () => {
  const response = await axiosClient.get("/tournaments");
  return response.data;
};

export const createTournament = async (tournament) => {
  const response = await axiosClient.post(
    "/tournaments",
    tournament
  );

  return response.data;
};