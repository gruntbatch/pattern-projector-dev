import * as model from "./model.js";
import * as render from "./render.js";
import * as view from "./view.js";

(() => {
    const myModel = new model.Model();
    const myEditor = new view.Editor(myModel);

    render.wrapCanvasById("gl-canvas");
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
        render.onResize(width, height);
    }
    onResize();
    window.onresize = onResize;

    const onAnimationFrame = () => {
        mTriangle.draw(pHello, render.newTranslationMatrix(myModel.origin.getVector2()));
        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();
