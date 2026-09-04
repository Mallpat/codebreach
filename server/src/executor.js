import vm from 'vm';
import axios from 'axios';

/**
 * Executes user code against a test suite and returns formatted TestResult[]
 * Data model:
 * {
 *   testName: string,
 *   passed: boolean,
 *   output: string,
 *   ranBy: string
 * }
 */
export async function executeTests({ code, testCode, ranBy = 'Anonymous', timeoutMs = 1200 }) {
  // If external Piston runner is configured via environment
  if (process.env.PISTON_URL) {
    try {
      return await executeViaPiston({ code, testCode, ranBy });
    } catch (err) {
      console.warn('Piston execution failed, falling back to local VM runner:', err.message);
    }
  }

  // If Judge0 is configured via environment
  if (process.env.JUDGE0_URL) {
    try {
      return await executeViaJudge0({ code, testCode, ranBy });
    } catch (err) {
      console.warn('Judge0 execution failed, falling back to local VM runner:', err.message);
    }
  }

  // Default primary execution: High-performance isolated Node.js VM Runner
  return executeViaLocalVM({ code, testCode, ranBy, timeoutMs });
}

/**
 * Isolated Node.js VM execution environment with Jest-like assertion library
 */
function executeViaLocalVM({ code, testCode, ranBy, timeoutMs }) {
  const testResults = [];
  const logs = [];

  // Clean ES module export syntax so it runs smoothly in VM
  let cleanCode = code
    .replace(/export\s+(const|let|var)\s+/g, 'var ')
    .replace(/export\s+default\s+/g, 'var defaultExport = ')
    .replace(/export\s+function\s+(\w+)/g, 'function $1')
    .replace(/export\s+class\s+(\w+)/g, 'class $1')
    .replace(/export\s*\{[^}]*\};?/g, '');

  const wrappedCode = cleanCode;

  // Create lightweight Jest-like test harness
  const currentSuite = { name: 'Default Suite' };

  function describe(name, fn) {
    const prev = currentSuite.name;
    currentSuite.name = name;
    try {
      fn();
    } finally {
      currentSuite.name = prev;
    }
  }

  function test(name, fn) {
    const fullName = currentSuite.name ? `${currentSuite.name} > ${name}` : name;
    const testLog = [];
    try {
      fn();
      testResults.push({
        testName: fullName,
        passed: true,
        output: 'PASSED',
        ranBy
      });
    } catch (err) {
      testResults.push({
        testName: fullName,
        passed: false,
        output: err.message || String(err),
        ranBy
      });
    }
  }

  function expect(actual) {
    return {
      toBe(expected) {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
        }
      },
      toEqual(expected) {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        if (a !== b) {
          throw new Error(`Expected ${b} but received ${a}`);
        }
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined, but received undefined`);
        }
      },
      toBeNull() {
        if (actual !== null) {
          throw new Error(`Expected null, but received ${JSON.stringify(actual)}`);
        }
      },
      startsWith(expectedPrefix) {
        if (typeof actual !== 'string' || !actual.startsWith(expectedPrefix)) {
          throw new Error(`Expected "${actual}" to start with "${expectedPrefix}"`);
        }
      },
      get length() {
        return {
          toBe(expectedLen) {
            const actLen = actual ? actual.length : undefined;
            if (actLen !== expectedLen) {
              throw new Error(`Expected length ${expectedLen}, but received ${actLen}`);
            }
          }
        };
      },
      not: {
        toBe(expected) {
          if (actual === expected) {
            throw new Error(`Expected value NOT to be ${JSON.stringify(expected)}`);
          }
        },
        toBeNull() {
          if (actual === null) {
            throw new Error(`Expected value NOT to be null`);
          }
        },
        toThrow() {
          if (typeof actual === 'function') {
            try {
              actual();
            } catch (err) {
              throw new Error(`Expected function not to throw, but threw error: ${err.message}`);
            }
          }
        }
      }
    };
  }

  const sandbox = {
    console: {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.join(' ')),
      error: (...args) => logs.push('[ERR] ' + args.join(' '))
    },
    describe,
    test,
    it: test,
    expect,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    Error,
    TypeError,
    RangeError,
    Buffer
  };

  const context = vm.createContext(sandbox);

  try {
    // 1. Run User Code
    const scriptUser = new vm.Script(wrappedCode, { filename: 'solution.js' });
    scriptUser.runInContext(context, { timeout: timeoutMs });

    // 2. Run Test Code
    const scriptTests = new vm.Script(testCode, { filename: 'tests.js' });
    scriptTests.runInContext(context, { timeout: timeoutMs });

    return {
      success: true,
      results: testResults,
      totalCount: testResults.length,
      passedCount: testResults.filter(t => t.passed).length,
      allPassed: testResults.length > 0 && testResults.every(t => t.passed),
      logs: logs.join('\n')
    };
  } catch (compilationOrRuntimeError) {
    // Syntax error or top-level runtime crash in user code
    const errorMsg = compilationOrRuntimeError.message || String(compilationOrRuntimeError);
    return {
      success: false,
      results: [
        {
          testName: 'Build & Compilation Check',
          passed: false,
          output: `Runtime / Syntax Error: ${errorMsg}`,
          ranBy
        }
      ],
      totalCount: 1,
      passedCount: 0,
      allPassed: false,
      logs: logs.join('\n')
    };
  }
}

/**
 * Piston execution integration (optional if PISTON_URL is provided)
 */
async function executeViaPiston({ code, testCode, ranBy }) {
  const combined = `
${code}
${testCode}
  `;
  const res = await axios.post(process.env.PISTON_URL, {
    language: 'javascript',
    version: '18.15.0',
    files: [{ name: 'index.js', content: combined }]
  }, { timeout: 8000 });

  const run = res.data?.run || {};
  const passed = (run.code === 0);
  return {
    success: true,
    results: [
      {
        testName: 'Piston Test Execution',
        passed,
        output: run.stdout || run.stderr || (passed ? 'Tests Passed' : 'Execution Failed'),
        ranBy
      }
    ],
    totalCount: 1,
    passedCount: passed ? 1 : 0,
    allPassed: passed,
    logs: run.output || ''
  };
}

/**
 * Judge0 execution integration (optional if JUDGE0_URL is provided)
 */
async function executeViaJudge0({ code, testCode, ranBy }) {
  const source_code = Buffer.from(`${code}\n${testCode}`).toString('base64');
  const res = await axios.post(`${process.env.JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
    source_code,
    language_id: 63 // JavaScript (Node.js)
  }, {
    headers: {
      'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || ''
    },
    timeout: 8000
  });

  const statusId = res.data?.status?.id;
  const passed = statusId === 3; // 3 is Accepted
  const stdout = res.data?.stdout ? Buffer.from(res.data.stdout, 'base64').toString() : '';
  const stderr = res.data?.stderr ? Buffer.from(res.data.stderr, 'base64').toString() : '';

  return {
    success: true,
    results: [
      {
        testName: 'Judge0 Test Execution',
        passed,
        output: stdout || stderr || (passed ? 'Passed' : 'Execution Failed'),
        ranBy
      }
    ],
    totalCount: 1,
    passedCount: passed ? 1 : 0,
    allPassed: passed,
    logs: stdout + '\n' + stderr
  };
}
