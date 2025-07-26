import { createHTTPClient, buildURL, validateResponse } from '../../../src/utils/http';
import { AxiosResponse } from 'axios';

describe('HTTP Utils', () => {
  describe('createHTTPClient', () => {
    it('should create HTTP client with provided config', () => {
      const config = {
        timeout: 5000,
        maxRedirects: 3,
        validateSSL: true
      };
      
      const client = createHTTPClient(config);
      
      expect(client).toBeDefined();
      expect(client.defaults.timeout).toBe(5000);
      expect(client.defaults.maxRedirects).toBe(3);
    });

    it('should create HTTP client with SSL validation disabled', () => {
      const config = {
        timeout: 10000,
        maxRedirects: 5,
        validateSSL: false
      };
      
      const client = createHTTPClient(config);
      expect(client).toBeDefined();
    });
  });

  describe('buildURL', () => {
    it('should build URL with base and path', () => {
      const url = buildURL('https://api.example.com', '/v1/users');
      expect(url).toBe('https://api.example.com/v1/users');
    });

    it('should build URL with query parameters', () => {
      const params = { limit: '10', offset: '20', sort: 'name' };
      const url = buildURL('https://api.example.com', '/v1/users', params);
      
      expect(url).toContain('https://api.example.com/v1/users');
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
      expect(url).toContain('sort=name');
    });

    it('should handle empty parameters', () => {
      const url = buildURL('https://api.example.com', '/v1/users', {});
      expect(url).toBe('https://api.example.com/v1/users');
    });

    it('should handle undefined parameters', () => {
      const url = buildURL('https://api.example.com', '/v1/users');
      expect(url).toBe('https://api.example.com/v1/users');
    });

    it('should properly encode special characters in parameters', () => {
      const params = { q: 'user@example.com', filter: 'status=active' };
      const url = buildURL('https://api.example.com', '/search', params);
      
      expect(url).toContain('https://api.example.com/search');
      expect(url).toContain('q=user%40example.com');
      expect(url).toContain('filter=status%3Dactive');
    });

    it('should handle paths with leading slash', () => {
      const url = buildURL('https://api.example.com/', '/v1/users');
      expect(url).toBe('https://api.example.com/v1/users');
    });

    it('should handle paths without leading slash', () => {
      const url = buildURL('https://api.example.com', 'v1/users');
      expect(url).toBe('https://api.example.com/v1/users');
    });
  });

  describe('validateResponse', () => {
    it('should pass for successful status codes', () => {
      const responses = [
        { status: 200, statusText: 'OK' },
        { status: 201, statusText: 'Created' },
        { status: 204, statusText: 'No Content' },
        { status: 299, statusText: 'Success' }
      ];

      responses.forEach(response => {
        expect(() => validateResponse(response as AxiosResponse)).not.toThrow();
      });
    });

    it('should throw for client error status codes', () => {
      const responses = [
        { status: 400, statusText: 'Bad Request' },
        { status: 401, statusText: 'Unauthorized' },
        { status: 404, statusText: 'Not Found' },
        { status: 422, statusText: 'Unprocessable Entity' }
      ];

      responses.forEach(response => {
        expect(() => validateResponse(response as AxiosResponse))
          .toThrow(`HTTP ${response.status}: ${response.statusText}`);
      });
    });

    it('should throw for server error status codes', () => {
      const responses = [
        { status: 500, statusText: 'Internal Server Error' },
        { status: 502, statusText: 'Bad Gateway' },
        { status: 503, statusText: 'Service Unavailable' }
      ];

      responses.forEach(response => {
        expect(() => validateResponse(response as AxiosResponse))
          .toThrow(`HTTP ${response.status}: ${response.statusText}`);
      });
    });

    it('should throw for redirections without proper handling', () => {
      const responses = [
        { status: 301, statusText: 'Moved Permanently' },
        { status: 302, statusText: 'Found' },
        { status: 304, statusText: 'Not Modified' }
      ];

      responses.forEach(response => {
        expect(() => validateResponse(response as AxiosResponse))
          .toThrow(`HTTP ${response.status}: ${response.statusText}`);
      });
    });
  });
}); 