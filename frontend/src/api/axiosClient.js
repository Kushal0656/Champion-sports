import axios from "axios";
import { getApiBaseUrl } from "../utils/config";

const axiosClient = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
  timeout: 60000, // 60s timeout to handle Render cold starts gracefully
});

export default axiosClient;