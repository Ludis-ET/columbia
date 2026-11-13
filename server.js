// LiteSpeed loads this file with require(). Keep it valid in both module modes
// and never introduce top-level await or static ESM imports here.
import("./cpanel.cjs").catch((error) => {
  console.error("[startup] Unable to start Columbia Care:", error);
  process.exit(1);
});
