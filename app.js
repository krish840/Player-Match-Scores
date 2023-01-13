const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertPlayerDetailsToResponse = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const matchDetailsToResponse = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};
const statsToResponse = (dbObject) => {
  return {
    playerId: dbObject.playerId,
    playerName: dbObject.playerName,
    totalScore: dbObject.totalScore,
    totalFours: dbObject.totalFours,
    totalSixes: dbObject.totalSixes,
  };
};
app.get("/players/", async (request, response) => {
  const getPlayersQuery = `Select * from player_details`;
  const allplayersArray = await database.all(getPlayersQuery);
  response.send(
    allplayersArray.map((each) => convertPlayerDetailsToResponse(each))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `Select * from player_details where player_id=${playerId};`;
  const player = await database.get(getPlayerQuery);
  response.send(convertPlayerDetailsToResponse(player));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerName } = request.body;
  const { playerId } = request.params;
  const updatePlayerQuery = `
  UPDATE
    player_details
  SET
    player_name = '${playerName}'
    
  WHERE
    player_id = ${playerId};`;

  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `select * from match_details where match_id=${matchId};`;
  const matchDetails = await database.get(getMatchDetailsQuery);
  response.send(matchDetailsToResponse(matchDetails));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const playerMatchDetailsQuery = `select player_match_score.match_id ,match_details.match,match_details.year 
    from match_details natural join player_match_score 
    where player_match_score.player_id=${playerId};`;
  const playermatches = await database.all(playerMatchDetailsQuery);
  response.send(playermatches.map((each) => matchDetailsToResponse(each)));
});
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const specificMatchPlayerQuery = `select player_details.player_id ,player_details.player_name 
    from player_details natural join player_match_score 
    where player_match_score.match_id=${matchId}`;
  const specificMatchPlayer = await database.all(specificMatchPlayerQuery);
  response.send(
    specificMatchPlayer.map((each) => convertPlayerDetailsToResponse(each))
  );
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const statQuery = `SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const stats = await database.get(statQuery);
  response.send(statsToResponse(stats));
});
module.exports = app;
