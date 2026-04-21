import { Hono } from 'hono';
import * as yuutaiService from '../services/yuutai';
import type { Env } from '../types/env';

const yuutai = new Hono<{ Bindings: Env }>();

// C. 権利月で取得: GET /yuutai/month/:recordDate
// :tickerCode よりも前に定義する必要がある（そうしないと "month" が tickerCode として解釈されるため）
yuutai.get('/month/:recordDate', async (c) => {
	const { recordDate } = c.req.param();
	const results = await yuutaiService.getYuutaiByMonth(c.env.DB, recordDate);
	return c.json(results);
});

// A. 銘柄コードで取得: GET /yuutai/:tickerCode
yuutai.get('/:tickerCode', async (c) => {
	const { tickerCode } = c.req.param();
	const results = await yuutaiService.getYuutaiByTicker(c.env.DB, tickerCode);
	return c.json(results);
});

// B. 銘柄コード + 株数で取得: GET /yuutai/:tickerCode/:shares
yuutai.get('/:tickerCode/:shares', async (c) => {
	const { tickerCode, shares } = c.req.param();
	const sharesNum = parseInt(shares, 10);

	if (Number.isNaN(sharesNum)) {
		return c.json({ error: 'invalid_shares' }, 400);
	}

	const results = await yuutaiService.getYuutaiByTickerAndShares(
		c.env.DB,
		tickerCode,
		sharesNum,
	);
	return c.json(results);
});

export default yuutai;
