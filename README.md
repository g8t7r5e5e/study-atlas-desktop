# Study Atlas desktop

The approved reference is preserved in `prototype/`. The offline Electron + SQLite application is implemented in [`desktop/`](desktop/README.md).

- [Build and development commands](desktop/README.md)
- [User, migration, backup and recovery guide](desktop/docs/USER_GUIDE.md)
- [Test report and outstanding Windows release gates](desktop/docs/TEST_REPORT.md)
- [Requirement traceability](desktop/docs/TRACEABILITY.md)
- [Windows installer workflow](.github/workflows/windows-desktop.yml)

The Windows workflow generates an unsigned per-user installer and SHA-256 checksums as downloadable Actions artifacts. No website deployment is configured. The friend installer contains a generic curriculum and no owner activity, profile, private plan or source links.
