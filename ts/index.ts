import * as model from "./model.js";
import * as render from "./render.js";
import * as view from "./view.js";

(() => {
    render.wrapCanvasById("gl-canvas");
    const buffer = new render.Buffer();
    // TODO: Replace with buffer.circle() or something
    const mTriangle = buffer.newMesh([
        render.newVertex([-2, -2]),
        render.newVertex([0, 2]),
        render.newVertex([2, -2])
    ]);
    const mPlane = buffer.newPlane(100, [0, 0, 1, 1])
    const pHello = new render.Program("glsl/hello.vert", "glsl/hello.frag");

    const onResize = () => {
        let width = window.innerWidth;
        let height = window.innerHeight;
        render.onResize(width, height);
        // TODO: Model needs to resize so that when you reset a corner it goes to a reasonable place
        // myModel.onResize(width, height);
    }
    onResize();
    window.onresize = onResize;

    const myModel = new model.Model(
        Math.min(window.innerWidth, window.innerHeight) / 4
    );
    const myEditor = new view.Editor(myModel, render.canvas);

    const onAnimationFrame = () => {
        for (const corner of myModel.corners) {
            mTriangle.draw(pHello, render.newTranslationMatrix(corner.getVector2()), [1, 0, 0, 1]);
        }
        mPlane.draw(pHello, render.newIdentityMatrix(), [0, 0, 1, 1]);
        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();
