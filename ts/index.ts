import * as math from "./math.js";
import * as model from "./model.js";
import * as pdf from "./pdf.js";
import * as render from "./render.js";
import * as view from "./view.js";

(() => {
    const myModel = new model.Model(
        Math.min(window.innerWidth, window.innerHeight) / 8
    );

    pdf.wrapCanvasById("pdf-canvas");
    render.wrapCanvasById("gl-canvas");

    const myRenderer = new view.Renderer(myModel);
    const myEditor = new view.Editor(myModel, myRenderer, render.canvas);

    const onResize = () => {
        let width = window.innerWidth;
        let height = window.innerHeight;
        render.onResize(width, height);
        myEditor.onResize(width, height);
        // TODO: Model needs to resize so that when you reset a corner it goes to a reasonable place
        // myModel.onResize(width, height);
    }
    onResize();
    window.onresize = onResize;

    const onAnimationFrame = () => {
        myRenderer.onAnimationFrame();
        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();
