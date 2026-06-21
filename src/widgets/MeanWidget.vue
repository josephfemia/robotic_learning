<template>
  <Lab
    ref="lab"
    id="mean"
    title="Why regression-to-the-mean crashes the robot"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';

const note =
  'Two valid modes in the demos (cyan). The MSE policy predicts their mean — a confident steer straight into the obstacle. A generative policy instead samples <em>one</em> mode and commits. This single picture is the entire motivation for Lecture 6: stop predicting one action; model the distribution \\(p(a\\mid o)\\) and sample.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the mean IIFE (reference lines 2512–2536).
  var W=700,H=320,padL=42,padR=42,mode='gen';var svg=R.SVG(stage,W,H),axisY=H-78,x0=padL,x1=W-padR;
  function ax(a){return x0+((a+1)/2)*(x1-x0);}
  // Pre-sample the generative dots once per toggle so they don't reshuffle on
  // every animation frame (which would flicker).
  var dots=[];
  function sampleDots(){dots=[];for(var k=0;k<14;k++){var side=Math.random()<0.5?-0.6:0.6;dots.push(side+(Math.random()-0.5)*0.28);}}
  sampleDots();
  // `prog` eases the mode-specific layer in on a discrete toggle. The static
  // scene is always fully drawn; only the red spike / green dots ease.
  function draw(prog){
   if(prog===undefined)prog=1;
   R.clr(svg);var px=ax(0);
   svg.appendChild(R.E('rect',{x:px-11,y:64,width:22,height:axisY-64,fill:'rgba(255,107,107,0.22)',stroke:R.C.red,'stroke-width':1.5,rx:3}));
   svg.appendChild(R.TX(px,56,'obstacle',{fill:R.C.red,size:11}));
   svg.appendChild(R.E('line',{x1:x0,y1:axisY,x2:x1,y2:axisY,stroke:R.C.axis,'stroke-width':1.2}));
   svg.appendChild(R.TX(x0,axisY+18,'hard left',{anchor:'start',fill:R.C.dim,size:11}));
   svg.appendChild(R.TX(x1,axisY+18,'hard right',{anchor:'end',fill:R.C.dim,size:11}));
   svg.appendChild(R.TX(px,axisY+18,'straight (0)',{fill:R.C.dim,size:11}));
   function hump(cx){var p='';for(var i=0;i<=44;i++){var a=-1+2*i/44,g=Math.exp(-Math.pow(a-cx,2)/(2*0.01)),x=ax(a),y=axisY-g*64;p+=(i?' ':'')+x.toFixed(1)+','+y.toFixed(1);}svg.appendChild(R.E('polyline',{points:p,fill:'none',stroke:'rgba(54,197,208,0.85)','stroke-width':2}));}
   hump(-0.6);hump(0.6);
   svg.appendChild(R.TX(ax(-0.6),axisY-72,'"go left" demos',{fill:R.C.cyan,size:11}));
   svg.appendChild(R.TX(ax(0.6),axisY-72,'"go right" demos',{fill:R.C.cyan,size:11}));
   // Verdict text lives in a top header band (y=26), clear of the obstacle box.
   if(mode==='mse'){var p='';for(var i=0;i<=44;i++){var a=-1+2*i/44,g=Math.exp(-Math.pow(a,2)/(2*0.0016)),x=ax(a),y=axisY-g*64*prog;p+=(i?' ':'')+x.toFixed(1)+','+y.toFixed(1);}svg.appendChild(R.E('polyline',{points:p,fill:'none',stroke:R.C.red,'stroke-width':2.5,opacity:prog}));
    svg.appendChild(R.E('circle',{cx:px,cy:axisY,r:9,fill:R.C.red,opacity:prog}));
    svg.appendChild(R.E('line',{x1:px,y1:axisY,x2:px,y2:axisY-104*prog,stroke:R.C.red,'stroke-width':2,'stroke-dasharray':'4 3',opacity:prog}));
    svg.appendChild(R.TX(W/2,26,'MSE predicts the MEAN → straight into the obstacle  ✗',{fill:R.C.red,size:12.5,weight:600,opacity:prog}));
   }else{for(var k=0;k<dots.length;k++){var a=dots[k];svg.appendChild(R.E('circle',{cx:ax(a),cy:axisY,r:5*prog,fill:R.C.green,opacity:0.9*prog}));}
    svg.appendChild(R.TX(W/2,26,'A generative policy SAMPLES one mode → commits, goes around  ✓',{fill:R.C.green,size:12.5,weight:600,opacity:prog}));}
  }
  function show(m){
   var changed=(m!==mode);
   mode=m;
   if(m==='gen'&&changed)sampleDots();
   if(!changed){draw(1);return;}
   tween(380,{onStep(e){draw(e);},onDone(){draw(1);}});
  }
  R.btn(ctr,'MSE / single Gaussian',null,function(){show('mse');});
  R.btn(ctr,'Generative (sample a mode)','primary',function(){show('gen');});
  draw(1);
});
</script>
