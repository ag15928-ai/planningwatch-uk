# PlanningWatch UK — MVP

Companion prototype for *Holding the Green Line*.

## Run it

Serve this folder from a static web host (for example, GitHub Pages or Netlify). Opening index.html directly from a phone's file manager will not allow postcode lookup, map tiles, or service-worker installation.

The folder is self-contained. Keep index.html, manifest.webmanifest, sw.js, and brownfield-map.html together when uploading it.

## What is in this prototype

- Interactive OpenStreetMap map with the existing four clearly labelled PlanningWatch demonstration housing records.
- Solar and wind project layers from the Department for Energy Security and Net Zero (DESNZ) Renewable Energy Planning Database (REPD), covering the UK and refreshed by GitHub Actions every Monday when the official quarterly source changes.
- Postcode lookup and saved home-centre point using postcodes.io. The selected radius is drawn on the map.
- Local browser change checks for REPD solar/wind records near the saved home point. The app keeps a recent activity list and queues rate-limited notices on this device; checks run when the user opens the app.
- Alert preferences for solar and wind data. Planning applications, status changes, brownfield-register changes, legislation, and NRCA/community notices are visibly marked as not connected and cannot be selected as live alerts.
- Detailed England brownfield-register map bundled as a separate page and opened inside the Brownfield tab.
- UK coverage page for England, Scotland, Wales and Northern Ireland, with official source routes and planned coverage labels.
- Upload page for planning notices, documents, and photos. Selecting files displays their names; no files are transmitted or stored.
- Book Updates page prepared for the permanent QR code link in a future print edition.

## Not live yet

The four housing records remain explicitly labelled demonstrations. Solar and wind projects use the official UK REPD quarterly snapshot (projects represented from 150 kW) and exclude operational, refused, withdrawn, abandoned and expired schemes from the map. The feed is a snapshot, not a live council application register; small projects or newly submitted schemes can be missing.

Browser alerts compare the user's saved local snapshot with the latest published REPD data when the app is opened. They do not check in the background when the app is closed and do not send email or remote push notifications. Postcode and alert preferences remain on that device. The app records renewable changes in a local activity list and queues rate-limited notices so a frequency setting does not discard a detected change. NRCA/community notices, local planning applications, brownfield-register changes, legislation updates and file uploads are not connected to live services yet. A verified source for NRCA notices and a secure backend are required before public submissions or background delivery.

GitHub Actions runs `scripts/update_renewables.py` on a weekly schedule and when the workflow/source updater changes. It reads the latest CSV attachment from DESNZ's official publication page, converts British National Grid coordinates to WGS84, and commits `data/renewables.json` only when the source-derived data changes. The GitHub Actions run must complete successfully before the JSON feed is available to GitHub Pages.

## UK-wide data coverage

There is no single national planning feed in this prototype. The coverage page separates England, Scotland, Wales and Northern Ireland and identifies the official routes planned for each:

- England: Planning Data API plus local-authority registers where needed.
- Scotland: Scottish Government policy, ePlanning Scotland and planning-authority registers.
- Wales: Welsh Government policy, local-authority registers and Planning and Environment Decisions Wales for relevant casework.
- Northern Ireland: the Planning Portal public register, Department for Infrastructure sources and council links. The public NI portal does not expose the full official register online; Mid Ulster uses a separate system.

The REPD renewable-project route is connected for a quarterly UK snapshot. Other routes are not live connections. The national Planning Data API documents the planning-application dataset as incomplete, and local-authority coverage varies. The app must not present missing records as proof that nothing is planned.

The brownfield map is a source-led snapshot labelled 28 September 2026. Its own screen explains that coverage, update dates, and point accuracy vary by authority. Confirm records and boundaries with the current local-authority register.

## Book QR code

After the app has a permanent public domain, make the interior QR code point to that stable URL with #upload (for example, https://your-domain.example/#upload). The app opens directly on the upload page; the Book Updates tab remains available in the same app. Set up a short redirect on the final domain so the printed QR code can keep working if hosting changes.
