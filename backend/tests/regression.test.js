const request = require('supertest');
const jwt = require('jsonwebtoken');

// Configure test environment variables
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test_regression';

// 1. Mock PDFKit to intercept drawing operations (Golden PDF Regression)
const mockDrawingCalls = [];
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const doc = {
      on: jest.fn(),
      registerFont: jest.fn(),
      image: jest.fn().mockImplementation((path, x, y, options) => {
        mockDrawingCalls.push({ type: 'image', path, x, y, options });
        return doc;
      }),
      text: jest.fn().mockImplementation((text, x, y, options) => {
        mockDrawingCalls.push({ type: 'text', text, x, y, options });
        return doc;
      }),
      font: jest.fn().mockImplementation((name) => {
        mockDrawingCalls.push({ type: 'font', name });
        return doc;
      }),
      fontSize: jest.fn().mockImplementation((size) => {
        mockDrawingCalls.push({ type: 'fontSize', size });
        return doc;
      }),
      fillColor: jest.fn().mockImplementation((color) => {
        mockDrawingCalls.push({ type: 'fillColor', color });
        return doc;
      }),
      opacity: jest.fn().mockImplementation((val) => {
        mockDrawingCalls.push({ type: 'opacity', val });
        return doc;
      }),
      save: jest.fn().mockImplementation(() => {
        mockDrawingCalls.push({ type: 'save' });
        return doc;
      }),
      restore: jest.fn().mockImplementation(() => {
        mockDrawingCalls.push({ type: 'restore' });
        return doc;
      }),
      rect: jest.fn().mockImplementation((x, y, w, h) => {
        mockDrawingCalls.push({ type: 'rect', x, y, w, h });
        return doc;
      }),
      fill: jest.fn().mockImplementation((color) => {
        mockDrawingCalls.push({ type: 'fill', color });
        return doc;
      }),
      translate: jest.fn().mockImplementation((x, y) => {
        mockDrawingCalls.push({ type: 'translate', x, y });
        return doc;
      }),
      rotate: jest.fn().mockImplementation((angle) => {
        mockDrawingCalls.push({ type: 'rotate', angle });
        return doc;
      }),
      widthOfString: jest.fn().mockReturnValue(50),
      end: jest.fn().mockImplementation(() => {
        process.nextTick(() => {
          if (doc.on.mock.calls) {
            const dataCallback = doc.on.mock.calls.find(c => c[0] === 'data')?.[1];
            const endCallback = doc.on.mock.calls.find(c => c[0] === 'end')?.[1];
            if (dataCallback) dataCallback(Buffer.from('%PDF-1.4 mock pdf structure'));
            if (endCallback) endCallback();
          }
        });
      }),
    };
    return doc;
  });
});

// 2. Mock mongoose connection
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

// Load express server and models
const app = require('../server');
const Member = require('../models/Member');
const User = require('../models/User');

// Mock all Mongoose models
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
  countDocuments: jest.fn(),
}));

jest.mock('../models/AuditLog', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

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

describe('Regression & Compatibility Test Suite', () => {
  let adminToken;
  const pdfService = require('../services/pdf-service');

  beforeAll(() => {
    adminToken = jwt.sign({ id: 'admin_id' }, 'test_jwt_secret');
  });

  beforeEach(() => {
    mockDrawingCalls.length = 0;
    jest.clearAllMocks();
  });

  describe('1. Golden PDF Regression Tests', () => {
    const mockZone = { name: 'Savarkundla Zone 1', number: 1 };

    it('should match old PDF positions and dimensions exactly (Old Member layout)', async () => {
      const oldMember = {
        _id: '60d5ec49f83ca5324483a9e2',
        uniqueNumber: 101,
        head: { name: 'Ramnikbhai Luhar' },
        address: 'Main Bazar Road',
        city: 'Savarkundla',
        pincode: '364515',
        mobile: '9988776655',
        zone: mockZone,
        createdAt: new Date('2024-05-15'),
        issueDate: new Date('2024-05-15')
      };

      Member.findById.mockReturnValue(makeQueryMock(oldMember));

      const buffer = await pdfService.generateCard('60d5ec49f83ca5324483a9e2');
      expect(buffer.toString()).toContain('%PDF');

      // Verify template image call
      const templateCall = mockDrawingCalls.find(c => c.type === 'image' && c.path.includes('card_template.png'));
      expect(templateCall).toBeDefined();
      expect(templateCall.x).toBe(10);
      expect(templateCall.y).toBe(10);
      expect(templateCall.options.width).toBeCloseTo(242.64);
      expect(templateCall.options.height).toBeCloseTo(306.72);

      // Verify stamp calls (expect opacity 0.2 watermarks)
      const opacityCalls = mockDrawingCalls.filter(c => c.type === 'opacity' && c.val === 0.2);
      expect(opacityCalls.length).toBe(2);

      // Verify vertical issue date is rotated and translated
      const translateCall = mockDrawingCalls.find(c => c.type === 'translate');
      expect(translateCall).toBeDefined();
      expect(mockDrawingCalls.find(c => c.type === 'rotate' && c.angle === -90)).toBeDefined();
    });

    it('should layout families vertical coordinates correctly', async () => {
      const familyMember = {
        _id: '60d5ec49f83ca5324483a9e3',
        uniqueNumber: 102,
        head: { name: 'Kishorbhai Luhar' },
        address: 'Bazar Road',
        mobile: '9900881122',
        zone: mockZone,
        familyMembers: [
          { name: 'Pushpaben Luhar', relation: 'Wife', age: 48 },
          { name: 'Amitbhai Luhar', relation: 'Son', age: 24 }
        ],
        createdAt: new Date('2025-06-10'),
        issueDate: new Date('2025-06-10')
      };

      Member.findById.mockReturnValue(makeQueryMock(familyMember));

      await pdfService.generateCard('60d5ec49f83ca5324483a9e3');

      // Check drawing calls for family names
      const wifeCall = mockDrawingCalls.find(c => c.type === 'text' && typeof c.text === 'string' && c.text.includes('Pushpaben Luhar'));
      const sonCall = mockDrawingCalls.find(c => c.type === 'text' && typeof c.text === 'string' && c.text.includes('Amitbhai Luhar'));
      expect(wifeCall).toBeDefined();
      expect(sonCall).toBeDefined();

      // Check relation and age center-aligned properties
      const relationCalls = mockDrawingCalls.filter(c => c.type === 'text' && c.options && c.options.align === 'center');
      expect(relationCalls.length).toBe(6);
    });
  });

  describe('2. Existing Database Compatibility Tests', () => {
    it('should safely handle old mongo documents without head.age and without rationCard', async () => {
      const mockUser = { _id: 'admin_id', name: 'Admin', email: 'admin@test.com', role: 'admin' };
      User.findById.mockReturnValue(makeQueryMock(mockUser));

      // Old member missing new optional schemas fields completely
      const legacyMember = {
        _id: '60d5ec49f83ca5324483a9e2',
        headName: 'Sureshbhai Luhar',
        head: { name: 'Sureshbhai' }, // missing age
        familyMembers: [
          { name: 'Gopal', relation: 'Son' } // missing age
        ],
        isDeleted: false
      };

      Member.find.mockReturnValue(makeQueryMock([legacyMember]));

      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body[0]).toHaveProperty('_id');
    });
  });

  describe('3. Soft Delete Verification', () => {
    it('should hide soft deleted members from general listing and include in deleted only', async () => {
      const mockUser = { _id: 'admin_id', name: 'Admin', email: 'admin@test.com', role: 'admin' };
      User.findById.mockReturnValue(makeQueryMock(mockUser));

      const activeMember = { _id: 'active_id', isDeleted: false };
      const deletedMember = { _id: 'deleted_id', isDeleted: true };

      Member.find.mockImplementation((query) => {
        if (query && query.isDeleted === true) {
          return makeQueryMock([deletedMember]);
        }
        return makeQueryMock([activeMember]);
      });

      const resNormal = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resNormal.statusCode).toBe(200);
      expect(resNormal.body.some(m => m._id === 'deleted_id')).toBe(false);

      const resDeleted = await request(app)
        .get('/api/members/deleted')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resDeleted.statusCode).toBe(200);
      expect(resDeleted.body.some(m => m._id === 'deleted_id')).toBe(true);
    });
  });

  describe('4. Numeric Sorting verification', () => {
    it('should query members with sort uniqueNumber ascending', async () => {
      const mockUser = { _id: 'admin_id', name: 'Admin', email: 'admin@test.com', role: 'admin' };
      User.findById.mockReturnValue(makeQueryMock(mockUser));

      const queryMock = makeQueryMock([]);
      Member.find.mockReturnValue(queryMock);

      await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(Member.find).toHaveBeenCalled();
      expect(queryMock.sort).toHaveBeenCalledWith({ uniqueNumber: 1 });
    });
  });
});
