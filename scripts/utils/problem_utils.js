
// Minutes = base ± variance (deterministic per title), floored at 10
const TIME_PROFILES = {
    'Very Easy': { base: 12, variance: 4 },  // 10-15
    'Easy': { base: 15, variance: 10 },      // 10-24
    'Medium': { base: 35, variance: 20 },    // 16-54
    'Hard': { base: 60, variance: 30 },      // 31-89
    'Very Hard': { base: 90, variance: 30 }, // 61-119
};
const DEFAULT_PROFILE = { base: 30, variance: 10 };

/**
 * Estimates solve time in minutes for a problem.
 * @param {string} difficulty Suggested difficulty (Very Easy .. Very Hard)
 * @param {string} title Used as a seed so the estimate is stable between runs
 * @returns {number}
 */
export function estimateTime(difficulty, title) {
    const { base, variance } = TIME_PROFILES[difficulty] || DEFAULT_PROFILE;

    // Consistent hash for deterministic variation
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = ((hash << 5) - hash) + title.charCodeAt(i);
        hash |= 0;
    }
    const offset = Math.abs(hash) % variance;
    const final = base + (hash % 2 === 0 ? offset : -offset);
    return Math.max(10, final);
}

/**
 * Builds a LeetCode problem URL from its title.
 * Fallback only: prefer the hyperlink from the Excel export when available.
 * @param {string} title e.g. "Two Sum II - Input Array Is Sorted"
 * @returns {string}
 */
export function getLeetCodeURL(title) {
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove special chars
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-'); // " - " would otherwise become "---"
    return `https://leetcode.com/problems/${slug}/`;
}

/**
 * Picks the newest Excel export, using the YYYYMMDD_HHMMSS stamp in the file name.
 * @param {string[]} files File names in the admin folder
 * @param {string} prefix e.g. "leetcode_problems_"
 * @returns {string|undefined}
 */
export function findLatestExcel(files, prefix) {
    const stamp = (f) => (f.match(/(\d{8}_\d{6})/) || [])[1] || '';
    return files
        .filter(f => f.startsWith(prefix) && f.endsWith('.xlsx'))
        .sort((a, b) => stamp(b).localeCompare(stamp(a)))[0];
}
