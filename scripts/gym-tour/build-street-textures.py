"""Offline sky and asphalt textures for the original street model."""
from pathlib import Path
import numpy as np
from PIL import Image

out = Path(__file__).resolve().parents[2] / 'public/models/nexus-gym'
rng = np.random.default_rng(47)
w,h = 1024,512

def noise(cols,rows):
    small = Image.fromarray(rng.integers(0,256,(rows,cols),dtype='uint8'))
    return np.asarray(small.resize((w,h),Image.Resampling.BICUBIC),dtype=float)/255

# Thin cumulus banks towards the horizon, broken into finer wisps.
y = np.linspace(0,1,h)[:,None]
n = sum(weight*noise(c,r) for weight,c,r in [
    (.42,11,12),(.25,22,24),(.16,48,52),(.10,96,104),(.07,192,208)])
cloud = np.clip((n-.51+.055*y)*4.1,0,.86) * (.35+.65*y)
haze = np.clip(y,0,1)**1.45
sky = np.stack([58+155*haze,145+80*haze,219+17*haze],axis=-1)
sky = sky*(1-cloud[:,:,None]) + np.array([250,248,239])*cloud[:,:,None]
Image.fromarray(np.uint8(sky)).save(out/'street-sky.webp',quality=83)
w=h=256
grain = rng.normal(0,6,(h,w)) + (noise(28,28)-.5)*9
chips = rng.uniform(size=(h,w)) > .974
grain[chips] += 19
image = np.clip(np.array([72,72,69])+grain[:,:,None],0,255)
Image.fromarray(np.uint8(image)).save(out/'street-asphalt.webp',quality=81)
