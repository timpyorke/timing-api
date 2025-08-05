const { buildWhereClause, buildOrderByClause, buildPaginationClause } = require('../../src/utils/queryOptimizer');

describe('Query Optimizer', () => {
  describe('buildWhereClause', () => {
    test('should build WHERE clause with multiple filters', () => {
      const filters = {
        status: 'pending',
        active: true,
        date: '2023-07-01'
      };

      const result = buildWhereClause(filters);

      expect(result.whereClause).toBe('WHERE status = $1 AND active = $2 AND DATE(o.created_at) = $3');
      expect(result.values).toEqual(['pending', true, '2023-07-01']);
      expect(result.nextParamIndex).toBe(4);
    });

    test('should handle empty filters', () => {
      const result = buildWhereClause({});

      expect(result.whereClause).toBe('');
      expect(result.values).toEqual([]);
      expect(result.nextParamIndex).toBe(1);
    });

    test('should skip null and undefined values', () => {
      const filters = {
        status: 'pending',
        active: null,
        category: undefined,
        customer_id: ''
      };

      const result = buildWhereClause(filters);

      expect(result.whereClause).toBe('WHERE status = $1');
      expect(result.values).toEqual(['pending']);
    });
  });

  describe('buildOrderByClause', () => {
    test('should build valid ORDER BY clause', () => {
      const result = buildOrderByClause('created_at', 'ASC', ['created_at', 'id', 'status']);

      expect(result).toBe('ORDER BY created_at ASC');
    });

    test('should use default ordering for invalid column', () => {
      const result = buildOrderByClause('invalid_column', 'ASC', ['created_at', 'id']);

      expect(result).toBe('ORDER BY created_at DESC');
    });

    test('should validate sort order', () => {
      const result = buildOrderByClause('created_at', 'INVALID', ['created_at']);

      expect(result).toBe('ORDER BY created_at DESC');
    });
  });

  describe('buildPaginationClause', () => {
    test('should build pagination clause with valid parameters', () => {
      const result = buildPaginationClause(2, 10, 50);

      expect(result.limitClause).toBe('LIMIT 10 OFFSET 10');
      expect(result.offset).toBe(10);
      expect(result.limit).toBe(10);
    });

    test('should handle invalid page number', () => {
      const result = buildPaginationClause(-1, 10);

      expect(result.limitClause).toBe('LIMIT 10 OFFSET 0');
      expect(result.offset).toBe(0);
    });

    test('should enforce maximum page size', () => {
      const result = buildPaginationClause(1, 200, 50);

      expect(result.limitClause).toBe('LIMIT 50 OFFSET 0');
      expect(result.limit).toBe(50);
    });
  });
});