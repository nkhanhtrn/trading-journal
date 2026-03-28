import fs from 'fs'

// Read the test parser code
const parserCode = fs.readFileSync('parse-webull.js', 'utf-8')

// Modify the csvPath to use test data
const modifiedCode = parserCode.replace(
  /const csvPath = path\.join\(__dirname, '\.\.\/Webull_Orders_Records_Options\.csv'\)/,
  "const csvPath = path.join(__dirname, 'test-data.csv')"
)

// Write and run
fs.writeFileSync('test-parser-temp.mjs', modifiedCode)
