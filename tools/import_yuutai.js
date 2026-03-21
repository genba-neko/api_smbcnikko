const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../data/yuutai/yuutai_all.json');
const outputPath = path.join(__dirname, '../data/yuutai/import.sql');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const escapeSql = (str) => {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
};

// D1 doesn't support BEGIN TRANSACTION in .sql files for wrangler execute
let sql = 'DELETE FROM yuutai;\n';

data.forEach((item) => {
  const isContinuation = item.is_continuation ? 1 : 0;
  sql += `INSERT INTO yuutai (ticker_code, record_date, shares_condition, shares_condition_num, benefit_yen, benefit_original, benefit_type, is_continuation) VALUES (${escapeSql(item.ticker_code)}, ${escapeSql(item.record_date)}, ${escapeSql(item.shares_condition)}, ${item.shares_condition_num}, ${item.benefit_yen ?? 'NULL'}, ${escapeSql(item.benefit_original)}, ${escapeSql(item.benefit_type)}, ${isContinuation});\n`;
});

fs.writeFileSync(outputPath, sql);
console.log(`Successfully generated ${outputPath} with ${data.length} records.`);
