const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");

const adminCreds = {
  username: process.env.SMOKE_ADMIN_USERNAME,
  password: process.env.SMOKE_ADMIN_PASSWORD,
};
const userCreds = {
  username: process.env.SMOKE_USER_USERNAME,
  password: process.env.SMOKE_USER_PASSWORD,
};

const required = [
  ["SMOKE_ADMIN_USERNAME", adminCreds.username],
  ["SMOKE_ADMIN_PASSWORD", adminCreds.password],
  ["SMOKE_USER_USERNAME", userCreds.username],
  ["SMOKE_USER_PASSWORD", userCreds.password],
];

const missing = required.filter(([, value]) => !value).map(([key]) => key);
if (missing.length) {
  console.error(`Missing required env: ${missing.join(", ")}`);
  process.exit(2);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

async function login(creds) {
  const { response, data } = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify(creds),
  });
  if (!response.ok || !data?.token) {
    throw new Error(`Login failed for ${creds.username}: ${response.status}`);
  }
  return data;
}

function assertStatus(name, actual, expected) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) {
    throw new Error(`${name}: expected ${allowed.join("/")} got ${actual}`);
  }
  console.log(`PASS ${name}: ${actual}`);
}

const unauthSubmit = await request("/results/submitUInfo", {
  method: "POST",
  body: JSON.stringify({ testType: "MBTI", answers: [] }),
});
assertStatus("unauthenticated submit is blocked", unauthSubmit.response.status, 401);

const userLogin = await login(userCreds);
const userAuth = { Authorization: `Bearer ${userLogin.token}` };
const userId = userLogin.user?.id;

const userDelete = await request(`/users/${userId}`, {
  method: "DELETE",
  headers: userAuth,
});
assertStatus("normal user cannot delete user", userDelete.response.status, 403);

const userAnalyze = await request("/results/analyze", {
  method: "POST",
  headers: userAuth,
  body: JSON.stringify({ resultId: "000000000000000000000000" }),
});
assertStatus("normal user cannot analyze", userAnalyze.response.status, 403);

const userPrioritize = await request("/results/jobs/prioritize", {
  method: "POST",
  headers: userAuth,
  body: JSON.stringify({ userIds: [userId], capacities: { test: 1 } }),
});
assertStatus("normal user cannot prioritize jobs", userPrioritize.response.status, 403);

const adminLogin = await login(adminCreds);
const adminAuth = { Authorization: `Bearer ${adminLogin.token}` };

const adminUsers = await request("/users", {
  method: "GET",
  headers: adminAuth,
});
assertStatus("admin can list users", adminUsers.response.status, 200);

console.log("Security smoke test completed.");
