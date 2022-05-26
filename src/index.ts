// TODO
// [x] Handle sensitivity
// [x] Ruler zooming
// [x] Handle appearance
// [x] change where planes originate
// [x] scale scene origin
// [x] move scene origin along xy plane
// [x] Swap menu placement?
// [x] display debug info on two lines
// [x] fix handles blocking clicks
// [x] fix dragging off of the canvas bounds
// [x] style handles
// [x] use texture for ruler
// [x] Refactor code?
// [x] constantly call update
// [x] seperate handle logic more intelligently
// reset pattern scrubbing handle between drags
// make high sensitivity a toggleable option
// swap out ruler textures based on zoom
// set handles to box size mode
// save and load calibration
// upload pattern pdf
// render pattern pdf to canvas
// use rendered pattern canvas as texture
// draw pattern
// Split zoom and scale?


// #include("src/math.ts")
// #include("src/renderer.ts")
// #include("src/interface.ts")
// #include("src/pdf.ts")

const handleVert = `#include("src/handle.vert")`
const handleFrag = `#include("src/handle.frag")`;
const rulerVert = `#include("src/ruler.vert")`;
const rulerFrag = `#include("src/ruler.frag")`;

const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);

function remToPixels(rem: number): number {
    return rem * REM_TO_PIXELS;
}

class Handle {
    constructor(public pos: Point, public radius: number) {
        this.pos = pos;
        this.radius = radius;
    }
}

enum DisplayMode {
    Calibration, Pattern
}

const DEFAULT_HANDLE_RADIUS = remToPixels(1);
const DEFAULT_HANDLE_POSITION = 2.0;

interface Viewer {
    origin: Handle;
    handles: Array<Handle>;
    scale: number;
    resetHandle(index: number): void;
    resetScale(): void;
}

const DEFAULT_SCALE_VALUE = 2.0;

class Calibrator implements Viewer {
    perspective: Array<Handle>;
    origin: Handle;
    defaultHandlePositions: Array<Point>;
    handles: Array<Handle>;
    scale: number;

    constructor() {
        this.defaultHandlePositions = new Array<Point>(
            new Point(-DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
            new Point( DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
            new Point(-DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
            new Point( DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
            new Point(0, 0),
        );

        this.perspective = new Array<Handle>(4);
        for (let i=0; i<4; i++) {
            this.perspective[i] = new Handle(this.defaultHandlePositions[i], DEFAULT_HANDLE_RADIUS);
        }

        this.origin = new Handle(new Point(0, 0), DEFAULT_HANDLE_RADIUS);

        this.handles = new Array<Handle>(
            ...this.perspective,
            this.origin
        );

        this.scale = DEFAULT_SCALE_VALUE;
    }

    resetHandle(index: number): void {
        this.handles[index].pos = this.defaultHandlePositions[index];
    }

    resetScale(): void {
        this.scale = DEFAULT_SCALE_VALUE;
    }
}

// class Projector implements Viewer {

// }

(() => {
    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2")!;
    const renderer = new Renderer(gl, 100);
    const interface = new Interface.Interface();
    const calibrator = new Calibrator();
    let viewer: Viewer = calibrator;
    
    const rulerProgram = renderer.createProgram(rulerVert, rulerFrag);
    const rulerTexture = renderer.loadTexture("assets/ruler.png");
    const rulerPlane = renderer.newPlane(1, 1, 8);
    renderer.uploadVertices();

    let currentHandle = -1;
    let initialHandlePosition = new Point(0, 0);
    let initialMousePosition = new Point(0, 0);
    let sensitivity = 0.1;
    let displayMode = DisplayMode.Calibration;

    const onResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        renderer.resizeCanvas(width, height);
    }
    onResize();
    window.onresize = onResize;

    // Listen to mouseup and mousemove events on the _window_, as it's important to get these events wherever they are triggered
    window.onmouseup = () => {
        currentHandle = -1;
    }
    window.onmousemove = (e: MouseEvent) => {
        if (currentHandle < 0) {
            return;
        }

        viewer.handles[currentHandle].pos = Point.add(
            initialHandlePosition,
            Point.scale(
                Point.sub(
                    renderer.windowToCanvasPoint(new Point(e.pageX, e.pageY)),
                    renderer.windowToCanvasPoint(initialMousePosition)
                ),
                sensitivity
            )
        );
    };

    // Listen to mousedown and wheel events on the _canvas_, as we're only interested in them occuring over the canvas
    canvas.onmousedown = (e: MouseEvent) => {
        const mousePosition = new Point(e.pageX, e.pageY);
        const canvasPosition = renderer.windowToCanvasPoint(mousePosition);
        let radius = renderer.windowToCanvasScalar(DEFAULT_HANDLE_RADIUS);
        let best = radius * radius; // 1rem squared
        currentHandle = -1;
        for (let i=0; i<5; i++) {
            let dx = canvasPosition.x - viewer.handles[i].pos.x;
            let dy = canvasPosition.y - viewer.handles[i].pos.y;
            let distanceSquared = dx * dx + dy * dy;
            if (best > distanceSquared) {
                best = distanceSquared;
                currentHandle = i;
                initialHandlePosition = viewer.handles[currentHandle].pos;
                initialMousePosition = mousePosition;
            }
        }
    }
    canvas.onwheel = (e: WheelEvent) => {
        viewer.scale += e.deltaY * 0.0005;
    }

    interface.onZoomReset = () => {
        viewer.resetScale();
    }
    interface.onHandleReset = (i: number) => {
        viewer.resetHandle(i);
    }
    interface.onLoadPattern = PDF.onLoadPattern;

    const animationFrame = () => {
        requestAnimationFrame(animationFrame);
        const model = Matrix4.mul(
            Matrix4.translation(
                Point.scale(
                    calibrator.origin.pos,
                    1 / (4 * viewer.scale)
                )
            ),
            Matrix4.mul(
                Matrix4.scale(viewer.scale),
                Matrix4.translation(new Point(0.5, 0.5))
            )
        )
        const view = rulerPlane.computeProjection(calibrator.handles[0].pos, calibrator.handles[1].pos, calibrator.handles[2].pos, calibrator.handles[3].pos);

        renderer.setModelMatrix(model);
        renderer.setViewMatrix(view);
        renderer.useProgram(rulerProgram);
        renderer.useTexture(rulerTexture);
        renderer.drawPrimitive(rulerPlane.primitive);

        interface.updateValues(
            viewer.scale,
            calibrator.handles.map((v) => v.pos),
            calibrator.handles.map((v) => renderer.canvasToWindowPoint(v.pos))
        );
    }
    animationFrame();
})()