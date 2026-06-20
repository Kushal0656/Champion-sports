import axiosClient from "./axiosClient";

export const addTeamToTournament =
  async (
    tournamentId,
    teamId
  ) => {

    const response =
      await axiosClient.post(
        `/tournament-teams/${tournamentId}/${teamId}`
      );

    return response.data;
};

export const getTournamentTeams =
  async (tournamentId) => {

    const response =
      await axiosClient.get(
        `/tournament-teams/${tournamentId}`
      );

    return response.data;
};