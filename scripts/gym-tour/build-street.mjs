// Original Rajkot streetscape. Build with node scripts/gym-tour/build-street.mjs.
import * as T from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFile } from 'node:fs/promises';

const scene = new T.Scene();
const surface = new T.MeshStandardMaterial({vertexColors:true, roughness:.88, side:T.DoubleSide});
let pieces = [];
let wheels = [];
const finishes = {
 paint: new T.MeshPhysicalMaterial({vertexColors:true, roughness:.3, metalness:.22, clearcoat:.65, clearcoatRoughness:.23}),
 chrome: new T.MeshStandardMaterial({vertexColors:true, roughness:.23, metalness:.85}),
 rubber: new T.MeshStandardMaterial({vertexColors:true, roughness:.95}),
 glass: new T.MeshPhysicalMaterial({vertexColors:true, transparent:true, opacity:.3, roughness:.12, metalness:.15, depthWrite:false, side:T.DoubleSide}),
 cloth: new T.MeshStandardMaterial({vertexColors:true, roughness:.85}),
 frame: new T.MeshStandardMaterial({vertexColors:true, roughness:.45, metalness:.55}),
};
const V = (x,y,z) => new T.Vector3(x,y,z);
function part(g, position, color, rotation=[0,0,0], scale=[1,1,1]) {
  if(g.index) g = g.toNonIndexed();
  g.deleteAttribute('uv');
  const rgb = new T.Color(color);
  const colors = new Uint8Array(g.attributes.position.count * 3);
  for(let i=0;i<colors.length;i+=3) colors.set([rgb.r*255,rgb.g*255,rgb.b*255].map(Math.round), i);
  g.setAttribute('color', new T.BufferAttribute(colors,3,true));
  g.scale(...scale);
  g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rotation)));
  g.translate(...position);
  g.userData.finish = ['#08754d','#eca914','#485968'].includes(color) ? 'paint' : color === '#a9aca6' ? 'chrome' : color === '#232629' ? 'rubber' : color === '#557b84' ? 'glass' : ['#283337','#53595e'].includes(color) ? 'frame' : 'cloth';
  pieces.push(g);
}
function finish(name) {
  if(name === 'Rickshaw' || name === 'Scooter') {
    const vehicle = new T.Group(); vehicle.name=name;
    const wheelParts = new Set(wheels.flatMap(w => Array.from({length:w.end-w.start},(_,i)=>w.start+i)));
    function batch(target, list) {
      for(const key of Object.keys(finishes)) {
        const selected=list.filter(g=>g.userData.finish===key);
        if(selected.length) { const mesh=new T.Mesh(mergeVertices(mergeGeometries(selected)), finishes[key]); mesh.name=key; target.add(mesh); }
      }
    }
    batch(vehicle,pieces.filter((_,i)=>!wheelParts.has(i)));
    wheels.forEach((w,i)=>{
      const pivot=new T.Group(); pivot.name='Wheel_'+i; pivot.position.copy(w.pivot); pivot.userData.radius=w.radius;
      const selected=pieces.slice(w.start,w.end);
      selected.forEach(g=>g.translate(-w.pivot.x,-w.pivot.y,-w.pivot.z));
      batch(pivot,selected); vehicle.add(pivot);
    });
    scene.add(vehicle); pieces=[]; wheels=[]; return;
  }
  const mesh = new T.Mesh(mergeVertices(mergeGeometries(pieces)), surface);
  mesh.name=name; scene.add(mesh); pieces=[]; wheels=[];
}
const box=(p,s,c,r=[0,0,0])=>part(new T.BoxGeometry(...s),p,c,r);
const round=(p,s,c,radius=.08,r=[0,0,0])=>part(new RoundedBoxGeometry(...s,2,radius),p,c,r);
const oval=(p,s,c,r=[0,0,0])=>part(new T.SphereGeometry(1,20,14),p,c,r,s);
function rod(a,b,r,c,top=r) {
  const start=V(...a), end=V(...b), axis=end.clone().sub(start);
  const g=new T.CylinderGeometry(top,r,axis.length(),12);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),axis.normalize()));
  part(g,start.lerp(end,.5).toArray(),c);
}
const rubber='#232629', silver='#a9aca6', black='#283337';
function wheel(x,y,z,r) {
  const start=pieces.length;
  part(new T.TorusGeometry(r*.72,r*.28,12,32),[x,y,z],rubber);
  part(new T.CylinderGeometry(r*.59,r*.59,r*.22,24),[x,y,z],silver,[Math.PI/2,0,0]);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    for(const sign of [-1,1]) oval([x+Math.cos(a)*r*.37,y+Math.sin(a)*r*.37,z+sign*r*.12],[r*.105,r*.13,.008],black);
  }
  wheels.push({start,end:pieces.length,pivot:V(x,y,z),radius:r});
}
function person(x,y,z,shirt,helmet=false) {
  round([x,y+.42,z],[.30,.55,.41],shirt,.09,[0,0,-.12]);
  oval([x+.04,y+.94,z],[.15,.20,.14],'#9b694a');
  oval([x+.025,y+1.055,z],[.154,.105,.148],helmet ? '#53595e':'#29221d');
  oval([x+.187,y+.94,z],[.038,.037,.033],'#b88460');
  for(const side of [-1,1]) {
    oval([x+.16,y+.985,z+side*.061],[.012,.014,.018],'#252524');
    oval([x+.03,y+.94,z+side*.14],[.034,.055,.022],'#9b694a');
    oval([x+.20,y-.47,z+side*.17],[.16,.065,.075],rubber);
  }
  for(const sign of [-1,1]) {
    rod([x+.02,y+.61,z+sign*.18],[x+.14,y+.38,z+sign*.23],.075,shirt);
    rod([x+.14,y+.38,z+sign*.23],[x+.44,y+.45,z+sign*.20],.054,'#a57654');
    oval([x+.44,y+.45,z+sign*.20],[.07,.055,.055],'#a57654');
    rod([x,y+.09,z+sign*.11],[x+.3,y-.14,z+sign*.16],.09,'#39444b');
    rod([x+.3,y-.14,z+sign*.16],[x+.18,y-.47,z+sign*.18],.075,'#39444b');
  }
}
function scooter(x,z,paint,rider=false) {
  wheel(x-.61,.29,z,.30); wheel(x+.65,.29,z,.30);
  round([x-.32,.54,z],[1.03,.42,.42],paint,.17);
  round([x-.19,.78,z],[.82,.14,.45],rubber,.06);
  round([x+.26,.33,z],[.78,.08,.40],black,.035);
  round([x+.5,.64,z],[.21,.65,.44],paint,.09,[0,0,-.26]);
  round([x+.62,1,z],[.23,.16,.46],paint);
  oval([x+.73,1,z],[.025,.056,.15],'#e9e2c2');
  round([x+.64,.48,z],[.50,.11,.24],paint,.05);
  rod([x+.52,.8,z],[x+.67,.30,z],.034,silver);
  for(const side of [-1,1]){
    rod([x+.56,1.02,z],[x+.49,1.06,z+side*.29],.02,black);
    rod([x+.51,1.04,z+side*.21],[x+.55,1.21,z+side*.29],.012,silver);
    oval([x+.55,1.22,z+side*.29],[.036,.052,.07],black);
  }
  if(rider) person(x-.08,.78,z,'#b8c8cb',true);
}
function rickshaw() {
  const green='#08754d', yellow='#eca914';
  wheel(1.03,.32,0,.33);
  for(const z of [-.49,.49]) wheel(-.77,.32,z,.34);
  round([-.28,.58,0],[1.98,.48,1.16],green,.16);
  box([.62,.37,0],[.66,.1,.91],black);
  round([-.87,1.07,0],[.29,.66,1.16],green,.10);
  round([-.65,.83,0],[.60,.17,1.04],rubber);
  round([-.83,1.04,0],[.17,.47,1.04],rubber);
  oval([.23,.99,0],[.25,.1,.3],rubber);
  for(const side of [-1,1]){
    const z=side*.55;
    rod([-.92,.82,z],[-.95,1.77,z],.045,black);
    rod([-.10,.76,z],[-.13,1.78,z],.034,silver);
    rod([.99,1.15,z],[.63,1.77,z],.042,yellow);
    rod([-.86,.88,z],[-.2,.88,z],.027,silver);
  }
  round([-.16,1.81,0],[2.23,.25,1.32],yellow,.12);
  round([-.98,1.46,0],[.17,.64,1.16],yellow,.08);
  round([.91,.90,0],[.33,.54,1.01],green,.15);
  round([.92,1.15,0],[.27,.12,1.02],yellow,.055);
  round([.83,1.43,0],[.047,.57,.94],'#557b84',.023,[0,0,.48]);
  // Weather seals, wiper, mirrors, stainless bumper and rear lamps.
  for(const side of [-1,1]) {
    rod([.91,1.25,side*.49],[1.02,1.48,side*.69],.018,silver);
    oval([1.03,1.49,side*.70],[.045,.095,.075],black);
    oval([1.068,.99,side*.32],[.04,.115,.112],silver);
    oval([1.092,.99,side*.32],[.025,.084,.084],'#fff4cf');
    round([-1.027,.70,side*.45],[.02,.15,.10],'#a8271c',.014);
    rod([-.99,1.71,side*.65],[.87,1.71,side*.65],.018,black);
  }
  rod([.94,.43,-.49],[.94,.43,.49],.037,silver);
  rod([.94,1.23,-.05],[.73,1.62,.19],.012,black);
  box([-1.039,.57,0],[.014,.10,.32],'#f0b939');
  for(const side of [-1,1]) oval([1.056,.99,side*.32],[.035,.103,.10],'#efeeda');
  round([1.03,.53,0],[.61,.14,.34],green);
  box([1.082,.79,0],[.025,.09,.3],'#f0b939');
  person(.13,.85,0,'#d1c7a8');
}
rickshaw(); finish('Rickshaw');
scooter(0,0,'#485968',true); finish('Scooter');

// Road furniture, short adjoining shops and receding side street. The legacy
// GLB includes its own pavement; the lane surfaces sit just above the asphalt.
box([0,-.054,18],[175,.045,18.2],'#494b49');
box([-16,-.054,-35],[8.8,.045,105],'#545553');
for(let x=-78;x<78;x+=6.2) box([x,-.025,13],[2.85,.008,.096],'#e9ddbf');
for(let z=-80;z<0;z+=6) box([-16,-.025,z],[.09,.008,2.3],'#e7deca');
for(let x=-19;x< -12;x+=.85) box([x,-.023,3],[.40,.01,2.4],'#e7e6d5');
for(let x=-11.3;x<11.3;x+=.82) box([x,.05,5.04],[.82,.20,.18], Math.round((x+11.3)/.82)%2?'#34352f':'#dda92e');
for(let z=-78;z<5;z+=1.8) box([-20.47,.045,z],[.28,.18,1.8],Math.round((z+78)/1.8)%2?'#33352e':'#dab23b');
for(let i=0;i<4;i++){
 const x=14.5+i*5.4;
 box([x,1.9,-6.5],[5.39,3.9,9],i%2?'#aeab91':'#a2a99e');
 box([x,1.43,-1.96],[4.85,2.75,.12],i%2?'#3d555a':'#546266');
 for(let j=0;j<17;j++) box([x,.19+j*.15,-1.87],[4.73,.024,.036],'#858988');
 box([x,3.26,-1.70],[5.32,.82,.30],'#145582');
 box([x,2.78,-1.33],[5.32,.10,.90],'#4e7892',[.13,0,0]);
 scooter(x-.2,-.35,i%2?'#672d23':'#283f48');
}
// Repeated parked two-wheelers and planted forecourt match the street's scale.
for(let i=0;i<7;i++) scooter(12.6+i*1.43,1.25,i%3===0?'#652a26':i%3===1?'#293138':'#4a5350');
for(const x of [-7.15,-3.55,.05,3.65]) {
  round([x,.42,3.85],[2.65,.46,.64],'#b6a58c',.045);
  box([x,.655,3.85],[2.46,.015,.49],'#3a3328');
  for(let i=0;i<11;i++) {
    const dx=-1.1+i*.22;
    for(let j=0;j<34;j++) {
      const angle=j*2.39996+i*.51, ring=Math.sqrt(1-((j+.5)/34)**2);
      const leaf=new T.BufferGeometry();
      leaf.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.035,.055,.009,0,.115,.022,.035,.055,.009],3));
      leaf.setIndex([0,1,2,0,2,3]); leaf.computeVertexNormals();
      part(leaf,[x+dx+Math.cos(angle)*ring*.21,.72+((j+.5)/34)*.24,3.85+Math.sin(angle)*ring*.23],['#344e25','#4c6529','#627c31','#718441'][j%4],[.3+(j%5)*.27,angle,(j%3-.8)*.4]);
    }
  }
}
for(const x of [-9.3,-5.35,-1.75,1.85,5.65,10.45]) {
  part(new T.CylinderGeometry(.26,.19,.46,20),[x,.42,3.8],'#3e4140');
  for(let i=0;i<11;i++) {
    const angle=i*2.4;
    const points=new Float32Array([0,0,0,-.055,.44,.10,0,.92,.29,.055,.44,.10]);
    const leaf=new T.BufferGeometry(); leaf.setAttribute('position',new T.BufferAttribute(points,3)); leaf.setIndex([0,1,2,0,2,3]);leaf.computeVertexNormals();
    part(leaf,[x,.61,3.8],i%2?'#647a2c':'#344f25',[.1+(i%3)*.12,angle,0]);
  }
}
for(const x of [-9.9,-5.1,-.7,3.7,10.7]) {
  rod([x,.2,4.53],[x,.94,4.53],.066,'#303537');
  part(new T.CylinderGeometry(.069,.069,.09,12),[x,.83,4.53],'#c4b37e');
}
// Curved street lamp and a small circular traffic sign on the corner.
rod([-11.2,.1,3.9],[-11.2,8.2,3.9],.065,silver);
rod([-11.2,8.2,3.9],[-10.15,8.45,3.9],.05,silver);
oval([-10.02,8.43,3.9],[.31,.055,.12],'#333d41');
rod([-11.2,.1,4.5],[-11.2,3.8,4.5],.035,silver);
part(new T.CylinderGeometry(.22,.22,.035,28),[-11.2,3.7,4.5],'#efece0',[Math.PI/2,0,0]);
for(let i=0;i<7;i++){
 const z=-6-i*9.5;
 box([-24,1.8,z],[4.8,3.7,8.7],i%2?'#ccc0a6':'#bdad8c');
 box([-21.55,.75,z],[.24,1.52,8.45],'#d3c7a8');
}
function pole(x,z,h){
 rod([x,0,z],[x,h,z],.125,'#685b4b',.084);
 for(const y of [h-.45,h-1.35]){
  box([x,y,z],[1.55,.084,.10],'#4d4239');
  for(const dx of [-.66,0,.66]) rod([x+dx,y,z],[x+dx,y+.20,z],.053,'#514c45');
 }
}
for(const x of [-21,17]){
 for(const z of [4,-16,-36,-56]) pole(x,z,x<0?8.7:10.2);
 for(const z of [4,-16,-36]){
  for(const dx of [-.66,0,.66]){
    let prev;
    for(let j=0;j<=10;j++){
     const t=j/10,p=[x+dx,(x<0?8.4:9.9)-.89*Math.sin(Math.PI*t),z-20*t];
     if(prev) rod(prev,p,.018,'#3a3834');
     prev=p;
    }
  }
 }
}
// Recessed warm light reflected in the existing panes, interrupted by mullions.
for (const x of [-7.15,-3.6,0,3.6,7.15]) {
  for (const y of [10.54,13.93]) {
    for(const offset of [-.80,.64]){
      box([x+offset,y+.60,.027],[.83,.022,.012],'#e4cf95');
      rod([x+offset-.41,y+.60,.027],[x+offset-.26,y+.39,.027],.011,'#c3af77');
    }
  }
}
for(let i=0;i<10;i++){
  const x=-8.25+i*1.5;
  if(i<1 || i>4) box([x,7.06,-.047],[1.05,.028,.01],'#e3c793');
  // Silhouettes of ellipticals and treadmill consoles behind the street glass.
  box([x,4.91,-.047],[1.16,.055,.012],'#344346');
  rod([x+.30,4.94,-.046],[x+.46,5.60,-.046],.032,'#394c50');
  box([x+.42,5.62,-.046],[.26,.09,.014],'#27383c',[0,0,-.12]);
  rod([x-.31,4.96,-.047],[x-.12,5.41,-.047],.022,'#58696b');
}
finish('Street');
globalThis.FileReader=class{
 async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};
const glb=await new GLTFExporter().parseAsync(scene,{binary:true});
await writeFile('public/models/nexus-gym/street.glb', Buffer.from(glb));
