# Plugin update feeds

Each Dirt Monkey plugin checks `https://dirtmonkey.music/updates/<Plugin>.json`,
where `<Plugin>` is the plugin's exact, case-sensitive product name (for example
`Meter.json`, `Wonk Factory.json`). Names with spaces are fetched URL-encoded
(`Wonk%20Factory.json`).

    {"version": "1.2.3", "url": "https://...", "notes": ""}

- `version`: the latest release, as `x.y.z` numbers. A plugin shows UPDATE AVAILABLE
  when this is newer than its own version.
- `url`: where the update button sends people (https).
- `notes`: optional short text for the tooltip.

To ship an update, bump `version` (and `url`) in that plugin's file and push.
Nothing on the site links here. `dev/site-check.js` checks every file.
