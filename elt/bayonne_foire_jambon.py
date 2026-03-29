"""
Pipeline ELT pour la Foire au Jambon de Bayonne.

Génère à partir de bronze/towns/bayonne/foire-jambon/{year}/events_raw.json :
  - silver/02_ferias/bayonne/foire-jambon/{year}/foire-jambon-{year}-events-clean.json
  - gold/bayonne__foire-jambon__{year}.json

Usage :
  python elt/bayonne_foire_jambon.py          # year=2026 par défaut
  python elt/bayonne_foire_jambon.py 2025
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


CITY_ID  = "bayonne"
FERIA_ID = "foire-jambon"
TZ_SUFFIX = "+02:00"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_json(path: Path) -> Any:
  return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: Any) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _dmy_to_iso(dmy: str) -> str:
  """'23/04/2026' → '2026-04-23'"""
  d, m, y = dmy.split("/")
  return f"{y}-{m}-{d}"


def _parse_date(day: str) -> str | None:
  """'Jeudi 10 Avril 2025' → '2025-04-10'"""
  parts = day.split()
  if len(parts) < 4:
    return None
  months = {
    "janvier": "01", "février": "02", "mars": "03", "avril": "04",
    "mai": "05", "juin": "06", "juillet": "07", "août": "08",
    "septembre": "09", "octobre": "10", "novembre": "11", "décembre": "12",
  }
  mo = months.get(parts[2].lower())
  if not mo:
    return None
  return f"{int(parts[3]):04d}-{mo}-{int(parts[1]):02d}"


def _parse_time(time_raw: str) -> tuple[str, str | None]:
  """'9h30 à 11h30' → ('09:30', '11:30') ; '10h30' → ('10:30', None)"""
  tr = time_raw.strip().replace("De ", "").replace("de ", "")

  def _fmt(s: str) -> str:
    s = s.strip()
    if "h" not in s:
      return "00:00"
    h, m = s.split("h", 1)
    return f"{int(h):02d}:{int(m.strip() or '0'):02d}"

  if "à" in tr:
    left, right = tr.split("à", 1)
    return _fmt(left), _fmt(right)

  if "h" in tr:
    h, m = tr.split("h", 1)
    return f"{int(h):02d}:{int(m.strip() or '0'):02d}", None

  return "00:00", None


def _venue_id(location_raw: str) -> str:
  loc = (location_raw or "").lower()
  if "carreau" in loc:       return "carreau-halles"
  if "esplanade" in loc:     return "esplanade-roland-barthes"
  if "trinquet" in loc:      return "trinquet-saint-andre"
  if "maison des assoc" in loc: return "maison-associations"
  if "allée" in loc or "allee" in loc or "platanes" in loc: return "allee-platanes"
  if "cathédrale" in loc or "cathedrale" in loc: return "cathedrale-sainte-marie"
  if "pelletier" in loc:     return "rue-pelletier"
  if "rues" in loc:          return "rues-bayonne"
  return "carreau-halles"


def _pricing(title_raw: str, note_raw: str | None) -> tuple[bool, str | None]:
  txt = f"{title_raw} {note_raw or ''}".lower()
  if "gratuit" in txt or "libre" in txt:
    return True, None
  if "sur réservation" in txt:
    return False, "sur réservation"
  if "entrée" in txt or "10 €" in txt or "10€" in txt:
    return False, None
  return True, None


# ---------------------------------------------------------------------------
# Extract → Silver
# ---------------------------------------------------------------------------

def build_events_clean(flat_events: list[dict[str, Any]], year: int) -> list[dict[str, Any]]:
  out: list[dict[str, Any]] = []
  for i, ev in enumerate(flat_events, start=1):
    date = _parse_date(ev.get("day") or "")
    if not date:
      continue
    start, end = _parse_time(ev.get("time_raw", ""))
    free, price = _pricing(ev.get("title_raw") or "", ev.get("note_raw"))
    title_fr = ev.get("title_raw") or ""
    title_obj = {"fr": title_fr, "es": None, "eus": None}

    dmy = f"{date[8:10]}/{date[5:7]}/{date[:4]}"
    entry: dict[str, Any] = {
      "id": f"fjb{str(year)[-2:]}-{i:04d}",
      "startDate": dmy,
      "startTime": start,
      "endDate": dmy if end else None,
      "endTime": end if end else None,
      "location": _venue_id(ev.get("location_raw", "")),
      "title_long": title_obj,
      "title_short": title_obj.copy(),
      "isPaid": not free,
    }
    if price:
      entry["price"] = price
    out.append(entry)
  return out


# ---------------------------------------------------------------------------
# Display → Gold
# ---------------------------------------------------------------------------

def build_gold_bundle(
  town: dict[str, Any],
  feria: dict[str, Any],
  edition: dict[str, Any],
  places: list[dict[str, Any]],
  events_clean: list[dict[str, Any]],
  year: int,
) -> dict[str, Any]:
  events: list[dict[str, Any]] = []
  for ev in events_clean:
    is_paid = bool(ev.get("isPaid"))
    tags = ["payant"] if is_paid else ["gratuit"]

    start_iso = _dmy_to_iso(ev["startDate"])
    out_ev: dict[str, Any] = {
      "id": ev["id"],
      "venueId": ev["location"],
      "shortName": (ev["title_short"]["fr"] or "")[:24],
      "startTimestamp": f"{start_iso}T{ev['startTime']}:00{TZ_SUFFIX}",
      "title": ev["title_long"],
      "tags": tags,
    }
    if ev.get("endDate") and ev.get("endTime"):
      end_iso = _dmy_to_iso(ev["endDate"])
      out_ev["endTimestamp"] = f"{end_iso}T{ev['endTime']}:00{TZ_SUFFIX}"
    if is_paid and ev.get("price"):
      out_ev["description"] = {"fr": str(ev["price"])}
    events.append(out_ev)

  events.sort(key=lambda e: e["startTimestamp"])

  return {
    "id": f"{town['id']}__{feria['id']}__{year}",
    "town": town,
    "feria": {
      "id": feria["id"],
      "townId": feria.get("townId") or town["id"],
      "name": feria["name"],
      "website": feria.get("website"),
      "theme": feria.get("theme"),
    },
    "edition": {
      "year": year,
      "dates": edition["dates"],
    },
    "places": places,
    "events": events,
  }


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def run(year: int) -> None:
  root = Path(__file__).resolve().parents[1] / "data"

  bronze_path  = root / "01_bronze" / "towns" / CITY_ID / FERIA_ID / str(year) / "events_raw.json"
  silver_out   = root / "02_silver" / "02_ferias" / CITY_ID / FERIA_ID / f"{FERIA_ID}-{year}-events-clean.json"
  city_path    = root / "02_silver" / "01_town" / CITY_ID / "town.json"
  places_path  = root / "02_silver" / "01_town" / CITY_ID / "places.json"
  feria_path   = root / "02_silver" / "ferias" / f"{FERIA_ID}.json"
  gold_out     = root / "03_gold" / f"{CITY_ID}__{FERIA_ID}__{year}.json"

  bronze = _read_json(bronze_path)
  town   = _read_json(city_path)
  places = _read_json(places_path)
  feria  = _read_json(feria_path)

  flat_events: list[dict[str, Any]] = [
    {**ev, "day": day_block["day"]}
    for day_block in bronze.get("events_raw", [])
    for ev in day_block.get("events", [])
  ]

  events_clean = build_events_clean(flat_events, year)

  _write_json(silver_out, {
    "events": events_clean,
  })
  print(f"✓ silver → {silver_out.relative_to(root.parent)}")

  _write_json(gold_out, build_gold_bundle(
    town=town,
    feria=feria,
    edition=feria["editions"][str(year)],
    places=places,
    events_clean=events_clean,
    year=year,
  ))
  print(f"✓ gold   → {gold_out.relative_to(root.parent)}")


if __name__ == "__main__":
  year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
  run(year)
