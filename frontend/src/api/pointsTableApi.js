import axiosClient from "./axiosClient";

export const getPointsTable = async (
  tournamentId
) => {
  const response = await axiosClient.get(
    `/points-table/${tournamentId}`
  );

  return response.data;
};