const crypto = require("crypto");
const http = require("http");

function request(options, data) {
    return new Promise((resolve, reject) => {
        const payload = data ? (typeof data === "string" ? data : JSON.stringify(data)) : null;
        const headers = Object.assign({}, options.headers);
        if (payload) {
            headers["Content-Length"] = Buffer.byteLength(payload);
        }
        const req = http.request(Object.assign({}, options, { headers }), (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                let parsed;
                try { parsed = JSON.parse(body); } catch(e) { parsed = body; }
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function run() {
    const pin = "4829";
    const salt = crypto.randomBytes(16).toString("base64");
    const pinHash = crypto.createHash("sha256").update(pin + salt).digest("hex");
    const ciphertext = crypto.randomBytes(32).toString("base64");
    const iv = crypto.randomBytes(12).toString("base64");

    // 1. Create share
    const createRes = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: "/shares",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        ciphertext,
        iv,
        salt,
        pin_hash: pinHash,
        title: "Test PIN Title",
        uname: "testuser",
        expires_in: 300
    });

    console.log("Create status:", createRes.status, "shareId:", createRes.data.shareId);
    const shareId = createRes.data.shareId;

    // 2. Query info before unlock
    const infoRes = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: `/shares/${shareId}`,
        method: "GET"
    });
    console.log("Info status:", infoRes.status, "requiresPin:", infoRes.data.requiresPin, "title:", infoRes.data.title);

    // 3. Try incorrect PIN
    const wrongRes = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: `/shares/${shareId}/unlock`,
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { pin: "0000" });
    console.log("Wrong PIN status:", wrongRes.status, "error:", wrongRes.data.error);

    // 4. Try correct PIN
    const unlockRes = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: `/shares/${shareId}/unlock`,
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { pin: pin });
    console.log("Correct PIN status:", unlockRes.status, "unlocked ciphertext matches:", unlockRes.data.ciphertext === ciphertext);

    // 5. Verify burned immediately after unlock
    const burnedRes = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: `/shares/${shareId}`,
        method: "GET"
    });
    console.log("Burned check status:", burnedRes.status);

    // 6. Test 5 failed attempts burn protection
    const share2 = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: "/shares",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        ciphertext,
        iv,
        salt,
        pin_hash: pinHash,
        title: "Burn on 5 attempts",
        expires_in: 300
    });
    const s2Id = share2.data.shareId;
    for (let i = 1; i <= 4; i++) {
        await request({
            hostname: "127.0.0.1",
            port: 5432,
            path: `/shares/${s2Id}/unlock`,
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { pin: "9999" });
    }
    const finalFail = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: `/shares/${s2Id}/unlock`,
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { pin: "9999" });
    console.log("5th failed attempt status:", finalFail.status, "message:", finalFail.data.error);

    const postBurnCheck = await request({
        hostname: "127.0.0.1",
        port: 5432,
        path: `/shares/${s2Id}`,
        method: "GET"
    });
    console.log("Post-5-attempts burn status:", postBurnCheck.status);
}

run().catch(console.error);
