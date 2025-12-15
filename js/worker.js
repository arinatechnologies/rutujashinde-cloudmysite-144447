function parseJwt(token) {
  try {
    const base64 = token.split(".")[1];
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
  // ✅ Helper to determine repo safely
function resolveRepo(env, request) {
  // 1) Preferred: explicit var like "arinatechnologies/robot-arinacapcut"
  if (env.GITHUB_REPO) return env.GITHUB_REPO;

  // 2) If on workers.dev, infer "<subdomain>" as service name
  try {
    const host = new URL(request.url).host; // e.g., robot-arinacapcut.youracct.workers.dev
    const parts = host.split(".");
    const isWorkersDev = parts.slice(-2).join(".") === "workers.dev";
    if (isWorkersDev) {
      const serviceName = parts[0]; // "robot-arinacapcut"
      // Change the org below if needed:
      return `arinatechnologies/${serviceName}`;
    }
  } catch (_) {
    // ignore
  }

  // 3) Fallback to owner/name split
  if (env.REPO_OWNER && env.REPO_NAME) {
    return `${env.REPO_OWNER}/${env.REPO_NAME}`;
  }

  throw new Error(
    "Repo not configured. Set GITHUB_REPO, or REPO_OWNER+REPO_NAME, or run on *.workers.dev."
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    console.log("🔍 Requesting:", request.method, "pathname ==", pathname); 

    

    // ✅ Handle POST /form-submit
    if (request.method === "POST" && pathname === "/form-submit") {
      try {
        const formData = await request.json();
        const apiKey = env.API_KEY;
        console.log("🔄 Submitting form data...", formData);
        console.log("🔑 env.API_KEY:", apiKey); // TEMP LOG

        // Extract template and logo from formData
        const template = formData.template || "contact_basic_logo_modern";
        const logo = formData.logo || "";
        
        const payload = {
          ...formData,
          from: formData.from || "info@cloudmysite.com",
          urgency: "Normal",
          template: template,
          logo: logo,
        };
        
        console.log("📤 Sending to API:", payload);

        const apiResponse = await fetch("https://api.cloudmysite.com/form", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        return new Response(await apiResponse.text(), {
          status: apiResponse.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // ✅ Handle POST /upload-to-github
    if (request.method === "POST" && pathname === "/upload-to-github") {
      console.log("🔄 Uploading to GitHub...");

      try {
        const body = await request.json();
        const { filename, fileContentBase64 } = body;
        const path = "uploads/";
        const branch = "main";

        if (!filename || !fileContentBase64) {
          return new Response(
            JSON.stringify({ error: "Missing filename or file content" }),
            {
              status: 400,
              headers: { "Access-Control-Allow-Origin": "*" },
            }
          );
        }

        const apiBase = `https://api.github.com/repos/${repo}/contents/${path}${filename}`;
        let sha = null;

        // 🔍 Try to fetch existing file to get SHA (for overwrite)
        const getRes = await fetch(`${apiBase}?ref=${branch}`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "cloudmysite-worker",
          },
        });

        if (getRes.ok) {
          const existing = await getRes.json();
          sha = existing.sha;
          console.log(`ℹ️ Existing file found. SHA: ${sha}`);
        } else {
          console.log("🆕 No existing file found. Creating new.");
        }

        // 🔼 Upload or update the file
        const githubRes = await fetch(apiBase, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "cloudmysite-worker",
          },
          body: JSON.stringify({
            message: `Upload ${filename}`,
            content: fileContentBase64,
            branch,
            ...(sha ? { sha } : {}),
          }),
        });

        const result = await githubRes.text();
        return new Response(result, {
          status: githubRes.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    if (request.method === "POST" && pathname === "/create-stripe-session") {
      try {
        console.log("🔄 Creating Stripe session...");
        const stripeSecretKey = env.STRIPE_SECRET_KEY;
        console.log("🔑 env.STRIPE_SECRET_KEY:", stripeSecretKey); // TEMP LOG

        const { priceId } = await request.json();

        const origin = new URL(request.url).origin;
        const successUrl = `${origin}/success`;
        const cancelUrl = `${origin}/cancel`;

        const stripeRes = await fetch(
          "https://api.stripe.com/v1/checkout/sessions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              success_url: successUrl,
              cancel_url: cancelUrl,
              mode: "payment",
              line_items: [`price=${priceId}&quantity=1`],
            }),
          }
        );

        console.log(
          "🔄 Stripe response:",
          stripeRes.status,
          await stripeRes.text()
        );

        const result = await stripeRes.json();
        return new Response(JSON.stringify({ sessionUrl: result.url }), {
          status: stripeRes.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // ✅ Handle Firebase Auth token verification
    if (request.method === "POST" && pathname === "/auth-check") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response("Missing token", { status: 401 });
      }

      const token = authHeader.replace("Bearer ", "");

      try {
        // Decode token without verifying signature
        const user = parseJwt(token);
        console.log("🔍 Decoded user:", user);
        if (!user || !user.email) {
          return new Response("Invalid token", { status: 403 });
        }

        // TODO: For production, verify token using Firebase public keys

        return new Response(
          JSON.stringify({ status: "ok", email: user.email }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    if (request.method === "POST" && pathname === "/signup") {
      try {
        const contentType = request.headers.get("content-type") || "";
        let body;

        if (contentType.includes("application/json")) {
          body = await request.json();
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const formText = await request.text();
          body = Object.fromEntries(new URLSearchParams(formText));
        } else {
          return new Response(
            JSON.stringify({ error: "Unsupported content type" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const { email, password, firstName, lastName } = body;
        const firebaseApiKey = env.FIREBASE_WEB_API_KEY;
        console.log("🔄 Signing up user:", email);
        console.log("🔑 env.FIREBASE_WEB_API_KEY:", firebaseApiKey); // TEMP LOG

        const signupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          }
        );

        const signupData = await signupRes.json();

        if (!signupRes.ok) {
          return new Response(
            JSON.stringify({ error: signupData.error.message }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // ✅ Optionally update the user's displayName
        await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken: signupData.idToken,
              displayName: `${firstName} ${lastName}`,
            }),
          }
        );

        return new Response(JSON.stringify({ message: "Signup successful!" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ✅ Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    

    // ✅ Serve static assets
    return env.ASSETS.fetch(request);
  },
};
