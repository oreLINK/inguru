#!/usr/bin/env python3
"""
silver_to_gold.py — Agrégation silver → gold pour Inguru
=========================================================

Construit le bundle gold d'une ou plusieurs éditions à partir des fichiers silver.

Sources silver attendues
------------------------
  01_town/{town}/town.json
  01_town/{town}/places.json
  02_ferias/{town}/{feria}/feria.json
  02_ferias/{town}/{feria}/anim.json
  02_ferias/{town}/{feria}/services.json
  02_ferias/{town}/{feria}/{year}/edition.json
  02_ferias/{town}/{feria}/{year}/{town}-{feria}-{year}-events.json

Sortie
------
  03_gold/{town}-{feria}-{year}.json

Usage
-----
  # Une édition précise
  python elt/silver_to_gold.py --edition bayonne-foire-jambon-2026

  # Toutes les éditions d'une année
  python elt/silver_to_gold.py --year 2026
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# ─── Chemins ────────────────────────────────────────────────────────────────

ROOT     = Path(__file__).resolve().parent.parent
SILVER   = ROOT / "data" / "02_silver"
GOLD_DIR = ROOT / "data" / "03_gold"
TZ       = ZoneInfo("Europe/Paris")

# ─── Utilitaires ─────────────────────────────────────────────────────────────

def load(path: Path):
    """Charge un fichier JSON, retourne None s'il n'existe pas."""
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✓  {path.relative_to(ROOT)}")


def to_iso(date_str: str | None, time_str: str | None) -> str | None:
    """
    Convertit 'DD/MM/YYYY' + 'HH:MM' en ISO 8601 avec fuseau Europe/Paris.
    Retourne None si l'un des deux est absent.
    """
    if not date_str or not time_str:
        return None
    dt = datetime.strptime(f"{date_str} {time_str}", "%d/%m/%Y %H:%M")
    return dt.replace(tzinfo=TZ).isoformat()

# ─── Transformation event silver → gold ─────────────────────────────────────

def transform_event(ev: dict) -> dict:
    """
    Mapping silver → gold pour un événement :

      silver.location    → gold.venueId
      silver.title_long  → gold.title
      silver.startDate + startTime → gold.startTimestamp  (ISO 8601)
      silver.endDate   + endTime   → gold.endTimestamp    (ISO 8601, omis si null)
      shortName        → 24 premiers caractères de title_long.fr
      tags             → ["payant"] ou ["gratuit"] selon payment.isPaid
    """
    title_fr = (ev.get("title_long") or {}).get("fr") or ""
    payment  = ev.get("payment") or {}

    gold = {
        "id":             ev["id"],
        "category":       ev.get("category"),
        "venueId":        ev.get("location"),
        "shortName":      title_fr[:24],
        "startTimestamp": to_iso(ev.get("startDate"), ev.get("startTime")),
        "title":          ev.get("title_long"),
        "title_short":    ev.get("title_short"),
        "description":    ev.get("description"),
    }

    end_ts = to_iso(ev.get("endDate"), ev.get("endTime"))
    if end_ts:
        gold["endTimestamp"] = end_ts

    # Champs optionnels transmis tels quels (artistName, listenArtist…)
    for key in ("artistName", "listenArtist"):
        if key in ev:
            gold[key] = ev[key]

    gold["payment"] = payment
    gold["tags"]    = ["payant"] if payment.get("isPaid") else ["gratuit"]

    return gold

# ─── Construction du bundle gold ─────────────────────────────────────────────

def build_gold(town: str, feria: str, year: int) -> dict:
    town_dir  = SILVER / "01_town"   / town
    feria_dir = SILVER / "02_ferias" / town / feria
    year_dir  = feria_dir / str(year)

    # ── Town ──────────────────────────────────────────────────────────────────
    town_data = load(town_dir / "town.json")
    if not town_data:
        raise FileNotFoundError(f"Fichier manquant : {town_dir / 'town.json'}")

    # ── Places (lieux / venues) ───────────────────────────────────────────────
    places = load(town_dir / "places.json") or []

    # ── Feria ─────────────────────────────────────────────────────────────────
    feria_data = load(feria_dir / "feria.json") or {}
    feria_data.setdefault("id", feria)
    feria_data.setdefault("townId", town)

    # ── Édition ───────────────────────────────────────────────────────────────
    edition_data = load(year_dir / "edition.json")
    if not edition_data:
        edition_data = {"year": year, "dates": {"start": None, "end": None}}

    # ── Événements ────────────────────────────────────────────────────────────
    events_file = year_dir / f"{town}-{feria}-{year}-events.json"
    raw_events  = (load(events_file) or {}).get("events", [])
    if not raw_events:
        print(f"  ⚠  Aucun événement trouvé dans {events_file.relative_to(ROOT)}")
    gold_events = [transform_event(e) for e in raw_events]

    # Fallback : dérive les dates de l'édition depuis les timestamps si edition.json absent
    if not edition_data["dates"].get("start") and gold_events:
        timestamps = sorted(
            e["startTimestamp"] for e in gold_events if e.get("startTimestamp")
        )
        edition_data["dates"]["start"] = timestamps[0][:10]
        edition_data["dates"]["end"]   = timestamps[-1][:10]

    # ── Animations ────────────────────────────────────────────────────────────
    anims = load(feria_dir / "anim.json") or []

    # ── Services ──────────────────────────────────────────────────────────────
    services = load(feria_dir / "services.json") or []

    return {
        "id":       f"{town}__{feria}__{year}",
        "edition":  edition_data,
        "places":   places,
        "events":   gold_events,
        "anims":    anims,
        "services": services,
        "town":     town_data,
        "feria":    feria_data,
    }

# ─── Découverte des éditions ─────────────────────────────────────────────────

def find_editions_for_year(year: int) -> list[dict]:
    """Parcourt silver pour trouver toutes les éditions d'une année donnée."""
    found = []
    ferias_root = SILVER / "02_ferias"
    if not ferias_root.exists():
        return found
    for town_dir in sorted(ferias_root.iterdir()):
        if not town_dir.is_dir():
            continue
        for feria_dir in sorted(town_dir.iterdir()):
            if not feria_dir.is_dir():
                continue
            if (feria_dir / str(year)).is_dir():
                found.append({"town": town_dir.name, "feria": feria_dir.name, "year": year})
    return found


def parse_edition_id(edition_id: str) -> dict:
    """
    Décompose un ID d'édition au format '{town}-{feria-slug}-{year}'.
    Exemples :
      bayonne-foire-jambon-2026  → town=bayonne, feria=foire-jambon, year=2026
      dax-fetes-2026             → town=dax,     feria=fetes,        year=2026
    """
    m = re.match(r'^([a-z]+(?:-[a-z]+)*?)-([a-z]+(?:-[a-z]+)*)-(\d{4})$', edition_id)
    if not m:
        raise ValueError(
            f"Format d'ID invalide : {edition_id!r}\n"
            "Attendu : {{town}}-{{feria-slug}}-{{year}}  (ex: bayonne-foire-jambon-2026)"
        )
    return {"town": m.group(1), "feria": m.group(2), "year": int(m.group(3))}

# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inguru — agrégation silver → gold",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--edition", metavar="ID",
        help="Édition précise  (ex: bayonne-foire-jambon-2026)",
    )
    group.add_argument(
        "--year", type=int, metavar="YYYY",
        help="Toutes les éditions de cette année",
    )
    args = parser.parse_args()

    if args.edition:
        try:
            editions = [parse_edition_id(args.edition)]
        except ValueError as e:
            print(f"Erreur : {e}", file=sys.stderr)
            sys.exit(1)
    else:
        editions = find_editions_for_year(args.year)
        if not editions:
            print(f"Aucune édition trouvée pour l'année {args.year}.")
            sys.exit(0)

    GOLD_DIR.mkdir(parents=True, exist_ok=True)
    errors = 0

    for ed in editions:
        label = f"{ed['town']}-{ed['feria']}-{ed['year']}"
        print(f"\n→ {label}")
        try:
            bundle = build_gold(**ed)
            save(GOLD_DIR / f"{label}.json", bundle)
        except Exception as exc:
            print(f"  ✗  {exc}", file=sys.stderr)
            errors += 1

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
