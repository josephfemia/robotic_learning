<template>
  <Lab
    ref="lab"
    id="curve"
    title="Why the error compounds quadratically"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { bcRegret, daggerRegret } from '../logic/compoundingError.js';

const note =
  'Same per-step error \\(\\epsilon\\), same constant — the only difference is recovery. Behavioral cloning\'s regret grows like \\(\\epsilon T^2\\) (red); DAgger\'s like \\(\\epsilon T\\) (green). At horizon \\(T\\), cloning is worse by a factor of \\(T\\) — which is why long-horizon tasks punish naïve BC so severely.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the curve IIFE (reference lines 2487–2508).
  // bcRegret / daggerRegret imported from logic/compoundingError.js; identical
  // to the original's inline eps*t*t and eps*t.
  var W=700,H=320,padL=56,padR=22,padT=26,padB=46,eps=0.06,Tcur=60,Tmax=100;var svg=R.SVG(stage,W,H);
  function draw(){R.clr(svg);var x0=padL,x1=W-padR,y0=H-padB,y1=padT,maxY=bcRegret(eps,Tmax);if(maxY<=0)maxY=1;
   function X(t){return x0+(t/Tmax)*(x1-x0);}function Y(v){return y0-(v/maxY)*(y0-y1);}
   svg.appendChild(R.E('line',{x1:x0,y1:y0,x2:x1,y2:y0,stroke:R.C.axis,'stroke-width':1.2}));
   svg.appendChild(R.E('line',{x1:x0,y1:y0,x2:x0,y2:y1,stroke:R.C.axis,'stroke-width':1.2}));
   var pB='',pD='';for(var t=0;t<=Tmax;t++){pB+=(t?' ':'')+X(t).toFixed(1)+','+Y(bcRegret(eps,t)).toFixed(1);pD+=(t?' ':'')+X(t).toFixed(1)+','+Y(daggerRegret(eps,t)).toFixed(1);}
   svg.appendChild(R.E('polyline',{points:pB,fill:'none',stroke:R.C.red,'stroke-width':2.5}));
   svg.appendChild(R.E('polyline',{points:pD,fill:'none',stroke:R.C.green,'stroke-width':2.5}));
   var bx=X(Tcur);svg.appendChild(R.E('line',{x1:bx,y1:y1,x2:bx,y2:y0,stroke:R.C.dim,'stroke-width':1,'stroke-dasharray':'4 4'}));
   svg.appendChild(R.E('circle',{cx:bx,cy:Y(bcRegret(eps,Tcur)),r:4,fill:R.C.red}));
   svg.appendChild(R.E('circle',{cx:bx,cy:Y(daggerRegret(eps,Tcur)),r:4,fill:R.C.green}));
   svg.appendChild(R.TX(X(Tmax)-4,Y(bcRegret(eps,Tmax))+4,'behavioral cloning ~ ε·T²',{anchor:'end',fill:R.C.red,size:12,weight:600,base:'hanging'}));
   svg.appendChild(R.TX(X(Tmax)-4,Y(daggerRegret(eps,Tmax))-6,'DAgger ~ ε·T',{anchor:'end',fill:R.C.green,size:12,weight:600}));
   svg.appendChild(R.TX((x0+x1)/2,H-10,'task horizon  T  →',{fill:R.C.dim,size:11.5}));
   var yl=R.TX(0,0,'expected regret →',{fill:R.C.ink,size:11.5});yl.setAttribute('transform','translate(16,'+((y0+y1)/2)+') rotate(-90)');svg.appendChild(yl);
   // Dynamic readout pinned to the clear top-left corner (curves rise toward the
   // top-RIGHT, so this band stays empty) — was colliding with the BC curve-end label.
   svg.appendChild(R.TX(x0+6,y1+2,'at T='+Tcur+': cloning ≈ '+Tcur+'× worse',{anchor:'start',fill:'#EAF0F8',size:11.5,base:'hanging'}));
  }
  R.slider(ctr,{label:'per-step error  ε',min:0.01,max:0.2,step:0.01,value:eps,fmt:function(v){return v.toFixed(2);},on:function(v){eps=v;draw();}});
  R.slider(ctr,{label:'horizon  T (marker)',min:10,max:100,step:1,value:Tcur,fmt:function(v){return ''+v;},on:function(v){Tcur=v;draw();}});
  draw();
});
</script>
