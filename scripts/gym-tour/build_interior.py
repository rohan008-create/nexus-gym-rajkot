"""Original concept gym interior. No external model/texture downloads.
blender -b --factory-startup -P scripts/gym-tour/build_interior.py -- --output public/models/nexus-gym
Coordinates match the tour: metres, Y up, +Z street; gym floor Y=4.2.
"""
import argparse, json, math, os, random, sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(ROOT/'public/models/nexus-gym'))
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=Path(args.output).resolve();OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
rng=random.Random(441);mats={};buckets={}

def image(name,size,pixel):
    im=bpy.data.images.new(name,width=size,height=size,alpha=True);values=[]
    for y in range(size):
        for x in range(size):values.extend(pixel(x/size,y/size))
    im.pixels=values;im.pack();return im
rubber_map=image('Original rubber fleck',128,lambda x,y:(lambda n:(n,n*1.04,n*1.06,1))(.075+rng.random()*.045))
mirror_map=image('Original static mirror treatment',128,lambda x,y:(.29+y*.16+math.sin(x*18)*.025,.34+y*.16,.36+y*.17,1))
def screen_pixel(x,y):
    ink=(.025,.09,.10,1)
    if .12<x<.88 and .18<y<.23:return (.82,.04,.08,1)
    if .16<x<.20 and .38<y<.77 or .38<x<.42 and .38<y<.77 or .68<x<.72 and .38<y<.77:return (.22,.68,.65,1)
    if .16<x<.72 and (.38<y<.42 or .73<y<.77):return (.22,.68,.65,1)
    return ink
screen_map=image('Original cardio console display',128,screen_pixel)

def material(name,color,rough=.6,metal=0,texture=None,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if texture:
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=texture;m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
        if emission:m.node_tree.links.new(node.outputs['Color'],p.inputs['Emission Color'])
    elif emission:p.inputs['Emission Color'].default_value=(*color,1)
    if emission:p.inputs['Emission Strength'].default_value=emission
    mats[name]=m;return m
material('rubber floor',(.10,.11,.12),.94,texture=rubber_map)
material('tile joints',(.025,.03,.033),.98)
material('charcoal wall',(.09,.105,.11),.88)
material('wall panel edge',(.025,.035,.039),.72)
material('powder coated frame',(.035,.045,.052),.4,.45)
material('brushed steel',(.40,.44,.46),.32,.75)
material('machined silver',(.65,.69,.70),.24,.8)
material('weight rubber',(.025,.032,.035),.68)
material('Nexus upholstery',(.48,.012,.03),.47)
material('upholstery seam',(.76,.045,.065),.65)
material('off white markings',(.67,.69,.66),.7)
material('static mirror',(.43,.49,.52),.26,.25,mirror_map)
material('warm LED',(.85,.77,.60),.38,emission=1.8)
material('red accent light',(.65,.012,.035),.45,emission=.6)
material('cardio display',(.08,.18,.18),.3,texture=screen_map,emission=.35)
material('warm reception timber',(.22,.14,.085),.73)
material('folded linen',(.61,.62,.58),.95)
material('bottle blue',(.10,.25,.30),.25,.2)
logo=bpy.data.images.load(str(ROOT/'public/assets/nexus-logo.png'),check_existing=False)
logo.name='Official Nexus interior logo optimized';logo.scale(768,256);logo.pack()
lm=material('official Nexus logo',(1,1,1),.55);p=lm.node_tree.nodes.get('Principled BSDF');node=lm.node_tree.nodes.new('ShaderNodeTexImage');node.image=logo
lm.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color']);lm.node_tree.links.new(node.outputs['Alpha'],p.inputs['Alpha']);lm.node_tree.links.new(node.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.25
lm.surface_render_method='DITHERED';lm.use_transparency_overlap=False

def v(p):return (p[0],-p[2],p[1])
def bucket(o,mat):
    o.data.materials.clear();o.data.materials.append(mats[mat]);buckets.setdefault(mat,[]).append(o);return o

def box(name,p,s,mat,bevel=.018,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=v(p));o=bpy.context.object;o.name=name;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel and min(s)>.025:
        mod=o.modifiers.new('Manufactured softened edge','BEVEL');mod.width=min(bevel,min(s)*.2);mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    if rot:o.rotation_euler=rot
    return bucket(o,mat)

def rod(name,a,b,r,mat,n=12):
    a,b=Vector(v(a)),Vector(v(b));d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    for face in o.data.polygons:face.use_smooth=len(face.vertices)==4
    return bucket(o,mat)

def plane(name,p,w,h,mat):
    x,y,z=p;points=[v((x-w/2,y-h/2,z)),v((x+w/2,y-h/2,z)),v((x+w/2,y+h/2,z)),v((x-w/2,y+h/2,z))]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(points,[],[(0,1,2,3)]);mesh.uv_layers.new(name='UVMap')
    for loop,uv in zip(mesh.uv_layers.active.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=uv
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);return bucket(o,mat)

def text(name,body,p,size,mat):
    curve=bpy.data.curves.new(name,'FONT');curve.body=body;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';curve.extrude=.001;curve.resolution_u=2
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);o.location=v(p);o.rotation_euler=(math.pi/2,0,0);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return bucket(o,mat)

F=4.2
# Cutaway room: open front/roof deliberately preserves both camera tracks.
box('Rubber tile foundation',[0,F-.13,-6],[18.5,.26,12.5],'rubber floor',.025)
for x in range(-9,10):box('Floor seam',[x,F+.008,-6],[.012,.008,12.2],'tile joints',0)
for z in range(-12,1):box('Floor seam',[0,F+.009,z],[18.2,.008,.012],'tile joints',0)
box('Rear wall',[0,5.95,-12.08],[18.4,3.5,.20],'charcoal wall')
box('Left side wall',[-9.13,5.95,-6],[.20,3.5,12.3],'charcoal wall')
box('Right cutaway wall base',[9.13,4.62,-6],[.20,.85,12.3],'charcoal wall')
for x in range(-9,10,2):box('Rear vertical panel reveal',[x,5.95,-11.96],[.025,3.4,.035],'wall panel edge',0)
box('Rear baseboard',[0,4.32,-11.93],[18.2,.20,.07],'powder coated frame')
box('Left baseboard',[-8.99,4.32,-6],[.07,.20,12.1],'powder coated frame')
# Mirror bank has depth, trim and a subtle static reflected treatment.
for x in [-7.8,-5.65,-3.5,-1.35]:
    box('Mirror dark surround',[x,5.85,-11.91],[2.04,2.75,.07],'powder coated frame',.01)
    plane('Mirror panel',[x,5.85,-11.85],1.96,2.65,'static mirror')
    box('Mirror lower ledge',[x,4.48,-11.82],[2.10,.06,.13],'brushed steel',.008)
box('Branded wall panel',[4.4,5.9,-11.91],[7.8,2.95,.09],'wall panel edge')
plane('Official Nexus wall graphic',[4.3,6.35,-11.84],4.65,1.55,'official Nexus logo')
text('Back wall slogan','BEYOND LIMITS',[4.3,5.28,-11.79],.30,'off white markings')
box('Rear crimson light',[0,7.45,-11.88],[18.0,.055,.06],'red accent light',0)
for x in [-8.7,8.7]:
    box('Perimeter light housing',[x,7.55,-6],[.18,.14,11.8],'powder coated frame')
    box('Perimeter LED',[x,7.47,-6],[.075,.035,11.65],'warm LED',0)
# Keep the front camera corridor open: the rear strip and perimeter LEDs
# supply the architectural lighting detail without crossing equipment heads.
for z in [-7.7]:
    box('Suspended linear LED housing',[0,7.62,z],[15.7,.10,.14],'powder coated frame')
    box('Suspended linear LED strip',[0,7.55,z],[15.5,.025,.055],'warm LED',0)
# Clear central circulation, understated training zone stripe.
for z in [-2.5,-4.5,-6.5,-8.5,-10.5]:box('Aisle dashed marking',[.8,F+.015,z],[.04,.01,.65],'off white markings',0)
box('Strength boundary stripe',[-.35,F+.016,-7],[.045,.012,8.9],'Nexus upholstery',0)

# Adjustable benches and racks: hardware and separate upholstery rather than boxes.
def bench(x,z):
    box('Bench rear pad',[x,F+.65,z+.35],[.64,.16,1.10],'Nexus upholstery',.05)
    box('Bench seat pad',[x,F+.65,z+1.05],[.64,.16,.42],'Nexus upholstery',.05)
    for dx in [-.27,.27]:box('Upholstery piping',[x+dx,F+.74,z+.35],[.012,.009,1.0],'upholstery seam',0)
    rod('Bench spine',[x,F+.44,z-.3],[x,F+.44,z+1.3],.065,'powder coated frame',8)
    for dz in [-.2,1.15]:
        rod('Bench angled leg',[x,F+.45,z+dz],[x,F+.13,z+dz+.12],.055,'brushed steel',8)
        box('Bench transverse foot',[x,F+.10,z+dz+.12],[.92,.12,.20],'powder coated frame')
        for dx in [-.38,.38]:box('Bench rubber end cap',[x+dx,F+.08,z+dz+.12],[.16,.13,.23],'weight rubber')
    rod('Backrest adjustment bracket',[x-.10,F+.25,z+.4],[x-.10,F+.5,z+.65],.028,'machined silver',8)
    rod('Adjustment handle',[x-.34,F+.41,z+.8],[x-.1,F+.41,z+.8],.023,'Nexus upholstery',8)

def plate(x,y,z,r,width=.10):
    rod('Rubber weight plate',[x-width/2,y,z],[x+width/2,y,z],r,'weight rubber',16)
    rod('Plate central hub',[x-width/2-.008,y,z],[x+width/2+.008,y,z],r*.20,'brushed steel',12)

for x,z in [(-5.9,-6.2),(-2.7,-6.2),(-5.9,-9.4)]:
    for dx in [-.95,.95]:
        box('Rack upright',[x+dx,F+1.4,z],[.13,2.8,.13],'powder coated frame',.015)
        box('Rack forefoot',[x+dx,F+.08,z+.30],[.55,.15,1.45],'powder coated frame')
        for level in range(7):plane('Rack adjustment hole',[x+dx,F+.55+level*.27,z+.069],.045,.065,'weight rubber')
        box('J hook support',[x+dx,F+1.68,z+.12],[.20,.10,.24],'machined silver',.01)
        box('J hook tip',[x+dx,F+1.75,z+.23],[.12,.15,.06],'powder coated frame',.006)
        for level in [.42,.86]:
            rod('Plate storage peg',[x+dx,F+level,z-.03],[x+dx+( -.4 if dx<0 else .4),F+level,z-.03],.025,'machined silver',8)
            plate(x+dx+(-.25 if dx<0 else .25),F+level,z-.03,.24,.14)
    box('Rack upper crossmember',[x,F+2.72,z],[2.05,.16,.16],'Nexus upholstery')
    rod('Pullup bar',[x-1,F+2.57,z+.24],[x+1,F+2.57,z+.24],.026,'machined silver',12)
    rod('Barbell shaft',[x-1.43,F+1.82,z+.18],[x+1.43,F+1.82,z+.18],.026,'machined silver',12)
    for side in [-1,1]:
        for k,r in enumerate([.34,.31,.27]):plate(x+side*(1.03+k*.11),F+1.82,z+.18,r,.095)
        rod('Barbell collar',[x+side*1.37,F+1.82,z+.18],[x+side*1.44,F+1.82,z+.18],.055,'Nexus upholstery',12)
    bench(x,z+.32)
# A free adjustable bench and varied dumbbells along the side wall.
bench(-2.7,-9.1)
for z in [-3.3,-4.9,-6.5,-8.1,-9.7]:
    for y in [F+.67,F+1.15]:
        box('Dumbbell shelf',[-8.12,y,z],[.68,.08,1.42],'powder coated frame')
        for j,dz in enumerate([-.45,0,.45]):
            radius=.10+j*.018
            rod('Dumbbell knurled grip',[-8.34,y+.15,z+dz],[-7.90,y+.15,z+dz],.025,'machined silver',8)
            for dx in [-.25,.25]:rod('Hex dumbbell head',[-8.12+dx-.07,y+.15,z+dz],[-8.12+dx+.07,y+.15,z+dz],radius,'weight rubber',6)
    for dz in [-.58,.58]:rod('Dumbbell rack leg',[-8.12,F+.08,z+dz],[-8.12,F+1.17,z+dz],.04,'brushed steel',8)
# Upright plate tree beside strength zone.
box('Plate tree base',[-.8,F+.08,-10.6],[.85,.15,.8],'powder coated frame')
rod('Plate tree stem',[-.8,F+.12,-10.6],[-.8,F+1.5,-10.6],.055,'brushed steel',8)
for y,r in [(F+.45,.31),(F+.9,.27),(F+1.3,.22)]:
    for sign in [-1,1]:
        rod('Plate tree peg',[-.8,y,-10.6],[-.8+sign*.44,y,-10.6],.025,'machined silver',8)
        plate(-.8+sign*.28,y,-10.6,r,.16)
# Detailed treadmill deck, belt lines, rollers, console and arm rails.
for x,z in [(3.0,-5.0),(5.4,-5.0),(7.8,-5.0),(3.0,-9.0),(5.4,-9.0)]:
    box('Treadmill base',[x,F+.20,z],[1.35,.34,2.6],'powder coated frame',.06)
    box('Treadmill rubber belt',[x,F+.39,z],[.93,.055,2.24],'weight rubber',.018)
    for dz in [-.91,-.58,-.25,.08,.41,.74]:box('Belt running tread',[x,F+.423,z+dz],[.86,.008,.018],'tile joints',0)
    for dz in [-1.12,1.12]:rod('Deck roller',[x-.46,F+.39,z+dz],[x+.46,F+.39,z+dz],.075,'brushed steel',12)
    for dx in [-.57,.57]:
        box('Deck side rail',[x+dx,F+.41,z],[.16,.075,2.38],'brushed steel',.015)
        rod('Treadmill angled upright',[x+dx,F+.35,z-.90],[x+dx,F+1.44,z-1.11],.045,'brushed steel',12)
        rod('Treadmill arm rail',[x+dx,F+1.35,z-1.05],[x+dx,F+1.15,z-.38],.04,'weight rubber',12)
    box('Treadmill motor cover',[x,F+.47,z-1.03],[1.12,.24,.42],'powder coated frame',.06)
    box('Console housing',[x,F+1.55,z-1.13],[1.17,.19,.40],'powder coated frame',.055)
    plane('Cardio illuminated console',[x,F+1.65,z-.91],.57,.25,'cardio display')
    for dx in [-.39,.39]:rod('Console cup holder',[x+dx,F+1.66,z-1.10],[x+dx,F+1.70,z-1.10],.075,'weight rubber',12)
    box('Emergency stop',[x,F+1.55,z-.905],[.07,.055,.025],'Nexus upholstery',.005)
    box('Deck red trim',[x,F+.39,z+1.30],[1.12,.065,.035],'Nexus upholstery',.008)
# Spin bike: triangular tube frame, flywheel, cranks/pedals, saddle and grips.
x,z=7.65,-9.2
for dz in [-.58,.55]:
    rod('Bike floor stabilizer',[x-.44,F+.11,z+dz],[x+.44,F+.11,z+dz],.055,'powder coated frame',12)
    for dx in [-.43,.43]:rod('Bike rubber stabilizer end',[x+dx-.05,F+.11,z+dz],[x+dx+.05,F+.11,z+dz],.07,'weight rubber',10)
rod('Bike lower frame',[x,F+.19,z-.55],[x,F+.35,z+.55],.07,'Nexus upholstery',12)
rod('Bike seat tube',[x,F+.34,z+.18],[x,F+1.18,z+.30],.055,'brushed steel',12)
rod('Bike diagonal tube',[x,F+.40,z+.16],[x,F+1.02,z-.51],.075,'Nexus upholstery',12)
rod('Bike front support',[x,F+.17,z-.58],[x,F+1.38,z-.51],.055,'brushed steel',12)
rod('Bike upper frame',[x,F+.96,z+.28],[x,F+1.05,z-.51],.05,'Nexus upholstery',12)
rod('Flywheel',[x-.065,F+.46,z-.40],[x+.065,F+.46,z-.40],.33,'machined silver',24)
rod('Flywheel center',[x-.09,F+.46,z-.40],[x+.09,F+.46,z-.40],.11,'powder coated frame',16)
box('Bike saddle',[x,F+1.26,z+.30],[.36,.10,.45],'weight rubber',.04)
rod('Bike handlebar',[x-.4,F+1.43,z-.52],[x+.4,F+1.43,z-.52],.035,'weight rubber',12)
for dx in [-.39,.39]:rod('Bike angled grip',[x+dx,F+1.43,z-.52],[x+dx,F+1.55,z-.70],.035,'weight rubber',12)
for sign in [-1,1]:
    rod('Bike crank',[x+sign*.11,F+.48,z+.08],[x+sign*.13,F+.32,z+.22],.02,'machined silver',8)
    box('Bike pedal',[x+sign*.25,F+.31,z+.22],[.23,.055,.14],'powder coated frame',.01)
# Reception slatted front, worktop, screen and folded towels/water station.
box('Reception desk carcass',[6.2,F+.62,-1.55],[3.4,1.24,1.15],'powder coated frame',.04)
for x in [4.65+i*.14 for i in range(23)]:box('Reception timber slat',[x,F+.65,-.955],[.075,1.1,.035],'warm reception timber',.008)
box('Reception countertop',[6.2,F+1.28,-1.55],[3.6,.11,1.28],'brushed steel',.025)
box('Reception monitor',[6.2,F+1.57,-1.7],[.65,.39,.06],'powder coated frame',.025)
plane('Reception monitor face',[6.2,F+1.57,-1.66],.55,.29,'cardio display')
box('Towel and bottle cabinet',[8,F+.53,-2.9],[1.1,1.06,.75],'powder coated frame')
for y in [F+.33,F+.71]:
    box('Open cabinet shelf',[8,y,-2.85],[1.0,.05,.6],'warm reception timber',.01)
    for j in range(3):box('Folded towel',[7.7+j*.28,y+.12,-2.73],[.24,.18,.35],'folded linen',.025)
for x in [7.75,8.1]:
    rod('Water bottle',[x,F+1.1,-2.9],[x,F+1.42,-2.9],.075,'bottle blue',12)
    rod('Bottle cap',[x,F+1.42,-2.9],[x,F+1.46,-2.9],.047,'machined silver',10)

merged=[]
for name,objects in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name='NexusInterior_'+name.replace(' ','_');merged.append(o)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in merged)
temp=OUT/f'.interior-{os.getpid()}.glb'
bpy.ops.export_scene.gltf(filepath=str(temp),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_apply=True,export_materials='EXPORT')
assert temp.stat().st_size<=4*1024*1024,'interior exceeds4MiB';temp.replace(OUT/'interior.glb')
report={'schemaVersion':1,'generator':'scripts/gym-tour/build_interior.py','blenderVersion':bpy.app.version_string,'basis':'Original concept interior, not a scan or claim about the actual gym layout.','coordinateConvention':'metres, glTF Y-up; gym floorY4.2','model':'interior.glb','bytes':(OUT/'interior.glb').stat().st_size,'materials':len(mats),'meshes':len(merged),'primitives':len(merged),'triangles':triangles,'images':4,'features':['detailed racks, J hooks, plate storage and barbells','separate upholstered adjustable benches','varied hex dumbbells and plate tree','treadmills with belts,rollers,console and handles','spin bike with flywheel,cranks,pedals and saddle','rubber tiles,aisle markings and panel depth','static mirror treatment','actual official logo,LED fixtures and reception amenities'],'limits':['Concept layout, not measured actual interior','Static mirror treatment, no realtime reflections','Final lighting bake/compression remains later phase']}
temp_meta=OUT/f'.interior-{os.getpid()}.json';temp_meta.write_text(json.dumps(report,indent=2)+'\n');temp_meta.replace(OUT/'interior.json')
print(json.dumps(report));print('VERDICT: PASS')
