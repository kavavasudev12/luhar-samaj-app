import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock axios module to prevent ESM loading issues in Jest
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };
  return mockAxios;
});

import App from './App';

test('renders app title', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા/i);
  expect(titleElements[0]).toBeInTheDocument();
});
