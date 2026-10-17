import xlsx from 'xlsx';

// Only trust Excel hyperlinks that point at a LeetCode problem page
const LEETCODE_PROBLEM_URL = /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/?$/;

/**
 * Reads problem metadata from the first sheet of a LeetCode Excel export.
 * Columns are located by header name, so premium exports (extra company columns) work too.
 * @param {object} workbook SheetJS workbook
 * @returns {{ meta: object[], hasCompanies: boolean }}
 */
export function loadExcelMeta(workbook) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: true });
    // Row/column arrays are relative to the sheet's range start
    const start = xlsx.utils.decode_range(sheet['!ref']).s;

    const headerIdx = rows.findIndex(r => r && r.includes('Problem Number'));
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
    for (const key of ['id', 'title', 'likes', 'topics', 'difficulty']) {
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
        const titleCell = sheet[xlsx.utils.encode_cell({ r: start.r + i, c: start.c + col.title })];
        const target = titleCell?.l?.Target;
        const url = target && LEETCODE_PROBLEM_URL.test(target) ? target : null;

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

/**
 * Company-tagged problems from a premium Excel export.
 * @param {object[]} meta Output of loadExcelMeta
 * @returns {{ id: string, title: string, companySlugs: string[], count: number }[]}
 */
export function sourcesFromExcel(meta) {
    return meta
        .filter(m => m.CompanyCount > 0)
        .map(m => ({ id: m.Id, title: m.Title, companySlugs: m.Companies, count: m.CompanyCount }));
}

/**
 * Company-tagged problems from global_problem_company_mapping.csv.
 * header: problem_id,problem_name,number_of_companies,list_of_companies
 * @param {string} content CSV text
 * @returns {{ id: string, title: string, companySlugs: string[], count: number }[]}
 */
export function sourcesFromCSV(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    // Skip header
    return lines.slice(1).map(line => {
        const parts = line.split(',');
        if (parts.length < 4) return null;
        // Logic: ID is first, Count is 2nd last, Companies is last.
        const id = parts[0];
        const companies = parts[parts.length - 1]; // bullet list
        const count = parts[parts.length - 2];
        const title = parts.slice(1, parts.length - 2).join(',').trim(); // Re-join title works if comma in name
        const cleanTitle = title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1) : title;
        return {
            id,
            title: cleanTitle,
            companySlugs: companies.split('•').map(c => c.trim()).filter(Boolean),
            count: parseInt(count) || 0,
        };
    }).filter(Boolean);
}

/**
 * Turns a company slug ("american-express" or "American-Express") into a display name.
 * @param {string} slug
 * @returns {string}
 */
export function formatCompany(slug) {
    return slug.toLowerCase().split('-').map(word => {
        if (word === 'ii') return 'II';
        if (word === 'iii') return 'III';
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}
