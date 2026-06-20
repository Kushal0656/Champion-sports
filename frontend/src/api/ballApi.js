import axiosClient from "./axiosClient";

export const addBall = async (ball) => {
  const response = await axiosClient.post(
    "/balls",
    ball
  );

  return response.data;
};

export const getBallsByInnings = async (
  inningsId
) => {
  const response = await axiosClient.get(
    `/balls/innings/${inningsId}`
  );

  return response.data;
};

export const undoLastBall = async (inningsId) => {
  const response = await axiosClient.delete(
    `/balls/undo/${inningsId}`
  );

  return response.data;
};