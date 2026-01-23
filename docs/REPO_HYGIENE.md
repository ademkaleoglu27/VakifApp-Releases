# Repository Hygiene

To maintain a clean repository and prevent large binary or build artifacts from being accidentally committed, we have implemented several protection layers.

## Local Git Hooks

We use a local pre-commit hook that blocks files matching certain patterns (e.g., `.apk`, `.aab`, `build/` directories).

### Activation
To activate the local hooks, run the following command in the repository root:

```bash
git config core.hooksPath .githooks
```

> [!NOTE]
> Windows users should run this command in **Git Bash** to ensure the POSIX scripts work correctly.

## Hygiene Policy
The following patterns are strictly blocked:
- Binary files: `.apk`, `.aab`, `.keystore`, `.jks`, `.pem`, `.p12`
- Build directories: `builds/`, `android/app/build/`, `android/build/`, `ios/build/`

## CI/CD Protection
A GitHub Actions workflow (`.github/workflows/repo-hygiene.yml`) runs on every push and pull request to ensure no blocked files are tracked in the repository.
