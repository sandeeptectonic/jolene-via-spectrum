"use strict";

/*
  {% if customer %}
    <script type="text/javascript">
      window.customerId = "{{ customer.id }}";   
    </script>
  {% endif %}
  {{ 'tt_heimdall.js' | asset_url | script_tag }}
*/

var startTime = Date.now();

var COOKIE_DOMAINS = [".jolene.club"];
var AB_DEST_TECTONIC = "tectonic";
var AB_DEST_SHOPIFY = "shopify";
var AB_DEST_COOKIE_NAME = "_tt_ab_dest";
var AB_DEST_COOKIE_VERSION = "_tt_ab_dest_ver";
var CID_COOKIE_NAME = "_tt_shopify_cid";
var TECTONIC_SHOP_DOMAIN = "jolene.club";
var SHOPIFY_SHOP_DOMAIN = "shop.jolene.club";
var HEIMDALL_LOGGER_HOST = "tectonic-heimdall.pages.dev";
var AB_DESTS = new Set([AB_DEST_SHOPIFY, AB_DEST_TECTONIC]);

var SESSION_ID_TTL_DAYS = 1 / (24 * 2);
var REFERRER_TTL_DAYS = 1 / (24 * 6);

var TT_HERMES_DEVICE_ID_KEY = "__tt_hermes_device_id";
var TT_DEVICE_ID_KEY = "__tt_hermes_client_device_id";
var TT_SESSION_ID_KEY = "__tt_hermes_client_session_id";
var TT_CLIENT_INSTANCE_ID_KEY = "__tt_hermes_client_instance_id";
var TT_HEIMDALL_REFERRER = "__tt_heimdall_referrer";
var TT_SHOPIFY_B2B_REFERRER = "__tt_shopify_b2b_referrer";

var TT_SESS_DEST = "__tt_heimdall_sess_dest";
var TT_DEBUG_DEST_KEY = "tt_heimdall_debug_dest";
var SHOPIFY_THEME_EDITOR_PREVIEW_PARAM = "oseid";
var SHOPIFY_THEME_PREVIEW_ID_PARAM = "preview_theme_id";
var SHOPIFY_THEME_PREVIEW_KEY_PARAM = "preview_key";
var SHOPIFY_THEME_PREVIEW_HOST = "shopifypreview.com";

var HEIMDALL_AB_CONFIG = {
  TEST_MODE: false,
  ROUTE_DESKTOP_TO_SHOPIFY: false,
  ROUTE_BOTS_TO_SHOPIFY: true,
  ROUTE_ADS_TO_SHOPIFY: false,
  TT_DEST_THRESH: 0,
  TT_AD_DEST_THRESH: 0,
  TT_DEST_VERSION: 10,
  CUTOVER_DONE: true,
  ORG: "jolene",
};

var TEST_USERS_LIST = new Set([]);

var SHOPIFY_ROUTES = new Set([
  "apps/return_prime",
  "/cdn/shop",
  "/cart.js",
  "/widget",
  "/api/redirect-hit",
  "/apps/wigzo",
  "/_t/c",
  "zevi",
  "robots.txt",
  ".mp4",
  ".js",
  ".css",
  ".json",
  ".html",
  ".png",
  ".jpeg",
  ".jpg",
  ".webp",
  "sitemap",
  "/account",
  "/checkouts",
  "/orders",
  "/cart",
]);

function isEmptyStr(value) {
  return (
    value == null || (typeof value === "string" && value.trim().length === 0)
  );
}

function _createForOfIteratorHelper(o, allowArrayLike) {
  var it =
    (typeof Symbol !== "undefined" && o[Symbol.iterator]) || o["@@iterator"];
  if (!it) {
    if (
      Array.isArray(o) ||
      (it = _unsupportedIterableToArray(o)) ||
      (allowArrayLike && o && typeof o.length === "number")
    ) {
      if (it) o = it;
      var i = 0;
      var F = function F() { };
      return {
        s: F,
        n: function n() {
          if (i >= o.length) return { done: true };
          return { done: false, value: o[i++] };
        },
        e: function e(_e) {
          throw _e;
        },
        f: F,
      };
    }
    throw new TypeError(
      "Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
    );
  }
  var normalCompletion = true,
    didErr = false,
    err;
  return {
    s: function s() {
      it = it.call(o);
    },
    n: function n() {
      var step = it.next();
      normalCompletion = step.done;
      return step;
    },
    e: function e(_e2) {
      didErr = true;
      err = _e2;
    },
    f: function f() {
      try {
        if (!normalCompletion && it["return"] != null) it["return"]();
      } finally {
        if (didErr) throw err;
      }
    },
  };
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}

var logDetails = {
  config: {
    testMode: HEIMDALL_AB_CONFIG.TEST_MODE,
    destVersion: HEIMDALL_AB_CONFIG.TT_DEST_VERSION,
    destThreshold: HEIMDALL_AB_CONFIG.TT_DEST_THRESH,
    adDestThreshold: HEIMDALL_AB_CONFIG.TT_AD_DEST_THRESH,
    routeDesktopToShopify: HEIMDALL_AB_CONFIG.ROUTE_DESKTOP_TO_SHOPIFY,
    routeBotsToShopify: HEIMDALL_AB_CONFIG.ROUTE_BOTS_TO_SHOPIFY,
    routeAdsToShopify: HEIMDALL_AB_CONFIG.ROUTE_ADS_TO_SHOPIFY,
    isCutOverDone: HEIMDALL_AB_CONFIG.CUTOVER_DONE,
    org: HEIMDALL_AB_CONFIG.ORG,
  },
  input: {},
  state: {},
  output: {},
};

var globalProps = {
  referrer: document.referrer || "",
};

var debugDestination = "";
var isThemePreview = false;
var heimdallErr = null;
var isErrored = false;
var execTime = null;
var sendImmediately = false;
var isB2BReferrer = false;

var bots = [
  // generic
  "bot",
  // googlebot, bingbot, telegrambot, twitterbot, yandexbot, etc.
  "check",
  "cloud",
  // cloudflare, cloudinary, etc.
  "crawler",
  "download",
  "monitor",
  // monitor & monitoring
  "preview",
  // skypeuripreview, bingpreview, yahoo link preview, etc.
  "scan",
  "spider",
  // baiduspider, 360spider, screaming frog seo spider, etc.

  // search engines
  "google",
  "qwantify",
  "yahoo",
  "duckduckgo",
  // aggregators, messengers and social networks
  "facebookexternalhit",
  "flipboard",
  "tumblr",
  "vkshare",
  "whatsapp",
  // downloaders
  "curl",
  "perl",
  "python",
  "wget",
  // high activity scanners
  "heritrix",
  "ia_archiver",
];
var isBotRegex = new RegExp("(".concat(bots.join("|"), ")"), "i");
function isBot(userAgent) {
  return isBotRegex.test(userAgent);
}

function checkIfMobile(userAgent) {
  return (
    /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(userAgent) ||
    /\b(Android|Windows Phone|iPad|iPod)\b/i.test(userAgent)
  );
}

function checkIfSocialBrowser(userAgent) {
  return (
    !isEmptyStr(userAgent) &&
    (userAgent.toLowerCase().indexOf("instagram") !== -1 ||
      userAgent.toLowerCase().indexOf("facebook") !== -1)
  );
}

function generateRandomId() {
  return Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, 16);
}

var _sending = false;
var _deferSendTimer = null;

// we an an internal _id to each event object in the format upoc-counter
// this makes it easier for us to remove successfully sent event from local db
var _internalEventIdPrefix = new Date().getTime();
var _internalEventIdCounter = 0;

var transactions = {
  _key: "tt-heimdall-logger",

  // maximum number of items allowed before we start dropping first items
  _maxLength: 100,

  // returns a list of all transactions or empty array
  all: function () {
    return JSON.parse(localStorage.getItem(transactions._key) || "[]");
  },

  // adds an item to the transaction log
  add: function (data) {
    // get existing transactions
    var existing = transactions.all();

    // increase event _id counter
    _internalEventIdCounter++;

    // add a unique event id (makes it easier for us to clean up sent events)
    data._id = _internalEventIdPrefix + "-" + _internalEventIdCounter;

    // if adding this item takes us over the max number of events
    if (existing.length + 1 > transactions._maxLength) {
      // remove the first item added
      existing.shift();
    }

    // add latest to end of stack
    existing.push(data);

    // save changes
    localStorage.setItem(transactions._key, JSON.stringify(existing));
  },

  // removes events from the transaction log
  remove: function (itemsToRemove) {
    // get array of ids to remove
    var idsToRemove = (itemsToRemove || []).map(function (item) {
      return item._id;
    });

    // go through existing transactions, removing items that contain a matching id
    var remaining = transactions.all().filter(function (item) {
      return idsToRemove.indexOf(item._id) === -1;
    });

    // save changes
    localStorage.setItem(transactions._key, JSON.stringify(remaining));
  },

  // clears any pending transactions
  clear: function () {
    localStorage.setItem(transactions._key, JSON.stringify([]));
  },
};

function promisesInSequence(promises) {
  var result = Promise.resolve();

  promises.forEach(function (promise) {
    result = result.then(promise);
  });

  return result;
}

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function sendLog(logObject) {
  var url = "https://".concat(HEIMDALL_LOGGER_HOST, "/heimdall/log");
  var dataToSend = window.btoa(
    unescape(encodeURIComponent(JSON.stringify(logObject)))
  );
  url += "?log_data=" + encodeURIComponent(dataToSend);
  return fetch(url, { method: "GET", keepalive: true });
}

function sendAsync() {
  // if we're busy sending
  if (_sending) {
    // clear defer timeout if it exists
    if (_deferSendTimer) clearTimeout(_deferSendTimer);
    // set a new timer to recall send in .5s
    _deferSendTimer = setTimeout(sendAsync, 500);
    // exit
    return;
  }

  // get all items waiting to be sent
  var items = transactions.all();

  // if we have nothing to send, exit
  if (items.length === -1) return;

  // otherwise, flag sending as started
  _sending = true;

  // clear defer timeout if it exists
  if (_deferSendTimer) {
    clearTimeout(_deferSendTimer);
    _deferSendTimer = null;
  }

  // convert each pending transaction into a request promise
  var requests = items.map(function (item) {
    return function () {
      // do not modify the original
      var itemToSend = cloneObject(item);
      // console.log("Sending deferred requests");
      return sendLog(itemToSend.eventBody)
        .then(function (respPromise) {
          // mark item as completed
          item.__completed = true;
          return respPromise.text();
        })
        .then(function (response) {
          // console.log("Log event response ", response);
        });
    };
  });

  // execute requests in order, if any fail, stop executing as we need transactions to be in order
  promisesInSequence(requests)
    .then(function () {
      // get completed requests
      var completedRequests = items.filter(function (item) {
        return item.__completed;
      });

      // remove completed requests from pending transaction
      transactions.remove(completedRequests);

      // mark sending complete
      _sending = false;
    })
    .catch(function (logSendErr) {
      // console.error("Error in sending batched requests", logSendErr)
      // something went wrong, allow this method to be recalled
      _sending = false;
    });
}

function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "expires=".concat(date.toUTCString(), ";");
  }
  COOKIE_DOMAINS.forEach(function (cookieDomain) {
    var cookieStr = ""
      .concat(name, "=")
      .concat(encodeURIComponent(value || ""), "; ")
      .concat(expires, " domain=")
      .concat(cookieDomain, "; path=/;");
    // console.log("cookieStr", cookieStr);
    document.cookie = cookieStr;
  });
  // document.cookie = name + "=" + (value || "")  + expires + "; domain=.st9.tech; path=/";
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

function eraseCookie(name) {
  COOKIE_DOMAINS.forEach(function (cookieDomain) {
    var cookieStr = ""
      .concat(name, "=; domain=")
      .concat(cookieDomain, "; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;");
    document.cookie = cookieStr;
  });
  // document.cookie = name +'=; domain=.st9.tech; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function checkIsShopifyRoute(path, pathsList) {
  if (pathsList.has(path)) {
    return true;
  }
  var _iterator = _createForOfIteratorHelper(pathsList),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var pathItem = _step.value;
      if (path.startsWith(pathItem) || path.indexOf(pathItem) !== -1) {
        return true;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return false;
}

function generateRedirectionUrl(ttResolvedDest, requestId) {

  var originalUrl = new URL(window.location.href)
  var originalUrlSearchParams = originalUrl.searchParams
  var originHost = originalUrl.host;

  var redirectionHost =
    ttResolvedDest === AB_DEST_TECTONIC
      ? TECTONIC_SHOP_DOMAIN
      : SHOPIFY_SHOP_DOMAIN;

  var redirectionUrl = new URL(
    window.location.href.replace(originHost, redirectionHost)
  );

  if (requestId) {
    var finalQueryParams = "?".concat("request_id=", requestId)
    if (originalUrlSearchParams.size > 0) {
      finalQueryParams = finalQueryParams.concat("&", originalUrlSearchParams.toString())
    }
    redirectionUrl.search = finalQueryParams
    // redirectionUrl.searchParams.set("request_id", requestId);
  }

  return redirectionUrl.toString();
}

function getOrCreateDeviceId() {
  // var deviceId = localStorage.getItem(TT_DEVICE_ID_KEY);
  // if (isEmptyStr(deviceId)) {
  //   // console.log("Device id absent generating");
  //   deviceId = generateRandomId();
  // }
  // localStorage.setItem(TT_DEVICE_ID_KEY, deviceId);
  var deviceId = getCookie(TT_DEVICE_ID_KEY);
  if (isEmptyStr(deviceId)) {
    // console.log("Session id absent/expired generating");
    deviceId = generateRandomId();
  }
  setCookie(TT_DEVICE_ID_KEY, deviceId, 30);
  return deviceId;
}

function getOrCreateHermesDeviceId() {
  var deviceId = getCookie(TT_HERMES_DEVICE_ID_KEY);
  if (isEmptyStr(deviceId)) {
    // console.log("Session id absent/expired generating");
    deviceId = generateRandomId();
  }
  setCookie(TT_HERMES_DEVICE_ID_KEY, deviceId, 180);
  return deviceId;
}

function getSessionId() {
  var sessionId = getCookie(TT_SESSION_ID_KEY);
  if (isEmptyStr(sessionId)) {
    // console.log("Session id absent/expired generating");
    sessionId = generateRandomId();
  }
  setCookie(TT_SESSION_ID_KEY, sessionId, SESSION_ID_TTL_DAYS);
  return sessionId;
}

function getClientInstanceId() {
  var clientInstanceId = getCookie(TT_CLIENT_INSTANCE_ID_KEY);
  if (isEmptyStr(clientInstanceId)) {
    // console.log("Client Instance Id absent/expired generating");
    clientInstanceId = generateRandomId();
  }
  setCookie(TT_CLIENT_INSTANCE_ID_KEY, clientInstanceId);
  return clientInstanceId;
}

function setCurrentSessionDestination(dest) {
  setCookie(TT_SESS_DEST, dest);
}

function getCurrentSessionDestination() {
  return getCookie(TT_SESS_DEST);
}

function getConnectionType() {
  var connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    {};
  return connection.effectiveType || connection.type || "";
}

var currentUrl = window.location.href || "";
var currentUrlSearch = window.location.search

try {
  window.addEventListener(window.cordova ? "deviceready" : "load", sendAsync, {
    passive: true,
  });
  window.addEventListener("online", sendAsync, { passive: true });
} catch (sendSetupErr) {
  console.error("[HEIMDALL_SEND_SETUP_ERR] ", sendSetupErr);
}

try {
  debugDestination =
    new URLSearchParams(currentUrlSearch).get(TT_DEBUG_DEST_KEY) || "";
} catch (debugDestErr) {
  console.error("[HEIMDALL_DEBUG_SETUP_ERR] ", debugDestErr);
}

try {
  var urlSearchParams = new URLSearchParams(currentUrlSearch)
  isThemePreview = !isEmptyStr(urlSearchParams.get(SHOPIFY_THEME_EDITOR_PREVIEW_PARAM) || urlSearchParams.get(SHOPIFY_THEME_PREVIEW_ID_PARAM) || urlSearchParams.get(SHOPIFY_THEME_PREVIEW_KEY_PARAM) || "") || (window.location.href.indexOf(SHOPIFY_THEME_PREVIEW_HOST) !== -1);
  // console.log("isThemePreview", isThemePreview)
} catch (previewParamErr) {
  console.error("[HEIMDALL_DEBUG_SETUP_ERR] ", previewParamErr);
}


try {
  var isB2BReferrer = document.referrer.indexOf("shopify") !== -1
  if (isB2BReferrer) {
    setCookie(TT_SHOPIFY_B2B_REFERRER, document.referrer)
  } else {
    isB2BReferrer = !isEmptyStr(getCookie(TT_SHOPIFY_B2B_REFERRER))
  }
} catch (b2bReferrerCheckError) {
  console.error("[HEIMDALL_DEBUG_SETUP_ERR] ", b2bReferrerCheckError);
}

try {
  globalProps["connectionType"] = getConnectionType();
  var connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  if (connection && connection.addEventListener) {
    connection.addEventListener("change", function () {
      globalProps["connectionType"] = getConnectionType();
    });
  }
} catch (connErr) {
  console.error("[HEIMDALL_SETUP_ERR] ", connErr);
}

var requestId = generateRandomId();

try {
  var reqPath = window.location.pathname.replace(/\/$/, "").toLowerCase();

  var currentDestination = getCurrentSessionDestination();
  // console.log("currentDestination", currentDestination);

  var userAgent = window.navigator.userAgent;
  // console.log("userAgent", userAgent);

  var sessionId = getSessionId();
  // console.log("sessionId", sessionId);

  var deviceId = getOrCreateDeviceId();
  // console.log("deviceId", deviceId);

  var hermesDeviceId = getOrCreateHermesDeviceId();

  var clientInstanceId = getClientInstanceId();

  var customerId = window.customerId || "";
  // console.log("deviceId", deviceId);

  // const client = new ClientJS();
  // // Get the client's fingerprint id
  // const fingerprint = client.getFingerprint();
  // console.log("fingerprint", fingerprint);

  logDetails["input"] = {
    requestId: requestId,
    currentUrl: currentUrl,
    deviceId: deviceId,
    sessionId: sessionId,
    userAgent: userAgent,
    customerId: customerId,
    clientInstanceId: clientInstanceId,
    currentSessionDestination: currentDestination,
  };

  var isDesktop = !checkIfMobile(userAgent);
  var isSocialBrowser = checkIfSocialBrowser(userAgent);
  var isBotReq = isBot(userAgent);

  // console.log("Device info", isDesktop, isSocialBrowser, isBotReq);

  var queryParams = new URLSearchParams(currentUrlSearch);
  var adQueryParams = [
    queryParams.get("tw_source"),
    queryParams.get("utm_source"),
    queryParams.get("tw_adid"),
    queryParams.get("tw_campaign"),
    queryParams.get("fbclid"),
    queryParams.get("gclid"),
  ].filter(function (data) {
    return !isEmptyStr(data);
  }).map(function (ad_param) {
    return ad_param.toLowerCase();
  });

  var isAdReq = adQueryParams.length > 0;
  var isGoogleAdReq = adQueryParams.indexOf("google") >= 0 || currentUrlSearch.includes("gclid")

  var currentCookie = getCookie(AB_DEST_COOKIE_NAME);
  var currentCookieVersion = getCookie(AB_DEST_COOKIE_VERSION);
  var tectonicCustIdCookie = getCookie(CID_COOKIE_NAME);

  // console.log(
  //   "[TT_HEIMDALL]",
  //   currentCookie,
  //   currentCookieVersion,
  //   tectonicCustIdCookie
  // );

  var ttABDest = isEmptyStr(currentCookie) ? "" : currentCookie;

  var ttABDestVersion = isEmptyStr(currentCookieVersion)
    ? -1
    : parseInt(currentCookieVersion);

  logDetails["input"]["ttABDestCookie"] = ttABDest;
  logDetails["input"]["ttABDestVersionCookie"] = ttABDestVersion;

  var shouldRouteAdsToShopify = HEIMDALL_AB_CONFIG.ROUTE_ADS_TO_SHOPIFY;
  var shouldRouteDesktopToShopify = HEIMDALL_AB_CONFIG.ROUTE_DESKTOP_TO_SHOPIFY;
  var shouldRouteBotsToShopify = HEIMDALL_AB_CONFIG.ROUTE_BOTS_TO_SHOPIFY;
  var isTestMode = HEIMDALL_AB_CONFIG.TEST_MODE;
  var isCutoverDone = HEIMDALL_AB_CONFIG.CUTOVER_DONE;

  logDetails["state"] = {
    shouldRouteAdsToShopify: shouldRouteAdsToShopify,
    shouldRouteDesktopToShopify: shouldRouteDesktopToShopify,
    shouldRouteBotsToShopify: shouldRouteBotsToShopify,
    isTestMode: isTestMode,
    isGoogleAdReq: isGoogleAdReq,
    isCutoverDone: isCutoverDone,
    isB2BReferrer: isB2BReferrer,
    isAdReq: isAdReq,
    isBotReq: isBotReq,
    isDesktop: isDesktop,
  };

  var hasDebugDestination = AB_DESTS.has(debugDestination);
  logDetails["state"]["hasDebugDestination"] = hasDebugDestination;

  var isShopifyRoute = checkIsShopifyRoute(reqPath, SHOPIFY_ROUTES);
  logDetails["state"]["isShopifyRoute"] = isShopifyRoute;

  var isTestUser =
    (tectonicCustIdCookie && TEST_USERS_LIST.has(tectonicCustIdCookie)) ||
    false;

  logDetails["state"]["isTestUser"] = isTestUser;

  var shouldForceCurrReqToShopify =
    isB2BReferrer ||
    isShopifyRoute ||
    isThemePreview ||
    (shouldRouteAdsToShopify && isAdReq) ||
    (shouldRouteBotsToShopify && isBotReq) ||
    (shouldRouteDesktopToShopify && isDesktop);

  logDetails["state"]["shouldForceCurrReqToShopify"] =
    shouldForceCurrReqToShopify;

  var ttTempABDest = "";
  var ttADDestProb = -1;
  if (isTestMode || shouldForceCurrReqToShopify) {
    ttTempABDest = AB_DEST_SHOPIFY;
  }
  if (isTestUser && !shouldForceCurrReqToShopify) {
    ttTempABDest = AB_DEST_TECTONIC;
  }
  if (hasDebugDestination) {
    ttTempABDest = debugDestination;
  }
  if (!shouldRouteAdsToShopify && isAdReq && !shouldForceCurrReqToShopify && !isTestMode) {
    ttADDestProb = Math.random();
    ttTempABDest =
      ttADDestProb > HEIMDALL_AB_CONFIG.TT_AD_DEST_THRESH
        ? AB_DEST_TECTONIC
        : AB_DEST_SHOPIFY;
  }

  if (!isTestMode && !shouldForceCurrReqToShopify && !hasDebugDestination && isCutoverDone) {
    ttTempABDest = AB_DEST_TECTONIC;
  }

  logDetails["output"]["tempABDest"] = ttTempABDest;
  logDetails["output"]["ttADDestProb"] = ttADDestProb.toString();

  var isRegularReq = ttTempABDest === "";

  logDetails["output"]["isRegularReq"] = isRegularReq;

  var isCookieAbsentOrOutdated =
    !AB_DESTS.has(ttABDest) ||
    ttABDestVersion < HEIMDALL_AB_CONFIG.TT_DEST_VERSION;

  logDetails["output"]["isCookieAbsentOrOutdated"] = isCookieAbsentOrOutdated;

  var ttDestProb = -1;
  var isModified = false;

  if (isRegularReq && isCookieAbsentOrOutdated) {
    isModified = true;
    ttDestProb = Math.random();
    if (isTestUser || ttDestProb > HEIMDALL_AB_CONFIG.TT_DEST_THRESH) {
      ttABDest = AB_DEST_TECTONIC;
    } else {
      ttABDest = AB_DEST_SHOPIFY;
    }
    ttABDestVersion = HEIMDALL_AB_CONFIG.TT_DEST_VERSION;
  }

  logDetails["output"]["tectonicABDest"] = ttABDest;
  logDetails["output"]["tectonicABDestVersion"] = ttABDestVersion.toString();
  logDetails["output"]["ttDestProb"] = ttDestProb.toString();
  logDetails["output"]["isModified"] = isModified;

  var ttResolvedDest = isRegularReq ? ttABDest : ttTempABDest;

  // Only use session destination if cutover is not done, if it is done then send to tectonic
  // sending to tectonic is determined above in the last step of temp destination
  if (!isCutoverDone && !isTestMode && !isEmptyStr(currentDestination) && AB_DESTS.has(currentDestination)) {
    ttResolvedDest = currentDestination;
  }


  // Double ensuring things to go tectonic once cutover is done
  if (!isTestMode && !shouldForceCurrReqToShopify && !hasDebugDestination && isCutoverDone) {
    ttResolvedDest = AB_DEST_TECTONIC;
  }

  logDetails["output"]["ttResolvedDest"] = ttResolvedDest;

  if (isRegularReq && AB_DESTS.has(ttABDest)) {
    setCookie(AB_DEST_COOKIE_NAME, ttABDest, 180);
    setCookie(AB_DEST_COOKIE_VERSION, "".concat(ttABDestVersion), 180);
  }

  var ttResolvedUrl = generateRedirectionUrl(ttResolvedDest, requestId);

  logDetails["output"]["ttResolvedUrl"] = ttResolvedUrl;

  // console.log("ttResolvedDest", ttResolvedDest);
  execTime = Date.now() - startTime;
  // console.log("execTime", execTime);

  // console.log("Final log", logDetails);
  if (ttResolvedDest === AB_DEST_TECTONIC) {
    sendImmediately = true;
    setCurrentSessionDestination(ttResolvedDest);
    setCookie(TT_HEIMDALL_REFERRER, document.referrer || "", REFERRER_TTL_DAYS)
    window.location.replace(ttResolvedUrl);
  } else if (ttResolvedDest === AB_DEST_SHOPIFY) {
    setCurrentSessionDestination(ttResolvedDest);
  }
  // console.log("TT_HEIMDALL_SUCCESS")
} catch (execErr) {
  console.error("[HEIMDALL_EXEC_ERR] ", execErr);
  heimdallErr = execErr.stack || execErr.message;
  isErrored = true;
} finally {
  try {
    Object.keys(globalProps).forEach(function (propName) {
      logDetails["input"][propName] = globalProps[propName];
    });

    logDetails["input"]["encodedUrl"] = window.btoa(currentUrl);

    var logBody = {
      heimdall: logDetails,
      client: {
        url: currentUrl,
        _time: Date.now(),
        execStatus: isErrored ? "FAILED" : "SUCCESS",
        execTime: execTime,
        error: heimdallErr,
      },
    };

    if (sendImmediately) {
      sendLog(logBody);
    } else {
      transactions.add({ eventBody: logBody });
      sendAsync();
    }
  } catch (sendErr) {
    console.error("[HEIMDALL_SEND_ERR] ", sendErr);
  }
}
