import axiosClient from "./axiosClient";

export const getLiveScore = async (
  inningsId
) => {

  const response =
    await axiosClient.get(
      `/live-score/${inningsId}`
    );

  return response.data;
};

export const getScorecardState = async (matchId) => {
  const response = await axiosClient.get(`/scoring/${matchId}/state`);
  return response.data;
};