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
  canvas.width = 96;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Shadow
  ctx.shadowColor = 'rgba(229, 9, 20, 0.7)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  // Pin teardrop path pointing down to (48, 114)
  ctx.beginPath();
  ctx.moveTo(48, 114);
  ctx.bezierCurveTo(24, 76, 10, 54, 10, 38);
  ctx.arc(48, 38, 38, Math.PI, 0, false);
  ctx.bezierCurveTo(86, 54, 72, 76, 48, 114);
  ctx.closePath();

  // Gradient fill
  const grad = ctx.createLinearGradient(10, 0, 86, 114);
  grad.addColorStop(0, '#FF1E27');
  grad.addColorStop(1, '#9B050B');
  ctx.fillStyle = grad;
  ctx.fill();

  // White border
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  // White inner circle
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.arc(48, 38, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Inner red circle
  ctx.beginPath();
  ctx.arc(48, 38, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#E50914';
  ctx.fill();

  // Center white dot
  ctx.beginPath();
  ctx.arc(48, 38, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

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
  const isAutoRotating = useRef<boolean>(true);
  const isFlyingRef = useRef<boolean>(false);

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

  // Stop auto-rotation permanently when user interacts
  const stopAutoRotation = useCallback(() => {
    isAutoRotating.current = false;
  }, []);

  // Fly to Nexus Gym in Rajkot
  const flyToNexus = useCallback(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    stopAutoRotation();
    isFlyingRef.current = true;
    onFlightStateChangeRef.current?.(true, false);
    setShowLocationCard(false);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        destinationView.longitude,
        destinationView.latitude,
        destinationView.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(destinationView.heading),
        pitch: Cesium.Math.toRadians(destinationView.pitch),
        roll: Cesium.Math.toRadians(destinationView.roll),
      },
      duration: 4.6,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => {
        isFlyingRef.current = false;
        onFlightStateChangeRef.current?.(false, true);
        setShowLocationCard(true);
        if (viewer && !viewer.isDestroyed()) {
          viewer.scene.requestRender();
        }
      },
      cancel: () => {
        isFlyingRef.current = false;
        onFlightStateChangeRef.current?.(false, false);
      },
    });
  }, [stopAutoRotation]);

  // Reset to initial full Earth view
  const resetGlobe = useCallback(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    stopAutoRotation();
    isFlyingRef.current = true;
    setShowLocationCard(false);
    onFlightStateChangeRef.current?.(true, false);

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
        isFlyingRef.current = false;
        onFlightStateChangeRef.current?.(false, false);
        if (viewer && !viewer.isDestroyed()) {
          viewer.scene.requestRender();
        }
      },
      cancel: () => {
        isFlyingRef.current = false;
        onFlightStateChangeRef.current?.(false, false);
      },
    });
  }, [stopAutoRotation]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    stopAutoRotation();
    viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.45);
    viewer.scene.requestRender();
  }, [stopAutoRotation]);

  const zoomOut = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    stopAutoRotation();
    viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.65);
    viewer.scene.requestRender();
  }, [stopAutoRotation]);

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
    let postRenderRemove: (() => void) | null = null;

    const initCesium = async () => {
      try {
        const Cesium = await loadCesium();
        cesiumRef.current = Cesium;

        if (destroyed || !containerRef.current) return;

        const token = getCesiumIonToken();
        if (token) {
          Cesium.Ion.defaultAccessToken = token;
        }

        // Create Viewer with minimal, clean options
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
          baseLayer: false,
          msaaSamples: 4,
          contextOptions: { webgl: { alpha: false, antialias: true } },
        });

        if (destroyed) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;

        // Render crisp imagery at up to 2x pixel density without unbounded 3x/4x GPU cost.
        const compact = window.matchMedia('(max-width: 767px)').matches;
        viewer.useBrowserRecommendedResolution = false;
        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2) / (window.devicePixelRatio || 1);
        viewer.scene.globe.maximumScreenSpaceError = 1.5;
        viewer.scene.globe.tileCacheSize = compact ? 128 : 256;
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
        postRenderRemove = () => {
          visibilityObserver.disconnect();
          document.removeEventListener('visibilitychange', syncVisibility);
        };

        // Visual Styling: Deep #050505 Space & Natural Earth
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050505');
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050505');
        viewer.scene.globe.enableLighting = true;
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
            semiMinorAxis: 180,
            semiMajorAxis: 180,
            material: new Cesium.ColorMaterialProperty(
              Cesium.Color.fromCssColorString('#E50914').withAlpha(0.35)
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
            scale: 0.85,
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
          stopAutoRotation();
          const pickedObject = viewer.scene.pick(movement.position);
          if (Cesium.defined(pickedObject) && pickedObject.id === markerEntity) {
            setShowLocationCard(true);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Rotate only while visible; demand rendering can sleep after interaction.
        let lastTime = performance.now();
        const spinSpeed = 0.009; // Radians per second
        const autoRotateListener = () => {
          const now = performance.now();
          const dt = Math.min((now - lastTime) / 1000, 0.1);
          lastTime = now;
          if (inViewport && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && isAutoRotating.current && !viewer.isDestroyed() && !isFlyingRef.current) {
            viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -spinSpeed * dt);
            viewer.scene.requestRender();
          }
        };
        viewer.scene.preUpdate.addEventListener(autoRotateListener);
        const removeVisibility = postRenderRemove;
        postRenderRemove = () => {
          removeVisibility?.();
          if (viewer && !viewer.isDestroyed()) {
            viewer.scene.preUpdate.removeEventListener(autoRotateListener);
          }
        };

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
      if (postRenderRemove) postRenderRemove();
      if (handler) handler.destroy();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [stopAutoRotation]);

  // Activate / deactivate wheel zoom on canvas click to prevent trapping page scroll
  const handleCanvasInteraction = () => {
    stopAutoRotation();
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
        aria-label="Interactive 3D Earth Globe. Left click and drag to rotate Earth, use buttons to zoom."
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
