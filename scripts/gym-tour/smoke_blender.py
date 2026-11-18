"""Phase 1 pipeline test only; not the finished gym or production model.
Run: blender -b --factory-startup -P scripts/gym-tour/smoke_blender.py -- --output qa/gym-tour-phase1/tooling
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.device = 'CPU'  # deterministic fallback; do not require a GPU
scene.render.resolution_x = 480
scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.world.color = (0.12, 0.12, 0.12)

def material(name, color, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = 0.6
    return m

red = material('Nexus red', (0.65, 0.015, 0.035))
dark = material('Rubber', (0.045, 0.045, 0.055))
metal = material('Steel', (0.3, 0.32, 0.36), 0.7)

def box(name, at, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj

# Blender Z-up is converted to glTF Y-up during export.
box('Floor', (0, 0, -0.12), (7, 5, 0.2), dark)
box('Back wall', (0, 2.4, 1.4), (7, 0.15, 3), dark)
box('Nexus accent', (0, 2.25, 1.8), (5, 0.08, 0.18), red)
box('Bench cushion', (0, 0, 0.65), (0.65, 1.8, 0.16), red)
for y in [-0.6, 0.6]:
    box('Bench support', (0, y, 0.3), (0.45, 0.15, 0.6), metal)
for x in [-1.5, 1.5]:
    box('Rack upright', (x, 1, 1.1), (0.12, 0.12, 2.2), metal)
box('Rack crossbar', (0, 1, 2.1), (3.1, 0.12, 0.12), red)
bpy.ops.object.light_add(type='AREA', location=(1, -2, 5))
bpy.context.object.data.energy = 650
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 5
bpy.ops.object.camera_add(location=(7, -9, 6))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.lens = 45
scene.camera = camera
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(out / 'smoke-render.png')

capabilities = {'enumerationScope': 'default Cycles backend only; other GPU backends not exhaustively probed'}
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.get_devices()
    capabilities['cyclesDevices'] = [{'name': d.name, 'type': d.type} for d in prefs.devices]
except Exception as error:
    capabilities['deviceEnumerationError'] = str(error)

bpy.ops.wm.save_as_mainfile(filepath=str(out / 'smoke.blend'))
bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=str(out / 'smoke.glb'), export_format='GLB', export_yup=True, export_cameras=False, export_lights=False)
report = {'blenderVersion': bpy.app.version_string, 'engine': scene.render.engine, 'renderDevice': scene.cycles.device, 'samples': scene.cycles.samples, 'resolution': [480, 320], 'capabilities': capabilities, 'glbBytes': (out / 'smoke.glb').stat().st_size, 'scope': 'pipeline smoke test, not final gym, lighting bake or compression validation'}
(out / 'tooling.json').write_text(json.dumps(report, indent=2) + '\n')
print('Headless Cycles CPU render and GLB export completed.')
print('VERDICT: PASS')
