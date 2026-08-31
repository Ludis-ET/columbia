/**
 * Scroll reveal, without the failure mode.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT A REACT COMPONENT ANY MORE
 *
 * The old Reveal was a client component that rendered
 * `initial={{ opacity: 0 }}` and animated to 1 when it scrolled into view. That
 * meant ANYTHING which stopped the animation from running left the content
 * permanently invisible. When a hydration bug broke the client tree, 34 elements
 * across the page stayed at zero opacity and the Care section and day timeline
 * rendered blank, while the markup stayed perfect and every test passed.
 *
 * On a care home website that failure mode is unacceptable. So it is inverted:
 *
 *   - The server renders content VISIBLE. No opacity in the HTML.
 *   - This script, inlined in <head>, adds `.reveal-ready` to <html> before
 *     first paint, which is what arms the hidden state in CSS.
 *   - The same script owns one IntersectionObserver for every [data-reveal].
 *
 * It never touches React, so hydration cannot break it. If the script fails to
 * parse, `.reveal-ready` is never added and everything is simply visible. There
 * is also a belt-and-braces timeout that reveals everything after 3 seconds no
 * matter what, so a broken observer can never hide content either.
 *
 * Worst case is "no animation". Never "no website".
 * ---------------------------------------------------------------------------
 */

/** Seconds. Matches the house rhythm in CLAUDE.md: 320ms rise, 60ms stagger. */
export const REVEAL_STAGGER = 0.06;

export const revealScript = `(function(){
try{
var d=document,e=d.documentElement;
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches||e.getAttribute("data-motion")==="reduce";
if(reduce)return;
e.classList.add("reveal-ready");
var show=function(el){el.setAttribute("data-revealed","");};
var revealAll=function(){var n=d.querySelectorAll("[data-reveal]:not([data-revealed])");for(var i=0;i<n.length;i++)show(n[i]);};
var start=function(){
  if(!("IntersectionObserver" in window)){revealAll();return;}
  var io=new IntersectionObserver(function(entries){
    for(var i=0;i<entries.length;i++){if(entries[i].isIntersecting){show(entries[i].target);io.unobserve(entries[i].target);}}
  },{rootMargin:"0px 0px -8% 0px",threshold:0.01});
  var nodes=d.querySelectorAll("[data-reveal]");
  for(var i=0;i<nodes.length;i++)io.observe(nodes[i]);
  setTimeout(revealAll,3000);
};
// Defer attribute changes until after React hydrates — the head script may run
// before hydration finishes, and data-revealed on in-viewport nodes causes a
// mismatch if the observer fires too early.
var scheduleStart=function(){
  if(typeof requestAnimationFrame!=="undefined"){
    requestAnimationFrame(function(){requestAnimationFrame(start);});
  }else{setTimeout(start,0);}
};
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",scheduleStart);else scheduleStart();
}catch(err){
  // Any failure at all leaves the content visible, which is the safe default.
  try{document.documentElement.classList.remove("reveal-ready");}catch(e2){}
}
})();`;
