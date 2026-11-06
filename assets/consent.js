/*
 * Cookie consent + Google Analytics loader.
 *
 * - Google Analytics is NOT loaded until the visitor clicks "Accept".
 * - Until then (and after "Decline") gtag() is a harmless no-op, so the
 *   inline gtag("event", ...) calls on the pages never throw.
 * - The choice is remembered in localStorage (key "cookie-consent") and can be
 *   changed any time through the "Cookie settings" link added to the footer.
 */
(function () {
  "use strict";

  var GA_ID = "G-PHVY6HBTV6";
  var KEY = "cookie-consent"; // "granted" | "denied"
  var w = window;
  var d = document;

  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {}; // no-op until consent is granted

  function read() {
    try { return w.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(value) {
    try { w.localStorage.setItem(KEY, value); } catch (e) { /* storage blocked: choice lasts for this page only */ }
  }

  function loadAnalytics() {
    w["ga-disable-" + GA_ID] = false;
    if (w.__gaLoaded) return;
    w.__gaLoaded = true;
    w.gtag = function () { w.dataLayer.push(arguments); };
    var s = d.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    d.head.appendChild(s);
    w.gtag("js", new Date());
    w.gtag("config", GA_ID, { anonymize_ip: true });
  }

  function removeAnalyticsCookies() {
    w["ga-disable-" + GA_ID] = true;
    w.gtag = function () {};
    var host = w.location.hostname;
    var parts = host.split(".");
    var domains = ["", host, "." + host];
    if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
    d.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (name === "_ga" || name.indexOf("_ga_") === 0 || name === "_gid" || name.indexOf("_gat") === 0) {
        domains.forEach(function (dom) {
          d.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (dom ? "; domain=" + dom : "");
        });
      }
    });
  }

  var banner = null;

  function injectStyles() {
    if (d.getElementById("cc-style")) return;
    var css = [
      "#cc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:640px;margin:0 auto;",
      "background:#111;color:#fff;border:2px solid #ffed00;border-radius:10px;padding:16px 18px;",
      "font:14px/1.5 'Montserrat',Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)}",
      "#cc-banner p{margin:0 0 12px}",
      "#cc-banner a{color:#ffed00;text-decoration:underline}",
      "#cc-banner .cc-actions{display:flex;gap:10px;flex-wrap:wrap}",
      "#cc-banner button{flex:1 1 120px;min-height:44px;padding:10px 16px;border-radius:6px;cursor:pointer;",
      "font:700 14px 'Montserrat',Arial,sans-serif;border:2px solid #ffed00;background:#ffed00;color:#111}",
      "#cc-banner button.cc-secondary{background:transparent;color:#fff}",
      "#cc-banner button:focus-visible{outline:3px solid #fff;outline-offset:2px}",
      ".cc-footer-link{margin-left:12px;font-size:.9em}",
      ".cc-footer-link a,.cc-footer-link button{color:inherit;text-decoration:underline;background:none;border:0;padding:0;",
      "font:inherit;cursor:pointer}"
    ].join("");
    var st = d.createElement("style");
    st.id = "cc-style";
    st.textContent = css;
    d.head.appendChild(st);
  }

  function hideBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function choose(value) {
    write(value);
    hideBanner();
    if (value === "granted") loadAnalytics(); else removeAnalyticsCookies();
  }

  function showBanner() {
    if (banner) return;
    injectStyles();
    banner = d.createElement("div");
    banner.id = "cc-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      "<p>This site uses Google Analytics cookies to understand how it is used. " +
      "They are only set if you accept. " +
      "<a href=\"/privacy/\">Privacy &amp; cookies</a></p>" +
      "<div class=\"cc-actions\">" +
      "<button type=\"button\" class=\"cc-secondary\" data-cc=\"denied\">Decline</button>" +
      "<button type=\"button\" data-cc=\"granted\">Accept</button>" +
      "</div>";
    banner.addEventListener("click", function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute("data-cc");
      if (v) choose(v);
    });
    d.body.appendChild(banner);
  }

  function addFooterLink() {
    var footer = d.querySelector("footer");
    if (!footer || footer.querySelector(".cc-footer-link")) return;
    injectStyles();
    var span = d.createElement("span");
    span.className = "cc-footer-link";
    span.innerHTML = "<a href=\"/privacy/\">Privacy</a> | <button type=\"button\">Cookie settings</button>";
    span.querySelector("button").addEventListener("click", showBanner);
    footer.appendChild(span);
  }

  var saved = read();
  if (saved === "granted") loadAnalytics();

  function ready() {
    addFooterLink();
    if (saved !== "granted" && saved !== "denied") showBanner();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", ready); else ready();
})();
