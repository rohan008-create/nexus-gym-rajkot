// Loads the exported GLB with this project's installed Three.js in a real browser.
// Serves a temporary harness; adds no application route or public asset.
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const root=path.resolve(path.dirname(require.resolve('three')),'..');
const output=path.resolve('artifacts/gym-tour/phase1');
const session='nexus-gym-phase1-glb';
const html=`<!doctype html><html><head><title>Nexus GLB pipeline check</title><style>body{margin:0;background:#151519}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script></head><body><script type="module">
import * as THREE from 'three';
import {GLTFLoader} from '/three/examples/jsm/loaders/GLTFLoader.js';
try {
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(800,600);document.body.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#151519');scene.add(new THREE.AmbientLight(0xffffff,2));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(45,800/600,.1,100);camera.position.set(7,6,9);camera.lookAt(0,1,0);
 const gltf=await new GLTFLoader().loadAsync('/model.glb');scene.add(gltf.scene);renderer.render(scene,camera);
 let meshes=0,triangles=0;gltf.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 window.__smoke={loaded:true,meshes,triangles,threeRevision:THREE.REVISION,drawCalls:renderer.info.render.calls,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
} catch(error){window.__smoke={error:String(error)};document.body.textContent=String(error);}
</script></body></html>`;
const server=http.createServer((req,res)=>{
 try {
  let file;
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  if(req.url==='/model.glb')file=path.join(output,'smoke.glb');
  else if(req.url.startsWith('/three/')){
   file=path.resolve(root,decodeURIComponent(req.url.slice(7)));
   if(!file.startsWith(root+path.sep))throw Error('Invalid module path');
  } else {res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'model/gltf-binary');
  res.end(fs.readFileSync(file));
 } catch(error){res.writeHead(404);res.end(String(error));}
});
async function ab(...args){
 const {stdout}=await run('agent-browser',['--session',session,'--headed','--json',...args],{timeout:60000,maxBuffer:5*1024*1024});
 const value=JSON.parse(stdout);if(!value.success)throw Error(JSON.stringify(value));return value.data;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  await ab('open',`http://127.0.0.1:${server.address().port}`);
  await ab('wait','--fn','!!window.__smoke');
  const result=(await ab('eval','window.__smoke')).result;
  if(result.error || !result.loaded || result.meshes<1 || result.triangles<1 || result.drawCalls<1)throw Error(JSON.stringify(result));
  await ab('screenshot',path.join(output,'smoke-browser.png'));
  fs.writeFileSync(path.join(output,'browser-smoke.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
  console.log('Exported GLB loaded and rendered with current project Three.js.');
  console.log('VERDICT: PASS');
 } finally {try {await ab('close');} finally {await new Promise(resolve=>server.close(resolve));}}
})().catch(error=>{console.error('VERDICT: FAIL --',error);process.exitCode=1;server.close()});
