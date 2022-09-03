import 'jest-preset-angular/setup-jest';
import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { resetQueryCache } from '../rx-query';

beforeAll(() => server.listen());
beforeEach(() => {
    resetQueryCache();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
