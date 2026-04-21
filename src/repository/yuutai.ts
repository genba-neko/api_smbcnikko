export type YuutaiRow = {
	id: number;
	ticker_code: string;
	record_date: string;
	shares_condition: string;
	shares_condition_num: number;
	benefit_yen: number | null;
	benefit_original: string | null;
	benefit_type: string | null;
	is_continuation: number; // 0 or 1
};

/**
 * 銘柄コードに紐づく優待情報をすべて取得
 */
export const getYuutaiByTicker = async (
	db: D1Database,
	tickerCode: string,
): Promise<YuutaiRow[]> => {
	const { results } = await db
		.prepare(
			'SELECT * FROM yuutai WHERE ticker_code = ? ORDER BY shares_condition_num ASC',
		)
		.bind(tickerCode)
		.all<YuutaiRow>();
	return results ?? [];
};

/**
 * 銘柄コードと株数に紐づく優待情報を取得
 */
export const getYuutaiByTickerAndShares = async (
	db: D1Database,
	tickerCode: string,
	shares: number,
): Promise<YuutaiRow[]> => {
	const { results } = await db
		.prepare(
			'SELECT * FROM yuutai WHERE ticker_code = ? AND shares_condition_num = ?',
		)
		.bind(tickerCode, shares)
		.all<YuutaiRow>();
	return results ?? [];
};

/**
 * 権利月（record_date）に紐づく優待情報を取得
 */
export const getYuutaiByMonth = async (
	db: D1Database,
	recordDate: string,
): Promise<YuutaiRow[]> => {
	const { results } = await db
		.prepare(
			'SELECT * FROM yuutai WHERE record_date = ? ORDER BY ticker_code ASC, shares_condition_num ASC',
		)
		.bind(recordDate)
		.all<YuutaiRow>();
	return results ?? [];
};
