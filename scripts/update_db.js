import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import { estimateTime, getLeetCodeURL, findLatestExcel } from './utils/problem_utils.js';
import { loadExcelMeta, sourcesFromExcel, sourcesFromCSV, formatCompany } from './utils/data_sources.js';

// === CONFIG ===
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..'); // Workspace Root
const DATA_DIR = path.join(ROOT_DIR, 'data');
const OUT_FILE = path.join(ROOT_DIR, 'src/data/problems.json');

// Filenames (User provided)
const MAPPING_CSV_NAME = 'global_problem_company_mapping.csv';
const EXCEL_PREFIX = 'leetcode_problems_';

// === HELPERS ===

function parseGrindCSV(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    // header: Week,No,Question Title,Question URL,Difficulty,Topic,Time
    // Skip header
    return lines.slice(1).map(line => {
        const parts = line.split(',');
        if (parts.length < 7) return null;
        // Logic from original script:
        // Title is parts[2...-4]
        const title = parts.slice(2, parts.length - 4).join(',');
        const time = parts[parts.length - 1];
        return { 'Question Title': title.trim(), Time: time.trim() };
    }).filter(Boolean);
}

const ADMIN_DIR = path.join(ROOT_DIR, 'admin');

// === MAIN ===

async function main() {
    try {
        console.log('--- Starting Data Update ---');

        // 1. Find Files in ADMIN_DIR
        const files = fs.readdirSync(ADMIN_DIR);

        // Find newest Excel
        const excelFile = findLatestExcel(files, EXCEL_PREFIX);
        if (!excelFile) {
            throw new Error(`Could not find Excel file starting with "${EXCEL_PREFIX}" in ${ADMIN_DIR}`);
        }

        // Find Grind75 (Static)
        const grindPath = path.join(DATA_DIR, 'grind75.csv');
        if (!fs.existsSync(grindPath)) {
            console.warn(`Warning: Grind75 data not found at ${grindPath}. Skipping Grind75 logic.`);
        }

        // 2. Load Content
        const excelPath = path.join(ADMIN_DIR, excelFile);
        console.log(`Loading Excel from: ${excelPath}`);
        const { meta, hasCompanies } = loadExcelMeta(xlsx.readFile(excelPath));

        // Company tags: premium Excel carries them; otherwise fall back to the mapping CSV
        let sources;
        if (hasCompanies) {
            console.log('Company data: from the premium Excel');
            sources = sourcesFromExcel(meta);
        } else {
            const csvPath = path.join(ADMIN_DIR, MAPPING_CSV_NAME);
            if (!fs.existsSync(csvPath)) {
                throw new Error(`Excel has no company columns and CSV mapping file is missing: ${MAPPING_CSV_NAME}`);
            }
            console.log(`Company data: from ${MAPPING_CSV_NAME}`);
            sources = sourcesFromCSV(fs.readFileSync(csvPath, 'utf8'));
        }

        let grindProbs = [];
        if (fs.existsSync(grindPath)) {
            grindProbs = parseGrindCSV(fs.readFileSync(grindPath, 'utf8'));
        }

        console.log(`Loaded: ${sources.length} Company-tagged Problems, ${meta.length} Excel Rows, ${grindProbs.length} Grind75 Entries`);

        // Indexing with normalized spacing
        const normalizeTitle = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();

        const metaMap = new Map();
        meta.forEach(p => metaMap.set(normalizeTitle(p.Title), p));

        const grindMap = new Map();
        grindProbs.forEach(p => grindMap.set(normalizeTitle(p['Question Title']), p));

        // 4. Merge
        const merged = [];
        let unmatched = 0;

        sources.forEach(s => {
            const originalTitle = s.title;
            const lowerTitle = normalizeTitle(originalTitle);
            const companies = s.companySlugs.map(formatCompany);

            // Defaults
            let difficulty = 'Medium';
            let topic = 'Algorithms';
            let relatedTopics = [];
            let isGrind75 = false;
            let likes = 0;
            let url = null;

            // Match Excel Meta
            if (metaMap.has(lowerTitle)) {
                const m = metaMap.get(lowerTitle);
                difficulty = m.Difficulty;
                topic = m.Topic;
                relatedTopics = m.relatedTopics;
                likes = m.Likes;
                url = m.Url;
            } else {
                unmatched++;
            }

            const duration = estimateTime(difficulty, originalTitle); // minutes

            // Match Grind75 (Override duration/importance?)
            if (grindMap.has(lowerTitle)) {
                isGrind75 = true;
                // Optional: Use Grind75 time if available? 
                // keeping estimated for consistency unless needed
            }

            merged.push({
                id: s.id,
                title: originalTitle,
                url: url || getLeetCodeURL(originalTitle),
                difficulty,
                duration, // minutes
                companies,
                company_count: s.count,
                topic,
                relatedTopics, // { name: string }[]
                isGrind75,
                likes
            });
        });

        if (unmatched > 0) console.warn(`Warning: ${unmatched} problems had no Excel metadata (defaults used)`);

        // 5. Write Output
        // Sort by company count descending by default
        merged.sort((a, b) => b.company_count - a.company_count);

        if (!fs.existsSync(path.dirname(OUT_FILE))) {
            fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
        }

        fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2));
        console.log(`Successfully wrote ${merged.length} problems to ${OUT_FILE}`);

    } catch (e) {
        console.error("Error updating data:", e.message);
        process.exit(1);
    }
}

main();
