import * as model from "./model.js";
import * as render from "./render.js";
import * as view from "./view.js";

(() => {
    const myModel = new model.Model(
        Math.min(window.innerWidth, window.innerHeight) / 8
    );

    render.wrapCanvasById("gl-canvas");
    const buffer = new render.Buffer();
    const mRuler = buffer.newPlane([-1, -1], [3, 3]);
    const mPattern = buffer.newPlane();
    const pHello = new render.Program(
        "glsl/standard.vert",
        "glsl/solid.frag",
        [["u_color", [1, 0, 0, 1]]]
    );
    const pRuler = new render.Program(
        "glsl/standard.vert",
        "glsl/ruler.frag",
        [
            ["u_color", [0, 0, 0, 1]],
            ["u_background_color", [1, 1, 1, 1]],
            ["u_distance", [myModel.corners[0].distanceTo(myModel.corners[1])]],
            ["u_resolution", [myModel.unitsPerQuad.get()]],
            ["u_width", [4.0]]
        ]
    );
    const pPattern = new render.Program(
        "glsl/standard.vert",
        "glsl/pattern.frag",
        [
            ["u_texture", [0]]
        ]
    );
    const tRuler = new render.Texture();
    tRuler.fromImageUrl("assets/ruler.png");

    const myEditor = new view.Editor(myModel, render.canvas);

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

        render.setView(
            render.newSkewMatrix(
                // TODO: Figure this out.
                // The problem is that we're transforming a plane that is in 0-1 space
                // into an area defined in pixels. This could be fine, but
                // I want the origin of the pattern to be 1:1
                [[1, 1], [0, 1], [0, 0], [1, 0]],
                myModel.getCornersAsVectors(),
            )
        );

        switch (myModel.displayMode) {
            case model.DisplayMode.Ruler:
                mRuler.draw(
                    pRuler,
                    render.newIdentityMatrix(),
                    [
                        ["u_distance", [myModel.corners[0].distanceTo(myModel.corners[1])]],
                        ["u_resolution", [myModel.unitsPerQuad.get()]],
                        ["u_width", [myModel.pixelsPerLine.get()]],
                    ]
                );
                break;

            case model.DisplayMode.Pattern:
                const origin = myModel.origin.getVector2();
                origin[0] /= 100.0;
                origin[1] /= 100.0;
                tRuler.bind();
                mPattern.draw(
                    pPattern,
                    render.newModelMatrix(origin, myModel.scale),
                );
                break;
        }

        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();
