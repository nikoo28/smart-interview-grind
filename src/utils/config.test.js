import { describe, it, expect } from 'vitest';
import { pruneConfig } from './config';

const problems = [
    { companies: ['Google', 'Palantir'], relatedTopics: [{ name: 'Array' }, { name: 'Graph Theory' }] },
    { companies: ['Amazon'], relatedTopics: [{ name: 'String' }] },
];

const baseConfig = {
    weeks: 4,
    hoursPerWeek: 6,
    selectedDifficulties: ['Medium'],
    selectedCompanies: [],
    selectedTopics: [],
    experienceLevel: 'Intermediate'
};

describe('pruneConfig', () => {

    it('drops companies and topics that no longer exist in the data', () => {
        const config = { ...baseConfig, selectedCompanies: ['Google', 'Palantir Technologies'], selectedTopics: ['Array', 'Graph'] };
        const pruned = pruneConfig(config, problems);
        expect(pruned.selectedCompanies).toEqual(['Google']);
        expect(pruned.selectedTopics).toEqual(['Array']);
        expect(pruned.weeks).toBe(4);
    });

    it('returns the same object when every selection is still valid', () => {
        const config = { ...baseConfig, selectedCompanies: ['Amazon'], selectedTopics: ['Graph Theory'] };
        expect(pruneConfig(config, problems)).toBe(config);
    });

    it('handles configs saved without selectedTopics', () => {
        const config = { ...baseConfig, selectedCompanies: ['At T'] };
        delete config.selectedTopics;
        expect(pruneConfig(config, problems)).toMatchObject({ selectedCompanies: [], selectedTopics: [] });
    });
});
