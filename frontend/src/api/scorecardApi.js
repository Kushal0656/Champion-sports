import axiosClient from "./axiosClient";

export const getScorecard = async (
  inningsId
) => {

  const response =
    await axiosClient.get(
      `/scorecard/${inningsId}`
    );

  return response.data;
};