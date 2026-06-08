import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-assetanchor',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('users/{uid} 隔離（§7）', () => {
  it('使用者可讀寫自己的 doc', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { uid: 'alice' }));
    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
  });

  it('使用者不能讀別人的 doc', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(alice, 'users/bob')));
  });

  it('未登入不能讀使用者 doc', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice')));
  });

  it('使用者可寫自己的 subcollection', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice/accounts/a1'), { account_id: 'a1' }));
  });
});

describe('全域 collection（§7）', () => {
  it('登入者可讀 exchange_rates、不能寫', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'exchange_rates/2026-05-30')));
    await assertFails(setDoc(doc(alice, 'exchange_rates/2026-05-30'), { x: 1 }));
  });

  it('登入者可讀+建立 symbols、不能更新', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'symbols/AAPL'), { symbol: 'AAPL' }));
    await assertFails(setDoc(doc(alice, 'symbols/AAPL'), { symbol: 'AAPL2' }));
  });

  it('登入者可讀 quotes、不能寫', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'quotes/AAPL')));
    await assertFails(setDoc(doc(alice, 'quotes/AAPL'), { price: '1' }));
  });
});

describe('accounts subcollection 隔離（Sprint 2）', () => {
  it('使用者可建立並讀取自己的 account', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice/accounts/a1'), { account_id: 'a1' }));
    await assertSucceeds(getDoc(doc(alice, 'users/alice/accounts/a1')));
  });

  it('使用者不能讀別人的 account', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(alice, 'users/bob/accounts/b1')));
  });

  it('使用者不能寫別人的 account', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'users/bob/accounts/b1'), { account_id: 'b1' }));
  });

  it('未登入不能讀寫 account', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice/accounts/a1')));
    await assertFails(setDoc(doc(anon, 'users/alice/accounts/a1'), { account_id: 'a1' }));
  });
});
