import axiosClient from "./axiosClient";

export const getBattingStats = async (
  inningsId
) => {
  const response = await axiosClient.get(
    `/batting-stats/${inningsId}`
  );

  return response.data;
};