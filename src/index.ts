// #include("src/interface.ts")
// #include("src/gl.ts")
// #include("src/math.ts")
// #include("src/model.ts")
// #include("src/pdf.ts")

const rulerVert = `#include("src/ruler.vert")`;
const rulerFrag = `#include("src/ruler.frag")`;
const patternFrag = `#include("src/pattern.frag")`;

const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);

function remToPixels(rem: number): number {
    return rem * REM_TO_PIXELS;
}

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        }
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    })
}

namespace Context {
    export const calibration = new Model.Calibration(2.0);
    export const projection = new Model.Projection(0.5);

    export const glCanvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    export const gl = glCanvas.getContext("webgl2");
    export const glRenderer = new GL.Renderer(gl, 100);

    export const pdfCanvas = document.getElementById("pdf-canvas") as HTMLCanvasElement;
    export const pdfRenderer = new PDF.Renderer();

    (() => {
        const interface = new Interface.Interface(calibration, projection);
        
        const rulerProgram = glRenderer.createProgram(rulerVert, rulerFrag);
        const rulerTexture = glRenderer.loadTexture("assets/ruler.png");
        const rulerPlane = glRenderer.newPlane(1, 1, 8);
        const patternProgram = glRenderer.createProgram(rulerVert, patternFrag);
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
                    glRenderer.useProgram(patternProgram);
                    glRenderer.useTexture(pdfRenderer.texture);
                    break;
            }
                glRenderer.drawPrimitive(rulerPlane.primitive);
        }
        animationFrame();
    })();
}

