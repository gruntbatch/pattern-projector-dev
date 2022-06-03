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
// [x] Create state-specific ui
// reset pattern scrubbing handle between drags
// make high sensitivity a toggleable option
// save and load calibration
// [x] upload pattern pdf
// [x] render pattern pdf to canvas
// [x] use rendered pattern canvas as texture
// draw pattern

// #include("src/interface.ts")
// #include("src/math.ts")
// #include("src/model.ts")
// #include("src/renderer.ts")
// #include("src/pdf.ts")

const handleVert = `#include("src/handle.vert")`
const handleFrag = `#include("src/handle.frag")`;
const rulerVert = `#include("src/ruler.vert")`;
const rulerFrag = `#include("src/ruler.frag")`;

const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);

function remToPixels(rem: number): number {
    return rem * REM_TO_PIXELS;
}

const DEFAULT_HANDLE_RADIUS = remToPixels(1);
const DEFAULT_HANDLE_POSITION = 2.0;
const DEFAULT_SCALE_VALUE = 2.0;

namespace Context {
    export const calibration = new Model.Calibration(DEFAULT_SCALE_VALUE);
    export const projection = new Model.Projection(DEFAULT_SCALE_VALUE);

    export const glCanvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    export const gl = glCanvas.getContext("webgl2");
    export const glRenderer = new Renderer(gl, 100);

    export const pdfCanvas = document.getElementById("pdf-canvas") as HTMLCanvasElement;
    export const pdfRenderer = new PDF.Renderer(gl);

    (() => {
        const interface = new Interface.Interface(calibration, projection);
        
        const rulerProgram = glRenderer.createProgram(rulerVert, rulerFrag);
        const rulerTexture = glRenderer.loadTexture("assets/ruler.png");
        const rulerPlane = glRenderer.newPlane(1, 1, 8);
        glRenderer.uploadVertices();
    
        window.onresize = () => { interface.onResize(); };
    
        // Listen to mousedown and wheel events on the _canvas_, as we're only interested in them occuring over the canvas
        glCanvas.onwheel = (e: WheelEvent) => { interface.onWheel(e); };
        glCanvas.onmousedown = (e: MouseEvent) => { interface.onMouseDown(e); };
    
        // Listen to mouseup and mousemove events on the _window_, as it's important to get these events wherever they are triggered
        window.onmousemove = (e: MouseEvent) => { interface.onMouseMove(e); };
        window.onmouseup = () => { interface.onMouseUp(); };
    
        const animationFrame = () => {
            requestAnimationFrame(animationFrame);

            interface.onUpdate();
    
            glRenderer.setModelMatrix(interface.editor.model.getModelMatrix());
            glRenderer.setViewMatrix(calibration.getProjectionMatrix(rulerPlane));
            switch (interface.getActiveEditor()) {
                case (Interface.ActiveEditor.Calibrator):
                    glRenderer.useProgram(rulerProgram);
                    glRenderer.useTexture(rulerTexture);
                    break;
                    
                case (Interface.ActiveEditor.Projector):
                    glRenderer.useProgram(rulerProgram);
                    glRenderer.useTexture(pdfRenderer.texture);
                    break;
            }
                glRenderer.drawPrimitive(rulerPlane.primitive);
        }
        animationFrame();
    })();
}

