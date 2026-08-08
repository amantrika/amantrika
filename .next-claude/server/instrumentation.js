"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/* harmony import */ var _opentelemetry_exporter_logs_otlp_http__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @opentelemetry/exporter-logs-otlp-http */ \"(instrument)/./node_modules/@opentelemetry/exporter-logs-otlp-http/build/esm/platform/node/OTLPLogExporter.js\");\n/* harmony import */ var _opentelemetry_resources__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @opentelemetry/resources */ \"(instrument)/./node_modules/@opentelemetry/resources/build/esm/ResourceImpl.js\");\n/* harmony import */ var _opentelemetry_sdk_logs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @opentelemetry/sdk-logs */ \"(instrument)/./node_modules/@opentelemetry/sdk-logs/build/esm/LoggerProvider.js\");\n/* harmony import */ var _opentelemetry_sdk_logs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @opentelemetry/sdk-logs */ \"(instrument)/./node_modules/@opentelemetry/sdk-logs/build/esm/platform/node/export/BatchLogRecordProcessor.js\");\n\n\n\n/**\n * Ships server-side logs to PostHog over OTLP.\n *\n * Next.js calls `register()` once per runtime at startup. `instrumentation.ts`\n * is stable in Next 15, so no `experimental.instrumentationHook` flag is needed\n * — setting it would be rejected as an unknown option.\n */ function register() {\n    // The OTLP HTTP exporter needs Node APIs; the edge runtime also invokes\n    // register(), so bail out there.\n    if (false) {}\n    const token = \"phc_o9oNhY5jgX5MoYNMabuib4ZAKa88Yp5bvUuD9f4DDJGj\";\n    if (!token) return; // Logging is optional, exactly like event capture.\n    const host = \"https://us.i.posthog.com\" ?? 0;\n    const exporter = new _opentelemetry_exporter_logs_otlp_http__WEBPACK_IMPORTED_MODULE_0__.OTLPLogExporter({\n        url: `${host}/otlp/v1/logs`,\n        headers: {\n            Authorization: `Bearer ${token}`\n        }\n    });\n    const loggerProvider = new _opentelemetry_sdk_logs__WEBPACK_IMPORTED_MODULE_1__.LoggerProvider({\n        resource: (0,_opentelemetry_resources__WEBPACK_IMPORTED_MODULE_2__.resourceFromAttributes)({\n            \"service.name\": \"amantrika-web\",\n            \"service.version\": process.env.VERCEL_GIT_COMMIT_SHA ?? \"dev\",\n            \"deployment.environment\": process.env.VERCEL_ENV ?? \"development\"\n        }),\n        // Batched rather than Simple: a per-log HTTP round trip would add latency to\n        // every request that logs. The window is kept short because a serverless\n        // instance can be frozen soon after it responds.\n        processors: [\n            new _opentelemetry_sdk_logs__WEBPACK_IMPORTED_MODULE_3__.BatchLogRecordProcessor({\n                exporter,\n                scheduledDelayMillis: 500\n            })\n        ]\n    });\n    globalThis.__posthogLogger = loggerProvider.getLogger(\"amantrika-web\");\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUF5RTtBQUNQO0FBQ2dCO0FBRWxGOzs7Ozs7Q0FNQyxHQUNNLFNBQVNJO0lBQ2Qsd0VBQXdFO0lBQ3hFLGlDQUFpQztJQUNqQyxJQUFJQyxLQUFxQyxFQUFFLEVBQU87SUFFbEQsTUFBTUcsUUFBUUgsa0RBQTZDO0lBQzNELElBQUksQ0FBQ0csT0FBTyxRQUFRLG1EQUFtRDtJQUV2RSxNQUFNRSxPQUFPTCwwQkFBb0MsSUFBSSxDQUEwQjtJQUUvRSxNQUFNTyxXQUFXLElBQUlaLG1GQUFlQSxDQUFDO1FBQ25DYSxLQUFLLEdBQUdILEtBQUssYUFBYSxDQUFDO1FBQzNCSSxTQUFTO1lBQUVDLGVBQWUsQ0FBQyxPQUFPLEVBQUVQLE9BQU87UUFBQztJQUM5QztJQUVBLE1BQU1RLGlCQUFpQixJQUFJYixtRUFBY0EsQ0FBQztRQUN4Q2MsVUFBVWhCLGdGQUFzQkEsQ0FBQztZQUMvQixnQkFBZ0I7WUFDaEIsbUJBQW1CSSxRQUFRQyxHQUFHLENBQUNZLHFCQUFxQixJQUFJO1lBQ3hELDBCQUEwQmIsUUFBUUMsR0FBRyxDQUFDYSxVQUFVLElBQUk7UUFDdEQ7UUFDQSw2RUFBNkU7UUFDN0UseUVBQXlFO1FBQ3pFLGlEQUFpRDtRQUNqREMsWUFBWTtZQUNWLElBQUlsQiw0RUFBdUJBLENBQUM7Z0JBQUVVO2dCQUFVUyxzQkFBc0I7WUFBSTtTQUNuRTtJQUNIO0lBRUFDLFdBQVdDLGVBQWUsR0FBR1AsZUFBZVEsU0FBUyxDQUFDO0FBQ3hEIiwic291cmNlcyI6WyIvVXNlcnMvc3dhcm5pbC9Qcm9qZWN0cy9BbWFudHJpa2Evc3JjL2luc3RydW1lbnRhdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPVExQTG9nRXhwb3J0ZXIgfSBmcm9tIFwiQG9wZW50ZWxlbWV0cnkvZXhwb3J0ZXItbG9ncy1vdGxwLWh0dHBcIjtcbmltcG9ydCB7IHJlc291cmNlRnJvbUF0dHJpYnV0ZXMgfSBmcm9tIFwiQG9wZW50ZWxlbWV0cnkvcmVzb3VyY2VzXCI7XG5pbXBvcnQgeyBCYXRjaExvZ1JlY29yZFByb2Nlc3NvciwgTG9nZ2VyUHJvdmlkZXIgfSBmcm9tIFwiQG9wZW50ZWxlbWV0cnkvc2RrLWxvZ3NcIjtcblxuLyoqXG4gKiBTaGlwcyBzZXJ2ZXItc2lkZSBsb2dzIHRvIFBvc3RIb2cgb3ZlciBPVExQLlxuICpcbiAqIE5leHQuanMgY2FsbHMgYHJlZ2lzdGVyKClgIG9uY2UgcGVyIHJ1bnRpbWUgYXQgc3RhcnR1cC4gYGluc3RydW1lbnRhdGlvbi50c2BcbiAqIGlzIHN0YWJsZSBpbiBOZXh0IDE1LCBzbyBubyBgZXhwZXJpbWVudGFsLmluc3RydW1lbnRhdGlvbkhvb2tgIGZsYWcgaXMgbmVlZGVkXG4gKiDigJQgc2V0dGluZyBpdCB3b3VsZCBiZSByZWplY3RlZCBhcyBhbiB1bmtub3duIG9wdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICAvLyBUaGUgT1RMUCBIVFRQIGV4cG9ydGVyIG5lZWRzIE5vZGUgQVBJczsgdGhlIGVkZ2UgcnVudGltZSBhbHNvIGludm9rZXNcbiAgLy8gcmVnaXN0ZXIoKSwgc28gYmFpbCBvdXQgdGhlcmUuXG4gIGlmIChwcm9jZXNzLmVudi5ORVhUX1JVTlRJTUUgIT09IFwibm9kZWpzXCIpIHJldHVybjtcblxuICBjb25zdCB0b2tlbiA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1BPU1RIT0dfUFJPSkVDVF9UT0tFTjtcbiAgaWYgKCF0b2tlbikgcmV0dXJuOyAvLyBMb2dnaW5nIGlzIG9wdGlvbmFsLCBleGFjdGx5IGxpa2UgZXZlbnQgY2FwdHVyZS5cblxuICBjb25zdCBob3N0ID0gcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfUE9TVEhPR19IT1NUID8/IFwiaHR0cHM6Ly91cy5pLnBvc3Rob2cuY29tXCI7XG5cbiAgY29uc3QgZXhwb3J0ZXIgPSBuZXcgT1RMUExvZ0V4cG9ydGVyKHtcbiAgICB1cmw6IGAke2hvc3R9L290bHAvdjEvbG9nc2AsXG4gICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9LFxuICB9KTtcblxuICBjb25zdCBsb2dnZXJQcm92aWRlciA9IG5ldyBMb2dnZXJQcm92aWRlcih7XG4gICAgcmVzb3VyY2U6IHJlc291cmNlRnJvbUF0dHJpYnV0ZXMoe1xuICAgICAgXCJzZXJ2aWNlLm5hbWVcIjogXCJhbWFudHJpa2Etd2ViXCIsXG4gICAgICBcInNlcnZpY2UudmVyc2lvblwiOiBwcm9jZXNzLmVudi5WRVJDRUxfR0lUX0NPTU1JVF9TSEEgPz8gXCJkZXZcIixcbiAgICAgIFwiZGVwbG95bWVudC5lbnZpcm9ubWVudFwiOiBwcm9jZXNzLmVudi5WRVJDRUxfRU5WID8/IFwiZGV2ZWxvcG1lbnRcIixcbiAgICB9KSxcbiAgICAvLyBCYXRjaGVkIHJhdGhlciB0aGFuIFNpbXBsZTogYSBwZXItbG9nIEhUVFAgcm91bmQgdHJpcCB3b3VsZCBhZGQgbGF0ZW5jeSB0b1xuICAgIC8vIGV2ZXJ5IHJlcXVlc3QgdGhhdCBsb2dzLiBUaGUgd2luZG93IGlzIGtlcHQgc2hvcnQgYmVjYXVzZSBhIHNlcnZlcmxlc3NcbiAgICAvLyBpbnN0YW5jZSBjYW4gYmUgZnJvemVuIHNvb24gYWZ0ZXIgaXQgcmVzcG9uZHMuXG4gICAgcHJvY2Vzc29yczogW1xuICAgICAgbmV3IEJhdGNoTG9nUmVjb3JkUHJvY2Vzc29yKHsgZXhwb3J0ZXIsIHNjaGVkdWxlZERlbGF5TWlsbGlzOiA1MDAgfSksXG4gICAgXSxcbiAgfSk7XG5cbiAgZ2xvYmFsVGhpcy5fX3Bvc3Rob2dMb2dnZXIgPSBsb2dnZXJQcm92aWRlci5nZXRMb2dnZXIoXCJhbWFudHJpa2Etd2ViXCIpO1xufVxuIl0sIm5hbWVzIjpbIk9UTFBMb2dFeHBvcnRlciIsInJlc291cmNlRnJvbUF0dHJpYnV0ZXMiLCJCYXRjaExvZ1JlY29yZFByb2Nlc3NvciIsIkxvZ2dlclByb3ZpZGVyIiwicmVnaXN0ZXIiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9SVU5USU1FIiwidG9rZW4iLCJORVhUX1BVQkxJQ19QT1NUSE9HX1BST0pFQ1RfVE9LRU4iLCJob3N0IiwiTkVYVF9QVUJMSUNfUE9TVEhPR19IT1NUIiwiZXhwb3J0ZXIiLCJ1cmwiLCJoZWFkZXJzIiwiQXV0aG9yaXphdGlvbiIsImxvZ2dlclByb3ZpZGVyIiwicmVzb3VyY2UiLCJWRVJDRUxfR0lUX0NPTU1JVF9TSEEiLCJWRVJDRUxfRU5WIiwicHJvY2Vzc29ycyIsInNjaGVkdWxlZERlbGF5TWlsbGlzIiwiZ2xvYmFsVGhpcyIsIl9fcG9zdGhvZ0xvZ2dlciIsImdldExvZ2dlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/@opentelemetry"], () => (__webpack_exec__("(instrument)/./src/instrumentation.ts")));
module.exports = __webpack_exports__;

})();