export const isAdminLoggedIn = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    const allowedAdmins = ["kushalkarri1117@gmail.com"];
    return allowedAdmins.includes(user?.email);
  } catch (e) {
    return false;
  }
};

export const logoutAdmin = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("selected_studio_match_id");
  localStorage.removeItem("live_scoring_match_id");
  localStorage.removeItem("live_scoring_innings_id");
  localStorage.removeItem("scorecard_match_id");
  localStorage.removeItem("scorecard_innings_id");
  localStorage.removeItem("dashboard_scorecard_match_id");
  localStorage.removeItem("dashboard_scorecard_innings_id");
  // Clean all match-specific innings memory keys
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith("live_scoring_innings_id_match_")) {
      localStorage.removeItem(key);
    }
  });
};
