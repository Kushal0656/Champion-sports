import axios from "axios";
import { getApiBaseUrl } from "../utils/config";

const axiosClient = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
});

export default axiosClient;