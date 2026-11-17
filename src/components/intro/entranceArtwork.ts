export const ENTRANCE_ASSETS = [
  '/assets/entrance/red-gym-stage.webp',
  '/assets/entrance/dumbbells-cutout.webp',
  '/assets/entrance/kettlebell-gloves-cutout.webp',
];

/** Compose the photographic stage and transparent gear onto the tearing sheets. */
export function drawEntranceArtwork(ctx: CanvasRenderingContext2D, width: number, height: number, images: CanvasImageSource[]) {
  const mobile = width / height < 1;
  const [stage, dumbbells, gear] = images as HTMLImageElement[];
  // Only reuse the clean floor photograph; the photographed smoke is excluded.
  const wall = ctx.createLinearGradient(0, 0, 0, height);
  wall.addColorStop(0, '#010102'); wall.addColorStop(.6, '#080305'); wall.addColorStop(1, '#14050a');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, width, height);
  const floorY = height * .735, sourceY = stage.height * .81;
  const sourceHeight = stage.height - sourceY;
  const sourceWidth = Math.min(stage.width, sourceHeight * width / (height - floorY));
  ctx.drawImage(stage, (stage.width - sourceWidth) / 2, sourceY, sourceWidth, sourceHeight, 0, floorY, width, height - floorY);
  const horizon = ctx.createLinearGradient(0, floorY, 0, floorY + height * .11);
  horizon.addColorStop(0, '#080305'); horizon.addColorStop(1, '#08030500');
  ctx.fillStyle = horizon; ctx.fillRect(0, floorY, width, height * .11);
  // Practical strip lights, with soft optical bloom rather than flat red bars.
  for (const x of [width * .035, width * .965]) {
    ctx.save();
    const top = height * (mobile ? .32 : .24), length = height * (mobile ? .16 : .23);
    ctx.strokeStyle = '#18151b'; ctx.lineWidth = width * .012;
    ctx.beginPath(); ctx.moveTo(x, height * .12); ctx.lineTo(x, floorY); ctx.stroke();
    ctx.lineCap = 'round'; ctx.shadowColor = '#ff0929'; ctx.shadowBlur = width * .025;
    ctx.strokeStyle = '#f00c29'; ctx.lineWidth = Math.max(3, width * .004);
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + length); ctx.stroke(); ctx.stroke();
    ctx.shadowBlur = width * .006; ctx.strokeStyle = '#ffc1c7'; ctx.lineWidth *= .22; ctx.stroke();
    ctx.restore();
  }
  // Broad backlight behind the live bag. No circular outline or ring.
  const backlight = ctx.createRadialGradient(width * .5, height * .59, 0, width * .5, height * .59, width * (mobile ? .65 : .24));
  backlight.addColorStop(0, '#ff132236'); backlight.addColorStop(.4, '#b50a1e17'); backlight.addColorStop(1, '#00000000');
  ctx.fillStyle = backlight; ctx.fillRect(0, 0, width, height);
  const metalText = (text: string, x: number, y: number, maxWidth: number, fontSize: number) => {
    ctx.save(); ctx.textBaseline = 'middle';
    ctx.font = `italic 900 ${fontSize}px Arial Black, Arial, sans-serif`;
    const measured = ctx.measureText(text).width;
    if (measured > maxWidth) ctx.font = `italic 900 ${fontSize * maxWidth / measured}px Arial Black, Arial, sans-serif`;
    const metal = ctx.createLinearGradient(0, y - fontSize * .5, 0, y + fontSize * .5);
    metal.addColorStop(0, '#858388'); metal.addColorStop(.3, '#f3f0ed'); metal.addColorStop(.48, '#c9c4c6'); metal.addColorStop(.52, '#8f898d'); metal.addColorStop(.8, '#ece8e6'); metal.addColorStop(1, '#6b656a');
    ctx.fillStyle = metal; ctx.shadowColor = '#000'; ctx.shadowBlur = width * .006; ctx.shadowOffsetY = 3;
    ctx.fillText(text, x, y); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = Math.max(1, width * .0005); ctx.strokeText(text, x, y);
    // Small, imperfect paint slashes echo the supplied campaign reference.
    const slashY = y + fontSize * .48;
    ctx.fillStyle = '#ee1023'; ctx.beginPath(); ctx.moveTo(x - maxWidth * .015, slashY + fontSize * .16);
    ctx.bezierCurveTo(x + maxWidth * .28, slashY - fontSize * .08, x + maxWidth * .55, slashY - fontSize * .1, x + maxWidth * .76, slashY + fontSize * .03);
    ctx.bezierCurveTo(x + maxWidth * .48, slashY - fontSize * .025, x + maxWidth * .22, slashY + fontSize * .08, x - maxWidth * .015, slashY + fontSize * .16); ctx.fill();
    ctx.restore();
  };
  if (mobile) {
    metalText('BREAK', width * .1, height * .23, width * .8, width * .2);
    metalText('THROUGH.', width * .12, height * .745, width * .76, width * .14);
  } else {
    metalText('BREAK', width * .115, height * .43, width * .32, width * .078);
    metalText('THROUGH.', width * .575, height * .545, width * .35, width * .057);
  }
  const vignette = ctx.createLinearGradient(0, height * .83, 0, height);
  vignette.addColorStop(0, '#00000000'); vignette.addColorStop(1, '#000000a0'); ctx.fillStyle = vignette; ctx.fillRect(0, height * .83, width, height * .17);
  const dumbbellWidth = width * (mobile ? .51 : .235);
  const gearWidth = width * (mobile ? .5 : .23);
  const dh = dumbbellWidth * dumbbells.height / dumbbells.width;
  const gh = gearWidth * gear.height / gear.width;
  ctx.drawImage(dumbbells, -dumbbellWidth * .22, height - dh * .82, dumbbellWidth, dh);
  ctx.drawImage(gear, width - gearWidth * .8, height - gh * .87, gearWidth, gh);
}
