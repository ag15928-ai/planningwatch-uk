# PlanningWatch UK — MVP

Companion prototype for *Holding the Green Line*.

## Run it

Serve this folder from a static web host (for example, GitHub Pages or Netlify). Opening index.html directly from a phone's file manager will not allow postcode lookup, map tiles, or service-worker installation.

The folder is self-contained. Keep index.html, manifest.webmanifest, sw.js, and brownfield-map.html together when uploading it.

## What is in this prototype

- Interactive OpenStreetMap map with the existing four PlanningWatch demonstration records.
- Postcode lookup and saved home-centre point using postcodes.io. The selected radius is drawn on the map.
- Alert preferences for housing applications, status changes, proposed solar and wind farms, brownfield-register changes, and NRCA/community notices. Preferences are saved in this browser only.
- Detailed England brownfield-register map bundled as a separate page and opened inside the Brownfield tab.
- UK coverage page for England, Scotland, Wales and Northern Ireland, with official source routes and planned coverage labels.
- Upload page for planning notices, documents, and photos. Selecting files displays their names; no files are transmitted or stored.
- Book Updates page prepared for the permanent QR code link in a future print edition.

## Not live yet

The four housing records are explicitly labelled demonstrations. Solar, wind and NRCA layers are ready in the interface but have no live feed connected. Alerts do not yet monitor changes or send email/push notifications. File uploads are not transmitted. These require a trusted server, data integrations, accounts, and privacy controls.

## UK-wide data coverage

There is no single national planning feed in this prototype. The coverage page separates England, Scotland, Wales and Northern Ireland and identifies the official routes planned for each:

- England: Planning Data API plus local-authority registers where needed.
- Scotland: Scottish Government policy, ePlanning Scotland and planning-authority registers.
- Wales: Welsh Government policy, local-authority registers and Planning and Environment Decisions Wales for relevant casework.
- Northern Ireland: the Planning Portal public register, Department for Infrastructure sources and council links. The public NI portal does not expose the full official register online; Mid Ulster uses a separate system.

These are planned routes, not live connections. The app should show a source and last-checked date and label every area as Connected, Partial, Official link only or Unavailable. It must not present missing records as proof that nothing is planned.

The brownfield map is a source-led snapshot labelled 28 September 2026. Its own screen explains that coverage, update dates, and point accuracy vary by authority. Confirm records and boundaries with the current local-authority register.

## Book QR code

After the app has a permanent public domain, make the interior QR code point to that stable URL with #upload (for example, https://your-domain.example/#upload). The app opens directly on the upload page; the Book Updates tab remains available in the same app. Set up a short redirect on the final domain so the printed QR code can keep working if hosting changes.
