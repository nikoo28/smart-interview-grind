import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import { estimateTime, getLeetCodeURL, findLatestExcel } from './utils/problem_utils.js';

// === CONFIG ===
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..'); // Workspace Root
const DATA_DIR = path.join(ROOT_DIR, 'data');
const OUT_FILE = path.join(ROOT_DIR, 'src/data/problems.json');

// Filenames (User provided)
const MAPPING_CSV_NAME = 'global_problem_company_mapping.csv';
const EXCEL_PREFIX = 'leetcode_problems_';

// === HELPERS ===

function parseUserCSV(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    // header: problem_id,problem_name,number_of_companies,list_of_companies
    // Skip header
    return lines.slice(1).map(line => {
        const parts = line.split(',');
        if (parts.length < 4) return null;
        // Logic: ID is first, Count is 2nd last, Companies is last.
        const id = parts[0];
        const companies = parts[parts.length - 1]; // bullet list
        const count = parts[parts.length - 2];
        const titleParts = parts.slice(1, parts.length - 2);
        const title = titleParts.join(','); // Re-join title works if comma in name
        const titleStr = title.trim();
        const cleanTitle = titleStr.startsWith('"') && titleStr.endsWith('"') ? titleStr.slice(1, -1) : titleStr;
        return { problem_id: id, problem_name: cleanTitle, number_of_companies: count, list_of_companies: companies };
    }).filter(Boolean);
}

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

function loadExcelMeta(excelPath) {
    console.log(`Loading Excel from: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: true });
    const firstRow = xlsx.utils.decode_range(sheet['!ref']).s.r;

    // Locate columns by header name (premium exports have extra company columns)
    const headerIdx = rows.findIndex(r => r && r[0] === 'Problem Number');
    if (headerIdx === -1) throw new Error('Could not find the "Problem Number" header row in the Excel');
    const header = rows[headerIdx];
    const col = {
        id: header.indexOf('Problem Number'),
        title: header.indexOf('Problem Name'),
        likes: header.indexOf('Likes'),
        topics: header.indexOf('Topics'),
        difficulty: header.indexOf('Suggested Difficulty Level'),
        companyCount: header.indexOf('Company Count'),
        companies: header.indexOf('Companies List'),
    };
    for (const key of ['title', 'likes', 'topics', 'difficulty']) {
        if (col[key] === -1) throw new Error(`Missing Excel column for "${key}"`);
    }
    const hasCompanies = col.companyCount !== -1 && col.companies !== -1;

    const meta = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[col.title]) continue;

        const title = row[col.title].toString();
        const likes = row[col.likes] || 0;
        const topicsRaw = row[col.topics] || '';
        const difficulty = row[col.difficulty] || 'Medium';

        // Clean topics
        const topics = topicsRaw.toString().split(',').map(t => t.trim()).filter(Boolean);
        const primaryTopic = topics.length > 0 ? topics[0] : 'Algorithms';

        // Structure related topics clearly
        const relatedTopics = topics.map(name => ({ name }));

        // Problem names are hyperlinks to the real LeetCode page
        const titleCell = sheet[xlsx.utils.encode_cell({ r: firstRow + i, c: col.title })];
        const url = titleCell?.l?.Target || null;

        meta.push({
            Id: row[col.id] != null ? String(row[col.id]) : null,
            Title: title.trim(),
            Difficulty: difficulty,
            Topic: primaryTopic,
            relatedTopics: relatedTopics, // Key fix from previous session
            Likes: likes,
            Url: url,
            CompanyCount: hasCompanies ? parseInt(row[col.companyCount]) || 0 : 0,
            Companies: hasCompanies ? (row[col.companies] || '').toString().split(',').map(c => c.trim()).filter(Boolean) : [],
        });
    }
    return { meta, hasCompanies };
}

function formatCompany(slug) {
    return slug.toLowerCase().split('-').map(word => {
        if (word === 'ii') return 'II';
        if (word === 'iii') return 'III';
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
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
        const { meta, hasCompanies } = loadExcelMeta(path.join(ADMIN_DIR, excelFile));

        // Company tags: premium Excel carries them; otherwise fall back to the mapping CSV
        let sources;
        if (hasCompanies) {
            console.log('Company data: from the premium Excel');
            sources = meta
                .filter(m => m.CompanyCount > 0)
                .map(m => ({ id: m.Id, title: m.Title, companySlugs: m.Companies, count: m.CompanyCount }));
        } else {
            const csvPath = path.join(ADMIN_DIR, MAPPING_CSV_NAME);
            if (!fs.existsSync(csvPath)) {
                throw new Error(`Excel has no company columns and CSV mapping file is missing: ${MAPPING_CSV_NAME}`);
            }
            console.log(`Company data: from ${MAPPING_CSV_NAME}`);
            sources = parseUserCSV(fs.readFileSync(csvPath, 'utf8')).map(u => ({
                id: u['problem_id'],
                title: u['problem_name'],
                // Format in CSV is bullet list strings sometimes or just messy
                companySlugs: u['list_of_companies'].split('•').map(c => c.trim()).filter(Boolean),
                count: parseInt(u['number_of_companies']) || 0,
            }));
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
