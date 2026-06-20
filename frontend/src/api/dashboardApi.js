import axiosClient from "./axiosClient";

export const getDashboard = async () => {
  const response = await axiosClient.get(
    "/dashboard"
  );

  return response.data;
};