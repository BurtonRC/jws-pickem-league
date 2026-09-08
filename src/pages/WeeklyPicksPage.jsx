// WeeklyPicksPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import WarningModal from "../components/WarningModal";
import PageHeader from "@/components/PageHeader";

/** Local confirmation modal (keeps your WarningModal for warnings only) */
function ConfirmationModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-green-600">Picks Submitted</h2>
        <p className="text-gray-700">{message}</p>
        <button
          className="mt-2 w-full bg-green-500 text-white font-semibold py-2 rounded-xl hover:bg-green-600 active:bg-green-700 transition"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
}

// Upload New Week from ESPN
export const manualSeason = 2026;
export const manualWeekNumber = 1; // <-- manually set the week you want

export default function WeeklyPicksPage() {
  
  // Core selection state (unchanged)
  const [selectedTeams, setSelectedTeams] = useState({});
  const [sliderOn, setSliderOn] = useState({});
  const [pointSpreadSelection, setPointSpreadSelection] = useState({});

  // Two-phase submission locks
  const [submittedFirst, setSubmittedFirst] = useState(false);
  const [submittedSecond, setSubmittedSecond] = useState(false);

  // Two countdown strings, shown inline with their submit areas
  const [timeFirst, setTimeFirst] = useState(null);
  const [timeSecond, setTimeSecond] = useState(null);

  // Survivor
  const [survivorPick, setSurvivorPick] = useState("");
  const [survivorLost, setSurvivorLost] = useState(false);
  const [pickedTeams, setPickedTeams] = useState([]);
  const [survivorPicks, setSurvivorPicks] = useState([]);


  // Auth user
  const [user, setUser] = useState(null);

  // Modals
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnMessages, setWarnMessages] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  // Weeks & games
  const [currentWeek, setCurrentWeek] = useState(null);
  const [games, setGames] = useState([]);
  const [allTeams, setAllTeams] = useState([]);

  // Track Drive-By (DB) picks separately
  const [DBs, setDBs] = useState({});

  // One-off: lock specific game(s) in the second submit
  const secondSubmitLockedGames = ["401772953"]; // <-- use the game ID(s) to lock

  // Helper: determine if a game is in the first submit group (Thu–Sat + early international)
  const isFirstSubmitGame = (game) => {
    // 1. Always Thu / Fri / Sat
    if (["Thu", "Fri", "Sat"].includes(game.day)) return true;

    // 2. Include early international games (before 12:00 ET)
    const kickoff = new Date(game.kickoffUTC || game.kickoff);
    const hourET = (kickoff.getUTCHours() - 4 + 24) % 24; // UTC → Eastern
    if (hourET < 12) return true;

    // 3. Fallback for known locations
    return [
      "London",
      "Germany",
      "Frankfurt",
      "Tottenham",
      "Wembley",
      "Munich",
      "Mexico",
      "Brazil",
      "Sao Paulo",
      "Madrid",
    ].some((loc) => (game.location || "").includes(loc));
  };

  // Helper: check if a game's kickoff has already passed
  const hasGameStarted = (game) => {
    if (!game.date) return false; // fallback if no date
    return new Date(game.date) < new Date(); // true if in the past
  };

  // Map of previously picked teams (won) for the survivor dropdown
  const previousPickMap = useMemo(() => {
    const map = {};

    if (!survivorPicks || !currentWeek) return map;

    survivorPicks
      .filter(
        (pick) =>
          pick.season === manualSeason &&
          pick.week < currentWeek.weekNumber &&
          pick.team
      )
      .forEach((pick) => {
        map[pick.team.trim().toLowerCase()] = true;
      });

    return map;
  }, [survivorPicks, currentWeek]);


  useEffect(() => {
    const fetchWeekGames = async () => {
      console.log(
        "Fetching schedule:",
        "season:",
        manualSeason,
        "week:",
        manualWeekNumber
      );

      try {
        // ---- Fetch current-season ESPN schedule ----
        const resWeek = await fetch(
          `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?year=${manualSeason}&seasontype=2&week=${manualWeekNumber}`
        );

        if (!resWeek.ok) {
          throw new Error(`ESPN returned ${resWeek.status}`);
        }

        const weekData = await resWeek.json();

        // Map ESPN games. ESPN supplies the current betting favorite
        // in competition.odds[].awayTeamOdds/homeTeamOdds.
        const weekGames = (weekData.events || []).map((game) => {
          const competition = game.competitions?.[0];
          const competitors = competition?.competitors || [];

          const home = competitors.find(
            (team) => team.homeAway === "home"
          );
          const away = competitors.find(
            (team) => team.homeAway === "away"
          );

          const homeTeam =
            home?.team?.displayName || "";
          const awayTeam =
            away?.team?.displayName || "";

          const matchup = [awayTeam, homeTeam];

          const odds = competition?.odds?.[0];

          let favoriteTeam = "";

          if (odds?.awayTeamOdds?.favorite) {
            favoriteTeam = awayTeam;
          } else if (odds?.homeTeamOdds?.favorite) {
            favoriteTeam = homeTeam;
          } else if (odds?.details) {
            const details = String(odds.details);
            const awayAbbreviation =
              away?.team?.abbreviation || "";
            const homeAbbreviation =
              home?.team?.abbreviation || "";

            if (
              awayAbbreviation &&
              details.startsWith(`${awayAbbreviation} `)
            ) {
              favoriteTeam = awayTeam;
            } else if (
              homeAbbreviation &&
              details.startsWith(`${homeAbbreviation} `)
            ) {
              favoriteTeam = homeTeam;
            }
          }

          const kickoffUTC = new Date(game.date);

          let day = kickoffUTC.toLocaleString("en-US", {
            weekday: "short",
          });

          const hourET =
            (kickoffUTC.getUTCHours() - 4 + 24) % 24;

          const isEarlyIntlSunday =
            day === "Sun" && hourET < 12;

          if (isEarlyIntlSunday) {
            day = "Sun Intl";
          }

          const location =
            competition?.venue?.address?.city ||
            competition?.venue?.fullName ||
            "";

          const internationalLocations = [
            "London",
            "Germany",
            "Frankfurt",
            "Tottenham",
            "Wembley",
            "Munich",
            "Mexico",
            "Brazil",
            "Sao Paulo",
            "Madrid",
            "Melbourne",
          ];

          const displayDay = internationalLocations.some((loc) =>
            location.includes(loc)
          )
            ? `${day} Intl ${location}`
            : day;

          return {
            id: game.id,
            teams: matchup,
            day,
            displayDay,
            location,
            kickoffUTC,
            date: game.date,
            homeTeam,
            awayTeam,
            favoriteTeam,
          };
        });

        // ---- Fetch league game configuration ----
        const { data: configData, error: configError } =
          await supabase
            .from("league_game_config")
            .select(
              "game_id, drive_by_enabled, drive_by_team, ps_game_of_week, ps_team, spread"
            )
            .eq("season", manualSeason)
            .eq("week", manualWeekNumber);

        if (configError) {
          console.error(
            "Error fetching league game config:",
            configError
          );
        }

        const configMap = new Map(
          (configData || []).map((row) => [
            String(row.game_id),
            row,
          ])
        );

        const mergedGames = weekGames.map((game) => {
          const cfg = configMap.get(String(game.id));

          return {
            ...game,
            dbEnabled: Boolean(cfg?.drive_by_enabled),
            dbTeam: cfg?.drive_by_team || "",
            pointSpread: cfg?.spread
              ? [cfg.spread]
              : [],
            psTeam: cfg?.ps_team || "",
          };
        });

        setGames(mergedGames);

        const teams = Array.from(
          new Set(
            mergedGames.flatMap((game) => game.teams)
          )
        ).sort();

        setAllTeams(teams);

        setCurrentWeek({
          season: manualSeason,
          weekNumber: manualWeekNumber,
        });

      } catch (err) {
        console.error(
          "Error fetching week games:",
          err
        );
      }
    };

    fetchWeekGames();
  }, []);


  useEffect(() => {
    const getUser = async () => {
      const { data, error } =
        await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching user:", error);
        return;
      }

      setUser(data.user);
    };

    getUser();
  }, []);


  // Fetch all past survivor picks for this user
  useEffect(() => {
    async function fetchSurvivorPicks() {
      if (!user) return;

      const { data, error } = await supabase
        .from("survivor_picks")
        .select("*")
        .eq("user_id", user.id)
        .eq("season", manualSeason);

      if (error) {
        console.error(
          "Error fetching survivor picks:",
          error
        );
      } else {
        setSurvivorPicks(data);
      }
    }

    fetchSurvivorPicks();
  }, [user]);


  // ------------------------------
  // Kickoff helpers
  // ------------------------------

  const firstKickoff = useMemo(() => {
    const firstGames = games.filter(isFirstSubmitGame);

    if (firstGames.length === 0) return null;

    return new Date(
      Math.min(
        ...firstGames.map((g) =>
          new Date(g.kickoffUTC).getTime()
        )
      )
    );
  }, [games]);

  const secondKickoff = useMemo(() => {
    const secondGames = games.filter(
      (g) => !isFirstSubmitGame(g)
    );

    if (secondGames.length === 0) return null;

    return new Date(
      Math.min(
        ...secondGames.map((g) =>
          new Date(g.kickoffUTC).getTime()
        )
      )
    );
  }, [games]);


  // ------------------------------
  // Countdown effect
  // ------------------------------

  useEffect(() => {
    const setupCountdown = (kickoff, setStr) => {
      if (!kickoff) {
        setStr("Kickoff time TBD");
        return () => {};
      }

      const update = () => {
        const diff = kickoff - new Date();

        if (diff <= 0) {
          setStr(
            "Kickoff reached!"
          );
        } else {
          const hours = Math.floor(
            diff / (1000 * 60 * 60)
          );
          const minutes = Math.floor(
            (diff % (1000 * 60 * 60)) /
              (1000 * 60)
          );
          const seconds = Math.floor(
            (diff % (1000 * 60)) /
              1000
          );

          setStr(
            `Time until kickoff: ${hours}h ${minutes}m ${seconds}s`
          );
        }
      };

      update();

      const timerId =
        setInterval(update, 1000);

      return () =>
        clearInterval(timerId);
    };

    const cleanupFirst =
      setupCountdown(
        firstKickoff,
        setTimeFirst
      );

    const cleanupSecond =
      setupCountdown(
        secondKickoff,
        setTimeSecond
      );

    return () => {
      cleanupFirst();
      cleanupSecond();
    };
  }, [firstKickoff, secondKickoff]);


  // ------------------------------
  // Pick locking
  // ------------------------------

  const firstLocked =
    submittedFirst ||
    timeFirst === "Kickoff reached!";

  const secondLocked =
    submittedSecond ||
    timeSecond === "Kickoff reached!";


  // ------------------------------
  // Handlers
  // ------------------------------

  const toggleSlider = (
    id,
    checked,
    dbTeam
  ) => {
    setSliderOn((prev) => ({
      ...prev,
      [id]: checked,
    }));

    setSelectedTeams((prev) => ({
      ...prev,
      [id]: checked
        ? dbTeam
        : "",
    }));

    setDBs((prev) => {
      const newDBs = {
        ...prev,
      };

      if (checked) {
        newDBs[id] = dbTeam;
      } else {
        delete newDBs[id];
      }

      return newDBs;
    });
  };


const DBToggle = (
  game,
  locked
) => {
  if (!game.dbEnabled) {
    return null;
  }

  const isOn =
    Boolean(DBs[game.id]);

  return (
    <div
      className={`flex items-center gap-2 ${
        locked ? "opacity-50" : ""
      }`}
    >
      <span className="text-sm">
        {game.dbTeam}
      </span>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={isOn}
          onChange={(e) =>
            toggleSlider(
              game.id,
              e.target.checked,
              game.dbTeam
            )
          }
          disabled={locked}
          className="sr-only peer"
        />

        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
      </label>
    </div>
  );
};


  const handleSelectChange = (
    id,
    value,
    dbTeam
  ) => {
    setSelectedTeams((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (
      dbTeam &&
      value === dbTeam
    ) {
      setDBs((prev) => ({
        ...prev,
        [id]: value,
      }));
    } else if (dbTeam) {
      setDBs((prev) => {
        const next = {
          ...prev,
        };

        delete next[id];

        return next;
      });
    }
  };


  const handlePointSpreadChange = (
    id,
    value
  ) => {
    setPointSpreadSelection(
      (prev) => ({
        ...prev,
        [id]: value,
      })
    );
  };


  const onSubmitFirst = async () => {
    setWarnMessages([]);

    const missing = games
      .filter(isFirstSubmitGame)
      .filter(
        (g) => !selectedTeams[g.id]
      );

    if (missing.length > 0) {
      setWarnMessages([
        `Please make all picks before submitting.`
      ]);
      setWarnOpen(true);
      return;
    }

    const payload = {
      season: manualSeason,
      week: manualWeekNumber,
      picks: selectedTeams,
      dbs: DBs,
      point_spreads: pointSpreadSelection,
      survivor_pick: survivorPick,
    };

    const { error } = await supabase
      .from("weekly_picks")
      .upsert(
        {
          user_id: user.id,
          username:
            user.user_metadata?.username ||
            user.email ||
            "Unknown",
          ...payload,
        },
        {
          onConflict:
            "user_id,season,week",
        }
      );

    if (error) {
      console.error(
        "Error saving picks:",
        error
      );
      setWarnMessages([
        "Unable to save picks."
      ]);
      setWarnOpen(true);
      return;
    }

    setSubmittedFirst(true);
    setConfirmMsg(
      "Your first set of picks has been submitted."
    );
    setConfirmOpen(true);
  };


  const onSubmitSecond = async () => {
    setWarnMessages([]);

    const missing = games
      .filter(
        (g) =>
          !isFirstSubmitGame(g)
      )
      .filter(
        (g) => !selectedTeams[g.id]
      );

    if (missing.length > 0) {
      setWarnMessages([
        "Please make all remaining picks before submitting."
      ]);
      setWarnOpen(true);
      return;
    }

    const payload = {
      season: manualSeason,
      week: manualWeekNumber,
      picks: selectedTeams,
      dbs: DBs,
      point_spreads: pointSpreadSelection,
      survivor_pick: survivorPick,
    };

    const { error } = await supabase
      .from("weekly_picks")
      .upsert(
        {
          user_id: user.id,
          username:
            user.user_metadata?.username ||
            user.email ||
            "Unknown",
          ...payload,
        },
        {
          onConflict:
            "user_id,season,week",
        }
      );

    if (error) {
      console.error(
        "Error saving picks:",
        error
      );
      setWarnMessages([
        "Unable to save picks."
      ]);
      setWarnOpen(true);
      return;
    }

    if (survivorPick) {
      const { error: survivorError } =
        await supabase
          .from("survivor_picks")
          .upsert(
            {
              user_id: user.id,
              username:
                user.user_metadata?.username ||
                user.email ||
                "Unknown",
              season: manualSeason,
              week: manualWeekNumber,
              team: survivorPick,
              result: null,
            },
            {
              onConflict:
                "user_id,season,week",
            }
          );

      if (survivorError) {
        console.error(
          "Error saving survivor pick:",
          survivorError
        );
      }
    }

    setSubmittedSecond(true);
    setConfirmMsg(
      "Your remaining picks have been submitted."
    );
    setConfirmOpen(true);
  };


  const getPointSpreadOptions = (
    game
  ) => {
    const configuredSpread =
      Number(
        game.pointSpread?.[0]
      );

    if (!Number.isFinite(configuredSpread)) {
      return [];
    }

    const psTeam =
      game.psTeam;

    if (!psTeam) {
      return [];
    }

    const otherTeam =
      game.teams.find(
        (team) => team !== psTeam
      );

    if (!otherTeam) {
      return [];
    }

    const amount =
      Math.abs(configuredSpread);

    const psLabel =
      configuredSpread > 0
        ? `+${amount}`
        : configuredSpread < 0
        ? `-${amount}`
        : "0";

    const oppositeSpread =
      configuredSpread > 0
        ? `-${amount}`
        : configuredSpread < 0
        ? `+${amount}`
        : "0";

    return [
      {
        value: `${psTeam} | ${psLabel}`,
        label: `${psTeam} ${psLabel}`,
        team: psTeam,
      },
      {
        value: `${otherTeam} | ${oppositeSpread}`,
        label: `${otherTeam} ${oppositeSpread}`,
        team: otherTeam,
      },
    ];
  };


  // ---- UI ----

  if (!currentWeek) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 pt-6">
      <div className="w-full max-w-5xl mx-auto space-y-4">

        <PageHeader>
          {manualSeason} &nbsp;&nbsp; Week {currentWeek.weekNumber}
        </PageHeader>

        {/* ===== DESKTOP TABLE ===== */}

        <table className="hidden md:table w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left w-1/4">Matchup</th>
              <th className="p-3 text-left w-1/6">Day</th>
              <th className="p-3 text-left w-1/6">DB</th>
              <th className="p-3 text-left w-1/4">Point Spread</th>
              <th className="p-3 text-left w-1/4">Select</th>
            </tr>
          </thead>

          <tbody>
            {(() => {
              const lastFirstIndex =
                Math.max(
                  ...games.map(
                    (g, idx) =>
                      isFirstSubmitGame(g)
                        ? idx
                        : -1
                  )
                );

              return games.map(
                (game, idx) => {
                  const locked =
                    isFirstSubmitGame(game)
                      ? firstLocked
                      : secondLocked;

                  return (
                    <React.Fragment
                      key={game.id}
                    >
                      {/* ===== MATCHUP ROW ===== */}

                      <tr>
                        <td className="p-3">
                          {game.teams[0]} at{" "}
                          {game.teams[1]}
                        </td>

                        <td className="p-3">
                          {game.displayDay !== game.day ? (
                          <>
                            {game.day}{" "}
                            <span className="font-bold">
                              Intl {game.location}
                            </span>
                          </>
                        ) : (
                          game.day
                        )}
                        </td>

                        <td className="p-3">
                          {DBToggle(
                            game,
                            locked
                          )}
                        </td>

                        <td className="p-3">
                          {game.pointSpread?.length >
                            0 && (
                            <select
                              className={`border rounded p-1 w-full ${
                                pointSpreadSelection[
                                  game.id
                                ]
                                  ? "bg-yellow-200"
                                  : ""
                              }`}
                              value={
                                pointSpreadSelection[
                                  game.id
                                ] || ""
                              }
                              onChange={(e) =>
                                handlePointSpreadChange(
                                  game.id,
                                  e.target.value
                                )
                              }
                              disabled={locked}
                            >
                              <option value="">
                                -- Disruptor Point Spread --
                              </option>

                              {getPointSpreadOptions(
                                game
                              ).map(
                                (option) => (
                                  <option
                                    key={
                                      option.value
                                    }
                                    value={
                                      option.value
                                    }
                                  >
                                    {
                                      option.label
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          )}
                        </td>

                        <td className="p-3">
                          <select
  className={`border rounded p-1 w-full ${
    selectedTeams[game.id]
      ? "bg-yellow-200"
      : ""
  }`}
  value={
    selectedTeams[game.id] || ""
  }
  onChange={(e) =>
    handleSelectChange(
      game.id,
      e.target.value,
      game.dbTeam
    )
  }
  disabled={
    locked ||
    (!isFirstSubmitGame(game) &&
      secondSubmitLockedGames.includes(
        String(game.id)
      ))
  }
                          >
                            <option value="">
                              {!isFirstSubmitGame(
                                game
                              ) &&
                              secondSubmitLockedGames.includes(
                                String(game.id)
                              )
                                ? "Game locked"
                                : "-- Select Team --"}
                            </option>

                            {game.teams.map(
                              (team) => (
                                <option
                                  key={team}
                                  value={team}
                                >
                                  {team}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                      </tr>

                      {idx ===
                        lastFirstIndex && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-3"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg bg-white border p-3">
                              <span className="font-semibold">
                                {timeFirst ||
                                  "Kickoff time TBD"}
                              </span>

                              <button
                                onClick={
                                  onSubmitFirst
                                }
                                disabled={
                                  firstLocked
                                }
                                className={`px-4 py-2 rounded font-semibold text-white transition
                                  ${
                                    firstLocked
                                      ? "bg-gray-400 cursor-not-allowed"
                                      : "bg-green-500 hover:bg-green-600 active:bg-green-700"
                                  }`}
                              >
                                Submit First Game(s)
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }
              );
            })()}

            {!survivorLost && (
              <tr className="bg-gray-50">
                <td
                  colSpan={4}
                  className="p-3 font-semibold"
                >
                  Survivor Pick:
                </td>

                <td className="p-3">
                  <select
                    className={`border rounded p-1 w-full ${
                      survivorPick
                        ? "bg-yellow-200"
                        : ""
                    } ${
                      secondLocked ||
                      survivorLost
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                    value={survivorPick}
                    onChange={(e) =>
                      setSurvivorPick(
                        e.target.value
                      )
                    }
                    disabled={
                      secondLocked ||
                      survivorLost
                    }
                  >
                    <option value="">
                      -- Select Team --
                    </option>

                    {allTeams.map(
                      (team) => {
                        const isUsed =
                          previousPickMap[
                            team
                              .trim()
                              .toLowerCase()
                          ] || false;

                        return (
                          <option
                            key={team}
                            value={team}
                            disabled={
                              isUsed ||
                              survivorLost
                            }
                            style={
                              isUsed
                                ? {
                                    color:
                                      "gray",
                                  }
                                : {}
                            }
                          >
                            {team}{" "}
                            {isUsed
                              ? "(used)"
                              : ""}
                          </option>
                        );
                      }
                    )}
                  </select>
                </td>
              </tr>
            )}

            {games.length > 1 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg bg-white border p-3">
                    <span className="font-semibold">
                      {timeSecond ||
                        "Kickoff time TBD"}
                    </span>

                    <button
                      onClick={
                        onSubmitSecond
                      }
                      disabled={
                        secondLocked
                      }
                      className={`px-4 py-2 rounded font-semibold text-white transition
                        ${
                          secondLocked
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                        }`}
                    >
                      Submit Rest of Picks
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ===== MOBILE CARDS ===== */}

        <div className="md:hidden space-y-4">
          {games.map(
            (game, idx) => {
              const locked =
                isFirstSubmitGame(game)
                  ? firstLocked
                  : secondLocked;

              const lastFirstIndex =
                Math.max(
                  ...games.map(
                    (g, i) =>
                      isFirstSubmitGame(g)
                        ? i
                        : -1
                  )
                );

              return (
                <React.Fragment
                  key={game.id}
                >
                  <div className="bg-white p-3 rounded shadow">
                    <div className="font-semibold">
                      {game.teams[0]} at{" "}
                      {game.teams[1]}
                    </div>

                    <div>
                      Day: {game.displayDay !== game.day ? (
                      <>
                        {game.day}{" "}
                        <span className="font-bold">
                          Intl {game.location}
                        </span>
                      </>
                    ) : (
                      game.day
                    )}
                    </div>

                    {DBToggle(
                      game,
                      locked
                    )}

                    {game.pointSpread?.length >
                      0 && (
                      <select
                        className={`border rounded p-1 w-full mt-2 ${
                          pointSpreadSelection[
                            game.id
                          ]
                            ? "bg-yellow-200"
                            : ""
                        }`}
                        value={
                          pointSpreadSelection[
                            game.id
                          ] || ""
                        }
                        onChange={(e) =>
                          handlePointSpreadChange(
                            game.id,
                            e.target.value
                          )
                        }
                        disabled={locked}
                      >
                        <option value="">
                          -- Disruptor Point Spread --
                        </option>

                        {getPointSpreadOptions(
                          game
                        ).map(
                          (option) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>
                    )}

                    <select
                      className={`border rounded p-1 w-full mt-2 ${
                        selectedTeams[
                          game.id
                        ]
                          ? "bg-yellow-200"
                          : ""
                      }`}
                      value={
                        selectedTeams[
                          game.id
                        ] || ""
                      }
                      onChange={(e) =>
                        handleSelectChange(
                          game.id,
                          e.target.value,
                          game.dbTeam
                        )
                      }
                      disabled={
                        locked ||
                        (!isFirstSubmitGame(
                          game
                        ) &&
                          secondSubmitLockedGames.includes(
                            String(game.id)
                          ))
                      }
                    >
                      <option value="">
                        {!isFirstSubmitGame(
                          game
                        ) &&
                        secondSubmitLockedGames.includes(
                          String(game.id)
                        )
                          ? "Game locked"
                          : "-- Select Team --"}
                      </option>

                      {game.teams.map(
                        (team) => (
                          <option
                            key={team}
                            value={team}
                          >
                            {team}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {idx ===
                    lastFirstIndex && (
                    <div className="bg-white p-3 rounded shadow flex flex-col gap-3">
                      <span className="font-semibold">
                        {timeFirst ||
                          "Kickoff time TBD"}
                      </span>

                      <button
                        onClick={
                          onSubmitFirst
                        }
                        disabled={
                          firstLocked
                        }
                        className={`w-full px-4 py-2 rounded font-semibold text-white transition
                          ${
                            firstLocked
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-green-500 hover:bg-green-600 active:bg-green-700"
                          }`}
                      >
                        Submit First Game(s)
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            }
          )}

          {!survivorLost && (
            <div className="bg-white p-3 rounded shadow">
              <div className="font-semibold mb-2">
                Survivor Pick:
              </div>

              <select
                className={`border rounded p-1 w-full ${
                  survivorPick
                    ? "bg-yellow-200"
                    : ""
                } ${
                  secondLocked ||
                  survivorLost
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
                value={survivorPick}
                onChange={(e) =>
                  setSurvivorPick(
                    e.target.value
                  )
                }
                disabled={
                  secondLocked ||
                  survivorLost
                }
              >
                <option value="">
                  -- Select Team --
                </option>

                {allTeams.map(
                  (team) => {
                    const isUsed =
                      previousPickMap[
                        team
                          .trim()
                          .toLowerCase()
                      ] || false;

                    return (
                      <option
                        key={team}
                        value={team}
                        disabled={
                          isUsed ||
                          survivorLost
                        }
                        style={
                          isUsed
                            ? {
                                color:
                                  "gray",
                              }
                            : {}
                        }
                      >
                        {team}{" "}
                        {isUsed
                          ? "(used)"
                          : ""}
                      </option>
                    );
                  }
                )}
              </select>
            </div>
          )}

          {games.length > 1 && (
            <div className="bg-white p-3 rounded shadow flex flex-col gap-3">
              <span className="font-semibold">
                {timeSecond ||
                  "Kickoff time TBD"}
              </span>

              <button
                onClick={
                  onSubmitSecond
                }
                disabled={
                  secondLocked
                }
                className={`w-full px-4 py-2 rounded font-semibold text-white transition
                  ${
                    secondLocked
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                  }`}
              >
                Submit Rest of Picks
              </button>
            </div>
          )}
        </div>
      </div>

      <WarningModal
        isOpen={warnOpen}
        messages={warnMessages}
        onClose={() => setWarnOpen(false)}
      />

      <ConfirmationModal
        isOpen={confirmOpen}
        message={confirmMsg}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}