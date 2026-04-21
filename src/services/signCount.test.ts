import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as repository from '../repository/signCount';
import { updateSignCount } from './signCount';

// repository のメソッドをモック化
vi.mock('../repository/signCount', () => ({
	getSignCount: vi.fn(),
	upsertSignCount: vi.fn(),
}));

describe('signCountService', () => {
	const mockDb = {} as D1Database;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('新しい sign_count が既存のものより大きい場合は成功する', async () => {
		// 既存データ: 10
		vi.mocked(repository.getSignCount).mockResolvedValue({
			credential_id: 'cred1',
			sign_count: 10,
			created_at: 1000000,
			updated_at: 12345,
		});

		const result = await updateSignCount(mockDb, 'cred1', 11);

		expect(result).toEqual({ ok: true, sign_count: 11 });
		expect(repository.upsertSignCount).toHaveBeenCalledWith(
			mockDb,
			'cred1',
			11,
		);
	});

	it('新しい sign_count が既存のもの以下の場合は 409 エラーを返す', async () => {
		// 既存データ: 10
		vi.mocked(repository.getSignCount).mockResolvedValue({
			credential_id: 'cred1',
			sign_count: 10,
			created_at: 1000000,
			updated_at: 12345,
		});

		const result = await updateSignCount(mockDb, 'cred1', 10);

		expect(result).toEqual({
			error: 'sign_count_not_greater',
			current: 10,
			status: 409,
		});
		expect(repository.upsertSignCount).not.toHaveBeenCalled();
	});

	it('負の sign_count は 400 エラーを返す', async () => {
		const result = await updateSignCount(mockDb, 'cred1', -1);
		expect(result).toEqual({ error: 'invalid_sign_count', status: 400 });
	});

	it('データが存在しない（初回）場合は成功する', async () => {
		vi.mocked(repository.getSignCount).mockResolvedValue(null);

		const result = await updateSignCount(mockDb, 'cred1', 1);

		expect(result).toEqual({ ok: true, sign_count: 1 });
		expect(repository.upsertSignCount).toHaveBeenCalled();
	});
});
