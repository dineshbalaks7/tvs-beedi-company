const http = require('http');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testProfit() {
  console.log('--- Testing Production Preview Calculation ---');
  const preview1 = await getJson('http://localhost:3000/api/production/preview?boxes=1');
  console.log('1 Box:', {
    boxes: preview1.boxes,
    rate: preview1.rate,
    salary: preview1.salary,
    profit: preview1.profit,
    diff: preview1.rate - preview1.salary
  });

  if (preview1.rate !== 2040) throw new Error(`Expected rate 2040, got ${preview1.rate}`);
  if (preview1.salary !== 1920) throw new Error(`Expected salary 1920, got ${preview1.salary}`);
  if (preview1.profit !== 120) throw new Error(`Expected profit 120, got ${preview1.profit}`);

  const preview5 = await getJson('http://localhost:3000/api/production/preview?boxes=5');
  console.log('5 Boxes:', {
    boxes: preview5.boxes,
    rate: preview5.rate,
    salary: preview5.salary,
    profit: preview5.profit,
    diff: preview5.rate - preview5.salary
  });

  if (preview5.profit !== 600) throw new Error(`Expected profit 600 for 5 boxes, got ${preview5.profit}`);

  console.log('\n--- Testing Assistant Query for Rate-Salary Difference ---');
  const chatRes = await postJson('http://localhost:3000/api/chat', {
    message: 'diff between rate and salary for profit'
  });
  console.log('Chat Response:\n', chatRes.reply);

  if (!chatRes.reply.includes('120') || !chatRes.reply.includes('2,040') || !chatRes.reply.includes('1,920')) {
    throw new Error('Chat response missing profit difference details');
  }

  console.log('\n✅ ALL PROFIT & RATE-SALARY DIFFERENCE VALIDATIONS PASSED!');
}

testProfit().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
