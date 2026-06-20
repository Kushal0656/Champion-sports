import axiosClient from "./axiosClient";

export const getInnings = async () => {
  const response = await axiosClient.get("/innings");
  return response.data;
};

export const getInningsById = async (id) => {
  const response = await axiosClient.get(`/innings/${id}`);
  return response.data;
};

export const createInnings = async (innings) => {
  const response = await axiosClient.post(
    "/innings",
    innings
  );
  return response.data;
};

export const updateInningsPersonnel = async (id, strikerId, nonStrikerId, bowlerId) => {
  const response = await axiosClient.put(`/innings/${id}/personnel`, null, {
    params: {
      strikerId: strikerId || null,
      nonStrikerId: nonStrikerId || null,
      bowlerId: bowlerId || null,
    },
  });
  return response.data;
};