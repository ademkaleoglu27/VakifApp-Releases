# VakifApp Checkpoints

## vp-reader-sozler-v1 (latest)
**Branch:** `release/vp-reader-sozler-checkpoint`
**Tag:** `vp-reader-sozler-v1`

### Purpose
This checkpoint represents the **Hard Reader Lockdown** state.
- **Single Reader:** Only `RisaleVirtualPageReaderScreen` is active.
- **Content:** Only "Sözler" is enabled and verified (pre-külliyat loaded).
- **Security:** All legacy PDF readers, debug menus, and backdoor routes are removed.
- **Navigation:** Logic restricted to: Library -> Sözler -> TOC -> VP Reader.

### Restoration / Rollback
To return to this exact stable state if future changes (e.g., loading huge JSONs) break the app:

#### Option 1: Checkout Tag (Detached HEAD)
```bash
git fetch --all --tags
git checkout tags/vp-reader-sozler-v1
```

#### Option 2: Checkout Maintenance Branch
```bash
git fetch --all
git checkout release/vp-reader-sozler-checkpoint
```

#### Option 3: Hard Reset (Destructive)
If you are on the main branch and want to force it back to this state:
```bash
git reset --hard vp-reader-sozler-v1
```
