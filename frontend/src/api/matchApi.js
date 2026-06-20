import axiosClient from "./axiosClient";

export const getMatches = async () => {
  const response = await axiosClient.get(
    "/matches"
  );

  return response.data;
};

export const getMatchById = async (
  id
) => {
  const response = await axiosClient.get(
    `/matches/${id}`
  );

  return response.data;
};

export const createMatch = async (
  match
) => {
  const response = await axiosClient.post(
    "/matches",
    match
  );

  return response.data;
};

export const updateMatch = async (
  id,
  match
) => {
  const response = await axiosClient.put(
    `/matches/${id}`,
    match
  );

  return response.data;
};

export const completeMatch = async (
  matchId
) => {
  const response = await axiosClient.post(
    `/matches/${matchId}/complete`
  );

  return response.data;
};

export const deleteMatch = async (
  id
) => {
  const response = await axiosClient.delete(
    `/matches/${id}`
  );

  return response.data;
};