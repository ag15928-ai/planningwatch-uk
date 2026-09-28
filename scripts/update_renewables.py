#!/usr/bin/env python3
"""Build a small JSON feed from the latest official DESNZ REPD CSV."""
from __future__ import annotations

import csv
import io
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

from pyproj import Transformer

PUBLICATION_PAGE = "https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract"
SOURCE_PAGE = PUBLICATION_PAGE
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "renewables.json"
UA = "PlanningWatchUK/1.0 (public source refresh; contact via repository)"


class CsvLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._label: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._label = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._label.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href is not None:
            self.links.append((self._href, " ".join(" ".join(self._label).split())))
            self._href = None
            self._label = []


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def latest_csv() -> tuple[str, str, str]:
    html = get(PUBLICATION_PAGE).decode("utf-8", errors="replace")
    parser = CsvLinkParser()
    parser.feed(html)
    candidates = [(href, label) for href, label in parser.links
                  if ".csv" in href.lower() and "renewable energy planning database" in label.lower()]
    if not candidates:
        raise RuntimeError("Could not find the current REPD CSV link on the official GOV.UK publication page")
    href, label = candidates[0]
    if href.startswith("/"):
        href = "https://www.gov.uk" + href
    match = re.search(r"(January|April|July|October)\s+\d{4}", label, re.I)
    snapshot = match.group(0) if match else label
    return href, label, snapshot


def cell(row: dict[str, str], name: str) -> str:
    return (row.get(name) or "").strip()


def number(value: str) -> float | None:
    value = value.strip().replace(",", "")
    try:
        result = float(value)
        return result if result > 0 else None
    except (TypeError, ValueError):
        return None


def main() -> None:
    csv_url, csv_label, snapshot = latest_csv()
    raw = get(csv_url)
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    required = {"Ref ID", "Site Name", "Technology Type", "Development Status", "X-coordinate", "Y-coordinate"}
    headers = set(reader.fieldnames or [])
    missing = required - headers
    if missing:
        raise RuntimeError("REPD CSV changed; missing expected columns: " + ", ".join(sorted(missing)))

    transformer = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)
    projects: list[dict[str, object]] = []
    excluded_status = ("operational", "decommissioned", "abandoned", "withdrawn", "refused", "expired", "revised")
    for row in reader:
        technology = cell(row, "Technology Type")
        tech = technology.lower()
        if "solar" in tech:
            kind = "solar"
        elif "wind" in tech:
            kind = "wind"
        else:
            continue

        status = cell(row, "Development Status") or cell(row, "Development Status (short)")
        pipeline = not any(term in status.lower() for term in excluded_status)
        east, north = number(cell(row, "X-coordinate")), number(cell(row, "Y-coordinate"))
        if east is None or north is None:
            continue
        lng, lat = transformer.transform(east, north)
        if not (-9.5 <= lng <= 2.5 and 49.5 <= lat <= 61.5):
            continue

        ref = cell(row, "Ref ID") or cell(row, "Old Ref ID")
        site = cell(row, "Site Name")
        if not ref or not site or site.lower() == "not set":
            site = site if site and site.lower() != "not set" else (cell(row, "Address") or f"{kind.title()} project {ref}")
        projects.append({
            "id": "REPD-" + ref,
            "ref": ref,
            "name": site,
            "kind": kind,
            "technology": technology,
            "status": status or "Status not stated",
            "pipeline": pipeline,
            "capacity": cell(row, "Installed Capacity (MWelec)"),
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "place": ", ".join(part for part in [cell(row, "County"), cell(row, "Region")] if part and part.lower() != "not set"),
            "country": cell(row, "Country"),
            "postcode": cell(row, "Post Code"),
            "authority": cell(row, "Planning Authority"),
            "applicationRef": cell(row, "Planning Application Reference"),
            "updated": cell(row, "Record Last Updated (dd/mm/yyyy)"),
            "sourceUrl": SOURCE_PAGE,
        })

    projects.sort(key=lambda p: (str(p["country"]), str(p["name"]).casefold(), str(p["ref"])))
    output = {
        "source": "Department for Energy Security and Net Zero (DESNZ)",
        "dataset": "Renewable Energy Planning Database (REPD)",
        "sourceUrl": SOURCE_PAGE,
        "csvUrl": csv_url,
        "csvLabel": csv_label,
        "snapshot": snapshot,
        "scope": "UK renewable electricity projects tracked through planning and construction; projects >=150 kW where represented in the source",
        "projectCount": len(projects),
        "projects": projects,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(projects)} active solar/wind pipeline records from {snapshot} to {OUTPUT}")


if __name__ == "__main__":
    main()
