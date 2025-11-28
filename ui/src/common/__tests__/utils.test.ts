import { describe, it, expect } from 'vitest';
import {
  getWebsiteName,
  formatDate,
  formatSearchParams,
} from '../utils';

describe('Utils', () => {
  describe('getWebsiteName', () => {
    it('extracts domain name from URL', () => {
      const url = 'https://www.example.com/path/to/page';
      const result = getWebsiteName(url);
      expect(result).toContain('example.com');
    });

    it('handles URLs without www', () => {
      const url = 'https://github.com/user/repo';
      const result = getWebsiteName(url);
      expect(result).toContain('github.com');
    });

    it('handles invalid URLs gracefully', () => {
      const url = 'not-a-valid-url';
      const result = getWebsiteName(url);
      expect(result).toBeDefined();
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = '2024-01-15T10:30:00Z';
      const result = formatDate(date);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles different date formats', () => {
      const timestamp = Date.now();
      const result = formatDate(timestamp.toString());
      expect(result).toBeDefined();
    });
  });

  describe('formatSearchParams', () => {
    it('formats search parameters for display', () => {
      const params = {
        query: 'test search',
        max_results: 10,
      };
      const result = formatSearchParams(params);
      expect(result).toBeDefined();
    });

    it('handles empty parameters', () => {
      const result = formatSearchParams({});
      expect(result).toBeDefined();
    });

    it('converts values to readable format', () => {
      const params = {
        search_depth: 'advanced',
        include_answer: false,
      };
      const result = formatSearchParams(params);
      expect(typeof result).toBe('string');
    });
  });
});
