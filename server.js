require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cookieSession = require("cookie-session");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(cookieSession({ name: "session", keys: [process.env.SESSION_SECRET || "trustbadge-secret-key"], maxAge: 24 * 60 * 60 * 1000 }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, APP_URL } = process.env;
const SCOPES = "write_script_tags,read_script_tags";

// OAuth Install
app.get("/auth", (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop parameter");
  const state = crypto.randomBytes(16).toString("hex");
  req.session.state = state;
  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&state=${state}&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { shop, hmac, code, state } = req.query;
  if (state !== req.session.state) return res.status(403).send("Invalid state");
  const map = Object.assign({}, req.query);
  delete map.hmac;
  const message = Object.keys(map).sort().map(k => `${k}=${map[k]}`).join("&");
  const digest = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(message).digest("hex");
  if (digest !== hmac) return res.status(403).send("HMAC validation failed");
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code })
  });
  const tokenData = await tokenRes.json();
  req.session.accessToken = tokenData.access_token;
  req.session.shop = shop;
  res.redirect(`/app?shop=${shop}`);
});

// Mandatory Privacy Webhooks (Shopify Compliance)
app.post("/webhooks/customers-redact", express.json(), (req, res) => {
  // Handle customer data redaction (GDPR)
  console.log("Customer redact webhook:", req.body);
  res.json({ success: true });
});

app.post("/webhooks/shop-redact", express.json(), (req, res) => {
  // Handle shop data deletion (store closure)
  console.log("Shop redact webhook:", req.body);
  res.json({ success: true });
});

app.post("/webhooks/customers-data-request", express.json(), (req, res) => {
  // Handle customer data request (GDPR export)
  console.log("Customer data request webhook:", req.body);
  res.json({ success: true });
});

// App Dashboard
app.get("/app", (req, res) => {
  const shop = req.query.shop || req.session.shop;
  req.session.shop = shop;
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Save settings and inject script tag
app.post("/api/save", async (req, res) => {
  const { shop, accessToken } = req.session;
  if (!accessToken) return res.status(401).json({ error: "Unauthorized" });
  const settings = req.body;
  const existing = await fetch(`https://${shop}/admin/api/2024-01/script_tags.json`, {
    headers: { "X-Shopify-Access-Token": accessToken }
  });
  const existingData = await existing.json();
  for (const tag of existingData.script_tags || []) {
    if (tag.src && tag.src.includes(APP_URL)) {
      await fetch(`https://${shop}/admin/api/2024-01/script_tags/${tag.id}.json`, {
        method: "DELETE", headers: { "X-Shopify-Access-Token": accessToken }
      });
    }
  }
  const scriptUrl = `${APP_URL}/badge.js?settings=${encodeURIComponent(JSON.stringify(settings))}`;
  await fetch(`https://${shop}/admin/api/2024-01/script_tags.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ script_tag: { event: "onload", src: scriptUrl } })
  });
  res.json({ success: true });
});

// Badge script injected into storefront
app.get("/badge.js", (req, res) => {
  let settings = {};
  try { settings = JSON.parse(decodeURIComponent(req.query.settings || "{}")); } catch (e) {}
  const {
    badges = ["secure", "returns", "support"],
    position = "bottom",
    bgColor = "#ffffff",
    textColor = "#333333",
    accentColor = "#22c55e"
  } = settings;

  const BADGE_DATA = {
    secure:   { icon: "🔒", text: "Secure Checkout" },
    returns:  { icon: "↩️", text: "Free Returns" },
    support:  { icon: "💬", text: "24/7 Support" },
    shipping: { icon: "🚚", text: "Free Shipping" },
    genuine:  { icon: "✅", text: "100% Genuine" },
    payment:  { icon: "💳", text: "Safe Payment" }
  };

  const selectedBadges = badges.map(b => BADGE_DATA[b]).filter(Boolean);
  const isBottom = position !== "top";

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(`(function(){
  var badges=${JSON.stringify(selectedBadges)};
  function init(){
    if(document.getElementById('tb-bar'))return;
    var bar=document.createElement('div');
    bar.id='tb-bar';
    bar.style.cssText='position:fixed;${isBottom?"bottom":"top"}:0;left:0;right:0;background:${bgColor};border-${isBottom?"top":"bottom"}:2px solid ${accentColor};display:flex;align-items:center;justify-content:center;gap:24px;padding:10px 20px;z-index:9999;flex-wrap:wrap;box-shadow:0 ${isBottom?"-2":"2"}px 12px rgba(0,0,0,0.08);font-family:-apple-system,sans-serif';
    badges.forEach(function(b){
      var d=document.createElement('div');
      d.style.cssText='display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:${textColor}';
      d.innerHTML='<span style="font-size:16px">'+b.icon+'</span><span>'+b.text+'</span>';
      bar.appendChild(d);
    });
    document.body.appendChild(bar);
    document.body.style.padding${isBottom?"Bottom":"Top"}='48px';
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();`);
});
app.get('/', (req, res) => {
  res.redirect('/app');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TrustBadge running on http://localhost:${PORT}`));
