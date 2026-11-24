'use client';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type * as CesiumType from 'cesium';
import {
  destinationView,
  earthInitialView,
  getCesiumIonToken,
  nexusLocation,
} from './globeConfig';
import GlobeLocationCard from './GlobeLocationCard';
import GlobeLoading from './GlobeLoading';

function loadCesium(): Promise<typeof CesiumType> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window undefined'));
  const win = window as unknown as { Cesium?: typeof CesiumType; CESIUM_BASE_URL?: string };
  win.CESIUM_BASE_URL = '/cesium';

  if (win.Cesium) {
    return Promise.resolve(win.Cesium);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="/cesium/Cesium.js"]');
    if (existing) {
      if (win.Cesium) return resolve(win.Cesium);
      existing.addEventListener('load', () => resolve(win.Cesium!));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = '/cesium/Cesium.js';
    script.async = true;
    script.onload = () => {
      if (win.Cesium) resolve(win.Cesium);
      else reject(new Error('Cesium not available on window'));
    };
    script.onerror = () => reject(new Error('Failed to load /cesium/Cesium.js'));
    document.head.appendChild(script);
  });
}

function createNexusPinDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 168;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // A branded architectural locator: enamel badge, tether and ground chevron.
  ctx.shadowColor = '#ed203c99'; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.moveTo(72, 12); ctx.lineTo(119, 38); ctx.lineTo(119, 88);
  ctx.lineTo(72, 114); ctx.lineTo(25, 88); ctx.lineTo(25, 38); ctx.closePath();
  const grad = ctx.createLinearGradient(25, 12, 119, 114);
  grad.addColorStop(0, '#ff465a'); grad.addColorStop(1, '#a30824');
  ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.shadowBlur = 0; ctx.font = 'italic 900 57px Arial'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', 70, 65);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(72, 117); ctx.lineTo(72, 142); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(60, 141); ctx.lineTo(72, 154); ctx.lineTo(84, 141); ctx.stroke();
  ctx.fillStyle = '#f52643'; ctx.beginPath(); ctx.ellipse(72, 158, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

  return canvas.toDataURL();
}

export interface CesiumGlobeHandle {
  flyToNexus: () => void;
  resetGlobe: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface CesiumGlobeProps {
  onFlightStateChange?: (isFlying: boolean, isAtDestination: boolean) => void;
  onReady?: () => void;
  onError?: (err: Error) => void;
  controllerRef?: React.MutableRefObject<CesiumGlobeHandle | null>;
  onControllerReady?: (handle: CesiumGlobeHandle) => void;
}

const CesiumGlobe = forwardRef<CesiumGlobeHandle, CesiumGlobeProps>(function CesiumGlobe(
  { onFlightStateChange, onReady, onError, controllerRef, onControllerReady },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumType.Viewer | null>(null);
  const cesiumRef = useRef<typeof CesiumType | null>(null);
  const markerEntityRef = useRef<CesiumType.Entity | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLocationCard, setShowLocationCard] = useState<boolean>(false);
  const [isWheelActive, setIsWheelActive] = useState<boolean>(false);
  const [imagerySource, setImagerySource] = useState<string>('Satellite');

  // Keep callback refs stable across renders to prevent unnecessary re-mounts
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onFlightStateChangeRef = useRef(onFlightStateChange);
  onFlightStateChangeRef.current = onFlightStateChange;

  // Fly to Nexus Gym in Rajkot
  const flyToNexus = useCallback(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    onFlightStateChangeRef.current?.(true, false);
    setShowLocationCard(false);
    containerRef.current?.setAttribute('data-destination-state', 'flying');

    // Orbit around the gym itself. Placing a tilted camera directly above the
    // coordinate aims past the pin and leaves the destination offscreen.
    const destination = Cesium.Cartesian3.fromDegrees(nexusLocation.longitude, nexusLocation.latitude, 15);
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(destination, 85), {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(destinationView.heading),
        Cesium.Math.toRadians(destinationView.pitch),
        window.innerWidth < 768 ? 1450 : 1000
      ),
      duration: 4.6,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => {
        onFlightStateChangeRef.current?.(false, true);
        setShowLocationCard(true);
        containerRef.current?.setAttribute('data-destination-state', 'arrived');
        if (viewer && !viewer.isDestroyed()) {
          viewer.scene.requestRender();
        }
      },
      cancel: () => {
        onFlightStateChangeRef.current?.(false, false);
      },
    });
  }, []);

  // Reset to initial full Earth view
  const resetGlobe = useCallback(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    setShowLocationCard(false);
    onFlightStateChangeRef.current?.(true, false);
    containerRef.current?.setAttribute('data-destination-state', 'earth');

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        earthInitialView.longitude,
        earthInitialView.latitude,
        earthInitialView.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(earthInitialView.heading),
        pitch: Cesium.Math.toRadians(earthInitialView.pitch),
        roll: Cesium.Math.toRadians(earthInitialView.roll),
      },
      duration: 3.4,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => {
        onFlightStateChangeRef.current?.(false, false);
        if (viewer && !viewer.isDestroyed()) {
          viewer.scene.requestRender();
        }
      },
      cancel: () => {
        onFlightStateChangeRef.current?.(false, false);
      },
    });
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.45);
    viewer.scene.requestRender();
  }, []);

  const zoomOut = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.65);
    viewer.scene.requestRender();
  }, []);

  // Expose imperative handle to parent
  const handle: CesiumGlobeHandle = useMemo(
    () => ({
      flyToNexus,
      resetGlobe,
      zoomIn,
      zoomOut,
    }),
    [flyToNexus, resetGlobe, zoomIn, zoomOut]
  );

  useImperativeHandle(ref, () => handle, [handle]);

  useEffect(() => {
    if (controllerRef) {
      controllerRef.current = handle;
    }
    onControllerReady?.(handle);
  }, [handle, controllerRef, onControllerReady]);

  // Initialize Viewer
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    let destroyed = false;
    let handler: CesiumType.ScreenSpaceEventHandler | null = null;
    let removeVisibilityListeners: (() => void) | null = null;
    let removeMarkerProjection: (() => void) | null = null;
    let themeObserver: MutationObserver | null = null;

    const initCesium = async () => {
      try {
        const Cesium = await loadCesium();
        cesiumRef.current = Cesium;

        if (destroyed || !containerRef.current) return;

        const token = getCesiumIonToken();
        if (token) {
          Cesium.Ion.defaultAccessToken = token;
        }

        const compact = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          creditContainer: creditRef.current || undefined,
          scene3DOnly: true,
          requestRenderMode: true,
          maximumRenderTimeChange: Number.POSITIVE_INFINITY,
          useDefaultRenderLoop: false,
          targetFrameRate: compact ? 30 : undefined,
          baseLayer: false,
          msaaSamples: compact ? 1 : 4,
          contextOptions: { webgl: { alpha: false, antialias: !compact } },
        });

        if (destroyed) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;

        // Cap the render buffer at CSS pixels on compact screens.
        viewer.useBrowserRecommendedResolution = false;
        const pixelRatio = window.devicePixelRatio || 1;
        viewer.resolutionScale = Math.min(pixelRatio, compact ? 1 : 2) / pixelRatio;
        viewer.scene.globe.maximumScreenSpaceError = compact ? 2.5 : 1.5;
        viewer.scene.globe.tileCacheSize = compact ? 96 : 256;
        viewer.scene.globe.preloadAncestors = true;
        viewer.scene.globe.preloadSiblings = false;
        viewer.clock.shouldAnimate = false;

        // Suspend the entire render loop outside the section or hidden tab.
        let inViewport = false;
        const syncVisibility = () => {
          if (viewer.isDestroyed()) return;
          viewer.useDefaultRenderLoop = inViewport && !document.hidden;
          if (viewer.useDefaultRenderLoop) {
            viewer.resize();
            viewer.scene.requestRender();
          }
        };
        const visibilityObserver = new IntersectionObserver(([entry]) => {
          inViewport = entry.isIntersecting;
          syncVisibility();
        });
        visibilityObserver.observe(containerRef.current!);
        document.addEventListener('visibilitychange', syncVisibility);
        removeVisibilityListeners = () => {
          visibilityObserver.disconnect();
          document.removeEventListener('visibilitychange', syncVisibility);
        };

        // Match the surrounding page, including live theme changes.
        const syncTheme = () => {
          if (destroyed || viewer.isDestroyed()) return;
          const light = document.documentElement.dataset.theme === 'light';
          viewer.scene.backgroundColor = Cesium.Color.fromCssColorString(light ? '#ffffff' : '#050505');
          containerRef.current?.setAttribute('data-globe-theme', light ? 'light' : 'dark');
          viewer.scene.requestRender();
        };
        themeObserver = new MutationObserver(syncTheme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        syncTheme();
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050505');
        // Satellite navigation stays legible regardless of the real-world sun.
        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.depthTestAgainstTerrain = false;

        // Clean space without skybox stars to blend with website background
        if (viewer.scene.skyBox) {
          viewer.scene.skyBox.show = false;
        }

        // Disable realtime shadow maps for high performance
        if (viewer.scene.shadowMap) {
          viewer.scene.shadowMap.enabled = false;
        }

        // Atmosphere settings for realistic planetary rim
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
          viewer.scene.skyAtmosphere.brightnessShift = 0.08;
          viewer.scene.skyAtmosphere.saturationShift = 0.05;
        }

        // Configure Satellite Imagery
        viewer.imageryLayers.removeAll();

        let imageryLoaded = false;
        if (token) {
          try {
            const ionProvider = await Cesium.createWorldImageryAsync({
              style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
            });
            if (!destroyed && !viewer.isDestroyed()) {
              viewer.imageryLayers.addImageryProvider(ionProvider);
              imageryLoaded = true;
              setImagerySource('Cesium ion Satellite');
            }
          } catch (ionErr) {
            console.warn('Cesium Ion imagery failed, falling back to global imagery:', ionErr);
          }
        }

        // Fallback global satellite imagery
        if (!imageryLoaded && !destroyed && !viewer.isDestroyed()) {
          try {
            const arcGisProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
              'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
              { enablePickFeatures: false }
            );
            if (!destroyed && !viewer.isDestroyed()) {
              viewer.imageryLayers.addImageryProvider(arcGisProvider);
              setImagerySource('Global Satellite Imagery');
            }
          } catch (arcErr) {
            console.warn('ArcGIS imagery failed, falling back to OpenStreetMap:', arcErr);
            const osmProvider = new Cesium.OpenStreetMapImageryProvider({
              url: 'https://tile.openstreetmap.org/',
            });
            if (!destroyed && !viewer.isDestroyed()) {
              viewer.imageryLayers.addImageryProvider(osmProvider);
              setImagerySource('OpenStreetMap');
            }
          }
        }

        if (destroyed || viewer.isDestroyed()) return;

        // Initial Camera Position: Earth centered over India
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            earthInitialView.longitude,
            earthInitialView.latitude,
            earthInitialView.height
          ),
          orientation: {
            heading: Cesium.Math.toRadians(earthInitialView.heading),
            pitch: Cesium.Math.toRadians(earthInitialView.pitch),
            roll: Cesium.Math.toRadians(earthInitialView.roll),
          },
        });

        // Add Geographically Anchored Destination Marker in Rajkot
        const pinDataUrl = createNexusPinDataUrl();
        const markerPosition = Cesium.Cartesian3.fromDegrees(
          nexusLocation.longitude,
          nexusLocation.latitude,
          15
        );

        // Ground Glowing Pulsing Disc
        viewer.entities.add({
          position: markerPosition,
          ellipse: {
            semiMinorAxis: 85,
            semiMajorAxis: 85,
            material: new Cesium.ColorMaterialProperty(
              Cesium.Color.fromCssColorString('#E50914').withAlpha(0.12)
            ),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#FF1E27').withAlpha(0.85),
            outlineWidth: 2,
            height: 5,
          },
        });

        // Destination Billboard Pin
        const markerEntity = viewer.entities.add({
          name: 'NEXUS FITNESS CLUB',
          position: markerPosition,
          billboard: {
            image: pinDataUrl,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            scale: 0.65,
            scaleByDistance: new Cesium.NearFarScalar(500, 1.0, 15000000, 0.42),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: 'NEXUS FITNESS CLUB\nRajkot, Gujarat',
            font: 'bold 12px ui-sans-serif, system-ui, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString('#050505'),
            outlineWidth: 4,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 8),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 100000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        markerEntityRef.current = markerEntity;

        // Interaction Setup: ScreenSpaceEventHandler for Marker Clicks
        handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: { position: CesiumType.Cartesian2 }) => {
          const pickedObject = viewer.scene.pick(movement.position);
          if (Cesium.defined(pickedObject) && pickedObject.id === markerEntity) {
            setShowLocationCard(true);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Capture the marker location only when the scene draws a new frame.
        removeMarkerProjection = viewer.scene.postRender.addEventListener(() => {
          const projected = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, markerPosition);
          if (projected && containerRef.current) containerRef.current.dataset.markerScreen = `${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
        });

        // Screen space camera controller adjustments with premium inertial damping
        const controller = viewer.scene.screenSpaceCameraController;
        controller.inertiaSpin = 0.92;
        controller.inertiaTranslate = 0.92;
        controller.inertiaZoom = 0.85;
        controller.enableZoom = false;
        controller.minimumZoomDistance = 150;
        controller.maximumZoomDistance = 35000000;

        setIsLoading(false);
        onReadyRef.current?.();
      } catch (err) {
        if (!destroyed) {
          console.error('Cesium Globe initialization failed:', err);
          setIsLoading(false);
          onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    initCesium();

    return () => {
      destroyed = true;
      themeObserver?.disconnect();
      removeVisibilityListeners?.();
      removeMarkerProjection?.();
      if (handler) handler.destroy();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Activate / deactivate wheel zoom on canvas click to prevent trapping page scroll
  const handleCanvasInteraction = () => {
    if (!isWheelActive) {
      setIsWheelActive(true);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.scene.screenSpaceCameraController.enableZoom = true;
      }
    }
  };

  const handleMouseLeave = () => {
    setIsWheelActive(false);
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      viewerRef.current.scene.screenSpaceCameraController.enableZoom = false;
    }
  };

  return (
    <div
      className="cesium-globe-wrapper"
      data-lenis-prevent={isWheelActive ? '' : undefined}
      onPointerDown={handleCanvasInteraction}
      onTouchStart={handleCanvasInteraction}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={containerRef}
        className="cesium-globe-canvas"
        role="application"
        aria-label="Globe map. Drag to rotate and use the buttons to zoom."
      />

      {/* Branded loading state */}
      {isLoading && <GlobeLoading />}

      {/* Custom Floating Location Details Card */}
      {showLocationCard && (
        <GlobeLocationCard
          onClose={() => setShowLocationCard(false)}
          onResetGlobe={resetGlobe}
        />
      )}

      {/* Wheel Zoom Hint */}
      {isWheelActive && (
        <div className="globe-wheel-hint" aria-hidden>
          <span>INTERACTIVE MODE ACTIVE · SCROLL OUTSIDE TO NAVIGATE PAGE</span>
        </div>
      )}

      {/* Imagery Attribution Container */}
      <div ref={creditRef} className="globe-credit-container" aria-label="Map data attribution" />
      <div className="globe-imagery-badge" aria-hidden>
        <span>{imagerySource}</span>
      </div>
    </div>
  );
});

export default CesiumGlobe;
