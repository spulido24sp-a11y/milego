import { describe, it, expect } from 'vitest';
import { success, paginated, created, AppError } from '../../utils/response.js';

describe('API Contract: Response Format', () => {
  const mockRes = {
    status: (code) => ({
      json: (data) => data
    })
  };

  it('success response has success: true and data', () => {
    const result = success(mockRes, { foo: 'bar' });
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
    expect(result.data).toEqual({ foo: 'bar' });
  });

  it('paginated response has meta with page, per_page, total', () => {
    const result = paginated(mockRes, [{ id: 1 }], 1, 20, 50);
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('meta');
    expect(result.meta).toHaveProperty('page', 1);
    expect(result.meta).toHaveProperty('per_page', 20);
    expect(result.meta).toHaveProperty('total', 50);
  });

  it('created response returns 201', () => {
    const result = created({ ...mockRes, status: (code) => ({ json: (data) => ({ ...data, _status: code }) }) }, { id: 1 });
    expect(result).toHaveProperty('success', true);
  });

  it('AppError has code, message, statusCode', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err).toHaveProperty('code', 'NOT_FOUND');
    expect(err).toHaveProperty('statusCode', 404);
    expect(err).toHaveProperty('message', 'Not found');
  });

  it('AppError can include details', () => {
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR', [{ field: 'email', message: 'Invalid' }]);
    expect(err.details).toHaveLength(1);
    expect(err.details[0].field).toBe('email');
  });

  it('error response by the handler includes correlation_id', async () => {
    const { errorHandler } = await import('../../middlewares/errorHandler.js');
    const mockReq = { correlationId: 'test-cid-123', log: { error: () => {} } };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          expect(data).toHaveProperty('correlation_id', 'test-cid-123');
          expect(data).toHaveProperty('success', false);
          expect(data.error).toHaveProperty('code');
          expect(data.error).toHaveProperty('message');
        }
      })
    };
    errorHandler(new AppError('Test error', 400, 'TEST_ERROR'), mockReq, mockRes);
  });
});