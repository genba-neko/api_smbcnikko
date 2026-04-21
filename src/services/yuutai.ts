import * as repository from '../repository/yuutai';

export type YuutaiResponse = {
	id: number;
	ticker_code: string;
	record_date: string;
	shares_condition: string;
	shares_condition_num: number;
	benefit_yen: number | null;
	benefit_original: string | null;
	benefit_type: string | null;
	is_continuation: boolean; // booleanに変換して返す
};

const mapRowToResponse = (row: repository.YuutaiRow): YuutaiResponse => ({
	...row,
	is_continuation: row.is_continuation === 1,
});

export const getYuutaiByTicker = async (
	db: D1Database,
	tickerCode: string,
): Promise<YuutaiResponse[]> => {
	const rows = await repository.getYuutaiByTicker(db, tickerCode);
	return rows.map(mapRowToResponse);
};

export const getYuutaiByTickerAndShares = async (
	db: D1Database,
	tickerCode: string,
	shares: number,
): Promise<YuutaiResponse[]> => {
	const rows = await repository.getYuutaiByTickerAndShares(
		db,
		tickerCode,
		shares,
	);
	return rows.map(mapRowToResponse);
};

export const getYuutaiByMonth = async (
	db: D1Database,
	recordDate: string,
): Promise<YuutaiResponse[]> => {
	const rows = await repository.getYuutaiByMonth(db, recordDate);
	return rows.map(mapRowToResponse);
};
