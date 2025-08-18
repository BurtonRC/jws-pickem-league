import requests
from datetime import datetime, timedelta
import json

YEAR = 2025

def get_json(url):
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()

def get_team_name(team_url, cache):
    if team_url in cache:
        return cache[team_url]
    data = get_json(team_url)
    name = data.get('displayName') or data.get('name') or "Unknown Team"
    cache[team_url] = name
    return name

def get_week_data(week_url, cache):
    if week_url in cache:
        return cache[week_url]
    data = get_json(week_url)
    cache[week_url] = data
    return data

def main():
    base_url = f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{YEAR}/types/2/events?limit=1000"
    data = get_json(base_url)
    events = data.get('items', [])
    print(f"Total events fetched: {len(events)}")

    team_cache = {}
    week_cache = {}

    # Dict: weekNumber -> {week info including games}
    schedule = {}

    for idx, event in enumerate(events, 1):
        event_url = event.get('$ref')
        print(f"Fetching game {idx}: {event_url}")
        game_data = get_json(event_url)

        # Get week number and week data
        week_ref = game_data.get('week', {}).get('$ref')
        week_info = get_week_data(week_ref, week_cache) if week_ref else None
        week_number = week_info.get('number') if week_info else None

        # Week start/end dates from week_info
        start_date = week_info.get('startDate') if week_info else None
        end_date = week_info.get('endDate') if week_info else None

        # Game kickoff time UTC
        kickoff_utc = game_data.get('date')

        # Parse game date for day of week
        day_of_week = None
        if kickoff_utc:
            dt = datetime.fromisoformat(kickoff_utc.replace("Z", "+00:00"))
            day_of_week = dt.strftime('%A')

        # Get competitors (teams)
        competitions = game_data.get('competitions', [])
        if not competitions:
            print(f"No competition data for event {event_url}")
            continue
        competitors = competitions[0].get('competitors', [])

        home_team = None
        away_team = None

        for c in competitors:
            team_url = c.get('team', {}).get('$ref')
            team_name = get_team_name(team_url, team_cache) if team_url else "Unknown Team"
            if c.get('homeAway') == 'home':
                home_team = team_name
            elif c.get('homeAway') == 'away':
                away_team = team_name

        if not (week_number and home_team and away_team):
            print(f"Skipping incomplete data for game {idx}")
            continue

        # Initialize week if not present
        if week_number not in schedule:
            schedule[week_number] = {
                "weekNumber": week_number,
                "startDate": start_date,
                "endDate": end_date,
                "kickoffUTC": kickoff_utc,  # We'll overwrite this with earliest kickoff per week later
                "games": []
            }

        # Append game info
        schedule[week_number]['games'].append({
            "id": len(schedule[week_number]['games']) + 1,
            "teams": [away_team, home_team],
            "day": day_of_week,
            "dbLabel": None,
            "dbTeam": None,
            "pointSpread": []
        })

        # Update kickoffUTC for the week if this game is earlier
        current_earliest = schedule[week_number].get("kickoffUTC")
        if current_earliest:
            if kickoff_utc < current_earliest:
                schedule[week_number]["kickoffUTC"] = kickoff_utc

    # Convert schedule dict to list sorted by week number
    full_schedule = [schedule[w] for w in sorted(schedule)]

    # Save to JSON file
    with open(f"nfl_schedule_{YEAR}.json", "w") as f:
        json.dump(full_schedule, f, indent=2)

    print(f"Saved nfl_schedule_{YEAR}.json with {len(full_schedule)} weeks.")

if __name__ == "__main__":
    main()
