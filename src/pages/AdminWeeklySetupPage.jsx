import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const DEFAULT_SEASON = 2026;

export default function AdminPage() {
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [week, setWeek] = useState(1);

  const [games, setGames] = useState([]);
  const [config, setConfig] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadWeek = async (selectedSeason, selectedWeek) => {
    setLoading(true);
    setError("");
    setMessage("");
    setGames([]);
    setConfig({});

    try {
      const url =
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` +
        `?dates=${selectedSeason}&seasontype=2&week=${selectedWeek}`;

      console.log(
        "ADMIN LOAD:",
        "season:",
        selectedSeason,
        "week:",
        selectedWeek
      );

      console.log("ESPN URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ESPN returned ${response.status}`);
      }

      const data = await response.json();

      const espnGames = (data.events || []).map((game) => {
        const competition = game.competitions?.[0];
        const competitors = competition?.competitors || [];

        const home = competitors.find(
          (team) => team.homeAway === "home"
        );

        const away = competitors.find(
          (team) => team.homeAway === "away"
        );

        return {
          game_id: String(game.id),
          date: game.date,
          home_team: home?.team?.displayName || "",
          away_team: away?.team?.displayName || "",
        };
      });

      console.log(
        "ESPN GAMES FOUND:",
        espnGames.length,
        espnGames
      );

      const gameIds = espnGames.map((game) =>
        Number(game.game_id)
      );

      let configData = [];

      if (gameIds.length > 0) {
        const {
          data: existingConfig,
          error: configError,
        } = await supabase
          .from("league_game_config")
          .select("season, week, game_id, drive_by_enabled, drive_by_team, ps_game_of_week, ps_team, spread")
          .eq("season", selectedSeason)
          .eq("week", selectedWeek)
          .in("game_id", gameIds);

        if (configError) {
          throw configError;
        }

        configData = existingConfig || [];
      }

      console.log(
        "CONFIG FOUND:",
        configData.length,
        configData
      );

      const configMap = {};

      espnGames.forEach((game) => {
        configMap[game.game_id] = {
          drive_by_enabled: false,
          drive_by_team: "",
          ps_game_of_week: false,
          ps_team: "",
          spread: "",
        };
      });

      configData.forEach((item) => {
        configMap[String(item.game_id)] = {
          drive_by_enabled: Boolean(
            item.drive_by_enabled
          ),

          drive_by_team:
            item.drive_by_team || "",

          ps_game_of_week: Boolean(
            item.ps_game_of_week
          ),

          ps_team:
            item.ps_team || "",

          spread:
            item.spread !== null &&
            item.spread !== undefined
              ? String(item.spread)
              : "",
        };
      });

      setGames(espnGames);
      setConfig(configMap);
    } catch (err) {
      console.error(
        "Admin Weekly Setup error:",
        err
      );

      setError(
        err.message ||
          "Unable to load week."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeek(season, week);
  }, [season, week]);

  const updateGameConfig = (
    gameId,
    changes
  ) => {
    setConfig((current) => ({
      ...current,
      [gameId]: {
        ...current[gameId],
        ...changes,
      },
    }));
  };

  const handleDriveByChange = (
    game,
    value
  ) => {
    if (value === "none") {
      updateGameConfig(
        game.game_id,
        {
          drive_by_enabled: false,
          drive_by_team: "",
        }
      );

      return;
    }

    const team =
      value === "away"
        ? game.away_team
        : game.home_team;

    updateGameConfig(
      game.game_id,
      {
        drive_by_enabled: true,
        drive_by_team: team,
      }
    );
  };

const handlePSChange = (game, checked) => {
  if (!checked) {
    updateGameConfig(game.game_id, {
      ps_game_of_week: false,
      ps_team: "",
      spread: "",
    });

    return;
  }

  setConfig((current) => {
    const updated = { ...current };

    Object.keys(updated).forEach((gameId) => {
      updated[gameId] = {
        ...updated[gameId],
        ps_game_of_week: false,
        ps_team: "",
        spread: "",
      };
    });

    updated[game.game_id] = {
      ...updated[game.game_id],
      ps_game_of_week: true,
      ps_team:
        current[game.game_id]?.ps_team ||
        game.home_team,
      spread:
        current[game.game_id]?.spread ||
        "",
    };

    return updated;
  });
};


const handlePSTeamChange = (gameId, value) => {
  updateGameConfig(gameId, {
    ps_team: value,
  });
};


  const handleSpreadChange = (
    gameId,
    value
  ) => {
    updateGameConfig(
      gameId,
      {
        spread: value,
      }
    );
  };

  const saveConfiguration =
    async () => {
      setError("");
      setMessage("");

      const psGames =
        games.filter(
          (game) =>
            config[game.game_id]
              ?.ps_game_of_week
        );

      if (psGames.length > 1) {
        setError(
          "Only one Point Spread Game of the Week can be selected."
        );

        return;
      }

      if (psGames.length === 1) {
        const psGame =
          psGames[0];

        const item =
          config[
            psGame.game_id
          ];

        if (
          item.spread === "" ||
          item.spread === null ||
          item.spread === undefined
        ) {
          setError(
            "Please enter a point spread for the PS Game of the Week."
          );

          return;
        }

        if (
          Number.isNaN(
            Number(item.spread)
          )
        ) {
          setError(
            "The point spread must be a number."
          );

          return;
        }
      }

      setSaving(true);

      try {
        const rows =
          games.map((game) => {
            const item =
              config[
                game.game_id
              ];

            return {
              season,

              week,

              game_id:
                Number(
                  game.game_id
                ),

              drive_by_enabled:
                Boolean(
                  item?.drive_by_enabled
                ),

              drive_by_team:
                item?.drive_by_team ||
                null,

              ps_game_of_week:
                Boolean(
                  item?.ps_game_of_week
                ),

              ps_team:
                item?.ps_game_of_week
                  ? item?.ps_team || null
                  : null,

              spread:
                item?.ps_game_of_week &&
                item?.spread !== ""
                  ? Number(
                      item.spread
                    )
                  : null,
            };
          });

        console.log(
          "SAVING CONFIG:",
          rows
        );

        const {
          error: saveError,
        } = await supabase
          .from("league_game_config")
          .upsert(rows, {
            onConflict:
              "season,week,game_id",
          });

        if (saveError) {
          throw saveError;
        }

        await loadWeek(
          season,
          week
        );

        setMessage(
          `Season ${season}, Week ${week} configuration saved successfully.`
        );
      } catch (err) {
        console.error(
          "Save configuration error:",
          err
        );

        setError(
          err.message ||
            "Unable to save configuration."
        );
      } finally {
        setSaving(false);
      }
    };

  const formatDate = (
    date
  ) => {
    if (!date) return "";

    return new Date(
      date
    ).toLocaleString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div>
        <h1 className="text-3xl font-bold">
          Admin — Weekly Setup
        </h1>

        <p className="text-gray-600 mt-1">
          Configure Drive-By and Point Spread
          games for the selected NFL season
          and week.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-4 flex items-center gap-6">

        <div className="flex items-center gap-3">
          <label className="font-semibold">
            Season:
          </label>

          <select
            value={season}
            onChange={(e) =>
              setSeason(
                Number(
                  e.target.value
                )
              )
            }
            className="border rounded px-3 py-2"
            disabled={
              loading || saving
            }
          >
            <option value={2026}>
              2026
            </option>

            <option value={2025}>
              2025
            </option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="font-semibold">
            Week:
          </label>

          <select
            value={week}
            onChange={(e) =>
              setWeek(
                Number(
                  e.target.value
                )
              )
            }
            className="border rounded px-3 py-2"
            disabled={
              loading || saving
            }
          >
            {Array.from(
              {
                length: 18,
              },
              (_, i) =>
                i + 1
            ).map(
              (number) => (
                <option
                  key={number}
                  value={number}
                >
                  Week {number}
                </option>
              )
            )}
          </select>
        </div>

      </div>

      {loading && (
        <div className="bg-white border rounded-lg p-6">
          Loading {season} Week {week}...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4">
          <strong>Error:</strong>{" "}
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4">
          {message}
        </div>
      )}

      {!loading &&
        !error &&
        games.length > 0 && (
          <>
            <div className="bg-white border rounded-lg p-4">

              <div className="font-semibold">
                {season} — Week{" "}
                {week}
              </div>

              <div className="text-gray-600">
                Games found:{" "}
                <strong>
                  {games.length}
                </strong>
              </div>

            </div>

            <div className="bg-white border rounded-lg overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full border-collapse">

                  <thead className="bg-gray-100">

                    <tr>
                      <th className="p-3 text-left">
                        Matchup
                      </th>

                      <th className="p-3 text-left">
                        Day / Time
                      </th>

                      <th className="p-3 text-left">
                        Drive-By
                      </th>

                      <th className="p-3 text-left">
                        PS Game
                      </th>

                      <th className="p-3 text-left">
                        PS Team
                      </th>

                      <th className="p-3 text-left">
                        Spread
                      </th>

                      <th className="p-3 text-left">
                        Game ID
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {games.map(
                      (game) => {

                        const item =
                          config[
                            game.game_id
                          ] || {
                            drive_by_enabled:
                              false,

                            drive_by_team:
                              "",

                            ps_game_of_week:
                              false,

                            ps_team:
                              "",

                            spread:
                              "",
                          };

                        const dbValue =
                          !item.drive_by_enabled
                            ? "none"
                            : item.drive_by_team ===
                              game.away_team
                            ? "away"
                            : item.drive_by_team ===
                              game.home_team
                            ? "home"
                            : "none";

                        return (
                          <tr
                            key={
                              game.game_id
                            }
                            className="border-t"
                          >

                            <td className="p-3">
                              <div className="font-medium">
                                {
                                  game.away_team
                                }{" "}
                                at{" "}
                                {
                                  game.home_team
                                }
                              </div>
                            </td>

                            <td className="p-3 text-sm text-gray-600">
                              {formatDate(
                                game.date
                              )}
                            </td>

                            <td className="p-3">

                              <select
                                value={
                                  dbValue
                                }
                                onChange={(
                                  e
                                ) =>
                                  handleDriveByChange(
                                    game,
                                    e.target.value
                                  )
                                }
                                className="border rounded px-2 py-1"
                              >

                                <option value="none">
                                  No DB
                                </option>

                                <option value="away">
                                  {
                                    game.away_team
                                  }
                                </option>

                                <option value="home">
                                  {
                                    game.home_team
                                  }
                                </option>

                              </select>

                            </td>

                            <td className="p-3">

                              <input
                                type="checkbox"
                                checked={Boolean(
                                  item.ps_game_of_week
                                )}
                                onChange={(
                                  e
                                ) =>
                                  handlePSChange(
                                    game,
                                    e.target.checked
                                  )
                                }
                              />

                            </td>

                            <td className="p-3">
                              <select
                                value={item.ps_team || ""}
                                disabled={!item.ps_game_of_week}
                                onChange={(e) =>
                                  handlePSTeamChange(
                                    game.game_id,
                                    e.target.value
                                  )
                                }
                                className="border rounded px-2 py-1 disabled:bg-gray-100"
                              >
                                <option value="">
                                  -- Select Team --
                                </option>

                                <option value={game.away_team}>
                                  {game.away_team}
                                </option>

                                <option value={game.home_team}>
                                  {game.home_team}
                                </option>
                              </select>
                            </td>

                            <td className="p-3">

                              <input
                                type="number"
                                step="0.5"
                                value={
                                  item.spread
                                }
                                disabled={
                                  !item.ps_game_of_week
                                }
                                onChange={(
                                  e
                                ) =>
                                  handleSpreadChange(
                                    game.game_id,
                                    e.target.value
                                  )
                                }
                                className="border rounded px-2 py-1 w-24 disabled:bg-gray-100"
                                placeholder="-3.5"
                              />

                            </td>

                            <td className="p-3 text-sm text-gray-500">
                              {
                                game.game_id
                              }
                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            </div>

            <div className="flex justify-end">

              <button
                type="button"
                onClick={
                  saveConfiguration
                }
                disabled={
                  saving
                }
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Week Configuration"}
              </button>

            </div>
          </>
        )}

      {!loading &&
        !error &&
        games.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
            No games were returned for{" "}
            {season} Week {week}.
          </div>
        )}

    </div>
  );
}