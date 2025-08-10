// birthday-letter.js
jQuery(function ($) {
  const $body    = $("body");
  const $cb      = $("#messageState");
  const $msg     = $(".message");
  const $heart   = $(".heart");
  const $overlay = $(".bg-overlay");
  const $instr   = $(".instruction");

  // timing + tint
  const LETTER_MS  = 2000;
  const OPEN_TINT  = "#f48fb1";
  const CLOSE_TINT = "transparent";

  // keep heart transition in lock-step with the letter
  $heart.css("transition", `top ${LETTER_MS}ms ease, transform ${LETTER_MS}ms ease`);

  /* ---------------- Music ---------------- */
  const audio      = document.getElementById("bgMusic");
  const $mute      = $("#muteBtn");
  const TARGET_VOL = 0.55, FADE_MS = 900;

  function fadeAudio(to, ms, then){
    const from = audio.volume || 0, start = performance.now();
    function step(now){
      const t = Math.min(1, (now - start) / ms);
      audio.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(step); else if (then) then();
    }
    requestAnimationFrame(step);
  }
  function playWithFade(){ audio.muted=false; audio.volume=0; audio.play().then(()=>fadeAudio(TARGET_VOL,FADE_MS)).catch(()=>{}); }
  function pauseWithFade(){ fadeAudio(0,FADE_MS,()=>audio.pause()); }
  $mute.on("click", function(){
    const m=!audio.muted; audio.muted=m;
    $(this).attr("aria-pressed", String(m))
           .html(m?'<i class="bi bi-volume-mute"></i>':'<i class="bi bi-volume-up"></i>');
  });

  /* ------------- Particles (toned down when open) ------------- */
  (function(){
    const canvas = document.getElementById("heartParticles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio||1));
    const W=220,H=220; canvas.width=W*DPR; canvas.height=H*DPR; ctx.scale(DPR,DPR);
    const MAX=20, parts=[];
    function spawn(){
      const a=Math.random()*Math.PI*2, r=16+Math.random()*22;
      parts.push({x:W/2+Math.cos(a)*r, y:H/2+Math.sin(a)*r, vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5-.08, r:1+Math.random()*1.8, life:0, max:1400+Math.random()*1200});
    }
    let last=performance.now();
    function tick(now){
      const dt=Math.min(50, now-last); last=now;
      while(parts.length<MAX) spawn();
      ctx.clearRect(0,0,W,H);
      const tone = $body.hasClass("letter-open") ? 0.25 : 1;
      for (let i=parts.length-1;i>=0;i--){
        const p=parts[i];
        p.life+=dt; p.x+=p.vx*(dt/16.6); p.y+=p.vy*(dt/16.6);
        const t=Math.min(1,p.life/p.max), a=(1-t)*0.55*tone;
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);
        g.addColorStop(0,`rgba(255,90,110,${a})`); g.addColorStop(1,`rgba(255,90,110,0)`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*6,0,Math.PI*2); ctx.fill();
        if(p.life>=p.max) parts.splice(i,1);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ------------- Heart placement helpers ------------- */
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  // end position while OPEN: just under the card — with a safety clamp
  function heartTopWhenOpen(){
    const $stage = $(".container");
    const vh = $stage.height();
    const target  = Math.round(vh * 0.875) + 16;  // 87.5% + gap
    const maxSafe = vh - 56;                      // keep glow in view
    return clamp(target, 80, maxSafe);
  }

  function setHeartCenterInstant(){
    $heart.addClass("no-trans")
          .css({ top:"50%", transform:"translate(-50%,-50%)" });
    requestAnimationFrame(()=> $heart.removeClass("no-trans"));
  }
  function setHeartBelowInstant(){
    $heart.addClass("no-trans")
          .css({ top: heartTopWhenOpen()+"px", transform:"translate(-50%,0)" });
    requestAnimationFrame(()=> $heart.removeClass("no-trans"));
  }

  let animating = false;

  function applyState(open, {animate=true} = {}){
    if (animating && animate) return;

    $body.toggleClass("letter-open", open);
    $body.toggleClass("letter-closed", !open);

    // instruction hint
    $instr.css(open ? {opacity:0, transform:"translate(-50%,-70%)"}
                    : {opacity:1, transform:"translate(-50%,-50%)"});

    // reset state classes
    $msg.removeClass("openNor closeNor closed no-anim");

    if (!animate){
      // SNAP (no animation)
      if (open){
        $msg.addClass("no-anim")
            .css({ height:"75%", padding:"20px 20px", opacity:1, pointerEvents:"auto" });
        setHeartBelowInstant();
      } else {
        $msg.addClass("closed no-anim")
            .css({ height:0, padding:"0 20px", opacity:0, pointerEvents:"none" }); // <— no attr("style","")
        setHeartCenterInstant();
      }
      return;
    }

    // ANIMATE
    animating = true;
    $heart.css("pointer-events","none");
    $msg.addClass(open ? "openNor" : "closeNor");

    if (open){
      $heart.css({ top: heartTopWhenOpen()+"px", transform:"translate(-50%,0)" });
      playWithFade();
    } else {
      $heart.css({ top: "50%", transform:"translate(-50%,-50%)" });
      pauseWithFade();
    }
  }

  // init: force closed, snap without animation
  $cb.prop("checked", false);
  applyState(false, {animate:false});

  // toggle -> animate
  $cb.on("change", function(){ applyState(this.checked, {animate:true}); });

  // finalize states when letter animation ends
  $msg.on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function(){
    if ($msg.hasClass("closeNor")) {
      $msg.addClass("closed")
          .css({ height:0, padding:"0 20px", opacity:0, pointerEvents:"none" });
    } else {
      // fully open: lock the visible state and snap the heart to the exact bottom
      $msg.removeClass("closed")
          .css({ height:"75%", padding:"20px 20px", opacity:1, pointerEvents:"auto" });

      const bottom  = $msg.offset().top + $msg.outerHeight() + 16;
      const vh      = $(".container").height();
      const maxSafe = vh - 56;
      const snap    = clamp(bottom, 80, maxSafe);

      $heart.addClass("no-trans").css({ top: snap + "px", transform:"translate(-50%,0)" });
      requestAnimationFrame(()=> $heart.removeClass("no-trans"));
    }

    $msg.removeClass("openNor closeNor").addClass("no-anim");
    animating = false;
    $heart.css("pointer-events","");
  });

  // keep heart aligned on resize while open
  $(window).on("resize", function(){
    if ($cb.is(":checked")) $heart.css({ top: heartTopWhenOpen()+"px" });
  });
});

