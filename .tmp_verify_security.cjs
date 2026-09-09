const http = require('http');

async function runTests() {
  console.log('=== RUNNING TARGETED BACKEND SECURITY TESTS ===');

  // Let's spawn server process on a test port
  const { spawn } = require('child_process');
  const env = { ...process.env, PORT: '3099', INTERNAL_PORT: '3098', NODE_ENV: 'production' };
  const serverProc = spawn('node', ['dist/server.cjs'], {
    cwd: 'c:/Users/gurur/Experiment - Copy/anvation',
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverReady = false;
  serverProc.stdout.on('data', data => {
    const str = data.toString();
    if (str.includes('ANVATION server running') || str.includes('AUTHORITY process ready') || str.includes('listening')) {
      serverReady = true;
    }
  });

  // wait up to 5s for server startup
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 200));
    if (serverReady) break;
  }

  function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3099', ...(options.headers || {}) };
      const req = http.request({
        hostname: '127.0.0.1',
        port: 3099,
        path,
        method: options.method || 'GET',
        headers
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(body); } catch(e) {}
          resolve({ status: res.statusCode, headers: res.headers, body: json || body });
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  }

  try {
    // 1. Health check
    const health = await makeRequest('/api/health');
    console.log('[TEST 1] Health Check:', health.status === 200 ? 'PASS' : 'FAIL', health.body);

    // 2. Register valid 2-person team
    const validReg = await makeRequest('/api/register', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'test-idem-001' },
      body: {
        teamName: 'Security Champions',
        preferredTrack: 'Cyber Security',
        leader: {
          fullName: 'Alice Leader',
          email: 'alice.sec@example.com',
          usn: '1KS23CS991',
          phone: '9876543210',
          college: 'KSSEM'
        },
        members: [
          {
            fullName: 'Bob Member',
            email: 'bob.sec@example.com',
            usn: '1KS23CS992',
            phone: '9876543211',
            college: 'KSSEM'
          }
        ],
        paymentUtr: 'TESTUTR12345678',
        paymentUtrConfirm: 'TESTUTR12345678',
        paymentAmount: 2,
        paymentScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    });
    console.log('[TEST 2] Valid Registration:', validReg.status === 201 && validReg.body.success ? 'PASS' : 'FAIL (status: ' + validReg.status + ')', validReg.body?.team?.id);

    // 3. Idempotency test (repeat with same Idempotency-Key)
    const idemReg = await makeRequest('/api/register', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'test-idem-001' },
      body: { teamName: 'Different Name' }
    });
    console.log('[TEST 3] Idempotency Caching:', idemReg.status === 201 && idemReg.body?.team?.id === validReg.body?.team?.id ? 'PASS' : 'FAIL', idemReg.body?.team?.id);

    // 4. Duplicate Email Detection (Global)
    const dupEmailReg = await makeRequest('/api/register', {
      method: 'POST',
      body: {
        teamName: 'Duplicate Team',
        preferredTrack: 'AI / ML',
        leader: {
          fullName: 'Charlie Leader',
          email: 'alice.sec@example.com', // DUPLICATE
          usn: '1KS23CS995',
          phone: '9876543222',
          college: 'KSSEM'
        },
        members: [
          {
            fullName: 'Dave Member',
            email: 'dave.sec@example.com',
            usn: '1KS23CS996',
            phone: '9876543223',
            college: 'KSSEM'
          }
        ],
        paymentUtr: 'TESTUTR88888888',
        paymentAmount: 2,
        paymentScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    });
    console.log('[TEST 4] Duplicate Email 409:', dupEmailReg.status === 409 && dupEmailReg.body.error === 'duplicate_registration' ? 'PASS' : 'FAIL (status: ' + dupEmailReg.status + ')', dupEmailReg.body);

    // 5. Duplicate USN Detection
    const dupUsnReg = await makeRequest('/api/register', {
      method: 'POST',
      body: {
        teamName: 'Duplicate USN Team',
        preferredTrack: 'AI / ML',
        leader: {
          fullName: 'Eve Leader',
          email: 'eve.sec@example.com',
          usn: '1KS23CS991', // DUPLICATE USN
          phone: '9876543233',
          college: 'KSSEM'
        },
        members: [
          {
            fullName: 'Frank Member',
            email: 'frank.sec@example.com',
            usn: '1KS23CS997',
            phone: '9876543234',
            college: 'KSSEM'
          }
        ],
        paymentUtr: 'TESTUTR77777777',
        paymentAmount: 2,
        paymentScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    });
    console.log('[TEST 5] Duplicate USN 409:', dupUsnReg.status === 409 && dupUsnReg.body.error === 'duplicate_registration' ? 'PASS' : 'FAIL (status: ' + dupUsnReg.status + ')', dupUsnReg.body);

    // 6. Duplicate UTR Detection
    const dupUtrReg = await makeRequest('/api/register', {
      method: 'POST',
      body: {
        teamName: 'Duplicate UTR Team',
        preferredTrack: 'AI / ML',
        leader: {
          fullName: 'Grace Leader',
          email: 'grace.sec@example.com',
          usn: '1KS23CS998',
          phone: '9876543244',
          college: 'KSSEM'
        },
        members: [
          {
            fullName: 'Heidi Member',
            email: 'heidi.sec@example.com',
            usn: '1KS23CS999',
            phone: '9876543245',
            college: 'KSSEM'
          }
        ],
        paymentUtr: 'TESTUTR12345678', // DUPLICATE UTR
        paymentAmount: 2,
        paymentScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    });
    console.log('[TEST 6] Duplicate UTR rejection:', dupUtrReg.status === 400 && String(dupUtrReg.body.error).includes('already been registered') ? 'PASS' : 'FAIL (status: ' + dupUtrReg.status + ')', dupUtrReg.body);

    // 7. SSRF Protection on project submissions
    const ssrfSub = await makeRequest('/api/submit-project', {
      method: 'POST',
      body: {
        teamId: validReg.body?.team?.id,
        projectTitle: 'Exploit Submission',
        problemStatement: 'Testing SSRF',
        githubLink: 'http://127.0.0.1:8080/internal-admin',
        track: 'Cyber Security'
      }
    });
    console.log('[TEST 7] SSRF URL rejection:', ssrfSub.status === 400 && String(ssrfSub.body.error).includes('unsafe') ? 'PASS' : 'FAIL (status: ' + ssrfSub.status + ')', ssrfSub.body);

    // 8. Brute force login lockout test
    let lockoutHit = false;
    for (let i = 0; i < 7; i++) {
      const loginAttempt = await makeRequest('/api/admin-login', {
        method: 'POST',
        body: { username: 'superadmin', password: 'wrongpassword' + i }
      });
      if (loginAttempt.status === 429) {
        lockoutHit = true;
        console.log('[TEST 8] Brute force login lockout (HTTP 429) triggered at attempt ' + (i + 1) + ':', 'PASS');
        break;
      }
    }
    if (!lockoutHit) {
      console.log('[TEST 8] Brute force login lockout:', 'FAIL (no 429 received)');
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    serverProc.kill();
  }
}

runTests().then(() => {
  console.log('=== SECURITY TESTS FINISHED ===');
  process.exit(0);
});
