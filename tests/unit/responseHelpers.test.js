const { sendSuccess, sendError } = require('../../src/utils/responseHelpers');

describe('Response Helpers', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendSuccess', () => {
    test('should send success response with data', () => {
      mockRes.req = { 
        query: { locale: 'en' },
        headers: { 'accept-language': 'en' } 
      };
      const data = { id: 1, name: 'Test' };

      sendSuccess(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: 'Test' }
      });
    });

    test('should send success response with custom status code', () => {
      mockRes.req = { 
        query: { locale: 'en' },
        headers: { 'accept-language': 'en' } 
      };
      const data = { id: 1 };

      sendSuccess(mockRes, data, null, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 }
      });
    });
  });

  describe('sendError', () => {
    test('should send error response with message', () => {
      mockRes.req = { 
        query: { locale: 'en' },
        headers: { 'accept-language': 'en' } 
      };

      sendError(mockRes, 'VALIDATION_FAILED', 400);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String)
      });
    });

    test('should send error response with default 500 status', () => {
      mockRes.req = { 
        query: { locale: 'en' },
        headers: { 'accept-language': 'en' } 
      };

      sendError(mockRes, 'SERVER_ERROR');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String)
      });
    });
  });
});