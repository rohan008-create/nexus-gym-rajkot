"""Original Nexus exterior, inferred from the supplied photograph (not surveyed).
blender -b --factory-startup -P scripts/gym-tour/build_exterior.py -- --output public/models/nexus-gym
Three coordinates: X right, Y up, Z street. Blender conversion is (x,-z,y).
"""
import argparse, json, math, os, random, sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--output', default=str(ROOT / 'public/models/nexus-gym'))
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT = Path(args.output).resolve(); OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'; scene.unit_settings.scale_length = 1
buckets = {}
rng = random.Random(713)

def image(name, size, pixel):
    im = bpy.data.images.new(name, width=size, height=size, alpha=True)
    values = []
    for y in range(size):
        for x in range(size): values.extend(pixel(x / size, y / size))
    im.pixels = values; im.pack(); return im

stucco = image('Original warm plaster grain', 128, lambda x,y: (lambda n: (n, n*.975, n*.895, 1))(.72 + rng.random()*.035 + math.sin(x*91+y*37)*.006))
paving = image('Original paving grain', 128, lambda x,y: (lambda n: (n, n*1.015, n*.99, 1))(.34 + rng.random()*.035))
def glass_pixel(x,y):
    cloud = math.sin(x*7 + math.sin(y*11)*.6)*.018 + math.sin(x*18+y*4)*.01
    horizon = max(0, 1-abs(y-.44)*7)
    strip = .055 if .74 < x < .79 else 0
    return (.14+y*.12+cloud+strip+horizon*.045, .25+y*.16+cloud+strip+horizon*.055, .29+y*.19+cloud+strip+horizon*.06, 1)
glass_map = image('Original soft sky reflection', 256, glass_pixel)

mats = {}
def mat(name, color, rough=.6, metal=0, texture=None, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    if texture:
        t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=texture;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
    mats[name]=m; return m
mat('plaster',(.75,.73,.65),.94,texture=stucco)
mat('plaster shade',(.48,.47,.40),.92)
mat('cut stone',(.62,.61,.54),.85)
mat('charcoal ACM',(.035,.045,.047),.43,.35)
mat('black frames',(.025,.032,.035),.42,.55)
mat('gym glazing',(.19,.31,.36),.22,.32,glass_map)
mat('upper glazing',(.22,.37,.43),.25,.23,glass_map)
mat('brushed aluminium',(.46,.49,.49),.37,.72)
mat('deep shadow',(.018,.022,.023),.94)
mat('paint white',(.73,.74,.70),.6)
mat('Nexus red',(.65,.015,.035),.36,.18)
mat('asphalt',(.34,.35,.34),.96,texture=paving)
mat('pavement',(.55,.54,.49),.92)
mat('shutters',(.17,.20,.19),.71,.28)
mat('warm lettering',(.84,.82,.72),.55,emission=.12)
mat('service pipe',(.29,.31,.28),.6,.38)
logo=bpy.data.images.load(str(ROOT/'public/assets/nexus-logo.png'),check_existing=True)
logo.pack()
lm=mat('official Nexus logo',(1,1,1),.55)
p=lm.node_tree.nodes.get('Principled BSDF');t=lm.node_tree.nodes.new('ShaderNodeTexImage');t.image=logo
lm.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color']);lm.node_tree.links.new(t.outputs['Alpha'],p.inputs['Alpha'])
p.inputs['Emission Strength'].default_value=.35;lm.node_tree.links.new(t.outputs['Color'],p.inputs['Emission Color'])
lm.surface_render_method='DITHERED';lm.use_transparency_overlap=False

def to_blender(p): return (p[0],-p[2],p[1])
def bucket(obj, material):
    obj.data.materials.clear();obj.data.materials.append(mats[material]);buckets.setdefault(material,[]).append(obj);return obj

def box(name,p,size,material,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=to_blender(p));o=bpy.context.object;o.name=name
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel and min(size)>.035:
        mod=o.modifiers.new('Fine manufactured edge','BEVEL');mod.width=min(bevel,min(size)*.14);mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for face in o.data.polygons: face.use_smooth=False
    return bucket(o,material)

def rod(name,a,b,r,material,vertices=10):
    a,b=Vector(to_blender(a)),Vector(to_blender(b));d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    for face in o.data.polygons:face.use_smooth=len(face.vertices)==4
    return bucket(o,material)

def plane(name,p,width,height,material,uv=(0,0,1,1)):
    x,y,z=p;verts=[to_blender((x-width/2,y-height/2,z)),to_blender((x+width/2,y-height/2,z)),to_blender((x+width/2,y+height/2,z)),to_blender((x-width/2,y+height/2,z))]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.uv_layers.new(name='UVMap')
    u0,v0,u1,v1=uv
    for loop,coord in zip(mesh.uv_layers.active.data,[(u0,v0),(u1,v0),(u1,v1),(u0,v1)]):loop.uv=coord
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);return bucket(o,material)

def text(name,body,p,size,material):
    curve=bpy.data.curves.new(name,'FONT');curve.body=body;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';curve.extrude=.004;curve.bevel_depth=.001;curve.resolution_u=3
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);o.location=to_blender(p);o.rotation_euler=(math.pi/2,0,0)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return bucket(o,material)

# Ground, curb and a tiled forecourt. A contact plinth and deep reveals give scale.
box('Street',[0,-.2,2],[66,.28,52],'asphalt',0)
box('Raised footpath',[0,.02,-3.6],[23,.32,17],'pavement',.04)
box('Curb front',[0,-.02,4.9],[23,.37,.22],'cut stone',.035)
for x in [i*.8-11.2 for i in range(29)]:box('Paving joint',[x,.188,2.7],[.012,.008,4.3],'plaster shade',0)
for z in [1,1.8,2.6,3.4,4.2]:box('Paving joint',[0,.189,z],[22.5,.008,.012],'plaster shade',0)
box('Building contact shadow',[0,.23,-6],[18.5,.12,12.4],'deep shadow',0)
# Recessed ground-floor commercial bays, with believable shutter ribs/guide rails.
box('Ground floor body',[0,2,-6.18],[18,3.65,11.65],'plaster shade',.035)
for x in [-7.15,-3.55,.05,3.65,7.05]:
    box('Ground shop reveal',[x,1.92,-.04],[3.22,3.38,.3],'deep shadow')
    box('Roller shutter',[x,1.84,.145],[3.0,2.95,.055],'shutters',0)
    for j in range(25):box('Shutter rolled rib',[x,.43+j*.113,.181],[2.96,.018,.022],'brushed aluminium',0)
    for dx in [-1.55,1.55]:box('Shutter guide',[x+dx,1.86,.19],[.065,3.04,.09],'black frames',.008)
    box('Shop sign fascia',[x,3.6,.2],[3.25,.46,.17],'charcoal ACM')
    box('Weathered shop awning',[x,3.28,.52],[3.35,.1,.82],'cut stone')
    text('Shop label','LOCAL STORES' if x<0 else 'NEXUS BUILDING',[x,3.6,.3],.13,'warm lettering')
for x in [-9,-5.4,-1.8,1.8,5.4,9]:box('Ground column',[x,2,.18],[.28,3.9,.45],'plaster',.025)
# Main black gym band: wall-depth, panel joints, tinted continuous glazing and fascia.
box('Gym solid back',[0,6,-6.3],[18,3.9,11.4],'charcoal ACM',.025)
box('Gym lower slab',[0,4.25,-5.9],[18.7,.28,12.3],'charcoal ACM',.025)
box('Gym top canopy',[0,8,-5.9],[18.75,.28,12.4],'charcoal ACM',.025)
box('Crimson edge',[0,4.37,.35],[18.75,.065,.11],'Nexus red',.008)
box('Gym glazing recess',[0,6.12,-.19],[18.1,2.98,.08],'deep shadow',0)
for i in range(12):
    x=-8.25+i*1.5
    box('Blue glass panel',[x,6.06,-.085],[1.445,2.86,.055],'gym glazing',.004)
    box('Glazing mullion',[x-.75,6.08,.015],[.054,3.02,.13],'black frames',.005)
    # Narrow specular edge makes glazing and joinery read at portrait scale.
    box('Mullion edge',[x-.714,6.1,.034],[.012,2.9,.018],'brushed aluminium',0)
box('Glazing transom',[0,5.93,.045],[18.1,.075,.15],'black frames',.008)
box('Fascia header',[0,7.67,.18],[18.8,.75,.36],'charcoal ACM',.025)
for x in [-8,-4,0,4,8]:box('ACM panel joint',[x,7.67,.371],[.014,.68,.008],'deep shadow',0)
plane('Official main Nexus brand',[-4.8,7.0,.382],6.1,6.1/3,'official Nexus logo')
text('Front results signage','RESULTS MATTER',[3,7.7,.392],.37,'warm lettering')
# Right entry portal and the round emblem from the same official source image.
box('Entry black tower',[8.05,6.45,.46],[2.05,3.55,.6],'charcoal ACM',.045)
rod('Circular entry badge',[8.05,7.13,.788],[8.05,7.13,.84],.63,'black frames',40)
plane('Official emblem entry',[8.05,7.13,.845],1.17,1.17,'official Nexus logo',(.038,.10,.306,.91))
box('Entry door glass',[8.05,5.32,.79],[1.56,1.9,.055],'gym glazing',.008)
box('Entry door split',[8.05,5.32,.84],[.055,1.9,.08],'black frames',.005)
rod('Entry door handle',[8.24,4.95,.89],[8.24,5.54,.89],.024,'brushed aluminium')
# Upper building has recessed blue bays and a taller central architectural frame.
box('Upper rear building',[0,11.7,-6.3],[18,7.15,11.4],'plaster',.045)
for y in [8.3,11.67,15.05]:box('Horizontal stone band',[0,y,-.05],[18.25,.28,.9],'cut stone',.02)
for x in [-8.95,-5.45,-1.82,1.82,5.45,8.95]:box('Upper vertical pier',[x,11.7,.08],[.39,6.9,.94],'plaster',.025)
for x in [-7.15,-3.6,3.6,7.15]:
    for y in [9.94,13.33]:
        box('Upper window shadow',[x,y,-.12],[3.0,2.83,.18],'deep shadow',.008)
        box('Upper blue window',[x,y,-.006],[2.85,2.64,.055],'upper glazing',.004)
        box('Stone head lintel',[x,y+1.42,.11],[3.1,.16,.64],'plaster',.015)
        box('Stone sill',[x,y-1.4,.15],[3.15,.13,.8],'cut stone',.018)
        for dx in [-1.43,0,1.43]:box('Window aluminium',[x+dx,y,.04],[.035,2.65,.065],'brushed aluminium',.004)
        box('Window cross rail',[x,y-.42,.045],[2.88,.035,.06],'brushed aluminium',.004)
# Centre bay is tall and glazed, unlike the Phase2 flat repeated-window box.
box('Central glazing shadow',[0,11.74,-.1],[2.85,6.43,.18],'deep shadow',.01)
box('Central blue bay',[0,11.75,.01],[2.69,6.21,.055],'upper glazing',.004)
for y in [8.65,10.7,12.78,14.84]:box('Central glazing rail',[0,y,.09],[2.75,.045,.09],'brushed aluminium',.004)
box('Central glazing split',[0,11.75,.085],[.045,6.22,.07],'brushed aluminium',.004)
for x in [-1.7,1.7]:box('Raised central tower side',[x,12.15,.35],[.49,7.55,1.25],'plaster',.025)
box('Raised central tower crown',[0,15.84,.35],[3.9,.42,1.25],'plaster',.03)
# Visible right return: windows in real depth, coping and service infrastructure.
for z in [-2.2,-6.1,-9.8]:
    for y in [9.95,13.3]:
        box('Right window reveal',[9.03,y,z],[.14,2.78,2.25],'deep shadow',.008)
        box('Right blue glass',[9.12,y,z],[.06,2.59,2.08],'upper glazing',.004)
        box('Right window mullion',[9.17,y,z],[.055,2.6,.04],'brushed aluminium',.004)
        box('Right stone sill',[9.21,y-1.4,z],[.63,.13,2.45],'cut stone',.015)
for x,y,z in [(-5.15,8.75,.45),(5.1,12.25,.45),(9.35,8.8,-5)]:
    box('AC condenser shell',[x,y,z],[.9,.55,.4],'paint white',.035)
    if x<9:
        rod('AC fan housing',[x-.14,y,z+.21],[x-.14,y,z+.235],.205,'deep shadow',24)
        for off in [-.13,-.065,0,.065,.13]:box('AC fan grille',[x-.14+off,y,z+.24],[.013,.37,.016],'brushed aluminium',0)
        for off in [-.14,-.07,0,.07,.14]:box('AC cooling slat',[x+.29,y+off,z+.22],[.18,.012,.02],'plaster shade',0)
    for dx in [-.32,.32]:box('AC bracket',[x+dx,y-.34,z-.02],[.055,.12,.7],'service pipe',.005)
rod('Facade drainage',[8.75,4.5,.37],[8.75,15.1,.37],.045,'service pipe')
for y in [5,7,9,11,13,15]:rod('Drain pipe clip',[8.75,y,.32],[8.75,y,.46],.067,'brushed aluminium')
box('Roof coping',[0,15.4,-6],[18.9,.29,12.7],'cut stone',.035)
box('Roof shadow edge',[0,15.23,-6],[18.55,.07,12.38],'plaster shade',.008)
box('Rooftop stair housing',[-.4,16.35,-7.7],[3.5,1.75,3.15],'plaster',.045)
box('Rooftop housing cap',[-.4,17.25,-7.7],[3.8,.17,3.45],'cut stone',.025)
box('Rooftop vent',[-.4,16.4,-6.08],[.9,.7,.07],'deep shadow',.005)
# Proper stair stringers, repeated treads and a connected sloping balustrade.
steps=20; bottom_z=8.8; run=.355; rise=4.2/steps
for i in range(steps):
    z=bottom_z-i*run;y=.24+(i+.5)*rise
    box('Stair tread',[8.05,y,z],[2.1,.15,.38],'charcoal ACM',.012)
    box('Stair nosing',[8.05,y+.081,z+.17],[2.12,.025,.045],'brushed aluminium',.004)
    box('Stair riser shadow',[8.05,y-.065,z-.15],[1.96,.17,.055],'deep shadow',.004)
box('Stair upper landing',[8.04,4.42,1.7],[2.24,.18,1.45],'charcoal ACM',.018)
for x in [7.06,9.04]:
    rod('Stair stringer',[x,.2,8.88],[x,4.38,1.85],.095,'black frames',10)
    for i in range(0,steps,3):
        y=.24+(i+.5)*rise;z=bottom_z-i*run
        rod('Rail post',[x,y+.08,z],[x,y+1.03,z],.027,'brushed aluminium')
        box('Rail post base',[x,y+.1,z],[.13,.04,.13],'brushed aluminium',.005)
    rod('Continuous handrail',[x,1.12,8.95],[x,5.48,1.76],.035,'brushed aluminium',12)
    rod('Mid rail',[x,.65,8.95],[x,5.01,1.76],.021,'brushed aluminium')
    rod('Landing post',[x,4.52,1.09],[x,5.48,1.09],.027,'brushed aluminium')
    rod('Landing handrail',[x,5.48,1.76],[x,5.48,1.09],.035,'brushed aluminium')
# Quiet parking marks beyond the clear pedestrian landing.
for x in [-9,-5,-1,3]:box('Parking bay mark',[x,-.047,8],[.065,.01,3.3],'warm lettering',0)

# Merge all pieces per material, retaining UVs/normals and a bounded draw-call count.
merged=[]
for name,objects in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    obj=bpy.context.object;obj.name='NexusExterior_'+name.replace(' ','_');merged.append(obj)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
triangles=sum(sum(len(poly.vertices)-2 for poly in obj.data.polygons) for obj in merged)
scene.world.color=(.2,.2,.2)
# Never expose a partially written GLB to a running preview/browser. The temp
# file is on the same filesystem so publication is a single atomic rename.
temporary_model = OUT / f'.exterior-{os.getpid()}.glb'
bpy.ops.export_scene.gltf(filepath=str(temporary_model),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_apply=True,export_materials='EXPORT')
temporary_model.replace(OUT / 'exterior.glb')
report={'schemaVersion':1,'generator':'scripts/gym-tour/build_exterior.py','blenderVersion':bpy.app.version_string,'basis':'Original geometry inferred from one Nexus building photograph; approximate dimensions, not a survey.','coordinateConvention':'metres, glTF Y-up; +Z street','model':'exterior.glb','bytes':(OUT/'exterior.glb').stat().st_size,'meshes':len(merged),'materials':len(mats),'triangles':triangles,'textures':'Original generated plaster/paving/soft sky reflection; existing official project Nexus logo. No third-party assets.','features':['recessed upper glazing','central vertical bay','panel seams','official wordmark and entry emblem','continuous stair rails and stringers','AC grilles/brackets','drainage services','roof coping/housing','tiled forecourt and curb'],'limits':['Not a measured scan','Static reflected-sky texture; no realtime mirror','Final lighting bake is a later phase']}
temporary_metadata = OUT / f'.exterior-{os.getpid()}.json'
temporary_metadata.write_text(json.dumps(report,indent=2)+'\n')
temporary_metadata.replace(OUT / 'exterior.json')
print(json.dumps(report));print('VERDICT: PASS')
