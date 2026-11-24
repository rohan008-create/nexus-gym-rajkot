const productOrder = [
  'whey', 'isolate', 'creatine', 'preworkout',
  'electrolytes', 'gainer', 'peanut', 'bar',
];

let atlas: Promise<HTMLImageElement> | undefined;

function loadAtlas() {
  return atlas ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = '/assets/products/nexus-packaging-atlas.webp';
  }).catch(error => {
    atlas = undefined;
    throw error;
  });
}

export function applyPackagingArtwork(
  productId: string,
  canvas: HTMLCanvasElement,
  onReady: () => void,
) {
  const index = productOrder.indexOf(productId);
  if (index < 0) return () => {};

  let active = true;
  void loadAtlas().then(image => {
    if (!active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const tileWidth = image.naturalWidth / 4;
    const tileHeight = image.naturalHeight / 2;
    const inset = 3;
    ctx.drawImage(image, (index % 4) * tileWidth + inset, Math.floor(index / 4) * tileHeight + inset,
      tileWidth - inset * 2, tileHeight - inset * 2, 0, 0, canvas.width, canvas.height);
    onReady();
  }).catch(() => {
    // The readable label drawn by the model remains available.
  });
  return () => { active = false; };
}
