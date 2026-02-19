
import * as FileSystem from 'expo-file-system';
import { ContentPackService } from '../../contentpacks/services/ContentPackService';
import { useCevsenStore } from '../stores/useCevsenStore';

// User should create this repo/file
const REPO_OWNER = 'ademkaleoglu27';
const REPO_NAME = 'VakifApp-Assets'; // New repo for generic assets?
const MANIFEST_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/books/buyuk_cevsen/manifest.json`;

const STORAGE_DIR = FileSystem.documentDirectory + 'books/buyuk_cevsen';

export const CevsenPackService = new ContentPackService({
    packId: 'buyuk_cevsen',
    manifestUrl: MANIFEST_URL,
    storageDir: STORAGE_DIR,
    store: () => useCevsenStore // Pass the hook itself, or wrapper? 
    // The base class expects `store: () => ContentPackStore`.
    // useCevsenStore IS the store hook. But to get state we use useCevsenStore.getState()
    // The base class calls config.store().getState().
    // So if I pass `() => useCevsenStore`, then `store()` returns the hook. Hook has .getState(). Correct.
});
