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
        render.newVertex([-100, -100]),
        render.newVertex([0, 100]),
        render.newVertex([100, -100])
    ]);
    const pHello = new render.Program("glsl/hello.vert", "glsl/hello.frag");

    const onResize = () => {
        let width = window.innerWidth;
        let height = window.innerHeight;
        glCanvas.width = width;
        glCanvas.height = height;
        render.onResize(width, height);
    }
    onResize();
    window.onresize = onResize;

    const onAnimationFrame = () => {
        mTriangle.draw(pHello, render.identityMatrix());
        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();
