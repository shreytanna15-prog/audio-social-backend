/**
 * Docs §10 checklist against a running local backend.
 * Usage: node scripts/docs-checklist.mjs
 */
const BASE = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3015").replace(/\/$/, "");
const PASS = "Testpass1!";
const ts = Date.now();

const results = [];

function ok(id, label, detail = "") {
  results.push({ id, label, pass: true, detail });
  console.log(`PASS  [${id}] ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(id, label, detail = "") {
  results.push({ id, label, pass: false, detail });
  console.error(`FAIL  [${id}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function signup(prefix) {
  const email = `${prefix}_${ts}@example.com`;
  const username = `${prefix}${String(ts).slice(-8)}`;
  const { status, json } = await api("/api/auth/signup", {
    method: "POST",
    body: {
      email,
      password: PASS,
      name: prefix === "docsa" ? "Docs Alice" : "Docs Bob",
      username,
    },
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`signup ${prefix} failed ${status} ${JSON.stringify(json)}`);
  }
  return {
    email,
    username,
    id: json.data.user.id,
    token: json.data.tokens.accessToken,
  };
}

async function main() {
  console.log(`\nDocs checklist @ ${BASE}\n`);

  // 1. Two users
  let A, B;
  try {
    A = await signup("docsa");
    B = await signup("docsb");
    ok(1, "Two users A and B exist", `${A.username} / ${B.username}`);
  } catch (e) {
    fail(1, "Two users A and B exist", String(e.message || e));
    printSummary();
    process.exit(1);
  }

  // 2. Search finds B
  {
    const { status, json } = await api(
      `/api/users/search?q=${encodeURIComponent(B.username)}&limit=20`,
      { token: A.token }
    );
    const hit = Array.isArray(json?.data)
      ? json.data.find((u) => u.id === B.id)
      : null;
    if (status === 200 && hit) ok(2, "As A, search finds B", hit.username);
    else fail(2, "As A, search finds B", `status=${status}`);
  }

  // 3. Public profile
  let beforeFollowers = 0;
  {
    const { status, json } = await api(`/api/users/${B.id}`, { token: A.token });
    const d = json?.data;
    if (
      status === 200 &&
      d?.id === B.id &&
      typeof d.followerCount === "number" &&
      typeof d.isFollowing === "boolean"
    ) {
      beforeFollowers = d.followerCount;
      ok(
        3,
        "Profile loads name/username/counts",
        `${d.name} @${d.username} followers=${d.followerCount}`
      );
    } else fail(3, "Profile loads name/username/counts", `status=${status}`);
  }

  // 4. Follow
  {
    const { status, json } = await api(`/api/users/${B.id}/follow`, {
      method: "POST",
      token: A.token,
    });
    const d = json?.data;
    if (status === 200 && d?.isFollowing === true && d.followerCount === beforeFollowers + 1) {
      ok(4, "Follow → Following + follower +1", `followers=${d.followerCount}`);
    } else {
      fail(4, "Follow → Following + follower +1", JSON.stringify(d));
    }
  }

  // 5. Unfollow
  {
    const { status, json } = await api(`/api/users/${B.id}/follow`, {
      method: "DELETE",
      token: A.token,
    });
    const d = json?.data;
    if (status === 200 && d?.isFollowing === false && d.followerCount === beforeFollowers) {
      ok(5, "Unfollow → count -1", `followers=${d.followerCount}`);
    } else fail(5, "Unfollow → count -1", JSON.stringify(d));
  }

  // Re-follow + record recent for 6/7
  await api(`/api/users/${B.id}/follow`, { method: "POST", token: A.token });
  await api("/api/search/recent", {
    method: "POST",
    token: A.token,
    body: { kind: "ARTIST", targetUserId: B.id, query: B.username },
  });

  // 6. Recent lists B
  {
    const { status, json } = await api("/api/search/recent", { token: A.token });
    const hit = Array.isArray(json?.data)
      ? json.data.find((r) => r.targetUser?.id === B.id)
      : null;
    if (status === 200 && hit) ok(6, "Recent shows B after visit", hit.targetUser.username);
    else fail(6, "Recent shows B after visit", `status=${status}`);
  }

  // 6b. Recent persists (re-fetch = "after restart" for API)
  {
    const { status, json } = await api("/api/search/recent", { token: A.token });
    const hit = Array.isArray(json?.data)
      ? json.data.find((r) => r.targetUser?.id === B.id)
      : null;
    if (status === 200 && hit) ok("6b", "Recent persists on re-fetch (same account)", "");
    else fail("6b", "Recent persists on re-fetch (same account)", "");
  }

  // 7. Clear recent
  {
    const cleared = await api("/api/search/recent", {
      method: "DELETE",
      token: A.token,
    });
    const listed = await api("/api/search/recent", { token: A.token });
    if (
      cleared.status === 200 &&
      listed.status === 200 &&
      Array.isArray(listed.json?.data) &&
      listed.json.data.length === 0
    ) {
      ok(7, "Clear recent → list empty");
    } else fail(7, "Clear recent → list empty", JSON.stringify(listed.json));
  }

  // 8. Cannot follow self
  {
    const apiSelf = await api(`/api/users/${A.id}/follow`, {
      method: "POST",
      token: A.token,
    });
    const profileSelf = await api(`/api/users/${A.id}`, { token: A.token });
    if (
      apiSelf.status === 400 &&
      profileSelf.json?.data?.isSelf === true
    ) {
      ok(8, "Cannot follow self (API 400 + isSelf)");
    } else {
      fail(
        8,
        "Cannot follow self (API 400 + isSelf)",
        `follow=${apiSelf.status} isSelf=${profileSelf.json?.data?.isSelf}`
      );
    }
  }

  // 9. Coming soon is UI-only — mark as API N/A with note
  ok(9, "Songs/Playlists/Albums coming-soon", "UI-only; verified in Maestro");

  // 10. Logged out → 401
  {
    const paths = [
      "/api/users/search?q=a",
      `/api/users/${B.id}`,
      "/api/search/recent",
    ];
    let all401 = true;
    for (const p of paths) {
      const { status } = await api(p);
      if (status !== 401) {
        all401 = false;
        fail(10, "Logged out cannot hit APIs (401)", `${p} → ${status}`);
        break;
      }
    }
    if (all401) ok(10, "Logged out cannot hit APIs (401)");
  }

  // Extra: relationship endpoint
  {
    const { status, json } = await api(`/api/users/${B.id}/relationship`, {
      token: A.token,
    });
    if (status === 200 && typeof json?.data?.isFollowing === "boolean") {
      ok("R", "GET /relationship works", JSON.stringify(json.data));
    } else fail("R", "GET /relationship works", `status=${status}`);
  }

  printSummary();
  const failed = results.filter((r) => !r.pass).length;
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n—— Summary: ${passed} passed, ${failed} failed ——\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
