import axiosClient from "./axiosClient";

export const getContentByKey = async (keyName) => {
  try {
    const response = await axiosClient.get(`/content/key/${keyName}`);
    return response.data;
  } catch (error) {
    console.error("Failed to get content key", error);
    return null;
  }
};

export const updateContentByKey = async (keyName, value) => {
  const response = await axiosClient.post(`/content/key/${keyName}?value=${encodeURIComponent(value)}`);
  return response.data;
};
