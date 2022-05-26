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
// Refactor code?
// constantly call update
// seperate handle logic more intelligently
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

const handleVert = `#include("src/handle.vert")`
const handleFrag = `#include("src/handle.frag")`;
const rulerVert = `#include("src/ruler.vert")`;
const rulerFrag = `#include("src/ruler.frag")`;

class Interface {
    menu: HTMLElement;
    menuLeft: boolean;
    menuSwap: HTMLElement;
    zoomReset: HTMLElement;
    onZoomReset: () => void;
    zoomValue: HTMLElement;
    handles: Array<HTMLElement>;
    handleResets: Array<HTMLElement>;
    onHandleReset: (i: number) => void;
    handleXValues: Array<HTMLElement>;
    handleYValues: Array<HTMLElement>;

    constructor () {
        this.menu = document.getElementById("menu");
        this.menuLeft = true;
        this.swapMenu();
        this.menuSwap = document.getElementById("swap");
        this.menuSwap.onclick = () => {
            this.menuLeft = !this.menuLeft;
            this.swapMenu();
        };
        this.zoomReset = document.getElementById("zoom-reset");
        this.zoomReset.onclick = () => {
            this.onZoomReset();
        }
        this.zoomValue = document.getElementById("zoom-value");
        this.handles = new Array<HTMLElement>(5);
        this.handleResets = new Array<HTMLElement>(5);
        this.handleXValues = new Array<HTMLElement>(5);
        this.handleYValues = new Array<HTMLElement>(5);
        for (let i=0; i<5; i++) {
            this.handles[i] = document.getElementById("handle-" + i);
            this.handleResets[i] = document.getElementById("reset-" + i);
            this.handleResets[i].onclick = () => {
                this.onHandleReset(i);
            }
            this.handleXValues[i] = document.getElementById("x-" + i);
            this.handleYValues[i] = document.getElementById("y-" + i);
        }
    }

    swapMenu() {
        if (this.menuLeft) {
            this.menu.classList.add("left");
            this.menu.classList.remove("right");
        } else {
            this.menu.classList.remove("left");
            this.menu.classList.add("right");
        }
    }

    updateValues(zoomValue: number, handleValues: Array<Point>, handlePositions: Array<Point>) {
        this.zoomValue.innerHTML = ((zoomValue < 0) ? "" : " ") + zoomValue.toFixed(2);
        const handleOffset = new Point(-remToPixels(1), -remToPixels(1));
        for (let i=0; i<5; i++) {
            const x = handleValues[i].x;
            this.handleXValues[i].innerHTML = ((x < 0) ? "": " ") + x.toFixed(3);
            const y = handleValues[i].y;
            this.handleYValues[i].innerHTML = ((y < 0) ? "": " ") + y.toFixed(3);

            let handlePosition = Point.add(handlePositions[i], handleOffset);
            this.handles[i].style.left = handlePosition.x + "px";
            this.handles[i].style.top = handlePosition.y + "px";
        }
    }
}

const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);

function remToPixels(rem: number): number {
    return rem * REM_TO_PIXELS;
}

const DEFAULT_HANDLE_POSITION = 2;
const DEFAULT_SCALE_VALUE = 2.0;
const DEFAULT_ZOOM_VALUE = 100;

(() => {
    let width = window.innerWidth;
    let height = window.innerHeight;

    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2")!;
    const interface = new Interface();

    const renderer = new Renderer(gl, DEFAULT_ZOOM_VALUE);

    const rulerProgram = renderer.createProgram(rulerVert, rulerFrag);
    renderer.useProgram(rulerProgram);

    const rulerTexture = renderer.loadTexture("assets/ruler.png");

    const rulerPlane = renderer.newPlane(1, 1, 8);
    renderer.uploadVertices();

    const defaultHandlePositions = new Array<Point>(
        new Point(-DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point( DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point(-DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
        new Point( DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
        new Point(0, 0), // Origin
    );
    let handlePositions = [...defaultHandlePositions];
    let currentHandle = -1;

    let initialHandlePosition = new Point(0, 0);
    let initialMousePosition = new Point(0, 0);
    let scale = DEFAULT_SCALE_VALUE;
    let sensitivity = 0.1;

    const update = () => {
        {
            const w = rulerPlane.width;
            const h = rulerPlane.height;
            const t = rulerPlane.computeProjection(handlePositions[0], handlePositions[1], handlePositions[2], handlePositions[3]);
            const _ = t._;
            for (let i=0; i<9; i++) {
                _[i] = _[i] / _[8];
            }
            const t2 = new Matrix4([
                _[0], _[3], 0, _[6],
                _[1], _[4], 0, _[7],
                   0,    0, 1,    0,
                _[2], _[5], 0, _[8],
            ])
            renderer.setModelMatrix(
                Matrix4.mul(
                    Matrix4.translation(
                        Point.scale(
                            handlePositions[4],
                            1 / (4 * scale) // I'm pretty sure 4 is the _number of polygons_ (8) / 2
                        )
                    ),
                    Matrix4.mul(
                        Matrix4.scale(scale),
                        Matrix4.translation(new Point(0.5, 0.5))
                    ),
                )
            );
            renderer.setViewMatrix(t2);
            renderer.useTexture(rulerTexture);
            renderer.drawPrimitive(rulerPlane.primitive);
        }
        
        interface.updateValues(
            scale,
            handlePositions,
            handlePositions.map((v) => renderer.canvasToWindowPoint(v))
        );
    }

    update();

    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        renderer.resizeCanvas(width, height);
        update();
    }

    resize();

    const move = (e: MouseEvent) => {
        if (currentHandle < 0) {
            return;
        }

        handlePositions[currentHandle] = Point.add(
            initialHandlePosition,
            Point.scale(
                Point.sub(
                    renderer.windowToCanvasPoint(new Point(e.pageX, e.pageY)),
                    renderer.windowToCanvasPoint(initialMousePosition)
                ),
                sensitivity
            )
        );
        update();
    }

    // Listen to mouseup and mousemove events on the _window_, as it's important to get these events wherever they are triggered
    window.onmouseup = () => {
        currentHandle = -1;
    }
    window.onmousemove = move;

    // Listen to mousedown and wheel events on the _canvas_, as we're only interested in them occuring over the canvas
    canvas.onmousedown = (e: MouseEvent) => {
        const mousePosition = new Point(e.pageX, e.pageY);
        const canvasPosition = renderer.windowToCanvasPoint(mousePosition);
        let rem = renderer.windowToCanvasScalar(remToPixels(1));
        let best = rem * rem; // 1rem squared
        currentHandle = -1;
        for (let i=0; i<5; i++) {
            let dx = canvasPosition.x - handlePositions[i].x;
            let dy = canvasPosition.y - handlePositions[i].y;
            let distanceSquared = dx * dx + dy * dy;
            if (best > distanceSquared) {
                best = distanceSquared;
                currentHandle = i;
                initialHandlePosition = handlePositions[currentHandle];
                initialMousePosition = mousePosition;
            }
        }
        move(e);
    }
    canvas.onwheel = (e: WheelEvent) => {
        scale += e.deltaY * 0.0005;
        update();
    }

    interface.onZoomReset = () => {
        scale = DEFAULT_SCALE_VALUE;
        update();
    }
    interface.onHandleReset = (i: number) => {
        handlePositions[i] = defaultHandlePositions[i];
        update();
    }

    window.onresize = resize;
})()