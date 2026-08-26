# VakifApp Database Safety Policy

## ZERO-DATA-LOSS GUARANTEE
1. **No Silent Resets**: The application will NEVER automatically delete, truncate, or reinstall the content database (`risale_v3.db`) without explicit user interaction.
2. **Safe Self-Heal**: Automatic repair attempts are strictly limited to non-destructive schema migrations and idempotent data backfills.
3. **User Control**: Full database reinstallation from assets occurs ONLY when the user explicitly clicks the "İçeriği Yeniden Yükle (Manuel)" button and confirms the destructive action via a secondary alert dialog.
4. **Data Isolation**: User data (bookmarks, notes) is stored in a separate database (`vakifapp_offline.db`) and is unaffected by content database operations.
