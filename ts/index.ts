import * as render from "./render.js";

(() => {
    const glCanvas = document.getElementById("gl-canvas") as HTMLCanvasElement | null;
    if (!glCanvas) {
        throw new Error();
    }

    const glContext = glCanvas.getContext("webgl");
    if (!glContext) {
        throw new Error();
    }

    render.setContext(glContext);

    const buffer = new render.Buffer();
    const mTriangle = buffer.mesh([
        render.newVertex([-1, -1]),
        render.newVertex([0, 1]),
        render.newVertex([1, -1])
    ]);
    const pHello = new render.Program("glsl/hello.vert", "glsl/hello.frag");

    const onAnimationFrame = () => {
        mTriangle.draw(pHello);
        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();
