import axiosClient from "./axiosClient";

export const getBowlingStats = async (
  inningsId
) => {
  const response = await axiosClient.get(
    `/bowling-stats/${inningsId}`
  );

  return response.data;
};