
import { describe, it, expect } from 'vitest';
import xlsx from 'xlsx';
import { loadExcelMeta, sourcesFromExcel, sourcesFromCSV, formatCompany } from './data_sources';

const BANNER = [['✨ LeetCode Problems Database ✨'], ['📺 YouTube Channel'], ['💻 GitHub']];
const BASE_HEADER = ['Problem Number', 'Problem Name', 'Likes', 'Dislikes', 'Like/Dislike Ratio', 'Acceptance Rate', 'Topics', 'Pattern', 'LeetCode Difficulty Level', 'Suggested Difficulty Level'];

// Builds a workbook shaped like the scraper's export: banner rows, header, data rows
function makeWorkbook(header, dataRows, { origin = 'A1', links = {} } = {}) {
    const sheet = xlsx.utils.aoa_to_sheet([...BANNER, header, ...dataRows], { origin });
    for (const [address, target] of Object.entries(links)) sheet[address].l = { Target: target };
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, sheet, 'All Problems');
    return wb;
}

describe('loadExcelMeta', () => {

    it('reads a standard export without company columns', () => {
        const wb = makeWorkbook(BASE_HEADER, [
            [1, 'Two Sum', 100, 5, 20, '50%', 'Array, Hash Table', 'Hash Map', 'Easy', 'Very Easy'],
        ], { links: { B5: 'https://leetcode.com/problems/two-sum/' } });

        const { meta, hasCompanies } = loadExcelMeta(wb);
        expect(hasCompanies).toBe(false);
        expect(meta).toHaveLength(1);
        expect(meta[0]).toMatchObject({
            Id: '1',
            Title: 'Two Sum',
            Difficulty: 'Very Easy',
            Topic: 'Array',
            relatedTopics: [{ name: 'Array' }, { name: 'Hash Table' }],
            Likes: 100,
            Url: 'https://leetcode.com/problems/two-sum/',
            Companies: [],
        });
    });

    it('reads company columns from a premium export', () => {
        const wb = makeWorkbook([...BASE_HEADER, 'Company Count', 'Companies List'], [
            [146, 'LRU Cache', 50, 1, 50, '40%', 'Design', 'Hash Map', 'Medium', 'Medium', 2, 'Amazon, Goldman-Sachs'],
        ]);
        const { meta, hasCompanies } = loadExcelMeta(wb);
        expect(hasCompanies).toBe(true);
        expect(meta[0].CompanyCount).toBe(2);
        expect(meta[0].Companies).toEqual(['Amazon', 'Goldman-Sachs']);
    });

    it('keeps hyperlinks aligned across blank rows and a sheet not starting at A1', () => {
        const wb = makeWorkbook(BASE_HEADER, [
            [1, 'Two Sum', 1, 0, 0, '', 'Array', '', 'Easy', 'Easy'],
            [],
            [3, 'Longest Substring Without Repeating Characters', 1, 0, 0, '', 'String', '', 'Medium', 'Medium'],
        ], {
            origin: 'B2', // banner starts at B2, so header is row 5 and titles are in column C
            links: {
                C6: 'https://leetcode.com/problems/two-sum/',
                C8: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
            },
        });
        const { meta } = loadExcelMeta(wb);
        expect(meta.map(m => m.Url)).toEqual([
            'https://leetcode.com/problems/two-sum/',
            'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
        ]);
    });

    it('ignores hyperlinks that are not LeetCode problem pages', () => {
        const wb = makeWorkbook(BASE_HEADER, [
            [1, 'Two Sum', 1, 0, 0, '', 'Array', '', 'Easy', 'Easy'],
            [2, 'Add Two Numbers', 1, 0, 0, '', 'Math', '', 'Medium', 'Medium'],
        ], { links: { B5: 'javascript:alert(1)', B6: 'https://example.com/problems/add-two-numbers/' } });
        const { meta } = loadExcelMeta(wb);
        expect(meta.map(m => m.Url)).toEqual([null, null]);
    });

    it('fails loudly when a required column is missing', () => {
        const header = BASE_HEADER.filter(h => h !== 'Suggested Difficulty Level');
        expect(() => loadExcelMeta(makeWorkbook(header, []))).toThrow(/difficulty/);
        expect(() => loadExcelMeta(makeWorkbook(['Something else'], []))).toThrow(/Problem Number/);
    });
});

describe('sourcesFromExcel', () => {
    it('keeps only problems asked by at least one company', () => {
        const meta = [
            { Id: '1', Title: 'Two Sum', CompanyCount: 2, Companies: ['Amazon', 'Google'] },
            { Id: '2', Title: 'Untagged', CompanyCount: 0, Companies: [] },
        ];
        expect(sourcesFromExcel(meta)).toEqual([
            { id: '1', title: 'Two Sum', companySlugs: ['Amazon', 'Google'], count: 2 },
        ]);
    });
});

describe('sourcesFromCSV', () => {
    it('parses bullet-separated companies and titles containing commas', () => {
        const csv = [
            'problem_id,problem_name,number_of_companies,list_of_companies',
            '1,Two Sum,2,amazon • goldman-sachs',
            '50,"Pow(x, n)",1,google',
            '',
        ].join('\n');
        expect(sourcesFromCSV(csv)).toEqual([
            { id: '1', title: 'Two Sum', companySlugs: ['amazon', 'goldman-sachs'], count: 2 },
            { id: '50', title: 'Pow(x, n)', companySlugs: ['google'], count: 1 },
        ]);
    });
});

describe('formatCompany', () => {
    it('formats CSV slugs and premium title-cased slugs identically', () => {
        expect(formatCompany('american-express')).toBe('American Express');
        expect(formatCompany('American-Express')).toBe('American Express');
        expect(formatCompany('Morgan-Stanley-II')).toBe('Morgan Stanley II');
    });
});
