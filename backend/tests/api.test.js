const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set dummy JWT secret for testing
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// 1. Mock mongoose connection and methods
const mongoose = require('mongoose');
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  actualMongoose.connect = jest.fn().mockResolvedValue(actualMongoose);
  actualMongoose.connection = {
    ...actualMongoose.connection,
    on: jest.fn(),
    once: jest.fn(),
    close: jest.fn().mockResolvedValue(),
  };
  return actualMongoose;
});

// Mock services to prevent external calls
jest.mock('../services/pdf-service', () => ({
  generateCard: jest.fn().mockResolvedValue(Buffer.from('pdf content'))
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../models/Member', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock('../models/Zone', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../models/Request', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../models/AuditLog', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

const app = require('../server');
const Member = require('../models/Member');
const User = require('../models/User');
const Zone = require('../models/Zone');
const Request = require('../models/Request');

// Helper to construct mock query chains
const makeQueryMock = (resolvedValue) => {
  const query = {
    populate: jest.fn().mockImplementation(() => query),
    select: jest.fn().mockImplementation(() => query),
    sort: jest.fn().mockImplementation(() => query),
    limit: jest.fn().mockImplementation(() => query),
    lean: jest.fn().mockImplementation(() => query),
    exec: jest.fn().mockResolvedValue(resolvedValue),
    then: jest.fn().mockImplementation((callback) => Promise.resolve(resolvedValue).then(callback)),
    catch: jest.fn()
  };
  return query;
};

describe('Luhar Samaj Management API Tests', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = jwt.sign({ id: 'admin_id' }, 'test_jwt_secret');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status successfully', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });
  });

  describe('POST /api/auth/login validations', () => {
    it('should reject empty email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: 'password123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('ઈમેલ જરૂરી છે');
    });

    it('should reject invalid email pattern', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'password123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('અમાન્ય ઈમેલ');
    });

    it('should reject password less than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'short' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('પાસવર્ડ ઓછામાં ઓછો 8');
    });
  });

  describe('GET /api/members/adults', () => {
    it('should refuse request without authorization headers', async () => {
      const res = await request(app).get('/api/members/adults');
      expect(res.statusCode).toBe(401);
    });

    it('should return adult members list and filter by gender when provided', async () => {
      const mockUser = { _id: '60d5ec49f83ca5324483a9e1', name: 'Admin', email: 'admin@test.com', role: 'admin' };
      User.findById.mockReturnValue(makeQueryMock(mockUser));

      const mockAdults = [
        {
          _id: '60d5ec49f83ca5324483a9e2_Adult1',
          familyId: '60d5ec49f83ca5324483a9e2',
          headName: 'Head Name',
          memberName: 'Adult Family Member',
          age: 25,
          gender: 'male',
          relation: 'Son',
          mobile: '9876543210',
          address: 'Test Address',
          zone: { _id: '60d5ec49f83ca5324483a9e3', name: 'Zone A', number: 1 }
        }
      ];

      Member.aggregate.mockResolvedValue(mockAdults);

      const res = await request(app)
        .get('/api/members/adults?gender=male')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('memberName', 'Adult Family Member');
      expect(Member.aggregate).toHaveBeenCalled();

      // Verify that the gender match stage is pushed in the pipeline
      const pipeline = Member.aggregate.mock.calls[0][0];
      const matchStage = pipeline.find(stage => stage.$match && stage.$match["adults.gender"] === "male");
      expect(matchStage).toBeDefined();
    });
  });

  describe('POST /api/members validations', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = { _id: '60d5ec49f83ca5324483a9e1', name: 'Admin', email: 'admin@test.com', role: 'admin' };
      User.findById.mockReturnValue(makeQueryMock(mockUser));
      Zone.findById.mockResolvedValue({ _id: '60d5ec49f83ca5324483a9e3', name: 'Zone 1', number: 1 });
    });

    it('should reject member creation with short head name', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          head: { name: 'Ab' },
          uniqueNumber: 101,
          rationNo: '12345',
          mobile: '9876543210',
          address: 'Test Address Min 10 Chars',
          zone: '60d5ec49f83ca5324483a9e3',
          issueDate: '2026-06-20'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('ઓછામાં ઓછું 3 અક્ષરનું');
    });

    it('should reject invalid head name regex (contains special chars)', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          head: { name: 'Vasudev!' },
          uniqueNumber: 101,
          rationNo: '12345',
          mobile: '9876543210',
          address: 'Test Address Min 10 Chars',
          zone: '60d5ec49f83ca5324483a9e3',
          issueDate: '2026-06-20'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('માત્ર અંગ્રેજી અથવા ગુજરાતી અક્ષરો');
    });

    it('should reject non-integer or negative uniqueNumber', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          head: { name: 'Vasudev' },
          uniqueNumber: -5,
          rationNo: '12345',
          mobile: '9876543210',
          address: 'Test Address Min 10 Chars',
          zone: '60d5ec49f83ca5324483a9e3',
          issueDate: '2026-06-20'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('ધન પૂર્ણાંક હોવો જોઈએ');
    });

    it('should reject invalid mobile numbers', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          head: { name: 'Vasudev' },
          uniqueNumber: 101,
          rationNo: '12345',
          mobile: '5555555555',
          address: 'Test Address Min 10 Chars',
          zone: '60d5ec49f83ca5324483a9e3',
          issueDate: '2026-06-20'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('મોબાઇલ નંબર 10 આંકડાનો');
    });

    it('should reject invalid family member details', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          head: { name: 'Vasudev' },
          uniqueNumber: 101,
          rationNo: '12345',
          mobile: '9876543210',
          address: 'Test Address Min 10 Chars',
          zone: '60d5ec49f83ca5324483a9e3',
          issueDate: '2026-06-20',
          familyMembers: [{ name: 'Gopal', relation: 'Son', gender: 'male', age: 150 }]
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('ઉંમર 0 થી 120 ની વચ્ચે');
    });
  });

  describe('POST /api/requests validations & duplicate check', () => {
    it('should reject pending requests if mobile number matches existing pending request', async () => {
      Zone.findById.mockResolvedValue({ _id: '60d5ec49f83ca5324483a9e3', name: 'Zone A' });
      Request.findOne.mockResolvedValue({ _id: 'some_pending_id', status: 'pending' });

      const res = await request(app)
        .post('/api/requests')
        .send({
          head: { name: 'Vasudev' },
          rationNo: '12345',
          mobile: '9876543210',
          address: 'Test Address',
          zone: '60d5ec49f83ca5324483a9e3',
          requestType: 'New Membership'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('પહેલેથી પેન્ડિંગ છે');
    });
  });

  describe('GET /api/dashboard/public-stats', () => {
    it('should return public statistics successfully', async () => {
      Member.countDocuments.mockResolvedValue(5);
      Zone.countDocuments.mockResolvedValue(2);
      Member.aggregate.mockResolvedValue([{ total: 10 }]);

      const res = await request(app).get('/api/dashboard/public-stats');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        totalFamilies: 5,
        totalMembers: 15,
        totalZones: 2,
      });
    });
  });

  describe('PUT /api/requests/:id', () => {
    it('should refuse request without authorization', async () => {
      const res = await request(app).put('/api/requests/req_id_123');
      expect(res.statusCode).toBe(401);
    });

    it('should successfully edit a request with valid inputs', async () => {
      const mockUser = { _id: '60d5ec49f83ca5324483a9e1', name: 'Admin', email: 'admin@test.com', role: 'admin' };
      User.findById.mockReturnValue(makeQueryMock(mockUser));
      Zone.findById.mockResolvedValue({ _id: '60d5ec49f83ca5324483a9e3', name: 'Zone 1', number: 1 });

      const mockRequestDoc = {
        _id: 'req_id_123',
        head: { name: 'Old Name' },
        rationNo: 'Old Ration',
        address: 'Old Address 1234567890',
        mobile: '9876543210',
        zone: '60d5ec49f83ca5324483a9e3',
        familyMembers: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Request.findById.mockResolvedValue(mockRequestDoc);
      Member.findOne.mockResolvedValue(null);
      Request.findOne.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/requests/req_id_123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          head: { name: 'New Name' },
          rationNo: 'New Ration 123',
          mobile: '9999999999',
          address: 'New Address Min 10 Chars',
          zone: '60d5ec49f83ca5324483a9e3',
          familyMembers: [{ name: 'Family member', relation: 'Son', gender: 'male', age: 10 }],
          uniqueNumber: 42,
          issueDate: '2026-06-20',
        });

      expect(res.statusCode).toBe(200);
      expect(mockRequestDoc.head.name).toBe('New Name');
      expect(mockRequestDoc.uniqueNumber).toBe(42);
      expect(mockRequestDoc.save).toHaveBeenCalled();
    });
  });

  describe('Deleted Members Recovery Module & CSV Exports', () => {
    let adminUser, normalUser, normalToken;
    const validMemberId1 = '60d5ec49f83ca5324483a9e2';
    const validMemberId2 = '60d5ec49f83ca5324483a9e4';

    beforeEach(() => {
      adminUser = { _id: 'admin_id', name: 'Admin User', email: 'admin@test.com', role: 'admin' };
      normalUser = { _id: 'normal_id', name: 'Normal User', email: 'normal@test.com', role: 'member' };
      normalToken = jwt.sign({ id: 'normal_id' }, 'test_jwt_secret');
    });

    it('should allow GET /api/members/deleted with correct sorting', async () => {
      User.findById.mockReturnValue(makeQueryMock(adminUser));
      const mockDeletedMembers = [
        { _id: validMemberId1, uniqueNumber: 1, head: { name: 'Member 1' }, isDeleted: true },
        { _id: validMemberId2, uniqueNumber: 2, head: { name: 'Member 2' }, isDeleted: true }
      ];
      Member.find.mockReturnValue(makeQueryMock(mockDeletedMembers));

      const res = await request(app)
        .get('/api/members/deleted')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(Member.find).toHaveBeenCalledWith({ isDeleted: true });
    });

    it('should refuse restore if the user is not an admin', async () => {
      User.findById.mockReturnValue(makeQueryMock(normalUser));
      const res = await request(app)
        .put(`/api/members/${validMemberId1}/restore`)
        .set('Authorization', `Bearer ${normalToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('admins');
    });

    it('should allow restore if the user is an admin', async () => {
      User.findById.mockReturnValue(makeQueryMock(adminUser));
      Member.findById.mockReturnValue(makeQueryMock({ _id: validMemberId1, isDeleted: true, uniqueNumber: 1 }));
      Member.findOne.mockResolvedValue(null);
      Member.findByIdAndUpdate.mockResolvedValue({ _id: validMemberId1, isDeleted: false, toObject: () => ({ _id: validMemberId1 }) });

      const res = await request(app)
        .put(`/api/members/${validMemberId1}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ requestNumber: '1234', reason: 'Restoring for test' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('restored successfully');
    });

    it('should refuse permanent delete if the user is not an admin', async () => {
      User.findById.mockReturnValue(makeQueryMock(normalUser));
      const res = await request(app)
        .delete(`/api/members/${validMemberId1}/permanent`)
        .set('Authorization', `Bearer ${normalToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should allow permanent delete if the user is an admin', async () => {
      User.findById.mockReturnValue(makeQueryMock(adminUser));
      Member.findById.mockReturnValue(makeQueryMock({ _id: validMemberId1, isDeleted: true }));
      Member.findByIdAndDelete.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/members/${validMemberId1}/permanent`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('permanently deleted successfully');
    });

    it('should export deleted members to CSV with UTF-8 BOM', async () => {
      User.findById.mockReturnValue(makeQueryMock(adminUser));
      const mockDeletedMembers = [
        { _id: validMemberId1, uniqueNumber: 1, head: { name: 'Member 1' }, isDeleted: true, mobile: '123', address: 'Addr 1' }
      ];
      Member.find.mockReturnValue(makeQueryMock(mockDeletedMembers));

      const res = await request(app)
        .get('/api/export/deleted/csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.text.startsWith('\ufeff')).toBe(true);
    });
  });

  describe('GET /api/members/:id/pdf & card routes', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = { _id: '60d5ec49f83ca5324483a9e1', name: 'Admin', email: 'admin@test.com', role: 'admin' };
      User.findById.mockReturnValue(makeQueryMock(mockUser));
    });

    it('should return PDF with attachment by default for /members/:id/pdf', async () => {
      const mockMember = { _id: '60d5ec49f83ca5324483a9e2', uniqueNumber: 42, head: { name: 'Vasudev Kava' }, isDeleted: false };
      Member.findById.mockResolvedValue(mockMember);

      const res = await request(app)
        .get('/api/members/60d5ec49f83ca5324483a9e2/pdf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('LGS-SK-42.pdf');
    });

    it('should return PDF with inline disposition for /members/:id/pdf?preview=true', async () => {
      const mockMember = { _id: '60d5ec49f83ca5324483a9e2', uniqueNumber: 42, head: { name: 'Vasudev Kava' }, isDeleted: false };
      Member.findById.mockResolvedValue(mockMember);

      const res = await request(app)
        .get('/api/members/60d5ec49f83ca5324483a9e2/pdf?preview=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toBe('inline');
    });

    it('should return PDF with attachment for /members/:id/card/download', async () => {
      const mockMember = { _id: '60d5ec49f83ca5324483a9e2', uniqueNumber: 42, head: { name: 'Vasudev Kava' }, isDeleted: false };
      Member.findById.mockResolvedValue(mockMember);

      const res = await request(app)
        .get('/api/members/60d5ec49f83ca5324483a9e2/card/download')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('LGS-SK-42.pdf');
    });
  });
});
