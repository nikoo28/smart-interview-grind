
import { describe, it, expect } from 'vitest';
import { estimateTime, getLeetCodeURL, findLatestExcel } from './problem_utils';

const SAMPLE_TITLES = ['Two Sum', 'LRU Cache', 'Median of Two Sorted Arrays', 'Trapping Rain Water', 'Valid Parentheses', 'Word Ladder'];

const range = (difficulty) => {
    const times = SAMPLE_TITLES.map(t => estimateTime(difficulty, t));
    return { min: Math.min(...times), max: Math.max(...times) };
};

describe('estimateTime', () => {

    it('is deterministic for the same title', () => {
        expect(estimateTime('Medium', 'Two Sum')).toBe(estimateTime('Medium', 'Two Sum'));
    });

    it('keeps every difficulty within its band', () => {
        expect(range('Very Easy').min).toBeGreaterThanOrEqual(10);
        expect(range('Very Easy').max).toBeLessThanOrEqual(15);
        expect(range('Very Hard').min).toBeGreaterThanOrEqual(61);
        expect(range('Very Hard').max).toBeLessThanOrEqual(119);
    });

    it('orders difficulties by time: Very Hard > Hard and Very Easy <= Easy', () => {
        for (const t of SAMPLE_TITLES) {
            expect(estimateTime('Very Hard', t)).toBeGreaterThan(estimateTime('Hard', t));
            expect(estimateTime('Very Easy', t)).toBeLessThanOrEqual(estimateTime('Easy', t) + 2);
        }
    });

    it('never goes below 10 minutes', () => {
        for (const t of SAMPLE_TITLES) {
            expect(estimateTime('Easy', t)).toBeGreaterThanOrEqual(10);
            expect(estimateTime('Unknown', t)).toBeGreaterThanOrEqual(10);
        }
    });
});

describe('getLeetCodeURL', () => {

    it('slugifies a simple title', () => {
        expect(getLeetCodeURL('Two Sum')).toBe('https://leetcode.com/problems/two-sum/');
    });

    it('collapses " - " into a single dash', () => {
        expect(getLeetCodeURL('Two Sum II - Input Array Is Sorted'))
            .toBe('https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/');
        expect(getLeetCodeURL('Insert Delete GetRandom O(1) - Duplicates allowed'))
            .toBe('https://leetcode.com/problems/insert-delete-getrandom-o1-duplicates-allowed/');
    });

    it('drops special characters', () => {
        expect(getLeetCodeURL('Pow(x, n)')).toBe('https://leetcode.com/problems/powx-n/');
    });
});

describe('findLatestExcel', () => {
    const PREFIX = 'leetcode_problems_';

    it('picks the newest export by timestamp, premium or not', () => {
        const files = [
            'leetcode_problems_20260226_145400.xlsx',
            'leetcode_problems_premium_20260816_154438.xlsx',
            'leetcode_problems_20260805_190941.xlsx',
            'global_problem_company_mapping.csv',
        ];
        expect(findLatestExcel(files, PREFIX)).toBe('leetcode_problems_premium_20260816_154438.xlsx');
    });

    it('treats a date-only name as the start of that day', () => {
        const files = ['leetcode_problems_20260816_154438.xlsx', 'leetcode_problems_20260901.xlsx', 'leetcode_problems_20260816.xlsx'];
        expect(findLatestExcel(files, PREFIX)).toBe('leetcode_problems_20260901.xlsx');
    });

    it('returns undefined when there is no export', () => {
        expect(findLatestExcel(['secret.key', 'notes.xlsx'], PREFIX)).toBeUndefined();
    });
});
