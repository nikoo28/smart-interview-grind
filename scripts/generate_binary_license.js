import { webcrypto } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const LICENSE_FILE_PATH = path.join(__dirname, '../admin/smart-interview.license');
const HASH_FILE_PATH = path.join(__dirname, '../src/constants/licenseHash.js');

async function generateLicense() {
    console.log('🔒 Generating secure binary license...');

    // 1. Generate 1KB of cryptographic random bytes
    const buffer = new Uint8Array(1024);
    webcrypto.getRandomValues(buffer);

    // 2. Write the BINARY file
    // Note: We write this as a raw buffer, so it looks like "garbage" in a text editor
    await fs.mkdir(path.dirname(LICENSE_FILE_PATH), { recursive: true });
    await fs.writeFile(LICENSE_FILE_PATH, buffer);
    console.log(`✅ Binary license file created at: ${LICENSE_FILE_PATH}`);

    // 3. Calculate SHA-256 Hash
    const hashBuffer = await webcrypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 4. Update the App's validation logic
    const hashFileContent = `export const LICENSE_HASH = "${hashHex}";
export const LICENSE_SIZE = 1024;
`;

    await fs.mkdir(path.dirname(HASH_FILE_PATH), { recursive: true });
    await fs.writeFile(HASH_FILE_PATH, hashFileContent);
    console.log(`✅ Application validation hash updated at: ${HASH_FILE_PATH}`);
    console.log(`🔑 Verification Hash: ${hashHex}`);
}

generateLicense().catch(console.error);
