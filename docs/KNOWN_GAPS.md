# Actual baseline limitations and conversion work

The owner has approved the current visual experience. Preserve it while addressing these implementation gaps.

1. **No desktop application exists in this bundle.** Electron, SQLite, installer configuration, production dependencies and Windows binary still need implementation.
2. **Storage is browser-local.** The reference uses localStorage, not a production desktop database. User browser records are not available in this environment and are not included.
3. **Backup export exists; restore does not.** Implement validated desktop migration and full restore, not just a file-download button.
4. **Fonts currently require a remote Google Fonts CSS import.** Bundle licensed local fonts for offline fidelity. This handoff does not include downloaded font binaries.
5. **Source has global state and overriding functions.** Script order matters. Earlier code may describe outdated screens. Refactor without removing final behavior.
6. **Native dropdown fix is included.** It sets dark select color-scheme, opaque option backgrounds, selected/disabled colors and forced-colors behavior. Test this on actual Windows.
7. **No live visual QA or Windows installer test was performed for this handoff.** Render smoke checks and JS syntax checks are useful but not substitutes. No screenshots are bundled or claimed.
8. **Dates and timer need production treatment.** TODAY is initialized using Asia/Karachi at startup; the reference does not provide a complete configurable-timezone/midnight/sleep lifecycle. Implement and test it.
9. **Computed pause/default state needs normalization.** Source uses mutable base snapshots and overrides. Ensure reload or pause resizing never loses the underlying plan or captures a derived pause as permanent source data.
10. **Local IDs and some arrays lack a uniform domain schema.** Convert carefully with stable IDs; preserve legacy records, relations, and explicit overrides.
11. **Numeric validation is uneven.** Consistently validate actual hours, counts, score ranges, dates and finite values in main-process services as well as UI.
12. **Imports are prototype parsers.** Current XLSX parsing relies on ZIP/XML and browser DecompressionStream. Verify workbook compatibility or replace with a maintained bundled parser, keeping matching/preview rules. `.xls` is not currently supported.
13. **Some source values are unresolved Notion formula/rollup URLs.** Never parse them as performance numbers or fabricated results.
14. **Original source URLs and owner schedule are included in reference data.** Preserve exact reference for development, but ship a separate clean friend seed policy and remove private links from friend UI/resources.
15. **Some wording describes a design preview/browser storage.** Update storage/about/help copy to truthful desktop behavior, without disturbing layout.
16. **Historic mastery events do not exist.** Current status is not past-week completion evidence. Add future event logging if needed; do not invent a history.
17. **Code signing is not provided.** A certificate or signing service must be configured separately if chosen. Unsigned status must be reported, not disguised.
18. **Browser and Electron storage origins differ.** Migration requires the owner's exported JSON; a website URL alone cannot transfer data.

The exact source and manifest remain the reference. These notes identify conversion requirements rather than authorizing a visual redesign.
