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


// #include("src/math.ts")
// #include("src/renderer.ts")
// #include("src/interface.ts")

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
const DEFAULT_SCALE_VALUE = 2.0;

(() => {
    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2")!;
    const renderer = new Renderer(gl, 100);
    const interface = new Interface();
    
    const rulerProgram = renderer.createProgram(rulerVert, rulerFrag);
    const rulerTexture = renderer.loadTexture("assets/ruler.png");
    const rulerPlane = renderer.newPlane(1, 1, 8);
    renderer.uploadVertices();
    
    const DEFAULT_HANDLE_RADIUS = remToPixels(1);
    const DEFAULT_HANDLE_POSITION = 2.0;
    const defaultHandlePositions = new Array<Point>(
        new Point(-DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point( DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point(-DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
        new Point( DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
    );

    const perspectiveHandles = new Array<Handle>(4);
    for (let i=0; i<4; i++) {
        perspectiveHandles[i] = new Handle(defaultHandlePositions[i], DEFAULT_HANDLE_POSITION);
    }

    const originHandle = new Handle(new Point(0, 0), DEFAULT_HANDLE_RADIUS);
    
    const handles = new Array<Handle>(
        ...perspectiveHandles,
        originHandle
    );
    let currentHandle = -1;

    let initialHandlePosition = new Point(0, 0);
    let initialMousePosition = new Point(0, 0);
    let scale = DEFAULT_SCALE_VALUE;
    let sensitivity = 0.1;

    const update = () => {
        {
            const w = rulerPlane.width;
            const h = rulerPlane.height;
            const t = rulerPlane.computeProjection(handles[0].pos, handles[1].pos, handles[2].pos, handles[3].pos);
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
                            originHandle.pos,
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
            renderer.useProgram(rulerProgram);
            renderer.useTexture(rulerTexture);
            renderer.drawPrimitive(rulerPlane.primitive);
        }
        
        interface.updateValues(
            scale,
            handles.map((v) => v.pos),
            handles.map((v) => renderer.canvasToWindowPoint(v.pos))
        );
    }

    update();

    const resize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
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

        handles[currentHandle].pos = Point.add(
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
            let dx = canvasPosition.x - handles[i].pos.x;
            let dy = canvasPosition.y - handles[i].pos.y;
            let distanceSquared = dx * dx + dy * dy;
            if (best > distanceSquared) {
                best = distanceSquared;
                currentHandle = i;
                initialHandlePosition = handles[currentHandle].pos;
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
        handles[i].pos = defaultHandlePositions[i];
        update();
    }

    window.onresize = resize;
})()