import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as repository from '../repository/yuutai';
import * as service from './yuutai';

// repository のメソッドをモック化
vi.mock('../repository/yuutai', () => ({
	getYuutaiByTicker: vi.fn(),
	getYuutaiByTickerAndShares: vi.fn(),
	getYuutaiByMonth: vi.fn(),
}));

describe('yuutaiService', () => {
	const mockDb = {} as D1Database;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockRows: repository.YuutaiRow[] = [
		{
			id: 1,
			ticker_code: '1301',
			record_date: '3-XX',
			shares_condition: '100株以上',
			shares_condition_num: 100,
			benefit_yen: 2500,
			benefit_original: '2,500円相当',
			benefit_type: '飲食料品',
			is_continuation: 0,
		},
		{
			id: 2,
			ticker_code: '1301',
			record_date: '3-XX',
			shares_condition: '300株以上',
			shares_condition_num: 300,
			benefit_yen: 6000,
			benefit_original: '6,000円相当',
			benefit_type: '飲食料品',
			is_continuation: 1,
		},
	];

	it('getYuutaiByTicker: DBの0/1をbooleanに変換して返す', async () => {
		vi.mocked(repository.getYuutaiByTicker).mockResolvedValue(mockRows);

		const result = await service.getYuutaiByTicker(mockDb, '1301');

		expect(result).toHaveLength(2);
		expect(result[0].is_continuation).toBe(false); // 0 -> false
		expect(result[1].is_continuation).toBe(true); // 1 -> true
		expect(repository.getYuutaiByTicker).toHaveBeenCalledWith(mockDb, '1301');
	});

	it('getYuutaiByTickerAndShares: 指定した株数のデータを返す', async () => {
		vi.mocked(repository.getYuutaiByTickerAndShares).mockResolvedValue([
			mockRows[0],
		]);

		const result = await service.getYuutaiByTickerAndShares(
			mockDb,
			'1301',
			100,
		);

		expect(result).toHaveLength(1);
		expect(result[0].shares_condition_num).toBe(100);
		expect(repository.getYuutaiByTickerAndShares).toHaveBeenCalledWith(
			mockDb,
			'1301',
			100,
		);
	});

	it('getYuutaiByMonth: 指定した月のデータを返す', async () => {
		vi.mocked(repository.getYuutaiByMonth).mockResolvedValue(mockRows);

		const result = await service.getYuutaiByMonth(mockDb, '3-XX');

		expect(result).toHaveLength(2);
		expect(result[0].record_date).toBe('3-XX');
		expect(repository.getYuutaiByMonth).toHaveBeenCalledWith(mockDb, '3-XX');
	});

	it('データが空の場合は空配列を返す', async () => {
		vi.mocked(repository.getYuutaiByTicker).mockResolvedValue([]);

		const result = await service.getYuutaiByTicker(mockDb, '9999');

		expect(result).toEqual([]);
	});
});
